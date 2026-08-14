import { Request, Response } from 'express';
import { purchasingService } from './purchasing.service';

export class PurchasingController {
  async getPurchaseOrders(req: Request, res: Response) {
    try {
      const data = await purchasingService.getPurchaseOrders();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async getPurchaseOrderById(req: Request, res: Response) {
    try {
      const data = await purchasingService.getPurchaseOrderById(req.params.id);
      if (!data) {
        return res.status(404).json({ error: 'NotFound', message: `Purchase Order ${req.params.id} not found` });
      }
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createPurchaseOrder(req: Request, res: Response) {
    try {
      const creatorName = req.user?.name || 'Owner OS Admin';
      const data = await purchasingService.createPurchaseOrder(req.body, creatorName);
      return res.status(201).json({ message: 'Purchase Order created successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async reviewApproval(req: Request, res: Response) {
    try {
      const reviewerName = req.user?.name || 'Authorized Reviewer';
      const data = await purchasingService.reviewPurchaseOrderApproval(req.params.id, req.body, reviewerName);
      return res.json({ message: `Purchase Order ${req.body.decision === 'APPROVE' ? 'approved' : 'rejected'} successfully`, data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const purchasingController = new PurchasingController();
