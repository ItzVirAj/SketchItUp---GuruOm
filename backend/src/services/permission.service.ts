// ============================================================================
// File: backend/src/services/permission.service.ts
// Description: Core Server-Side Effective Permission Resolver, Tier Hierarchy Engine,
//              and Immutable Admin Audit Logger.
// ============================================================================

import { getDbClient } from '../config/database';
import { normalizeRole } from '../../../src/utils/rbacMatrix';

export interface AdminAuditEntry {
  actorId?: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetUserId?: string;
  targetUserEmail?: string;
  beforeState?: Record<string, any> | null;
  afterState?: Record<string, any> | null;
  ip?: string;
  userAgent?: string;
}

// Canonical Tier Definitions (0 is highest authority, 6 is lowest)
export const ROLE_TIER_MAP: Record<string, number> = {
  'ServerAdmin': 0,
  'Owner': 1,
  'Admin (System)': 2,
  'Purchase Manager': 3,
  'Accountant': 3,
  'Production Planner': 3,
  'Quality Auditor': 3,
  'Quality Inspector': 4,
  'Store Keeper': 4,
  'Dispatch Executive': 4,
  'Sales/Order Desk': 4,
  'Subcontractor Coordinator': 4,
  'Shop Floor Supervisor': 4,
  'HR/Admin': 4,
  'Machine Operator': 5,
  'Client': 6
};

export class PermissionService {
  private db = getDbClient();

  /**
   * Resolve a user's effective permissions:
   * Effective Permissions = (Role Default Permissions) + (User Grants) - (User Revokes)
   */
  async getEffectiveUserPermissions(userId: string, rawRole?: string): Promise<Set<string>> {
    const effective = new Set<string>();

    try {
      // 1. Fetch user & role directly from DB if not provided or to ensure freshness
      let role = rawRole ? normalizeRole(rawRole) : '';
      if (!role) {
        const { data: userRow } = await this.db
          .from('users')
          .select('role, status')
          .eq('id', userId)
          .single();

        if (!userRow || userRow.status !== 'ACTIVE') {
          return effective; // Fail closed if inactive or not found
        }
        role = normalizeRole(userRow.role);
      }

      // ServerAdmin has full, unrestricted platform capabilities
      if (role === 'ServerAdmin') {
        const { data: allPerms } = await this.db.from('permissions').select('key');
        if (allPerms) {
          allPerms.forEach((p: { key: string }) => effective.add(p.key));
        } else {
          effective.add('*');
        }
        return effective;
      }

      // 2. Fetch role default permissions from role_permission_grants
      const { data: roleRow } = await this.db
        .from('roles')
        .select('id')
        .eq('name', role)
        .maybeSingle();

      if (roleRow) {
        const { data: grants } = await this.db
          .from('role_permission_grants')
          .select('permissions ( key )')
          .eq('role_id', roleRow.id);

        if (grants) {
          grants.forEach((g: any) => {
            if (g.permissions?.key) {
              effective.add(g.permissions.key);
            }
          });
        }
      }

      // 3. Apply user-specific permission overrides (Grants & Revokes)
      const { data: overrides } = await this.db
        .from('user_permission_overrides')
        .select('permission_key, effect')
        .eq('user_id', userId);

      if (overrides) {
        for (const ov of overrides) {
          if (ov.effect === 'GRANTED') {
            effective.add(ov.permission_key);
          } else if (ov.effect === 'REVOKED') {
            effective.delete(ov.permission_key);
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ [PermissionService] Error resolving effective permissions:', err);
    }

    return effective;
  }

  /**
   * Check if a specific user has a required permission capability
   */
  async hasPermission(userId: string, requiredPermission: string, role?: string): Promise<boolean> {
    const effective = await this.getEffectiveUserPermissions(userId, role);
    return effective.has('*') || effective.has(requiredPermission);
  }

  /**
   * Get the numerical tier of a role (Lower = Higher Authority)
   */
  async getRoleTier(roleName: string): Promise<number> {
    const norm = normalizeRole(roleName);
    if (ROLE_TIER_MAP[norm] !== undefined) {
      return ROLE_TIER_MAP[norm];
    }

    const { data } = await this.db
      .from('roles')
      .select('tier')
      .eq('name', norm)
      .maybeSingle();

    return data?.tier ?? 99;
  }

  /**
   * Record action into the immutable admin_audit_log
   */
  async recordAdminAudit(entry: AdminAuditEntry): Promise<void> {
    try {
      await this.db.from('admin_audit_log').insert({
        actor_id: entry.actorId || null,
        actor_email: entry.actorEmail,
        actor_role: entry.actorRole,
        action: entry.action,
        target_user_id: entry.targetUserId || null,
        target_user_email: entry.targetUserEmail || null,
        before_state: entry.beforeState || null,
        after_state: entry.afterState || null,
        ip: entry.ip || null,
        user_agent: entry.userAgent || null,
        created_at: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('❌ [PermissionService] Critical: Admin audit log insert failed:', err.message);
    }
  }
}

export const permissionService = new PermissionService();
