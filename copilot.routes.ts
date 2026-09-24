import { Router } from 'express';
import { copilotController } from './copilot.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();
router.use(requireAuth);

// Same role list used by the real audit module — this feature spans every
// domain (orders, inventory, production, QC, dispatch), so it's gated at
// the route level to Owner-tier roles rather than per-module permissions.
const OWNER_ROLES = ['SUPER ADMIN', 'ADMIN_OWNER', 'ADMIN', 'Owner', 'Super Admin', 'Admin', 'Owner / Managing Director'];

router.post('/chat', requireRole(OWNER_ROLES), (req, res) => copilotController.chat(req, res));
router.post('/confirm-action', requireRole(OWNER_ROLES), (req, res) => copilotController.confirmAction(req, res));

export default router;
