-- ==============================================================================
-- Migration 028: Atomic Inventory Consumption & Non-Negative Stock Floor
-- ==============================================================================
-- 1. Adds non-negative check constraint on stock_items.on_hand
--    (Uses NOT VALID so legacy mock row 'BUSH-01' doesn't block migration,
--     while strictly enforcing on_hand >= 0 for all future transactions).
-- 2. Creates atomic stored procedure consume_order_materials_atomic to execute
--    idempotent, all-or-nothing, concurrency-safe material consumption.
-- ==============================================================================

-- 1. Add non-negative constraint on stock_items.on_hand
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_stock_items_on_hand_non_negative'
  ) THEN
    ALTER TABLE public.stock_items 
    ADD CONSTRAINT chk_stock_items_on_hand_non_negative CHECK (on_hand >= 0) NOT VALID;
  END IF;
END $$;

-- 2. Atomic Order Material Consumption Stored Function
CREATE OR REPLACE FUNCTION public.consume_order_materials_atomic(
    p_order_id TEXT,
    p_order_po TEXT,
    p_actor_email TEXT,
    p_allocations JSONB -- Array of { item_code: TEXT, qty: NUMERIC, description: TEXT }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_stock RECORD;
    v_existing_movement_count INT;
    v_order_reserved NUMERIC := 0;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Idempotency Check:
    -- Check if PRODUCTION_CONSUMPTION movements already exist for this order_po
    SELECT COUNT(*) INTO v_existing_movement_count
    FROM public.inventory_movements
    WHERE reference_id = p_order_po
      AND movement_type = 'PRODUCTION_CONSUMPTION';

    IF v_existing_movement_count > 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_consumed', true,
            'message', 'Materials for order ' || p_order_po || ' have already been consumed.'
        );
    END IF;

    -- 2. Multi-component lock & sufficiency check in alphabetical order to prevent deadlocks
    FOR v_item IN 
        SELECT 
            elem->>'item_code' AS item_code, 
            (elem->>'qty')::NUMERIC AS qty,
            elem->>'description' AS description
        FROM jsonb_array_elements(p_allocations) elem
        ORDER BY elem->>'item_code' ASC
    LOOP
        -- Row-level lock on stock_items
        SELECT * INTO v_stock
        FROM public.stock_items
        WHERE code = v_item.item_code
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'ERR_STOCK_ITEM_NOT_FOUND',
                'item_code', v_item.item_code,
                'message', 'Stock item not found: ' || v_item.item_code
            );
        END IF;

        -- Verify sufficient physical on_hand
        IF v_stock.on_hand < v_item.qty THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'ERR_INSUFFICIENT_STOCK',
                'item_code', v_item.item_code,
                'required_qty', v_item.qty,
                'on_hand', v_stock.on_hand,
                'deficit', (v_item.qty - v_stock.on_hand),
                'message', 'Insufficient stock for ' || v_item.item_code || '. Required: ' || v_item.qty || ', On-hand: ' || v_stock.on_hand
            );
        END IF;
    END LOOP;

    -- 3. All items have sufficient stock -> Deduct stock, insert movements, and reconcile reservations
    FOR v_item IN 
        SELECT 
            elem->>'item_code' AS item_code, 
            (elem->>'qty')::NUMERIC AS qty,
            elem->>'description' AS description
        FROM jsonb_array_elements(p_allocations) elem
        ORDER BY elem->>'item_code' ASC
    LOOP
        SELECT * INTO v_stock
        FROM public.stock_items
        WHERE code = v_item.item_code;

        -- Only decrement reserved by the quantity actually reserved by THIS order
        SELECT COALESCE(SUM(reserved_qty), 0) INTO v_order_reserved
        FROM public.order_material_reservations
        WHERE (order_id = p_order_id OR order_po = p_order_po)
          AND item_code = v_item.item_code
          AND status = 'ACTIVE';

        -- Deduct from stock_items
        UPDATE public.stock_items
        SET 
            on_hand = on_hand - v_item.qty,
            reserved = GREATEST(0, reserved - v_order_reserved),
            available = (on_hand - v_item.qty) - GREATEST(0, reserved - v_order_reserved),
            status = CASE 
                WHEN ((on_hand - v_item.qty) - GREATEST(0, reserved - v_order_reserved)) < 0 THEN 'CRITICAL'
                WHEN ((on_hand - v_item.qty) - GREATEST(0, reserved - v_order_reserved)) < reorder_level THEN 'SHORTAGE'
                ELSE 'OK'
            END,
            updated_at = v_now
        WHERE code = v_item.item_code;

        -- Insert append-only ledger movement
        INSERT INTO public.inventory_movements (
            id,
            item_code,
            location,
            quantity_change,
            movement_type,
            reference_id,
            reference_type,
            balance_after,
            actor_email,
            notes,
            created_at
        ) VALUES (
            'mov-' || floor(extract(epoch from v_now) * 1000)::text || '-' || substr(md5(random()::text), 1, 6),
            v_item.item_code,
            'MAIN-WAREHOUSE',
            -v_item.qty,
            'PRODUCTION_CONSUMPTION',
            p_order_po,
            'order',
            v_stock.on_hand - v_item.qty,
            p_actor_email,
            'Material issued for PO ' || p_order_po || ' — ' || COALESCE(v_item.description, v_item.item_code) || ' × ' || v_item.qty,
            v_now
        );

        -- Reconcile order_material_reservations
        UPDATE public.order_material_reservations
        SET 
            status = 'CONSUMED',
            updated_at = v_now
        WHERE (order_id = p_order_id OR order_po = p_order_po)
          AND item_code = v_item.item_code
          AND status = 'ACTIVE';
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'already_consumed', false,
        'message', 'Materials consumed and reservations reconciled successfully.'
    );
END;
$$;
