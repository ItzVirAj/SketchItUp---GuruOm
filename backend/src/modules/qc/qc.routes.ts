import { Router } from 'express';
import { qcController } from './qc.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

// QC Inspections
router.get('/inspections', requirePermission('qc', 'VIEW_ONLY'), (req, res) => qcController.getQCQueue(req, res));
router.get('/inspections/:id', requirePermission('qc', 'VIEW_ONLY'), (req, res) => qcController.getQCById(req, res));
router.post('/inspections', requirePermission('qc', 'CREATE_EDIT'), (req, res) => qcController.createQCInspection(req, res));
router.patch('/inspections/:id/review', requirePermission('qc', 'FULL_APPROVE'), (req, res) => qcController.reviewQCInspection(req, res));

// PDI Inspections & Clearance
router.get('/pdi', requirePermission('qc', 'VIEW_ONLY'), (req, res) => qcController.getPDIQueue(req, res));
router.patch('/pdi/:id/pass', requirePermission('qc', 'FULL_APPROVE'), (req, res) => qcController.passPDIInspection(req, res));

// Downstream Dispatch Gatekeeper Check
router.get('/dispatch-eligibility/:orderPo', requirePermission('qc', 'VIEW_ONLY'), (req, res) => qcController.checkDispatchEligibility(req, res));

// Step 7: No Deletes on Transactional Records
router.delete('/*', (req, res) => {
  return res.status(405).json({
    error: 'ERR_TRANSACTION_DELETE_FORBIDDEN',
    message: 'Transactional quality records cannot be deleted. Use NCR disposition and re-inspection workflows.'
  });
});

export default router;
