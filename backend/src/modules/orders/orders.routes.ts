import { Router } from 'express';
import { ordersController } from './orders.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

// Apply Authentication to all order routes
router.use(requireAuth);

router.get('/', requirePermission('orders', 'VIEW_ONLY'), (req, res) => ordersController.getOrders(req, res));
router.get('/:id', requirePermission('orders', 'VIEW_ONLY'), (req, res) => ordersController.getOrderById(req, res));
router.post('/', requirePermission('orders', 'CREATE_EDIT', { commercialCheck: true }), (req, res) => ordersController.createOrder(req, res));
router.patch('/:id', requirePermission('orders', 'CREATE_EDIT', { commercialCheck: true }), (req, res) => ordersController.updateOrder(req, res));
router.put('/:id', requirePermission('orders', 'CREATE_EDIT', { commercialCheck: true }), (req, res) => ordersController.updateOrder(req, res));
router.post('/:id/transition', requirePermission('orders', 'CREATE_EDIT', { commercialCheck: true }), (req, res) => ordersController.transitionOrder(req, res));
router.patch('/:id/status', requirePermission('orders', 'CREATE_EDIT', { commercialCheck: true }), (req, res) => ordersController.transitionOrder(req, res));
router.post('/:id/submit', requirePermission('orders', 'CREATE_EDIT'), (req, res) => {
  req.body.targetStage = 'SUBMITTED';
  return ordersController.transitionOrder(req, res);
});
router.post('/:id/confirm', requirePermission('orders', 'CREATE_EDIT'), (req, res) => {
  req.body.targetStage = 'CONFIRMED';
  return ordersController.transitionOrder(req, res);
});
router.post('/:id/approve', requirePermission('orders', 'CREATE_EDIT'), (req, res) => {
  req.body.targetStage = 'APPROVED';
  return ordersController.transitionOrder(req, res);
});
router.post('/:id/release', requirePermission('orders', 'CREATE_EDIT'), (req, res) => {
  req.body.targetStage = 'RELEASED';
  return ordersController.transitionOrder(req, res);
});
router.post('/:id/cancel', requirePermission('orders', 'CREATE_EDIT'), (req, res) => {
  req.body.targetStage = 'CANCELLED';
  return ordersController.transitionOrder(req, res);
});
router.post('/:id/material-check', requirePermission('orders', 'CREATE_EDIT'), (req, res) => ordersController.runMaterialCheck(req, res));
router.post('/:id/verify-materials', requirePermission('orders', 'CREATE_EDIT'), (req, res) => ordersController.runMaterialCheck(req, res));
router.post('/:id/override-material-check', requirePermission('orders', 'CREATE_EDIT'), (req, res) => ordersController.overrideMaterialCheck(req, res));
router.post('/:id/amendments', requirePermission('orders', 'CREATE_EDIT'), (req, res) => ordersController.createAmendment(req, res));
router.post('/:id/mark-delayed', requirePermission('orders', 'CREATE_EDIT'), (req, res) => ordersController.markDelayed(req, res));

// Step 7: No Deletes on Transactional Records
router.delete('/:id', (req, res) => {
  return res.status(405).json({
    error: 'ERR_TRANSACTION_DELETE_FORBIDDEN',
    message: 'Transactional records cannot be deleted. Use explicit cancellation or reversal workflows.'
  });
});

export default router;
