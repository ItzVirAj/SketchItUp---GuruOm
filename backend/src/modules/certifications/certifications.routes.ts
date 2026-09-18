import { Router } from 'express';
import { certificationsController } from './certifications.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('certifications', 'VIEW_ONLY'), (req, res) => certificationsController.list(req, res));
router.post('/', requirePermission('certifications', 'FULL_APPROVE'), (req, res) => certificationsController.create(req, res));
router.patch('/:id', requirePermission('certifications', 'FULL_APPROVE'), (req, res) => certificationsController.update(req, res));
router.delete('/:id', requirePermission('certifications', 'FULL_APPROVE'), (req, res) => certificationsController.remove(req, res));

export default router;
