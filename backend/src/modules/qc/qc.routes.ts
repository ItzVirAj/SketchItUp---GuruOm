import { Router } from 'express';
import { qcController } from './qc.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

// QC Inspections
router.get('/inspections', (req, res) => qcController.getQCQueue(req, res));
router.get('/inspections/:id', (req, res) => qcController.getQCById(req, res));
router.post('/inspections', requireRole(['SUPER ADMIN', 'OPERATOR', 'QC_MANAGER']), (req, res) => qcController.createQCInspection(req, res));
router.patch('/inspections/:id/review', requireRole(['SUPER ADMIN', 'QC_MANAGER']), (req, res) => qcController.reviewQCInspection(req, res));

// PDI Inspections & Clearance
router.get('/pdi', (req, res) => qcController.getPDIQueue(req, res));
router.patch('/pdi/:id/pass', requireRole(['SUPER ADMIN', 'QC_MANAGER']), (req, res) => qcController.passPDIInspection(req, res));

// Downstream Dispatch Gatekeeper Check
router.get('/dispatch-eligibility/:orderPo', (req, res) => qcController.checkDispatchEligibility(req, res));

export default router;
