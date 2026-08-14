import { Request, Response } from 'express';
import { outworkService } from './outwork.service';

export class OutworkController {
  async getOutworkList(req: Request, res: Response) {
    try {
      const data = await outworkService.getOutworkList();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async getOutworkById(req: Request, res: Response) {
    try {
      const data = await outworkService.getOutworkById(req.params.id);
      if (!data) {
        return res.status(404).json({ error: 'NotFound', message: `Outwork record ${req.params.id} not found` });
      }
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createOutworkSendOut(req: Request, res: Response) {
    try {
      const data = await outworkService.createOutworkSendOut(req.body);
      return res.status(201).json({ message: 'Outwork send-out created successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async receiveOutworkReturn(req: Request, res: Response) {
    try {
      const data = await outworkService.receiveOutworkReturn(req.params.id, req.body);
      return res.json({ message: 'Outwork vendor return processed successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const outworkController = new OutworkController();
