import { Request, Response, NextFunction, RequestHandler } from 'express';
import {
  AccessLevel,
  SystemModule,
  ACCESS_LEVEL_RANK,
  normalizeRole,
  getRoleModulePermission,
  hasMinimumAccess,
  isWithinApprovalLimit,
  isScopeRestrictedToEmployeeMaster,
  isScopeRestrictedToOwnRecords,
  isRoleAuthorizedForCta,
  CtaId
} from '../../../src/utils/rbacMatrix';
import { auditService } from '../modules/audit/audit.service';
import { getDbClient } from '../config/database';

/**
 * Maps each granular `permissions.key` (as edited from the ServerAdminVault UI /
 * stored in `user_permission_overrides`) to the SystemModule + AccessLevel tier
 * it corresponds to. This lets requirePermission() resolve per-user overrides
 * on top of the static role matrix, instead of ignoring them entirely.
 *
 * NOTE: keep this in sync with `SECTION_GROUPS` in
 * src/components/admin/ServerAdminVault.tsx and the seed list in
 * supabase/migrations/025_server_admin_and_granular_rbac.sql.
 */
const PERMISSION_KEY_TIER: Record<string, { module: SystemModule; tier: AccessLevel }> = {
  'orders:view': { module: 'orders', tier: 'VIEW_ONLY' },
  'orders:create_draft': { module: 'orders', tier: 'CREATE_EDIT' },
  'orders:edit_commercials': { module: 'orders', tier: 'CREATE_EDIT' },
  'orders:confirm': { module: 'orders', tier: 'FULL_APPROVE' },
  'orders:cancel': { module: 'orders', tier: 'FULL_APPROVE' },

  'inventory:view': { module: 'inventory', tier: 'VIEW_ONLY' },
  'inventory:create_grn': { module: 'inventory', tier: 'CREATE_EDIT' },
  'inventory:adjust_stock': { module: 'inventory', tier: 'FULL_APPROVE' },

  'production:view': { module: 'production', tier: 'VIEW_ONLY' },
  'production:create_job_card': { module: 'production', tier: 'CREATE_EDIT' },
  'production:log_output': { module: 'production', tier: 'CREATE_EDIT' },

  'procurement:view': { module: 'procurement', tier: 'VIEW_ONLY' },
  'procurement:create_po': { module: 'procurement', tier: 'CREATE_EDIT' },
  'procurement:approve_high_value': { module: 'procurement', tier: 'FULL_APPROVE' },

  'qc:view': { module: 'qc', tier: 'VIEW_ONLY' },
  'qc:log_inspection': { module: 'qc', tier: 'CREATE_EDIT' },
  'qc:place_hold': { module: 'qc', tier: 'FULL_APPROVE' },
  'qc:release_hold': { module: 'qc', tier: 'FULL_APPROVE' },

  'dispatch:view': { module: 'dispatch', tier: 'VIEW_ONLY' },
  'dispatch:create_challan': { module: 'dispatch', tier: 'CREATE_EDIT' },
  'dispatch:confirm_delivery': { module: 'dispatch', tier: 'FULL_APPROVE' },

  // 'finance' category in the permissions catalog maps to the 'accounting' SystemModule.
  'finance:view': { module: 'accounting', tier: 'VIEW_ONLY' },
  'finance:generate_invoice': { module: 'accounting', tier: 'CREATE_EDIT' },
  'finance:record_payment': { module: 'accounting', tier: 'CREATE_EDIT' },
  'finance:approve_high_value': { module: 'accounting', tier: 'FULL_APPROVE' },

  // No dedicated masters:view key exists yet in the catalog — this is the only
  // lever the vault currently exposes for the masters module.
  'admin:manage_masters': { module: 'masters', tier: 'CREATE_EDIT' }
};

/**
 * Fetches user permission overrides from the database.
 */
export async function getUserPermissionOverrides(
  userId: string
): Promise<Array<{ permission_key: string; effect: string }>> {
  try {
    const db = getDbClient();
    const { data: overrides, error } = await db
      .from('user_permission_overrides')
      .select('permission_key, effect')
      .eq('user_id', userId);

    if (error || !overrides) {
      return [];
    }
    return overrides;
  } catch (err) {
    console.warn('[RBAC] Failed to fetch permission overrides:', err);
    return [];
  }
}

/**
 * Resolves the effective AccessLevel for a module by layering this user's
 * `user_permission_overrides` on top of the role-derived baseline.
 *
 * Policy: if the vault has written ANY override for this module (it always
 * writes a full set per section — see setSectionAccessLevel in
 * ServerAdminVault.tsx), those overrides fully determine the effective tier
 * for that module, superseding the role default. If no overrides exist for
 * the module, the role-based baseline is returned unchanged (today's
 * behavior, zero regression risk for users who've never been overridden).
 */
