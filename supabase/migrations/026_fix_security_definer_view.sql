-- ============================================================================
-- Migration: 024_fix_security_definer_view.sql
-- Description: Alters the customer_overdue_summary view to use security_invoker = true
--              to resolve the Supabase Security Definer warning.
-- ============================================================================

ALTER VIEW public.customer_overdue_summary SET (security_invoker = true);
