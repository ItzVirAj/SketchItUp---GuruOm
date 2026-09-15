import { Router } from 'express';
import { inventoryController } from './inventory.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

// Apply Authentication to all inventory routes
router.use(requireAuth);

// 1. Derived Stock Levels & Shortages
router.get('/stock', (req, res) => inventoryController.getStock(req, res));
router.put('/stock/:code', requirePermission('inventory', 'CREATE_EDIT'), (req, res) => inventoryController.adjustStock(req, res));
router.patch('/stock/:code', requirePermission('inventory', 'CREATE_EDIT'), (req, res) => inventoryController.adjustStock(req, res));
router.get('/shortages', (req, res) => inventoryController.getShortages(req, res));

// 2. Append-Only Inventory Movements Ledger
router.get('/movements', (req, res) => inventoryController.getMovements(req, res));
router.get('/movements/:code/history', (req, res) => inventoryController.getItemHistory(req, res));
router.post('/movements', requirePermission('inventory', 'CREATE_EDIT'), (req, res) => inventoryController.createMovement(req, res));
// Ledger reversal is admin-tier: FULL_APPROVE admits only ServerAdmin /
// Owner / Admin (System) / TESTER on 'inventory' (Store Keeper holds
// CREATE_EDIT and stays excluded, matching the legacy SUPER ADMIN-only list).
router.post('/movements/:id/reverse', requirePermission('inventory', 'FULL_APPROVE'), (req, res) => inventoryController.reverseMovement(req, res));

// 3. Stock Reconciliation
// Reconciliation is the Store Keeper's physical-count workflow per the matrix
// (inventory CREATE_EDIT); legacy list also included Quality Inspector, who
// holds only VIEW_ONLY on 'inventory' — a documented tightening.
router.get('/reconciliation', requirePermission('inventory', 'CREATE_EDIT'), (req, res) => inventoryController.getReconciliation(req, res));

export default router;
