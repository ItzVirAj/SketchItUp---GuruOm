-- ============================================================================
-- 002_master_data.sql
-- Company profile, system settings, item / customer / vendor / machine masters and the atomic numbering counters.
-- Part of the consolidated GuruOm Owner OS schema. Idempotent: safe to re-run.
-- ============================================================================

-- ----- company_profile -----
CREATE TABLE IF NOT EXISTS public.company_profile (
  id text DEFAULT 'main'::text NOT NULL,
  legal_name text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  gstin text NOT NULL,
  pan text NOT NULL,
  state text NOT NULL,
  state_code text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT company_profile_pkey PRIMARY KEY (id)
);
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company profile access" ON public.company_profile;
CREATE POLICY "Company profile access" ON public.company_profile FOR ALL
  USING (true);

-- ----- system_settings -----
CREATE TABLE IF NOT EXISTS public.system_settings (
  key character varying(100) NOT NULL,
  value text NOT NULL,
  description text,
  updated_by character varying(100) DEFAULT 'System'::character varying,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_settings_pkey PRIMARY KEY (key)
);

-- ----- masters -----
CREATE TABLE IF NOT EXISTS public.masters (
  id text NOT NULL,
  code text NOT NULL,
  name text,
  item_type text DEFAULT 'Raw Material'::text NOT NULL,
  category text,
  part_no text NOT NULL,
  description text NOT NULL,
  uom text DEFAULT 'Nos'::text NOT NULL,
  unit text DEFAULT 'NOS'::text NOT NULL,
  hsn_code text NOT NULL,
  gst_rate numeric DEFAULT 18 NOT NULL,
  standard_cost numeric DEFAULT 0,
  selling_price numeric DEFAULT 0,
  min_stock numeric DEFAULT 0,
  max_stock numeric DEFAULT 0,
  reorder_level numeric DEFAULT 10 NOT NULL,
  lead_time_days numeric DEFAULT 0,
  preferred_vendor text,
  default_warehouse text DEFAULT 'Main Raw Material Store'::text,
  store_location text DEFAULT 'A1-RACK-1'::text NOT NULL,
  is_finished_goods boolean DEFAULT true NOT NULL,
  sale_rate numeric DEFAULT 0 NOT NULL,
  purchase_rate numeric DEFAULT 0 NOT NULL,
  status text DEFAULT 'Active'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT masters_pkey PRIMARY KEY (id),
  CONSTRAINT masters_code_key UNIQUE (code)
);
CREATE INDEX IF NOT EXISTS idx_masters_code ON public.masters USING btree (code);
CREATE INDEX IF NOT EXISTS idx_masters_item_type ON public.masters USING btree (item_type);
CREATE INDEX IF NOT EXISTS idx_masters_status ON public.masters USING btree (status);
ALTER TABLE public.masters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Masters access" ON public.masters;
CREATE POLICY "Masters access" ON public.masters FOR ALL
  USING (true);

-- ----- customer_masters -----
CREATE TABLE IF NOT EXISTS public.customer_masters (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  legal_name text,
  customer_type text DEFAULT 'OEM'::text,
  gstin text NOT NULL,
  pan text NOT NULL,
  address text NOT NULL,
  shipping_address text,
  city text NOT NULL,
  state text NOT NULL,
  state_code text DEFAULT '27'::text,
  pin text,
  email text,
  contact text NOT NULL,
  contact_person text,
  credit_days numeric DEFAULT 30,
  payment_terms text DEFAULT 'Net 30'::text,
  credit_limit numeric DEFAULT 1000000,
  salesperson text,
  status text DEFAULT 'Active'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  mobile text,
  billing_address text,
  pincode text,
  CONSTRAINT customer_masters_pkey PRIMARY KEY (id),
  CONSTRAINT customer_masters_code_key UNIQUE (code)
);
CREATE INDEX IF NOT EXISTS idx_customer_masters_code ON public.customer_masters USING btree (code);
CREATE INDEX IF NOT EXISTS idx_customer_masters_name ON public.customer_masters USING btree (lower(name));
CREATE INDEX IF NOT EXISTS idx_customer_masters_status ON public.customer_masters USING btree (status);
ALTER TABLE public.customer_masters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customer masters access" ON public.customer_masters;
CREATE POLICY "Customer masters access" ON public.customer_masters FOR ALL
  USING (true);

-- ----- vendor_masters -----
CREATE TABLE IF NOT EXISTS public.vendor_masters (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  legal_name text,
  vendor_type text DEFAULT 'Supplier'::text,
  vendor_category text DEFAULT 'Raw Material'::text,
  gstin text NOT NULL,
  pan text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  state_code text DEFAULT '27'::text,
  pin text,
  email text,
  contact text NOT NULL,
  contact_person text,
  payment_terms text DEFAULT 'Net 30'::text,
  credit_days numeric DEFAULT 30,
  credit_limit numeric DEFAULT 500000,
  bank_account_name text,
  bank_account_number text,
  ifsc text,
  status text DEFAULT 'Active'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  mobile text,
  billing_address text,
  pincode text,
  shipping_address text,
  CONSTRAINT vendor_masters_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_masters_code_key UNIQUE (code)
);
CREATE INDEX IF NOT EXISTS idx_vendor_masters_code ON public.vendor_masters USING btree (code);
CREATE INDEX IF NOT EXISTS idx_vendor_masters_status ON public.vendor_masters USING btree (status);
CREATE INDEX IF NOT EXISTS idx_vendor_masters_type ON public.vendor_masters USING btree (vendor_type);
ALTER TABLE public.vendor_masters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vendor masters access" ON public.vendor_masters;
CREATE POLICY "Vendor masters access" ON public.vendor_masters FOR ALL
  USING (true);

