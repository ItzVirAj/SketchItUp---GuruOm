import { Router } from 'express';
import { taskTemplatesController } from './task-templates.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();
router.use(requireAuth);

// Reuses the 'tasks' module tier (not a new SystemModule) — a template is
// just a factory for real Tasks, so the same people who can assign a Task
// can create/apply a template.
router.get('/', requirePermission('tasks', 'VIEW_ONLY'), (req, res) => taskTemplatesController.list(req, res));
router.post('/', requirePermission('tasks', 'FULL_APPROVE'), (req, res) => taskTemplatesController.create(req, res));
router.post('/:id/apply', requirePermission('tasks', 'FULL_APPROVE'), (req, res) => taskTemplatesController.apply(req, res));

export default router;
