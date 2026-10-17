-- ============================================================================
-- 004_inventory_and_procurement.sql
-- Stock, append-only inventory ledger, reservations, requisitions, purchase orders, GRN, vendor returns, 3-way match, scorecards and subcontracting.
-- Part of the consolidated GuruOm Owner OS schema. Idempotent: safe to re-run.
-- ============================================================================

-- ----- stock_items -----
CREATE TABLE IF NOT EXISTS public.stock_items (
  id text NOT NULL,
  code text NOT NULL,
  description text NOT NULL,
  on_hand numeric DEFAULT 0 NOT NULL,
  reserved numeric DEFAULT 0 NOT NULL,
  available numeric DEFAULT 0 NOT NULL,
  demand numeric DEFAULT 0 NOT NULL,
  reorder_level numeric DEFAULT 0 NOT NULL,
  shortage numeric DEFAULT 0 NOT NULL,
  unit text DEFAULT 'NOS'::text NOT NULL,
  status text DEFAULT 'OK'::text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT stock_items_pkey PRIMARY KEY (id),
  CONSTRAINT stock_items_code_key UNIQUE (code),
  CONSTRAINT chk_stock_items_on_hand_non_negative CHECK ((on_hand >= (0)::numeric)),
  CONSTRAINT chk_stock_items_reserved_non_negative CHECK ((reserved >= (0)::numeric))
);
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stock items access" ON public.stock_items;
CREATE POLICY "Stock items access" ON public.stock_items FOR ALL
  USING (true);

-- ----- shortage_items -----
CREATE TABLE IF NOT EXISTS public.shortage_items (
  id text NOT NULL,
  code text NOT NULL,
  description text NOT NULL,
  required_qty numeric DEFAULT 0 NOT NULL,
  available_qty numeric DEFAULT 0 NOT NULL,
  deficit numeric DEFAULT 0 NOT NULL,
  unit text DEFAULT 'NOS'::text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT shortage_items_pkey PRIMARY KEY (id)
);
ALTER TABLE public.shortage_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shortage items access" ON public.shortage_items;
CREATE POLICY "Shortage items access" ON public.shortage_items FOR ALL
  USING (true);

-- ----- inventory_movements -----
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  item_code text NOT NULL,
  location text DEFAULT 'MAIN-WAREHOUSE'::text NOT NULL,
  quantity_change numeric NOT NULL,
  movement_type text NOT NULL,
  reference_id text,
  reference_type text DEFAULT 'manual'::text,
  balance_after numeric NOT NULL,
  actor_id uuid,
  actor_email text NOT NULL,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_movements_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_movements_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_actor ON public.inventory_movements USING btree (actor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON public.inventory_movements USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON public.inventory_movements USING btree (item_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_ref ON public.inventory_movements USING btree (reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON public.inventory_movements USING btree (movement_type);
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated reads on inventory_movements" ON public.inventory_movements;
CREATE POLICY "Allow authenticated reads on inventory_movements" ON public.inventory_movements FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Allow backend inserts on inventory_movements" ON public.inventory_movements;
CREATE POLICY "Allow backend inserts on inventory_movements" ON public.inventory_movements FOR INSERT
  WITH CHECK (true);

-- ----- order_material_reservations -----
CREATE TABLE IF NOT EXISTS public.order_material_reservations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id text NOT NULL,
  order_po text NOT NULL,
  item_code text NOT NULL,
  reserved_qty numeric(12,4) NOT NULL,
  status text DEFAULT 'ACTIVE'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT order_material_reservations_pkey PRIMARY KEY (id),
  CONSTRAINT order_material_reservations_reserved_qty_check CHECK ((reserved_qty >= (0)::numeric)),
  CONSTRAINT order_material_reservations_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'CONSUMED'::text, 'RELEASED'::text])))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_order_item_reservation ON public.order_material_reservations USING btree (order_id, item_code) WHERE (status = 'ACTIVE'::text);
CREATE INDEX IF NOT EXISTS idx_order_res_item ON public.order_material_reservations USING btree (item_code, status);
CREATE INDEX IF NOT EXISTS idx_order_res_order ON public.order_material_reservations USING btree (order_id, status);
ALTER TABLE public.order_material_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Order material reservations service access" ON public.order_material_reservations;
CREATE POLICY "Order material reservations service access" ON public.order_material_reservations FOR ALL
  USING (true);

