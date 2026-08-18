import { Request, Response } from 'express';
import { authService } from './auth.service';
import { recordFailedLogin, clearFailedLogin } from '../../middleware/rateLimit';
import { GeoLocationService } from '../../utils/geolocation';
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
    const ip = GeoLocationService.extractClientIp(req);
    const userAgent = req.headers['user-agent'];

    if (!email) {
      return res.status(400).json({ error: 'BadRequest', message: 'Email is required.' });
    }

    try {
      const result = await authService.login(email, password, ip, userAgent, req.headers);
      clearFailedLogin(ip, email);

      setRefreshTokenCookie(res, result.refreshToken, result.expiresAt);

      return res.json({
        access_token: result.accessToken,
        user: result.user,
        risk_info: result.riskInfo
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
    const ip = GeoLocationService.extractClientIp(req);
    const userAgent = req.headers['user-agent'];

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No refresh token provided in cookies or request body.'
      });
    }

    try {
      const result = await authService.refreshSession(refreshToken, ip, userAgent, req.headers);
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
   * GET /api/v1/auth/sessions
   * Returns active sessions for the currently authenticated user.
   */
  async getSessions(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
    }

    const currentRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

    try {
      const sessions = await authService.getActiveSessions(userId, currentRefreshToken);
      return res.json({ sessions });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  /**
   * DELETE /api/v1/auth/sessions/:id
   * Revokes a specific active session.
   */
  async revokeSession(req: Request, res: Response) {
    const userId = req.user?.id;
    const sessionId = req.params.id;

    if (!userId || !sessionId) {
      return res.status(400).json({ error: 'BadRequest', message: 'Session ID is required.' });
    }

    try {
      const result = await authService.revokeSession(sessionId, userId);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: 'BadRequest', message: err.message });
    }
  }

  /**
   * POST /api/v1/auth/sessions/revoke-others
   * Revokes all active sessions for user except current.
   */
  async revokeOtherSessions(req: Request, res: Response) {
    const userId = req.user?.id;
    const currentRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
    }

    if (!currentRefreshToken) {
      return res.status(400).json({ error: 'BadRequest', message: 'Current session verification token is missing.' });
    }

    try {
      const result = await authService.revokeOtherSessions(userId, currentRefreshToken);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: 'BadRequest', message: err.message });
    }
  }

  /**
   * POST /api/v1/auth/sessions/revoke-all
   * High security trigger: revokes all active sessions including current.
   */
  async revokeAllSessions(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
    }

    try {
      const result = await authService.revokeAllSessions(userId);
      clearRefreshTokenCookie(res);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  /**
   * GET /api/v1/auth/security-events
   * Returns user's own login and security history.
   */
  async getSecurityEvents(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
    }

    const limit = parseInt(String(req.query.limit || '50'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);

    try {
      const events = await authService.getUserSecurityEvents(userId, limit, offset);
      return res.json({ events });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  /**
   * GET /api/v1/auth/security-events/admin
   * Super Admin security audit stream.
   */
  async getAdminSecurityAudit(req: Request, res: Response) {
    if (req.user?.role !== 'SUPER ADMIN') {
      return res.status(403).json({ error: 'Forbidden', message: 'Super Admin access required for security audit stream.' });
    }

    const limit = parseInt(String(req.query.limit || '100'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);
    const severity = req.query.severity ? String(req.query.severity) : undefined;

    try {
      const events = await authService.getAdminSecurityAudit(limit, offset, severity);
      return res.json({ events });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  /**
   * POST /api/v1/auth/change-password
   */
  async changePassword(req: Request, res: Response) {
    const userId = req.user?.id;
    const { oldPassword, newPassword } = req.body;
    const currentRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
    }

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'BadRequest', message: 'Current password and new password are required.' });
    }

    try {
      const result = await authService.changePassword(userId, oldPassword, newPassword, currentRefreshToken);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: 'BadRequest', message: err.message });
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
   * PATCH/PUT /api/v1/auth/users/:id
   */
  async updateUser(req: Request, res: Response) {
    try {
      const actorContext = {
        id: req.user?.id,
        email: req.user?.email || 'owner@guruom.in',
        role: req.user?.role || 'Owner',
        name: req.user?.name || 'Owner'
      };
      const user = await authService.updateUser(req.params.id, req.body, actorContext);
      return res.json({ message: 'User updated successfully', user });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ error: 'BadRequest', message: err.message });
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

  /**
   * POST /api/v1/auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;
    const ip = GeoLocationService.extractClientIp(req);
    const userAgent = req.headers['user-agent'] as string;

    if (!email) {
      return res.status(400).json({ error: 'BadRequest', message: 'Email address is required.' });
    }

    try {
      const result = await authService.requestPasswordReset(email, ip, userAgent);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  /**
   * POST /api/v1/auth/reset-password
   */
  async resetPassword(req: Request, res: Response) {
    const { token, newPassword } = req.body;
    const ip = GeoLocationService.extractClientIp(req);
    const userAgent = req.headers['user-agent'] as string;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'BadRequest', message: 'Reset token and new password are required.' });
    }

    try {
      const result = await authService.resetPasswordWithToken(token, newPassword, ip, userAgent);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: 'BadRequest', message: err.message });
    }
  }
}

export const authController = new AuthController();
