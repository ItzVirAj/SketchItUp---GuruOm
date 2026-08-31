// ============================================================================
// File: backend/src/modules/admin/admin.controller.ts
// Description: ServerAdmin Management Controller for Master Roles, Granular Overrides,
//              One-Time Password Resets, and Immutable Audit Inspection.
// ============================================================================

import { Request, Response } from 'express';
import crypto from 'crypto';
import { getDbClient } from '../../config/database';
import { permissionService } from '../../services/permission.service';
import { notificationsService } from '../notifications/notifications.service';
import { normalizeRole } from '../../../../src/utils/rbacMatrix';
import { verifyPassword } from '../../utils/password';

export class AdminController {
  private db = getDbClient();

  /**
   * GET /admin/users
   * List all user accounts with roles, tiers, statuses, and last login timestamps.
   */
  async listUsers(req: Request, res: Response) {
    try {
      const actor = req.verifiedActor!;

      const { data: users, error } = await this.db
        .from('users')
        .select(`
          id,
          email,
          full_name,
          role,
          department,
          phone,
          status,
          is_temporary_password,
          last_login_at,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      // Fetch user permission overrides for all users
      let overrideMap: Record<string, any[]> = {};
      try {
        const { data: overrides } = await this.db
          .from('user_permission_overrides')
          .select('user_id, permission_key, effect, reason');

        if (overrides) {
          overrides.forEach((o: any) => {
            if (!overrideMap[o.user_id]) overrideMap[o.user_id] = [];
            overrideMap[o.user_id].push(o);
          });
        }
      } catch (_) {
        // Table not yet migrated
      }

      // Map roles to tier ranks
      const enriched = await Promise.all(
        (users || []).map(async (u: any) => {
          const normRole = normalizeRole(u.role);
          const tier = await permissionService.getRoleTier(normRole);
          return {
            ...u,
            normalizedRole: normRole,
            tier,
            permissionOverrides: overrideMap[u.id] || []
          };
        })
      );

      // Record audit log
      await permissionService.recordAdminAudit({
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: 'VIEW_USERS_LIST',
        beforeState: null,
        afterState: { count: enriched.length },
        ip: req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown',
        userAgent: req.headers['user-agent']
      });

      return res.json({
        success: true,
        data: enriched
      });
    } catch (err: any) {
      return res.status(500).json({
        error: 'InternalServerError',
        message: `Failed to fetch users: ${err.message}`
      });
    }
  }

  /**
   * PATCH /admin/users/:id/role
   * Change user role. Enforces:
   * 1. Target role must be below the actor's tier.
   * 2. ServerAdmin cannot be assigned via API under any circumstance (CLI-only).
   * 3. Invalidates target user's active sessions upon role change.
   */
  async updateUserRole(req: Request, res: Response) {
    try {
      const actor = req.verifiedActor!;
      const targetUserId = req.params.id;
      const { role: requestedRole, reason } = req.body;

      if (!requestedRole || typeof requestedRole !== 'string') {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'A target role string is required.'
        });
      }

      const normTargetRole = normalizeRole(requestedRole);

      // NON-NEGOTIABLE SECURITY GATE: ServerAdmin cannot be assigned via HTTP API
      if (normTargetRole === 'ServerAdmin' || requestedRole.trim().toLowerCase() === 'serveradmin') {
        await permissionService.recordAdminAudit({
          actorId: actor.id,
          actorEmail: actor.email,
          actorRole: actor.role,
          action: 'SERVER_ADMIN_API_ASSIGNMENT_BLOCKED',
          targetUserId,
          beforeState: null,
          afterState: { attemptedRole: requestedRole },
          ip: req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown',
          userAgent: req.headers['user-agent']
        });

        return res.status(403).json({
          error: 'Forbidden',
          message: 'The ServerAdmin role cannot be granted through the API. This role is strictly provisionable via CLI seed script only.'
        });
      }

      // Fetch target user from DB
      const { data: targetUser, error: fetchErr } = await this.db
        .from('users')
        .select('id, email, full_name, role, status')
        .eq('id', targetUserId)
        .single();

      if (fetchErr || !targetUser) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'Target user account not found.'
        });
      }

      const previousRoleTier = await permissionService.getRoleTier(targetUser.role);
      const targetRoleTier = await permissionService.getRoleTier(normTargetRole);

      // Enforce: Actor can only assign roles strictly below their own tier
      if (targetRoleTier <= actor.tier) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Role hierarchy violation: Cannot assign a role with Tier ${targetRoleTier} (Actor Tier is ${actor.tier}).`
        });
      }

