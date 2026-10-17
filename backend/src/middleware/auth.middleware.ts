import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtUserPayload } from '../utils/jwt';
import { authService } from '../modules/auth/auth.service';

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

function isPasswordChangeExempt(req: Request): boolean {
  const url = (req.originalUrl || req.baseUrl + req.path || req.path || '').split('?')[0].toLowerCase();
  return (
    url.endsWith('/auth/change-password') ||
    url.endsWith('/change-password') ||
    url.endsWith('/auth/logout') ||
    url.endsWith('/logout') ||
    url.endsWith('/auth/me') ||
    url.endsWith('/me')
  );
}

/**
 * Authentication middleware that validates Bearer JWT access token from Authorization header.
 * NOTE: There is intentionally NO dev bypass — every request must present a valid JWT.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Expected Bearer token.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;

    // Enforce mandatory password change for temporary passwords across all authenticated routes
    if (payload.isTemporaryPassword) {
      if (isPasswordChangeExempt(req)) {
        return next();
      }

      // Verify whether the user has already changed password in database
      const user = await authService.findUserById(payload.id);
      if (user && !user.is_temporary_password) {
        req.user.isTemporaryPassword = false;
        return next();
      }

      return res.status(403).json({
        error: 'Forbidden',
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Password change is required before using the application.'
      });
    }

    return next();
  } catch (err: any) {
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

