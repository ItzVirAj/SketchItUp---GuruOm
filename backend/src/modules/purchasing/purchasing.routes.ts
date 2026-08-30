import { Router } from 'express';
import { purchasingController } from './purchasing.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

// 1. Purchase Orders
router.get('/', requirePermission('procurement', 'VIEW_ONLY'), (req, res) => purchasingController.getPurchaseOrders(req, res));
router.get('/orders/:id', requirePermission('procurement', 'VIEW_ONLY'), (req, res) => purchasingController.getPurchaseOrderById(req, res));
router.post('/', requirePermission('procurement', 'CREATE_EDIT'), (req, res) => purchasingController.createPurchaseOrder(req, res));

// 2. Purchase Requisitions
router.get('/requisitions', requirePermission('procurement', 'VIEW_ONLY'), (req, res) => purchasingController.getRequisitions(req, res));
router.post('/requisitions', requirePermission('procurement', 'CREATE_EDIT'), (req, res) => purchasingController.createRequisition(req, res));
router.patch('/requisitions/:id/approve', requirePermission('procurement', 'CREATE_EDIT'), (req, res) => purchasingController.approveRequisition(req, res));

// 3. Goods Receipt Notes (GRN) with Qty Mismatch & Heat/Lot Trace
router.get('/grns', requirePermission('procurement', 'VIEW_ONLY'), (req, res) => purchasingController.getGrns(req, res));
// @deprecated Superseded by POST /api/v1/grn (not called by frontend)
router.post('/grns', requirePermission('procurement', 'CREATE_EDIT'), (req, res) => purchasingController.createGrn(req, res));
router.post('/grns/incoming-qc', requirePermission('production', 'CREATE_EDIT'), (req, res) => purchasingController.recordIncomingQc(req, res));

// 4. Vendor Returns
router.get('/vendor-returns', requirePermission('procurement', 'VIEW_ONLY'), (req, res) => purchasingController.getVendorReturns(req, res));
router.patch('/vendor-returns/:id/approve', requirePermission('procurement', 'CREATE_EDIT'), (req, res) => purchasingController.approveVendorReturn(req, res));

// 5. Vendor Scorecards & 3-Way Match
router.get('/vendor-scorecards', requirePermission('procurement', 'VIEW_ONLY'), (req, res) => purchasingController.getVendorScorecards(req, res));
router.post('/three-way-match', requirePermission('accounting', 'CREATE_EDIT'), (req, res) => purchasingController.evaluateThreeWayMatch(req, res));

// Step 7: No Deletes on Transactional Records
router.delete('/*', (req, res) => {
  return res.status(405).json({
    error: 'ERR_TRANSACTION_DELETE_FORBIDDEN',
    message: 'Transactional purchasing records cannot be deleted. Use cancellation or vendor return workflows.'
  });
});

export default router;
