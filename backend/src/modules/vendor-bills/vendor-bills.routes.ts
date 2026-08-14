import { Router } from 'express';
import { vendorBillsController } from './vendor-bills.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => vendorBillsController.getVendorBills(req, res));
router.get('/:billNo', (req, res) => vendorBillsController.getVendorBillByNo(req, res));
router.post('/', requireRole(['SUPER ADMIN', 'FINANCE_MANAGER']), (req, res) => vendorBillsController.createVendorBill(req, res));
router.post('/:billNo/disburse', requireRole(['SUPER ADMIN', 'FINANCE_MANAGER']), (req, res) => vendorBillsController.disbursePayment(req, res));

export default router;
