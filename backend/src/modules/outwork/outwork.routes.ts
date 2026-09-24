import { Router } from 'express';
import { outworkController } from './outwork.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('production', 'VIEW_ONLY'), (req, res) => outworkController.getSubcontractOrders(req, res));
router.post('/gate-out', requirePermission('production', 'CREATE_EDIT'), (req, res) => outworkController.dispatchGateOut(req, res));
router.post('/gate-in', requirePermission('production', 'CREATE_EDIT'), (req, res) => outworkController.receiveGateIn(req, res));
router.get('/alerts/overdue', requirePermission('production', 'VIEW_ONLY'), (req, res) => outworkController.getOverdueAlerts(req, res));

export default router;
