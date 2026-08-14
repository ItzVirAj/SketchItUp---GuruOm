import { Request, Response } from 'express';
import { productionService } from './production.service';

export class ProductionController {
  async getJobCards(req: Request, res: Response) {
    try {
      const data = await productionService.getJobCards();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async getJobCardByNo(req: Request, res: Response) {
    try {
      const data = await productionService.getJobCardByNo(req.params.jobNo);
      if (!data) {
        return res.status(404).json({ error: 'NotFound', message: `Job Card ${req.params.jobNo} not found` });
      }
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createJobCard(req: Request, res: Response) {
    try {
      const data = await productionService.createJobCard(req.body);
      return res.status(201).json({ message: 'Job Card created successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async updateJobStatus(req: Request, res: Response) {
    try {
      const data = await productionService.updateJobStatus(req.params.jobNo, req.body);
      return res.json({ message: 'Job Card status updated successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async getProductionLogs(req: Request, res: Response) {
    try {
      const data = await productionService.getProductionLogs();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async logProduction(req: Request, res: Response) {
    try {
      const data = await productionService.logProductionAndTriggerQC(req.body);
      return res.status(201).json({ message: 'Production log recorded successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const productionController = new ProductionController();
