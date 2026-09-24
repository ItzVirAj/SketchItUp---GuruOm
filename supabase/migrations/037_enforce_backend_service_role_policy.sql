-- ============================================================================
-- Migration: 037_enforce_backend_service_role_policy.sql
-- Description: Enforce server-mediated data access architecture (C-05).
--              Direct client/browser access via Supabase public anon key is
--              disabled; all business operations route through the authenticated
--              Express backend using the service_role key.
-- ============================================================================

COMMENT ON SCHEMA public IS 'GuruOm Owner OS: Direct anonymous client access is restricted. All business logic, mutations, and statutory transactions must originate from the authenticated backend API service.';

-- Revoke table mutations from anon to eliminate client-side bypass risk
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon;

-- Ensure authenticated backend service_role maintains full operations
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- NOTE FOR LOCAL DEVELOPMENT:
-- In .env, ensure SUPABASE_SERVICE_ROLE_KEY is set to the secret "service_role" key
-- from Supabase Dashboard > Project Settings > API, NOT the public "anon" key.
-- If your .env still has the anon key, table mutations will be rejected by Postgres
-- until either the service_role secret is configured in .env or the following is run in SQL Editor:
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
