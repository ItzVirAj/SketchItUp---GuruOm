import { Request, Response } from 'express';
import { mastersService } from './masters.service';
import { CacheService, extractTenantId } from '../../lib/cache';

const MASTER_CACHE_TTL_SEC = 600; // 10 minutes for slow-changing reference masters

export class MastersController {
  // Core Item Masters
  async getMasters(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const key = CacheService.buildKey(tenant, 'masters', 'items');

    try {
      const { data, isCached } = await CacheService.getOrSetWithMeta(
        key,
        MASTER_CACHE_TTL_SEC,
        () => mastersService.getMasters()
      );
      res.setHeader('X-Cache', isCached ? 'HIT' : 'MISS');
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createMaster(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    try {
      const result = await mastersService.createMaster(req.body);
      // Invalidate master item cache
      await CacheService.invalidatePattern(`cache:${tenant}:masters:*`);
      return res.status(201).json({ message: 'Master item saved successfully', data: result });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  // Customers
  async getCustomers(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const key = CacheService.buildKey(tenant, 'masters', 'customers');

    try {
      const { data, isCached } = await CacheService.getOrSetWithMeta(
        key,
        MASTER_CACHE_TTL_SEC,
        () => mastersService.getCustomers()
      );
      res.setHeader('X-Cache', isCached ? 'HIT' : 'MISS');
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createCustomer(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    try {
      const result = await mastersService.createCustomer(req.body);
      await CacheService.invalidatePattern(`cache:${tenant}:masters:*`);
      return res.status(201).json({ message: 'Customer saved successfully', data: result });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  // Vendors
  async getVendors(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const key = CacheService.buildKey(tenant, 'masters', 'vendors');

    try {
      const { data, isCached } = await CacheService.getOrSetWithMeta(
        key,
        MASTER_CACHE_TTL_SEC,
        () => mastersService.getVendors()
      );
      res.setHeader('X-Cache', isCached ? 'HIT' : 'MISS');
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createVendor(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    try {
      const result = await mastersService.createVendor(req.body);
      await CacheService.invalidatePattern(`cache:${tenant}:masters:*`);
      return res.status(201).json({ message: 'Vendor saved successfully', data: result });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  // Machines
  async getMachines(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const key = CacheService.buildKey(tenant, 'masters', 'machines');

    try {
      const { data, isCached } = await CacheService.getOrSetWithMeta(
        key,
        MASTER_CACHE_TTL_SEC,
        () => mastersService.getMachines()
      );
      res.setHeader('X-Cache', isCached ? 'HIT' : 'MISS');
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createMachine(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    try {
      const result = await mastersService.createMachine(req.body);
      await CacheService.invalidatePattern(`cache:${tenant}:masters:*`);
      return res.status(201).json({ message: 'Machine saved successfully', data: result });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  // Company Profile
  async getCompanyProfile(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const key = CacheService.buildKey(tenant, 'masters', 'profile');

    try {
      const { data, isCached } = await CacheService.getOrSetWithMeta(
        key,
        MASTER_CACHE_TTL_SEC,
        () => mastersService.getCompanyProfile()
      );
      res.setHeader('X-Cache', isCached ? 'HIT' : 'MISS');
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async updateCompanyProfile(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    try {
      const data = await mastersService.updateCompanyProfile(req.body);
      await CacheService.invalidatePattern(`cache:${tenant}:masters:*`);
      return res.json({ message: 'Company profile updated', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const mastersController = new MastersController();
