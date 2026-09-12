import { Router } from 'express';
import { tasksController } from './tasks.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

// Everyone has at least VIEW_ONLY/OWN_RECORDS_ONLY on 'tasks' (rbacMatrix.ts) —
// list/detail are open to any signed-in user; tasks.service.ts scopes the
// actual rows returned to what that user is allowed to see.
router.get('/', requirePermission('tasks', 'VIEW_ONLY'), (req, res) => tasksController.listTasks(req, res));
router.get('/:id', requirePermission('tasks', 'VIEW_ONLY'), (req, res) => tasksController.getTask(req, res));

// Status changes and comments are gated at VIEW_ONLY here — the *real*
// authorization (assignee, assigner, or full-access role) is enforced in
// tasks.service.ts::assertCanActOnTask, since it depends on per-task
// assignment data that the static role matrix can't express.
router.patch('/:id/status', requirePermission('tasks', 'VIEW_ONLY'), (req, res) => tasksController.updateStatus(req, res));
router.post('/:id/comments', requirePermission('tasks', 'VIEW_ONLY'), (req, res) => tasksController.addComment(req, res));

// Assigning, editing task details, and cancelling require FULL_APPROVE, which
// today only Owner, Admin (System), ServerAdmin and TESTER hold.
router.post('/', requirePermission('tasks', 'FULL_APPROVE'), (req, res) => tasksController.createTask(req, res));
router.patch('/:id', requirePermission('tasks', 'FULL_APPROVE'), (req, res) => tasksController.updateTask(req, res));
router.post('/:id/cancel', requirePermission('tasks', 'FULL_APPROVE'), (req, res) => tasksController.cancelTask(req, res));

export default router;
