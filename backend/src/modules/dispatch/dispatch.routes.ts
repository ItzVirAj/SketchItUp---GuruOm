import { Router } from 'express';
import { dispatchController } from './dispatch.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => dispatchController.getDispatches(req, res));
router.get('/orders/:order_id/dispatchable', (req, res) => dispatchController.getDispatchableQty(req, res));
router.get('/:challanNo', (req, res) => dispatchController.getDispatchByNo(req, res));
router.get('/:challanNo/print', (req, res) => dispatchController.printChallan(req, res));
router.post('/', requireRole(['SUPER ADMIN', 'DISPATCH_CLERK', 'OPS_ADMIN', 'DISPATCH_STORE']), (req, res) => dispatchController.createDispatch(req, res));
router.post('/:id/dispatch', requireRole(['SUPER ADMIN', 'OPS_ADMIN']), (req, res) => dispatchController.dispatchChallan(req, res));
router.post('/:id/deliver', requireRole(['SUPER ADMIN', 'OPS_ADMIN', 'DISPATCH_STORE']), (req, res) => dispatchController.deliverChallan(req, res));
router.post('/:id/cancel', requireRole(['SUPER ADMIN', 'OPS_ADMIN']), (req, res) => dispatchController.cancelChallan(req, res));
router.patch('/:challanNo/status', requireRole(['SUPER ADMIN', 'DISPATCH_CLERK', 'OPS_ADMIN']), (req, res) => dispatchController.updateDispatchStatus(req, res));

// Step 7: No Deletes on Transactional Records
router.delete('/:id', (req, res) => {
  return res.status(405).json({
    error: 'ERR_TRANSACTION_DELETE_FORBIDDEN',
    message: 'Transactional records cannot be deleted. Dispatches must be cancelled via explicit Return Challan or Cancellation workflows.'
  });
});

export default router;
