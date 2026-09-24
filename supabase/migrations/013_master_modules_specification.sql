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

-- Ensure extended columns exist if masters table was created in an earlier migration
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'Raw Material';
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS uom TEXT DEFAULT 'Nos';
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS gst_rate NUMERIC DEFAULT 18;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS standard_cost NUMERIC DEFAULT 0;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT 0;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 0;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS max_stock NUMERIC DEFAULT 0;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS lead_time_days NUMERIC DEFAULT 0;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS preferred_vendor TEXT;
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS default_warehouse TEXT DEFAULT 'Main Raw Material Store';
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

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

-- 7. Realtime Publication safely
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY['customer_masters', 'vendor_masters', 'masters', 'machine_masters', 'users'];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY tbls LOOP
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = tbl
        ) THEN
          EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.' || quote_ident(tbl);
        END IF;
      END IF;
    END LOOP;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
