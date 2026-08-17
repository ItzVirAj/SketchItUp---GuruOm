import { Request, Response, NextFunction } from 'express';
import { 
  AccessLevel, 
  SystemModule, 
  normalizeRole, 
  getRoleModulePermission, 
  hasMinimumAccess,
  isWithinApprovalLimit,
  isScopeRestrictedToEmployeeMaster,
  isScopeRestrictedToOwnRecords
} from '../../../src/utils/rbacMatrix';
import { auditService } from '../modules/audit/audit.service';
import { getDbClient } from '../config/database';

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
    const perm = getRoleModulePermission(normRole, module);

    // Attach scope context for controllers/services
    req.rbacScope = {
      role: normRole,
      accessLevel: perm.accessLevel,
      approvalLimit: perm.approvalLimit ?? null,
      isOwnRecordsOnly: perm.scopeRule === 'OWN_RECORDS_ONLY',
      isEmployeeOnly: perm.scopeRule === 'EMPLOYEE_MASTER_ONLY',
      canEditCommercial: perm.scopeRule !== 'NO_COMMERCIAL_EDIT',
      canPlaceClearQcHold: normRole === 'Owner' || normRole === 'Admin (System)' || normRole === 'Quality Inspector',
      userId: req.user.userId,
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
    }).catch(() => {});

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

    if (!isMatch && normRole !== 'Owner' && normRole !== 'Admin (System)') {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Role "${normRole}" lacks permission for this endpoint. Required: [${allowedRoles.join(', ')}]`
      });
    }

    return next();
  };
}
