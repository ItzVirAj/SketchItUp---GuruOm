-- ============================================================================
-- Migration: 036_fix_customer_invoices_igst_amount.sql
-- Description: customer_invoices was missing igst_amount even though
--              cgst_amount/sgst_amount were added alongside it (migration
--              020_persistence_convergence.sql, lines ~1622-1630) and
--              invoices.service.ts writes all three on every insert. Every
--              invoice creation attempt was failing outright with:
--                PGRST204 "Could not find the 'igst_amount' column of
--                'customer_invoices' in the schema cache"
--              This is the root cause of invoices never appearing in the
--              Invoices list and "Invoice not found" errors when recording
--              payment against them — no invoice row was ever actually saved.
-- ============================================================================

ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(14,2) NOT NULL DEFAULT 0;
