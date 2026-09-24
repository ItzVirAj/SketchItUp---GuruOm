-- ==============================================================================
-- Migration 031: Job-Card-Level Atomic Material Consumption (Critical Issue #9)
-- ==============================================================================
-- Material consumption must correspond to the manufacturing entity (the Job Card
-- and its target quantity), not blindly to the commercial order quantity.
--
-- 1. Adds atomic stored procedure consume_job_card_materials_atomic:
--    - Idempotency identity = job_no (unique per Job Card): repeated execution
--      never double-deducts, while DIFFERENT Job Cards of the same order consume
--      independently and legitimately.
--    - Double-count guard: blocked if materials for the parent order were already
--      consumed at ORDER level (PRODUCTION_CONSUMPTION / reference_type 'order').
--    - All-or-nothing multi-component sufficiency with row-level FOR UPDATE locks.
--    - Append-only ledger rows: movement_type 'PRODUCTION_CONSUMPTION',
--      reference_type 'job_card', reference_id = job_no.
--    - PARTIAL order-reservation reconciliation: the order's reservation pool is
--      decremented by the quantity actually consumed; residual stays ACTIVE
--      (cancellation later releases only the outstanding remainder).
--
-- 2. Recreates consume_order_materials_atomic with an additive guard: order-level
--    bulk issue is blocked when Job-Card-level consumption already exists for the
--    order (prevents double counting across the two models). Existing behaviour is
--    otherwise unchanged.
-- ==============================================================================

-- 1. Job-Card-Level Atomic Consumption Stored Function
CREATE OR REPLACE FUNCTION public.consume_job_card_materials_atomic(
    p_order_id TEXT,
    p_order_po TEXT,
    p_job_no TEXT,
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
    v_order_consumed_count INT;
    v_reservation_qty NUMERIC;
    v_consumed_from_reservation NUMERIC;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Idempotency Check: Job-Card-level consumption already posted for this job_no?
    SELECT COUNT(*) INTO v_existing_movement_count
    FROM public.inventory_movements
    WHERE reference_id = p_job_no
      AND reference_type = 'job_card'
      AND movement_type = 'PRODUCTION_CONSUMPTION';

    IF v_existing_movement_count > 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_consumed', true,
            'message', 'Materials for Job Card ' || p_job_no || ' have already been consumed.'
        );
    END IF;

    -- 2. Double-count guard: order-level bulk issue already done for this order?
    SELECT COUNT(*) INTO v_order_consumed_count
    FROM public.inventory_movements
    WHERE reference_id = p_order_po
      AND reference_type = 'order'
      AND movement_type = 'PRODUCTION_CONSUMPTION';

    IF v_order_consumed_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'ERR_ORDER_MATERIALS_ALREADY_CONSUMED',
            'message', 'Job Card material issue blocked for ' || p_job_no || ': materials for order ' || p_order_po || ' have already been consumed at order level.'
        );
    END IF;

    -- 3. Multi-component lock & sufficiency check in alphabetical order (deadlock-free)
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

    -- 4. All components sufficient -> deduct stock, append ledger rows, partially reconcile reservations
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

        -- This order's ACTIVE reservation for this item (pool shared by its Job Cards)
        SELECT COALESCE(SUM(reserved_qty), 0) INTO v_reservation_qty
        FROM public.order_material_reservations
        WHERE (order_id = p_order_id OR order_po = p_order_po)
          AND item_code = v_item.item_code
          AND status = 'ACTIVE';

        -- Consume from the reservation pool only what it can cover (PARTIAL-aware)
        v_consumed_from_reservation := LEAST(v_reservation_qty, v_item.qty);

        -- Deduct stock; reserved drops only by the consumed-from-reservation amount
        UPDATE public.stock_items
        SET
            on_hand = on_hand - v_item.qty,
            reserved = GREATEST(0, reserved - v_consumed_from_reservation),
            available = (on_hand - v_item.qty) - GREATEST(0, reserved - v_consumed_from_reservation),
            status = CASE
                WHEN ((on_hand - v_item.qty) - GREATEST(0, reserved - v_consumed_from_reservation)) < 0 THEN 'CRITICAL'
                WHEN ((on_hand - v_item.qty) - GREATEST(0, reserved - v_consumed_from_reservation)) < reorder_level THEN 'SHORTAGE'
                ELSE 'OK'
            END,
            updated_at = v_now
        WHERE code = v_item.item_code;

        -- Append append-only ledger movement (Job-Card identity)
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
            metadata,
            created_at
        ) VALUES (
            'mov-' || floor(extract(epoch from v_now) * 1000)::text || '-' || substr(md5(random()::text), 1, 6),
            v_item.item_code,
            'MAIN-WAREHOUSE',
            -v_item.qty,
            'PRODUCTION_CONSUMPTION',
            p_job_no,
            'job_card',
            v_stock.on_hand - v_item.qty,
            p_actor_email,
            'Material issued for Job Card ' || p_job_no || ' (PO ' || p_order_po || ') — ' || COALESCE(v_item.description, v_item.item_code) || ' × ' || v_item.qty,
            jsonb_build_object('orderId', p_order_id, 'orderPo', p_order_po, 'jobNo', p_job_no),
            v_now
        );

        -- PARTIAL reservation reconciliation: decrement pool, keep residual ACTIVE
        UPDATE public.order_material_reservations
        SET
            reserved_qty = GREATEST(0, reserved_qty - v_consumed_from_reservation),
            status = CASE WHEN GREATEST(0, reserved_qty - v_consumed_from_reservation) <= 0 THEN 'CONSUMED' ELSE 'ACTIVE' END,
            updated_at = v_now
        WHERE (order_id = p_order_id OR order_po = p_order_po)
          AND item_code = v_item.item_code
          AND status = 'ACTIVE'
          AND reserved_qty > 0;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'already_consumed', false,
        'message', 'Job Card materials consumed atomically and order reservations partially reconciled.'
    );
END;
$$;

-- 2. Order-level consumption: add Job-Card double-count guard (behaviour otherwise unchanged)
CREATE OR REPLACE FUNCTION public.consume_order_materials_atomic(
    p_order_id TEXT,
    p_order_po TEXT,
    p_actor_email TEXT,
    p_allocations JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_stock RECORD;
    v_existing_movement_count INT;
    v_job_card_consumed_count INT;
    v_order_reserved NUMERIC := 0;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Idempotency Check (unchanged): order-level consumption already posted?
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

    -- 1b. CRITICAL ISSUE #9 guard: Job-Card-level consumption already exists for
    -- this order -> order-level bulk issue would double-count the same demand.
    SELECT COUNT(*) INTO v_job_card_consumed_count
    FROM public.inventory_movements
    WHERE movement_type = 'PRODUCTION_CONSUMPTION'
      AND reference_type = 'job_card'
      AND metadata->>'orderPo' = p_order_po;

    IF v_job_card_consumed_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'ERR_ORDER_MATERIALS_ALREADY_CONSUMED',
            'message', 'Order-level material issue blocked for PO ' || p_order_po || ': materials have already been issued at Job Card level.'
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