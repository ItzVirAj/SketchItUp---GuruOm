import { Router } from 'express';
import { productionController } from './production.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

// Route Cards
router.get('/route-cards', requirePermission('production', 'VIEW_ONLY'), (req, res) => productionController.getRouteCards(req, res));

// Job Cards & Operations
router.get('/job-cards', requirePermission('production', 'VIEW_ONLY'), (req, res) => productionController.getJobCards(req, res));
router.get('/job-cards/:jobNo', requirePermission('production', 'VIEW_ONLY'), (req, res) => productionController.getJobCardByJobNo(req, res));
router.post('/job-cards', requirePermission('production', 'CREATE_EDIT'), (req, res) => productionController.createJobCard(req, res));
router.post('/job-cards/:jobNo/start-op', requirePermission('production', 'CREATE_EDIT'), (req, res) => productionController.startOperation(req, res));
router.post('/job-cards/:jobNo/complete-op', requirePermission('production', 'CREATE_EDIT'), (req, res) => productionController.completeOperation(req, res));

// NCRs & Dispositions
router.post('/ncrs', requirePermission('production', 'CREATE_EDIT'), (req, res) => productionController.raiseNcr(req, res));
router.post('/job-cards/:jobNo/dispose-ncr', requirePermission('production', 'CREATE_EDIT'), (req, res) => productionController.disposeNcr(req, res));

// Telemetry & Machine Utilization
router.get('/telemetry', requirePermission('production', 'VIEW_ONLY'), (req, res) => productionController.getTelemetry(req, res));

// Step 7: No Deletes on Transactional Records
router.delete('/*', (req, res) => {
  return res.status(405).json({
    error: 'ERR_TRANSACTION_DELETE_FORBIDDEN',
    message: 'Transactional production records cannot be deleted. Job cards must be cancelled or closed via NCR disposition workflows.'
  });
});

export default router;
