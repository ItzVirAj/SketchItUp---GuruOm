import { Request, Response, NextFunction } from 'express';

export type UserRole = 'SUPER ADMIN' | 'OPERATOR' | 'QC_MANAGER' | 'DISPATCH_CLERK' | 'FINANCE_MANAGER';

/**
 * Role-Based Access Control (RBAC) middleware.
 * Verifies that the authenticated user possesses one of the allowed roles.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required prior to permission verification.'
      });
    }

    const userRole = req.user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Role "${userRole}" lacks permission for this endpoint. Required: [${allowedRoles.join(', ')}]`
      });
    }

    return next();
  };
}