-- ----- purchase_requisitions -----
CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
  id character varying(100) NOT NULL,
  req_number character varying(50) NOT NULL,
  order_id character varying(100),
  order_po character varying(100),
  item_code character varying(100) NOT NULL,
  item_description text NOT NULL,
  required_qty numeric(12,2) NOT NULL,
  available_stock numeric(12,2) NOT NULL,
  deficit_qty numeric(12,2) NOT NULL,
  unit character varying(20) DEFAULT 'KG'::character varying,
  status character varying(30) DEFAULT 'AUTO_GENERATED'::character varying,
  po_number character varying(50),
  created_by character varying(100) DEFAULT 'System Material Auto-Checker'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  source character varying(50) DEFAULT 'LOW_STOCK_ALERT'::character varying,
  urgency character varying(20) DEFAULT 'NORMAL'::character varying,
  approved_by character varying(100),
  approved_at timestamp with time zone,
  rejection_reason text,
  CONSTRAINT purchase_requisitions_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_requisitions_req_number_key UNIQUE (req_number),
  CONSTRAINT purchase_requisitions_order_id_fkey FOREIGN KEY (order_id) REFERENCES customer_orders(id) ON DELETE SET NULL
);

-- ----- purchase_orders -----
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id text NOT NULL,
  po_no text NOT NULL,
  supplier_code text NOT NULL,
  supplier_name text NOT NULL,
  order_date text NOT NULL,
  expected_delivery_date text NOT NULL,
  payment_terms text DEFAULT 'Net 30'::text NOT NULL,
  tax_rate numeric DEFAULT 18.0 NOT NULL,
  gross_amount numeric DEFAULT 0 NOT NULL,
  tax_amount numeric DEFAULT 0 NOT NULL,
  total_amount numeric DEFAULT 0 NOT NULL,
  status text DEFAULT 'DRAFT'::text NOT NULL,
  approval_status text DEFAULT 'PENDING'::text NOT NULL,
  approved_by text,
  approved_at timestamp with time zone,
  rejection_reason text,
  created_by text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT purchase_orders_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_orders_po_no_key UNIQUE (po_no),
  CONSTRAINT purchase_orders_approval_status_check CHECK ((approval_status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text]))),
  CONSTRAINT purchase_orders_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'PENDING_APPROVAL'::text, 'APPROVED'::text, 'REJECTED'::text, 'ISSUED'::text, 'PARTIALLY_RECEIVED'::text, 'RECEIVED'::text, 'CANCELLED'::text])))
);
CREATE INDEX IF NOT EXISTS idx_po_supplier_code ON public.purchase_orders USING btree (supplier_code);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access on purchase_orders" ON public.purchase_orders;
CREATE POLICY "Open access on purchase_orders" ON public.purchase_orders FOR ALL
  USING (true);

-- ----- purchase_order_items -----
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id text NOT NULL,
  purchase_order_id text NOT NULL,
  item_code text NOT NULL,
  item_description text NOT NULL,
  order_qty numeric DEFAULT 0 NOT NULL,
  received_qty numeric DEFAULT 0 NOT NULL,
  unit text DEFAULT 'NOS'::text NOT NULL,
  unit_price numeric DEFAULT 0 NOT NULL,
  line_total numeric DEFAULT 0 NOT NULL,
  CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON public.purchase_order_items USING btree (purchase_order_id);
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access on purchase_order_items" ON public.purchase_order_items;
CREATE POLICY "Open access on purchase_order_items" ON public.purchase_order_items FOR ALL
  USING (true);

-- ----- goods_receipt_notes -----
CREATE TABLE IF NOT EXISTS public.goods_receipt_notes (
  id text NOT NULL,
  grn_no text NOT NULL,
  po_no text NOT NULL,
  vendor_code text NOT NULL,
  vendor_name text NOT NULL,
  challan_no text NOT NULL,
  challan_date text,
  received_date text NOT NULL,
  received_by text NOT NULL,
  status text DEFAULT 'RECEIVED'::text NOT NULL,
  vehicle_no text,
  remarks text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  supplier_name character varying(200),
  item_code character varying(100),
  item_description text,
  po_expected_qty numeric(12,2),
  received_qty numeric(12,2),
  accepted_qty numeric(12,2) DEFAULT 0,
  rejected_qty numeric(12,2) DEFAULT 0,
  unit character varying(20) DEFAULT 'KG'::character varying,
  unit_price numeric(12,2) DEFAULT 0,
  is_qty_mismatched boolean DEFAULT false,
  mismatch_notes text,
  heat_lot_number character varying(100),
  delivery_challan_no character varying(100),
  carrier character varying(100),
  inspection_status character varying(30) DEFAULT 'PENDING_INSPECTION'::character varying,
  inspection_notes text,
  store_keeper_name character varying(100),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT goods_receipt_notes_pkey PRIMARY KEY (id),
  CONSTRAINT goods_receipt_notes_grn_no_key UNIQUE (grn_no),
  CONSTRAINT goods_receipt_notes_status_check CHECK ((status = ANY (ARRAY['PENDING_INSPECTION'::text, 'RECEIVED'::text, 'QC_VERIFIED'::text, 'REJECTED'::text])))
);
CREATE INDEX IF NOT EXISTS idx_grn_po_no ON public.goods_receipt_notes USING btree (po_no);
ALTER TABLE public.goods_receipt_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access on goods_receipt_notes" ON public.goods_receipt_notes;
CREATE POLICY "Open access on goods_receipt_notes" ON public.goods_receipt_notes FOR ALL
  USING (true);

