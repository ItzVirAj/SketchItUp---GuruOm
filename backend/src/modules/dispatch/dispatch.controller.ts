import { Request, Response } from 'express';
import { dispatchService } from './dispatch.service';

export class DispatchController {
  async getDispatches(req: Request, res: Response) {
    try {
      const data = await dispatchService.getDispatches();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async getDispatchByNo(req: Request, res: Response) {
    try {
      const data = await dispatchService.getDispatchByNo(req.params.challanNo);
      if (!data) {
        return res.status(404).json({ error: 'NotFound', message: `Challan ${req.params.challanNo} not found` });
      }
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createDispatch(req: Request, res: Response) {
    try {
      const data = await dispatchService.createDispatch(req.body);
      return res.status(201).json({ message: 'Dispatch challan created successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async getDispatchableQty(req: Request, res: Response) {
    try {
      const data = await dispatchService.getDispatchableQty(req.params.order_id || req.params.orderPo);
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async dispatchChallan(req: Request, res: Response) {
    try {
      const data = await dispatchService.dispatchChallan(req.params.id || req.params.challanNo);
      return res.json({ message: 'Challan authorized and dispatched', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async deliverChallan(req: Request, res: Response) {
    try {
      const data = await dispatchService.deliverChallan(req.params.id || req.params.challanNo);
      return res.json({ message: 'Delivery confirmed for challan', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async cancelChallan(req: Request, res: Response) {
    try {
      const data = await dispatchService.cancelChallan(req.params.id || req.params.challanNo, req.body.reason);
      return res.json({ message: 'Dispatch challan cancelled', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async printChallan(req: Request, res: Response) {
    try {
      const data = await dispatchService.printChallan(req.params.id || req.params.challanNo);
      return res.json({ data });
    } catch (err: any) {
      return res.status(404).json({ error: 'NotFound', message: err.message });
    }
  }

  async updateDispatch(req: Request, res: Response) {
    try {
      const userEmail = (req as any).user?.email || 'dispatch@guruom.in';
      const data = await dispatchService.updateDispatch(req.params.challanNo || req.params.id, req.body, userEmail);
      return res.json({ message: 'Dispatch challan updated successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async cleanDuplicates(req: Request, res: Response) {
    try {
      const data = await dispatchService.cleanDuplicateChallans();
      return res.json({ message: 'Redundant duplicate challans cancelled', data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async updateDispatchStatus(req: Request, res: Response) {
    try {
      const data = await dispatchService.updateDispatchStatus(req.params.challanNo || req.params.id, req.body);
      return res.json({ message: 'Dispatch status updated successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const dispatchController = new DispatchController();
