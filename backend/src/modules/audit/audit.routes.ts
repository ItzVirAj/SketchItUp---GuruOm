import { Router } from 'express';
import { auditController } from './audit.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requireRole(['SUPER ADMIN', 'OPERATOR', 'FINANCE_MANAGER', 'QC_MANAGER']), (req, res) => auditController.getAuditLogs(req, res));
router.post('/', (req, res) => auditController.createAuditLog(req, res));

export default router;
