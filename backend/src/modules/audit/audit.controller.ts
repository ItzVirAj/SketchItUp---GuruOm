import { Request, Response } from 'express';
import { auditService } from './audit.service';

export class AuditController {
  async getAuditLogs(req: Request, res: Response) {
    try {
      const data = await auditService.getAuditLogs(req.query as any);
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createAuditLog(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const payload = {
        ...req.body,
        user: req.body.user || user?.name || user?.email || 'System User',
        userId: req.body.userId || user?.id
      };
      const data = await auditService.createAuditLog(payload);
      return res.status(201).json({ message: 'Audit log recorded successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const auditController = new AuditController();
