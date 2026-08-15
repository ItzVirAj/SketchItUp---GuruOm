import { Router } from 'express';
import { inventoryController } from './inventory.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

// Apply Authentication to all inventory routes
router.use(requireAuth);

// 1. Derived Stock Levels & Shortages
router.get('/stock', (req, res) => inventoryController.getStock(req, res));
router.put('/stock/:code', requireRole(['SUPER ADMIN', 'OPERATOR', 'QC_MANAGER']), (req, res) => inventoryController.adjustStock(req, res));
router.patch('/stock/:code', requireRole(['SUPER ADMIN', 'OPERATOR', 'QC_MANAGER']), (req, res) => inventoryController.adjustStock(req, res));
router.get('/shortages', (req, res) => inventoryController.getShortages(req, res));

// 2. Append-Only Inventory Movements Ledger
router.get('/movements', (req, res) => inventoryController.getMovements(req, res));
router.get('/movements/:code/history', (req, res) => inventoryController.getItemHistory(req, res));
router.post('/movements', requireRole(['SUPER ADMIN', 'OPERATOR', 'QC_MANAGER']), (req, res) => inventoryController.createMovement(req, res));
router.post('/movements/:id/reverse', requireRole(['SUPER ADMIN']), (req, res) => inventoryController.reverseMovement(req, res));

// 3. Stock Reconciliation
router.get('/reconciliation', requireRole(['SUPER ADMIN', 'QC_MANAGER']), (req, res) => inventoryController.getReconciliation(req, res));

export default router;
