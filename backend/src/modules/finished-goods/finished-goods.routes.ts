import { Router } from 'express';
import { finishedGoodsController } from './finished-goods.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => finishedGoodsController.getFinishedGoods(req, res));
router.get('/:orderPo', (req, res) => finishedGoodsController.getFinishedGoodsByOrder(req, res));
router.post('/', requireRole(['SUPER ADMIN', 'OPERATOR', 'DISPATCH_CLERK']), (req, res) => finishedGoodsController.recordFinishedGoods(req, res));
router.patch('/:id/reconcile', requireRole(['SUPER ADMIN', 'OPERATOR', 'DISPATCH_CLERK']), (req, res) => finishedGoodsController.reconcileFinishedGoods(req, res));

export default router;
