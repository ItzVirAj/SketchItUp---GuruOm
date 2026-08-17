import { Request, Response } from 'express';
import { purchasingService } from './purchasing.service';

export class PurchasingController {
  // 1. Purchase Orders
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
      const creatorName = req.rbacScope?.userName || req.user?.name || req.user?.email || 'Purchase Manager';
      const data = await purchasingService.createPurchaseOrder(req.body, creatorName);
      return res.status(201).json({ message: 'Purchase Order created successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  // 2. Purchase Requisitions
  async getRequisitions(req: Request, res: Response) {
    try {
      const data = await purchasingService.getPurchaseRequisitions();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createRequisition(req: Request, res: Response) {
    try {
      const requestedBy = req.rbacScope?.userName || req.user?.name || 'Store Keeper';
      const data = await purchasingService.createPurchaseRequisition(req.body, requestedBy);
      return res.status(201).json({ message: 'Purchase Requisition raised successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async approveRequisition(req: Request, res: Response) {
    try {
      const approverName = req.rbacScope?.userName || req.user?.name || 'Purchase Manager';
      const data = await purchasingService.approvePurchaseRequisition(req.params.id, req.body, approverName);
      return res.json({ message: `Requisition ${req.params.id} reviewed successfully`, data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  // 3. Goods Receipt Notes (GRN) with Mismatch Detection
  async getGrns(req: Request, res: Response) {
    try {
      const data = await purchasingService.getGrns();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createGrn(req: Request, res: Response) {
    try {
      const storeKeeper = req.rbacScope?.userName || req.user?.name || 'Store Keeper';
      const data = await purchasingService.createGrnWithMismatchCheck(req.body, storeKeeper);
      return res.status(201).json({ message: 'GRN entered with quantity mismatch check & heat/lot trace', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  // 4. Incoming Quality Inspection & Vendor Returns
  async recordIncomingQc(req: Request, res: Response) {
    try {
      const inspectorName = req.rbacScope?.userName || req.user?.name || 'Quality Inspector';
      const data = await purchasingService.recordIncomingInspection(req.body, inspectorName);
      return res.json({ message: 'Incoming inspection completed', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async getVendorReturns(req: Request, res: Response) {
    try {
      const data = await purchasingService.getVendorReturns();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async approveVendorReturn(req: Request, res: Response) {
    try {
      const approverName = req.rbacScope?.userName || req.user?.name || 'Purchase Manager';
      const data = await purchasingService.approveVendorReturn(req.params.id, approverName);
      return res.json({ message: 'Vendor return approved & debit note generated', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  // 5. Vendor Scorecards (OTD % and Quality Acceptance Scorecard)
  async getVendorScorecards(req: Request, res: Response) {
    try {
      const data = await purchasingService.getVendorScorecards();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  // 6. 3-Way Match Verification
  async evaluateThreeWayMatch(req: Request, res: Response) {
    try {
      const actorName = req.rbacScope?.userName || req.user?.name || 'Accountant';
      const data = await purchasingService.evaluateThreeWayMatch(
        req.body.billNo,
        req.body.poNo,
        req.body.grnNo,
        actorName
      );
      return res.json({ message: '3-Way match evaluation complete', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const purchasingController = new PurchasingController();
