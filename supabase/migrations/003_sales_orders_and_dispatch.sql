-- ============================================================================
-- 003_sales_orders_and_dispatch.sql
-- Customer orders, order lines, finished goods, dispatch challans and owner approvals.
-- Part of the consolidated GuruOm Owner OS schema. Idempotent: safe to re-run.
-- ============================================================================

-- ----- customer_orders -----
CREATE TABLE IF NOT EXISTS public.customer_orders (
  id text NOT NULL,
  po_no text NOT NULL,
  customer_name text NOT NULL,
  po_date text NOT NULL,
  delivery_date text NOT NULL,
  status text DEFAULT 'CONFIRMED'::text NOT NULL,
  progress_step integer DEFAULT 0 NOT NULL,
  gross_amount numeric DEFAULT 0 NOT NULL,
  tax_category text DEFAULT 'GST 18%'::text,
  remark text,
  client_po_file text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  sub_type character varying(30) DEFAULT 'FRESH_PO'::character varying,
  blanket_po_id character varying(100),
  blanket_po_total_qty numeric(12,2),
  blanket_po_balance_qty numeric(12,2),
  drawing_revision character varying(50) DEFAULT 'REV-A'::character varying,
  master_drawing_revision character varying(50) DEFAULT 'REV-A'::character varying,
  heat_lot_number character varying(100),
  has_open_ncr boolean DEFAULT false,
  is_credit_held boolean DEFAULT false,
  credit_override_by character varying(100),
  credit_override_reason text,
  purchase_requisition_no character varying(100),
  price_amendment_status character varying(30),
  price_amendment_approved_by character varying(100),
  amendment_reason text,
  invoiced_qty_total numeric(12,2) DEFAULT 0,
  dispatched_qty_total numeric(12,2) DEFAULT 0,
  invoice_override_reason text,
  delayed_reason text,
  delayed_follow_up_date text,
  stage text,
  paid_amount numeric(14,2) DEFAULT 0,
  payment_status text,
  payment_history jsonb DEFAULT '[]'::jsonb,
  delivery_challan_no text,
  invoice_no text,
  pod_document_url text,
  pod_received_date text,
  pod_received_by text,
  closed_at timestamp with time zone,
  closed_by text,
  transporter_name text,
  dispatched_at text,
  CONSTRAINT customer_orders_pkey PRIMARY KEY (id)
);
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Orders access" ON public.customer_orders;
CREATE POLICY "Orders access" ON public.customer_orders FOR ALL
  USING (true);

