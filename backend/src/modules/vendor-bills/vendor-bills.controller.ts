import { Request, Response } from 'express';
import { vendorBillsService } from './vendor-bills.service';
import { receiptScanService, ReceiptScanNotConfiguredError, ReceiptScanFailedError } from './receipt-scan.service';
import { attachmentsService, DuplicateAttachmentError } from '../attachments/attachments.service';
import { extractTenantId } from '../../lib/cache';

export class VendorBillsController {
  /**
   * Scans an uploaded receipt/vendor-bill image or PDF with AI and returns
   * best-effort extracted fields for the "Record Vendor Bill" form to pre-fill.
   * Also stores the original file as an attachment so it stays linked to the
   * bill once the user confirms and saves it.
   */
  async scanReceipt(req: Request, res: Response) {
    if (!req.file) {
      return res.status(400).json({ error: 'BadRequest', message: 'No file uploaded (field name: "file").' });
    }

    const draftBillNo = typeof req.body?.draftBillNo === 'string' && req.body.draftBillNo.trim()
      ? req.body.draftBillNo.trim()
      : null;

    if (!draftBillNo) {
      return res.status(400).json({ error: 'BadRequest', message: 'draftBillNo is required to link the scanned document.' });
    }

    const tenantId = extractTenantId(req);
    const userId = (req as any).user?.userId;

    try {
      const [extracted, attachment] = await Promise.all([
        receiptScanService.extractVendorBillFields(req.file.buffer, req.file.originalname),
        attachmentsService.uploadAttachment({
          file: req.file,
          entity_type: 'vendor_bill',
          entity_id: draftBillNo,
          tenantId,
          userId
        }).catch((err) => {
          // A duplicate/storage hiccup shouldn't block the AI extraction result from reaching the user.
          console.warn('⚠️ [VendorBills] scanReceipt attachment upload warning:', err?.message);
          return null;
        })
      ]);

      return res.status(200).json({
        message: 'Receipt scanned successfully. Please review the extracted details before saving.',
        data: {
          extracted,
          attachmentId: attachment?.id || null
        }
      });
    } catch (err: any) {
      if (err instanceof ReceiptScanNotConfiguredError) {
        return res.status(503).json({ error: 'NotConfigured', message: err.message });
      }
      if (err instanceof ReceiptScanFailedError) {
        return res.status(422).json({ error: 'ScanFailed', message: err.message });
      }
      if (err instanceof DuplicateAttachmentError) {
        return res.status(409).json({ error: 'DuplicateFile', message: err.message });
      }
      return res.status(400).json({ error: 'ValidationError', message: err.message || 'Failed to scan receipt.' });
    }
  }

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
      // RBAC middleware attaches the authenticated actor to the request
      const actor = (req as any).user || (req as any).actor || {};
      const actorRole: string = actor.role || actor.userRole || 'Accountant';
      const actorName: string = actor.name || actor.email || actor.userEmail || 'system';
      const data = await vendorBillsService.disbursePayment(req.params.billNo, req.body, actorRole, actorName);
      return res.json({ message: 'Vendor disbursement recorded successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const vendorBillsController = new VendorBillsController();
