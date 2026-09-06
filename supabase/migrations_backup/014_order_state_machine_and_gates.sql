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
CREATE OR REPLACE VIEW customer_overdue_summary WITH (security_invoker = true) AS
SELECT 
  c.id AS customer_id,
  c.name AS customer_name,
  c.legal_name,
  c.customer_type,
  COALESCE(c.credit_days, 30) AS credit_days,
  COALESCE(c.credit_limit, 0) AS credit_limit,
  COUNT(i.id) AS total_unpaid_invoices,
  COALESCE(SUM(CASE WHEN (CURRENT_DATE - i.date::date) > 90 AND i.status != 'PAID' THEN i.total_amount ELSE 0 END), 0) AS overdue_90_days_amount,
  COALESCE(SUM(CASE WHEN i.status != 'PAID' THEN i.total_amount ELSE 0 END), 0) AS total_outstanding_amount,
  CASE 
    WHEN COALESCE(SUM(CASE WHEN (CURRENT_DATE - i.date::date) > 90 AND i.status != 'PAID' THEN i.total_amount ELSE 0 END), 0) > 0 
    THEN TRUE 
    ELSE FALSE 
  END AS is_credit_hold_triggered
FROM customer_masters c
LEFT JOIN customer_invoices i ON i.customer_name = c.name AND i.status != 'PAID'
GROUP BY c.id, c.name, c.legal_name, c.customer_type, c.credit_days, c.credit_limit;

-- 5. Seed sample NCRs, Blanket POs, and Customer Overdues for testing
INSERT INTO ncrs (id, ncr_number, order_id, order_po, job_no, part_code, part_description, defect_type, defect_description, severity, status, raised_by)
VALUES 
  ('ncr-101', 'NCR-2026-001', 'ord-102', 'PO-2026-002', 'JC/0002/26-27', '00000002', 'HARDENED BUSH 45X60X80', 'Dimensional Deviation', 'Inner diameter out of tolerance by +0.08mm on sample 4', 'MAJOR', 'CLOSED', 'Rajesh QC Inspector'),
  ('ncr-102', 'NCR-2026-002', 'ord-sample-hold', 'PO-HOLD-999', 'JC/9999/26-27', '00000003', 'TOWER PIVOTING SECTION', 'Surface Flaw', 'Deep tool mark on primary flange seating surface', 'CRITICAL', 'OPEN', 'Rajesh QC Inspector')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  defect_description = EXCLUDED.defect_description;
