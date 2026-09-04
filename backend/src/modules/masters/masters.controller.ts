import { Request, Response } from 'express';
import { mastersService } from './masters.service';
import { vendorScorecardService } from '../vendors/vendor-scorecard.service';
import { CacheService, extractTenantId } from '../../lib/cache';

const MASTER_CACHE_TTL_SEC = 600; // 10 minutes for slow-changing reference masters

export class MastersController {
  // Core Item Masters
  async getMasters(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const onlyActive = req.query.active === 'true';
    const key = CacheService.buildKey(tenant, 'masters', `items:${onlyActive}`);

    try {
      const { data, isCached } = await CacheService.getOrSetWithMeta(
        key,
        MASTER_CACHE_TTL_SEC,
        () => mastersService.getMasters(onlyActive)
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
      await CacheService.invalidatePattern(`cache:${tenant}:masters:*`);
      return res.status(201).json({ message: 'Master item saved successfully', data: result });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ error: err.errorCode || err.name || 'MasterError', message: err.message });
    }
  }

  async updateMaster(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const { code } = req.params;
    try {
      const result = await mastersService.updateMaster(code, req.body);
      await CacheService.invalidatePattern(`cache:${tenant}:masters:*`);
      return res.json({ message: 'Master item updated successfully', data: result });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ error: err.errorCode || err.name || 'MasterError', message: err.message });
    }
  }

  async deleteMaster(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const { code } = req.params;
    try {
      const result = await mastersService.deleteMaster(code);
      await CacheService.invalidatePattern(`cache:${tenant}:masters:*`);
      return res.json({ message: 'Master item deleted successfully', data: result });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ error: err.errorCode || err.name || 'MasterError', message: err.message });
    }
  }

  // Customers
  async getCustomers(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const onlyActive = req.query.active === 'true';
    const key = CacheService.buildKey(tenant, 'masters', `customers:${onlyActive}`);

    try {
      const { data, isCached } = await CacheService.getOrSetWithMeta(
        key,
        MASTER_CACHE_TTL_SEC,
        () => mastersService.getCustomers(onlyActive)
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
      return res.status(err.statusCode || 400).json({ error: err.errorCode || err.name || 'MasterError', message: err.message });
    }
  }

  async updateCustomer(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const { code } = req.params;
    try {
      const result = await mastersService.updateCustomer(code, req.body);
      await CacheService.invalidatePattern(`cache:${tenant}:masters:*`);
      return res.json({ message: 'Customer updated successfully', data: result });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ error: err.errorCode || err.name || 'MasterError', message: err.message });
    }
  }

  async deleteCustomer(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const { code } = req.params;
    try {
      const result = await mastersService.deleteCustomer(code);
      await CacheService.invalidatePattern(`cache:${tenant}:masters:*`);
      return res.json({ message: 'Customer deleted successfully', data: result });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ error: err.errorCode || err.name || 'MasterError', message: err.message });
    }
  }

  // Vendors
  async getVendors(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const onlyActive = req.query.active === 'true';
    const maskBank = req.query.unmask !== 'true';
    const key = CacheService.buildKey(tenant, 'masters', `vendors:${onlyActive}:${maskBank}`);

    try {
      const { data, isCached } = await CacheService.getOrSetWithMeta(
        key,
        MASTER_CACHE_TTL_SEC,
        () => mastersService.getVendors(onlyActive, maskBank)
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
      return res.status(err.statusCode || 400).json({ error: err.errorCode || err.name || 'MasterError', message: err.message });
    }
  }

  async updateVendor(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const { code } = req.params;
    try {
      const result = await mastersService.updateVendor(code, req.body);
      await CacheService.invalidatePattern(`cache:${tenant}:masters:*`);
      return res.json({ message: 'Vendor updated successfully', data: result });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ error: err.errorCode || err.name || 'MasterError', message: err.message });
    }
  }

  async deleteVendor(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const { code } = req.params;
    try {
      const result = await mastersService.deleteVendor(code);
      await CacheService.invalidatePattern(`cache:${tenant}:masters:*`);
      return res.json({ message: 'Vendor deleted successfully', data: result });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ error: err.errorCode || err.name || 'MasterError', message: err.message });
    }
  }

  async getVendorScorecard(req: Request, res: Response) {
    const { code } = req.params;
    try {
      const data = await vendorScorecardService.getVendorScorecard(code);
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  // Machines
  async getMachines(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const onlyActive = req.query.active === 'true';
    const key = CacheService.buildKey(tenant, 'masters', `machines:${onlyActive}`);

    try {
      const { data, isCached } = await CacheService.getOrSetWithMeta(
        key,
        MASTER_CACHE_TTL_SEC,
        () => mastersService.getMachines(onlyActive)
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
      return res.status(err.statusCode || 400).json({ error: err.errorCode || err.name || 'MasterError', message: err.message });
    }
  }

  async updateMachine(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const { code } = req.params;
    try {
      const result = await mastersService.updateMachine(code, req.body);
      await CacheService.invalidatePattern(`cache:${tenant}:masters:*`);
      return res.json({ message: 'Machine updated successfully', data: result });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ error: err.errorCode || err.name || 'MasterError', message: err.message });
    }
  }

  async deleteMachine(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const { code } = req.params;
    try {
      const result = await mastersService.deleteMachine(code);
      await CacheService.invalidatePattern(`cache:${tenant}:masters:*`);
      return res.json({ message: 'Machine deleted successfully', data: result });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ error: err.errorCode || err.name || 'MasterError', message: err.message });
    }
  }

  // Users
  async getUsers(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    const onlyActive = req.query.active === 'true';
    const key = CacheService.buildKey(tenant, 'masters', `users:${onlyActive}`);

    try {
      const { data, isCached } = await CacheService.getOrSetWithMeta(
        key,
        MASTER_CACHE_TTL_SEC,
        () => mastersService.getUsers(onlyActive)
      );
      res.setHeader('X-Cache', isCached ? 'HIT' : 'MISS');
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createUser(req: Request, res: Response) {
    const tenant = extractTenantId(req);
    try {
      const result = await mastersService.createUser(req.body);
      await CacheService.invalidatePattern(`cache:${tenant}:masters:*`);
      return res.status(201).json({ message: 'User saved successfully', data: result });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ error: err.errorCode || err.name || 'MasterError', message: err.message });
    }
  }

  // Reference Dropdowns
  async getDropdowns(req: Request, res: Response) {
    try {
      const data = await mastersService.getReferenceDropdowns();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
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
