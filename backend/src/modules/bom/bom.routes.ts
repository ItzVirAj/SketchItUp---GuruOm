import { Router } from 'express';
import { bomController } from './bom.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('bom', 'VIEW_ONLY'), (req, res) => bomController.getBOMs(req, res));
router.get('/:code', requirePermission('bom', 'VIEW_ONLY'), (req, res) => bomController.getBOMByCode(req, res));
router.post('/', requirePermission('bom', 'CREATE_EDIT'), (req, res) => bomController.createOrUpdateBOM(req, res));
router.post('/duplicate', requirePermission('bom', 'CREATE_EDIT'), (req, res) => bomController.duplicateBOM(req, res));
router.post('/:code/revision', requirePermission('bom', 'CREATE_EDIT'), (req, res) => bomController.createRevision(req, res));
router.patch('/:code/status', requirePermission('bom', 'CREATE_EDIT'), (req, res) => bomController.updateStatus(req, res));
// Deletion is admin-tier: FULL_APPROVE admits only ServerAdmin / Owner /
// Admin (System) / TESTER on 'bom' (Production Planner holds CREATE_EDIT and
// stays excluded, matching the legacy SUPER ADMIN-only list).
router.delete('/:code', requirePermission('bom', 'FULL_APPROVE'), (req, res) => bomController.deleteBOM(req, res));

export default router;
