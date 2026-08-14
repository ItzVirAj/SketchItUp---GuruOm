import { Request, Response } from 'express';
import { grnService } from './grn.service';

export class GrnController {
  async getGrnList(req: Request, res: Response) {
    try {
      const data = await grnService.getGrnList();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async getGrnById(req: Request, res: Response) {
    try {
      const data = await grnService.getGrnById(req.params.id);
      if (!data) {
        return res.status(404).json({ error: 'NotFound', message: `GRN record ${req.params.id} not found` });
      }
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createGrn(req: Request, res: Response) {
    try {
      const data = await grnService.createGrn(req.body);
      return res.status(201).json({ message: 'GRN created successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async updateGrnStatus(req: Request, res: Response) {
    try {
      const data = await grnService.updateGrnStatus(req.params.id, req.body);
      return res.json({ message: 'GRN status updated successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const grnController = new GrnController();
