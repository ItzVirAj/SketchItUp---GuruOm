import { Router } from 'express';
import { dispatchController } from './dispatch.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireEffectivePermission } from '../../middleware/permission.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requireEffectivePermission('dispatch:view'), (req, res) => dispatchController.getDispatches(req, res));
router.get('/orders/:order_id/dispatchable', requireEffectivePermission('dispatch:view'), (req, res) => dispatchController.getDispatchableQty(req, res));
router.get('/:challanNo', requireEffectivePermission('dispatch:view'), (req, res) => dispatchController.getDispatchByNo(req, res));
router.get('/:challanNo/print', requireEffectivePermission('dispatch:view'), (req, res) => dispatchController.printChallan(req, res));
router.post('/', requireEffectivePermission('dispatch:create_challan'), (req, res) => dispatchController.createDispatch(req, res));
router.put('/:challanNo', requireEffectivePermission('dispatch:create_challan'), (req, res) => dispatchController.updateDispatch(req, res));
router.post('/cleanup-duplicates', requireEffectivePermission('system:override_all_rules'), (req, res) => dispatchController.cleanDuplicates(req, res));
router.post('/:id/dispatch', requireEffectivePermission('dispatch:create_challan'), (req, res) => dispatchController.dispatchChallan(req, res));
router.post('/:id/deliver', requireEffectivePermission('dispatch:confirm_delivery'), (req, res) => dispatchController.deliverChallan(req, res));
router.post('/:id/cancel', requireEffectivePermission('dispatch:create_challan'), (req, res) => dispatchController.cancelChallan(req, res));
router.patch('/:challanNo/status', requireEffectivePermission('dispatch:create_challan'), (req, res) => dispatchController.updateDispatchStatus(req, res));

// Step 7: No Deletes on Transactional Records
router.delete('/:id', (req, res) => {
  return res.status(405).json({
    error: 'ERR_TRANSACTION_DELETE_FORBIDDEN',
    message: 'Transactional records cannot be deleted. Dispatches must be cancelled via explicit Return Challan or Cancellation workflows.'
  });
});

export default router;

