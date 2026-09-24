import { Router } from 'express';
import { meetingsController } from './meetings.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

// Every authenticated role has at least VIEW_ONLY on 'meetings' (rbacMatrix.ts),
// including Client — so list/detail are open to any signed-in user.
router.get('/', requirePermission('meetings', 'VIEW_ONLY'), (req, res) => meetingsController.listMeetings(req, res));
router.get('/:id', requirePermission('meetings', 'VIEW_ONLY'), (req, res) => meetingsController.getMeeting(req, res));

// Create/edit/cancel require CREATE_EDIT+, which today only Owner,
// Admin (System) and ServerAdmin hold — see rbacMatrix.ts RBAC_ROLE_MATRIX.
// Intentionally scoped to those three roles for now per product decision;
// expanding to section-head roles later is a one-line change per role entry.
router.post('/', requirePermission('meetings', 'CREATE_EDIT'), (req, res) => meetingsController.createMeeting(req, res));
router.patch('/:id', requirePermission('meetings', 'CREATE_EDIT'), (req, res) => meetingsController.updateMeeting(req, res));

// Cancellation is a soft-delete (status -> CANCELLED), matching this repo's
// "No Deletes on Transactional Records" convention — no DELETE verb exposed.
router.post('/:id/cancel', requirePermission('meetings', 'CREATE_EDIT'), (req, res) => meetingsController.cancelMeeting(req, res));

export default router;
