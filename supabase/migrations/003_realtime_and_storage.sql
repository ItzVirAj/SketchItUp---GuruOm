-- ===================================================
-- Migration 003: Supabase Realtime & Storage Setup
-- ===================================================

-- Add Business Tables to Realtime Publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
      public.customer_orders,
      public.stock_items,
      public.job_cards,
      public.production_logs,
      public.qc_inspections,
      public.pdi_inspections,
      public.dispatch_challans,
      public.customer_invoices,
      public.vendor_bills,
      public.audit_logs,
      public.pending_approvals,
      public.finished_goods,
      public.notifications,
      public.profiles;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Storage Bucket for Documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('owner-os-documents', 'owner-os-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read Access for owner-os-documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'owner-os-documents');

CREATE POLICY "Public Insert Access for owner-os-documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'owner-os-documents');
