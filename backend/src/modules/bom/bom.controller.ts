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

  async duplicateBOM(req: Request, res: Response) {
    try {
      const { sourceBomCode, targetBomCode, targetPartCode, targetPartName } = req.body;
      const data = await bomService.duplicateBOM(sourceBomCode, targetBomCode, targetPartCode, targetPartName);
      return res.status(201).json({ message: 'BOM duplicated successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async createRevision(req: Request, res: Response) {
    try {
      const { revision } = req.body;
      const data = await bomService.createBOMRevision(req.params.code, revision);
      return res.status(201).json({ message: `Revision ${revision} created successfully`, data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const { status } = req.body;
      const data = await bomService.setBOMStatus(req.params.code, status);
      return res.json({ message: `BOM status updated to ${status}`, data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async deleteBOM(req: Request, res: Response) {
    try {
      const data = await bomService.deleteBOM(req.params.code);
      return res.json({ message: 'BOM deleted successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const bomController = new BomController();
