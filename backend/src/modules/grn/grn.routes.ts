import { Router } from 'express';
import { grnController } from './grn.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('procurement', 'VIEW_ONLY'), (req, res) => grnController.getGrnList(req, res));
router.get('/:id', requirePermission('procurement', 'VIEW_ONLY'), (req, res) => grnController.getGrnById(req, res));
// GRN recording is a procurement action (module matches the GET routes above
// and purchasing.routes' POST /grns). Legacy list allowed Machine Operator and
// Dispatch Executive, who hold NO_ACCESS on 'procurement' in the matrix; the
// Purchase Manager (FULL_APPROVE) is the intended recording authority.
router.post('/', requirePermission('procurement', 'CREATE_EDIT'), (req, res) => grnController.createGrn(req, res));
router.patch('/:id/status', requirePermission('procurement', 'CREATE_EDIT'), (req, res) => grnController.updateGrnStatus(req, res));

export default router;
