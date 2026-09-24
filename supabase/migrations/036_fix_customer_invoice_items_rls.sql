-- ============================================================================
-- Migration: 036_fix_customer_invoice_items_rls.sql
-- Description: Allow open access policy on customer_invoice_items to prevent
--              RLS violation (42501) when creating invoice items.
-- ============================================================================

ALTER TABLE public.customer_invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Open access on customer_invoice_items" ON public.customer_invoice_items;
CREATE POLICY "Open access on customer_invoice_items" ON public.customer_invoice_items FOR ALL USING (true);
