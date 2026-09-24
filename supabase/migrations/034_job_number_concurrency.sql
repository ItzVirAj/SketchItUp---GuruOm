-- ============================================================================
-- Migration: 032_job_number_concurrency.sql
-- Description: Concurrency-Safe Job Number Counter Table, Atomic Allocation
--              Function, and Safe Sequence Initialization for Job Cards.
-- ============================================================================

-- 1. Create Atomic Job Number Counters Table
CREATE TABLE IF NOT EXISTS public.job_number_counters (
    prefix VARCHAR(20) NOT NULL DEFAULT 'JC',
    fiscal_year VARCHAR(20) NOT NULL DEFAULT '26-27',
    current_value BIGINT NOT NULL DEFAULT 0,
    padding_digits INT NOT NULL DEFAULT 4,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (prefix, fiscal_year)
);

-- Enable RLS and establish open policy for service role access
ALTER TABLE public.job_number_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Job number counters service access" ON public.job_number_counters;
CREATE POLICY "Job number counters service access" ON public.job_number_counters FOR ALL USING (true);

-- 2. Concurrency-Safe Atomic Job Number Generator Function
-- Uses row-level lock on the counter row via INSERT ... ON CONFLICT DO UPDATE RETURNING
CREATE OR REPLACE FUNCTION public.get_next_job_number(p_prefix VARCHAR DEFAULT 'JC', p_fiscal_year VARCHAR DEFAULT '26-27')
RETURNS VARCHAR
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_num BIGINT;
  v_padded VARCHAR;
  v_clean_prefix VARCHAR;
  v_clean_fy VARCHAR;
BEGIN
  v_clean_prefix := COALESCE(NULLIF(UPPER(TRIM(p_prefix)), ''), 'JC');
  v_clean_fy := COALESCE(NULLIF(TRIM(p_fiscal_year), ''), '26-27');

  INSERT INTO public.job_number_counters (prefix, fiscal_year, current_value, padding_digits, updated_at)
  VALUES (v_clean_prefix, v_clean_fy, 1, 4, NOW())
  ON CONFLICT (prefix, fiscal_year)
  DO UPDATE SET
    current_value = public.job_number_counters.current_value + 1,
    updated_at = NOW()
  RETURNING current_value INTO v_next_num;

  v_padded := CASE WHEN LENGTH(v_next_num::TEXT) < 4 THEN LPAD(v_next_num::TEXT, 4, '0') ELSE v_next_num::TEXT END;
  RETURN v_clean_prefix || '/' || v_padded || '/' || v_clean_fy;
END;
$$ LANGUAGE plpgsql;

-- 3. Seed Existing Max Sequence Values from Database Table `job_cards`
-- Safely extracts existing numeric sequences without overwriting or decrementing.
-- Note: Accounts for historical jump numbers up to 979168 so zero collisions occur.
INSERT INTO public.job_number_counters (prefix, fiscal_year, current_value, padding_digits, updated_at)
SELECT 
    'JC', 
    '26-27', 
    COALESCE(MAX(NULLIF(regexp_replace(job_no, '^JC/([0-9]+)/.*$', '\1'), '')::BIGINT), 979168), 
    4, 
    NOW()
FROM public.job_cards
WHERE job_no ~ '^JC/[0-9]+/'
ON CONFLICT (prefix, fiscal_year)
DO UPDATE SET current_value = GREATEST(public.job_number_counters.current_value, EXCLUDED.current_value);