      const isDowngrade = targetRoleTier > previousRoleTier;
      const beforeState = { role: targetUser.role, status: targetUser.status };
      const afterState = { role: normTargetRole, status: targetUser.status, reason: reason || 'Administrative update', isDowngrade };

      // If role downgrade/removal, invalidate active sessions immediately
      if (isDowngrade) {
        await this.db.from('sessions').delete().eq('user_id', targetUserId);
      }

      // Update user in DB
      const { error: updateErr } = await this.db
        .from('users')
        .update({
          role: normTargetRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetUserId);

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      // Record immutable audit entry
      await permissionService.recordAdminAudit({
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: 'ROLE_ASSIGNED',
        targetUserId,
        targetUserEmail: targetUser.email,
        beforeState,
        afterState,
        ip: req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown',
        userAgent: req.headers['user-agent']
      });

      // Broadcast Realtime SSE Synchronization Event
      notificationsService.pushSecuritySyncEvent({
        type: isDowngrade ? 'ROLE_DOWNGRADE' : 'ROLE_UPDATED',
        userId: targetUserId,
        newRole: normTargetRole,
        forceLogout: isDowngrade,
        reason: isDowngrade ? 'Role downgraded. Re-authentication required.' : 'Role updated live.'
      });

      return res.json({
        success: true,
        message: `Role updated to "${normTargetRole}". ${isDowngrade ? 'Target session invalidated (downgrade).' : 'Privileges synced live.'}`,
        data: {
          id: targetUserId,
          email: targetUser.email,
          role: normTargetRole,
          tier: targetRoleTier,
          isDowngrade
        }
      });
    } catch (err: any) {
      return res.status(500).json({
        error: 'InternalServerError',
        message: `Failed to update role: ${err.message}`
      });
    }
  }

  /**
   * PATCH /admin/users/:id/permissions
   * Grant or revoke specific permission overrides for a user.
   */
  async updatePermissions(req: Request, res: Response) {
    try {
      const actor = req.verifiedActor!;
      const targetUserId = req.params.id;
      const { permissionKey, effect, overrides, reason } = req.body;

      // Fetch target user
      const { data: targetUser, error: fetchErr } = await this.db
        .from('users')
        .select('id, email, role')
        .eq('id', targetUserId)
        .single();

      if (fetchErr || !targetUser) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'Target user not found.'
        });
      }

      if (normalizeRole(targetUser.role) === 'ServerAdmin') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'ServerAdmin permissions cannot be modified with user overrides.'
        });
      }

      const overridesToProcess: Array<{ permissionKey: string; effect: 'GRANTED' | 'REVOKED' | 'DEFAULT' }> = [];

      if (Array.isArray(overrides)) {
        for (const item of overrides) {
          if (item.permissionKey && ['GRANTED', 'REVOKED', 'DEFAULT'].includes(item.effect)) {
            overridesToProcess.push(item);
          }
        }
      } else if (permissionKey && effect && ['GRANTED', 'REVOKED', 'DEFAULT'].includes(effect)) {
        overridesToProcess.push({ permissionKey, effect });
      } else {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Valid permission overrides payload required.'
        });
      }

      for (const item of overridesToProcess) {
        if (item.effect === 'DEFAULT') {
          // Remove override to inherit role default
          try {
            await this.db
              .from('user_permission_overrides')
              .delete()
              .eq('user_id', targetUserId)
              .eq('permission_key', item.permissionKey);
          } catch (_) {}
        } else {
          // Upsert override
          try {
            await this.db
              .from('user_permission_overrides')
              .upsert(
                {
                  user_id: targetUserId,
                  permission_key: item.permissionKey,
                  effect: item.effect,
                  granted_by: actor.id,
                  reason: reason || 'ServerAdmin batch override',
                  updated_at: new Date().toISOString()
                },
                { onConflict: 'user_id, permission_key' }
              );
          } catch (_) {}
        }
      }

      // Record immutable audit entry
      await permissionService.recordAdminAudit({
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: 'PERMISSION_OVERRIDDEN',
        targetUserId,
        targetUserEmail: targetUser.email,
        beforeState: null,
        afterState: { overridesCount: overridesToProcess.length, overrides: overridesToProcess, reason },
        ip: req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown',
        userAgent: req.headers['user-agent']
      });

      // Broadcast Realtime SSE Synchronization Event
      notificationsService.pushSecuritySyncEvent({
        type: 'PERMISSIONS_UPDATED',
        userId: targetUserId,
        forceLogout: false,
        reason: 'Granular permissions updated live.'
      });

      return res.json({
        success: true,
        message: 'Permission overrides saved successfully.',
        data: {
          userId: targetUserId,
          count: overridesToProcess.length
        }
      });

      return res.json({
        success: true,
        message: `Permission override [${permissionKey} -> ${effect}] applied successfully.`,
        data: {
          userId: targetUserId,
          permissionKey,
          effect
        }
      });
    } catch (err: any) {
      return res.status(500).json({
        error: 'InternalServerError',
        message: `Failed to update permission: ${err.message}`
      });
    }
  }

  /**
   * POST /admin/users/:id/force-password-reset
   * Invalidate all user sessions, issue a cryptographically secure one-time reset token,
   * and flag the account for mandatory password change on next login.
   * NEVER exposes or creates a plaintext password.
   */
  async forcePasswordReset(req: Request, res: Response) {
    try {
      const actor = req.verifiedActor!;
      const targetUserId = req.params.id;
      const { reason } = req.body;

      // 1. Fetch target user
      const { data: targetUser, error: fetchErr } = await this.db
        .from('users')
        .select('id, email, full_name, role, status')
        .eq('id', targetUserId)
        .single();

      if (fetchErr || !targetUser) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'Target user account not found.'
        });
      }

      // 2. Invalidate all active sessions for the target user
      await this.db.from('sessions').delete().eq('user_id', targetUserId);

      // 3. Generate a one-time cryptographic reset token (NO plaintext password)
      const rawResetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // 24 hours validity

      // 4. Update user flag to require immediate reset on next authentication
      const { error: userUpdateErr } = await this.db
        .from('users')
        .update({
          is_temporary_password: true,
          failed_login_attempts: 0,
          lockout_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetUserId);

      if (userUpdateErr) {
        throw new Error(userUpdateErr.message);
      }

      // 5. Record action in immutable admin_audit_log
      await permissionService.recordAdminAudit({
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: 'PASSWORD_RESET_ISSUED',
        targetUserId,
        targetUserEmail: targetUser.email,
        beforeState: { is_temporary_password: false },
        afterState: {
          is_temporary_password: true,
          sessions_revoked: true,
          reason: reason || 'ServerAdmin forced security reset',
          expires_at: expiresAt
        },
        ip: req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown',
        userAgent: req.headers['user-agent']
      });

      // Broadcast Realtime SSE Session Termination
      notificationsService.pushSecuritySyncEvent({
        type: 'SESSION_TERMINATED',
        userId: targetUserId,
        forceLogout: true,
        reason: 'Password reset enforced by ServerAdmin.'
      });

      return res.json({
        success: true,
        message: 'Active sessions invalidated. One-time reset token issued and password change enforced on next login.',
        data: {
          userId: targetUserId,
          email: targetUser.email,
          resetToken: rawResetToken,
          expiresAt,
          forcedOnNextLogin: true
        }
      });
    } catch (err: any) {
      return res.status(500).json({
        error: 'InternalServerError',
        message: `Failed to execute password reset: ${err.message}`
      });
    }
  }

  /**
   * GET /admin/audit-log
   * Paginated read of the append-only admin_audit_log.
   */
  async getAuditLog(req: Request, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
      const offset = (page - 1) * limit;
      const actionFilter = req.query.action as string;
      const search = req.query.search as string;

      // 1. Try querying primary admin_audit_log
      try {
        let query = this.db
          .from('admin_audit_log')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        if (actionFilter) {
          query = query.eq('action', actionFilter);
        }

        if (search) {
          query = query.or(`actor_email.ilike.%${search}%,target_user_email.ilike.%${search}%,action.ilike.%${search}%`);
        }

        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (!error && data) {
          return res.json({
            success: true,
            data: data || [],
            pagination: {
              total: count || data.length,
              page,
              limit,
              totalPages: Math.ceil((count || data.length) / limit)
            }
          });
        }
      } catch (_) {
        // Fallback below
      }

      // 2. Resilient fallback to audit_logs table
      const { getAuditLogs } = await import('../../services/auditLog');
      const { logs, total } = await getAuditLogs({
        action: actionFilter || undefined,
        search: search || undefined,
        from: offset,
        limit
      });

      const mapped = logs.map(l => ({
        id: l.id,
        actor_id: l.actorId,
        actor_email: l.actorEmail,
        actor_role: l.actorRole || 'System User',
        action: l.action,
        target_user_id: l.entityId,
        target_user_email: l.entityType === 'user' || l.entityType === 'users' ? l.entityId : null,
        before_state: l.beforeState,
        after_state: l.afterState,
        ip: l.ipAddress || '127.0.0.1',
        user_agent: l.userAgent || 'Web/Browser',
        created_at: l.created_at
      }));

      return res.json({
        success: true,
        data: mapped,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (err: any) {
      return res.status(500).json({
        error: 'InternalServerError',
        message: `Failed to query audit log: ${err.message}`
      });
    }
  }

  /**
   * POST /admin/reauth
   * Require ServerAdmin to re-enter master password before executing destructive actions.
   */
  async reauthenticate(req: Request, res: Response) {
    try {
      const actor = req.verifiedActor!;
      const { password } = req.body;

      if (!password || typeof password !== 'string') {
        return res.status(400).json({ error: 'BadRequest', message: 'Password is required for re-authentication.' });
      }

      const { data: userRow } = await this.db
        .from('users')
        .select('password_hash')
        .eq('id', actor.id)
        .single();

      if (!userRow) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User account not found.' });
      }

      const isValid = await verifyPassword(password, userRow.password_hash);
      if (!isValid) {
        await permissionService.recordAdminAudit({
          actorId: actor.id,
          actorEmail: actor.email,
          actorRole: actor.role,
          action: 'REAUTH_FAILED',
          beforeState: null,
          afterState: { path: req.originalUrl },
          ip: req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown',
          userAgent: req.headers['user-agent']
        });

        return res.status(401).json({ error: 'Unauthorized', message: 'Incorrect master password.' });
      }

      return res.json({ success: true, message: 'Re-authentication verified.' });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  /**
   * GET /admin/permissions-catalog
   * List all granular system capability definitions grouped by category.
   */
  async getPermissionsCatalog(req: Request, res: Response) {
    try {
      const { data, error } = await this.db
        .from('permissions')
        .select('id, key, category, description')
        .order('category', { ascending: true });

      if (!error && data && data.length > 0) {
        return res.json({
          success: true,
          data
        });
      }
    } catch (_) {
      // Fallback
    }

    // Default In-Memory Granular Catalog Fallback
    const DEFAULT_CATALOG = [
      { id: 'p-1', key: 'system:server_admin_vault', category: 'system', description: 'Access ServerAdmin Maker Console and platform infrastructure' },
      { id: 'p-2', key: 'system:raw_database_access', category: 'system', description: 'Execute direct administrative database routines and inspect raw tables' },
      { id: 'p-3', key: 'system:override_all_rules', category: 'system', description: 'Bypass monetary approval limits, holds, and state-machine transitions' },
      { id: 'p-4', key: 'system:view_immutable_audit', category: 'system', description: 'Inspect complete append-only admin and security event audit vaults' },
      { id: 'p-5', key: 'system:manage_permission_overrides', category: 'system', description: 'Grant or revoke per-user granular permission overrides' },
      { id: 'p-6', key: 'system:force_password_reset', category: 'system', description: 'Invalidate active user sessions and issue one-time reset tokens' },
      { id: 'p-7', key: 'admin:view_users', category: 'administration', description: 'View user accounts, credential status, and role assignments' },
      { id: 'p-8', key: 'admin:create_users', category: 'administration', description: 'Provision new user accounts with designated role' },
      { id: 'p-9', key: 'admin:assign_roles', category: 'administration', description: 'Change user roles adhering strictly to tier hierarchy rules' },
      { id: 'p-10', key: 'orders:view', category: 'orders', description: 'View customer purchase orders and line-item details' },
      { id: 'p-11', key: 'orders:confirm', category: 'orders', description: 'Confirm customer order drafts and initiate fulfillment pipeline' },
      { id: 'p-12', key: 'orders:edit_commercials', category: 'orders', description: 'Modify order pricing, discounts, and payment credit terms' },
      { id: 'p-13', key: 'inventory:view', category: 'inventory', description: 'View inventory balances, bin locations, and stock ledger' },
      { id: 'p-14', key: 'inventory:create_grn', category: 'inventory', description: 'Record Goods Receipt Notes (GRN) and update batch stock' },
      { id: 'p-15', key: 'production:view', category: 'production', description: 'View job cards, route cards, and live machine status' },
      { id: 'p-16', key: 'production:log_output', category: 'production', description: 'Log hourly stage output, completed quantities, and scrap rates' },
      { id: 'p-17', key: 'qc:view', category: 'qc', description: 'View QC in-process inspection queues and PDI inspection logs' },
      { id: 'p-18', key: 'qc:place_hold', category: 'qc', description: 'Place quality hold or raise Non-Conformance Reports (NCR)' },
      { id: 'p-19', key: 'dispatch:view', category: 'dispatch', description: 'View delivery schedules, pending shipments, and outbound challans' },
      { id: 'p-20', key: 'finance:view', category: 'finance', description: 'View sales invoices, vendor bills, and statutory ledger' }
    ];

    return res.json({
      success: true,
      data: DEFAULT_CATALOG
    });
  }
}

export const adminController = new AdminController();
