import { Request, Response } from 'express';
import { invoicesService } from './invoices.service';
import { enqueueJob } from '../../lib/queues';
import { extractTenantId } from '../../lib/cache';

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

  /**
   * Creates customer invoice (synchronous DB write) and triggers non-blocking background processing.
   */
  async createInvoice(req: Request, res: Response) {
    const tenantId = extractTenantId(req);
    const userId = (req as any).user?.userId;

    try {
      // 1. Synchronous PostgreSQL Transaction / Insert
      const data = await invoicesService.createInvoice(req.body);

      // 2. Non-Blocking Background Job Enqueue (BullMQ)
      const { enqueued, jobId } = await enqueueJob('generate-invoice-pdf', {
        invoiceId: data.id,
        invoiceNo: data.invoiceNo,
        customerName: data.customerName,
        totalAmount: data.totalAmount,
        date: data.date,
        dueDate: data.dueDate,
        tenantId,
        userId,
        recipientEmail: req.body.recipientEmail || 'accounts@client.com'
      });

      // 3. Fast Return to Client
      return res.status(201).json({
        message: 'Customer invoice created successfully',
        data: {
          ...data,
          processingStatus: enqueued ? 'queued' : 'queued_pending_redis',
          jobId
        }
      });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  /**
   * Re-triggers processing pipeline for a failed or stuck invoice without creating duplicate records.
   */
  async retryInvoiceProcessing(req: Request, res: Response) {
    const tenantId = extractTenantId(req);
    const userId = (req as any).user?.userId;
    const invoiceNo = req.params.invoiceNo;

    try {
      const invoice = await invoicesService.retryProcessing(invoiceNo);

      const { enqueued, jobId } = await enqueueJob('generate-invoice-pdf', {
        invoiceId: invoice.id,
        invoiceNo: invoice.invoiceNo,
        customerName: invoice.customerName,
        totalAmount: invoice.totalAmount,
        date: invoice.date,
        dueDate: invoice.dueDate,
        tenantId,
        userId,
        recipientEmail: req.body.recipientEmail || 'accounts@client.com'
      });

      return res.json({
        message: `Pipeline re-triggered for invoice ${invoiceNo}.`,
        data: {
          invoiceNo,
          processingStatus: enqueued ? 'queued' : 'queued_pending_redis',
          jobId
        }
      });
    } catch (err: any) {
      return res.status(400).json({ error: 'RetryError', message: err.message });
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

  async issueInvoice(req: Request, res: Response) {
    try {
      const actorName = (req as any).user?.email || (req as any).user?.name || 'Finance Manager';
      const data = await invoicesService.issueInvoice(req.params.invoiceNo, actorName);
      return res.json({ message: 'Tax invoice issued successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'InvoiceIssueError', message: err.message });
    }
  }
}

export const invoicesController = new InvoicesController();
