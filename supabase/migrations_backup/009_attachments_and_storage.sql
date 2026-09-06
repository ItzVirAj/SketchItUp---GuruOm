-- ===================================================
-- Migration 009: File Storage & Attachment Management
-- ===================================================

-- 1. Create Private Storage Bucket (Strictly Private, No Public Access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false, -- STRICTLY PRIVATE BUCKET
  26214400, -- 25MB max limit
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'text/plain',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. Attachments Metadata Table
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 't_00000000-0000-0000-0000-000000000001',
  entity_type TEXT NOT NULL, -- e.g. 'invoice', 'pdi_report', 'qc_doc', 'production_job', 'vendor_bill', 'cad_drawing'
  entity_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  scan_status TEXT NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending', 'clean', 'infected', 'error')),
  scan_result JSONB DEFAULT '{}'::jsonb,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

-- 3. Indexes for High-Performance Queries & Tenant Isolation
CREATE INDEX IF NOT EXISTS idx_attachments_tenant ON public.attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON public.attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_checksum ON public.attachments(checksum_sha256);
CREATE INDEX IF NOT EXISTS idx_attachments_scan_status ON public.attachments(scan_status);
CREATE INDEX IF NOT EXISTS idx_attachments_deleted_at ON public.attachments(deleted_at);

-- 4. Enable RLS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for attachments"
ON public.attachments
FOR ALL
USING (tenant_id = current_setting('app.current_tenant', true))
WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- 5. Extend customer_invoices with pdf_status and attachment_id
ALTER TABLE public.customer_invoices 
ADD COLUMN IF NOT EXISTS pdf_status TEXT DEFAULT 'pending_pdf',
ADD COLUMN IF NOT EXISTS attachment_id UUID REFERENCES public.attachments(id) ON DELETE SET NULL;
