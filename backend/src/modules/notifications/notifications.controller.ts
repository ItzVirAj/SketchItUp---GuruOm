import { Request, Response } from 'express';
import { notificationsService } from './notifications.service';
import { verifyRefreshToken } from '../../utils/jwt';

export class NotificationsController {
  /**
   * Server-Sent Events (SSE) streaming endpoint.
   * Authenticated via HttpOnly refresh cookie to prevent token leakage in URLs.
   */
  async streamNotifications(req: Request, res: Response) {
    const token = req.cookies?.['owner_os_refresh_token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication cookie required for SSE stream.' });
    }

    try {
      const payload = verifyRefreshToken(token);
      if (!payload || !payload.sub) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token for SSE stream.' });
      }

      // Set SSE HTTP Headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      });

      res.flushHeaders?.();

      const clientId = `sse-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const client = {
        id: clientId,
        userId: payload.sub,
        res
      };

      notificationsService.registerSSEClient(client);

      // Keep-alive heartbeat interval (every 25 seconds)
      const heartbeatInterval = setInterval(() => {
        try {
          res.write(': heartbeat\n\n');
        } catch (_) {
          clearInterval(heartbeatInterval);
        }
      }, 25000);

      req.on('close', () => {
        clearInterval(heartbeatInterval);
        notificationsService.unregisterSSEClient(clientId);
      });
    } catch (tokenErr) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token for SSE stream.' });
    }
  }

  async getNotifications(req: Request, res: Response) {
    try {
      const data = await notificationsService.getNotifications();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async markAsRead(req: Request, res: Response) {
    try {
      const data = await notificationsService.markAsRead(req.params.id);
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async markAllAsRead(req: Request, res: Response) {
    try {
      const data = await notificationsService.markAllAsRead();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async clearAllNotifications(req: Request, res: Response) {
    try {
      const data = await notificationsService.clearAllNotifications();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async triggerNotification(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const data = await notificationsService.triggerNotification({
        ...req.body,
        userRole: user?.role || req.body.userRole
      });
      return res.status(201).json({ message: 'Notification processed', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async getRules(req: Request, res: Response) {
    try {
      const data = await notificationsService.getNotificationRules();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async updateRule(req: Request, res: Response) {
    try {
      const data = await notificationsService.updateNotificationRule(req.params.id, req.body);
      return res.json({ message: 'Rule updated', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async getRecipients(req: Request, res: Response) {
    try {
      const ruleId = typeof req.query.ruleId === 'string' ? req.query.ruleId : undefined;
      const data = await notificationsService.getNotificationRecipients(ruleId);
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async addRecipient(req: Request, res: Response) {
    try {
      const data = await notificationsService.addNotificationRecipient(req.body);
      return res.status(201).json({ message: 'Recipient added', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async deleteRecipient(req: Request, res: Response) {
    try {
      const data = await notificationsService.deleteNotificationRecipient(req.params.id);
      return res.json({ message: 'Recipient removed', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async getLogs(req: Request, res: Response) {
    try {
      const data = await notificationsService.getNotificationLogs();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }
}

export const notificationsController = new NotificationsController();
