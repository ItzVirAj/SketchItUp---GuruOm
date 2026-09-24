// ============================================================================
// File: backend/src/modules/admin/admin.routes.ts
// Description: ServerAdmin API Router — All endpoints strictly guarded by
//              requireAuth and requireServerAdmin middleware.
// ============================================================================

import { Router } from 'express';
import { adminController } from './admin.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireServerAdmin } from '../../middleware/permission.middleware';

const router = Router();

// Apply Authentication + ServerAdmin Token & Database Verification to All Routes
router.use(requireAuth);
router.use(requireServerAdmin);

// 1. List Users & Active Overrides
router.get('/users', (req, res) => adminController.listUsers(req, res));

// 2. Modify User Role (Strict Tier Hierarchy; ServerAdmin Assignment Barred)
router.patch('/users/:id/role', (req, res) => adminController.updateUserRole(req, res));

// 3. Granular Permission Overrides (Grant / Revoke)
router.patch('/users/:id/permissions', (req, res) => adminController.updatePermissions(req, res));

// 4. Force Password Reset (Invalidate sessions + issue one-time reset token)
router.post('/users/:id/force-password-reset', (req, res) => adminController.forcePasswordReset(req, res));

// 5. Destructive Action Re-authentication Gate
router.post('/reauth', (req, res) => adminController.reauthenticate(req, res));

// 6. Granular Permissions Catalog
router.get('/permissions-catalog', (req, res) => adminController.getPermissionsCatalog(req, res));

// 7. Query Immutable Admin Audit Log
router.get('/audit-log', (req, res) => adminController.getAuditLog(req, res));

export default router;
