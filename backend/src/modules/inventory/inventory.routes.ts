import { Router } from 'express';
import { inventoryController } from './inventory.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

// Apply Authentication to all inventory routes
router.use(requireAuth);

router.get('/stock', (req, res) => inventoryController.getStock(req, res));
router.put('/stock/:code', requireRole(['SUPER ADMIN', 'OPERATOR', 'QC_MANAGER']), (req, res) => inventoryController.adjustStock(req, res));
router.patch('/stock/:code', requireRole(['SUPER ADMIN', 'OPERATOR', 'QC_MANAGER']), (req, res) => inventoryController.adjustStock(req, res));
router.get('/shortages', (req, res) => inventoryController.getShortages(req, res));

export default router;
