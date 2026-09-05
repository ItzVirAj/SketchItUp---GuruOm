-- ==============================================================================
-- Migration 027: Inventory Reservations Lifecycle, Idempotency & Safety
-- ==============================================================================
-- Tracks per-order, per-material stock reservations to guarantee:
-- 1. Idempotency: repeated checks do not duplicate reserved amounts.
-- 2. Lifecycle reconciliation: reservations are marked CONSUMED upon material issue.
-- 3. Cancellation safety: cancelled orders release reservations back to available pool.
-- 4. Invariant: stock_items.reserved cannot become negative.
-- ==============================================================================

-- 1. Create order_material_reservations table
CREATE TABLE IF NOT EXISTS public.order_material_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL,
    order_po TEXT NOT NULL,
    item_code TEXT NOT NULL,
    reserved_qty NUMERIC(12, 4) NOT NULL CHECK (reserved_qty >= 0),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CONSUMED', 'RELEASED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying active reservations by order
CREATE INDEX IF NOT EXISTS idx_order_res_order ON public.order_material_reservations (order_id, status);

-- Index for querying active reservations by stock item
CREATE INDEX IF NOT EXISTS idx_order_res_item ON public.order_material_reservations (item_code, status);

-- Partial Unique Index: At most ONE active reservation per order and material item
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_order_item_reservation 
ON public.order_material_reservations (order_id, item_code) 
WHERE status = 'ACTIVE';

-- Enable RLS & service access policy
ALTER TABLE public.order_material_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Order material reservations service access" ON public.order_material_reservations;
CREATE POLICY "Order material reservations service access" 
ON public.order_material_reservations 
FOR ALL 
USING (true);

-- 2. Add non-negative constraint on stock_items.reserved if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_stock_items_reserved_non_negative'
  ) THEN
    ALTER TABLE public.stock_items 
    ADD CONSTRAINT chk_stock_items_reserved_non_negative CHECK (reserved >= 0);
  END IF;
END $$;
