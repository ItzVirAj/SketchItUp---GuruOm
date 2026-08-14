import { Request, Response } from 'express';
import { ordersService } from './orders.service';

export class OrdersController {
  async getOrders(req: Request, res: Response) {
    try {
      const data = await ordersService.getOrders();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async getOrderById(req: Request, res: Response) {
    try {
      const order = await ordersService.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'NotFound', message: `Order ${req.params.id} not found` });
      }
      return res.json({ data: order });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createOrder(req: Request, res: Response) {
    try {
      const created = await ordersService.createOrder(req.body);
      return res.status(201).json({ message: 'Order created successfully', data: created });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async updateOrderStatus(req: Request, res: Response) {
    try {
      const updated = await ordersService.updateOrderStatus(req.params.id, req.body);
      return res.json({ message: 'Order status updated successfully', data: updated });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const ordersController = new OrdersController();
