import { Router } from 'express';
import { productionController } from './production.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/jobs', (req, res) => productionController.getJobCards(req, res));
router.get('/jobs/:jobNo', (req, res) => productionController.getJobCardByNo(req, res));
router.post('/jobs', requireRole(['SUPER ADMIN', 'OPERATOR']), (req, res) => productionController.createJobCard(req, res));
router.patch('/jobs/:jobNo/status', requireRole(['SUPER ADMIN', 'OPERATOR']), (req, res) => productionController.updateJobStatus(req, res));

router.get('/logs', (req, res) => productionController.getProductionLogs(req, res));
router.post('/logs', requireRole(['SUPER ADMIN', 'OPERATOR']), (req, res) => productionController.logProduction(req, res));

export default router;