async function resolveEffectiveAccessLevel(
  userId: string,
  module: SystemModule,
  baseline: AccessLevel
): Promise<AccessLevel> {
  try {
    const overrides = await getUserPermissionOverrides(userId);

    if (overrides.length === 0) {
      return baseline;
    }

    const moduleOverrides = overrides.filter(
      (o: { permission_key: string }) => PERMISSION_KEY_TIER[o.permission_key]?.module === module
    );

    if (moduleOverrides.length === 0) {
      return baseline;
    }

    const grantedRanks = moduleOverrides
      .filter((o: { effect: string }) => o.effect === 'GRANTED')
      .map((o: { permission_key: string }) => ACCESS_LEVEL_RANK[PERMISSION_KEY_TIER[o.permission_key].tier]);

    if (grantedRanks.length > 0) {
      const maxRank = Math.max(...grantedRanks);
      const resolved = (Object.keys(ACCESS_LEVEL_RANK) as AccessLevel[]).find(
        (level) => ACCESS_LEVEL_RANK[level] === maxRank
      );
      return resolved ?? baseline;
    }

    // Every relevant key is explicitly REVOKED and nothing is GRANTED
    // (e.g. the vault set this section to HIDDEN) → block the module entirely.
    return 'NO_ACCESS';
  } catch (err) {
    console.warn('[RBAC] Failed to resolve permission overrides, falling back to role default:', err);
    return baseline;
  }
}

export interface RbacScopeContext {
  role: string;
  accessLevel: AccessLevel;
  approvalLimit: number | null;
  isOwnRecordsOnly: boolean;
  isEmployeeOnly: boolean;
  canEditCommercial: boolean;
  canPlaceClearQcHold: boolean;
  userId?: string;
  userName?: string;
}

declare global {
  namespace Express {
    interface Request {
      rbacScope?: RbacScopeContext;
    }
  }
}

export interface PermissionOptions {
  checkApprovalLimit?: boolean;
  getAmount?: (req: Request) => number;
  commercialCheck?: boolean;
  scopeCheck?: 'masters' | 'production';
}

/**
 * Enhanced RBAC Middleware with Exact Role-Permission Enforcement,
 * Monetary Approval Limit Checks, Auto-Escalation Engine, and Scoped Query Filtering.
 */
