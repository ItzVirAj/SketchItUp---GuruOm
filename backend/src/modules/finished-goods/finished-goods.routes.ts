import { Router } from 'express';
import { finishedGoodsController } from './finished-goods.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('production', 'VIEW_ONLY'), (req, res) => finishedGoodsController.getFinishedGoods(req, res));
router.get('/:orderPo', requirePermission('production', 'VIEW_ONLY'), (req, res) => finishedGoodsController.getFinishedGoodsByOrder(req, res));
router.post('/', requirePermission('production', 'CREATE_EDIT'), (req, res) => finishedGoodsController.recordFinishedGoods(req, res));
// BUG FIX: legacy list contained a typo'd role ' C', which normalizeRole()
// fail-opened to Shop Floor Supervisor, silently granting SFS reconciliation
// access. Reconcile now requires the same tier as POST / ('production',
// CREATE_EDIT), matching the intended OPERATOR-equivalent surface.
router.patch('/:id/reconcile', requirePermission('production', 'CREATE_EDIT'), (req, res) => finishedGoodsController.reconcileFinishedGoods(req, res));

export default router;
