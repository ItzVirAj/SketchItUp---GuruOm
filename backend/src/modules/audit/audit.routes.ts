import { Router } from 'express';
import { auditController } from './audit.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

// GET audit logs with search, actor, entity, date filters & pagination (Admin/Owner only)
// Mapped to 'approvals' + FULL_APPROVE: the only tier whose holder set
// {ServerAdmin, Owner, Admin (System), TESTER} reproduces the legacy admin-only
// surface without widening it ('settings' would additionally admit HR/Admin).
// The legacy list also failed open on 'ADMIN_OWNER'/'ADMIN'/'Owner / Managing
// Director' strings (normalizeRole -> Shop Floor Supervisor); that accidental
// SFS access ends here — deliberate tightening.
router.get('/', requirePermission('approvals', 'FULL_APPROVE'), (req, res) => auditController.getAuditLogs(req, res));

// Record an audit log entry
router.post('/', (req, res) => auditController.createAuditLog(req, res));

// Export audit logs and audit the export action (Admin/Owner only)
router.post('/export', requirePermission('approvals', 'FULL_APPROVE'), (req, res) => auditController.exportAuditLogs(req, res));

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
