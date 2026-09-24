import { z } from 'zod';

export const UploadAttachmentSchema = z.object({
  entity_type: z.enum([
    'invoice',
    'pdi_report',
    'qc_doc',
    'production_job',
    'vendor_bill',
    'cad_drawing',
    'spec_sheet',
    'general'
  ]),
  entity_id: z.string().min(1, 'entity_id is required')
});

export const ListAttachmentsQuerySchema = z.object({
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  current: z.enum(['true', 'false']).optional()
});

export interface AttachmentRecord {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  checksum_sha256: string;
  version: number;
  is_current: boolean;
  scan_status: 'pending' | 'clean' | 'infected' | 'error';
  scan_result?: any;
  uploaded_by?: string;
  created_at: string;
  deleted_at?: string | null;
}
