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
