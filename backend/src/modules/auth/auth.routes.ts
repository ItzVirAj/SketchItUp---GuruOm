import { Router } from 'express';
import { authController } from './auth.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { 
  loginRateLimiter, 
  refreshRateLimiter, 
  passwordChangeRateLimiter, 
  sessionRevokeRateLimiter 
} from '../../middleware/rateLimit';

const router = Router();

// 1. Public Auth Endpoints
router.post('/login', loginRateLimiter, (req, res) => authController.login(req, res));
router.post('/refresh', refreshRateLimiter, (req, res) => authController.refresh(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));

// 2. User Provisioning (Self-registration or Admin user setup)
router.post('/register', (req, res) => authController.register(req, res));
router.post('/users', requireAuth, (req, res) => authController.register(req, res));

// 3. User Profile & Credential Management
router.get('/me', requireAuth, (req, res) => authController.getMe(req, res));
router.post('/change-password', requireAuth, passwordChangeRateLimiter, (req, res) => authController.changePassword(req, res));

// 4. Active Sessions Management Endpoints
router.get('/sessions', requireAuth, (req, res) => authController.getSessions(req, res));
router.delete('/sessions/:id', requireAuth, sessionRevokeRateLimiter, (req, res) => authController.revokeSession(req, res));
router.post('/sessions/revoke-others', requireAuth, sessionRevokeRateLimiter, (req, res) => authController.revokeOtherSessions(req, res));
router.post('/sessions/revoke-all', requireAuth, sessionRevokeRateLimiter, (req, res) => authController.revokeAllSessions(req, res));

// 5. Security Events & Login History Endpoints
router.get('/security-events', requireAuth, (req, res) => authController.getSecurityEvents(req, res));
router.get('/security-events/admin', requireAuth, (req, res) => authController.getAdminSecurityAudit(req, res));

// 6. User Management Endpoints (Admin)
router.get('/users', requireAuth, (req, res) => authController.getUsers(req, res));
router.patch('/users/:id/role', requireAuth, (req, res) => authController.updateUserRole(req, res));
router.patch('/users/:id/status', requireAuth, (req, res) => authController.updateUserStatus(req, res));
router.delete('/users/:id', requireAuth, (req, res) => authController.deleteUser(req, res));

export default router;
