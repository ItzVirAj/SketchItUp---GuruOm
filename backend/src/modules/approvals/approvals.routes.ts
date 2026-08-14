import { Router } from 'express';
import { approvalsController } from './approvals.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => approvalsController.getPendingApprovals(req, res));
router.post('/', (req, res) => approvalsController.createApprovalRequest(req, res));
router.post('/:id/approve', requireRole(['SUPER ADMIN', 'FINANCE_MANAGER']), (req, res) => approvalsController.approveRequest(req, res));
router.post('/:id/reject', requireRole(['SUPER ADMIN', 'FINANCE_MANAGER']), (req, res) => approvalsController.rejectRequest(req, res));

export default router;
