import { Request, Response } from 'express';
import { finishedGoodsService } from './finished-goods.service';

export class FinishedGoodsController {
  async getFinishedGoods(req: Request, res: Response) {
    try {
      const data = await finishedGoodsService.getFinishedGoods();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async getFinishedGoodsByOrder(req: Request, res: Response) {
    try {
      const data = await finishedGoodsService.getFinishedGoodsByOrder(req.params.orderPo);
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async recordFinishedGoods(req: Request, res: Response) {
    try {
      const data = await finishedGoodsService.recordFinishedGoods(req.body);
      return res.status(201).json({ message: 'Finished goods record created successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async reconcileFinishedGoods(req: Request, res: Response) {
    try {
      const data = await finishedGoodsService.reconcileFinishedGoods(req.params.id, req.body);
      return res.json({ message: 'Finished goods reconciled successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const finishedGoodsController = new FinishedGoodsController();
