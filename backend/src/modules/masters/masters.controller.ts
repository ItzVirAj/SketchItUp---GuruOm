import { Request, Response } from 'express';
import { mastersService } from './masters.service';

export class MastersController {
  // Core Item Masters
  async getMasters(req: Request, res: Response) {
    try {
      const data = await mastersService.getMasters();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createMaster(req: Request, res: Response) {
    try {
      const result = await mastersService.createMaster(req.body);
      return res.status(201).json({ message: 'Master item saved successfully', data: result });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  // Customers
  async getCustomers(req: Request, res: Response) {
    try {
      const data = await mastersService.getCustomers();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createCustomer(req: Request, res: Response) {
    try {
      const result = await mastersService.createCustomer(req.body);
      return res.status(201).json({ message: 'Customer saved successfully', data: result });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  // Vendors
  async getVendors(req: Request, res: Response) {
    try {
      const data = await mastersService.getVendors();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createVendor(req: Request, res: Response) {
    try {
      const result = await mastersService.createVendor(req.body);
      return res.status(201).json({ message: 'Vendor saved successfully', data: result });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  // Machines
  async getMachines(req: Request, res: Response) {
    try {
      const data = await mastersService.getMachines();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createMachine(req: Request, res: Response) {
    try {
      const result = await mastersService.createMachine(req.body);
      return res.status(201).json({ message: 'Machine saved successfully', data: result });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  // Company Profile
  async getCompanyProfile(req: Request, res: Response) {
    try {
      const data = await mastersService.getCompanyProfile();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async updateCompanyProfile(req: Request, res: Response) {
    try {
      const data = await mastersService.updateCompanyProfile(req.body);
      return res.json({ message: 'Company profile updated', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const mastersController = new MastersController();
