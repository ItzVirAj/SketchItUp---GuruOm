-- ============================================================================
-- Migration 018: Complete Master Tables (Customer, Vendor, Machine, Item)
-- Safe to run even if tables were partially created by migrations 006 or 012.
-- Uses CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS.
-- Apply this in the Supabase SQL Editor before running seed-master-data.ts.
-- ============================================================================

-- ============================================================
-- 1. CUSTOMER MASTERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customer_masters (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    legal_name TEXT,
    customer_type TEXT NOT NULL DEFAULT 'OEM'
        CHECK (customer_type IN ('Dealer', 'Distributor', 'OEM', 'Retailer', 'Corporate', 'Export', 'Other')),
    contact_person TEXT,
    mobile TEXT,
    email TEXT,
    gstin TEXT NOT NULL DEFAULT '',
    pan TEXT,
    billing_address TEXT,
    shipping_address TEXT,
    city TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL DEFAULT '',
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

-- Add columns that Migration 006 may have missed
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_masters' AND column_name='contact_person') THEN
    ALTER TABLE public.customer_masters ADD COLUMN contact_person TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_masters' AND column_name='mobile') THEN
    ALTER TABLE public.customer_masters ADD COLUMN mobile TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_masters' AND column_name='billing_address') THEN
    ALTER TABLE public.customer_masters ADD COLUMN billing_address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_masters' AND column_name='pincode') THEN
    ALTER TABLE public.customer_masters ADD COLUMN pincode TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customer_masters_code   ON public.customer_masters(code);
CREATE INDEX IF NOT EXISTS idx_customer_masters_status ON public.customer_masters(status);
CREATE INDEX IF NOT EXISTS idx_customer_masters_name   ON public.customer_masters(LOWER(name));

-- ============================================================
-- 2. VENDOR MASTERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vendor_masters (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    legal_name TEXT,
    vendor_type TEXT NOT NULL DEFAULT 'Supplier'
        CHECK (vendor_type IN ('Supplier', 'Transporter', 'Subcontractor / Job Worker',
                               'ServiceProvider', 'EquipmentVendor', 'ProfessionalService',
                               'ManpowerProvider', 'Other')),
    vendor_category TEXT NOT NULL DEFAULT 'Raw Material'
        CHECK (vendor_category IN ('Raw Material', 'Components', 'Consumables', 'Packaging',
                                   'Machinery', 'Maintenance', 'Transport', 'IT',
                                   'Professional', 'Manpower', 'Other')),
    contact_person TEXT,
    mobile TEXT,
    email TEXT,
    billing_address TEXT,
    shipping_address TEXT,
    city TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL DEFAULT '',
    state_code TEXT DEFAULT '27',
    pincode TEXT,
    payment_terms TEXT NOT NULL DEFAULT 'Net 30'
        CHECK (payment_terms IN ('Advance', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Other')),
    credit_days NUMERIC DEFAULT 0 CHECK (credit_days >= 0 AND credit_days <= 180),
    credit_limit NUMERIC DEFAULT 0 CHECK (credit_limit >= 0),
    gstin TEXT,
    pan TEXT NOT NULL DEFAULT '',
    bank_account_name TEXT NOT NULL DEFAULT '',
    bank_account_number TEXT NOT NULL DEFAULT '',
    ifsc TEXT NOT NULL DEFAULT '',
    process_type TEXT,
    turnaround_time_days NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Active'
        CHECK (status IN ('Active', 'Inactive')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns that Migration 006 may have missed
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendor_masters' AND column_name='contact_person') THEN
    ALTER TABLE public.vendor_masters ADD COLUMN contact_person TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendor_masters' AND column_name='mobile') THEN
    ALTER TABLE public.vendor_masters ADD COLUMN mobile TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendor_masters' AND column_name='billing_address') THEN
    ALTER TABLE public.vendor_masters ADD COLUMN billing_address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendor_masters' AND column_name='pincode') THEN
    ALTER TABLE public.vendor_masters ADD COLUMN pincode TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendor_masters' AND column_name='vendor_category') THEN
    ALTER TABLE public.vendor_masters ADD COLUMN vendor_category TEXT NOT NULL DEFAULT 'Raw Material';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vendor_masters_code   ON public.vendor_masters(code);
CREATE INDEX IF NOT EXISTS idx_vendor_masters_type   ON public.vendor_masters(vendor_type);
CREATE INDEX IF NOT EXISTS idx_vendor_masters_status ON public.vendor_masters(status);

-- ============================================================
-- 3. MACHINE MASTERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.machine_masters (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    machine_type TEXT NOT NULL DEFAULT 'CNC Machining'
        CHECK (machine_type IN ('Cutting', 'Welding', 'CNC Turning', 'CNC Machining',
                                'Conventional Machining', 'Grinding', 'Inspection-CMM', 'Other')),
    type TEXT,
    department TEXT,
    location TEXT,
    manufacturer TEXT,
    model TEXT,
    serial_number TEXT,
    installation_date TEXT,
    capacity NUMERIC,
    capacity_uom TEXT,
    operating_hours NUMERIC DEFAULT 8 CHECK (operating_hours >= 0 AND operating_hours <= 24),
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

-- Add columns that Migration 006 may have missed
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machine_masters' AND column_name='machine_type') THEN
    ALTER TABLE public.machine_masters ADD COLUMN machine_type TEXT DEFAULT 'CNC Machining';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machine_masters' AND column_name='department') THEN
    ALTER TABLE public.machine_masters ADD COLUMN department TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machine_masters' AND column_name='location') THEN
    ALTER TABLE public.machine_masters ADD COLUMN location TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machine_masters' AND column_name='shift') THEN
    ALTER TABLE public.machine_masters ADD COLUMN shift TEXT DEFAULT 'General-Day';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machine_masters' AND column_name='responsible_person') THEN
    ALTER TABLE public.machine_masters ADD COLUMN responsible_person TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_machine_masters_code   ON public.machine_masters(code);
CREATE INDEX IF NOT EXISTS idx_machine_masters_status ON public.machine_masters(status);

-- ============================================================
-- 4. ITEM MASTERS (masters table)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.masters (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL UNIQUE,
    name TEXT,
    item_type TEXT DEFAULT 'Raw Material'
        CHECK (item_type IN ('Raw Material', 'Semi-Finished', 'Finished Good',
                             'Consumable', 'Bought-Out', 'Other')),
    category TEXT,
    description TEXT,
    part_no TEXT,
    unit TEXT DEFAULT 'Nos',
    uom TEXT DEFAULT 'Nos',
    hsn_code TEXT NOT NULL DEFAULT '',
    gst_rate NUMERIC DEFAULT 18
        CHECK (gst_rate IN (0, 5, 12, 18, 28)),
    standard_cost NUMERIC DEFAULT 0,
    selling_price NUMERIC DEFAULT 0,
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

-- Patch columns that the migration-001 version of masters is missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='masters' AND column_name='name') THEN
    ALTER TABLE public.masters ADD COLUMN name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='masters' AND column_name='item_type') THEN
    ALTER TABLE public.masters ADD COLUMN item_type TEXT DEFAULT 'Raw Material';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='masters' AND column_name='category') THEN
    ALTER TABLE public.masters ADD COLUMN category TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='masters' AND column_name='uom') THEN
    ALTER TABLE public.masters ADD COLUMN uom TEXT DEFAULT 'Nos';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='masters' AND column_name='gst_rate') THEN
    ALTER TABLE public.masters ADD COLUMN gst_rate NUMERIC DEFAULT 18;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='masters' AND column_name='standard_cost') THEN
    ALTER TABLE public.masters ADD COLUMN standard_cost NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='masters' AND column_name='selling_price') THEN
    ALTER TABLE public.masters ADD COLUMN selling_price NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='masters' AND column_name='min_stock') THEN
    ALTER TABLE public.masters ADD COLUMN min_stock NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='masters' AND column_name='max_stock') THEN
    ALTER TABLE public.masters ADD COLUMN max_stock NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='masters' AND column_name='lead_time_days') THEN
    ALTER TABLE public.masters ADD COLUMN lead_time_days NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='masters' AND column_name='preferred_vendor') THEN
    ALTER TABLE public.masters ADD COLUMN preferred_vendor TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='masters' AND column_name='default_warehouse') THEN
    ALTER TABLE public.masters ADD COLUMN default_warehouse TEXT DEFAULT 'Main Raw Material Store';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='masters' AND column_name='status') THEN
    ALTER TABLE public.masters ADD COLUMN status TEXT NOT NULL DEFAULT 'Active';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_masters_code      ON public.masters(code);
