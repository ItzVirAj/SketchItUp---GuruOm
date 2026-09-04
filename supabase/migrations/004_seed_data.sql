-- ===================================================
-- Migration 004: Default Initial Seed Data
-- ===================================================

-- Company Profile
INSERT INTO public.company_profile (id, legal_name, address, phone, email, gstin, pan, state, state_code)
VALUES (
  'main',
  'GuruOm Industries LLP',
  'Sr No 15/2, Mataji Logistic Park, Behind Tilakraj CNG Pump, Urali Devachi, Pune 412308, India',
  '+91 9763 969 798',
  'contact@guruom.in',
  '27AABCG1234F1Z5',
  'AABCG1234F',
  'Maharashtra',
  '27'
) ON CONFLICT (id) DO UPDATE SET
  legal_name = EXCLUDED.legal_name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  gstin = EXCLUDED.gstin,
  pan = EXCLUDED.pan,
  state = EXCLUDED.state,
  state_code = EXCLUDED.state_code;

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