-- ----- grn_items -----
CREATE TABLE IF NOT EXISTS public.grn_items (
  id text NOT NULL,
  grn_id text NOT NULL,
  item_code text NOT NULL,
  item_description text NOT NULL,
  ordered_qty numeric DEFAULT 0 NOT NULL,
  received_qty numeric DEFAULT 0 NOT NULL,
  accepted_qty numeric DEFAULT 0 NOT NULL,
  rejected_qty numeric DEFAULT 0 NOT NULL,
  unit text DEFAULT 'NOS'::text NOT NULL,
  unit_rate numeric DEFAULT 0 NOT NULL,
  rejection_reason text,
  CONSTRAINT grn_items_pkey PRIMARY KEY (id),
  CONSTRAINT grn_items_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES goods_receipt_notes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn_id ON public.grn_items USING btree (grn_id);
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access on grn_items" ON public.grn_items;
CREATE POLICY "Open access on grn_items" ON public.grn_items FOR ALL
  USING (true);

-- ----- vendor_returns -----
CREATE TABLE IF NOT EXISTS public.vendor_returns (
  id character varying(100) NOT NULL,
  return_no character varying(50) NOT NULL,
  grn_no character varying(50) NOT NULL,
  po_no character varying(50) NOT NULL,
  supplier_name character varying(200) NOT NULL,
  item_code character varying(100) NOT NULL,
  item_description text NOT NULL,
  rejected_qty numeric(12,2) NOT NULL,
  defect_category character varying(100) NOT NULL,
  defect_notes text NOT NULL,
  status character varying(30) DEFAULT 'INITIATED'::character varying,
  initiated_by character varying(100) NOT NULL,
  approved_by character varying(100),
  approved_at timestamp with time zone,
  debit_note_number character varying(50),
  debit_amount numeric(12,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vendor_returns_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_returns_return_no_key UNIQUE (return_no)
);

-- ----- vendor_bill_three_way_matches -----
CREATE TABLE IF NOT EXISTS public.vendor_bill_three_way_matches (
  id character varying(100) NOT NULL,
  bill_no character varying(50) NOT NULL,
  po_no character varying(50) NOT NULL,
  grn_no character varying(50) NOT NULL,
  supplier_name character varying(200) NOT NULL,
  po_unit_price numeric(12,2) NOT NULL,
  bill_unit_price numeric(12,2) NOT NULL,
  grn_accepted_qty numeric(12,2) NOT NULL,
  bill_invoiced_qty numeric(12,2) NOT NULL,
  po_total_expected numeric(12,2) NOT NULL,
  bill_total_invoiced numeric(12,2) NOT NULL,
  match_status character varying(40) DEFAULT 'MATCHED'::character varying,
  is_flagged_for_review boolean DEFAULT false,
  variance_details text,
  matched_by character varying(100) NOT NULL,
  matched_at timestamp with time zone DEFAULT now(),
  disbursement_status character varying(30) DEFAULT 'PENDING'::character varying,
  disbursed_amount numeric(12,2) DEFAULT 0,
  disbursed_by character varying(100),
  disbursed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vendor_bill_three_way_matches_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_bill_three_way_matches_bill_no_key UNIQUE (bill_no)
);

-- ----- vendor_scorecards -----
CREATE TABLE IF NOT EXISTS public.vendor_scorecards (
  id character varying(100) NOT NULL,
  supplier_code character varying(100) NOT NULL,
  supplier_name character varying(200) NOT NULL,
  evaluation_period character varying(50) NOT NULL,
  total_po_orders integer DEFAULT 0,
  total_deliveries integer DEFAULT 0,
  on_time_deliveries integer DEFAULT 0,
  otd_percentage numeric(5,2) DEFAULT 0.0,
  total_received_qty numeric(12,2) DEFAULT 0.0,
  accepted_qty numeric(12,2) DEFAULT 0.0,
  rejected_qty numeric(12,2) DEFAULT 0.0,
  quality_acceptance_percentage numeric(5,2) DEFAULT 0.0,
  overall_score numeric(5,2) DEFAULT 0.0,
  vendor_rating_tier character varying(30) DEFAULT 'TIER_1_EXCELLENT'::character varying,
  evaluated_by character varying(100) NOT NULL,
  evaluated_at timestamp with time zone DEFAULT now(),
  notes text,
  CONSTRAINT vendor_scorecards_pkey PRIMARY KEY (id)
);

-- ----- subcontract_orders -----
CREATE TABLE IF NOT EXISTS public.subcontract_orders (
  id character varying(100) NOT NULL,
  gate_pass_no character varying(50) NOT NULL,
  job_no character varying(100) NOT NULL,
  item_code character varying(100) NOT NULL,
  item_description text NOT NULL,
  subcontractor_name character varying(200) NOT NULL,
  process_type character varying(100) NOT NULL,
  dispatched_qty numeric(12,2) NOT NULL,
  unit character varying(20) DEFAULT 'NOS'::character varying,
  dispatch_date date DEFAULT CURRENT_DATE NOT NULL,
  expected_return_date date NOT NULL,
  actual_return_date date,
  gate_in_pass_no character varying(50),
  received_qty numeric(12,2) DEFAULT 0,
  rejected_qty numeric(12,2) DEFAULT 0,
  qc_status character varying(30) DEFAULT 'PENDING_GATE_IN'::character varying,
  status character varying(30) DEFAULT 'OUT_FOR_JOBWORK'::character varying,
  is_overdue boolean DEFAULT false,
  overdue_days integer DEFAULT 0,
  vehicle_details character varying(100),
  transporter character varying(100),
  unit_rate numeric(12,2) DEFAULT 0,
  total_process_cost numeric(12,2) DEFAULT 0,
  dispatched_by character varying(100) NOT NULL,
  received_by character varying(100),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subcontract_orders_pkey PRIMARY KEY (id),
  CONSTRAINT subcontract_orders_gate_pass_no_key UNIQUE (gate_pass_no)
);

-- ----- outwork_sendouts -----
CREATE TABLE IF NOT EXISTS public.outwork_sendouts (
  id text NOT NULL,
  send_out_id text NOT NULL,
  vendor_name text NOT NULL,
  process text NOT NULL,
  sent_qty numeric DEFAULT 0 NOT NULL,
  received_qty numeric DEFAULT 0 NOT NULL,
  rejected_qty numeric DEFAULT 0 NOT NULL,
  expected_date text NOT NULL,
  status text DEFAULT 'SENT'::text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT outwork_sendouts_pkey PRIMARY KEY (id)
);
ALTER TABLE public.outwork_sendouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Outwork sendouts access" ON public.outwork_sendouts;
CREATE POLICY "Outwork sendouts access" ON public.outwork_sendouts FOR ALL
  USING (true);

-- ----- functions -----
CREATE OR REPLACE FUNCTION public.prevent_inventory_movement_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'inventory_movements is append-only: % not allowed', TG_OP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_order_materials_atomic(p_order_id text, p_order_po text, p_actor_email text, p_allocations jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
            gen_random_uuid(),
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
$function$;

CREATE OR REPLACE FUNCTION public.consume_job_card_materials_atomic(p_order_id text, p_order_po text, p_job_no text, p_actor_email text, p_allocations jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
            gen_random_uuid(),
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
$function$;

-- ----- triggers -----
DROP TRIGGER IF EXISTS no_delete_inventory_movements ON public.inventory_movements;
CREATE TRIGGER no_delete_inventory_movements BEFORE DELETE ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION prevent_inventory_movement_mutation();

DROP TRIGGER IF EXISTS no_update_inventory_movements ON public.inventory_movements;
CREATE TRIGGER no_update_inventory_movements BEFORE UPDATE ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION prevent_inventory_movement_mutation();

-- ----- views -----
CREATE OR REPLACE VIEW public.stock_levels_view WITH (security_invoker = true) AS
 SELECT item_code,
    location,
    sum(quantity_change) AS current_on_hand,
    count(*) AS total_movements,
    max(created_at) AS last_movement_at
   FROM inventory_movements
  GROUP BY item_code, location;
