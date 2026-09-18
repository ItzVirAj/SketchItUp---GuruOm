import { Router } from 'express';
import { attendanceController } from './attendance.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();
router.use(requireAuth);

// GET /api/attendance/me — explicit "my logs" endpoint for caller
router.get(
  '/me',
  requirePermission('attendance', 'VIEW_ONLY'),
  (req, res) => attendanceController.getMyAttendance(req, res)
);

// GET /api/attendance — scoped to caller unless scopeRule is ALL
router.get(
  '/',
  requirePermission('attendance', 'VIEW_ONLY'),
  (req, res) => attendanceController.list(req, res)
);

// POST /api/attendance — gated to CREATE_EDIT + ALL (HR/Owner/Admin)
router.post(
  '/',
  requirePermission('attendance', 'CREATE_EDIT'),
  (req, res) => attendanceController.create(req, res)
);

// PATCH /api/attendance/:id — gated to CREATE_EDIT + ALL (HR/Owner/Admin)
router.patch(
  '/:id',
  requirePermission('attendance', 'CREATE_EDIT'),
  (req, res) => attendanceController.update(req, res)
);

// Self check-in / check-out
router.post(
  '/check-in',
  requirePermission('attendance', 'VIEW_ONLY'),
  (req, res) => attendanceController.checkIn(req, res)
);

router.post(
  '/check-out',
  requirePermission('attendance', 'VIEW_ONLY'),
  (req, res) => attendanceController.checkOut(req, res)
);

export default router;
