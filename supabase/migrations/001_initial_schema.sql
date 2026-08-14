-- ===================================================
-- Migration 001: Initial Schema for SketchItUp Owner OS
-- ===================================================

-- Profiles Table (Linked to auth.users)
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

-- Company Profile Table
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

-- Masters Items Table
CREATE TABLE IF NOT EXISTS public.masters (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  part_no TEXT NOT NULL,
  description TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'NOS',
  hsn_code TEXT NOT NULL,
  reorder_level NUMERIC NOT NULL DEFAULT 10,
  store_location TEXT NOT NULL,
  is_finished_goods BOOLEAN NOT NULL DEFAULT true,
  sale_rate NUMERIC NOT NULL DEFAULT 0,
  purchase_rate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customer Orders Table
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

-- Order Line Items Table
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

-- Stock Items Table
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

-- Shortage Items Table
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

-- Job Cards Table
CREATE TABLE IF NOT EXISTS public.job_cards (
  id TEXT PRIMARY KEY,
  job_no TEXT NOT NULL UNIQUE,
  order_po TEXT NOT NULL,
  part_code TEXT NOT NULL,
  part_description TEXT NOT NULL,
  order_status TEXT NOT NULL DEFAULT 'CONFIRMED',
  qty NUMERIC NOT NULL DEFAULT 0,
  machine TEXT NOT NULL,
  target_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Finished Goods Table
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

-- Outwork Sendouts Table
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

-- Production Logs Table
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

-- QC Inspections Table
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

-- PDI Inspections Table
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

-- Dispatch Challans Table
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

-- Pending Approvals Table
CREATE TABLE IF NOT EXISTS public.pending_approvals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  amount NUMERIC,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customer Invoices Table
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

-- Vendor Bills Table
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

-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  when_time TEXT NOT NULL,
  user_name TEXT NOT NULL,
  entity TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
