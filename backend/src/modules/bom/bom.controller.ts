import { Request, Response } from 'express';
import { bomService } from './bom.service';

export class BomController {
  async getBOMs(req: Request, res: Response) {
    try {
      const data = await bomService.getBOMs();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async getBOMByCode(req: Request, res: Response) {
    try {
      const data = await bomService.getBOMByCode(req.params.code);
      if (!data) {
        return res.status(404).json({ error: 'NotFound', message: `BOM with code ${req.params.code} not found` });
      }
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createOrUpdateBOM(req: Request, res: Response) {
    try {
      const data = await bomService.createOrUpdateBOM(req.body);
      return res.status(201).json({ message: 'BOM saved successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const bomController = new BomController();
