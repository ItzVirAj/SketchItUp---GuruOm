import { Router } from 'express';
import { purchasingController } from './purchasing.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => purchasingController.getPurchaseOrders(req, res));
router.get('/:id', (req, res) => purchasingController.getPurchaseOrderById(req, res));
router.post('/', requireRole(['SUPER ADMIN', 'FINANCE_MANAGER', 'DISPATCH_CLERK']), (req, res) => purchasingController.createPurchaseOrder(req, res));
router.patch('/:id/review', requireRole(['SUPER ADMIN', 'FINANCE_MANAGER']), (req, res) => purchasingController.reviewApproval(req, res));

export default router;
