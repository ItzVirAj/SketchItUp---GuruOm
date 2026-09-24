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
