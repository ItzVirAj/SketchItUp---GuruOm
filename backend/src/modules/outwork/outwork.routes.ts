import { Router } from 'express';
import { outworkController } from './outwork.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => outworkController.getOutworkList(req, res));
router.get('/:id', (req, res) => outworkController.getOutworkById(req, res));
router.post('/', requireRole(['SUPER ADMIN', 'OPERATOR', 'DISPATCH_CLERK']), (req, res) => outworkController.createOutworkSendOut(req, res));
router.post('/:id/receive', requireRole(['SUPER ADMIN', 'OPERATOR', 'QC_MANAGER', 'DISPATCH_CLERK']), (req, res) => outworkController.receiveOutworkReturn(req, res));

export default router;
