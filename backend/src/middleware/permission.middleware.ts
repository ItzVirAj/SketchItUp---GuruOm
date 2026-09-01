// ============================================================================
// File: backend/src/middleware/permission.middleware.ts
// Description: Server-side Permission Verification & ServerAdmin Guard Middleware.
//              Fail-closed design: Every route independently re-verifies session
//              and actor state from the database.
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { getDbClient } from '../config/database';
import { permissionService } from '../services/permission.service';
import { normalizeRole } from '../../../src/utils/rbacMatrix';

export interface VerifiedActor {
  id: string;
  email: string;
  role: string;
  tier: number;
  status: string;
}

declare global {
  namespace Express {
    interface Request {
      verifiedActor?: VerifiedActor;
      effectivePermissions?: Set<string>;
    }
  }
}

/**
 * Re-verify the authenticated user from the database to avoid trusting client claims.
 */
async function verifySessionActor(req: Request): Promise<VerifiedActor | null> {
  const sessionUser = req.user as any;
  if (!sessionUser) {
    return null;
  }

  const userId = sessionUser.userId || sessionUser.sub || sessionUser.id;
  const db = getDbClient();

  let query = db.from('users').select('id, email, role, status');
  if (userId) {
    query = query.eq('id', userId);
  } else if (sessionUser.email) {
    query = query.eq('email', sessionUser.email.toLowerCase());
  } else {
    return null;
  }

  const { data: user, error } = await query.single();

  if (error || !user || user.status !== 'ACTIVE') {
    return null;
  }

  const normRole = normalizeRole(user.role);
  const tier = await permissionService.getRoleTier(normRole);

  return {
    id: user.id,
    email: user.email,
    role: normRole,
    tier,
    status: user.status
  };
}

/**
 * Guard middleware requiring an active, verified ServerAdmin session.
 * Exclusively for platform dev/maker team access.
 */
export async function requireServerAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = await verifySessionActor(req);

    if (!actor) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'A valid authenticated session is required.'
      });
    }

    if (actor.role !== 'ServerAdmin' || actor.tier !== 0) {
      // Record security violation in immutable admin audit log
      await permissionService.recordAdminAudit({
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: 'SERVER_ADMIN_FORBIDDEN_ACCESS_ATTEMPT',
        beforeState: null,
        afterState: { attemptedUrl: req.originalUrl, method: req.method },
        ip: req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown',
        userAgent: req.headers['user-agent']
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied. This module is strictly restricted to ServerAdmin (Maker/Dev Team).'
      });
    }

    req.verifiedActor = actor;
    return next();
  } catch (err: any) {
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to verify administrative credentials.'
    });
  }
}

/**
 * Universal Effective Permission Checker Middleware.
 * Resolves (Role Defaults + User Grants - User Revokes).
 */
export function requireEffectivePermission(permissionKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = await verifySessionActor(req);

      if (!actor) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required.'
        });
      }

      req.verifiedActor = actor;

      // ServerAdmin has universal permission bypass
      if (actor.role === 'ServerAdmin' && actor.tier === 0) {
        return next();
      }

      // Owner & Admin (System) have universal permission bypass for all business operational & administrative actions
      if (actor.role === 'Owner' || actor.role === 'Admin (System)') {
        if (!permissionKey.startsWith('system:server_admin_vault') && 
            !permissionKey.startsWith('system:raw_database_access') && 
            !permissionKey.startsWith('system:manage_platform_tenants')) {
          return next();
        }
      }

      const effectivePermissions = await permissionService.getEffectiveUserPermissions(actor.id, actor.role);
      req.effectivePermissions = effectivePermissions;

      const hasAccess = effectivePermissions.has('*') || effectivePermissions.has(permissionKey);

      if (!hasAccess) {
        await permissionService.recordAdminAudit({
          actorId: actor.id,
          actorEmail: actor.email,
          actorRole: actor.role,
          action: 'PERMISSION_DENIED',
          beforeState: null,
          afterState: { requiredPermission: permissionKey, path: req.originalUrl },
          ip: req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown',
          userAgent: req.headers['user-agent']
        });

        return res.status(403).json({
          error: 'Forbidden',
          message: `Access denied. Missing required permission capability: [${permissionKey}].`
        });
      }

      return next();
    } catch (err: any) {
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Error verifying permissions.'
      });
    }
  };
}
