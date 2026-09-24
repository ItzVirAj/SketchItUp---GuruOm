import { Router } from 'express';
import { employeeCertificationsController } from './employeeCertifications.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { handleFileUpload } from '../../middleware/upload.middleware';

const router = Router();
router.use(requireAuth);

// GET /me — Returns caller's own certifications
router.get(
  '/me',
  requirePermission('employee_certifications', 'VIEW_ONLY'),
  (req, res) => employeeCertificationsController.getMyCertifications(req, res)
);

// GET / — Lists certifications (scoped to own records unless scopeRule is ALL)
router.get(
  '/',
  requirePermission('employee_certifications', 'VIEW_ONLY'),
  (req, res) => employeeCertificationsController.list(req, res)
);

// GET /:id — Retrieves a single certification by ID
router.get(
  '/:id',
  requirePermission('employee_certifications', 'VIEW_ONLY'),
  (req, res) => employeeCertificationsController.getById(req, res)
);

// POST / — Assigns a new employee certification (HR-only via CREATE_EDIT)
router.post(
  '/',
  requirePermission('employee_certifications', 'CREATE_EDIT'),
  (req, res) => employeeCertificationsController.create(req, res)
);

// DELETE /:id — Revokes an employee certification (HR-only via CREATE_EDIT)
router.delete(
  '/:id',
  requirePermission('employee_certifications', 'CREATE_EDIT'),
  (req, res) => employeeCertificationsController.delete(req, res)
);

// POST /upload — Uploads certificate document attachment (HR-only via CREATE_EDIT)
router.post(
  '/upload',
  requirePermission('employee_certifications', 'CREATE_EDIT'),
  handleFileUpload,
  (req, res) => employeeCertificationsController.uploadDocument(req, res)
);

export default router;
