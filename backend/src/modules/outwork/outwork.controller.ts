import { Request, Response } from 'express';
import { outworkService } from './outwork.service';

export class OutworkController {
  async getSubcontractOrders(req: Request, res: Response) {
    try {
      const data = await outworkService.getSubcontractOrders();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async dispatchGateOut(req: Request, res: Response) {
    try {
      const actorName = req.rbacScope?.userName || req.user?.name || 'Production Planner';
      const data = await outworkService.dispatchSubcontractGateOut(req.body, actorName);
      return res.status(201).json({ message: 'Job-work Gate-Out pass generated & material transferred to Subcon WIP', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async receiveGateIn(req: Request, res: Response) {
    try {
      const actorName = req.rbacScope?.userName || req.user?.name || 'Quality Inspector';
      const data = await outworkService.receiveSubcontractGateIn(req.body, actorName);
      return res.json({ message: 'Job-work Gate-In received, QC inspected & stock returned to factory inventory', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async getOverdueAlerts(req: Request, res: Response) {
    try {
      const data = await outworkService.getOverdueSubcontractAlerts();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }
}

export const outworkController = new OutworkController();