export function requirePermission(
  module: SystemModule,
  requiredAccess: AccessLevel,
  options: PermissionOptions = {}
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 1. Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required prior to permission verification.'
      });
    }

    const rawRole = req.user.role || (req.user as any).userRole;
    const normRole = normalizeRole(rawRole);
    // IMPORTANT: getRoleModulePermission() returns a direct reference into the
    // shared static RBAC_ROLE_MATRIX object, not a copy. We must shallow-copy
    // it before mutating accessLevel below, otherwise applying one user's
    // override would permanently corrupt that role's permissions in memory
    // for every other user sharing the role, until the process restarts.
    const perm = { ...getRoleModulePermission(normRole, module) };

    // ServerAdmin/Owner override enforcement: layer this user's per-user
    // permission overrides (set via the ServerAdmin Vault) on top of the
    // role-based default before enforcing access. Without this, overrides
    // are persisted to the DB but silently have no effect on any module
    // guarded by requirePermission().
    const userId = req.user.id || (req.user as any).userId;
    perm.accessLevel = await resolveEffectiveAccessLevel(userId, module, perm.accessLevel);

    // Attach scope context for controllers/services
    req.rbacScope = {
      role: normRole,
      accessLevel: perm.accessLevel,
      approvalLimit: perm.approvalLimit ?? null,
      isOwnRecordsOnly: perm.scopeRule === 'OWN_RECORDS_ONLY',
      isEmployeeOnly: perm.scopeRule === 'EMPLOYEE_MASTER_ONLY',
      canEditCommercial: perm.scopeRule !== 'NO_COMMERCIAL_EDIT',
      canPlaceClearQcHold: normRole === 'ServerAdmin' || normRole === 'Owner' || normRole === 'Admin (System)' || normRole === 'Quality Inspector',
      userId: userId,
      userName: (req.user as any).name || req.user.email
    };

    // 2. Base Access Level Check
    if (!hasMinimumAccess(perm.accessLevel, requiredAccess)) {
      // Record denied audit log
      await auditService.recordAuditLog({
        actorEmail: req.user.email,
        actorRole: normRole,
        action: 'RBAC_ACCESS_DENIED',
        entityType: module,
        entityId: req.params.id || 'N/A',
        details: `Access Denied: Role "${normRole}" has ${perm.accessLevel} access on module "${module}", but ${requiredAccess} is required.`,
        metadata: {
          path: req.originalUrl,
          method: req.method,
          requiredAccess,
          grantedAccess: perm.accessLevel
        }
      }).catch(err => console.warn('Audit logging error:', err));

      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Role "${normRole}" has ${perm.accessLevel} access on module "${module}", but ${requiredAccess} is required.`
      });
    }

    // 3. Scoped Row-Level Rule: HR/Admin Scoped ONLY to Employee Master
    if (perm.scopeRule === 'EMPLOYEE_MASTER_ONLY' && module === 'masters') {
      const isUserEndpoint = req.originalUrl.includes('/users') || req.path.includes('/users');
      if (!isUserEndpoint) {
        await auditService.recordAuditLog({
          actorEmail: req.user.email,
          actorRole: normRole,
          action: 'RBAC_SCOPE_BLOCKED',
          entityType: 'masters',
          entityId: 'N/A',
          details: `Scope Violation: Role "${normRole}" is strictly scoped to Employee Master (Users) only and cannot access other masters.`,
          metadata: { path: req.originalUrl, method: req.method }
        }).catch(err => console.warn('Audit logging error:', err));

        return res.status(403).json({
          error: 'Forbidden',
          message: `Access denied. Role "${normRole}" is restricted exclusively to Employee Master and cannot access other master catalogs.`
        });
      }
    }

    // 4. Scoped Rule: Commercial Terms Modification Protection (Production Planner / Dispatch Executive)
    if (perm.scopeRule === 'NO_COMMERCIAL_EDIT' && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
      const body = req.body || {};
      const attemptedCommercialFields = ['totalAmount', 'unitPrice', 'discount', 'paymentTerms', 'creditDays', 'price', 'rate'].filter(f => body[f] !== undefined);

      if (attemptedCommercialFields.length > 0) {
        await auditService.recordAuditLog({
          actorEmail: req.user.email,
          actorRole: normRole,
          action: 'COMMERCIAL_EDIT_BLOCKED',
          entityType: module,
          entityId: req.params.id || 'N/A',
          details: `Commercial Policy Violation: Role "${normRole}" is prohibited from modifying commercial terms: [${attemptedCommercialFields.join(', ')}].`,
          metadata: { fields: attemptedCommercialFields }
        }).catch(err => console.warn('Audit logging error:', err));

        return res.status(403).json({
          error: 'Forbidden',
          message: `Commercial terms cannot be modified by role "${normRole}". Protected fields: [${attemptedCommercialFields.join(', ')}].`
        });
      }
    }

    // 5. Monetary Approval Limit Check & Auto-Escalation Engine
    const isApprovalAction =
      options.checkApprovalLimit ||
      req.path.includes('/approve') ||
      req.body.status === 'APPROVED' ||
      (requiredAccess === 'FULL_APPROVE' && (req.method === 'POST' || req.method === 'PATCH'));

    if (isApprovalAction && perm.approvalLimit !== null && perm.approvalLimit !== undefined) {
      let amount = 0;
      if (options.getAmount) {
        amount = options.getAmount(req);
      } else {
        amount = Number(req.body.amount || req.body.totalAmount || req.body.grandTotal || req.body.netAmount || 0);
      }

      if (amount > perm.approvalLimit) {
        // Auto-escalate: Create Pending Approval Ticket routed to Owner
        const approvalId = `appr-esc-${Date.now()}`;
        const entityId = req.params.id || req.body.id || req.body.poNumber || req.body.orderId || req.body.billId || 'N/A';
        const entityType = module === 'procurement' ? 'PO' : module === 'accounting' ? 'VENDOR_PAYMENT' : 'ORDER';
        const reason = `Transaction value ₹${amount.toLocaleString('en-IN')} exceeds single-sign limit of ₹${perm.approvalLimit.toLocaleString('en-IN')} for ${normRole}. Escalated to Owner.`;

        const db = getDbClient();
        try {
          await db.from('pending_approvals').insert({
            id: approvalId,
            title: `High-Value ${module.toUpperCase()} Approval (${entityId})`,
            type: module === 'procurement' ? 'HIGH_VALUE_PO' : 'HIGH_VALUE_PAYMENT',
            entity_type: entityType,
            entity_id: entityId,
            amount: amount,
            threshold_limit: perm.approvalLimit,
            requested_by: (req.user as any).name || req.user.email,
            requested_by_role: normRole,
            target_approver_role: 'Owner',
            status: 'PENDING_OWNER_APPROVAL',
            details: reason,
            escalation_reason: reason
          });
        } catch (dbErr) {
          console.warn('Fallback inserting pending_approvals record:', dbErr);
        }

        // Record structured escalation audit log
        await auditService.recordAuditLog({
          actorEmail: req.user.email,
          actorRole: normRole,
          action: 'APPROVAL_AUTO_ESCALATED',
          entityType: module,
          entityId: entityId,
          details: reason,
          metadata: {
            approvalId,
            amount,
            thresholdLimit: perm.approvalLimit,
            escalatedTo: 'Owner',
            status: 'PENDING_OWNER_APPROVAL'
          }
        }).catch(err => console.warn('Audit logging error:', err));

        // Return 202 Accepted with Escalation Details rather than rejecting silently
        return res.status(202).json({
          success: true,
          status: 'ESCALATED_TO_OWNER',
          escalated: true,
          approvalId,
          entityId,
          amount,
          roleLimit: perm.approvalLimit,
          message: `Transaction value ₹${amount.toLocaleString('en-IN')} exceeds ${normRole} limit (₹${perm.approvalLimit.toLocaleString('en-IN')}). An approval ticket [${approvalId}] has been created and escalated to the Owner for authorization.`
        });
      }
    }

    // Record verified RBAC action
    await auditService.recordAuditLog({
      actorEmail: req.user.email,
      actorRole: normRole,
      action: `RBAC_PERMITTED_${req.method}`,
      entityType: module,
      entityId: req.params.id || req.body.id || 'N/A',
      details: `Authorized ${req.method} action on module "${module}" for role "${normRole}".`,
      metadata: {
        accessLevel: perm.accessLevel,
        scopeRule: perm.scopeRule,
        approvalLimit: perm.approvalLimit
      }
    }).catch(() => { });

    return next();
  };
}

/**
 * Backwards-compatible requireRole function.
 */
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required prior to permission verification.'
      });
    }

    const rawRole = req.user.role || (req.user as any).userRole;
    const normRole = normalizeRole(rawRole);

    const isMatch = allowedRoles.some(r => normalizeRole(r) === normRole || r === rawRole);

    if (!isMatch && normRole !== 'ServerAdmin' && normRole !== 'Owner' && normRole !== 'Admin (System)') {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Role "${normRole}" lacks permission for this endpoint. Required: [${allowedRoles.join(', ')}]`
      });
    }

    return next();
  };
}