-- ----- order_line_items -----
CREATE TABLE IF NOT EXISTS public.order_line_items (
  id text NOT NULL,
  order_id text NOT NULL,
  item_code text NOT NULL,
  item_description text NOT NULL,
  cust_part_no text,
  order_qty numeric DEFAULT 0 NOT NULL,
  unit text DEFAULT 'NOS'::text NOT NULL,
  dispatched_qty numeric DEFAULT 0 NOT NULL,
  pending_qty numeric DEFAULT 0 NOT NULL,
  rate numeric DEFAULT 0 NOT NULL,
  drawing_revision character varying(50),
  CONSTRAINT order_line_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_line_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES customer_orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_order_line_items_order_id ON public.order_line_items USING btree (order_id);
ALTER TABLE public.order_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Order line items access" ON public.order_line_items;
CREATE POLICY "Order line items access" ON public.order_line_items FOR ALL
  USING (true);

-- ----- finished_goods -----
CREATE TABLE IF NOT EXISTS public.finished_goods (
  id text NOT NULL,
  order_po text NOT NULL,
  part_code text NOT NULL,
  part_description text NOT NULL,
  pdi_passed_qty numeric DEFAULT 0 NOT NULL,
  physically_held_qty numeric DEFAULT 0 NOT NULL,
  dispatched_qty numeric DEFAULT 0 NOT NULL,
  variance numeric DEFAULT 0 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT finished_goods_pkey PRIMARY KEY (id)
);
ALTER TABLE public.finished_goods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Finished goods access" ON public.finished_goods;
CREATE POLICY "Finished goods access" ON public.finished_goods FOR ALL
  USING (true);

-- ----- dispatch_challans -----
CREATE TABLE IF NOT EXISTS public.dispatch_challans (
  id text NOT NULL,
  challan_no text NOT NULL,
  order_po text NOT NULL,
  status text DEFAULT 'GENERATED'::text NOT NULL,
  date text NOT NULL,
  transporter text NOT NULL,
  vehicle_no text NOT NULL,
  lines_count integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT dispatch_challans_pkey PRIMARY KEY (id),
  CONSTRAINT dispatch_challans_challan_no_key UNIQUE (challan_no)
);
CREATE INDEX IF NOT EXISTS idx_dispatch_challans_order_po ON public.dispatch_challans USING btree (order_po);
ALTER TABLE public.dispatch_challans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dispatch challans access" ON public.dispatch_challans;
CREATE POLICY "Dispatch challans access" ON public.dispatch_challans FOR ALL
  USING (true);

-- ----- pending_approvals -----
CREATE TABLE IF NOT EXISTS public.pending_approvals (
  id text NOT NULL,
  title text NOT NULL,
  type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  amount numeric DEFAULT 0,
  threshold_limit numeric DEFAULT 0,
  requested_by text NOT NULL,
  requested_by_role text NOT NULL,
  target_approver_role text DEFAULT 'Owner'::text,
  status text DEFAULT 'PENDING_OWNER_APPROVAL'::text NOT NULL,
  details text,
  escalation_reason text,
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by text,
  resolution_notes text,
  timestamp text,
  CONSTRAINT pending_approvals_pkey PRIMARY KEY (id),
  CONSTRAINT pending_approvals_status_check CHECK ((status = ANY (ARRAY['PENDING_OWNER_APPROVAL'::text, 'APPROVED'::text, 'REJECTED'::text, 'CANCELLED'::text])))
);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_entity ON public.pending_approvals USING btree (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_status ON public.pending_approvals USING btree (status);
ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pending_approvals_all_policy" ON public.pending_approvals;
CREATE POLICY "pending_approvals_all_policy" ON public.pending_approvals FOR ALL TO anon, authenticated
  USING (true);

-- ----- functions -----
CREATE OR REPLACE FUNCTION public.create_order_with_lines(order_payload jsonb, lines_payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  line record;
BEGIN
  -- Insert the order header
  INSERT INTO public.customer_orders (
    id, po_no, customer_name, po_date, delivery_date, 
    status, stage, progress_step, gross_amount, tax_category, remark
  )
  VALUES (
    order_payload->>'id',
    order_payload->>'po_no',
    order_payload->>'customer_name',
    order_payload->>'po_date',
    order_payload->>'delivery_date',
    order_payload->>'status',
    order_payload->>'stage',
    (order_payload->>'progress_step')::int,
    (order_payload->>'gross_amount')::numeric,
    order_payload->>'tax_category',
    order_payload->>'remark'
  );

  -- Insert the line items
  IF lines_payload IS NOT NULL AND jsonb_typeof(lines_payload) = 'array' THEN
    FOR line IN SELECT * FROM jsonb_array_elements(lines_payload)
    LOOP
      INSERT INTO public.order_line_items (
        id, order_id, item_code, item_description, cust_part_no,
        order_qty, unit, rate, dispatched_qty, pending_qty
      )
      VALUES (
        line.value->>'id',
        line.value->>'order_id',
        line.value->>'item_code',
        line.value->>'item_description',
        line.value->>'cust_part_no',
        (line.value->>'order_qty')::numeric,
        line.value->>'unit',
        (line.value->>'rate')::numeric,
        (line.value->>'dispatched_qty')::numeric,
        (line.value->>'pending_qty')::numeric
      );
    END LOOP;
  END IF;
END;
$function$;
