import { Router } from 'express';
import { grnController } from './grn.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => grnController.getGrnList(req, res));
router.get('/:id', (req, res) => grnController.getGrnById(req, res));
router.post('/', requireRole(['SUPER ADMIN', 'OPERATOR', 'DISPATCH_CLERK']), (req, res) => grnController.createGrn(req, res));
router.patch('/:id/status', requireRole(['SUPER ADMIN', 'OPERATOR', 'QC_MANAGER', 'DISPATCH_CLERK']), (req, res) => grnController.updateGrnStatus(req, res));

export default router;
