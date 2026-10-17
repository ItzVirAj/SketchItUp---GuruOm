-- ============================================================================
-- 009_security_grants_and_realtime.sql
-- Server-mediated access model, realtime publication and PostgREST cache reload.
-- Runs after every table exists so the grants below cover ALL tables.
-- Idempotent: safe to re-run.
-- ============================================================================

COMMENT ON SCHEMA public IS 'GuruOm Owner OS: Direct anonymous client access is restricted. All business logic, mutations, and statutory transactions must originate from the authenticated backend API service.';

-- Anonymous (public anon key) clients can never write. All mutations go through the
-- Express backend using the service_role key.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES  IN SCHEMA public TO service_role;

-- Realtime: tables the frontend subscribes to.
DO $$
DECLARE
  tbl  TEXT;
  tbls TEXT[] := ARRAY['customer_invoices', 'customer_masters', 'customer_orders', 'dispatch_challans', 'finished_goods', 'job_cards', 'machine_masters', 'masters', 'notifications', 'pdi_inspections', 'production_logs', 'profiles', 'qc_inspections', 'stock_items', 'users', 'vendor_bills', 'vendor_masters'];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY tbls LOOP
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl)
         AND NOT EXISTS (
           SELECT 1 FROM pg_publication_tables
           WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
         ) THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.' || quote_ident(tbl);
      END IF;
    END LOOP;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Make PostgREST pick up the schema immediately.
NOTIFY pgrst, 'reload schema';