CREATE INDEX IF NOT EXISTS idx_masters_status    ON public.masters(status);
-- Only create item_type index once the column is confirmed to exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='masters' AND column_name='item_type') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='masters' AND indexname='idx_masters_item_type') THEN
      CREATE INDEX idx_masters_item_type ON public.masters(item_type);
    END IF;
  END IF;
END $$;


-- ============================================================
-- 5. RLS POLICIES (idempotent)
-- ============================================================
ALTER TABLE public.customer_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_masters    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_masters   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.masters           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customer masters open access" ON public.customer_masters;
CREATE POLICY "Customer masters open access" ON public.customer_masters FOR ALL USING (true);

DROP POLICY IF EXISTS "Vendor masters open access" ON public.vendor_masters;
CREATE POLICY "Vendor masters open access" ON public.vendor_masters FOR ALL USING (true);

DROP POLICY IF EXISTS "Machine masters open access" ON public.machine_masters;
CREATE POLICY "Machine masters open access" ON public.machine_masters FOR ALL USING (true);

DROP POLICY IF EXISTS "Masters items open access" ON public.masters;
CREATE POLICY "Masters items open access" ON public.masters FOR ALL USING (true);

-- ============================================================
-- 6. REALTIME PUBLICATION safely
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY['customer_masters', 'vendor_masters', 'machine_masters', 'masters'];
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
