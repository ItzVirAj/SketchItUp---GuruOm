-- ===================================================
-- Migration 003: Supabase Realtime & Storage Setup
-- ===================================================

-- Add Business Tables to Realtime Publication safely
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'customer_orders', 'stock_items', 'job_cards', 'production_logs',
    'qc_inspections', 'pdi_inspections', 'dispatch_challans',
    'customer_invoices', 'vendor_bills', 'audit_logs',
    'pending_approvals', 'finished_goods', 'notifications', 'profiles'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY tbls LOOP
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = tbl
        ) THEN
          EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.' || quote_ident(tbl);
        END IF;
      END IF;
    END LOOP;
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
