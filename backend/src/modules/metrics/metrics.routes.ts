import { Router } from 'express';
import { metricsController } from './metrics.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

// Metrics are authenticated operational analytics
router.use(requireAuth);

router.get('/summary', (req, res) => metricsController.getSummary(req, res));
router.get('/history', (req, res) => metricsController.getHistory(req, res));
router.get('/trends', (req, res) => metricsController.getHistory(req, res));
router.get('/registry', (req, res) => metricsController.getRegistry(req, res));

export default router;
