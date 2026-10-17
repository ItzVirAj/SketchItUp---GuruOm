-- ============================================================================
-- 005_production_and_quality.sql
-- Bills of materials, route cards, job cards and operations, production logs, QC / PDI inspections and NCRs.
-- Part of the consolidated GuruOm Owner OS schema. Idempotent: safe to re-run.
-- ============================================================================

-- ----- bill_of_materials -----
CREATE TABLE IF NOT EXISTS public.bill_of_materials (
  id text NOT NULL,
  bom_code text NOT NULL,
  parent_part_code text NOT NULL,
  parent_part_name text NOT NULL,
  revision text DEFAULT 'v1.0'::text NOT NULL,
  yield_percentage numeric DEFAULT 98.5 NOT NULL,
  batch_size numeric DEFAULT 100 NOT NULL,
  status text DEFAULT 'ACTIVE'::text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT bill_of_materials_pkey PRIMARY KEY (id),
  CONSTRAINT bill_of_materials_bom_code_key UNIQUE (bom_code),
  CONSTRAINT fk_bom_parent_item FOREIGN KEY (parent_part_code) REFERENCES masters(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT bill_of_materials_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'DRAFT'::text, 'OBSOLETE'::text])))
);
CREATE INDEX IF NOT EXISTS idx_bom_parent_part ON public.bill_of_materials USING btree (parent_part_code);
ALTER TABLE public.bill_of_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access on bill_of_materials" ON public.bill_of_materials;
CREATE POLICY "Open access on bill_of_materials" ON public.bill_of_materials FOR ALL
  USING (true);

