import { Router } from 'express';
import { bomController } from './bom.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => bomController.getBOMs(req, res));
router.get('/:code', (req, res) => bomController.getBOMByCode(req, res));
router.post('/', requireRole(['SUPER ADMIN', 'OPERATOR', 'QC_MANAGER']), (req, res) => bomController.createOrUpdateBOM(req, res));
router.post('/duplicate', requireRole(['SUPER ADMIN', 'OPERATOR', 'QC_MANAGER']), (req, res) => bomController.duplicateBOM(req, res));
router.post('/:code/revision', requireRole(['SUPER ADMIN', 'OPERATOR', 'QC_MANAGER']), (req, res) => bomController.createRevision(req, res));
router.patch('/:code/status', requireRole(['SUPER ADMIN', 'OPERATOR', 'QC_MANAGER']), (req, res) => bomController.updateStatus(req, res));
router.delete('/:code', requireRole(['SUPER ADMIN']), (req, res) => bomController.deleteBOM(req, res));

export default router;
