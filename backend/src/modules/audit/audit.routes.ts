import { Router } from 'express';
import { auditController } from './audit.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

const ADMIN_ROLES = ['SUPER ADMIN', 'ADMIN_OWNER', 'ADMIN', 'Owner', 'Super Admin', 'Admin', 'Owner / Managing Director'];

// GET audit logs with search, actor, entity, date filters & pagination (Admin/Owner only)
router.get('/', requireRole(ADMIN_ROLES), (req, res) => auditController.getAuditLogs(req, res));

// Record an audit log entry
router.post('/', (req, res) => auditController.createAuditLog(req, res));

// Export audit logs and audit the export action (Admin/Owner only)
router.post('/export', requireRole(ADMIN_ROLES), (req, res) => auditController.exportAuditLogs(req, res));

// Strictly Append-Only: No DELETE, PUT, or PATCH allowed on audit logs
router.delete('*', (req, res) => {
  return res.status(405).json({
    error: 'MethodNotAllowed',
    message: 'audit_logs table is strictly append-only and immutable. Deletion is prohibited by system design and database triggers.'
  });
});

router.put('*', (req, res) => {
  return res.status(405).json({
    error: 'MethodNotAllowed',
    message: 'audit_logs table is strictly append-only and immutable. Modification is prohibited.'
  });
});

router.patch('*', (req, res) => {
  return res.status(405).json({
    error: 'MethodNotAllowed',
    message: 'audit_logs table is strictly append-only and immutable. Modification is prohibited.'
  });
});

export default router;
