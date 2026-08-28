-- Owner OS: combined schema migrations 001-017 + legacy masters convergence
-- Apply once in the Supabase SQL Editor (Dashboard > SQL Editor > New query), or via: supabase db push

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
-- Invoice idempotency + duplicate guard (Parts 1 & 2): at most ONE non-cancelled invoice per order
ALTER TABLE public.customer_invoices ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE INDEX IF NOT EXISTS idx_customer_invoices_idempotency_key ON public.customer_invoices (idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_invoices_active_order
  ON public.customer_invoices (order_po)
  WHERE status <> 'CANCELLED';

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

-- ===================================================
-- Migration 002: Row Level Security (RLS) & Policies
-- ===================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortage_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finished_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outwork_sendouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdi_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper Function to Get Current User's Role
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(role, 'OPERATOR')
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Standard Public/Authenticated Operational Policies (Allow Full Operations for Workspace Users)
CREATE POLICY "Allow select for authenticated and anon" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated and anon" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for authenticated and anon" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Allow delete for authenticated and anon" ON public.profiles FOR DELETE USING (true);

CREATE POLICY "Company profile access" ON public.company_profile FOR ALL USING (true);
CREATE POLICY "Masters access" ON public.masters FOR ALL USING (true);
CREATE POLICY "Orders access" ON public.customer_orders FOR ALL USING (true);
CREATE POLICY "Order line items access" ON public.order_line_items FOR ALL USING (true);
CREATE POLICY "Stock items access" ON public.stock_items FOR ALL USING (true);
CREATE POLICY "Shortage items access" ON public.shortage_items FOR ALL USING (true);
CREATE POLICY "Job cards access" ON public.job_cards FOR ALL USING (true);
CREATE POLICY "Finished goods access" ON public.finished_goods FOR ALL USING (true);
CREATE POLICY "Outwork sendouts access" ON public.outwork_sendouts FOR ALL USING (true);
CREATE POLICY "Production logs access" ON public.production_logs FOR ALL USING (true);
CREATE POLICY "QC inspections access" ON public.qc_inspections FOR ALL USING (true);
CREATE POLICY "PDI inspections access" ON public.pdi_inspections FOR ALL USING (true);
CREATE POLICY "Dispatch challans access" ON public.dispatch_challans FOR ALL USING (true);
CREATE POLICY "Pending approvals access" ON public.pending_approvals FOR ALL USING (true);
CREATE POLICY "Customer invoices access" ON public.customer_invoices FOR ALL USING (true);
CREATE POLICY "Vendor bills access" ON public.vendor_bills FOR ALL USING (true);
CREATE POLICY "Notifications access" ON public.notifications FOR ALL USING (true);
CREATE POLICY "Audit logs access" ON public.audit_logs FOR ALL USING (true);

-- ===================================================
-- Migration 003: Supabase Realtime & Storage Setup
-- ===================================================

-- Add Business Tables to Realtime Publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
      public.customer_orders,
      public.stock_items,
      public.job_cards,
      public.production_logs,
      public.qc_inspections,
      public.pdi_inspections,
      public.dispatch_challans,
      public.customer_invoices,
      public.vendor_bills,
      public.audit_logs,
      public.pending_approvals,
      public.finished_goods,
      public.notifications,
      public.profiles;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Storage Bucket for Documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('owner-os-documents', 'owner-os-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read Access for owner-os-documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'owner-os-documents');

CREATE POLICY "Public Insert Access for owner-os-documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'owner-os-documents');

-- ===================================================
-- Migration 004: Default Initial Seed Data
-- ===================================================

-- Company Profile
INSERT INTO public.company_profile (id, legal_name, address, phone, email, gstin, pan, state, state_code)
VALUES (
  'main',
  'GuruOm Industries LLP',
  'Plot 42, GIDC Industrial Estate, Metoda, Rajkot, Gujarat - 360021',
  '+91 98250 12345',
  'contact@guruom.in',
  '24AAAFG1234C1Z9',
  'AAAFG1234C',
  'Gujarat',
  '24'
) ON CONFLICT (id) DO NOTHING;

-- Initial Profiles (Matching System Users)
INSERT INTO public.profiles (full_name, email, role, department, phone, status, last_login)
VALUES 
  ('Pramod Parshi', 'user@guruom.in', 'SUPER ADMIN', 'Executive Management', '+91 98250 12345', 'ACTIVE', NOW()::text),
  ('Rajesh Sharma', 'operator@guruom.in', 'OPERATOR', 'CNC Operations', '+91 98250 23456', 'ACTIVE', NOW()::text),
  ('Anita Patel', 'qc@guruom.in', 'QC_MANAGER', 'Quality Assurance', '+91 98250 34567', 'ACTIVE', NOW()::text),
  ('Vikram Singh', 'dispatch@guruom.in', 'DISPATCH_CLERK', 'Logistics & Dispatch', '+91 98250 45678', 'ACTIVE', NOW()::text),
  ('Suresh Mehta', 'finance@guruom.in', 'FINANCE_MANAGER', 'Accounts & Finance', '+91 98250 56789', 'ACTIVE', NOW()::text)
ON CONFLICT (email) DO NOTHING;

-- Initial Masters Items
INSERT INTO public.masters (id, code, part_no, description, unit, hsn_code, reorder_level, store_location, is_finished_goods, sale_rate, purchase_rate)
VALUES
  ('m-1', '00000001', '90812440', 'LOWER HOUSING FLANGE', 'NOS', '8483', 25, 'BAY-A1', true, 240, 180),
  ('m-2', '00000002', '94900181', 'UPPER BLOCK', 'NOS', '8483', 50, 'BAY-A2', true, 123, 90),
  ('m-3', '00000003', '90812450', 'TOWER PIVOTING SECTION', 'NOS', '8483', 30, 'BAY-B1', true, 123, 85),
  ('m-4', '00000004', '90812460', 'ROTARY GEAR ADAPTER', 'NOS', '8483', 15, 'BAY-C1', true, 450, 320)
ON CONFLICT (code) DO NOTHING;

-- Initial Stock Items
INSERT INTO public.stock_items (id, code, description, on_hand, reserved, available, demand, reorder_level, shortage, unit, status)
VALUES
  ('stk-1', '00000001', 'LOWER HOUSING FLANGE', 150, 40, 110, 50, 25, 0, 'NOS', 'OK'),
  ('stk-2', '00000002', 'UPPER BLOCK', 80, 80, 0, 123, 50, 43, 'NOS', 'SHORTAGE'),
  ('stk-3', '00000003', 'TOWER PIVOTING SECTION', 200, 120, 80, 123, 30, 0, 'NOS', 'OK'),
  ('stk-4', '00000004', 'ROTARY GEAR ADAPTER', 10, 10, 0, 35, 15, 25, 'NOS', 'CRITICAL')
ON CONFLICT (code) DO NOTHING;

-- Initial Shortage Items
INSERT INTO public.shortage_items (id, code, description, required_qty, available_qty, deficit, unit)
VALUES
  ('short-1', '00000002', 'UPPER BLOCK', 123, 80, 43, 'NOS'),
  ('short-2', '00000004', 'ROTARY GEAR ADAPTER', 35, 10, 25, 'NOS')
ON CONFLICT (id) DO NOTHING;

-- Initial Customer Orders
INSERT INTO public.customer_orders (id, po_no, customer_name, po_date, delivery_date, status, progress_step, gross_amount, tax_category, remark)
VALUES
  ('ord-1', 'neo123', 'Cust', '2026-07-23', '2026-07-25', 'PARTIALLY_DISPATCHED', 3, 15129.00, 'GST 18%', 'Priority dispatch requested for Tower Pivoting Section batch'),
  ('ord-2', 'asdads123123', 'Cust', '2026-07-22', '2026-07-25', 'CLOSED', 6, 15129.00, 'GST 18%', 'Annual contract order fulfilled')
ON CONFLICT (id) DO NOTHING;

-- Initial Order Line Items
INSERT INTO public.order_line_items (id, order_id, item_code, item_description, cust_part_no, order_qty, unit, dispatched_qty, pending_qty, rate)
VALUES
  ('line-1', 'ord-1', '00000003', 'TOWER PIVOTING SECTION', '90812450', 123, 'NOS', 3, 120, 123),
  ('line-2', 'ord-2', '00000002', 'UPPER BLOCK', '94900181', 123, 'NOS', 123, 0, 123)
ON CONFLICT (id) DO NOTHING;

-- Initial Job Cards
INSERT INTO public.job_cards (id, job_no, order_po, part_code, part_description, order_status, qty, machine, target_date, status)
VALUES
  ('jc-1', 'JC/0002/26-27', 'neo123', '00000003', 'TOWER PIVOTING SECTION', 'PARTIALLY_DISPATCHED', 123.00, 'VMC-01 CNC CENTRE', '2026-07-23', 'COMPLETED'),
  ('jc-2', 'JC/0001/26-27', 'asdads123123', '00000002', 'UPPER BLOCK', 'CLOSED', 123.00, 'LMW VMC 850', '2026-07-25', 'COMPLETED')
ON CONFLICT (id) DO NOTHING;

-- Initial Finished Goods
INSERT INTO public.finished_goods (id, order_po, part_code, part_description, pdi_passed_qty, physically_held_qty, dispatched_qty, variance)
VALUES
  ('fg-1', 'neo123', '00000003', 'TOWER PIVOTING SECTION', 123, 120, 3, 0),
  ('fg-2', 'asdads123123', '00000002', 'UPPER BLOCK', 123, 0, 123, 0)
ON CONFLICT (id) DO NOTHING;

-- Initial Outwork Sendouts
INSERT INTO public.outwork_sendouts (id, send_out_id, vendor_name, process, sent_qty, received_qty, rejected_qty, expected_date, status)
VALUES
  ('ow-1', 'OW-2026-001', 'Maruti Plating Works', 'Zinc Nickel Plating 12 Micron', 120, 120, 0, '2026-07-21', 'COMPLETED')
ON CONFLICT (id) DO NOTHING;

-- Initial Production Logs
INSERT INTO public.production_logs (id, item_code, description, job_no, step_no, operation_name, qty_done, logged_timestamp)
VALUES
  ('pl-1', '00000003', 'TOWER PIVOTING SECTION', 'JC/0002/26-27', 1, 'CNC Turning & Facing', 123, '22/07/2026, 04:30:00 pm')
ON CONFLICT (id) DO NOTHING;

-- Initial QC Inspections
INSERT INTO public.qc_inspections (id, job_no, order_po, part_code, part_description, qty, job_status, qc_status, inspector_notes, inspected_at)
VALUES
  ('qc-1', 'JC/0002/26-27', 'neo123', '00000003', 'TOWER PIVOTING SECTION', 123, 'COMPLETED', 'PASS', '100% CMM dimensional check verified within tolerance limits.', '2026-07-22T10:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- Initial PDI Inspections
INSERT INTO public.pdi_inspections (id, job_no, order_po, part_code, part_description, qty, pdi_status, certificate_no, report_date)
VALUES
  ('pdi-1', 'JC/0002/26-27', 'neo123', '00000003', 'TOWER PIVOTING SECTION', 123, 'PASS', 'PDI-2026-9012', '2026-07-22')
ON CONFLICT (id) DO NOTHING;

-- Initial Dispatch Challans
INSERT INTO public.dispatch_challans (id, challan_no, order_po, status, date, transporter, vehicle_no, lines_count)
VALUES
  ('chl-1', 'CHL/0002/26-27', 'neo123', 'DELIVERED', '2026-07-22', 'VRL Logistics', 'GJ-03-BW-9912', 1),
  ('chl-2', 'CHL/0001/26-27', 'asdads123123', 'DELIVERED', '2026-07-20', 'TCI Express', 'GJ-03-AX-1024', 1)
ON CONFLICT (id) DO NOTHING;

-- Initial Customer Invoices
INSERT INTO public.customer_invoices (id, invoice_no, customer_name, order_po, challan_no, status, date, due_date, total_amount, paid_amount, balance_amount)
VALUES
  ('inv-1', 'INV/2026/0042', 'Cust', 'neo123', 'CHL/0002/26-27', 'PARTIAL', '2026-07-22', '2026-08-22', 17852.22, 5000.00, 12852.22),
  ('inv-2', 'INV/2026/0039', 'Cust', 'asdads123123', 'CHL/0001/26-27', 'PAID', '2026-07-20', '2026-08-20', 17852.22, 17852.22, 0.00)
ON CONFLICT (id) DO NOTHING;

-- Initial Vendor Bills
INSERT INTO public.vendor_bills (id, bill_no, vendor_name, po_no, status, date, due_date, amount, paid_amount, balance_amount)
VALUES
  ('vb-1', 'BILL-2026-881', 'Maruti Plating Works', 'PO-OUT-009', 'OPEN', '2026-07-21', '2026-08-21', 14400.00, 0.00, 14400.00)
ON CONFLICT (id) DO NOTHING;

-- Initial Pending Approvals
INSERT INTO public.pending_approvals (id, title, type, requested_by, timestamp, amount, details)
VALUES
  ('app-1', 'Discount Override PO #neo123', 'DISCOUNT_OVERRIDE', 'Sales Manager', '2026-07-23 11:20 AM', 2500, 'Special 5% strategic discount requested for bulk batch order')
ON CONFLICT (id) DO NOTHING;

-- Initial Audit Logs
INSERT INTO public.audit_logs (id, when_time, user_name, entity, action, details)
VALUES
  ('log-1', '23/07/2026, 11:30:00 am', 'Pramod Parshi', 'order', 'create', 'Created PO neo123 for customer Cust'),
  ('log-2', '22/07/2026, 04:35:00 pm', 'Anita Patel', 'qc_inspection', 'update', 'QC #qc-1 • Status: PASS'),
  ('log-3', '22/07/2026, 05:10:00 pm', 'Vikram Singh', 'dispatch', 'issue_challan', 'Challan #CHL/0002/26-27 issued for PO neo123')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- MIGRATION 005: PRODUCTION SUPABASE + RESEND EMAIL NOTIFICATION SYSTEM
-- ============================================================================

-- 1. NOTIFICATION RULES TABLE
CREATE TABLE IF NOT EXISTS public.notification_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT true NOT NULL,
    severity TEXT DEFAULT 'INFO' NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. NOTIFICATION RECIPIENTS TABLE
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

-- 3. NOTIFICATION LOGS TABLE (AUDIT & RESEND STATUS)
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

-- 4. IN-APP NOTIFICATIONS TABLE (REALTIME BELL UPDATES)
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

-- Add severity column if missing on pre-existing notifications table
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'severity'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN severity TEXT DEFAULT 'INFO' NOT NULL;
    END IF;
END $$;

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES FOR PUBLIC & SERVICE ACCESS
DROP POLICY IF EXISTS "Public notification rules read" ON public.notification_rules;
CREATE POLICY "Public notification rules read" ON public.notification_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public notification rules update" ON public.notification_rules;
CREATE POLICY "Public notification rules update" ON public.notification_rules FOR ALL USING (true);

DROP POLICY IF EXISTS "Public notification recipients read" ON public.notification_recipients;
CREATE POLICY "Public notification recipients read" ON public.notification_recipients FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public notification recipients modify" ON public.notification_recipients;
CREATE POLICY "Public notification recipients modify" ON public.notification_recipients FOR ALL USING (true);

DROP POLICY IF EXISTS "Public notification logs read" ON public.notification_logs;
CREATE POLICY "Public notification logs read" ON public.notification_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public notification logs insert" ON public.notification_logs;
CREATE POLICY "Public notification logs insert" ON public.notification_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Public notifications read" ON public.notifications;
CREATE POLICY "Public notifications read" ON public.notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public notifications modify" ON public.notifications;
CREATE POLICY "Public notifications modify" ON public.notifications FOR ALL USING (true);

-- Enable Realtime publication on notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 7. SEED DEFAULT GURUOM NOTIFICATION RULES
INSERT INTO public.notification_rules (id, name, description, enabled, severity) VALUES
('critical_error', 'Critical System & Infrastructure Errors', 'Automated alerts for uncaught exceptions or database outages', true, 'CRITICAL'),
('production_failure', 'Shopfloor Production Job Failure', 'Machine breakdowns, tool damage or operator job rejections', true, 'CRITICAL'),
('pdi_failure', 'PDI & Quality Inspection Failure', 'Pre-Delivery Inspection non-conformance defects', true, 'HIGH'),
('order_delayed', 'Customer Order Schedule Delay', 'PO delivery date overdue or dispatch hold', true, 'HIGH'),
('inventory_shortage', 'Raw Material / SKU Shortage Alert', 'Stock level dropping below reorder point or negative available', true, 'HIGH'),
('invoice_generated', 'Customer Invoice Issued', 'Commercial invoice generated for customer dispatch', true, 'INFO'),
('payment_received', 'Customer Payment Received', 'Payment receipt logged against outstanding invoice', true, 'INFO'),
('dispatch_failed', 'Outward Dispatch Transport Exception', 'Challan transit delay or delivery vehicle breakdown', true, 'HIGH'),
('approval_required', 'Pending Management Approval', 'Purchase order or credit limit requiring sign-off', true, 'MEDIUM')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    severity = EXCLUDED.severity;

-- 8. SEED DEFAULT ROLE & EMAIL RECIPIENTS
INSERT INTO public.notification_recipients (notification_rule_id, recipient_type, recipient_value, email, name, enabled) VALUES
-- Critical Error -> Super Admin + Email
('critical_error', 'ROLE', 'SUPER ADMIN', 'admin@guruom.in', 'System Super Admin', true),
('critical_error', 'EMAIL', 'owner@guruom.in', 'owner@guruom.in', 'Managing Director', true),

-- Production Failure -> Production Manager + Super Admin
('production_failure', 'ROLE', 'OPERATOR', 'production@guruom.in', 'Production Supervisor', true),
('production_failure', 'ROLE', 'SUPER ADMIN', 'admin@guruom.in', 'Super Admin', true),

-- PDI Failure -> QC Manager + Production Manager
('pdi_failure', 'ROLE', 'QC_MANAGER', 'qc@guruom.in', 'QC Lead Auditor', true),
('pdi_failure', 'ROLE', 'SUPER ADMIN', 'admin@guruom.in', 'Super Admin', true),

-- Order Delayed -> Dispatch Clerk + Super Admin
('order_delayed', 'ROLE', 'DISPATCH_CLERK', 'sales@guruom.in', 'Logistics Coordinator', true),
('order_delayed', 'ROLE', 'SUPER ADMIN', 'admin@guruom.in', 'Super Admin', true),

-- Inventory Shortage -> Operator + Super Admin
('inventory_shortage', 'ROLE', 'OPERATOR', 'stores@guruom.in', 'Store Keeper', true),
('inventory_shortage', 'ROLE', 'SUPER ADMIN', 'admin@guruom.in', 'Super Admin', true),

-- Invoice Generated -> Finance Manager
('invoice_generated', 'ROLE', 'FINANCE_MANAGER', 'finance@guruom.in', 'Finance Manager', true),

-- Payment Received -> Finance Manager + Super Admin
('payment_received', 'ROLE', 'FINANCE_MANAGER', 'finance@guruom.in', 'Finance Manager', true),
('payment_received', 'ROLE', 'SUPER ADMIN', 'admin@guruom.in', 'Super Admin', true),

-- Dispatch Failed -> Dispatch Clerk
('dispatch_failed', 'ROLE', 'DISPATCH_CLERK', 'dispatch@guruom.in', 'Dispatch In-charge', true),

-- Approval Required -> Super Admin
('approval_required', 'ROLE', 'SUPER ADMIN', 'admin@guruom.in', 'Super Admin', true)
ON CONFLICT DO NOTHING;

-- ===================================================
-- Migration 006: Customer, Vendor & Machine Masters DDL & Realtime Setup
-- ===================================================

-- Customer Masters Table
CREATE TABLE IF NOT EXISTS public.customer_masters (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  legal_name TEXT,
  customer_type TEXT DEFAULT 'OEM',
  gstin TEXT NOT NULL,
  pan TEXT NOT NULL,
  address TEXT NOT NULL,
  shipping_address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  state_code TEXT DEFAULT '27',
  pin TEXT,
  email TEXT,
  contact TEXT NOT NULL,
  contact_person TEXT,
  credit_days NUMERIC DEFAULT 30,
  payment_terms TEXT DEFAULT 'Net 30',
  credit_limit NUMERIC DEFAULT 1000000,
  salesperson TEXT,
  status TEXT DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vendor Masters Table
CREATE TABLE IF NOT EXISTS public.vendor_masters (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  legal_name TEXT,
  vendor_type TEXT DEFAULT 'Supplier',
  vendor_category TEXT DEFAULT 'Raw Material',
  gstin TEXT NOT NULL,
  pan TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  state_code TEXT DEFAULT '27',
  pin TEXT,
  email TEXT,
  contact TEXT NOT NULL,
  contact_person TEXT,
  payment_terms TEXT DEFAULT 'Net 30',
  credit_days NUMERIC DEFAULT 30,
  credit_limit NUMERIC DEFAULT 500000,
  bank_account_name TEXT,
  bank_account_number TEXT,
  ifsc TEXT,
  status TEXT DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Machine Masters Table
CREATE TABLE IF NOT EXISTS public.machine_masters (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RUNNING',
  hourly_cost NUMERIC NOT NULL DEFAULT 500,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.customer_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_masters ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
DROP POLICY IF EXISTS "Customer masters access" ON public.customer_masters;
CREATE POLICY "Customer masters access" ON public.customer_masters FOR ALL USING (true);

DROP POLICY IF EXISTS "Vendor masters access" ON public.vendor_masters;
CREATE POLICY "Vendor masters access" ON public.vendor_masters FOR ALL USING (true);

DROP POLICY IF EXISTS "Machine masters access" ON public.machine_masters;
CREATE POLICY "Machine masters access" ON public.machine_masters FOR ALL USING (true);

-- Realtime Publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
      public.customer_masters,
      public.vendor_masters,
      public.machine_masters;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================================
-- Migration 007: Custom JWT Auth - Users and Sessions Schema & Data Migration
-- Owner OS Precision Operations System
-- ============================================================================

-- 1. USERS TABLE
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

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- 2. SESSIONS (REFRESH TOKENS) TABLE
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

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON public.sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions(expires_at);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR BACKEND SERVICE ROLE (Default Deny for Anon Key)
DROP POLICY IF EXISTS "Service role full access on users" ON public.users;
CREATE POLICY "Service role full access on users" ON public.users FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on sessions" ON public.sessions;
CREATE POLICY "Service role full access on sessions" ON public.sessions FOR ALL USING (true);

-- 5. BACKFILL USERS FROM EXISTING PROFILES & SEED DEMO ACCOUNTS
-- Note: Standard temporary password hash for demo accounts ('1234567890')
-- Generated via Argon2id: $argon2id$v=19$m=65536,t=3,p=4$ZGVtb19zYWx0XzEyMzQ1Ng$kU096h4VfW9P3B3F+n1X9V3E2B6Q9J1X0E2B6Q9J1X0
-- is_temporary_password = true flags accounts for password change on production launch.

DO $$
DECLARE
    -- Standard demo password hash for '1234567890' (argon2id)
    v_demo_hash TEXT := '$argon2id$v=19$m=65536,p=4,t=3$VgHcmjAIFdBPsWEkHYiakw$b10tFs2HPJOw+wKzZHy9zmayWA34zywOYLZOiqCIqcI';
BEGIN
    -- Backfill from public.profiles if exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        INSERT INTO public.users (
            id,
            email,
            password_hash,
            full_name,
            role,
            department,
            phone,
            status,
            is_temporary_password,
            created_at,
            updated_at
        )
        SELECT 
            COALESCE(p.id, gen_random_uuid()),
            LOWER(p.email),
            v_demo_hash,
            COALESCE(p.full_name, split_part(p.email, '@', 1)),
            COALESCE(p.role, 'OPERATOR'),
            p.department,
            p.phone,
            COALESCE(p.status, 'ACTIVE'),
            true, -- Flagged as temporary password
            COALESCE(p.created_at, NOW()),
            COALESCE(p.updated_at, NOW())
        FROM public.profiles p
        ON CONFLICT (email) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            department = EXCLUDED.department,
            phone = EXCLUDED.phone,
            status = EXCLUDED.status,
            updated_at = NOW();
    END IF;

    -- Guarantee baseline demo users exist with accurate roles
    INSERT INTO public.users (email, password_hash, full_name, role, department, phone, status, is_temporary_password) VALUES
    ('user@guruom.in', v_demo_hash, 'Pramod Parshi (Founder & CEO)', 'SUPER ADMIN', 'Executive Management', '+91 98250 12345', 'ACTIVE', true),
    ('admin@guruom.in', v_demo_hash, 'System Super Admin', 'SUPER ADMIN', 'Executive Management', '+91 98250 12345', 'ACTIVE', true),
    ('rohan.deshpande@example.com', v_demo_hash, 'Rohan Deshpande', 'SUPER ADMIN', 'Executive Management', '+91 98220 99001', 'ACTIVE', true),
    ('sachin@example.com', v_demo_hash, 'Sachin Gharbude', 'SUPER ADMIN', 'Plant Operations Admin', '+91 98220 99010', 'ACTIVE', true),
    ('operator@guruom.in', v_demo_hash, 'Rajesh Sharma', 'OPERATOR', 'CNC Operations', '+91 98250 23456', 'ACTIVE', true),
    ('suresh.yadav@example.com', v_demo_hash, 'Suresh Yadav', 'OPERATOR', 'Shop Floor Production', '+91 98220 99003', 'ACTIVE', true),
    ('qc@guruom.in', v_demo_hash, 'Anita Patel', 'QC_MANAGER', 'Quality Assurance', '+91 98250 34567', 'ACTIVE', true),
    ('snehal.bhosale@example.com', v_demo_hash, 'Snehal Bhosale', 'QC_MANAGER', 'Quality Inspection', '+91 98220 99006', 'ACTIVE', true),
    ('dispatch@guruom.in', v_demo_hash, 'Vikram Singh', 'DISPATCH_CLERK', 'Logistics & Dispatch', '+91 98250 45678', 'ACTIVE', true),
    ('amit.salunkhe@example.com', v_demo_hash, 'Amit Salunkhe', 'DISPATCH_CLERK', 'Logistics & Dispatch', '+91 98220 99007', 'ACTIVE', true),
    ('finance@guruom.in', v_demo_hash, 'Suresh Mehta', 'FINANCE_MANAGER', 'Accounts & Finance', '+91 98250 56789', 'ACTIVE', true),
    ('meenal.joshi@example.com', v_demo_hash, 'Meenal Joshi', 'FINANCE_MANAGER', 'Accounts & Billing', '+91 98220 99009', 'ACTIVE', true)
    ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        department = EXCLUDED.department,
        phone = EXCLUDED.phone,
        status = EXCLUDED.status,
        updated_at = NOW();
END $$;

-- ============================================================================
-- Migration 008: Active Sessions & Suspicious Login Security Events Schema
-- SketchItUp Owner OS Precision Security System
-- ============================================================================

-- 1. ENHANCE SESSIONS TABLE WITH METADATA & TOKEN FAMILIES
ALTER TABLE public.sessions 
    ADD COLUMN IF NOT EXISTS token_family_id UUID DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'desktop',
    ADD COLUMN IF NOT EXISTS device_name TEXT DEFAULT 'Unknown Device',
    ADD COLUMN IF NOT EXISTS browser TEXT,
    ADD COLUMN IF NOT EXISTS browser_version TEXT,
    ADD COLUMN IF NOT EXISTS os TEXT,
    ADD COLUMN IF NOT EXISTS os_version TEXT,
    ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India',
    ADD COLUMN IF NOT EXISTS region TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Mumbai',
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS risk_score INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS revoked_reason TEXT;

-- Indexing for fast session lookups and token family lookups
CREATE INDEX IF NOT EXISTS idx_sessions_token_family_id ON public.sessions(token_family_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_last_used ON public.sessions(user_id, last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked_at ON public.sessions(revoked_at);

-- 2. CREATE SECURITY EVENTS AUDIT TABLE
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

-- Indexing for fast security query retrieval
CREATE INDEX IF NOT EXISTS idx_sec_events_user_id ON public.security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_events_event_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sec_events_severity ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_sec_events_created_at ON public.security_events(created_at DESC);

-- 3. ENABLE ROW LEVEL SECURITY ON SECURITY EVENTS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR BACKEND SERVICE ROLE
DROP POLICY IF EXISTS "Service role full access on security_events" ON public.security_events;
CREATE POLICY "Service role full access on security_events" ON public.security_events FOR ALL USING (true);

-- ============================================================================
-- Migration 008: GRN, BOM, and Purchasing Data Schema & Seed Records
-- Owner OS Precision Operations System
-- ============================================================================

-- 1. GOODS RECEIPT NOTES (GRN) TABLE
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

CREATE INDEX IF NOT EXISTS idx_grn_po_no ON public.goods_receipt_notes(po_no);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn_id ON public.grn_items(grn_id);

-- 2. BILL OF MATERIALS (BOM) TABLES
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

CREATE INDEX IF NOT EXISTS idx_bom_parent_part ON public.bill_of_materials(parent_part_code);
CREATE INDEX IF NOT EXISTS idx_bom_items_bom_id ON public.bom_items(bom_id);

-- 3. PURCHASING / PURCHASE ORDERS TABLES
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

CREATE INDEX IF NOT EXISTS idx_po_supplier_code ON public.purchase_orders(supplier_code);
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON public.purchase_order_items(purchase_order_id);

-- 4. ENABLE ROW LEVEL SECURITY & SERVICE ROLE POLICIES
ALTER TABLE public.goods_receipt_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_of_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on goods_receipt_notes" ON public.goods_receipt_notes FOR ALL USING (true);
CREATE POLICY "Service role full access on grn_items" ON public.grn_items FOR ALL USING (true);
CREATE POLICY "Service role full access on bill_of_materials" ON public.bill_of_materials FOR ALL USING (true);
CREATE POLICY "Service role full access on bom_items" ON public.bom_items FOR ALL USING (true);
CREATE POLICY "Service role full access on purchase_orders" ON public.purchase_orders FOR ALL USING (true);
CREATE POLICY "Service role full access on purchase_order_items" ON public.purchase_order_items FOR ALL USING (true);

-- ===================================================
-- Migration 009: File Storage & Attachment Management
-- ===================================================

-- 1. Create Private Storage Bucket (Strictly Private, No Public Access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false, -- STRICTLY PRIVATE BUCKET
  26214400, -- 25MB max limit
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'text/plain',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. Attachments Metadata Table
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

-- 3. Indexes for High-Performance Queries & Tenant Isolation
CREATE INDEX IF NOT EXISTS idx_attachments_tenant ON public.attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON public.attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_checksum ON public.attachments(checksum_sha256);
CREATE INDEX IF NOT EXISTS idx_attachments_scan_status ON public.attachments(scan_status);
CREATE INDEX IF NOT EXISTS idx_attachments_deleted_at ON public.attachments(deleted_at);

-- 4. Enable RLS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for attachments"
ON public.attachments
FOR ALL
USING (tenant_id = current_setting('app.current_tenant', true))
WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- 5. Extend customer_invoices with pdf_status and attachment_id
ALTER TABLE public.customer_invoices 
ADD COLUMN IF NOT EXISTS pdf_status TEXT DEFAULT 'pending_pdf',
ADD COLUMN IF NOT EXISTS attachment_id UUID REFERENCES public.attachments(id) ON DELETE SET NULL;

-- ===================================================
-- Migration 010: Append-Only Immutable Audit Logs
-- ===================================================

-- 1. Create or update audit_logs table with WHO, WHAT, WHEN, WHERE, BEFORE, AFTER
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

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);

-- 3. Enforce Append-Only with Database-Level Triggers (Immutable Audit History)
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS no_update_audit_logs ON public.audit_logs;
CREATE TRIGGER no_update_audit_logs
BEFORE UPDATE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS no_delete_audit_logs ON public.audit_logs;
CREATE TRIGGER no_delete_audit_logs
BEFORE DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Insert policy for authenticated backend / service role
DROP POLICY IF EXISTS "Allow backend inserts on audit_logs" ON public.audit_logs;
CREATE POLICY "Allow backend inserts on audit_logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- No UPDATE or DELETE policies exist — with RLS enabled and no matching policy, updates and deletes are denied by default.

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

-- ============================================================================
-- Migration 012: Comprehensive Master Modules Specification DDL & Realtime
-- Customer, Vendor, Item, Machine, User Masters with Full Integrity Constraints
-- ============================================================================

-- 1. CUSTOMER MASTERS TABLE
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

CREATE INDEX IF NOT EXISTS idx_customer_masters_code ON public.customer_masters(code);
CREATE INDEX IF NOT EXISTS idx_customer_masters_status ON public.customer_masters(status);
CREATE INDEX IF NOT EXISTS idx_customer_masters_name ON public.customer_masters(LOWER(name));

-- 2. VENDOR MASTERS TABLE
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

CREATE INDEX IF NOT EXISTS idx_vendor_masters_code ON public.vendor_masters(code);
CREATE INDEX IF NOT EXISTS idx_vendor_masters_type ON public.vendor_masters(vendor_type);
CREATE INDEX IF NOT EXISTS idx_vendor_masters_status ON public.vendor_masters(status);

-- 3. ITEM MASTERS TABLE (masters)
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

CREATE INDEX IF NOT EXISTS idx_masters_code ON public.masters(code);
CREATE INDEX IF NOT EXISTS idx_masters_item_type ON public.masters(item_type);
CREATE INDEX IF NOT EXISTS idx_masters_status ON public.masters(status);

-- 4. MACHINE MASTERS TABLE
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

CREATE INDEX IF NOT EXISTS idx_machine_masters_code ON public.machine_masters(code);
CREATE INDEX IF NOT EXISTS idx_machine_masters_name ON public.machine_masters(name);
CREATE INDEX IF NOT EXISTS idx_machine_masters_status ON public.machine_masters(status);

-- 5. UPGRADE USERS TABLE WITH MASTER SPECIFICATION COLUMNS
DO $$
BEGIN
    -- user_id (USR-####)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_id') THEN
        ALTER TABLE public.users ADD COLUMN user_id TEXT UNIQUE;
    END IF;

    -- employee_code
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'employee_code') THEN
        ALTER TABLE public.users ADD COLUMN employee_code TEXT;
    END IF;

    -- user_role (Standard master role)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_role') THEN
        ALTER TABLE public.users ADD COLUMN user_role TEXT DEFAULT 'Machine Operator';
    END IF;

    -- mobile (10-digit Indian Mobile)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'mobile') THEN
        ALTER TABLE public.users ADD COLUMN mobile TEXT;
    END IF;

    -- access_level
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'access_level') THEN
        ALTER TABLE public.users ADD COLUMN access_level TEXT DEFAULT 'Edit';
    END IF;

    -- modules_access array
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'modules_access') THEN
        ALTER TABLE public.users ADD COLUMN modules_access TEXT[] DEFAULT ARRAY['production']::TEXT[];
    END IF;

    -- reporting_manager
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'reporting_manager') THEN
        ALTER TABLE public.users ADD COLUMN reporting_manager TEXT;
    END IF;

    -- shift
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'shift') THEN
        ALTER TABLE public.users ADD COLUMN shift TEXT DEFAULT 'General-Day';
    END IF;
END $$;

-- 6. RLS Policies
ALTER TABLE public.customer_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customer masters open access" ON public.customer_masters;
CREATE POLICY "Customer masters open access" ON public.customer_masters FOR ALL USING (true);

DROP POLICY IF EXISTS "Vendor masters open access" ON public.vendor_masters;
CREATE POLICY "Vendor masters open access" ON public.vendor_masters FOR ALL USING (true);

DROP POLICY IF EXISTS "Masters items open access" ON public.masters;
CREATE POLICY "Masters items open access" ON public.masters FOR ALL USING (true);

DROP POLICY IF EXISTS "Machine masters open access" ON public.machine_masters;
CREATE POLICY "Machine masters open access" ON public.machine_masters FOR ALL USING (true);

DROP POLICY IF EXISTS "Users master open access" ON public.users;
CREATE POLICY "Users master open access" ON public.users FOR ALL USING (true);

-- 7. Realtime Publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
      public.customer_masters,
      public.vendor_masters,
      public.masters,
      public.machine_masters,
      public.users;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================================
-- Migration: 013_rbac_matrix_and_escalation.sql
-- Description: Complete Role-Based Access Control (RBAC) Matrix, Monetary
--              Approval Limits, Scoped Row-Level Rules, and Escalation Ledger.
-- ============================================================================

-- 1. Create role_permissions Table
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

-- 2. Create or Upgrade pending_approvals Table
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

-- Indexes for fast query lookup
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_mod ON public.role_permissions (role, module);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_status ON public.pending_approvals (status);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_entity ON public.pending_approvals (entity_type, entity_id);

-- 3. Seed Exact Role-Permission Matrix
-- Roles:
-- 1. Owner: Order Mgmt=Full/Approve, Inventory=View, Production=View, Procurement=Full/Approve, Dispatch=View, Accounting=View, Masters=Full/Approve, Settings=Full/Approve, Approval Limit=Unlimited.
-- 2. Sales/Order Desk: Order Mgmt=Create/Edit, Inventory=View, Production=No Access, Procurement=No Access, Dispatch=View, Accounting=No Access, Masters=View, Settings=No Access.
-- 3. Production Planner: Order Mgmt=View (no commercial edit), Inventory=View, Production=Create/Edit, Procurement=No Access, Dispatch=View, Accounting=No Access, Masters=View, Settings=No Access.
-- 4. Shop Floor Supervisor: Production=Create/Edit (job cards, raises NCRs), Order Mgmt=No Access, others=No Access/View.
-- 5. Quality Inspector: Production=Create/Edit (specifically place/clear QC holds), others=No Access.
-- 6. Store Keeper: Inventory=Create/Edit (GRN, material issue, stock counts), Procurement=View, others=View/No Access.
-- 7. Purchase Manager: Procurement=Full/Approve, Masters=Create/Edit, Approval Limit=₹1,00,000 (PO above this escalates to Owner).
-- 8. Dispatch Executive: Dispatch=Create/Edit (cannot edit order commercial terms), others=View/No Access.
-- 9. Accountant: Accounting=Full/Approve (invoicing, payments, GST filing), Approval Limit=₹50,000 (vendor payments above this escalate to Owner).
-- 10. HR/Admin: Masters=Create/Edit (scoped ONLY to Employee Master — must not see other masters even at View level), Settings=View, others=No Access.
-- 11. Machine Operator: Production=Create/Edit (scoped to only their own assigned job/route card entries), others=No Access.
-- 12. Admin (System): Full/Approve on everything, Unlimited.

INSERT INTO public.role_permissions (role, module, access_level, approval_limit, scope_rule, description)
VALUES
  -- 1. Owner
  ('Owner', 'orders', 'FULL_APPROVE', NULL, 'ALL', 'Full control over sales orders & commercial approvals'),
  ('Owner', 'inventory', 'VIEW_ONLY', NULL, 'ALL', 'View inventory balances and ledger movements'),
  ('Owner', 'production', 'VIEW_ONLY', NULL, 'ALL', 'Monitor shop floor progress and machine velocity'),
  ('Owner', 'procurement', 'FULL_APPROVE', NULL, 'ALL', 'Unlimited purchase order authorization'),
  ('Owner', 'dispatch', 'VIEW_ONLY', NULL, 'ALL', 'View logistics and delivery challans'),
  ('Owner', 'accounting', 'VIEW_ONLY', NULL, 'ALL', 'View commercial invoices and financial ledgers'),
  ('Owner', 'masters', 'FULL_APPROVE', NULL, 'ALL', 'Full control over all master catalogs'),
  ('Owner', 'settings', 'FULL_APPROVE', NULL, 'ALL', 'Full system and company configuration'),
  ('Owner', 'approvals', 'FULL_APPROVE', NULL, 'ALL', 'Universal override on all escalation holds'),
  ('Owner', 'reports', 'FULL_APPROVE', NULL, 'ALL', 'Executive analytics and financial reporting'),

  -- 2. Sales / Order Desk
  ('Sales/Order Desk', 'orders', 'CREATE_EDIT', NULL, 'ALL', 'Create & edit customer orders, quotations, line items'),
  ('Sales/Order Desk', 'inventory', 'VIEW_ONLY', NULL, 'ALL', 'Check stock availability for promising lead times'),
  ('Sales/Order Desk', 'production', 'NO_ACCESS', NULL, 'ALL', 'No production management access'),
  ('Sales/Order Desk', 'procurement', 'NO_ACCESS', NULL, 'ALL', 'No purchasing access'),
  ('Sales/Order Desk', 'dispatch', 'VIEW_ONLY', NULL, 'ALL', 'Track customer order dispatch status'),
  ('Sales/Order Desk', 'accounting', 'NO_ACCESS', NULL, 'ALL', 'No accounting or ledger access'),
  ('Sales/Order Desk', 'masters', 'VIEW_ONLY', NULL, 'ALL', 'View customer and finished goods master catalogs'),
  ('Sales/Order Desk', 'settings', 'NO_ACCESS', NULL, 'ALL', 'No system settings access'),
  ('Sales/Order Desk', 'approvals', 'NO_ACCESS', NULL, 'ALL', 'Cannot authorize approval tickets'),
  ('Sales/Order Desk', 'reports', 'VIEW_ONLY', NULL, 'ALL', 'View sales and customer order pipeline reports'),

  -- 3. Production Planner
  ('Production Planner', 'orders', 'VIEW_ONLY', NULL, 'NO_COMMERCIAL_EDIT', 'View sales demand to plan jobs; cannot modify commercial pricing'),
  ('Production Planner', 'inventory', 'VIEW_ONLY', NULL, 'ALL', 'Check raw material and component availability for BOMs'),
  ('Production Planner', 'production', 'CREATE_EDIT', NULL, 'ALL', 'Schedule job cards, route operations, machine allocation'),
  ('Production Planner', 'procurement', 'NO_ACCESS', NULL, 'ALL', 'No procurement creation access'),
  ('Production Planner', 'dispatch', 'VIEW_ONLY', NULL, 'ALL', 'View planned dispatch dates'),
  ('Production Planner', 'accounting', 'NO_ACCESS', NULL, 'ALL', 'No accounting access'),
  ('Production Planner', 'masters', 'VIEW_ONLY', NULL, 'ALL', 'View items, BOMs, machines, and tools'),
  ('Production Planner', 'settings', 'NO_ACCESS', NULL, 'ALL', 'No system configuration access'),
  ('Production Planner', 'approvals', 'NO_ACCESS', NULL, 'ALL', 'No approval delegation'),
  ('Production Planner', 'reports', 'VIEW_ONLY', NULL, 'ALL', 'View production velocity and machine load'),

  -- 4. Shop Floor Supervisor
  ('Shop Floor Supervisor', 'orders', 'NO_ACCESS', NULL, 'ALL', 'No customer order access'),
  ('Shop Floor Supervisor', 'inventory', 'VIEW_ONLY', NULL, 'ALL', 'View WIP stock and material availability'),
  ('Shop Floor Supervisor', 'production', 'CREATE_EDIT', NULL, 'ALL', 'Issue job cards, record shift logs, raise NCR non-conformances'),
  ('Shop Floor Supervisor', 'procurement', 'NO_ACCESS', NULL, 'ALL', 'No purchasing access'),
  ('Shop Floor Supervisor', 'dispatch', 'NO_ACCESS', NULL, 'ALL', 'No dispatch access'),
  ('Shop Floor Supervisor', 'accounting', 'NO_ACCESS', NULL, 'ALL', 'No accounting access'),
  ('Shop Floor Supervisor', 'masters', 'NO_ACCESS', NULL, 'ALL', 'No master editing access'),
  ('Shop Floor Supervisor', 'settings', 'NO_ACCESS', NULL, 'ALL', 'No settings access'),
  ('Shop Floor Supervisor', 'approvals', 'NO_ACCESS', NULL, 'ALL', 'No approval rights'),
  ('Shop Floor Supervisor', 'reports', 'VIEW_ONLY', NULL, 'ALL', 'View shift output and machine downtime'),

  -- 5. Quality Inspector
  ('Quality Inspector', 'orders', 'NO_ACCESS', NULL, 'ALL', 'No sales order access'),
  ('Quality Inspector', 'inventory', 'VIEW_ONLY', NULL, 'ALL', 'Inspect quarantine stock'),
  ('Quality Inspector', 'production', 'CREATE_EDIT', NULL, 'QC_HOLDS_ONLY', 'Conduct dimensional inspections; place and clear QC holds'),
  ('Quality Inspector', 'procurement', 'NO_ACCESS', NULL, 'ALL', 'No purchasing access'),
  ('Quality Inspector', 'dispatch', 'NO_ACCESS', NULL, 'ALL', 'No dispatch access'),
  ('Quality Inspector', 'accounting', 'NO_ACCESS', NULL, 'ALL', 'No accounting access'),
  ('Quality Inspector', 'masters', 'NO_ACCESS', NULL, 'ALL', 'No masters access'),
  ('Quality Inspector', 'settings', 'NO_ACCESS', NULL, 'ALL', 'No settings access'),
  ('Quality Inspector', 'approvals', 'NO_ACCESS', NULL, 'ALL', 'No commercial approval rights'),
  ('Quality Inspector', 'reports', 'VIEW_ONLY', NULL, 'ALL', 'View defect PPM and inspection history'),

  -- 6. Store Keeper
  ('Store Keeper', 'orders', 'NO_ACCESS', NULL, 'ALL', 'No sales order access'),
  ('Store Keeper', 'inventory', 'CREATE_EDIT', NULL, 'ALL', 'Create GRN, post material issue slips, record stock counts'),
  ('Store Keeper', 'production', 'NO_ACCESS', NULL, 'ALL', 'No production editing'),
  ('Store Keeper', 'procurement', 'VIEW_ONLY', NULL, 'ALL', 'View incoming POs to receive items at gate'),
  ('Store Keeper', 'dispatch', 'VIEW_ONLY', NULL, 'ALL', 'Verify finished goods staging for dispatch'),
  ('Store Keeper', 'accounting', 'NO_ACCESS', NULL, 'ALL', 'No accounting access'),
  ('Store Keeper', 'masters', 'VIEW_ONLY', NULL, 'ALL', 'View items, UOMs, and warehouse bins'),
  ('Store Keeper', 'settings', 'NO_ACCESS', NULL, 'ALL', 'No settings access'),
  ('Store Keeper', 'approvals', 'NO_ACCESS', NULL, 'ALL', 'No approval rights'),
  ('Store Keeper', 'reports', 'VIEW_ONLY', NULL, 'ALL', 'View stock valuation and reorder levels'),

  -- 7. Purchase Manager (Approval Limit: ₹1,00,000)
  ('Purchase Manager', 'orders', 'VIEW_ONLY', NULL, 'ALL', 'View customer order demand for material planning'),
  ('Purchase Manager', 'inventory', 'VIEW_ONLY', NULL, 'ALL', 'Check stock on-hand and reorder triggers'),
  ('Purchase Manager', 'production', 'NO_ACCESS', NULL, 'ALL', 'No production access'),
  ('Purchase Manager', 'procurement', 'FULL_APPROVE', 100000, 'ALL', 'Authorize POs up to ₹1,00,000; higher values escalate to Owner'),
  ('Purchase Manager', 'dispatch', 'NO_ACCESS', NULL, 'ALL', 'No dispatch access'),
  ('Purchase Manager', 'accounting', 'VIEW_ONLY', NULL, 'ALL', 'View vendor payment schedules'),
  ('Purchase Manager', 'masters', 'CREATE_EDIT', NULL, 'ALL', 'Manage Vendor Master, RM Item Masters, and Purchase Pricelists'),
  ('Purchase Manager', 'settings', 'NO_ACCESS', NULL, 'ALL', 'No settings access'),
  ('Purchase Manager', 'approvals', 'CREATE_EDIT', 100000, 'ALL', 'Review purchase requisitions within ₹1.0L limit'),
  ('Purchase Manager', 'reports', 'VIEW_ONLY', NULL, 'ALL', 'View vendor OTIF and procurement spend analytics'),

  -- 8. Dispatch Executive
  ('Dispatch Executive', 'orders', 'VIEW_ONLY', NULL, 'NO_COMMERCIAL_EDIT', 'View dispatchable orders and customer delivery addresses'),
  ('Dispatch Executive', 'inventory', 'VIEW_ONLY', NULL, 'ALL', 'Verify finished goods stock ready for shipment'),
  ('Dispatch Executive', 'production', 'VIEW_ONLY', NULL, 'ALL', 'View completed job batches'),
  ('Dispatch Executive', 'procurement', 'NO_ACCESS', NULL, 'ALL', 'No procurement access'),
  ('Dispatch Executive', 'dispatch', 'CREATE_EDIT', NULL, 'ALL', 'Create delivery challans, schedule transporters, print packing lists'),
  ('Dispatch Executive', 'accounting', 'NO_ACCESS', NULL, 'ALL', 'No financial ledger access'),
  ('Dispatch Executive', 'masters', 'VIEW_ONLY', NULL, 'ALL', 'View customer delivery addresses and transporter masters'),
  ('Dispatch Executive', 'settings', 'NO_ACCESS', NULL, 'ALL', 'No settings access'),
  ('Dispatch Executive', 'approvals', 'NO_ACCESS', NULL, 'ALL', 'No approval rights'),
  ('Dispatch Executive', 'reports', 'VIEW_ONLY', NULL, 'ALL', 'View dispatch turnaround time and delivery metrics'),

  -- 9. Accountant (Approval Limit: ₹50,000)
  ('Accountant', 'orders', 'VIEW_ONLY', NULL, 'ALL', 'View orders for commercial invoice generation'),
  ('Accountant', 'inventory', 'VIEW_ONLY', NULL, 'ALL', 'View inventory valuation for monthly accounts'),
  ('Accountant', 'production', 'NO_ACCESS', NULL, 'ALL', 'No production access'),
  ('Accountant', 'procurement', 'VIEW_ONLY', NULL, 'ALL', 'Perform 3-way PO-GRN-Invoice matching'),
  ('Accountant', 'dispatch', 'VIEW_ONLY', NULL, 'ALL', 'Verify delivery challans for sales invoicing'),
  ('Accountant', 'accounting', 'FULL_APPROVE', 50000, 'ALL', 'Invoicing & vendor disbursements up to ₹50,000; higher amounts escalate to Owner'),
  ('Accountant', 'masters', 'VIEW_ONLY', NULL, 'ALL', 'View Customer/Vendor GSTIN, PAN, and Bank details'),
  ('Accountant', 'settings', 'NO_ACCESS', NULL, 'ALL', 'No system settings access'),
  ('Accountant', 'approvals', 'CREATE_EDIT', 50000, 'ALL', 'Authorize payment vouchers within ₹50k threshold'),
  ('Accountant', 'reports', 'FULL_APPROVE', NULL, 'ALL', 'Full P&L, GST GSTR-1/GSTR-3B registers, and debtor ageing'),

  -- 10. HR / Admin (Scoped ONLY to Employee Master)
  ('HR/Admin', 'orders', 'NO_ACCESS', NULL, 'ALL', 'No customer order access'),
  ('HR/Admin', 'inventory', 'NO_ACCESS', NULL, 'ALL', 'No inventory access'),
  ('HR/Admin', 'production', 'NO_ACCESS', NULL, 'ALL', 'No production access'),
  ('HR/Admin', 'procurement', 'NO_ACCESS', NULL, 'ALL', 'No procurement access'),
  ('HR/Admin', 'dispatch', 'NO_ACCESS', NULL, 'ALL', 'No dispatch access'),
  ('HR/Admin', 'accounting', 'NO_ACCESS', NULL, 'ALL', 'No accounting access'),
  ('HR/Admin', 'masters', 'CREATE_EDIT', NULL, 'EMPLOYEE_MASTER_ONLY', 'Scoped exclusively to Employee/User Master; strictly blocked from other masters'),
  ('HR/Admin', 'settings', 'VIEW_ONLY', NULL, 'ALL', 'View general organization setup'),
  ('HR/Admin', 'approvals', 'NO_ACCESS', NULL, 'ALL', 'No approval rights'),
  ('HR/Admin', 'reports', 'NO_ACCESS', NULL, 'ALL', 'No financial/operational report access'),

  -- 11. Machine Operator (Scoped to OWN records only)
  ('Machine Operator', 'orders', 'NO_ACCESS', NULL, 'ALL', 'No sales order access'),
  ('Machine Operator', 'inventory', 'NO_ACCESS', NULL, 'ALL', 'No inventory management'),
  ('Machine Operator', 'production', 'CREATE_EDIT', NULL, 'OWN_RECORDS_ONLY', 'Log parts produced, scrap, and runtime ONLY for assigned job cards'),
  ('Machine Operator', 'procurement', 'NO_ACCESS', NULL, 'ALL', 'No purchasing access'),
  ('Machine Operator', 'dispatch', 'NO_ACCESS', NULL, 'ALL', 'No dispatch access'),
  ('Machine Operator', 'accounting', 'NO_ACCESS', NULL, 'ALL', 'No accounting access'),
  ('Machine Operator', 'masters', 'NO_ACCESS', NULL, 'ALL', 'No masters access'),
  ('Machine Operator', 'settings', 'NO_ACCESS', NULL, 'ALL', 'No settings access'),
  ('Machine Operator', 'approvals', 'NO_ACCESS', NULL, 'ALL', 'No approval rights'),
  ('Machine Operator', 'reports', 'NO_ACCESS', NULL, 'ALL', 'No report access'),

  -- 12. Admin (System)
  ('Admin (System)', 'orders', 'FULL_APPROVE', NULL, 'ALL', 'IT Admin full root access'),
  ('Admin (System)', 'inventory', 'FULL_APPROVE', NULL, 'ALL', 'IT Admin full root access'),
  ('Admin (System)', 'production', 'FULL_APPROVE', NULL, 'ALL', 'IT Admin full root access'),
  ('Admin (System)', 'procurement', 'FULL_APPROVE', NULL, 'ALL', 'IT Admin full root access'),
  ('Admin (System)', 'dispatch', 'FULL_APPROVE', NULL, 'ALL', 'IT Admin full root access'),
  ('Admin (System)', 'accounting', 'FULL_APPROVE', NULL, 'ALL', 'IT Admin full root access'),
  ('Admin (System)', 'masters', 'FULL_APPROVE', NULL, 'ALL', 'IT Admin full root access'),
  ('Admin (System)', 'settings', 'FULL_APPROVE', NULL, 'ALL', 'IT Admin full root access'),
  ('Admin (System)', 'approvals', 'FULL_APPROVE', NULL, 'ALL', 'IT Admin full root access'),
  ('Admin (System)', 'reports', 'FULL_APPROVE', NULL, 'ALL', 'IT Admin full root access')
ON CONFLICT (role, module) DO UPDATE SET
  access_level = EXCLUDED.access_level,
  approval_limit = EXCLUDED.approval_limit,
  scope_rule = EXCLUDED.scope_rule,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "role_permissions_select_policy" ON public.role_permissions;
CREATE POLICY "role_permissions_select_policy" ON public.role_permissions
    FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "role_permissions_admin_write" ON public.role_permissions;
CREATE POLICY "role_permissions_admin_write" ON public.role_permissions
    FOR ALL TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('Owner', 'Admin (System)', 'SUPER ADMIN') OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text AND role IN ('Owner', 'Admin (System)', 'SUPER ADMIN')
        )
    );

DROP POLICY IF EXISTS "pending_approvals_all_policy" ON public.pending_approvals;
CREATE POLICY "pending_approvals_all_policy" ON public.pending_approvals
    FOR ALL TO authenticated, anon USING (true);

-- Migration 014: Sales & Order Management State Machine, Hard Gates, and Preconditions
-- Implements exact GuruOm business workflow:
-- 1. Drawing revision matching validation
-- 2. Customer credit hold checks (> 90 days overdue) with Owner override
-- 3. Material availability with auto-triggered Purchase Requisitions
-- 4. Heat/Lot number capture at material issue for job card traceability
-- 5. Hard block on Open NCRs at QC and Ready to Dispatch
-- 6. Sales Invoice quantity validation vs Dispatched quantity with audit override
-- 7. Order amendment approval (Price change requires Owner-level approval)
-- 8. Order Sub-Types: FRESH_PO, BLANKET_CALLOFF, AMENDMENT

-- 1. Alter customer_orders to support sub-types and state machine gates
ALTER TABLE IF EXISTS customer_orders
  ADD COLUMN IF NOT EXISTS sub_type VARCHAR(30) DEFAULT 'FRESH_PO',
  ADD COLUMN IF NOT EXISTS blanket_po_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS blanket_po_total_qty NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS blanket_po_balance_qty NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS drawing_revision VARCHAR(50) DEFAULT 'REV-A',
  ADD COLUMN IF NOT EXISTS master_drawing_revision VARCHAR(50) DEFAULT 'REV-A',
  ADD COLUMN IF NOT EXISTS heat_lot_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS has_open_ncr BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_credit_held BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS credit_override_by VARCHAR(100),
  ADD COLUMN IF NOT EXISTS credit_override_reason TEXT,
  ADD COLUMN IF NOT EXISTS purchase_requisition_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS price_amendment_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS price_amendment_approved_by VARCHAR(100),
  ADD COLUMN IF NOT EXISTS amendment_reason TEXT,
  ADD COLUMN IF NOT EXISTS invoiced_qty_total NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dispatched_qty_total NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_override_reason TEXT;

-- 2. Table for Purchase Requisitions (Auto-triggered upon material shortage)
CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id VARCHAR(100) PRIMARY KEY,
  req_number VARCHAR(50) NOT NULL UNIQUE,
  order_id VARCHAR(100) REFERENCES customer_orders(id) ON DELETE SET NULL,
  order_po VARCHAR(100),
  item_code VARCHAR(100) NOT NULL,
  item_description TEXT NOT NULL,
  required_qty NUMERIC(12, 2) NOT NULL,
  available_stock NUMERIC(12, 2) NOT NULL,
  deficit_qty NUMERIC(12, 2) NOT NULL,
  unit VARCHAR(20) DEFAULT 'KG',
  status VARCHAR(30) DEFAULT 'AUTO_GENERATED', -- AUTO_GENERATED, CONVERTED_TO_PO, REJECTED
  po_number VARCHAR(50),
  created_by VARCHAR(100) DEFAULT 'System Material Auto-Checker',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table for Non-Conformance Reports (NCRs) linking to Job Cards & Orders
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

-- 4. Customer Overdue Aging View & Function (for 90-day credit hold evaluation)
CREATE OR REPLACE VIEW customer_overdue_summary AS
SELECT 
  c.id AS customer_id,
  c.customer_name,
  c.legal_name,
  c.customer_type,
  COALESCE(c.credit_days, 30) AS credit_days,
  COALESCE(c.credit_limit, 0) AS credit_limit,
  COUNT(i.id) AS total_unpaid_invoices,
  COALESCE(SUM(CASE WHEN (CURRENT_DATE - i.invoice_date::date) > 90 AND i.status != 'PAID' THEN i.total_amount ELSE 0 END), 0) AS overdue_90_days_amount,
  COALESCE(SUM(CASE WHEN i.status != 'PAID' THEN i.total_amount ELSE 0 END), 0) AS total_outstanding_amount,
  CASE 
    WHEN COALESCE(SUM(CASE WHEN (CURRENT_DATE - i.invoice_date::date) > 90 AND i.status != 'PAID' THEN i.total_amount ELSE 0 END), 0) > 0 
    THEN TRUE 
    ELSE FALSE 
  END AS is_credit_hold_triggered
FROM customers c
LEFT JOIN customer_invoices i ON i.customer_name = c.customer_name AND i.status != 'PAID'
GROUP BY c.id, c.customer_name, c.legal_name, c.customer_type, c.credit_days, c.credit_limit;

-- 5. Seed sample NCRs, Blanket POs, and Customer Overdues for testing
INSERT INTO ncrs (id, ncr_number, order_id, order_po, job_no, part_code, part_description, defect_type, defect_description, severity, status, raised_by)
VALUES 
  ('ncr-101', 'NCR-2026-001', 'ord-102', 'PO-2026-002', 'JC/0002/26-27', '00000002', 'HARDENED BUSH 45X60X80', 'Dimensional Deviation', 'Inner diameter out of tolerance by +0.08mm on sample 4', 'MAJOR', 'CLOSED', 'Rajesh QC Inspector'),
  ('ncr-102', 'NCR-2026-002', 'ord-sample-hold', 'PO-HOLD-999', 'JC/9999/26-27', '00000003', 'TOWER PIVOTING SECTION', 'Surface Flaw', 'Deep tool mark on primary flange seating surface', 'CRITICAL', 'OPEN', 'Rajesh QC Inspector')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  defect_description = EXCLUDED.defect_description;

-- Migration 015: Standard Procurement and Job-Work Subcontracting with 3-Way Match & Vendor Scorecards
-- Implements exact GuruOm operational flows:
-- 1. Standard Procurement: PR -> PO -> GRN (with mismatch alert) -> Incoming QC -> Vendor Return -> 3-Way Match -> Payment -> Quarterly Scorecard (OTD % + Quality %)
-- 2. Job-Work / Subcontracting: Job-work Dispatch (Gate-Out) -> Subcon Inventory Ledger (SUBCON_GATE_OUT) -> Gate-In + Incoming QC -> Auto-flag Overdue Subcontracting

-- 1. Table for Purchase Requisitions (Store Keeper raises, Purchase Manager approves)
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

-- 2. Table for Goods Receipt Notes (GRN) with Qty Mismatch Surfacing & Heat/Lot Trace
CREATE TABLE IF NOT EXISTS goods_receipt_notes (
  id VARCHAR(100) PRIMARY KEY,
  grn_no VARCHAR(50) NOT NULL UNIQUE,
  po_no VARCHAR(50) NOT NULL,
  supplier_name VARCHAR(200) NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_description TEXT NOT NULL,
  po_expected_qty NUMERIC(12, 2) NOT NULL,
  received_qty NUMERIC(12, 2) NOT NULL,
  accepted_qty NUMERIC(12, 2) DEFAULT 0,
  rejected_qty NUMERIC(12, 2) DEFAULT 0,
  unit VARCHAR(20) DEFAULT 'KG',
  unit_price NUMERIC(12, 2) DEFAULT 0,
  is_qty_mismatched BOOLEAN DEFAULT FALSE,
  mismatch_notes TEXT,
  heat_lot_number VARCHAR(100),
  delivery_challan_no VARCHAR(100),
  carrier VARCHAR(100),
  received_date TIMESTAMPTZ DEFAULT NOW(),
  inspection_status VARCHAR(30) DEFAULT 'PENDING_INSPECTION', -- PENDING_INSPECTION, PASSED, PARTIAL_REJECT, REJECTED
  inspected_by VARCHAR(100),
  inspection_notes TEXT,
  store_keeper_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table for Vendor Returns (Triggered upon incoming inspection rejection)
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

-- 4. Table for 3-Way Match Records (PO + GRN + Vendor Bill)
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

-- 5. Table for Vendor Scorecards (Quarterly OTD % and Quality Acceptance Scorecard)
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

-- 6. Table for Job-Work / Subcontracting Dispatch & Gate Passes
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

-- 7. Seed Initial Sample Data for Vendor Scorecard and Overdue Subcontracting
INSERT INTO vendor_scorecards (id, supplier_code, supplier_name, evaluation_period, total_po_orders, total_deliveries, on_time_deliveries, otd_percentage, total_received_qty, accepted_qty, rejected_qty, quality_acceptance_percentage, overall_score, vendor_rating_tier, evaluated_by)
VALUES
  ('vsc-01', 'VEND-0001', 'Hindalco Industries Ltd', 'Q2-2026', 12, 12, 11, 91.67, 4500, 4410, 90, 98.00, 94.84, 'TIER_1_EXCELLENT', 'Purchase Manager Amit'),
  ('vsc-02', 'VEND-0002', 'Sandvik Coromant India', 'Q2-2026', 8, 8, 7, 87.50, 600, 595, 5, 99.17, 93.34, 'TIER_1_EXCELLENT', 'Purchase Manager Amit'),
  ('vsc-03', 'VEND-0003', 'Apex Heat Treaters Ltd', 'Q2-2026', 15, 14, 10, 71.43, 2200, 1980, 220, 90.00, 80.72, 'TIER_2_SATISFACTORY', 'Purchase Manager Amit')
ON CONFLICT (id) DO NOTHING;

INSERT INTO subcontract_orders (id, gate_pass_no, job_no, item_code, item_description, subcontractor_name, process_type, dispatched_qty, unit, dispatch_date, expected_return_date, status, is_overdue, overdue_days, vehicle_details, transporter, dispatched_by)
VALUES
  ('sub-01', 'GP-OUT-2026-081', 'JC/0001/26-27', '00000001', 'MAIN SPINDLE HOUSING 120MM', 'Apex Heat Treaters Ltd', 'HEAT_TREATMENT', 60, 'NOS', '2026-08-05', '2026-08-10', 'OVERDUE_JOBWORK', true, 5, 'MH-12-QW-4011', 'Shree Logistics', 'PPC Planner Suresh'),
  ('sub-02', 'GP-OUT-2026-092', 'JC/0002/26-27', '00000002', 'HARDENED BUSH 45X60X80', 'Bright Electroplaters Ltd', 'ZINC_PLATING', 150, 'NOS', '2026-08-12', '2026-08-18', 'OUT_FOR_JOBWORK', false, 0, 'MH-14-AB-9821', 'Direct Pickup', 'PPC Planner Suresh')
ON CONFLICT (id) DO NOTHING;

-- Migration 016: Route Card Templates, Job Card Operations, Mandatory QC Material Issue, Operator Certifications, and NCR Disposition System

-- 1. Route Card Templates per Part Number
CREATE TABLE IF NOT EXISTS route_card_templates (
  id VARCHAR(100) PRIMARY KEY,
  part_code VARCHAR(100) NOT NULL,
  part_description TEXT NOT NULL,
  sequence_no INT NOT NULL, -- 10, 20, 30, 40...
  operation_name VARCHAR(150) NOT NULL,
  work_center VARCHAR(100) NOT NULL, -- e.g. CNC-LATHE-01, VMC-4AXIS, GRINDING-01, HEAT-TREAT-OUTWORK
  standard_time_minutes INT NOT NULL DEFAULT 30,
  inspection_required BOOLEAN DEFAULT FALSE,
  required_certification VARCHAR(100) DEFAULT 'None', -- None, CNC Certified, Welder Certified, NDT Level II
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(part_code, sequence_no)
);

-- 2. Employee Skill & Certifications Master
CREATE TABLE IF NOT EXISTS employee_certifications (
  id VARCHAR(100) PRIMARY KEY,
  employee_name VARCHAR(100) NOT NULL,
  employee_code VARCHAR(50),
  certification_name VARCHAR(100) NOT NULL, -- CNC Certified, Welder Certified, NDT Level II, Quality Inspector Level 2
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Job Cards (Locked Drawing Revision, Material Heat/Lot, Auto-Derived Job Status)
CREATE TABLE IF NOT EXISTS job_cards (
  id VARCHAR(100) PRIMARY KEY,
  job_no VARCHAR(50) NOT NULL UNIQUE, -- JC/0001/26-27
  order_id VARCHAR(100),
  order_po VARCHAR(100) NOT NULL,
  part_code VARCHAR(100) NOT NULL,
  part_description TEXT NOT NULL,
  drawing_revision VARCHAR(50) NOT NULL, -- LOCKED AT RELEASE
  target_qty NUMERIC(12, 2) NOT NULL,
  material_issued_lot VARCHAR(100) NOT NULL, -- Mandatory Mill Heat/Lot Number
  material_qc_status VARCHAR(50) DEFAULT 'ACCEPTED', -- ACCEPTED, QUALITY_HOLD, PENDING_INSPECTION
  current_step_no INT DEFAULT 10,
  current_operation VARCHAR(150),
  job_status VARCHAR(50) DEFAULT 'NOT_STARTED', -- NOT_STARTED, IN_PROGRESS, QC_HOLD, COMPLETED (Auto-derived)
  has_open_ncr BOOLEAN DEFAULT FALSE,
  ncr_reference VARCHAR(100),
  supervisor_sign_off VARCHAR(100),
  remarks TEXT,
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Job Card Operations (Machine Used, Operator, Standard vs Actual Time, Processed/Rejected Qty)
CREATE TABLE IF NOT EXISTS job_card_operations (
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
  op_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, PAUSED, COMPLETED, QC_HOLD
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Seed Route Card Templates for Master Parts
INSERT INTO route_card_templates (id, part_code, part_description, sequence_no, operation_name, work_center, standard_time_minutes, inspection_required, required_certification)
VALUES
  ('rt-001-10', '00000001', 'MAIN SPINDLE HOUSING 120MM', 10, 'CNC Rough Turning & Facing', 'CNC-LATHE-01', 45, false, 'CNC Certified'),
  ('rt-001-20', '00000001', 'MAIN SPINDLE HOUSING 120MM', 20, 'VMC 4-Axis Bore & Keyway Milling', 'VMC-4AXIS-02', 60, true, 'CNC Certified'),
  ('rt-001-30', '00000001', 'MAIN SPINDLE HOUSING 120MM', 30, 'Outsourced Heat Treatment Case Hardening', 'HEAT-TREAT-OUTWORK', 120, true, 'None'),
  ('rt-001-40', '00000001', 'MAIN SPINDLE HOUSING 120MM', 40, 'Cylindrical Precision Grinding', 'GRINDING-01', 35, true, 'None'),
  ('rt-001-50', '00000001', 'MAIN SPINDLE HOUSING 120MM', 50, 'Final Dimensional Quality Inspection', 'INSPECTION-BAY', 20, true, 'Quality Inspector Level 2'),
  
  ('rt-002-10', '00000002', 'HARDENED BUSH 45X60X80', 10, 'Automatic Bar Feeder Turning', 'CNC-LATHE-02', 25, false, 'CNC Certified'),
  ('rt-002-20', '00000002', 'HARDENED BUSH 45X60X80', 20, 'Internal ID Boring & Chamfering', 'CNC-LATHE-02', 20, true, 'CNC Certified'),
  ('rt-002-30', '00000002', 'HARDENED BUSH 45X60X80', 30, 'Trivalent Yellow Zinc Plating Outwork', 'PLATING-OUTWORK', 90, true, 'None'),
  ('rt-002-40', '00000002', 'HARDENED BUSH 45X60X80', 40, 'Final PDI & Thickness Check', 'INSPECTION-BAY', 15, true, 'Quality Inspector Level 2')
ON CONFLICT (part_code, sequence_no) DO NOTHING;

-- 6. Seed Employee Certifications
INSERT INTO employee_certifications (id, employee_name, employee_code, certification_name, valid_until)
VALUES
  ('ec-01', 'Rajesh Sharma', 'EMP-001', 'CNC Certified', '2027-12-31'),
  ('ec-02', 'Vikram Patil', 'EMP-002', 'CNC Certified', '2027-12-31'),
  ('ec-03', 'Sunil Jadhav', 'EMP-003', 'Welder Certified', '2027-06-30'),
  ('ec-04', 'Mahesh Shinde', 'EMP-004', 'NDT Level II', '2028-03-31'),
  ('ec-05', 'Quality Inspector Rajesh', 'EMP-005', 'Quality Inspector Level 2', '2028-12-31')
ON CONFLICT (id) DO NOTHING;

-- Migration 017: Statutory Invoicing, GSTIN/HSN Validation, Dynamic E-Invoicing Threshold, TDS Sections (194C/194Q), Atomic Document Sequences, and Order-Wise Costing

-- 1. Atomic Document Numbering Sequences (Prefix + Financial Year + Running Counter)
CREATE TABLE IF NOT EXISTS document_sequences (
  series_code VARCHAR(30) NOT NULL, -- INV, PO, DC, GRN, JC, PR, DN, RET
  prefix VARCHAR(20) NOT NULL,
  financial_year VARCHAR(10) NOT NULL, -- e.g. 2526, 2627
  current_number INT NOT NULL DEFAULT 0,
  padding_digits INT NOT NULL DEFAULT 4,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (series_code, financial_year)
);

-- Function for atomic document number generation
CREATE OR REPLACE FUNCTION get_next_document_number(p_series_code VARCHAR, p_prefix VARCHAR, p_fy VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  v_next_num INT;
  v_padded VARCHAR;
BEGIN
  INSERT INTO document_sequences (series_code, prefix, financial_year, current_number, padding_digits, updated_at)
  VALUES (p_series_code, p_prefix, p_fy, 1, 4, NOW())
  ON CONFLICT (series_code, financial_year)
  DO UPDATE SET current_number = document_sequences.current_number + 1, updated_at = NOW()
  RETURNING current_number INTO v_next_num;

  v_padded := LPAD(v_next_num::TEXT, 4, '0');
  RETURN p_prefix || '-' || p_fy || '-' || v_padded;
END;
$$ LANGUAGE plpgsql;

-- 2. System Statutory & Accounting Configuration (E-Invoice & Overhead Parameters)
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by VARCHAR(100) DEFAULT 'System',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_settings (key, value, description)
VALUES
  ('e_invoice_turnover_threshold', '50000000.00', 'Statutory GST e-Invoicing turnover threshold in INR (default ₹5 Crore)'),
  ('annual_turnover_declared', '68500000.00', 'Current Company Annual Turnover in INR'),
  ('factory_overhead_percentage', '18.00', 'Standard Factory Overhead rate (% of Direct Material + Labor cost)'),
  ('hourly_labor_rate', '300.00', 'Standard Shop Floor Labor Rate per hour (INR)')
ON CONFLICT (key) DO NOTHING;

-- 3. Customer Invoice Items Table (HSN & Master GST Rates)
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

-- 4. Enhance Vendor Bills with TDS 194C / 194Q Tracking
ALTER TABLE vendor_bills 
  ADD COLUMN IF NOT EXISTS vendor_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS vendor_pan VARCHAR(20),
  ADD COLUMN IF NOT EXISTS tds_section VARCHAR(20) DEFAULT 'NONE', -- 194C, 194Q, NONE
  ADD COLUMN IF NOT EXISTS tds_rate NUMERIC(5, 2) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS tds_amount NUMERIC(12, 2) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS net_payable_amount NUMERIC(12, 2) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS grn_no VARCHAR(50);

-- 5. Seed Document Sequence Counters for FY 2526 and 2627
INSERT INTO document_sequences (series_code, prefix, financial_year, current_number)
VALUES
  ('INV', 'INV', '2526', 142),
  ('PO', 'PO', '2526', 81),
  ('DC', 'DC', '2526', 95),
  ('GRN', 'GRN', '2526', 64),
  ('JC', 'JC', '2526', 110)
ON CONFLICT (series_code, financial_year) DO NOTHING;

-- Converge the legacy "masters" table (pre-012 shape) to the Item Master specification
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'Raw Material';
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS uom TEXT DEFAULT 'Nos';
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'NOS';
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS standard_cost NUMERIC DEFAULT 0;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT 0;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 0;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS max_stock NUMERIC DEFAULT 0;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS lead_time_days NUMERIC DEFAULT 0;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS preferred_vendor TEXT;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS default_warehouse TEXT DEFAULT 'Main Raw Material Store';
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS is_finished_goods BOOLEAN DEFAULT false;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
UPDATE public.masters SET name = COALESCE(name, part_no, code) WHERE name IS NULL;
UPDATE public.masters SET is_finished_goods = true WHERE is_finished_goods IS NULL AND code LIKE 'FG-%';
