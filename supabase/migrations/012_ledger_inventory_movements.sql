-- ===================================================
-- Migration 011: Append-Only Inventory Movements Ledger
-- ===================================================

-- 1. Create append-only inventory_movements table
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'MAIN-WAREHOUSE',
  quantity_change NUMERIC NOT NULL,     -- Signed number: + for inbound, - for outbound
  movement_type TEXT NOT NULL,          -- 'OPENING_BALANCE', 'GRN', 'PRODUCTION_CONSUMPTION', 'PRODUCTION_OUTPUT', 'DISPATCH', 'RETURN', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'DAMAGE_WRITE_OFF', 'CORRECTION'
  reference_id TEXT DEFAULT NULL,       -- e.g. GRN No, Job Card No, Challan No, PO No
  reference_type TEXT DEFAULT 'manual', -- 'grn', 'job_card', 'dispatch', 'order', 'adjustment', 'correction', 'manual'
  balance_after NUMERIC NOT NULL,       -- Running balance snapshot written atomically with movement
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  notes TEXT DEFAULT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON public.inventory_movements (item_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON public.inventory_movements (movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_ref ON public.inventory_movements (reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_actor ON public.inventory_movements (actor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON public.inventory_movements (created_at DESC);

-- 3. Database-Level Trigger: Enforce Immutability (Append-Only)
CREATE OR REPLACE FUNCTION prevent_inventory_movement_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'inventory_movements is append-only: % not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS no_update_inventory_movements ON public.inventory_movements;
CREATE TRIGGER no_update_inventory_movements
BEFORE UPDATE ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION prevent_inventory_movement_mutation();

DROP TRIGGER IF EXISTS no_delete_inventory_movements ON public.inventory_movements;
CREATE TRIGGER no_delete_inventory_movements
BEFORE DELETE ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION prevent_inventory_movement_mutation();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Insert policy for backend / service role
DROP POLICY IF EXISTS "Allow backend inserts on inventory_movements" ON public.inventory_movements;
CREATE POLICY "Allow backend inserts on inventory_movements"
ON public.inventory_movements
FOR INSERT
WITH CHECK (true);

-- Read policy for authenticated users
DROP POLICY IF EXISTS "Allow authenticated reads on inventory_movements" ON public.inventory_movements;
CREATE POLICY "Allow authenticated reads on inventory_movements"
ON public.inventory_movements
FOR SELECT
USING (true);

-- 5. Derived Stock View (Single Source of Truth)
CREATE OR REPLACE VIEW public.stock_levels_view AS
SELECT 
  item_code,
  location,
  SUM(quantity_change) AS current_on_hand,
  COUNT(*) AS total_movements,
  MAX(created_at) AS last_movement_at
FROM public.inventory_movements
GROUP BY item_code, location;

-- 6. Initial Opening Balance Backfill
INSERT INTO public.inventory_movements (
  item_code, 
  location, 
  quantity_change, 
  movement_type, 
  reference_id, 
  reference_type, 
  balance_after, 
  actor_email, 
  notes
)
SELECT 
  s.code,
  'MAIN-WAREHOUSE',
  s.on_hand,
  'OPENING_BALANCE',
  'INIT-MIGRATION-011',
  'system',
  s.on_hand,
  'system@guruom.in',
  'Initial Opening Balance Backfill from legacy quantity column'
FROM public.stock_items s
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory_movements im WHERE im.item_code = s.code
);
