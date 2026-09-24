import { Request, Response } from 'express';
import { approvalsService } from './approvals.service';

export class ApprovalsController {
  async getPendingApprovals(req: Request, res: Response) {
    try {
      const data = await approvalsService.getPendingApprovals();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createApprovalRequest(req: Request, res: Response) {
    try {
      const data = await approvalsService.createApprovalRequest(req.body);
      return res.status(201).json({ message: 'Approval request submitted successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async approveRequest(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const actorName = user?.name || user?.email || 'Authorized Approver';
      const data = await approvalsService.approveRequest(req.params.id, req.body, actorName, user?.id);
      return res.json({ message: 'Request approved successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async rejectRequest(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const actorName = user?.name || user?.email || 'Authorized Approver';
      const data = await approvalsService.rejectRequest(req.params.id, req.body, actorName, user?.id);
      return res.json({ message: 'Request rejected successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const approvalsController = new ApprovalsController();
