-- ============================================================
-- 029: BOM AND ROUTE CARDS REFERENTIAL INTEGRITY TO ITEMS MASTER
-- Ensures that:
-- 1. bill_of_materials.parent_part_code REFERENCES masters(code)
-- 2. bom_items.component_code REFERENCES masters(code)
-- 3. route_card_templates.part_code REFERENCES masters(code)
-- ON UPDATE CASCADE, ON DELETE RESTRICT
-- ============================================================

-- Step 1: Reconcile legacy seed items in masters before adding constraints
INSERT INTO public.masters (
    id,
    code, name, description, part_no, hsn_code, reorder_level, 
    store_location, default_warehouse, is_finished_goods, sale_rate, 
    purchase_rate, item_type, unit, uom, status
)
VALUES 
  (gen_random_uuid(),'00000001', 'MAIN SPINDLE HOUSING 120MM', 'Main spindle housing 120mm per drawing', '00000001', '8483', 10, 'Finished Goods Store', 'Finished Goods Store', true, 0, 0, 'Finished Good', 'Nos', 'Nos', 'Active'),
  (gen_random_uuid(),'00000002', 'HARDENED BUSH 45X60X80', 'Hardened bush 45x60x80 per drawing', '00000002', '8483', 10, 'Finished Goods Store', 'Finished Goods Store', false, 0, 0, 'Semi-Finished', 'Nos', 'Nos', 'Active')
ON CONFLICT (code) DO NOTHING;

-- Step 2: Auto-backfill any missing legacy BOM parent part codes into masters
INSERT INTO public.masters (
    code, name, description, part_no, hsn_code, reorder_level, 
    store_location, default_warehouse, is_finished_goods, sale_rate, 
    purchase_rate, item_type, unit, uom, status
)
SELECT DISTINCT 
    b.parent_part_code, 
    b.parent_part_name, 
    b.parent_part_name, 
    b.parent_part_code,
    '8483',
    10,
    'Finished Goods Store',
    'Finished Goods Store',
    true,
    0,
    0,
    'Finished Good', 
    'Nos', 
    'Nos',
    'Active'
FROM public.bill_of_materials b
WHERE NOT EXISTS (SELECT 1 FROM public.masters m WHERE m.code = b.parent_part_code)
ON CONFLICT (code) DO NOTHING;

-- Step 3: Auto-backfill any missing legacy BOM component codes into masters
INSERT INTO public.masters (
    code, name, description, part_no, hsn_code, reorder_level, 
    store_location, default_warehouse, is_finished_goods, sale_rate, 
    purchase_rate, item_type, unit, uom, status
)
SELECT DISTINCT 
    bi.component_code, 
    bi.component_name, 
    bi.component_name, 
    bi.component_code,
    '8483',
    10,
    'Main Raw Material Store',
    'Main Raw Material Store',
    false,
    0,
    0,
    'Raw Material', 
    bi.unit, 
    bi.unit,
    'Active'
FROM public.bom_items bi
WHERE NOT EXISTS (SELECT 1 FROM public.masters m WHERE m.code = bi.component_code)
ON CONFLICT (code) DO NOTHING;

-- Step 4: Auto-backfill any missing legacy Route Card part codes into masters
INSERT INTO public.masters (
    code, name, description, part_no, hsn_code, reorder_level, 
    store_location, default_warehouse, is_finished_goods, sale_rate, 
    purchase_rate, item_type, unit, uom, status
)
SELECT DISTINCT 
    rc.part_code, 
    rc.part_description, 
    rc.part_description, 
    rc.part_code,
    '8483',
    10,
    'Finished Goods Store',
    'Finished Goods Store',
    true,
    0,
    0,
    'Finished Good', 
    'Nos', 
    'Nos',
    'Active'
FROM public.route_card_templates rc
WHERE NOT EXISTS (SELECT 1 FROM public.masters m WHERE m.code = rc.part_code)
ON CONFLICT (code) DO NOTHING;

-- Step 5: Add Foreign Key on bill_of_materials(parent_part_code) -> masters(code)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_bom_parent_item'
  ) THEN
    ALTER TABLE public.bill_of_materials
    ADD CONSTRAINT fk_bom_parent_item
    FOREIGN KEY (parent_part_code)
    REFERENCES public.masters(code)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;
  END IF;
END $$;

-- Step 6: Add Foreign Key on bom_items(component_code) -> masters(code)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_bom_item_component'
  ) THEN
    ALTER TABLE public.bom_items
    ADD CONSTRAINT fk_bom_item_component
    FOREIGN KEY (component_code)
    REFERENCES public.masters(code)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;
  END IF;
END $$;

-- Step 7: Add Foreign Key on route_card_templates(part_code) -> masters(code)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_route_card_part_item'
  ) THEN
    ALTER TABLE public.route_card_templates
    ADD CONSTRAINT fk_route_card_part_item
    FOREIGN KEY (part_code)
    REFERENCES public.masters(code)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;
  END IF;
END $$;

-- Step 8: Ensure supporting indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_bom_items_component_code ON public.bom_items(component_code);
CREATE INDEX IF NOT EXISTS idx_route_card_templates_part_code ON public.route_card_templates(part_code);
