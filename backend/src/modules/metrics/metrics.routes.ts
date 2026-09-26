import { Router } from 'express';
import { metricsController } from './metrics.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();
router.use(requireAuth);

const OWNER_ROLES = ['SUPER ADMIN', 'ADMIN_OWNER', 'ADMIN', 'Owner', 'Super Admin', 'Admin', 'Owner / Managing Director'];

router.get('/history', requireRole(OWNER_ROLES), (req, res) => metricsController.getHistory(req, res));
router.post('/capture-today', requireRole(OWNER_ROLES), (req, res) => metricsController.captureToday(req, res));
router.post('/backfill', requireRole(OWNER_ROLES), (req, res) => metricsController.backfill(req, res));

export default router