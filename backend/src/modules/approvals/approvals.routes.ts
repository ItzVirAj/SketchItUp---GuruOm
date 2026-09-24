import { Router } from 'express';
import { approvalsController } from './approvals.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('approvals', 'VIEW_ONLY'), (req, res) => approvalsController.getPendingApprovals(req, res));
router.post('/', requirePermission('approvals', 'CREATE_EDIT'), (req, res) => approvalsController.createApprovalRequest(req, res));
router.post('/:id/approve', requirePermission('approvals', 'FULL_APPROVE'), (req, res) => approvalsController.approveRequest(req, res));
router.post('/:id/reject', requirePermission('approvals', 'FULL_APPROVE'), (req, res) => approvalsController.rejectRequest(req, res));

export default router;
