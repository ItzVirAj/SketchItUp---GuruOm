import { Request, Response } from 'express';
import { ordersService } from './orders.service';
import { CacheService, extractTenantId } from '../../lib/cache';

const ORDERS_CACHE_TTL_SEC = 30; // 30s TTL for read-heavy aggregated order list

export class OrdersController {
  async getOrders(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const key = CacheService.buildKey('global', 'orders', 'list');

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
      const actorContext = {
        role: req.rbacScope?.role || req.user?.role || 'Sales/Order Desk',
        name: req.rbacScope?.userName || req.user?.name || req.user?.email || 'Sales Desk User'
      };

      const created = await ordersService.createOrder(req.body, actorContext);
      
      // Invalidate orders list and dashboard metrics
      await Promise.all([
        CacheService.invalidatePattern(`cache:global:orders:*`),
        CacheService.invalidatePattern(`cache:${tenant}:dashboard:*`)
      ]);
      
      return res.status(201).json({ 
        message: 'Order created and passed Stage 1 verification successfully', 
        data: created 
      });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ 
        error: err.errorCode || 'ValidationError', 
        message: err.message 
      });
    }
  }

  async updateOrder(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    try {
      const actorContext = {
        role: req.rbacScope?.role || req.user?.role || 'Production Planner',
        name: req.rbacScope?.userName || req.user?.name || req.user?.email || 'Authorized User'
      };

      const updated = await ordersService.updateOrder(req.params.id, req.body, actorContext);

      // Invalidate cache
      await Promise.all([
        CacheService.invalidatePattern(`cache:${tenant}:orders:*`),
        CacheService.invalidatePattern(`cache:${tenant}:dashboard:*`)
      ]);

      return res.json({
        message: 'Order updated successfully',
        data: updated
      });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({
        error: err.errorCode || 'OrderUpdateError',
        message: err.message
      });
    }
  }

  async transitionOrder(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    try {
      const actorContext = {
        role: req.rbacScope?.role || req.user?.role || 'Production Planner',
        name: req.rbacScope?.userName || req.user?.name || req.user?.email || 'Authorized User'
      };

      const targetStage = req.body.targetStage || req.body.status;
      const result = await ordersService.transitionOrderStage(
        req.params.id, 
        targetStage, 
        req.body, 
        actorContext
      );

      // Invalidate orders list and dashboard metrics
      await Promise.all([
        CacheService.invalidatePattern(`cache:${tenant}:orders:*`),
        CacheService.invalidatePattern(`cache:${tenant}:dashboard:*`)
      ]);

      return res.json({ 
        message: `Order successfully transitioned to ${targetStage}`, 
        data: result 
      });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ 
        error: err.errorCode || 'StageTransitionError', 
        message: err.message 
      });
    }
  }

  async markDelayed(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    try {
      const result = await ordersService.markOrderDelayed(req.params.id, {
        reason: req.body.reason,
        followUpDate: req.body.followUpDate || req.body.follow_up_date
      });

      await Promise.all([
        CacheService.invalidatePattern(`cache:${tenant}:orders:*`),
        CacheService.invalidatePattern(`cache:${tenant}:dashboard:*`)
      ]);

      return res.json({ message: 'Order marked as DELIVERY_DELAYED', data: result });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ error: err.errorCode || 'MarkDelayedError', message: err.message });
    }
  }

  async createAmendment(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    try {
      const actorContext = {
        role: req.rbacScope?.role || req.user?.role || 'Sales/Order Desk',
        name: req.rbacScope?.userName || req.user?.name || req.user?.email || 'Sales Desk User'
      };

      const result = await ordersService.createAmendment(req.params.id, req.body, actorContext);

      // Invalidate orders list
      await CacheService.invalidatePattern(`cache:${tenant}:orders:*`);

      const status = result.status === 'ESCALATED_TO_OWNER' ? 202 : 200;
      return res.status(status).json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ 
        error: err.errorCode || 'AmendmentError', 
        message: err.message 
      });
    }
  }

  async runMaterialCheck(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    try {
      const actorContext = {
        role: req.rbacScope?.role || req.user?.role || 'Production Planner',
        name: req.rbacScope?.userName || req.user?.name || req.user?.email || 'Production Planner'
      };

      const result = await ordersService.runMaterialVerificationForOrder(req.params.id, actorContext);

      await Promise.all([
        CacheService.invalidatePattern(`cache:${tenant}:orders:*`),
        CacheService.invalidatePattern(`cache:${tenant}:dashboard:*`)
      ]);

      return res.json({
        message: result.ready 
          ? `Material check passed for Order ${result.poNo}. Order is now MATERIAL_READY.` 
          : `Material check failed for Order ${result.poNo}. Shortages recorded and Order moved to MATERIAL_SHORT.`,
        data: result
      });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({
        error: err.errorCode || 'MaterialCheckError',
        message: err.message
      });
    }
  }

  async overrideMaterialCheck(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    try {
      const actorContext = {
        role: req.rbacScope?.role || req.user?.role || 'Owner/Management',
        name: req.rbacScope?.userName || req.user?.name || req.user?.email || 'Owner'
      };

      const result = await ordersService.overrideMaterialCheck(req.params.id, req.body, actorContext);

      await Promise.all([
        CacheService.invalidatePattern(`cache:${tenant}:orders:*`),
        CacheService.invalidatePattern(`cache:${tenant}:dashboard:*`)
      ]);

      return res.json({
        message: `Material check overridden by Owner for Order ${result.poNo}. Order forced to MATERIAL_READY.`,
        data: result
      });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({
        error: err.errorCode || 'OverrideError',
        message: err.message
      });
    }
  }
}

export const ordersController = new OrdersController();
