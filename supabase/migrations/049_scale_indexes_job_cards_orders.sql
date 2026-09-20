-- ============================================================================
-- Migration: 049_scale_indexes_job_cards_orders.sql
-- Description: Indexes for the read paths that scale with POs of 40-50+ lines
--              (Job Cards screen, Orders screen, per-card operation lookups).
--              Idempotent and defensive: an index is skipped (with a NOTICE) if
--              its table or column does not exist, so this can never abort the
--              rest of a migration script.
-- ============================================================================

CREATE OR REPLACE FUNCTION pg_temp.ensure_index(p_idx text, p_table text, p_cols text[], p_def text)
RETURNS void AS $$
BEGIN
  IF to_regclass('public.' || p_table) IS NULL THEN
    RAISE NOTICE 'skip %: table public.% does not exist', p_idx, p_table;
    RETURN;
  END IF;
  IF (SELECT count(*) FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = p_table AND column_name = ANY (p_cols)) < array_length(p_cols, 1) THEN
    RAISE NOTICE 'skip %: a required column is missing on public.%', p_idx, p_table;
    RETURN;
  END IF;
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I %s', p_idx, p_table, p_def);
END;
$$ LANGUAGE plpgsql;

-- Job cards: per-PO lookups, and the deterministic newest-first order used for paging.
SELECT pg_temp.ensure_index('idx_job_cards_order_po',        'job_cards', ARRAY['order_po'],               '(order_po)');
SELECT pg_temp.ensure_index('idx_job_cards_created_id_desc', 'job_cards', ARRAY['created_at', 'id'],       '(created_at DESC, id DESC)');

-- Operations: every card needs its operations; looked up by card id and by job number.
SELECT pg_temp.ensure_index('idx_job_card_operations_card',   'job_card_operations', ARRAY['job_card_id'], '(job_card_id)');
SELECT pg_temp.ensure_index('idx_job_card_operations_job_no', 'job_card_operations', ARRAY['job_no'],      '(job_no)');

-- Orders screen: lines per order, and the tables joined by PO number.
SELECT pg_temp.ensure_index('idx_order_line_items_order_id',  'order_line_items',  ARRAY['order_id'],      '(order_id)');
SELECT pg_temp.ensure_index('idx_dispatch_challans_order_po', 'dispatch_challans', ARRAY['order_po'],      '(order_po)');
SELECT pg_temp.ensure_index('idx_customer_invoices_order_po', 'customer_invoices', ARRAY['order_po'],      '(order_po)');
SELECT pg_temp.ensure_index('idx_ncrs_order_po',              'ncrs',              ARRAY['order_po'],      '(order_po)');
SELECT pg_temp.ensure_index('idx_ncrs_job_no',                'ncrs',              ARRAY['job_no'],        '(job_no)');
