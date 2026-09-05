import { useAuth } from '../context/AuthContext';
import { CtaId, isRoleAuthorizedForCta, normalizeRole } from '../utils/rbacMatrix';

/**
 * Checks whether the given user object has permission for a specific CTA
 * by evaluating granular overrides before falling back to the role matrix.
 */
export function checkCtaPermission(authUser: any, ctaId: CtaId): boolean {
  if (!authUser) return false;

  // 1. Read the user's permissionOverrides from in-memory user/profile object
  const overrides = authUser.permissionOverrides ?? authUser.permission_overrides;
  const targetKey = `cta:${ctaId}`;

  // 2 & 3. Check overrides (array or map)
  if (Array.isArray(overrides)) {
    const override = overrides.find((o: any) =>
      (o.permission_key === targetKey || o.key === targetKey || o.permissionKey === targetKey)
    );
    if (override) {
      // 2. Explicitly REVOKED → return false
      if (override.effect === 'REVOKED') return false;
      // 3. Explicitly GRANTED → return true
      if (override.effect === 'GRANTED') return true;
    }
  } else if (overrides && typeof overrides === 'object') {
    const entry = overrides[targetKey];
    if (typeof entry === 'string') {
      if (entry === 'REVOKED') return false;
      if (entry === 'GRANTED') return true;
    } else if (entry && typeof entry === 'object' && entry.effect) {
      if (entry.effect === 'REVOKED') return false;
      if (entry.effect === 'GRANTED') return true;
    }
  }

  // 4. Otherwise fall back to isRoleAuthorizedForCta(role, ctaId) from rbacMatrix.ts
  const rawRole = authUser.role || authUser.userRole || '';
  const normRole = normalizeRole(rawRole);
  return isRoleAuthorizedForCta(normRole, ctaId);
}

/**
 * Custom React hook that evaluates CTA authorization for the currently authenticated user.
 * Wraps CTA button renders so a REVOKED CTA is fully hidden.
 */
export function useCtaPermission(ctaId: CtaId): boolean {
  const { user, profile } = useAuth();
  const authUser = user || profile;
  return checkCtaPermission(authUser, ctaId);
}
