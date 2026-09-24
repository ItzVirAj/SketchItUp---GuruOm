import { getDbClient } from '../config/database';
import { RBAC_ROLE_MATRIX } from '../../../src/utils/rbacMatrix';
import { logger } from './logger';

/**
 * RBAC fix #1 — this app has two role systems: the static TS matrix
 * (RBAC_ROLE_MATRIX, source of truth for requirePermission()) and a
 * DB-driven roles/role_permission_grants system (used by
 * permission.service.ts for per-user granular overrides). Nothing
 * mechanically keeps their role *vocabulary* in sync — migration 039
 * created a 'TESTER' row in the DB independently of the matrix gaining its
 * own 'TESTER' block, and they only happened to agree because someone was
 * careful.
 *
 * This is deliberately a WARNING, not a startup failure: a mismatch here
 * doesn't mean any single request is insecure (requirePermission() doesn't
 * consult the DB roles table at all), so refusing to boot over it would be
 * disproportionate. It means the two systems have drifted and a human
 * should look — logged loudly enough to not be ignored, without taking the
 * app down over what is, today, a data-hygiene issue rather than a live
 * authorization bypass.
 */
export async function checkRbacRoleConsistency(): Promise<void> {
  const matrixRoles = new Set(Object.keys(RBAC_ROLE_MATRIX));

  let dbRoles: Set<string>;
  try {
    const db = getDbClient();
    const { data, error } = await db.from('roles').select('name');
    if (error) throw error;
    dbRoles = new Set((data || []).map((r: any) => r.name));
  } catch (err) {
    logger.warn('[RBAC Consistency Check] Could not read public.roles — skipping this check.', err);
    return;
  }

  const inMatrixOnly = [...matrixRoles].filter((r) => !dbRoles.has(r));
  const inDbOnly = [...dbRoles].filter((r) => !matrixRoles.has(r));

  if (inMatrixOnly.length === 0 && inDbOnly.length === 0) {
    logger.info('[RBAC Consistency Check] rbacMatrix.ts and public.roles agree on role vocabulary.');
    return;
  }

  if (inMatrixOnly.length > 0) {
    logger.warn(
      `[RBAC Consistency Check] These roles exist in rbacMatrix.ts (RBAC_ROLE_MATRIX) but have no row in public.roles: ${inMatrixOnly.join(', ')}. ` +
      `Per-user granular overrides (ServerAdmin Vault) won't work for these roles until a matching public.roles row exists.`
    );
  }
  if (inDbOnly.length > 0) {
    logger.warn(
      `[RBAC Consistency Check] These roles exist in public.roles but have no block in rbacMatrix.ts (RBAC_ROLE_MATRIX): ${inDbOnly.join(', ')}. ` +
      `requirePermission()/hasMinimumAccess() will fall back to Shop Floor Supervisor's tier for any user actually carrying one of these roles — ` +
      `almost certainly not what's intended. Add a matrix block or remove the stale DB row.`
    );
  }
}
