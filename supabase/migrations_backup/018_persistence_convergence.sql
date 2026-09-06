-- Owner OS: persistence convergence (generated from migrations 001-017)
-- Creates missing operational tables and adds absent columns to existing ones,
-- so backend writes persist across server restarts instead of falling back to memory.
-- Run once in the Supabase SQL Editor.

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'OPERATOR',
  department TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  last_login TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'OPERATOR';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- company_profile
CREATE TABLE IF NOT EXISTS public.company_profile (
  id TEXT PRIMARY KEY DEFAULT 'main',
  legal_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  gstin TEXT NOT NULL,
  pan TEXT NOT NULL,
  state TEXT NOT NULL,
  state_code TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS id TEXT DEFAULT 'main';
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS state_code TEXT;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- masters
CREATE TABLE IF NOT EXISTS public.masters (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL UNIQUE, -- RM-#### / FG-#### / SF-#### / CO-#### / BO-#### / ITM-####
    name TEXT NOT NULL, -- Item Name*
    item_type TEXT NOT NULL DEFAULT 'Raw Material'
        CHECK (item_type IN ('Raw Material', 'Semi-Finished', 'Finished Good', 'Consumable', 'Bought-Out', 'Other')),
    category TEXT,
    description TEXT,
    part_no TEXT,
    uom TEXT NOT NULL DEFAULT 'Nos'
        CHECK (uom IN ('Nos', 'Kg', 'Meter', 'Litre', 'Set', 'Box')),
    hsn_code TEXT NOT NULL, -- 4 to 8 digit HSN code
    gst_rate NUMERIC NOT NULL DEFAULT 18
        CHECK (gst_rate IN (0, 5, 12, 18, 28)),
    standard_cost NUMERIC DEFAULT 0, -- Required for RM/Consumable/Bought-Out
    selling_price NUMERIC DEFAULT 0, -- Required for Finished Goods
    min_stock NUMERIC DEFAULT 0,
    max_stock NUMERIC DEFAULT 0,
    reorder_level NUMERIC NOT NULL DEFAULT 10,
    lead_time_days NUMERIC DEFAULT 0,
    preferred_vendor TEXT,
    default_warehouse TEXT DEFAULT 'Main Raw Material Store',
    store_location TEXT DEFAULT 'A1-RACK-1',
    is_finished_goods BOOLEAN DEFAULT false,
    sale_rate NUMERIC DEFAULT 0,
    purchase_rate NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Active'
        CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS part_no TEXT;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'NOS';
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS hsn_code TEXT;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS reorder_level NUMERIC DEFAULT 10;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS store_location TEXT;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS is_finished_goods BOOLEAN DEFAULT true;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS sale_rate NUMERIC DEFAULT 0;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS purchase_rate NUMERIC DEFAULT 0;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS id TEXT DEFAULT gen_random_uuid()::text;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS uom TEXT DEFAULT 'Nos' CHECK (uom IN ('Nos', 'Kg', 'Meter', 'Litre', 'Set', 'Box'));
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS standard_cost NUMERIC DEFAULT 0;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS max_stock NUMERIC DEFAULT 0;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS lead_time_days NUMERIC DEFAULT 0;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS preferred_vendor TEXT;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS default_warehouse TEXT DEFAULT 'Main Raw Material Store';
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS store_location TEXT DEFAULT 'A1-RACK-1';
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS is_finished_goods BOOLEAN DEFAULT false;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive'));

-- customer_orders
CREATE TABLE IF NOT EXISTS public.customer_orders (
  id TEXT PRIMARY KEY,
  po_no TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  po_date TEXT NOT NULL,
  delivery_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  progress_step INTEGER NOT NULL DEFAULT 0,
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  tax_category TEXT DEFAULT 'GST 18%',
  remark TEXT,
  client_po_file TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS po_no TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS po_date TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS delivery_date TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'CONFIRMED';
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS progress_step INTEGER DEFAULT 0;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS gross_amount NUMERIC DEFAULT 0;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS tax_category TEXT DEFAULT 'GST 18%';
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS client_po_file TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS sub_type VARCHAR(30) DEFAULT 'FRESH_PO';
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS delayed_reason TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS delayed_follow_up_date TEXT;

-- order_line_items
CREATE TABLE IF NOT EXISTS public.order_line_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.customer_orders(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_description TEXT NOT NULL,
  cust_part_no TEXT,
  order_qty NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'NOS',
  dispatched_qty NUMERIC NOT NULL DEFAULT 0,
  pending_qty NUMERIC NOT NULL DEFAULT 0,
  rate NUMERIC NOT NULL DEFAULT 0
);
ALTER TABLE public.order_line_items ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.order_line_items ADD COLUMN IF NOT EXISTS order_id TEXT REFERENCES public.customer_orders(id) ON DELETE CASCADE;
ALTER TABLE public.order_line_items ADD COLUMN IF NOT EXISTS item_code TEXT;
ALTER TABLE public.order_line_items ADD COLUMN IF NOT EXISTS item_description TEXT;
ALTER TABLE public.order_line_items ADD COLUMN IF NOT EXISTS cust_part_no TEXT;
ALTER TABLE public.order_line_items ADD COLUMN IF NOT EXISTS order_qty NUMERIC DEFAULT 0;
ALTER TABLE public.order_line_items ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'NOS';
ALTER TABLE public.order_line_items ADD COLUMN IF NOT EXISTS dispatched_qty NUMERIC DEFAULT 0;
ALTER TABLE public.order_line_items ADD COLUMN IF NOT EXISTS pending_qty NUMERIC DEFAULT 0;
ALTER TABLE public.order_line_items ADD COLUMN IF NOT EXISTS rate NUMERIC DEFAULT 0;

-- stock_items
CREATE TABLE IF NOT EXISTS public.stock_items (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  on_hand NUMERIC NOT NULL DEFAULT 0,
  reserved NUMERIC NOT NULL DEFAULT 0,
  available NUMERIC NOT NULL DEFAULT 0,
  demand NUMERIC NOT NULL DEFAULT 0,
  reorder_level NUMERIC NOT NULL DEFAULT 0,
  shortage NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'NOS',
  status TEXT NOT NULL DEFAULT 'OK',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS on_hand NUMERIC DEFAULT 0;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS reserved NUMERIC DEFAULT 0;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS available NUMERIC DEFAULT 0;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS demand NUMERIC DEFAULT 0;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS reorder_level NUMERIC DEFAULT 0;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS shortage NUMERIC DEFAULT 0;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'NOS';
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'OK';
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- shortage_items
CREATE TABLE IF NOT EXISTS public.shortage_items (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  required_qty NUMERIC NOT NULL DEFAULT 0,
  available_qty NUMERIC NOT NULL DEFAULT 0,
  deficit NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'NOS',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.shortage_items ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.shortage_items ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.shortage_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.shortage_items ADD COLUMN IF NOT EXISTS required_qty NUMERIC DEFAULT 0;
ALTER TABLE public.shortage_items ADD COLUMN IF NOT EXISTS available_qty NUMERIC DEFAULT 0;
ALTER TABLE public.shortage_items ADD COLUMN IF NOT EXISTS deficit NUMERIC DEFAULT 0;
ALTER TABLE public.shortage_items ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'NOS';
ALTER TABLE public.shortage_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- job_cards
CREATE TABLE IF NOT EXISTS public.job_cards (
    id VARCHAR(100) PRIMARY KEY,
    job_no VARCHAR(50) NOT NULL UNIQUE,
    order_id VARCHAR(100),
    order_po VARCHAR(100) NOT NULL,
    part_code VARCHAR(100) NOT NULL,
    part_description TEXT NOT NULL,
    drawing_revision VARCHAR(50) NOT NULL,
    target_qty NUMERIC(12, 2) NOT NULL,
    material_issued_lot VARCHAR(100) NOT NULL,
    material_qc_status VARCHAR(50) DEFAULT 'ACCEPTED',
    current_step_no INT DEFAULT 10,
    current_operation VARCHAR(150),
    job_status VARCHAR(50) DEFAULT 'NOT_STARTED',
    has_open_ncr BOOLEAN DEFAULT FALSE,
    ncr_reference VARCHAR(100),
    supervisor_sign_off VARCHAR(100),
    remarks TEXT,
    target_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS job_no TEXT;
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS order_po TEXT;
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS part_code TEXT;
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS part_description TEXT;
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS order_status TEXT DEFAULT 'CONFIRMED';
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS qty NUMERIC DEFAULT 0;
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS machine TEXT;
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS target_date TEXT;
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'SCHEDULED';
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS id VARCHAR(100);
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS job_no VARCHAR(50);
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS order_po VARCHAR(100);
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS part_code VARCHAR(100);
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS drawing_revision VARCHAR(50);
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS material_issued_lot VARCHAR(100);
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS current_operation VARCHAR(150);
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS job_status VARCHAR(50) DEFAULT 'NOT_STARTED';
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS ncr_reference VARCHAR(100);
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS supervisor_sign_off VARCHAR(100);
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS target_date DATE;
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS order_id VARCHAR(100);
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS target_qty NUMERIC(12, 2);
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS material_qc_status VARCHAR(50) DEFAULT 'ACCEPTED';
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS current_step_no INT DEFAULT 10;
ALTER TABLE public.job_cards ADD COLUMN IF NOT EXISTS has_open_ncr BOOLEAN DEFAULT FALSE;

-- finished_goods
CREATE TABLE IF NOT EXISTS public.finished_goods (
  id TEXT PRIMARY KEY,
  order_po TEXT NOT NULL,
  part_code TEXT NOT NULL,
  part_description TEXT NOT NULL,
  pdi_passed_qty NUMERIC NOT NULL DEFAULT 0,
  physically_held_qty NUMERIC NOT NULL DEFAULT 0,
  dispatched_qty NUMERIC NOT NULL DEFAULT 0,
  variance NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.finished_goods ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.finished_goods ADD COLUMN IF NOT EXISTS order_po TEXT;
ALTER TABLE public.finished_goods ADD COLUMN IF NOT EXISTS part_code TEXT;
ALTER TABLE public.finished_goods ADD COLUMN IF NOT EXISTS part_description TEXT;
ALTER TABLE public.finished_goods ADD COLUMN IF NOT EXISTS pdi_passed_qty NUMERIC DEFAULT 0;
ALTER TABLE public.finished_goods ADD COLUMN IF NOT EXISTS physically_held_qty NUMERIC DEFAULT 0;
ALTER TABLE public.finished_goods ADD COLUMN IF NOT EXISTS dispatched_qty NUMERIC DEFAULT 0;
ALTER TABLE public.finished_goods ADD COLUMN IF NOT EXISTS variance NUMERIC DEFAULT 0;
ALTER TABLE public.finished_goods ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- outwork_sendouts
CREATE TABLE IF NOT EXISTS public.outwork_sendouts (
  id TEXT PRIMARY KEY,
  send_out_id TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  process TEXT NOT NULL,
  sent_qty NUMERIC NOT NULL DEFAULT 0,
  received_qty NUMERIC NOT NULL DEFAULT 0,
  rejected_qty NUMERIC NOT NULL DEFAULT 0,
  expected_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SENT',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.outwork_sendouts ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.outwork_sendouts ADD COLUMN IF NOT EXISTS send_out_id TEXT;
ALTER TABLE public.outwork_sendouts ADD COLUMN IF NOT EXISTS vendor_name TEXT;
ALTER TABLE public.outwork_sendouts ADD COLUMN IF NOT EXISTS process TEXT;
ALTER TABLE public.outwork_sendouts ADD COLUMN IF NOT EXISTS sent_qty NUMERIC DEFAULT 0;
ALTER TABLE public.outwork_sendouts ADD COLUMN IF NOT EXISTS received_qty NUMERIC DEFAULT 0;
ALTER TABLE public.outwork_sendouts ADD COLUMN IF NOT EXISTS rejected_qty NUMERIC DEFAULT 0;
ALTER TABLE public.outwork_sendouts ADD COLUMN IF NOT EXISTS expected_date TEXT;
ALTER TABLE public.outwork_sendouts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'SENT';
ALTER TABLE public.outwork_sendouts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- production_logs
CREATE TABLE IF NOT EXISTS public.production_logs (
  id TEXT PRIMARY KEY,
  item_code TEXT NOT NULL,
  description TEXT NOT NULL,
  job_no TEXT NOT NULL,
  step_no INTEGER NOT NULL DEFAULT 1,
  operation_name TEXT NOT NULL,
  qty_done NUMERIC NOT NULL DEFAULT 0,
  logged_timestamp TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.production_logs ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.production_logs ADD COLUMN IF NOT EXISTS item_code TEXT;
ALTER TABLE public.production_logs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.production_logs ADD COLUMN IF NOT EXISTS job_no TEXT;
ALTER TABLE public.production_logs ADD COLUMN IF NOT EXISTS step_no INTEGER DEFAULT 1;
ALTER TABLE public.production_logs ADD COLUMN IF NOT EXISTS operation_name TEXT;
ALTER TABLE public.production_logs ADD COLUMN IF NOT EXISTS qty_done NUMERIC DEFAULT 0;
ALTER TABLE public.production_logs ADD COLUMN IF NOT EXISTS logged_timestamp TEXT;
ALTER TABLE public.production_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- qc_inspections
CREATE TABLE IF NOT EXISTS public.qc_inspections (
  id TEXT PRIMARY KEY,
  job_no TEXT NOT NULL,
  order_po TEXT NOT NULL,
  part_code TEXT NOT NULL,
  part_description TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 0,
  job_status TEXT NOT NULL,
  qc_status TEXT NOT NULL DEFAULT 'PENDING',
  inspector_notes TEXT,
  defect_category TEXT,
  inspected_at TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.qc_inspections ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.qc_inspections ADD COLUMN IF NOT EXISTS job_no TEXT;
ALTER TABLE public.qc_inspections ADD COLUMN IF NOT EXISTS order_po TEXT;
ALTER TABLE public.qc_inspections ADD COLUMN IF NOT EXISTS part_code TEXT;
ALTER TABLE public.qc_inspections ADD COLUMN IF NOT EXISTS part_description TEXT;
ALTER TABLE public.qc_inspections ADD COLUMN IF NOT EXISTS qty NUMERIC DEFAULT 0;
ALTER TABLE public.qc_inspections ADD COLUMN IF NOT EXISTS job_status TEXT;
ALTER TABLE public.qc_inspections ADD COLUMN IF NOT EXISTS qc_status TEXT DEFAULT 'PENDING';
ALTER TABLE public.qc_inspections ADD COLUMN IF NOT EXISTS inspector_notes TEXT;
ALTER TABLE public.qc_inspections ADD COLUMN IF NOT EXISTS defect_category TEXT;
ALTER TABLE public.qc_inspections ADD COLUMN IF NOT EXISTS inspected_at TEXT;
ALTER TABLE public.qc_inspections ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- pdi_inspections
CREATE TABLE IF NOT EXISTS public.pdi_inspections (
  id TEXT PRIMARY KEY,
  job_no TEXT NOT NULL,
  order_po TEXT NOT NULL,
  part_code TEXT NOT NULL,
  part_description TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 0,
  pdi_status TEXT NOT NULL DEFAULT 'PENDING',
  certificate_no TEXT,
  report_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.pdi_inspections ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.pdi_inspections ADD COLUMN IF NOT EXISTS job_no TEXT;
ALTER TABLE public.pdi_inspections ADD COLUMN IF NOT EXISTS order_po TEXT;
ALTER TABLE public.pdi_inspections ADD COLUMN IF NOT EXISTS part_code TEXT;
ALTER TABLE public.pdi_inspections ADD COLUMN IF NOT EXISTS part_description TEXT;
ALTER TABLE public.pdi_inspections ADD COLUMN IF NOT EXISTS qty NUMERIC DEFAULT 0;
ALTER TABLE public.pdi_inspections ADD COLUMN IF NOT EXISTS pdi_status TEXT DEFAULT 'PENDING';
ALTER TABLE public.pdi_inspections ADD COLUMN IF NOT EXISTS certificate_no TEXT;
ALTER TABLE public.pdi_inspections ADD COLUMN IF NOT EXISTS report_date TEXT;
ALTER TABLE public.pdi_inspections ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- dispatch_challans
CREATE TABLE IF NOT EXISTS public.dispatch_challans (
  id TEXT PRIMARY KEY,
  challan_no TEXT NOT NULL UNIQUE,
  order_po TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'GENERATED',
  date TEXT NOT NULL,
  transporter TEXT NOT NULL,
  vehicle_no TEXT NOT NULL,
  lines_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.dispatch_challans ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.dispatch_challans ADD COLUMN IF NOT EXISTS challan_no TEXT;
ALTER TABLE public.dispatch_challans ADD COLUMN IF NOT EXISTS order_po TEXT;
ALTER TABLE public.dispatch_challans ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'GENERATED';
ALTER TABLE public.dispatch_challans ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE public.dispatch_challans ADD COLUMN IF NOT EXISTS transporter TEXT;
ALTER TABLE public.dispatch_challans ADD COLUMN IF NOT EXISTS vehicle_no TEXT;
ALTER TABLE public.dispatch_challans ADD COLUMN IF NOT EXISTS lines_count INTEGER DEFAULT 1;
ALTER TABLE public.dispatch_challans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- pending_approvals
CREATE TABLE IF NOT EXISTS public.pending_approvals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- 'HIGH_VALUE_PO', 'HIGH_VALUE_PAYMENT', 'DISCOUNT_OVERRIDE', 'QC_HOLD_RELEASE', 'COMMERCIAL_OVERRIDE', 'CUSTOM'
    entity_type TEXT NOT NULL, -- 'PO', 'ORDER', 'VENDOR_PAYMENT', 'JOB_CARD', 'CUSTOMER_INVOICE'
    entity_id TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    threshold_limit NUMERIC DEFAULT 0,
    requested_by TEXT NOT NULL,
    requested_by_role TEXT NOT NULL,
    target_approver_role TEXT DEFAULT 'Owner',
    status TEXT NOT NULL DEFAULT 'PENDING_OWNER_APPROVAL' CHECK (status IN ('PENDING_OWNER_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED')),
    details TEXT,
    escalation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolution_notes TEXT
);
ALTER TABLE public.pending_approvals ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.pending_approvals ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.pending_approvals ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.pending_approvals ADD COLUMN IF NOT EXISTS requested_by TEXT;
ALTER TABLE public.pending_approvals ADD COLUMN IF NOT EXISTS timestamp TEXT;
ALTER TABLE public.pending_approvals ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE public.pending_approvals ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.pending_approvals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.pending_approvals ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE public.pending_approvals ADD COLUMN IF NOT EXISTS threshold_limit NUMERIC DEFAULT 0;
ALTER TABLE public.pending_approvals ADD COLUMN IF NOT EXISTS requested_by_role TEXT;
ALTER TABLE public.pending_approvals ADD COLUMN IF NOT EXISTS target_approver_role TEXT DEFAULT 'Owner';
ALTER TABLE public.pending_approvals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING_OWNER_APPROVAL' CHECK (status IN ('PENDING_OWNER_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'));
ALTER TABLE public.pending_approvals ADD COLUMN IF NOT EXISTS escalation_reason TEXT;
ALTER TABLE public.pending_approvals ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE public.pending_approvals ADD COLUMN IF NOT EXISTS resolved_by TEXT;
ALTER TABLE public.pending_approvals ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- customer_invoices
CREATE TABLE IF NOT EXISTS public.customer_invoices (
  id TEXT PRIMARY KEY,
  invoice_no TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  order_po TEXT NOT NULL,
  challan_no TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  balance_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS invoice_no TEXT;
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS order_po TEXT;
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS challan_no TEXT;
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'DRAFT';
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS due_date TEXT;
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS balance_amount NUMERIC DEFAULT 0;
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS pdf_status TEXT DEFAULT 'pending_pdf';
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE INDEX IF NOT EXISTS idx_customer_invoices_idempotency_key ON public.customer_invoices (idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_invoices_active_order
  ON public.customer_invoices (order_po)
  WHERE status <> 'CANCELLED';

-- vendor_bills
CREATE TABLE IF NOT EXISTS public.vendor_bills (
  id TEXT PRIMARY KEY,
  bill_no TEXT NOT NULL UNIQUE,
  vendor_name TEXT NOT NULL,
  po_no TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  balance_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.vendor_bills ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.vendor_bills ADD COLUMN IF NOT EXISTS bill_no TEXT;
ALTER TABLE public.vendor_bills ADD COLUMN IF NOT EXISTS vendor_name TEXT;
ALTER TABLE public.vendor_bills ADD COLUMN IF NOT EXISTS po_no TEXT;
ALTER TABLE public.vendor_bills ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'OPEN';
ALTER TABLE public.vendor_bills ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE public.vendor_bills ADD COLUMN IF NOT EXISTS due_date TEXT;
ALTER TABLE public.vendor_bills ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE public.vendor_bills ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
ALTER TABLE public.vendor_bills ADD COLUMN IF NOT EXISTS balance_amount NUMERIC DEFAULT 0;
ALTER TABLE public.vendor_bills ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.vendor_bills ADD COLUMN IF NOT EXISTS vendor_type VARCHAR(100);

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'INFO' NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS id TEXT DEFAULT gen_random_uuid()::text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'INFO';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,               -- e.g. 'UPDATE_INVOICE', 'RECORD_PAYMENT', 'UPDATE_ROLE', 'ADJUST_STOCK', 'LOGIN_FAILED', 'PERMISSION_DENIED'
  entity_type TEXT NOT NULL,          -- e.g. 'invoice', 'order', 'inventory', 'user', 'qc_inspection'
  entity_id TEXT NOT NULL,
  before_state JSONB DEFAULT NULL,
  after_state JSONB DEFAULT NULL,
  ip_address TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS when_time TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_email TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS before_state JSONB DEFAULT NULL;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS after_state JSONB DEFAULT NULL;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT NULL;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT DEFAULT NULL;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- notification_rules
CREATE TABLE IF NOT EXISTS public.notification_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT true NOT NULL,
    severity TEXT DEFAULT 'INFO' NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE public.notification_rules ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.notification_rules ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.notification_rules ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.notification_rules ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;
ALTER TABLE public.notification_rules ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'INFO' CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'));
ALTER TABLE public.notification_rules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.notification_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- notification_recipients
CREATE TABLE IF NOT EXISTS public.notification_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_rule_id TEXT NOT NULL REFERENCES public.notification_rules(id) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('EMAIL', 'USER', 'ROLE')),
    recipient_value TEXT NOT NULL,
    email TEXT,
    name TEXT,
    enabled BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE public.notification_recipients ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.notification_recipients ADD COLUMN IF NOT EXISTS notification_rule_id TEXT REFERENCES public.notification_rules(id) ON DELETE CASCADE;
ALTER TABLE public.notification_recipients ADD COLUMN IF NOT EXISTS recipient_type TEXT CHECK (recipient_type IN ('EMAIL', 'USER', 'ROLE'));
ALTER TABLE public.notification_recipients ADD COLUMN IF NOT EXISTS recipient_value TEXT;
ALTER TABLE public.notification_recipients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.notification_recipients ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.notification_recipients ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;
ALTER TABLE public.notification_recipients ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.notification_recipients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- notification_logs
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
    resend_email_id TEXT,
    error_message TEXT,
    entity_type TEXT,
    entity_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    sent_at TIMESTAMPTZ
);
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS recipient_email TEXT;
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('PENDING', 'SENT', 'FAILED'));
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS resend_email_id TEXT;
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- customer_masters
CREATE TABLE IF NOT EXISTS public.customer_masters (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL UNIQUE, -- Format: CUST-####
    name TEXT NOT NULL, -- Customer Name*
    legal_name TEXT,
    customer_type TEXT NOT NULL DEFAULT 'OEM' 
        CHECK (customer_type IN ('Dealer', 'Distributor', 'OEM', 'Retailer', 'Corporate', 'Export', 'Other')),
    contact_person TEXT NOT NULL,
    mobile TEXT NOT NULL, -- 10-digit Indian Mobile*
    email TEXT,
    gstin TEXT NOT NULL, -- Unique 15-char or 'N/A — GST-exempt'
    pan TEXT, -- 10-char PAN
    billing_address TEXT NOT NULL,
    shipping_address TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    state_code TEXT DEFAULT '27',
    pincode TEXT,
    payment_terms TEXT NOT NULL DEFAULT 'Net 30'
        CHECK (payment_terms IN ('Advance', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Other')),
    credit_days NUMERIC DEFAULT 0 CHECK (credit_days >= 0 AND credit_days <= 180),
    credit_limit NUMERIC DEFAULT 0 CHECK (credit_limit >= 0),
    salesperson TEXT,
    status TEXT NOT NULL DEFAULT 'Active' 
        CHECK (status IN ('Active', 'Inactive')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS id TEXT DEFAULT gen_random_uuid()::text;
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'OEM';
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS state_code TEXT DEFAULT '27';
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS pin TEXT;
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS contact TEXT;
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS credit_days NUMERIC DEFAULT 30;
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Net 30';
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 1000000;
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS salesperson TEXT;
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'OEM' CHECK (customer_type IN ('Dealer', 'Distributor', 'OEM', 'Retailer', 'Corporate', 'Export', 'Other'));
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Net 30' CHECK (payment_terms IN ('Advance', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Other'));
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS credit_days NUMERIC DEFAULT 0 CHECK (credit_days >= 0 AND credit_days <= 180);
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0 CHECK (credit_limit >= 0);
ALTER TABLE public.customer_masters ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive'));

-- vendor_masters
CREATE TABLE IF NOT EXISTS public.vendor_masters (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL UNIQUE, -- Format: VEND-####
    name TEXT NOT NULL, -- Vendor Name*
    legal_name TEXT,
    vendor_type TEXT NOT NULL DEFAULT 'Supplier'
        CHECK (vendor_type IN ('Supplier', 'Transporter', 'Subcontractor / Job Worker', 'ServiceProvider', 'EquipmentVendor', 'ProfessionalService', 'ManpowerProvider', 'Other')),
    vendor_category TEXT NOT NULL DEFAULT 'Raw Material'
        CHECK (vendor_category IN ('Raw Material', 'Components', 'Consumables', 'Packaging', 'Machinery', 'Maintenance', 'Transport', 'IT', 'Professional', 'Manpower', 'Other')),
    contact_person TEXT NOT NULL,
    mobile TEXT NOT NULL, -- 10-digit Indian Mobile*
    email TEXT,
    billing_address TEXT NOT NULL,
    shipping_address TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    state_code TEXT DEFAULT '27',
    pincode TEXT,
    payment_terms TEXT NOT NULL DEFAULT 'Net 30'
        CHECK (payment_terms IN ('Advance', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Other')),
    credit_days NUMERIC DEFAULT 0 CHECK (credit_days >= 0 AND credit_days <= 180),
    credit_limit NUMERIC DEFAULT 0 CHECK (credit_limit >= 0),
    gstin TEXT, -- Conditional unless GST-exempt
    pan TEXT NOT NULL, -- Always mandatory for TDS
    bank_account_name TEXT NOT NULL,
    bank_account_number TEXT NOT NULL, -- Stored securely/encrypted
    ifsc TEXT NOT NULL, -- 11-char IFSC code
    process_type TEXT, -- For Subcontractor / Job Worker
    turnaround_time_days NUMERIC DEFAULT 0, -- For Subcontractor / Job Worker
    status TEXT NOT NULL DEFAULT 'Active'
        CHECK (status IN ('Active', 'Inactive')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS id TEXT DEFAULT gen_random_uuid()::text;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS vendor_type TEXT DEFAULT 'Supplier';
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS vendor_category TEXT DEFAULT 'Raw Material';
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS state_code TEXT DEFAULT '27';
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS pin TEXT;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS contact TEXT;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Net 30';
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS credit_days NUMERIC DEFAULT 30;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 500000;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS ifsc TEXT;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS vendor_type TEXT DEFAULT 'Supplier' CHECK (vendor_type IN ('Supplier', 'Transporter', 'Subcontractor / Job Worker', 'ServiceProvider', 'EquipmentVendor', 'ProfessionalService', 'ManpowerProvider', 'Other'));
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS vendor_category TEXT DEFAULT 'Raw Material' CHECK (vendor_category IN ('Raw Material', 'Components', 'Consumables', 'Packaging', 'Machinery', 'Maintenance', 'Transport', 'IT', 'Professional', 'Manpower', 'Other'));
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Net 30' CHECK (payment_terms IN ('Advance', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Other'));
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS credit_days NUMERIC DEFAULT 0 CHECK (credit_days >= 0 AND credit_days <= 180);
ALTER TABLE public.vendor_masters ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0 CHECK (credit_limit >= 0);

-- machine_masters
CREATE TABLE IF NOT EXISTS public.machine_masters (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL UNIQUE, -- MCH-####
    name TEXT NOT NULL UNIQUE, -- Unique machine name (e.g. VMC-01)
    machine_type TEXT NOT NULL DEFAULT 'CNC Machining'
        CHECK (machine_type IN ('Cutting', 'Welding', 'CNC Turning', 'CNC Machining', 'Conventional Machining', 'Grinding', 'Inspection-CMM', 'Other')),
    department TEXT NOT NULL,
    location TEXT NOT NULL,
    manufacturer TEXT,
    model TEXT,
    serial_number TEXT,
    installation_date TEXT,
    capacity NUMERIC,
    capacity_uom TEXT, -- Required if capacity is set
    operating_hours NUMERIC DEFAULT 16 CHECK (operating_hours >= 0 AND operating_hours <= 24),
    shift TEXT NOT NULL DEFAULT 'General-Day'
        CHECK (shift IN ('Shift A', 'Shift B', 'Shift C', 'General-Day')),
    status TEXT NOT NULL DEFAULT 'Active'
        CHECK (status IN ('Active', 'Under Maintenance', 'Idle', 'Decommissioned')),
    responsible_person TEXT,
    hourly_cost NUMERIC DEFAULT 500,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.machine_masters ADD COLUMN IF NOT EXISTS id TEXT DEFAULT gen_random_uuid()::text;
ALTER TABLE public.machine_masters ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.machine_masters ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.machine_masters ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.machine_masters ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'RUNNING';
ALTER TABLE public.machine_masters ADD COLUMN IF NOT EXISTS hourly_cost NUMERIC DEFAULT 500;
ALTER TABLE public.machine_masters ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.machine_masters ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.machine_masters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.machine_masters ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.machine_masters ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.machine_masters ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE public.machine_masters ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE public.machine_masters ADD COLUMN IF NOT EXISTS serial_number TEXT;
ALTER TABLE public.machine_masters ADD COLUMN IF NOT EXISTS installation_date TEXT;
ALTER TABLE public.machine_masters ADD COLUMN IF NOT EXISTS capacity NUMERIC;
ALTER TABLE public.machine_masters ADD COLUMN IF NOT EXISTS capacity_uom TEXT;
ALTER TABLE public.machine_masters ADD COLUMN IF NOT EXISTS shift TEXT DEFAULT 'General-Day' CHECK (shift IN ('Shift A', 'Shift B', 'Shift C', 'General-Day'));
ALTER TABLE public.machine_masters ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Under Maintenance', 'Idle', 'Decommissioned'));
ALTER TABLE public.machine_masters ADD COLUMN IF NOT EXISTS responsible_person TEXT;

-- users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'OPERATOR' CHECK (role IN ('SUPER ADMIN', 'OPERATOR', 'QC_MANAGER', 'DISPATCH_CLERK', 'FINANCE_MANAGER')),
    department TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'SUSPENDED')),
    org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    is_temporary_password BOOLEAN NOT NULL DEFAULT false,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    lockout_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'OPERATOR' CHECK (role IN ('SUPER ADMIN', 'OPERATOR', 'QC_MANAGER', 'DISPATCH_CLERK', 'FINANCE_MANAGER'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'SUSPENDED'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_temporary_password BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS employee_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'Machine Operator';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'Edit';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS modules_access TEXT[] DEFAULT ARRAY['production']::TEXT[];
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reporting_manager TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS shift TEXT DEFAULT 'General-Day';

-- sessions
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS token_family_id UUID DEFAULT gen_random_uuid();

-- security_events
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    session_id UUID,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    ip_address TEXT,
    user_agent TEXT,
    device_name TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    country TEXT,
    region TEXT,
    city TEXT,
    risk_score INT DEFAULT 0,
    risk_level TEXT DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    flagged_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'INFO' CHECK (severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS device_name TEXT;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS os TEXT;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS risk_score INT DEFAULT 0;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS flagged_reasons TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- goods_receipt_notes
CREATE TABLE IF NOT EXISTS public.goods_receipt_notes (
    id TEXT PRIMARY KEY,
    grn_no TEXT NOT NULL UNIQUE,
    po_no TEXT NOT NULL,
    vendor_code TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    challan_no TEXT NOT NULL,
    challan_date TEXT,
    received_date TEXT NOT NULL,
    received_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('PENDING_INSPECTION', 'RECEIVED', 'QC_VERIFIED', 'REJECTED')),
    vehicle_no TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS grn_no TEXT;
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS po_no TEXT;
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS vendor_code TEXT;
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS vendor_name TEXT;
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS challan_no TEXT;
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS challan_date TEXT;
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS received_date TEXT;
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS received_by TEXT;
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'RECEIVED' CHECK (status IN ('PENDING_INSPECTION', 'RECEIVED', 'QC_VERIFIED', 'REJECTED'));
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS vehicle_no TEXT;
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS id VARCHAR(100);
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS grn_no VARCHAR(50);
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS po_no VARCHAR(50);
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(200);
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS item_code VARCHAR(100);
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS item_description TEXT;
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS po_expected_qty NUMERIC(12, 2);
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS received_qty NUMERIC(12, 2);
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS accepted_qty NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS rejected_qty NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'KG';
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS is_qty_mismatched BOOLEAN DEFAULT FALSE;
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS mismatch_notes TEXT;
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS heat_lot_number VARCHAR(100);
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS delivery_challan_no VARCHAR(100);
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS carrier VARCHAR(100);
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS received_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS inspection_status VARCHAR(30) DEFAULT 'PENDING_INSPECTION';
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS inspection_notes TEXT;
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS store_keeper_name VARCHAR(100);
ALTER TABLE public.goods_receipt_notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- grn_items
CREATE TABLE IF NOT EXISTS public.grn_items (
    id TEXT PRIMARY KEY,
    grn_id TEXT NOT NULL REFERENCES public.goods_receipt_notes(id) ON DELETE CASCADE,
    item_code TEXT NOT NULL,
    item_description TEXT NOT NULL,
    ordered_qty NUMERIC NOT NULL DEFAULT 0,
    received_qty NUMERIC NOT NULL DEFAULT 0,
    accepted_qty NUMERIC NOT NULL DEFAULT 0,
    rejected_qty NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'NOS',
    unit_rate NUMERIC NOT NULL DEFAULT 0,
    rejection_reason TEXT
);
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS grn_id TEXT REFERENCES public.goods_receipt_notes(id) ON DELETE CASCADE;
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS item_code TEXT;
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS item_description TEXT;
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS ordered_qty NUMERIC DEFAULT 0;
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS received_qty NUMERIC DEFAULT 0;
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS accepted_qty NUMERIC DEFAULT 0;
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS rejected_qty NUMERIC DEFAULT 0;
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'NOS';
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS unit_rate NUMERIC DEFAULT 0;
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- bill_of_materials
CREATE TABLE IF NOT EXISTS public.bill_of_materials (
    id TEXT PRIMARY KEY,
    bom_code TEXT NOT NULL UNIQUE,
    parent_part_code TEXT NOT NULL,
    parent_part_name TEXT NOT NULL,
    revision TEXT NOT NULL DEFAULT 'v1.0',
    yield_percentage NUMERIC NOT NULL DEFAULT 98.5,
    batch_size NUMERIC NOT NULL DEFAULT 100,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DRAFT', 'OBSOLETE')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.bill_of_materials ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.bill_of_materials ADD COLUMN IF NOT EXISTS bom_code TEXT;
ALTER TABLE public.bill_of_materials ADD COLUMN IF NOT EXISTS parent_part_code TEXT;
ALTER TABLE public.bill_of_materials ADD COLUMN IF NOT EXISTS parent_part_name TEXT;
ALTER TABLE public.bill_of_materials ADD COLUMN IF NOT EXISTS revision TEXT DEFAULT 'v1.0';
ALTER TABLE public.bill_of_materials ADD COLUMN IF NOT EXISTS yield_percentage NUMERIC DEFAULT 98.5;
ALTER TABLE public.bill_of_materials ADD COLUMN IF NOT EXISTS batch_size NUMERIC DEFAULT 100;
ALTER TABLE public.bill_of_materials ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DRAFT', 'OBSOLETE'));
ALTER TABLE public.bill_of_materials ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.bill_of_materials ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.bill_of_materials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- bom_items
CREATE TABLE IF NOT EXISTS public.bom_items (
    id TEXT PRIMARY KEY,
    bom_id TEXT NOT NULL REFERENCES public.bill_of_materials(id) ON DELETE CASCADE,
    component_code TEXT NOT NULL,
    component_name TEXT NOT NULL,
    component_type TEXT NOT NULL DEFAULT 'RAW_MATERIAL' CHECK (component_type IN ('RAW_MATERIAL', 'HARDWARE', 'PACKING', 'SUB_ASSEMBLY')),
    qty_per_unit NUMERIC NOT NULL DEFAULT 1.0,
    unit TEXT NOT NULL DEFAULT 'NOS',
    scrap_allowance_pct NUMERIC NOT NULL DEFAULT 2.0,
    stage TEXT NOT NULL DEFAULT 'CNC_MACHINING',
    unit_cost NUMERIC NOT NULL DEFAULT 0
);
ALTER TABLE public.bom_items ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.bom_items ADD COLUMN IF NOT EXISTS bom_id TEXT REFERENCES public.bill_of_materials(id) ON DELETE CASCADE;
ALTER TABLE public.bom_items ADD COLUMN IF NOT EXISTS component_code TEXT;
ALTER TABLE public.bom_items ADD COLUMN IF NOT EXISTS component_name TEXT;
ALTER TABLE public.bom_items ADD COLUMN IF NOT EXISTS component_type TEXT DEFAULT 'RAW_MATERIAL' CHECK (component_type IN ('RAW_MATERIAL', 'HARDWARE', 'PACKING', 'SUB_ASSEMBLY'));
ALTER TABLE public.bom_items ADD COLUMN IF NOT EXISTS qty_per_unit NUMERIC DEFAULT 1.0;
ALTER TABLE public.bom_items ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'NOS';
ALTER TABLE public.bom_items ADD COLUMN IF NOT EXISTS scrap_allowance_pct NUMERIC DEFAULT 2.0;
ALTER TABLE public.bom_items ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'CNC_MACHINING';
ALTER TABLE public.bom_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC DEFAULT 0;

-- purchase_orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id TEXT PRIMARY KEY,
    po_no TEXT NOT NULL UNIQUE,
    supplier_code TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    order_date TEXT NOT NULL,
    expected_delivery_date TEXT NOT NULL,
    payment_terms TEXT NOT NULL DEFAULT 'Net 30',
    tax_rate NUMERIC NOT NULL DEFAULT 18.0,
    gross_amount NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')),
    approval_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_by TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS po_no TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS supplier_code TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS order_date TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS expected_delivery_date TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Net 30';
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 18.0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS gross_amount NUMERIC DEFAULT 0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'));
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED'));
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- purchase_order_items
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id TEXT PRIMARY KEY,
    purchase_order_id TEXT NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    item_code TEXT NOT NULL,
    item_description TEXT NOT NULL,
    order_qty NUMERIC NOT NULL DEFAULT 0,
    received_qty NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'NOS',
    unit_price NUMERIC NOT NULL DEFAULT 0,
    line_total NUMERIC NOT NULL DEFAULT 0
);
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS purchase_order_id TEXT REFERENCES public.purchase_orders(id) ON DELETE CASCADE;
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS item_code TEXT;
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS item_description TEXT;
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS order_qty NUMERIC DEFAULT 0;
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS received_qty NUMERIC DEFAULT 0;
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'NOS';
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0;
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS line_total NUMERIC DEFAULT 0;

-- attachments
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 't_00000000-0000-0000-0000-000000000001',
  entity_type TEXT NOT NULL, -- e.g. 'invoice', 'pdi_report', 'qc_doc', 'production_job', 'vendor_bill', 'cad_drawing'
  entity_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  scan_status TEXT NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending', 'clean', 'infected', 'error')),
  scan_result JSONB DEFAULT '{}'::jsonb,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 't_00000000-0000-0000-0000-000000000001';
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS filename TEXT;
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS size_bytes BIGINT;
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true;
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS scan_status TEXT DEFAULT 'pending' CHECK (scan_status IN ('pending', 'clean', 'infected', 'error'));
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS scan_result JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- inventory_movements
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
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS item_code TEXT;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'MAIN-WAREHOUSE';
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS quantity_change NUMERIC;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS actor_email TEXT;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- role_permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL,
    module TEXT NOT NULL,
    access_level TEXT NOT NULL CHECK (access_level IN ('NO_ACCESS', 'VIEW_ONLY', 'CREATE_EDIT', 'FULL_APPROVE')),
    approval_limit NUMERIC DEFAULT NULL, -- NULL indicates unlimited (or not applicable)
    scope_rule TEXT DEFAULT 'ALL' CHECK (scope_rule IN ('ALL', 'OWN_RECORDS_ONLY', 'EMPLOYEE_MASTER_ONLY', 'QC_HOLDS_ONLY', 'NO_COMMERCIAL_EDIT')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT DEFAULT 'SYSTEM',
    UNIQUE (role, module)
);
ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS module TEXT;
ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS access_level TEXT CHECK (access_level IN ('NO_ACCESS', 'VIEW_ONLY', 'CREATE_EDIT', 'FULL_APPROVE'));
ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS approval_limit NUMERIC DEFAULT NULL;
ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS updated_by TEXT DEFAULT 'SYSTEM';

-- purchase_requisitions
CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id VARCHAR(100) PRIMARY KEY,
  req_number VARCHAR(50) NOT NULL UNIQUE,
  source VARCHAR(50) DEFAULT 'LOW_STOCK_ALERT', -- LOW_STOCK_ALERT, PRODUCTION_SHORTAGE, MANUAL
  order_id VARCHAR(100),
  order_po VARCHAR(100),
  item_code VARCHAR(100) NOT NULL,
  item_description TEXT NOT NULL,
  required_qty NUMERIC(12, 2) NOT NULL,
  available_stock NUMERIC(12, 2) DEFAULT 0,
  deficit_qty NUMERIC(12, 2) DEFAULT 0,
  unit VARCHAR(20) DEFAULT 'KG',
  urgency VARCHAR(20) DEFAULT 'NORMAL', -- NORMAL, URGENT, CRITICAL
  status VARCHAR(30) DEFAULT 'PENDING_APPROVAL', -- DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, CONVERTED_TO_PO
  requested_by VARCHAR(100) NOT NULL,
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  po_number VARCHAR(50),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS id VARCHAR(100);
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS req_number VARCHAR(50);
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS order_id VARCHAR(100) REFERENCES customer_orders(id) ON DELETE SET NULL;
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS order_po VARCHAR(100);
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS item_code VARCHAR(100);
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS item_description TEXT;
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS required_qty NUMERIC(12, 2);
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS available_stock NUMERIC(12, 2);
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS deficit_qty NUMERIC(12, 2);
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'KG';
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'AUTO_GENERATED';
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) DEFAULT 'System Material Auto-Checker';
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'LOW_STOCK_ALERT';
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS available_stock NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS deficit_qty NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS urgency VARCHAR(20) DEFAULT 'NORMAL';
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS po_number VARCHAR(50);
ALTER TABLE public.purchase_requisitions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ncrs
CREATE TABLE IF NOT EXISTS ncrs (
  id VARCHAR(100) PRIMARY KEY,
  ncr_number VARCHAR(50) NOT NULL UNIQUE,
  order_id VARCHAR(100),
  order_po VARCHAR(100),
  job_no VARCHAR(100),
  part_code VARCHAR(100),
  part_description TEXT,
  defect_type VARCHAR(100) NOT NULL,
  defect_description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'MAJOR', -- MINOR, MAJOR, CRITICAL
  status VARCHAR(30) DEFAULT 'OPEN', -- OPEN, UNDER_REVIEW, REWORK_PLANNED, CLOSED, SCRAPPED
  raised_by VARCHAR(100) NOT NULL,
  closed_by VARCHAR(100),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.ncrs ADD COLUMN IF NOT EXISTS id VARCHAR(100);
ALTER TABLE public.ncrs ADD COLUMN IF NOT EXISTS ncr_number VARCHAR(50);
ALTER TABLE public.ncrs ADD COLUMN IF NOT EXISTS order_id VARCHAR(100);
ALTER TABLE public.ncrs ADD COLUMN IF NOT EXISTS order_po VARCHAR(100);
ALTER TABLE public.ncrs ADD COLUMN IF NOT EXISTS job_no VARCHAR(100);
ALTER TABLE public.ncrs ADD COLUMN IF NOT EXISTS part_code VARCHAR(100);
ALTER TABLE public.ncrs ADD COLUMN IF NOT EXISTS part_description TEXT;
ALTER TABLE public.ncrs ADD COLUMN IF NOT EXISTS defect_type VARCHAR(100);
ALTER TABLE public.ncrs ADD COLUMN IF NOT EXISTS defect_description TEXT;
ALTER TABLE public.ncrs ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'MAJOR';
ALTER TABLE public.ncrs ADD COLUMN IF NOT EXISTS closed_by VARCHAR(100);
ALTER TABLE public.ncrs ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE public.ncrs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.ncrs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- vendor_returns
CREATE TABLE IF NOT EXISTS vendor_returns (
  id VARCHAR(100) PRIMARY KEY,
  return_no VARCHAR(50) NOT NULL UNIQUE,
  grn_no VARCHAR(50) NOT NULL,
  po_no VARCHAR(50) NOT NULL,
  supplier_name VARCHAR(200) NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_description TEXT NOT NULL,
  rejected_qty NUMERIC(12, 2) NOT NULL,
  defect_category VARCHAR(100) NOT NULL, -- DIMENSIONAL, SURFACE_DEFECT, CHEMICAL_COMPOSITION, PACKAGING_DAMAGE, OTHER
  defect_notes TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'INITIATED', -- INITIATED, PENDING_APPROVAL, APPROVED, DISPATCHED_TO_VENDOR
  initiated_by VARCHAR(100) NOT NULL,
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  debit_note_number VARCHAR(50),
  debit_amount NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.vendor_returns ADD COLUMN IF NOT EXISTS id VARCHAR(100);
ALTER TABLE public.vendor_returns ADD COLUMN IF NOT EXISTS return_no VARCHAR(50);
ALTER TABLE public.vendor_returns ADD COLUMN IF NOT EXISTS grn_no VARCHAR(50);
ALTER TABLE public.vendor_returns ADD COLUMN IF NOT EXISTS po_no VARCHAR(50);
ALTER TABLE public.vendor_returns ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(200);
ALTER TABLE public.vendor_returns ADD COLUMN IF NOT EXISTS item_code VARCHAR(100);
ALTER TABLE public.vendor_returns ADD COLUMN IF NOT EXISTS item_description TEXT;
ALTER TABLE public.vendor_returns ADD COLUMN IF NOT EXISTS rejected_qty NUMERIC(12, 2);
ALTER TABLE public.vendor_returns ADD COLUMN IF NOT EXISTS defect_category VARCHAR(100);
ALTER TABLE public.vendor_returns ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'INITIATED';
ALTER TABLE public.vendor_returns ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);
ALTER TABLE public.vendor_returns ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.vendor_returns ADD COLUMN IF NOT EXISTS debit_note_number VARCHAR(50);
ALTER TABLE public.vendor_returns ADD COLUMN IF NOT EXISTS debit_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.vendor_returns ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.vendor_returns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- vendor_bill_three_way_matches
CREATE TABLE IF NOT EXISTS vendor_bill_three_way_matches (
  id VARCHAR(100) PRIMARY KEY,
  bill_no VARCHAR(50) NOT NULL UNIQUE,
  po_no VARCHAR(50) NOT NULL,
  grn_no VARCHAR(50) NOT NULL,
  supplier_name VARCHAR(200) NOT NULL,
  po_unit_price NUMERIC(12, 2) NOT NULL,
  bill_unit_price NUMERIC(12, 2) NOT NULL,
  grn_accepted_qty NUMERIC(12, 2) NOT NULL,
  bill_invoiced_qty NUMERIC(12, 2) NOT NULL,
  po_total_expected NUMERIC(12, 2) NOT NULL,
  bill_total_invoiced NUMERIC(12, 2) NOT NULL,
  match_status VARCHAR(40) DEFAULT 'MATCHED', -- MATCHED, PRICE_VARIANCE_FLAGGED, QTY_VARIANCE_FLAGGED, TAX_VARIANCE_FLAGGED
  is_flagged_for_review BOOLEAN DEFAULT FALSE,
  variance_details TEXT,
  matched_by VARCHAR(100) NOT NULL,
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  disbursement_status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, PENDING_OWNER_APPROVAL, DISBURSED
  disbursed_amount NUMERIC(12, 2) DEFAULT 0,
  disbursed_by VARCHAR(100),
  disbursed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.vendor_bill_three_way_matches ADD COLUMN IF NOT EXISTS id VARCHAR(100);
ALTER TABLE public.vendor_bill_three_way_matches ADD COLUMN IF NOT EXISTS bill_no VARCHAR(50);
ALTER TABLE public.vendor_bill_three_way_matches ADD COLUMN IF NOT EXISTS po_no VARCHAR(50);
ALTER TABLE public.vendor_bill_three_way_matches ADD COLUMN IF NOT EXISTS grn_no VARCHAR(50);
ALTER TABLE public.vendor_bill_three_way_matches ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(200);
ALTER TABLE public.vendor_bill_three_way_matches ADD COLUMN IF NOT EXISTS po_unit_price NUMERIC(12, 2);
ALTER TABLE public.vendor_bill_three_way_matches ADD COLUMN IF NOT EXISTS bill_unit_price NUMERIC(12, 2);
ALTER TABLE public.vendor_bill_three_way_matches ADD COLUMN IF NOT EXISTS grn_accepted_qty NUMERIC(12, 2);
ALTER TABLE public.vendor_bill_three_way_matches ADD COLUMN IF NOT EXISTS bill_invoiced_qty NUMERIC(12, 2);
ALTER TABLE public.vendor_bill_three_way_matches ADD COLUMN IF NOT EXISTS po_total_expected NUMERIC(12, 2);
ALTER TABLE public.vendor_bill_three_way_matches ADD COLUMN IF NOT EXISTS bill_total_invoiced NUMERIC(12, 2);
ALTER TABLE public.vendor_bill_three_way_matches ADD COLUMN IF NOT EXISTS match_status VARCHAR(40) DEFAULT 'MATCHED';
ALTER TABLE public.vendor_bill_three_way_matches ADD COLUMN IF NOT EXISTS variance_details TEXT;
ALTER TABLE public.vendor_bill_three_way_matches ADD COLUMN IF NOT EXISTS matched_by VARCHAR(100);
ALTER TABLE public.vendor_bill_three_way_matches ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.vendor_bill_three_way_matches ADD COLUMN IF NOT EXISTS disbursement_status VARCHAR(30) DEFAULT 'PENDING';
ALTER TABLE public.vendor_bill_three_way_matches ADD COLUMN IF NOT EXISTS disbursed_by VARCHAR(100);
ALTER TABLE public.vendor_bill_three_way_matches ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMPTZ;
ALTER TABLE public.vendor_bill_three_way_matches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.vendor_bill_three_way_matches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- vendor_scorecards
CREATE TABLE IF NOT EXISTS vendor_scorecards (
  id VARCHAR(100) PRIMARY KEY,
  supplier_code VARCHAR(100) NOT NULL,
  supplier_name VARCHAR(200) NOT NULL,
  evaluation_period VARCHAR(50) NOT NULL, -- e.g. Q1-2026, Q2-2026
  total_po_orders INT DEFAULT 0,
  total_deliveries INT DEFAULT 0,
  on_time_deliveries INT DEFAULT 0,
  otd_percentage NUMERIC(5, 2) DEFAULT 0.0,
  total_received_qty NUMERIC(12, 2) DEFAULT 0.0,
  accepted_qty NUMERIC(12, 2) DEFAULT 0.0,
  rejected_qty NUMERIC(12, 2) DEFAULT 0.0,
  quality_acceptance_percentage NUMERIC(5, 2) DEFAULT 0.0,
  overall_score NUMERIC(5, 2) DEFAULT 0.0,
  vendor_rating_tier VARCHAR(30) DEFAULT 'TIER_1_EXCELLENT', -- TIER_1_EXCELLENT (>=90%), TIER_2_SATISFACTORY (75-89%), TIER_3_PROBATION (<75%)
  evaluated_by VARCHAR(100) NOT NULL,
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);
ALTER TABLE public.vendor_scorecards ADD COLUMN IF NOT EXISTS id VARCHAR(100);
ALTER TABLE public.vendor_scorecards ADD COLUMN IF NOT EXISTS supplier_code VARCHAR(100);
ALTER TABLE public.vendor_scorecards ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(200);
ALTER TABLE public.vendor_scorecards ADD COLUMN IF NOT EXISTS evaluation_period VARCHAR(50);
ALTER TABLE public.vendor_scorecards ADD COLUMN IF NOT EXISTS total_deliveries INT DEFAULT 0;
ALTER TABLE public.vendor_scorecards ADD COLUMN IF NOT EXISTS on_time_deliveries INT DEFAULT 0;
ALTER TABLE public.vendor_scorecards ADD COLUMN IF NOT EXISTS otd_percentage NUMERIC(5, 2) DEFAULT 0.0;
ALTER TABLE public.vendor_scorecards ADD COLUMN IF NOT EXISTS total_received_qty NUMERIC(12, 2) DEFAULT 0.0;
ALTER TABLE public.vendor_scorecards ADD COLUMN IF NOT EXISTS accepted_qty NUMERIC(12, 2) DEFAULT 0.0;
ALTER TABLE public.vendor_scorecards ADD COLUMN IF NOT EXISTS rejected_qty NUMERIC(12, 2) DEFAULT 0.0;
ALTER TABLE public.vendor_scorecards ADD COLUMN IF NOT EXISTS quality_acceptance_percentage NUMERIC(5, 2) DEFAULT 0.0;
ALTER TABLE public.vendor_scorecards ADD COLUMN IF NOT EXISTS overall_score NUMERIC(5, 2) DEFAULT 0.0;
ALTER TABLE public.vendor_scorecards ADD COLUMN IF NOT EXISTS vendor_rating_tier VARCHAR(30) DEFAULT 'TIER_1_EXCELLENT';
ALTER TABLE public.vendor_scorecards ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.vendor_scorecards ADD COLUMN IF NOT EXISTS notes TEXT;

-- subcontract_orders
CREATE TABLE IF NOT EXISTS subcontract_orders (
  id VARCHAR(100) PRIMARY KEY,
  gate_pass_no VARCHAR(50) NOT NULL UNIQUE, -- GP-OUT-2026-####
  job_no VARCHAR(100) NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_description TEXT NOT NULL,
  subcontractor_name VARCHAR(200) NOT NULL,
  process_type VARCHAR(100) NOT NULL, -- HEAT_TREATMENT, ELECTROPLATING, ZINC_PLATING, NDT_TESTING, CNC_MACHINING, BLACK_OXIDE, OTHER
  dispatched_qty NUMERIC(12, 2) NOT NULL,
  unit VARCHAR(20) DEFAULT 'NOS',
  dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date DATE NOT NULL,
  actual_return_date DATE,
  gate_in_pass_no VARCHAR(50),
  received_qty NUMERIC(12, 2) DEFAULT 0,
  rejected_qty NUMERIC(12, 2) DEFAULT 0,
  qc_status VARCHAR(30) DEFAULT 'PENDING_GATE_IN', -- PENDING_GATE_IN, INSPECTED_ACCEPTED, INSPECTED_REJECTED
  status VARCHAR(30) DEFAULT 'OUT_FOR_JOBWORK', -- OUT_FOR_JOBWORK, OVERDUE_JOBWORK, RETURNED_INSPECTED, CLOSED
  is_overdue BOOLEAN DEFAULT FALSE,
  overdue_days INT DEFAULT 0,
  vehicle_details VARCHAR(100),
  transporter VARCHAR(100),
  unit_rate NUMERIC(12, 2) DEFAULT 0,
  total_process_cost NUMERIC(12, 2) DEFAULT 0,
  dispatched_by VARCHAR(100) NOT NULL,
  received_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS id VARCHAR(100);
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS gate_pass_no VARCHAR(50);
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS item_code VARCHAR(100);
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS item_description TEXT;
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS subcontractor_name VARCHAR(200);
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS process_type VARCHAR(100);
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'NOS';
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS dispatch_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS expected_return_date DATE;
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS actual_return_date DATE;
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS gate_in_pass_no VARCHAR(50);
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS received_qty NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS rejected_qty NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS qc_status VARCHAR(30) DEFAULT 'PENDING_GATE_IN';
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS overdue_days INT DEFAULT 0;
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS vehicle_details VARCHAR(100);
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS transporter VARCHAR(100);
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS unit_rate NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS total_process_cost NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS dispatched_by VARCHAR(100);
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS received_by VARCHAR(100);
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.subcontract_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- route_card_templates
CREATE TABLE IF NOT EXISTS public.route_card_templates (
    id VARCHAR(100) PRIMARY KEY,
    part_code VARCHAR(100) NOT NULL,
    part_description TEXT NOT NULL,
    sequence_no INT NOT NULL,
    operation_name VARCHAR(150) NOT NULL,
    work_center VARCHAR(100) NOT NULL,
    standard_time_minutes INT NOT NULL DEFAULT 30,
    inspection_required BOOLEAN DEFAULT FALSE,
    required_certification VARCHAR(100) DEFAULT 'None',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(part_code, sequence_no)
);
ALTER TABLE public.route_card_templates ADD COLUMN IF NOT EXISTS id VARCHAR(100);
ALTER TABLE public.route_card_templates ADD COLUMN IF NOT EXISTS part_code VARCHAR(100);
ALTER TABLE public.route_card_templates ADD COLUMN IF NOT EXISTS part_description TEXT;
ALTER TABLE public.route_card_templates ADD COLUMN IF NOT EXISTS sequence_no INT;
ALTER TABLE public.route_card_templates ADD COLUMN IF NOT EXISTS work_center VARCHAR(100);
ALTER TABLE public.route_card_templates ADD COLUMN IF NOT EXISTS inspection_required BOOLEAN DEFAULT FALSE;
ALTER TABLE public.route_card_templates ADD COLUMN IF NOT EXISTS required_certification VARCHAR(100) DEFAULT 'None';
ALTER TABLE public.route_card_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.route_card_templates ADD COLUMN IF NOT EXISTS operation_name VARCHAR(150);
ALTER TABLE public.route_card_templates ADD COLUMN IF NOT EXISTS standard_time_minutes INT DEFAULT 30;
ALTER TABLE public.route_card_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- employee_certifications
CREATE TABLE IF NOT EXISTS public.employee_certifications (
    id VARCHAR(100) PRIMARY KEY,
    employee_name VARCHAR(100) NOT NULL,
    employee_code VARCHAR(50),
    certification_name VARCHAR(100) NOT NULL,
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.employee_certifications ADD COLUMN IF NOT EXISTS id VARCHAR(100);
ALTER TABLE public.employee_certifications ADD COLUMN IF NOT EXISTS employee_name VARCHAR(100);
ALTER TABLE public.employee_certifications ADD COLUMN IF NOT EXISTS employee_code VARCHAR(50);
ALTER TABLE public.employee_certifications ADD COLUMN IF NOT EXISTS certification_name VARCHAR(100);
ALTER TABLE public.employee_certifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.employee_certifications ADD COLUMN IF NOT EXISTS valid_until DATE;

-- job_card_operations
CREATE TABLE IF NOT EXISTS public.job_card_operations (
    id VARCHAR(100) PRIMARY KEY,
    job_card_id VARCHAR(100) NOT NULL,
    job_no VARCHAR(50) NOT NULL,
    sequence_no INT NOT NULL,
    operation_name VARCHAR(150) NOT NULL,
    machine_id VARCHAR(100),
    operator_name VARCHAR(100),
    required_certification VARCHAR(100) DEFAULT 'None',
    is_certification_verified BOOLEAN DEFAULT TRUE,
    standard_time_minutes INT NOT NULL DEFAULT 30,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    actual_time_minutes INT DEFAULT 0,
    qty_processed NUMERIC(12, 2) DEFAULT 0,
    qty_rejected NUMERIC(12, 2) DEFAULT 0,
    inspection_required BOOLEAN DEFAULT FALSE,
    inspection_passed BOOLEAN DEFAULT FALSE,
    op_status VARCHAR(50) DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS id VARCHAR(100);
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS job_card_id VARCHAR(100);
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS job_no VARCHAR(50);
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS sequence_no INT;
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS operation_name VARCHAR(150);
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS machine_id VARCHAR(100);
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS operator_name VARCHAR(100);
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS required_certification VARCHAR(100) DEFAULT 'None';
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS is_certification_verified BOOLEAN DEFAULT TRUE;
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS standard_time_minutes INT DEFAULT 30;
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMPTZ;
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMPTZ;
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS actual_time_minutes INT DEFAULT 0;
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS qty_processed NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS qty_rejected NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS inspection_required BOOLEAN DEFAULT FALSE;
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS inspection_passed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS op_status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.job_card_operations ADD COLUMN IF NOT EXISTS notes TEXT;

-- document_sequences
CREATE TABLE IF NOT EXISTS document_sequences (
  series_code VARCHAR(30) NOT NULL, -- INV, PO, DC, GRN, JC, PR, DN, RET
  prefix VARCHAR(20) NOT NULL,
  financial_year VARCHAR(10) NOT NULL, -- e.g. 2526, 2627
  current_number INT NOT NULL DEFAULT 0,
  padding_digits INT NOT NULL DEFAULT 4,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (series_code, financial_year)
);
ALTER TABLE public.document_sequences ADD COLUMN IF NOT EXISTS series_code VARCHAR(30);
ALTER TABLE public.document_sequences ADD COLUMN IF NOT EXISTS financial_year VARCHAR(10);
ALTER TABLE public.document_sequences ADD COLUMN IF NOT EXISTS padding_digits INT DEFAULT 4;
ALTER TABLE public.document_sequences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by VARCHAR(100) DEFAULT 'System',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS key VARCHAR(100);
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS value TEXT;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100) DEFAULT 'System';
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- customer_invoice_items
CREATE TABLE IF NOT EXISTS customer_invoice_items (
  id VARCHAR(100) PRIMARY KEY,
  invoice_id VARCHAR(100) NOT NULL,
  invoice_no VARCHAR(50) NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_description TEXT NOT NULL,
  hsn_code VARCHAR(20) NOT NULL, -- 4 to 8 digits
  qty NUMERIC(12, 2) NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  taxable_value NUMERIC(12, 2) NOT NULL,
  gst_rate NUMERIC(5, 2) NOT NULL, -- 0, 5, 12, 18, 28
  cgst_rate NUMERIC(5, 2) DEFAULT 0,
  sgst_rate NUMERIC(5, 2) DEFAULT 0,
  igst_rate NUMERIC(5, 2) DEFAULT 0,
  cgst_amount NUMERIC(12, 2) DEFAULT 0,
  sgst_amount NUMERIC(12, 2) DEFAULT 0,
  igst_amount NUMERIC(12, 2) DEFAULT 0,
  total_item_amount NUMERIC(12, 2) NOT NULL,
  gst_override_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.customer_invoice_items ADD COLUMN IF NOT EXISTS id VARCHAR(100);
ALTER TABLE public.customer_invoice_items ADD COLUMN IF NOT EXISTS invoice_id VARCHAR(100);
ALTER TABLE public.customer_invoice_items ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(50);
ALTER TABLE public.customer_invoice_items ADD COLUMN IF NOT EXISTS item_code VARCHAR(100);
ALTER TABLE public.customer_invoice_items ADD COLUMN IF NOT EXISTS item_description TEXT;
ALTER TABLE public.customer_invoice_items ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20);
ALTER TABLE public.customer_invoice_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2);
ALTER TABLE public.customer_invoice_items ADD COLUMN IF NOT EXISTS taxable_value NUMERIC(12, 2);
ALTER TABLE public.customer_invoice_items ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5, 2);
ALTER TABLE public.customer_invoice_items ADD COLUMN IF NOT EXISTS sgst_rate NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE public.customer_invoice_items ADD COLUMN IF NOT EXISTS igst_rate NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE public.customer_invoice_items ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.customer_invoice_items ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.customer_invoice_items ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.customer_invoice_items ADD COLUMN IF NOT EXISTS total_item_amount NUMERIC(12, 2);
ALTER TABLE public.customer_invoice_items ADD COLUMN IF NOT EXISTS gst_override_reason TEXT;
ALTER TABLE public.customer_invoice_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Service-written columns that no migration defines
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS stage TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS blanket_po_id VARCHAR(100);
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS drawing_revision VARCHAR(50);
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS master_drawing_revision VARCHAR(50);
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS is_credit_held BOOLEAN DEFAULT FALSE;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS credit_override_by TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS credit_override_reason TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS has_open_ncr BOOLEAN DEFAULT FALSE;
ALTER TABLE public.order_line_items ADD COLUMN IF NOT EXISTS drawing_revision VARCHAR(50);
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS customer_gstin TEXT;
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(14,2) DEFAULT 0;
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(14,2) DEFAULT 0;
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(14,2) DEFAULT 0;
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS is_einvoice_applicable BOOLEAN DEFAULT FALSE;
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS irn_number TEXT;
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS payment_received_date TEXT;
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.pdi_inspections ADD COLUMN IF NOT EXISTS pdi_passed_qty NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.pdi_inspections ADD COLUMN IF NOT EXISTS physically_held_qty NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.pdi_inspections ADD COLUMN IF NOT EXISTS dispatched_qty NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.pdi_inspections ADD COLUMN IF NOT EXISTS variance NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.pdi_inspections ADD COLUMN IF NOT EXISTS inspected_by TEXT;
ALTER TABLE public.finished_goods ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Refresh the PostgREST schema cache so new columns are visible immediately
NOTIFY pgrst, 'reload schema';
