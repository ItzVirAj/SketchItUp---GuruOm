-- ============================================================================
-- Migration: 026_concurrency_safe_master_sequences.sql
-- Description: Concurrency-Safe Master Code Counter Table, Atomic Allocation
--              Function, and Safe Sequence Initialization for Masters
--              (Items, Customers, Vendors, Machines, Users).
-- ============================================================================

-- 1. Create Atomic Master Code Counters Table
CREATE TABLE IF NOT EXISTS public.master_code_counters (
    entity_type VARCHAR(50) NOT NULL,
    prefix VARCHAR(20) NOT NULL,
    current_value BIGINT NOT NULL DEFAULT 0,
    padding_digits INT NOT NULL DEFAULT 4,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (entity_type, prefix)
);

-- Enable RLS and establish open policy for service role access
ALTER TABLE public.master_code_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Master code counters service access" ON public.master_code_counters;
CREATE POLICY "Master code counters service access" ON public.master_code_counters FOR ALL USING (true);

-- 2. Concurrency-Safe Atomic Code Generator Function
-- Uses row-level lock on the counter row via INSERT ... ON CONFLICT DO UPDATE RETURNING
CREATE OR REPLACE FUNCTION public.get_next_master_code(p_entity_type VARCHAR, p_prefix VARCHAR)
RETURNS VARCHAR
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_num BIGINT;
  v_padded VARCHAR;
  v_clean_prefix VARCHAR;
  v_clean_entity VARCHAR;
BEGIN
  v_clean_prefix := UPPER(TRIM(p_prefix));
  v_clean_entity := UPPER(TRIM(p_entity_type));

  INSERT INTO public.master_code_counters (entity_type, prefix, current_value, padding_digits, updated_at)
  VALUES (v_clean_entity, v_clean_prefix, 1, 4, NOW())
  ON CONFLICT (entity_type, prefix)
  DO UPDATE SET
    current_value = public.master_code_counters.current_value + 1,
    updated_at = NOW()
  RETURNING current_value INTO v_next_num;

  v_padded := LPAD(v_next_num::TEXT, 4, '0');
  RETURN v_clean_prefix || '-' || v_padded;
END;
$$ LANGUAGE plpgsql;

-- 3. Seed Existing Max Sequence Values from Database Tables
-- Safely extracts existing numeric suffixes without overwriting or decrementing

-- A. Customer Masters (CUST-####)
INSERT INTO public.master_code_counters (entity_type, prefix, current_value, padding_digits, updated_at)
SELECT 'CUSTOMER', 'CUST', COALESCE(MAX(NULLIF(regexp_replace(code, '^CUST-', ''), '')::BIGINT), 0), 4, NOW()
FROM public.customer_masters
WHERE code ~ '^CUST-[0-9]+$'
ON CONFLICT (entity_type, prefix)
DO UPDATE SET current_value = GREATEST(public.master_code_counters.current_value, EXCLUDED.current_value);

-- B. Vendor Masters (VEND-####)
INSERT INTO public.master_code_counters (entity_type, prefix, current_value, padding_digits, updated_at)
SELECT 'VENDOR', 'VEND', COALESCE(MAX(NULLIF(regexp_replace(code, '^VEND-', ''), '')::BIGINT), 0), 4, NOW()
FROM public.vendor_masters
WHERE code ~ '^VEND-[0-9]+$'
ON CONFLICT (entity_type, prefix)
DO UPDATE SET current_value = GREATEST(public.master_code_counters.current_value, EXCLUDED.current_value);

-- C. Machine Masters (MCH-####)
INSERT INTO public.master_code_counters (entity_type, prefix, current_value, padding_digits, updated_at)
SELECT 'MACHINE', 'MCH', COALESCE(MAX(NULLIF(regexp_replace(code, '^MCH-', ''), '')::BIGINT), 0), 4, NOW()
FROM public.machine_masters
WHERE code ~ '^MCH-[0-9]+$'
ON CONFLICT (entity_type, prefix)
DO UPDATE SET current_value = GREATEST(public.master_code_counters.current_value, EXCLUDED.current_value);

-- D. Item Masters (masters table)
-- Finished Goods (FG-####)
INSERT INTO public.master_code_counters (entity_type, prefix, current_value, padding_digits, updated_at)
SELECT 'ITEM', 'FG', COALESCE(MAX(NULLIF(regexp_replace(code, '^FG-', ''), '')::BIGINT), 0), 4, NOW()
FROM public.masters
WHERE code ~ '^FG-[0-9]+$'
ON CONFLICT (entity_type, prefix)
DO UPDATE SET current_value = GREATEST(public.master_code_counters.current_value, EXCLUDED.current_value);

-- Raw Materials (RM-####)
INSERT INTO public.master_code_counters (entity_type, prefix, current_value, padding_digits, updated_at)
SELECT 'ITEM', 'RM', COALESCE(MAX(NULLIF(regexp_replace(code, '^RM-', ''), '')::BIGINT), 0), 4, NOW()
FROM public.masters
WHERE code ~ '^RM-[0-9]+$'
ON CONFLICT (entity_type, prefix)
DO UPDATE SET current_value = GREATEST(public.master_code_counters.current_value, EXCLUDED.current_value);

-- Legacy Items (ITEM-####)
INSERT INTO public.master_code_counters (entity_type, prefix, current_value, padding_digits, updated_at)
SELECT 'ITEM', 'ITEM', COALESCE(MAX(NULLIF(regexp_replace(code, '^ITEM-', ''), '')::BIGINT), 0), 4, NOW()
FROM public.masters
WHERE code ~ '^ITEM-[0-9]+$'
ON CONFLICT (entity_type, prefix)
DO UPDATE SET current_value = GREATEST(public.master_code_counters.current_value, EXCLUDED.current_value);

-- Semi-Finished (SF-####), Consumables (CO-####), Bought-Out (BO-####), Other (ITM-####)
INSERT INTO public.master_code_counters (entity_type, prefix, current_value, padding_digits, updated_at)
VALUES
  ('ITEM', 'SF', 0, 4, NOW()),
  ('ITEM', 'CO', 0, 4, NOW()),
  ('ITEM', 'BO', 0, 4, NOW()),
  ('ITEM', 'ITM', 0, 4, NOW()),
  ('USER', 'USR', 0, 4, NOW())
ON CONFLICT (entity_type, prefix) DO NOTHING;
