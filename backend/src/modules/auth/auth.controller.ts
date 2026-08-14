import { Request, Response } from 'express';
import { authService } from './auth.service';
import { recordFailedLogin, clearFailedLogin } from '../../middleware/rateLimit';
import { ENV } from '../../config/env';

const REFRESH_COOKIE_NAME = 'owner_os_refresh_token';

function setRefreshTokenCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: ENV.NODE_ENV === 'production',
    sameSite: ENV.NODE_ENV === 'production' ? 'strict' : 'lax',
    expires: expiresAt,
    path: '/'
  });
}

function clearRefreshTokenCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: ENV.NODE_ENV === 'production',
    sameSite: ENV.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/'
  });
}

export class AuthController {
  /**
   * POST /api/v1/auth/login
   */
  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const userAgent = req.headers['user-agent'];

    if (!email) {
      return res.status(400).json({ error: 'BadRequest', message: 'Email is required.' });
    }

    try {
      const result = await authService.login(email, password, ip, userAgent);
      clearFailedLogin(ip, email);

      setRefreshTokenCookie(res, result.refreshToken, result.expiresAt);

      return res.json({
        access_token: result.accessToken,
        user: result.user
      });
    } catch (err: any) {
      recordFailedLogin(ip, email);
      return res.status(401).json({
        error: 'Unauthorized',
        message: err.message || 'Invalid email or password.'
      });
    }
  }

  /**
   * POST /api/v1/auth/refresh
   */
  async refresh(req: Request, res: Response) {
    const tokenFromCookie = req.cookies?.[REFRESH_COOKIE_NAME];
    const tokenFromBody = req.body?.refreshToken;
    const refreshToken = tokenFromCookie || tokenFromBody;
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const userAgent = req.headers['user-agent'];

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No refresh token provided in cookies or request body.'
      });
    }

    try {
      const result = await authService.refreshSession(refreshToken, ip, userAgent);
      setRefreshTokenCookie(res, result.refreshToken, result.expiresAt);

      return res.json({
        access_token: result.accessToken,
        user: result.user
      });
    } catch (err: any) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        error: 'Unauthorized',
        message: err.message || 'Session expired or invalidated. Please log in again.'
      });
    }
  }

  /**
   * POST /api/v1/auth/logout
   */
  async logout(req: Request, res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    clearRefreshTokenCookie(res);
    return res.json({ success: true, message: 'Logged out successfully.' });
  }

  /**
   * GET /api/v1/auth/me
   */
  async getMe(req: Request, res: Response) {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
    }

    try {
      const user = await authService.getMe(req.user.id);
      return res.json({ user });
    } catch (err: any) {
      return res.status(404).json({ error: 'NotFound', message: err.message || 'User record not found.' });
    }
  }

  /**
   * POST /api/v1/auth/register
   */
  async register(req: Request, res: Response) {
    const { email, password, name, role, department, phone } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'BadRequest', message: 'Email is required.' });
    }

    try {
      const newUser = await authService.register({
        email,
        password,
        name,
        role,
        department,
        phone
      });

      return res.status(201).json({
        message: 'User provisioned successfully.',
        user: newUser
      });
    } catch (err: any) {
      return res.status(400).json({
        error: 'BadRequest',
        message: err.message || 'Failed to create user.'
      });
    }
  }

  /**
   * GET /api/v1/auth/users
   */
  async getUsers(req: Request, res: Response) {
    try {
      const data = await authService.getAllUsers();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  /**
   * PATCH /api/v1/auth/users/:id/role
   */
  async updateUserRole(req: Request, res: Response) {
    try {
      const actorId = req.user?.id;
      const data = await authService.updateUserRole(req.params.id, req.body.role, actorId);
      return res.json({ message: 'User role updated', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'BadRequest', message: err.message });
    }
  }

  /**
   * PATCH /api/v1/auth/users/:id/status
   */
  async updateUserStatus(req: Request, res: Response) {
    try {
      const actorId = req.user?.id;
      const data = await authService.updateUserStatus(req.params.id, req.body.status, actorId);
      return res.json({ message: 'User status updated', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'BadRequest', message: err.message });
    }
  }

  /**
   * DELETE /api/v1/auth/users/:id
   */
  async deleteUser(req: Request, res: Response) {
    try {
      const actorId = req.user?.id;
      const data = await authService.deleteUser(req.params.id, actorId);
      return res.json({ message: 'User deleted permanently', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'BadRequest', message: err.message });
    }
  }
}

export const authController = new AuthController();
