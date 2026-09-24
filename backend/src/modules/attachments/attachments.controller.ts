import { Request, Response } from 'express';
import { attachmentsService, FileScanningInProgressError, FileInfectedError, DuplicateAttachmentError } from './attachments.service';
import { UploadAttachmentSchema, ListAttachmentsQuerySchema } from './attachments.schema';
import { extractTenantId } from '../../lib/cache';

export class AttachmentsController {
  /**
   * Uploads a file attachment.
   */
  async uploadAttachment(req: Request, res: Response) {
    const tenantId = extractTenantId(req);
    const userId = (req as any).user?.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'BadRequest', message: 'No file uploaded.' });
    }

    try {
      const { entity_type, entity_id } = UploadAttachmentSchema.parse(req.body);

      const record = await attachmentsService.uploadAttachment({
        file: req.file,
        entity_type,
        entity_id,
        tenantId,
        userId
      });

      return res.status(201).json({
        message: 'Attachment uploaded successfully. Security scan initiated.',
        data: record
      });
    } catch (err: any) {
      if (err instanceof DuplicateAttachmentError) {
        return res.status(409).json({ error: 'DuplicateFile', message: err.message });
      }
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  /**
   * Lists attachments filtered by entity and version state.
   */
  async getAttachments(req: Request, res: Response) {
    const tenantId = extractTenantId(req);

    try {
      const { entity_type, entity_id, current } = ListAttachmentsQuerySchema.parse(req.query);

      const data = await attachmentsService.getAttachments({
        tenantId,
        entity_type,
        entity_id,
        currentOnly: current === 'true'
      });

      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  /**
   * Retrieves single attachment metadata.
   */
  async getAttachmentById(req: Request, res: Response) {
    const tenantId = extractTenantId(req);

    try {
      const data = await attachmentsService.getAttachmentById(req.params.id, tenantId);
      if (!data) {
        return res.status(404).json({ error: 'NotFound', message: 'Attachment not found.' });
      }
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  /**
   * Generates short-lived signed URL for download.
   */
  async getDownloadUrl(req: Request, res: Response) {
    const tenantId = extractTenantId(req);

    try {
      const result = await attachmentsService.getSignedDownloadUrl(req.params.id, tenantId, 120);
      return res.json({
        message: 'Signed download URL generated successfully.',
        data: result
      });
    } catch (err: any) {
      if (err instanceof FileScanningInProgressError) {
        return res.status(423).json({
          error: 'ScanInProgress',
          message: err.message
        });
      }

      if (err instanceof FileInfectedError) {
        return res.status(403).json({
          error: 'FileQuarantined',
          message: err.message
        });
      }

      return res.status(404).json({ error: 'NotFound', message: err.message });
    }
  }

  /**
   * Soft deletes an attachment record.
   */
  async softDeleteAttachment(req: Request, res: Response) {
    const tenantId = extractTenantId(req);
    const userId = (req as any).user?.userId;

    try {
      const success = await attachmentsService.softDeleteAttachment(req.params.id, tenantId, userId);
      if (!success) {
        return res.status(404).json({ error: 'NotFound', message: 'Attachment not found.' });
      }
      return res.json({ message: 'Attachment soft-deleted successfully.' });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }
}

export const attachmentsController = new AttachmentsController();
