import { Request, Response } from 'express';
import { vendorBillsService } from './vendor-bills.service';

export class VendorBillsController {
  async getVendorBills(req: Request, res: Response) {
    try {
      const data = await vendorBillsService.getVendorBills();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async getVendorBillByNo(req: Request, res: Response) {
    try {
      const data = await vendorBillsService.getVendorBillByNo(req.params.billNo);
      if (!data) {
        return res.status(404).json({ error: 'NotFound', message: `Vendor bill ${req.params.billNo} not found` });
      }
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createVendorBill(req: Request, res: Response) {
    try {
      const data = await vendorBillsService.createVendorBill(req.body);
      return res.status(201).json({ message: 'Vendor bill created successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async disbursePayment(req: Request, res: Response) {
    try {
      const data = await vendorBillsService.disbursePayment(req.params.billNo, req.body);
      return res.json({ message: 'Vendor disbursement recorded successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const vendorBillsController = new VendorBillsController();