-- ----- machine_masters -----
CREATE TABLE IF NOT EXISTS public.machine_masters (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  status text DEFAULT 'RUNNING'::text NOT NULL,
  hourly_cost numeric DEFAULT 500 NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  machine_type text DEFAULT 'CNC Machining'::text,
  department text,
  location text,
  shift text DEFAULT 'General-Day'::text,
  responsible_person text,
  manufacturer text,
  model text,
  serial_number text,
  installation_date text,
  capacity numeric,
  capacity_uom text,
  CONSTRAINT machine_masters_pkey PRIMARY KEY (id),
  CONSTRAINT machine_masters_code_key UNIQUE (code)
);
CREATE INDEX IF NOT EXISTS idx_machine_masters_code ON public.machine_masters USING btree (code);
CREATE INDEX IF NOT EXISTS idx_machine_masters_name ON public.machine_masters USING btree (name);
CREATE INDEX IF NOT EXISTS idx_machine_masters_status ON public.machine_masters USING btree (status);
ALTER TABLE public.machine_masters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Machine masters access" ON public.machine_masters;
CREATE POLICY "Machine masters access" ON public.machine_masters FOR ALL
  USING (true);

-- ----- master_code_counters -----
CREATE TABLE IF NOT EXISTS public.master_code_counters (
  entity_type character varying(50) NOT NULL,
  prefix character varying(20) NOT NULL,
  current_value bigint DEFAULT 0 NOT NULL,
  padding_digits integer DEFAULT 4 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT master_code_counters_pkey PRIMARY KEY (entity_type, prefix)
);
ALTER TABLE public.master_code_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Master code counters service access" ON public.master_code_counters;
CREATE POLICY "Master code counters service access" ON public.master_code_counters FOR ALL
  USING (true);

-- ----- document_sequences -----
CREATE TABLE IF NOT EXISTS public.document_sequences (
  series_code character varying(30) NOT NULL,
  prefix character varying(20) NOT NULL,
  financial_year character varying(10) NOT NULL,
  current_number integer DEFAULT 0 NOT NULL,
  padding_digits integer DEFAULT 4 NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT document_sequences_pkey PRIMARY KEY (series_code, financial_year)
);

-- ----- job_number_counters -----
CREATE TABLE IF NOT EXISTS public.job_number_counters (
  prefix character varying(20) DEFAULT 'JC'::character varying NOT NULL,
  fiscal_year character varying(20) DEFAULT '26-27'::character varying NOT NULL,
  current_value bigint DEFAULT 0 NOT NULL,
  padding_digits integer DEFAULT 4 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT job_number_counters_pkey PRIMARY KEY (prefix, fiscal_year)
);
ALTER TABLE public.job_number_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Job number counters service access" ON public.job_number_counters;
CREATE POLICY "Job number counters service access" ON public.job_number_counters FOR ALL
  USING (true);

-- ----- functions -----
CREATE OR REPLACE FUNCTION public.get_next_master_code(p_entity_type character varying, p_prefix character varying)
 RETURNS character varying
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next_num BIGINT;
  v_padded VARCHAR;
  v_clean_prefix VARCHAR;
  v_clean_entity VARCHAR;
BEGIN
  v_clean_prefix := UPPER(TRIM(p_prefix));
  v_clean_entity := UPPER(TRIM(p_entity_type));

  INSERT INTO public.master_code_counters (entity_type, prefix, current_value, padding_digits, updated_at)
  VALUES (v_clean_entity, v_clean_prefix, 1, 4, NOW())
  ON CONFLICT (entity_type, prefix)
  DO UPDATE SET
    current_value = public.master_code_counters.current_value + 1,
    updated_at = NOW()
  RETURNING current_value INTO v_next_num;

  v_padded := LPAD(v_next_num::TEXT, 4, '0');
  RETURN v_clean_prefix || '-' || v_padded;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_next_document_number(p_series_code character varying, p_prefix character varying, p_fy character varying)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_next_job_number(p_prefix character varying DEFAULT 'JC'::character varying, p_fiscal_year character varying DEFAULT '26-27'::character varying)
 RETURNS character varying
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next_num BIGINT;
  v_padded VARCHAR;
  v_clean_prefix VARCHAR;
  v_clean_fy VARCHAR;
BEGIN
  v_clean_prefix := COALESCE(NULLIF(UPPER(TRIM(p_prefix)), ''), 'JC');
  v_clean_fy := COALESCE(NULLIF(TRIM(p_fiscal_year), ''), '26-27');

  INSERT INTO public.job_number_counters (prefix, fiscal_year, current_value, padding_digits, updated_at)
  VALUES (v_clean_prefix, v_clean_fy, 1, 4, NOW())
  ON CONFLICT (prefix, fiscal_year)
  DO UPDATE SET
    current_value = public.job_number_counters.current_value + 1,
    updated_at = NOW()
  RETURNING current_value INTO v_next_num;

  v_padded := CASE WHEN LENGTH(v_next_num::TEXT) < 4 THEN LPAD(v_next_num::TEXT, 4, '0') ELSE v_next_num::TEXT END;
  RETURN v_clean_prefix || '/' || v_padded || '/' || v_clean_fy;
END;
$function$;
