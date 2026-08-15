import { Request, Response } from 'express';
import { inventoryService } from './inventory.service';
import { inventoryMovementsService } from './inventory_movements.service';
import { CacheService, extractTenantId } from '../../lib/cache';
import { LockService, ResourceLockedError, LockServiceUnavailableError } from '../../lib/lock';
import { isRedisConnected } from '../../lib/redis';

const INVENTORY_CACHE_TTL_SEC = 45; // 45s TTL for inventory rollups & shortages
const LOCK_SAFETY_TTL_MS = 5000;   // 5s distributed lock safety timeout

export class InventoryController {
  /**
   * Retrieves current derived stock levels across all items.
   */
  async getStock(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const key = CacheService.buildKey(tenant, 'inventory', 'stock');

    try {
      const { data, isCached } = await CacheService.getOrSetWithMeta(
        key,
        INVENTORY_CACHE_TTL_SEC,
        () => inventoryService.getStock()
      );
      res.setHeader('X-Cache', isCached ? 'HIT' : 'MISS');
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  /**
   * Adjusts stock quantity inside a distributed lock by appending an ADJUSTMENT movement.
   */
  async adjustStock(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const itemCode = req.params.code;
    const lockKey = LockService.buildKey(tenant, 'inventory', itemCode);
    const actorEmail = (req as any).user?.email || 'inventory@guruom.in';

    try {
      // Execute read-check-write flow protected by Redlock distributed lock
      const result = await (isRedisConnected()
        ? LockService.withLock(lockKey, LOCK_SAFETY_TTL_MS, async () => {
            const updated = await inventoryService.adjustStock(itemCode, req.body, actorEmail);
            // Invalidate inventory & dashboard caches only after successful write
            await Promise.all([
              CacheService.invalidatePattern(`cache:${tenant}:inventory:*`),
              CacheService.invalidatePattern(`cache:${tenant}:dashboard:*`)
            ]);
            return updated;
          })
        : inventoryService.adjustStock(itemCode, req.body, actorEmail));

      return res.json({ message: 'Stock level adjusted successfully via movement ledger', data: result });
    } catch (err: any) {
      if (err instanceof ResourceLockedError) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'This inventory item is currently being modified by another operation. Please retry.'
        });
      }

      if (err instanceof LockServiceUnavailableError) {
        return res.status(503).json({
          error: 'ServiceUnavailable',
          message: 'Inventory lock service is temporarily unavailable. Please retry.'
        });
      }

      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  /**
   * Appends an arbitrary stock movement (Inbound GRN, Outbound Production/Dispatch, etc.)
   */
  async createMovement(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const itemCode = req.body.itemCode;
    const lockKey = LockService.buildKey(tenant, 'inventory', itemCode);
    const user = (req as any).user;

    const payload = {
      ...req.body,
      actorId: user?.userId || user?.id,
      actorEmail: user?.email || 'system@guruom.in'
    };

    try {
      const result = await (isRedisConnected()
        ? LockService.withLock(lockKey, LOCK_SAFETY_TTL_MS, async () => {
            const record = await inventoryMovementsService.recordMovement(payload);
            await Promise.all([
              CacheService.invalidatePattern(`cache:${tenant}:inventory:*`),
              CacheService.invalidatePattern(`cache:${tenant}:dashboard:*`)
            ]);
            return record;
          })
        : inventoryMovementsService.recordMovement(payload));

      return res.status(201).json({ message: 'Movement appended to ledger', data: result });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  /**
   * Retrieves all movements with pagination and filters.
   */
  async getMovements(req: Request, res: Response) {
    try {
      const { itemCode, movementType, referenceId, from, limit } = req.query;
      const data = await inventoryMovementsService.getAllMovements({
        itemCode: itemCode as string,
        movementType: movementType as string,
        referenceId: referenceId as string,
        from: from ? parseInt(from as string, 10) : 0,
        limit: limit ? parseInt(limit as string, 10) : 50
      });
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  /**
   * Retrieves chronological movement history for a specific SKU with running balances.
   */
  async getItemHistory(req: Request, res: Response) {
    try {
      const itemCode = req.params.code;
      const history = await inventoryMovementsService.getItemStockHistory(itemCode);
      return res.json({ itemCode, history });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  /**
   * Retrieves the Stock Reconciliation Report comparing physical count vs ledger derived sum.
   */
  async getReconciliation(req: Request, res: Response) {
    try {
      const report = await inventoryMovementsService.getStockReconciliation();
      return res.json({ report });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  /**
   * Records an offsetting reversal/correction movement.
   */
  async reverseMovement(req: Request, res: Response) {
    const movementId = req.params.id;
    const reason = req.body.reason || 'User requested ledger reversal';
    const actorEmail = (req as any).user?.email || 'admin@guruom.in';

    try {
      const correction = await inventoryMovementsService.recordCorrection(movementId, reason, actorEmail);
      return res.status(201).json({ message: 'Correction movement appended to ledger', data: correction });
    } catch (err: any) {
      return res.status(400).json({ error: 'ReversalError', message: err.message });
    }
  }

  async getShortages(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const key = CacheService.buildKey(tenant, 'inventory', 'shortages');

    try {
      const { data, isCached } = await CacheService.getOrSetWithMeta(
        key,
        INVENTORY_CACHE_TTL_SEC,
        () => inventoryService.getShortages()
      );
      res.setHeader('X-Cache', isCached ? 'HIT' : 'MISS');
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }
}

export const inventoryController = new InventoryController();
