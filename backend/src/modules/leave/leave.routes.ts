import { Router } from 'express';
import { leaveController } from './leave.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();
router.use(requireAuth);

// GET / — returns only caller's own requests UNLESS their role's scopeRule for 'leave_requests' is 'ALL'
router.get('/', requirePermission('leave_requests', 'CREATE_EDIT'), (req, res) => leaveController.list(req, res));

// POST / — any authenticated user creates their own request
router.post('/', requirePermission('leave_requests', 'CREATE_EDIT'), (req, res) => leaveController.create(req, res));

// PATCH /:id/decide — body { status: 'APPROVED'|'REJECTED', decision_note? }
// Rejected with 403 unless requirePermission() resolves FULL_APPROVE on 'leave_requests' (Owner, HR, ServerAdmin only)
router.patch('/:id/decide', requirePermission('leave_requests', 'FULL_APPROVE'), (req, res) => leaveController.decide(req, res));

// PATCH /:id/cancel — requester can cancel their OWN pending request only
router.patch('/:id/cancel', requirePermission('leave_requests', 'CREATE_EDIT'), (req, res) => leaveController.cancel(req, res));
// Also support POST /:id/cancel for backwards compatibility
router.post('/:id/cancel', requirePermission('leave_requests', 'CREATE_EDIT'), (req, res) => leaveController.cancel(req, res));

export default router;
