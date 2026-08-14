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

  async updateDispatchStatus(req: Request, res: Response) {
    try {
      const data = await dispatchService.updateDispatchStatus(req.params.challanNo, req.body);
      return res.json({ message: 'Dispatch status updated successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const dispatchController = new DispatchController();
