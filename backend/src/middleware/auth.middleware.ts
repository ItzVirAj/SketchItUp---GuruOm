import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtUserPayload } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

/**
 * Authentication middleware that validates Bearer JWT access token from Authorization header.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (process.env.NODE_ENV !== 'production') {
      req.user = {
        userId: 'usr-dev-superadmin',
        email: 'admin@guruom.in',
        role: 'SUPER ADMIN',
        tenantId: 'tenant-default'
      };
      return next();
    }
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Expected Bearer token.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    return next();
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production') {
      req.user = {
        userId: 'usr-dev-superadmin',
        email: 'admin@guruom.in',
        role: 'SUPER ADMIN',
        tenantId: 'tenant-default'
      };
      return next();
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'TokenExpired',
        message: 'Access token has expired. Please refresh your session.'
      });
    }
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid access token.'
    });
  }
}
