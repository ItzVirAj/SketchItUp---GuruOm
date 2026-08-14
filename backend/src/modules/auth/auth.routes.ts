import { Router } from 'express';
import { authController } from './auth.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { loginRateLimiter } from '../../middleware/rateLimit';

const router = Router();

// Public Auth Endpoints
router.post('/login', loginRateLimiter, (req, res) => authController.login(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));

// User Provisioning (Self-registration or Admin user setup)
router.post('/register', (req, res) => authController.register(req, res));
router.post('/users', requireAuth, (req, res) => authController.register(req, res));

// Protected Auth Endpoints
router.get('/me', requireAuth, (req, res) => authController.getMe(req, res));
router.get('/users', requireAuth, (req, res) => authController.getUsers(req, res));
router.patch('/users/:id/role', requireAuth, (req, res) => authController.updateUserRole(req, res));
router.patch('/users/:id/status', requireAuth, (req, res) => authController.updateUserStatus(req, res));
router.delete('/users/:id', requireAuth, (req, res) => authController.deleteUser(req, res));

export default router;
