import { Router } from 'express';
import { invoicesController } from './invoices.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('accounting', 'VIEW_ONLY'), (req, res) => invoicesController.getInvoices(req, res));
router.get('/:invoiceNo', requirePermission('accounting', 'VIEW_ONLY'), (req, res) => invoicesController.getInvoiceByNo(req, res));
router.post('/', requirePermission('accounting', 'CREATE_EDIT'), (req, res) => invoicesController.createInvoice(req, res));
router.post('/:invoiceNo/issue', requirePermission('accounting', 'CREATE_EDIT'), (req, res) => invoicesController.issueInvoice(req, res));
router.patch('/:invoiceNo/issue', requirePermission('accounting', 'CREATE_EDIT'), (req, res) => invoicesController.issueInvoice(req, res));
router.post('/:invoiceNo/retry-processing', requirePermission('accounting', 'CREATE_EDIT'), (req, res) => invoicesController.retryInvoiceProcessing(req, res));
router.post('/:invoiceNo/pay', requirePermission('accounting', 'CREATE_EDIT'), (req, res) => invoicesController.recordPayment(req, res));

router.delete('/clear-all', requirePermission('accounting', 'CREATE_EDIT'), (req, res) => invoicesController.clearAllInvoices(req, res));
router.delete('/:invoiceNo', requirePermission('accounting', 'CREATE_EDIT'), (req, res) => invoicesController.deleteInvoice(req, res));

export default router;
