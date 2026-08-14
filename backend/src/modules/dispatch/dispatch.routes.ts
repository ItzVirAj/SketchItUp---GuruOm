import { Router } from 'express';
import { dispatchController } from './dispatch.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => dispatchController.getDispatches(req, res));
router.get('/:challanNo', (req, res) => dispatchController.getDispatchByNo(req, res));
router.post('/', requireRole(['SUPER ADMIN', 'DISPATCH_CLERK']), (req, res) => dispatchController.createDispatch(req, res));
router.patch('/:challanNo/status', requireRole(['SUPER ADMIN', 'DISPATCH_CLERK']), (req, res) => dispatchController.updateDispatchStatus(req, res));

export default router;
