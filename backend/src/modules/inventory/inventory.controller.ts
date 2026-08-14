import { Request, Response } from 'express';
import { inventoryService } from './inventory.service';
import { CacheService, extractTenantId } from '../../lib/cache';
import { LockService, ResourceLockedError, LockServiceUnavailableError } from '../../lib/lock';
import { isRedisConnected } from '../../lib/redis';

const INVENTORY_CACHE_TTL_SEC = 45; // 45s TTL for inventory rollups & shortages
const LOCK_SAFETY_TTL_MS = 5000;   // 5s distributed lock safety timeout

export class InventoryController {
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
   * Adjusts stock quantity inside a distributed lock to prevent double-booking/lost updates.
   */
  async adjustStock(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const itemCode = req.params.code;
    const lockKey = LockService.buildKey(tenant, 'inventory', itemCode);

    try {
      // Execute read-check-write flow protected by Redlock distributed lock
      const result = await (isRedisConnected()
        ? LockService.withLock(lockKey, LOCK_SAFETY_TTL_MS, async () => {
            const updated = await inventoryService.adjustStock(itemCode, req.body);
            // Invalidate inventory & dashboard caches only after successful write
            await Promise.all([
              CacheService.invalidatePattern(`cache:${tenant}:inventory:*`),
              CacheService.invalidatePattern(`cache:${tenant}:dashboard:*`)
            ]);
            return updated;
          })
        : inventoryService.adjustStock(itemCode, req.body));

      return res.json({ message: 'Stock level adjusted successfully', data: result });
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
