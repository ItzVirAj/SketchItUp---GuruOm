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