-- ----- bom_items -----
CREATE TABLE IF NOT EXISTS public.bom_items (
  id text NOT NULL,
  bom_id text NOT NULL,
  component_code text NOT NULL,
  component_name text NOT NULL,
  component_type text DEFAULT 'RAW_MATERIAL'::text NOT NULL,
  qty_per_unit numeric DEFAULT 1.0 NOT NULL,
  unit text DEFAULT 'NOS'::text NOT NULL,
  scrap_allowance_pct numeric DEFAULT 2.0 NOT NULL,
  stage text DEFAULT 'CNC_MACHINING'::text NOT NULL,
  unit_cost numeric DEFAULT 0 NOT NULL,
  CONSTRAINT bom_items_pkey PRIMARY KEY (id),
  CONSTRAINT bom_items_bom_id_fkey FOREIGN KEY (bom_id) REFERENCES bill_of_materials(id) ON DELETE CASCADE,
  CONSTRAINT fk_bom_item_component FOREIGN KEY (component_code) REFERENCES masters(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT bom_items_component_type_check CHECK ((component_type = ANY (ARRAY['RAW_MATERIAL'::text, 'HARDWARE'::text, 'PACKING'::text, 'SUB_ASSEMBLY'::text])))
);
CREATE INDEX IF NOT EXISTS idx_bom_items_bom_id ON public.bom_items USING btree (bom_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_component_code ON public.bom_items USING btree (component_code);
ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access on bom_items" ON public.bom_items;
CREATE POLICY "Open access on bom_items" ON public.bom_items FOR ALL
  USING (true);

-- ----- route_card_templates -----
CREATE TABLE IF NOT EXISTS public.route_card_templates (
  id character varying(100) NOT NULL,
  part_code character varying(100) NOT NULL,
  part_description text NOT NULL,
  sequence_no integer NOT NULL,
  operation_name character varying(150) NOT NULL,
  work_center character varying(100) NOT NULL,
  standard_time_minutes integer DEFAULT 30 NOT NULL,
  inspection_required boolean DEFAULT false,
  required_certification character varying(100) DEFAULT 'None'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT route_card_templates_pkey PRIMARY KEY (id),
  CONSTRAINT route_card_templates_part_code_sequence_no_key UNIQUE (part_code, sequence_no),
  CONSTRAINT fk_route_card_part_item FOREIGN KEY (part_code) REFERENCES masters(code) ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_route_card_templates_part_code ON public.route_card_templates USING btree (part_code);
ALTER TABLE public.route_card_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access on route_card_templates" ON public.route_card_templates;
CREATE POLICY "Open access on route_card_templates" ON public.route_card_templates FOR ALL
  USING (true);

-- ----- job_cards -----
CREATE TABLE IF NOT EXISTS public.job_cards (
  id text NOT NULL,
  job_no text NOT NULL,
  order_po text NOT NULL,
  part_code text NOT NULL,
  part_description text NOT NULL,
  order_status text DEFAULT 'CONFIRMED'::text NOT NULL,
  qty numeric DEFAULT 0 NOT NULL,
  machine text NOT NULL,
  target_date text NOT NULL,
  status text DEFAULT 'SCHEDULED'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  drawing_revision character varying(50),
  material_issued_lot character varying(100),
  current_operation character varying(150),
  job_status character varying(50) DEFAULT 'NOT_STARTED'::character varying,
  ncr_reference character varying(100),
  supervisor_sign_off character varying(100),
  remarks text,
  order_id character varying(100),
  target_qty numeric(12,2),
  material_qc_status character varying(50) DEFAULT 'ACCEPTED'::character varying,
  current_step_no integer DEFAULT 10,
  has_open_ncr boolean DEFAULT false,
  CONSTRAINT job_cards_pkey PRIMARY KEY (id),
  CONSTRAINT job_cards_job_no_key UNIQUE (job_no)
);
CREATE INDEX IF NOT EXISTS idx_job_cards_created_id_desc ON public.job_cards USING btree (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_job_cards_order_po ON public.job_cards USING btree (order_po);
ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Job cards access" ON public.job_cards;
CREATE POLICY "Job cards access" ON public.job_cards FOR ALL
  USING (true);

-- ----- job_card_operations -----
CREATE TABLE IF NOT EXISTS public.job_card_operations (
  id character varying(100) NOT NULL,
  job_card_id character varying(100) NOT NULL,
  job_no character varying(50) NOT NULL,
  sequence_no integer NOT NULL,
  operation_name character varying(150) NOT NULL,
  machine_id character varying(100),
  operator_name character varying(100),
  required_certification character varying(100) DEFAULT 'None'::character varying,
  is_certification_verified boolean DEFAULT true,
  standard_time_minutes integer DEFAULT 30 NOT NULL,
  actual_start_time timestamp with time zone,
  actual_end_time timestamp with time zone,
  actual_time_minutes integer DEFAULT 0,
  qty_processed numeric(12,2) DEFAULT 0,
  qty_rejected numeric(12,2) DEFAULT 0,
  inspection_required boolean DEFAULT false,
  inspection_passed boolean DEFAULT false,
  op_status character varying(50) DEFAULT 'PENDING'::character varying,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT job_card_operations_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_job_card_operations_card ON public.job_card_operations USING btree (job_card_id);
CREATE INDEX IF NOT EXISTS idx_job_card_operations_job_no ON public.job_card_operations USING btree (job_no);
ALTER TABLE public.job_card_operations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access on job_card_operations" ON public.job_card_operations;
CREATE POLICY "Open access on job_card_operations" ON public.job_card_operations FOR ALL
  USING (true);

-- ----- production_logs -----
CREATE TABLE IF NOT EXISTS public.production_logs (
  id text NOT NULL,
  item_code text NOT NULL,
  description text NOT NULL,
  job_no text NOT NULL,
  step_no integer DEFAULT 1 NOT NULL,
  operation_name text NOT NULL,
  qty_done numeric DEFAULT 0 NOT NULL,
  logged_timestamp text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT production_logs_pkey PRIMARY KEY (id)
);
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Production logs access" ON public.production_logs;
CREATE POLICY "Production logs access" ON public.production_logs FOR ALL
  USING (true);

-- ----- qc_inspections -----
CREATE TABLE IF NOT EXISTS public.qc_inspections (
  id text NOT NULL,
  job_no text NOT NULL,
  order_po text NOT NULL,
  part_code text NOT NULL,
  part_description text NOT NULL,
  qty numeric DEFAULT 0 NOT NULL,
  job_status text NOT NULL,
  qc_status text DEFAULT 'PENDING'::text NOT NULL,
  inspector_notes text,
  defect_category text,
  inspected_at text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT qc_inspections_pkey PRIMARY KEY (id)
);
ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "QC inspections access" ON public.qc_inspections;
CREATE POLICY "QC inspections access" ON public.qc_inspections FOR ALL
  USING (true);

-- ----- pdi_inspections -----
CREATE TABLE IF NOT EXISTS public.pdi_inspections (
  id text NOT NULL,
  job_no text NOT NULL,
  order_po text NOT NULL,
  part_code text NOT NULL,
  part_description text NOT NULL,
  qty numeric DEFAULT 0 NOT NULL,
  pdi_status text DEFAULT 'PENDING'::text NOT NULL,
  certificate_no text,
  report_date text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  pdi_passed_qty numeric(12,2) DEFAULT 0,
  physically_held_qty numeric(12,2) DEFAULT 0,
  dispatched_qty numeric(12,2) DEFAULT 0,
  variance numeric(12,2) DEFAULT 0,
  inspected_by text,
  CONSTRAINT pdi_inspections_pkey PRIMARY KEY (id)
);
ALTER TABLE public.pdi_inspections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "PDI inspections access" ON public.pdi_inspections;
CREATE POLICY "PDI inspections access" ON public.pdi_inspections FOR ALL
  USING (true);

-- ----- ncrs -----
CREATE TABLE IF NOT EXISTS public.ncrs (
  id character varying(100) NOT NULL,
  ncr_number character varying(50) NOT NULL,
  order_id character varying(100),
  order_po character varying(100),
  job_no character varying(100),
  part_code character varying(100),
  part_description text,
  defect_type character varying(100) NOT NULL,
  defect_description text NOT NULL,
  severity character varying(20) DEFAULT 'MAJOR'::character varying,
  status character varying(30) DEFAULT 'OPEN'::character varying,
  raised_by character varying(100) NOT NULL,
  closed_by character varying(100),
  resolution_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ncrs_pkey PRIMARY KEY (id),
  CONSTRAINT ncrs_ncr_number_key UNIQUE (ncr_number)
);
CREATE INDEX IF NOT EXISTS idx_ncrs_job_no ON public.ncrs USING btree (job_no);
CREATE INDEX IF NOT EXISTS idx_ncrs_order_po ON public.ncrs USING btree (order_po);

-- ----- functions -----
CREATE OR REPLACE FUNCTION public.check_bom_deletion_safety()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_active_order_count INT := 0;
    v_active_job_count INT := 0;
    v_order_po TEXT;
    v_job_no TEXT;
BEGIN
    -- 1. Check active customer orders referencing this BOM's parent part code
    -- Terminal order states ('COMPLETED', 'CANCELLED', 'CLOSED') do not block deletion
    IF OLD.status = 'ACTIVE' THEN
        SELECT COUNT(DISTINCT o.id), MIN(o.po_no)
        INTO v_active_order_count, v_order_po
        FROM public.customer_orders o
        JOIN public.order_line_items li ON li.order_id = o.id
        WHERE li.item_code = OLD.parent_part_code
          AND UPPER(o.status) NOT IN ('COMPLETED', 'CANCELLED', 'CLOSED');

        IF v_active_order_count > 0 THEN
            RAISE EXCEPTION 'BOM_IN_USE: Cannot delete BOM % because % active customer order(s) (e.g. %) currently depend on it.',
                OLD.bom_code, v_active_order_count, v_order_po
                USING ERRCODE = '23503';
        END IF;
    END IF;

    -- 2. Check active job cards referencing this BOM's parent part code / revision
    -- Terminal job states ('COMPLETED', 'CANCELLED', 'CLOSED') do not block deletion
    SELECT COUNT(*), MIN(jc.job_no)
    INTO v_active_job_count, v_job_no
    FROM public.job_cards jc
    WHERE jc.part_code = OLD.parent_part_code
      AND UPPER(COALESCE(jc.job_status, 'NOT_STARTED')) NOT IN ('COMPLETED', 'CANCELLED', 'CLOSED')
      AND (OLD.status = 'ACTIVE' OR jc.drawing_revision = OLD.revision);

    IF v_active_job_count > 0 THEN
        RAISE EXCEPTION 'BOM_IN_USE: Cannot delete BOM % because % active job card(s) (e.g. %) currently depend on it.',
            OLD.bom_code, v_active_job_count, v_job_no
            USING ERRCODE = '23503';
    END IF;

    RETURN OLD;
END;
$function$;

-- ----- triggers -----
DROP TRIGGER IF EXISTS trg_prevent_in_use_bom_deletion ON public.bill_of_materials;
CREATE TRIGGER trg_prevent_in_use_bom_deletion BEFORE DELETE ON public.bill_of_materials FOR EACH ROW EXECUTE FUNCTION check_bom_deletion_safety();
