import { Router } from 'express';
import { invoicesController } from './invoices.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole, requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('accounting', 'VIEW_ONLY'), (req, res) => invoicesController.getInvoices(req, res));
router.get('/:invoiceNo', requirePermission('accounting', 'VIEW_ONLY'), (req, res) => invoicesController.getInvoiceByNo(req, res));
router.post('/', requireRole(['SUPER ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT', 'OWNER', 'Accounts / Finance']), (req, res) => invoicesController.createInvoice(req, res));
router.post('/:invoiceNo/issue', requireRole(['SUPER ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT', 'OWNER', 'Accounts / Finance']), (req, res) => invoicesController.issueInvoice(req, res));
router.patch('/:invoiceNo/issue', requireRole(['SUPER ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT', 'OWNER', 'Accounts / Finance']), (req, res) => invoicesController.issueInvoice(req, res));
router.post('/:invoiceNo/retry-processing', requireRole(['SUPER ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT', 'OWNER']), (req, res) => invoicesController.retryInvoiceProcessing(req, res));
router.post('/:invoiceNo/pay', requireRole(['SUPER ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT', 'OWNER', 'Accounts / Finance']), (req, res) => invoicesController.recordPayment(req, res));

router.delete('/clear-all', requireRole(['SUPER ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT', 'OWNER', 'Accounts / Finance']), (req, res) => invoicesController.clearAllInvoices(req, res));
router.delete('/:invoiceNo', requireRole(['SUPER ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT', 'OWNER', 'Accounts / Finance']), (req, res) => invoicesController.deleteInvoice(req, res));

export default router;
