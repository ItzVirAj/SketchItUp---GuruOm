-- ============================================================================
-- 011_item_category_and_dimensions.sql
-- Add item category and dimension columns (dim_diameter, dim_length, dim_width, dim_thickness)
-- to the public.masters table. Nullable columns to preserve existing rows.
-- Idempotent: safe to re-run.
-- ============================================================================

ALTER TABLE public.masters
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS dim_diameter numeric,
  ADD COLUMN IF NOT EXISTS dim_length numeric,
  ADD COLUMN IF NOT EXISTS dim_width numeric,
  ADD COLUMN IF NOT EXISTS dim_thickness numeric;

-- Index for category searches / filtering
CREATE INDEX IF NOT EXISTS idx_masters_category ON public.masters USING btree (category);
