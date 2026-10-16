import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { commandCentreController } from './command-centre.controller';

const router = Router();

router.use(requireAuth);

router.get(
  '/summary',
  requirePermission('reports', 'VIEW_ONLY'),
  (req, res) => commandCentreController.getSummary(req, res),
);
router.get(
  '/trend',
  requirePermission('reports', 'VIEW_ONLY'),
  (req, res) => commandCentreController.getTrend(req, res),
);
router.get(
  '/operations',
  requirePermission('reports', 'VIEW_ONLY'),
  (req, res) => commandCentreController.getOperations(req, res),
);
router.get(
  '/feeds',
  requirePermission('reports', 'VIEW_ONLY'),
  (req, res) => commandCentreController.getFeeds(req, res),
);

export default router;
