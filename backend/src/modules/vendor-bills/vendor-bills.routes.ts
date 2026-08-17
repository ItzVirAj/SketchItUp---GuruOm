import { Router } from 'express';
import { vendorBillsController } from './vendor-bills.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('accounting', 'VIEW_ONLY'), (req, res) => vendorBillsController.getVendorBills(req, res));
router.get('/:billNo', requirePermission('accounting', 'VIEW_ONLY'), (req, res) => vendorBillsController.getVendorBillByNo(req, res));
router.post('/', requirePermission('accounting', 'CREATE_EDIT'), (req, res) => vendorBillsController.createVendorBill(req, res));
router.post(
  '/:billNo/disburse', 
  requirePermission('accounting', 'FULL_APPROVE', { 
    checkApprovalLimit: true,
    getAmount: (req) => Number(req.body.amount || req.body.paidAmount || req.body.disbursedAmount || 0)
  }), 
  (req, res) => vendorBillsController.disbursePayment(req, res)
);

export default router;
