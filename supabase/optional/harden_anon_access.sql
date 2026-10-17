-- ============================================================================
-- OPTIONAL: harden_anon_access.sql   (NOT part of apply_all_migrations.sql)
-- ============================================================================
-- Why: several tables (users, sessions, ...) have "USING (true)" RLS policies and the
-- Supabase `anon` role can still SELECT them. Anyone holding your project's public anon
-- key could read password hashes and refresh-token hashes through the REST API.
-- Your architecture already routes everything through the Express backend with the
-- service_role key, so the browser roles do not need any table access at all.
--
-- Safe to run when:  SUPABASE_SERVICE_ROLE_KEY (not the anon key) is set in your backend .env.
-- It will stop:      any browser-side supabase-js call made with the anon key
--                    (including direct realtime subscriptions).
-- Idempotent. service_role is untouched (it bypasses RLS).
-- ============================================================================

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES  IN SCHEMA public FROM anon, authenticated;

-- Keep future tables closed by default too.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES  FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
