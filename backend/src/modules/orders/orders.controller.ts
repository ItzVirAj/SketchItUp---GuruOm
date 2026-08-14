import { Request, Response } from 'express';
import { ordersService } from './orders.service';
import { CacheService, extractTenantId } from '../../lib/cache';

const ORDERS_CACHE_TTL_SEC = 30; // 30s TTL for read-heavy aggregated order list

export class OrdersController {
  async getOrders(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const key = CacheService.buildKey(tenant, 'orders', 'list');

    try {
      const { data, isCached } = await CacheService.getOrSetWithMeta(
        key,
        ORDERS_CACHE_TTL_SEC,
        () => ordersService.getOrders()
      );
      res.setHeader('X-Cache', isCached ? 'HIT' : 'MISS');
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
    const tenant = extractTenantId(req);
    try {
      const created = await ordersService.createOrder(req.body);
      // Invalidate orders list and dashboard metrics
      await Promise.all([
        CacheService.invalidatePattern(`cache:${tenant}:orders:*`),
        CacheService.invalidatePattern(`cache:${tenant}:dashboard:*`)
      ]);
      return res.status(201).json({ message: 'Order created successfully', data: created });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async updateOrderStatus(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    try {
      const updated = await ordersService.updateOrderStatus(req.params.id, req.body);
      // Invalidate orders list and dashboard metrics
      await Promise.all([
        CacheService.invalidatePattern(`cache:${tenant}:orders:*`),
        CacheService.invalidatePattern(`cache:${tenant}:dashboard:*`)
      ]);
      return res.json({ message: 'Order status updated successfully', data: updated });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const ordersController = new OrdersController();
