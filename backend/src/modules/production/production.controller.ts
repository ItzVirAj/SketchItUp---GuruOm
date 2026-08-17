import { Request, Response } from 'express';
import { productionService } from './production.service';

export class ProductionController {
  async getRouteCards(req: Request, res: Response) {
    try {
      const data = await productionService.getRouteCardTemplates();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async getJobCards(req: Request, res: Response) {
    try {
      const data = await productionService.getJobCards();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async getJobCardByJobNo(req: Request, res: Response) {
    try {
      const data = await productionService.getJobCardByJobNo(req.params.jobNo);
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
      const plannerName = req.rbacScope?.userName || req.user?.name || 'Production Planner';
      const data = await productionService.createJobCard(req.body, plannerName);
      return res.status(201).json({ message: 'Job Card released successfully with locked drawing revision', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async startOperation(req: Request, res: Response) {
    try {
      const supervisorName = req.rbacScope?.userName || req.user?.name || 'Shop Floor Supervisor';
      const data = await productionService.startOperation(req.params.jobNo, req.body, supervisorName);
      return res.json({ message: 'Operation started with skill certification verified', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async completeOperation(req: Request, res: Response) {
    try {
      const operatorName = req.rbacScope?.userName || req.user?.name || 'Machine Operator';
      const data = await productionService.completeOperation(req.params.jobNo, req.body, operatorName);
      return res.json({ message: 'Operation completed, times recorded & scrap ledger updated', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async raiseNcr(req: Request, res: Response) {
    try {
      const inspectorName = req.rbacScope?.userName || req.user?.name || 'Quality Inspector';
      const data = await productionService.raiseNcr(req.body, inspectorName);
      return res.status(201).json({ message: 'NCR raised successfully. Job Card locked in QC Hold.', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async disposeNcr(req: Request, res: Response) {
    try {
      const approverName = req.rbacScope?.userName || req.user?.name || 'Quality Inspector';
      const data = await productionService.disposeNcr(req.params.jobNo, req.body, approverName);
      return res.json({ message: 'NCR disposition approved. QC Hold cleared on Job Card.', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async getTelemetry(req: Request, res: Response) {
    try {
      const data = await productionService.getProductionTelemetry();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }
}

export const productionController = new ProductionController();
