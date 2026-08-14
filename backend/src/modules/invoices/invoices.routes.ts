import { Router } from 'express';
import { invoicesController } from './invoices.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => invoicesController.getInvoices(req, res));
router.get('/:invoiceNo', (req, res) => invoicesController.getInvoiceByNo(req, res));
router.post('/', requireRole(['SUPER ADMIN', 'FINANCE_MANAGER']), (req, res) => invoicesController.createInvoice(req, res));
router.post('/:invoiceNo/pay', requireRole(['SUPER ADMIN', 'FINANCE_MANAGER']), (req, res) => invoicesController.recordPayment(req, res));

export default router;