/**
 * CTA-level Permission Middleware Factory.
 * Enforces per-CTA authorization checks supporting granular per-user overrides.
 */
export function requireCtaPermission(ctaId: CtaId): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 1. Ensure user is authenticated & extract role and userId
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required prior to permission verification.'
      });
    }

    const rawRole = req.user.role || (req.user as any).userRole;
    const normRole = normalizeRole(rawRole);
    const userId = req.user.id || (req.user as any).userId;

    // 2. Fetch user's permission overrides
    const overrides = await getUserPermissionOverrides(userId);

    // 3 & 4. Check for explicit CTA override: `cta:{ctaId}`
    const ctaOverrideKey = `cta:${ctaId}`;
    const override = overrides.find(o => o.permission_key === ctaOverrideKey);

    if (override) {
      // 3. Explicitly REVOKED → 403 Forbidden
      if (override.effect === 'REVOKED') {
        await auditService.recordAuditLog({
          actorEmail: req.user.email,
          actorRole: normRole,
          action: 'RBAC_CTA_ACCESS_DENIED',
          entityType: 'CTA',
          entityId: ctaId,
          details: `Access Denied: Action "${ctaId}" is explicitly revoked by user override.`,
          metadata: { path: req.originalUrl, method: req.method, ctaId, effect: 'REVOKED' }
        }).catch(err => console.warn('Audit logging error:', err));

        return res.status(403).json({
          error: 'Forbidden',
          message: `Access denied. Action "${ctaId}" is revoked for this account.`
        });
      }

      // 4. Explicitly GRANTED → next()
      if (override.effect === 'GRANTED') {
        await auditService.recordAuditLog({
          actorEmail: req.user.email,
          actorRole: normRole,
          action: 'RBAC_CTA_OVERRIDE_GRANTED',
          entityType: 'CTA',
          entityId: ctaId,
          details: `Authorized: Action "${ctaId}" permitted via user override.`,
          metadata: { path: req.originalUrl, method: req.method, ctaId }
        }).catch(() => {});

        return next();
      }
    }

    // 5. Fallback: Role matrix authorization check
    const isAuthorized = isRoleAuthorizedForCta(normRole, ctaId);

    if (!isAuthorized) {
      await auditService.recordAuditLog({
        actorEmail: req.user.email,
        actorRole: normRole,
        action: 'RBAC_CTA_ACCESS_DENIED',
        entityType: 'CTA',
        entityId: ctaId,
        details: `Access Denied: Role "${normRole}" is not authorized for action "${ctaId}".`,
        metadata: { path: req.originalUrl, method: req.method, ctaId, role: normRole }
      }).catch(err => console.warn('Audit logging error:', err));

      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Role "${normRole}" lacks permission to perform action "${ctaId}".`
      });
    }

    return next();
  };
}
