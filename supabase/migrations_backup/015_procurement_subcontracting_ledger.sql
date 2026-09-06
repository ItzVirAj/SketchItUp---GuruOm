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
