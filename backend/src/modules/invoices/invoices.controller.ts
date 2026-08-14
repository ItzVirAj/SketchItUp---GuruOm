import { Request, Response } from 'express';
import { invoicesService } from './invoices.service';

export class InvoicesController {
  async getInvoices(req: Request, res: Response) {
    try {
      const data = await invoicesService.getInvoices();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async getInvoiceByNo(req: Request, res: Response) {
    try {
      const data = await invoicesService.getInvoiceByNo(req.params.invoiceNo);
      if (!data) {
        return res.status(404).json({ error: 'NotFound', message: `Invoice ${req.params.invoiceNo} not found` });
      }
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createInvoice(req: Request, res: Response) {
    try {
      const data = await invoicesService.createInvoice(req.body);
      return res.status(201).json({ message: 'Customer invoice created successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async recordPayment(req: Request, res: Response) {
    try {
      const data = await invoicesService.recordPayment(req.params.invoiceNo, req.body);
      return res.json({ message: 'Invoice payment recorded successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const invoicesController = new InvoicesController();
