import { Request, Response } from 'express';
import { inventoryService } from './inventory.service';

export class InventoryController {
  async getStock(req: Request, res: Response) {
    try {
      const data = await inventoryService.getStock();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async adjustStock(req: Request, res: Response) {
    try {
      const result = await inventoryService.adjustStock(req.params.code, req.body);
      return res.json({ message: 'Stock level adjusted successfully', data: result });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async getShortages(req: Request, res: Response) {
    try {
      const data = await inventoryService.getShortages();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }
}

export const inventoryController = new InventoryController();
