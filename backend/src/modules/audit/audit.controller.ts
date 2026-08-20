import { Request, Response } from 'express';
import { auditService } from './audit.service';

export class AuditController {
  /**
   * Retrieves paginated audit logs with search, date range, and entity filters (Admin only).
   */
  async getAuditLogs(req: Request, res: Response) {
    try {
      const { actorEmail, entityType, entityId, action, search, startDate, endDate, from, to, limit } = req.query;
      const data = await auditService.getAuditLogs({
        actorEmail: actorEmail as string,
        entityType: entityType as string,
        entityId: entityId as string,
        action: action as string,
        search: search as string,
        startDate: startDate as string,
        endDate: endDate as string,
        from: from ? parseInt(from as string, 10) : 0,
        to: to ? parseInt(to as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : 50
      });
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  /**
   * Generates audit export and logs the export event.
   */
  async exportAuditLogs(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { actorEmail, entityType, entityId, action, search, startDate, endDate } = req.body || {};

      const data = await auditService.exportAuditLogs(
        { id: user?.userId || user?.id, email: user?.email || 'admin@guruom.in', role: user?.role || 'Admin' },
        {
          actorEmail,
          entityType,
          entityId,
          action,
          search,
          startDate,
          endDate
        }
      );

      return res.json({
        message: 'Audit export generated successfully',
        count: data.logs.length,
        logs: data.logs
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'ExportError', message: err.message });
    }
  }

  /**
   * Records an audit log entry deriving actor identity securely from session.
   */
  async createAuditLog(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Unknown';

      const data = await auditService.recordAuditLog({
        actorId: user?.userId || user?.id,
        actorEmail: user?.email || 'system@guruom.in',
        actorRole: user?.role || 'User',
        action: req.body.action || 'CUSTOM_ACTION',
        entityType: req.body.entityType || req.body.entity || 'general',
        entityId: req.body.entityId || 'system',
        beforeState: req.body.beforeState || null,
        afterState: req.body.afterState || null,
        ipAddress,
        userAgent,
        metadata: req.body.metadata || (req.body.details ? { details: req.body.details } : {})
      });

      return res.status(201).json({ message: 'Audit log recorded successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const auditController = new AuditController();

