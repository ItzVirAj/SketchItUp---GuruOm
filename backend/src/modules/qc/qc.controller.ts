import { Request, Response } from 'express';
import { qcService } from './qc.service';

export class QcController {
  async getQCQueue(req: Request, res: Response) {
    try {
      const data = await qcService.getQCQueue();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async getQCById(req: Request, res: Response) {
    try {
      const data = await qcService.getQCById(req.params.id);
      if (!data) {
        return res.status(404).json({ error: 'NotFound', message: `QC record ${req.params.id} not found` });
      }
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createQCInspection(req: Request, res: Response) {
    try {
      const data = await qcService.createQCInspection(req.body);
      return res.status(201).json({ message: 'QC inspection created successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async reviewQCInspection(req: Request, res: Response) {
    try {
      const data = await qcService.reviewQCInspection(req.params.id, req.body);
      return res.json({ message: 'QC inspection reviewed successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async getPDIQueue(req: Request, res: Response) {
    try {
      const data = await qcService.getPDIQueue();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async passPDIInspection(req: Request, res: Response) {
    try {
      const data = await qcService.passPDIInspection(req.params.id);
      return res.json({ message: 'PDI passed and certificate generated successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async checkDispatchEligibility(req: Request, res: Response) {
    try {
      const data = await qcService.checkDispatchEligibility(req.params.orderPo);
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }
}

export const qcController = new QcController();
