import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

// 1. Realtime SSE Stream Endpoint (handles query token auth internally for EventSource)
router.get('/stream', (req, res) => notificationsController.streamNotifications(req, res));

// 2. In-App Notifications
router.get('/', requireAuth, (req, res) => notificationsController.getNotifications(req, res));
router.patch('/:id/read', requireAuth, (req, res) => notificationsController.markAsRead(req, res));
router.post('/read-all', requireAuth, (req, res) => notificationsController.markAllAsRead(req, res));
router.delete('/clear-all', requireAuth, (req, res) => notificationsController.clearAllNotifications(req, res));
router.delete('/', requireAuth, (req, res) => notificationsController.clearAllNotifications(req, res));
router.post('/trigger', requireAuth, (req, res) => notificationsController.triggerNotification(req, res));

// Notification Rules Configuration
router.get('/rules', requireAuth, (req, res) => notificationsController.getRules(req, res));
// Settings-configuration surface (rules/recipients/logs) is admin-tier only in
// RBAC_ROLE_MATRIX: Accountant/Quality Inspector hold NO_ACCESS on 'settings',
// so this endpoint tightens to ServerAdmin/Owner/Admin (System).
router.patch('/rules/:id', requireAuth, requirePermission('settings', 'CREATE_EDIT'), (req, res) => notificationsController.updateRule(req, res));

// 4. Notification Recipients Configuration
router.get('/recipients', requireAuth, (req, res) => notificationsController.getRecipients(req, res));
router.post('/recipients', requireAuth, requirePermission('settings', 'CREATE_EDIT'), (req, res) => notificationsController.addRecipient(req, res));
router.delete('/recipients/:id', requireAuth, requirePermission('settings', 'CREATE_EDIT'), (req, res) => notificationsController.deleteRecipient(req, res));

// 5. Notification Dispatch Logs
router.get('/logs', requireAuth, requirePermission('settings', 'CREATE_EDIT'), (req, res) => notificationsController.getLogs(req, res));

export default router;
