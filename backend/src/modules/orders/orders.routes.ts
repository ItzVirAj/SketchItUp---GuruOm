import { Router } from 'express';
import { ordersController } from './orders.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

// Apply Authentication to all order routes
router.use(requireAuth);

router.get('/', (req, res) => ordersController.getOrders(req, res));
router.get('/:id', (req, res) => ordersController.getOrderById(req, res));
router.post('/', requireRole(['SUPER ADMIN', 'DISPATCH_CLERK', 'FINANCE_MANAGER']), (req, res) => ordersController.createOrder(req, res));
router.patch('/:id/status', requireRole(['SUPER ADMIN', 'OPERATOR', 'QC_MANAGER', 'DISPATCH_CLERK', 'FINANCE_MANAGER']), (req, res) => ordersController.updateOrderStatus(req, res));

export default router;
