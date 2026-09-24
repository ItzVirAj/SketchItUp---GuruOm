import { Router } from 'express';
import { announcementsController } from './announcements.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('announcements', 'VIEW_ONLY'), (req, res) => announcementsController.list(req, res));
router.post('/', requirePermission('announcements', 'CREATE_EDIT'), (req, res) => announcementsController.create(req, res));
router.patch('/:id', requirePermission('announcements', 'CREATE_EDIT'), (req, res) => announcementsController.update(req, res));
router.delete('/:id', requirePermission('announcements', 'CREATE_EDIT'), (req, res) => announcementsController.remove(req, res));

export default router;
