import { Router } from 'express';
import { bomController } from './bom.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => bomController.getBOMs(req, res));
router.get('/:code', (req, res) => bomController.getBOMByCode(req, res));
router.post('/', requireRole(['SUPER ADMIN', 'OPERATOR', 'QC_MANAGER']), (req, res) => bomController.createOrUpdateBOM(req, res));

export default router;
