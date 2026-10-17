-- ============================================================================
-- GuruOm Owner OS  --  apply_all_migrations.sql
-- ============================================================================
-- ONE-TIME SETUP: paste this whole file into the Supabase SQL Editor and run.
--
-- This is the single-file concatenation of supabase/migrations/001 ... 011
-- (in order) wrapped in one transaction: either everything applies or nothing does.
-- It is idempotent, so running it again (or on a project that already has data)
-- is safe: it never drops or deletes data and never overwrites seeded settings.
--
-- Contents
--   001_auth_and_access_control.sql
--   002_master_data.sql
--   003_sales_orders_and_dispatch.sql
--   004_inventory_and_procurement.sql
--   005_production_and_quality.sql
--   006_documents_and_notifications.sql
--   007_finance_and_invoicing.sql
--   008_hr_and_workforce.sql
--   009_security_grants_and_realtime.sql
--   010_reference_data.sql
--   011_item_category_and_dimensions.sql
--
-- What it does NOT contain: demo / test / company-specific data (no users, orders,
-- items, customers, vendors, machines, invoices, counters or credentials).
-- After the first run create your first login:   npx tsx scripts/create-server-admin.ts
-- Then load masters from the app or the scripts in /scripts (seed-*.ts) if you want them.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 001_auth_and_access_control.sql
-- Authentication, sessions, RBAC (roles / permissions / grants) and immutable audit trails.
-- Part of the consolidated GuruOm Owner OS schema. Idempotent: safe to re-run.
-- ============================================================================

-- ----- users -----
CREATE TABLE IF NOT EXISTS public.users (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text DEFAULT 'Machine Operator'::text NOT NULL,
  department text,
  phone text,
  status text DEFAULT 'ACTIVE'::text NOT NULL,
  org_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  is_temporary_password boolean DEFAULT false NOT NULL,
  failed_login_attempts integer DEFAULT 0 NOT NULL,
  lockout_until timestamp with time zone,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  user_id text,
  employee_code text,
  user_role text DEFAULT 'Machine Operator'::text,
  mobile text,
  access_level text DEFAULT 'Edit'::text,
  modules_access text[] DEFAULT ARRAY['production'::text],
  reporting_manager text,
  shift text DEFAULT 'General-Day'::text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_user_id_key UNIQUE (user_id),
  CONSTRAINT users_role_canonical_check CHECK (((role IS NULL) OR (role = ANY (ARRAY['ServerAdmin'::text, 'Owner'::text, 'Sales/Order Desk'::text, 'Production Planner'::text, 'Shop Floor Supervisor'::text, 'Quality Inspector'::text, 'Quality Auditor'::text, 'Store Keeper'::text, 'Purchase Manager'::text, 'Dispatch Executive'::text, 'Accountant'::text, 'HR/Admin'::text, 'Machine Operator'::text, 'Admin (System)'::text, 'Subcontractor Coordinator'::text, 'Client'::text, 'TESTER'::text])))),
  CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'REVOKED'::text, 'SUSPENDED'::text])))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users USING btree (lower(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users USING btree (role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users USING btree (status);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on users" ON public.users;
CREATE POLICY "Service role full access on users" ON public.users FOR ALL
  USING (true);

-- ----- sessions -----
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  refresh_token_hash text NOT NULL,
  user_agent text,
  ip_address text,
  expires_at timestamp with time zone NOT NULL,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  token_family_id uuid DEFAULT gen_random_uuid(),
  device_type text DEFAULT 'desktop'::text,
  device_name text DEFAULT 'Unknown Device'::text,
  browser text,
  browser_version text,
  os text,
  os_version text,
  country text DEFAULT 'India'::text,
  region text,
  city text DEFAULT 'Mumbai'::text,
  latitude double precision,
  longitude double precision,
  risk_score integer DEFAULT 0,
  risk_level text DEFAULT 'LOW'::text,
  last_used_at timestamp with time zone DEFAULT now(),
  revoked_reason text,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_refresh_token_hash_key UNIQUE (refresh_token_hash),
  CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT sessions_risk_level_check CHECK ((risk_level = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text])))
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked_at ON public.sessions USING btree (revoked_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token_family_id ON public.sessions USING btree (token_family_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON public.sessions USING btree (refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_last_used ON public.sessions USING btree (user_id, last_used_at DESC);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on sessions" ON public.sessions;
CREATE POLICY "Service role full access on sessions" ON public.sessions FOR ALL
  USING (true);

-- ----- security_events -----
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  session_id uuid,
  event_type text NOT NULL,
  severity text DEFAULT 'INFO'::text NOT NULL,
  ip_address text,
  user_agent text,
  device_name text,
  device_type text,
  browser text,
  os text,
  country text,
  region text,
  city text,
  risk_score integer DEFAULT 0,
  risk_level text DEFAULT 'LOW'::text,
  flagged_reasons text[] DEFAULT ARRAY[]::text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT security_events_pkey PRIMARY KEY (id),
  CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT security_events_risk_level_check CHECK ((risk_level = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text]))),
  CONSTRAINT security_events_severity_check CHECK ((severity = ANY (ARRAY['INFO'::text, 'LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text])))
);
CREATE INDEX IF NOT EXISTS idx_sec_events_created_at ON public.security_events USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_events_event_type ON public.security_events USING btree (event_type);
CREATE INDEX IF NOT EXISTS idx_sec_events_severity ON public.security_events USING btree (severity);
CREATE INDEX IF NOT EXISTS idx_sec_events_user_id ON public.security_events USING btree (user_id, created_at DESC);
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on security_events" ON public.security_events;
CREATE POLICY "Service role full access on security_events" ON public.security_events FOR ALL
  USING (true);

-- ----- profiles -----
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  role text DEFAULT 'OPERATOR'::text NOT NULL,
  department text,
  phone text,
  status text DEFAULT 'ACTIVE'::text NOT NULL,
  last_login text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_email_key UNIQUE (email),
  CONSTRAINT profiles_user_id_key UNIQUE (user_id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow delete for authenticated and anon" ON public.profiles;
CREATE POLICY "Allow delete for authenticated and anon" ON public.profiles FOR DELETE
  USING (true);
DROP POLICY IF EXISTS "Allow insert for authenticated and anon" ON public.profiles;
CREATE POLICY "Allow insert for authenticated and anon" ON public.profiles FOR INSERT
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow select for authenticated and anon" ON public.profiles;
CREATE POLICY "Allow select for authenticated and anon" ON public.profiles FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Allow update for authenticated and anon" ON public.profiles;
CREATE POLICY "Allow update for authenticated and anon" ON public.profiles FOR UPDATE
  USING (true);

-- ----- roles -----
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  tier integer NOT NULL,
  description text,
  is_system boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT roles_pkey PRIMARY KEY (id),
  CONSTRAINT roles_name_key UNIQUE (name)
);
CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles USING btree (name);
CREATE INDEX IF NOT EXISTS idx_roles_tier ON public.roles USING btree (tier);

-- ----- permissions -----
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  key text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT permissions_pkey PRIMARY KEY (id),
  CONSTRAINT permissions_key_key UNIQUE (key)
);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON public.permissions USING btree (category);
CREATE INDEX IF NOT EXISTS idx_permissions_key ON public.permissions USING btree (key);

-- ----- role_permission_grants -----
CREATE TABLE IF NOT EXISTS public.role_permission_grants (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT role_permission_grants_pkey PRIMARY KEY (id),
  CONSTRAINT role_permission_grants_role_id_permission_id_key UNIQUE (role_id, permission_id),
  CONSTRAINT role_permission_grants_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  CONSTRAINT role_permission_grants_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_role_permission_grants_perm ON public.role_permission_grants USING btree (permission_id);
CREATE INDEX IF NOT EXISTS idx_role_permission_grants_role ON public.role_permission_grants USING btree (role_id);

-- ----- user_permission_overrides -----
CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  permission_key text NOT NULL,
  effect text NOT NULL,
  granted_by uuid,
  reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT user_permission_overrides_pkey PRIMARY KEY (id),
  CONSTRAINT user_permission_overrides_user_id_permission_key_key UNIQUE (user_id, permission_key),
  CONSTRAINT user_permission_overrides_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES users(id),
  CONSTRAINT user_permission_overrides_permission_key_fkey FOREIGN KEY (permission_key) REFERENCES permissions(key) ON DELETE CASCADE,
  CONSTRAINT user_permission_overrides_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT user_permission_overrides_effect_check CHECK ((effect = ANY (ARRAY['GRANTED'::text, 'REVOKED'::text])))
);
CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_perm ON public.user_permission_overrides USING btree (permission_key);
CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_user ON public.user_permission_overrides USING btree (user_id);

-- ----- role_permissions -----
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  role text NOT NULL,
  module text NOT NULL,
  access_level text NOT NULL,
  approval_limit numeric,
  scope_rule text DEFAULT 'ALL'::text,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by text DEFAULT 'SYSTEM'::text,
  CONSTRAINT role_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT role_permissions_role_module_key UNIQUE (role, module),
  CONSTRAINT role_permissions_access_level_check CHECK ((access_level = ANY (ARRAY['NO_ACCESS'::text, 'VIEW_ONLY'::text, 'CREATE_EDIT'::text, 'FULL_APPROVE'::text]))),
  CONSTRAINT role_permissions_scope_rule_check CHECK ((scope_rule = ANY (ARRAY['ALL'::text, 'OWN_RECORDS_ONLY'::text, 'EMPLOYEE_MASTER_ONLY'::text, 'QC_HOLDS_ONLY'::text, 'NO_COMMERCIAL_EDIT'::text])))
);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_mod ON public.role_permissions USING btree (role, module);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "role_permissions_admin_write" ON public.role_permissions;
CREATE POLICY "role_permissions_admin_write" ON public.role_permissions FOR ALL TO authenticated
  USING (((auth.jwt() ->> 'role'::text) = ANY (ARRAY['Owner'::text, 'Admin (System)'::text, 'SUPER ADMIN'::text])) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['Owner'::text, 'Admin (System)'::text, 'SUPER ADMIN'::text]))))));
DROP POLICY IF EXISTS "role_permissions_select_policy" ON public.role_permissions;
CREATE POLICY "role_permissions_select_policy" ON public.role_permissions FOR SELECT TO anon, authenticated
  USING (true);

-- ----- admin_audit_log -----
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  actor_id uuid,
  actor_email text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  target_user_email text,
  before_state jsonb,
  after_state jsonb,
  ip text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON public.admin_audit_log USING btree (action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor ON public.admin_audit_log USING btree (actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON public.admin_audit_log USING btree (target_user_id);

-- ----- audit_logs -----
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  actor_id uuid,
  actor_email text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  when_time text,
  user_name text,
  entity text,
  details text,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs USING btree (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs USING btree (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow backend inserts on audit_logs" ON public.audit_logs;
CREATE POLICY "Allow backend inserts on audit_logs" ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- ----- functions -----
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT COALESCE(role, 'OPERATOR')
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % not allowed', TG_OP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_admin_audit_log_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    RAISE EXCEPTION 'admin_audit_log is immutable and append-only: updates and deletes are strictly forbidden.';
END;
$function$;

-- ----- triggers -----
DROP TRIGGER IF EXISTS trg_admin_audit_log_immutable ON public.admin_audit_log;
CREATE TRIGGER trg_admin_audit_log_immutable BEFORE DELETE OR UPDATE ON public.admin_audit_log FOR EACH ROW EXECUTE FUNCTION prevent_admin_audit_log_mutation();

DROP TRIGGER IF EXISTS no_delete_audit_logs ON public.audit_logs;
CREATE TRIGGER no_delete_audit_logs BEFORE DELETE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS no_update_audit_logs ON public.audit_logs;
CREATE TRIGGER no_update_audit_logs BEFORE UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();


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


-- ============================================================================
-- 003_sales_orders_and_dispatch.sql
-- Customer orders, order lines, finished goods, dispatch challans and owner approvals.
-- Part of the consolidated GuruOm Owner OS schema. Idempotent: safe to re-run.
-- ============================================================================

-- ----- customer_orders -----
CREATE TABLE IF NOT EXISTS public.customer_orders (
  id text NOT NULL,
  po_no text NOT NULL,
  customer_name text NOT NULL,
  po_date text NOT NULL,
  delivery_date text NOT NULL,
  status text DEFAULT 'CONFIRMED'::text NOT NULL,
  progress_step integer DEFAULT 0 NOT NULL,
  gross_amount numeric DEFAULT 0 NOT NULL,
  tax_category text DEFAULT 'GST 18%'::text,
  remark text,
  client_po_file text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  sub_type character varying(30) DEFAULT 'FRESH_PO'::character varying,
  blanket_po_id character varying(100),
  blanket_po_total_qty numeric(12,2),
  blanket_po_balance_qty numeric(12,2),
  drawing_revision character varying(50) DEFAULT 'REV-A'::character varying,
  master_drawing_revision character varying(50) DEFAULT 'REV-A'::character varying,
  heat_lot_number character varying(100),
  has_open_ncr boolean DEFAULT false,
  is_credit_held boolean DEFAULT false,
  credit_override_by character varying(100),
  credit_override_reason text,
  purchase_requisition_no character varying(100),
  price_amendment_status character varying(30),
  price_amendment_approved_by character varying(100),
  amendment_reason text,
  invoiced_qty_total numeric(12,2) DEFAULT 0,
  dispatched_qty_total numeric(12,2) DEFAULT 0,
  invoice_override_reason text,
  delayed_reason text,
  delayed_follow_up_date text,
  stage text,
  paid_amount numeric(14,2) DEFAULT 0,
  payment_status text,
  payment_history jsonb DEFAULT '[]'::jsonb,
  delivery_challan_no text,
  invoice_no text,
  pod_document_url text,
  pod_received_date text,
  pod_received_by text,
  closed_at timestamp with time zone,
  closed_by text,
  transporter_name text,
  dispatched_at text,
  CONSTRAINT customer_orders_pkey PRIMARY KEY (id)
);
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Orders access" ON public.customer_orders;
CREATE POLICY "Orders access" ON public.customer_orders FOR ALL
  USING (true);

-- ----- order_line_items -----
CREATE TABLE IF NOT EXISTS public.order_line_items (
  id text NOT NULL,
  order_id text NOT NULL,
  item_code text NOT NULL,
  item_description text NOT NULL,
  cust_part_no text,
  order_qty numeric DEFAULT 0 NOT NULL,
  unit text DEFAULT 'NOS'::text NOT NULL,
  dispatched_qty numeric DEFAULT 0 NOT NULL,
  pending_qty numeric DEFAULT 0 NOT NULL,
  rate numeric DEFAULT 0 NOT NULL,
  drawing_revision character varying(50),
  CONSTRAINT order_line_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_line_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES customer_orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_order_line_items_order_id ON public.order_line_items USING btree (order_id);
ALTER TABLE public.order_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Order line items access" ON public.order_line_items;
CREATE POLICY "Order line items access" ON public.order_line_items FOR ALL
  USING (true);

-- ----- finished_goods -----
CREATE TABLE IF NOT EXISTS public.finished_goods (
  id text NOT NULL,
  order_po text NOT NULL,
  part_code text NOT NULL,
  part_description text NOT NULL,
  pdi_passed_qty numeric DEFAULT 0 NOT NULL,
  physically_held_qty numeric DEFAULT 0 NOT NULL,
  dispatched_qty numeric DEFAULT 0 NOT NULL,
  variance numeric DEFAULT 0 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT finished_goods_pkey PRIMARY KEY (id)
);
ALTER TABLE public.finished_goods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Finished goods access" ON public.finished_goods;
CREATE POLICY "Finished goods access" ON public.finished_goods FOR ALL
  USING (true);

-- ----- dispatch_challans -----
CREATE TABLE IF NOT EXISTS public.dispatch_challans (
  id text NOT NULL,
  challan_no text NOT NULL,
  order_po text NOT NULL,
  status text DEFAULT 'GENERATED'::text NOT NULL,
  date text NOT NULL,
  transporter text NOT NULL,
  vehicle_no text NOT NULL,
  lines_count integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT dispatch_challans_pkey PRIMARY KEY (id),
  CONSTRAINT dispatch_challans_challan_no_key UNIQUE (challan_no)
);
CREATE INDEX IF NOT EXISTS idx_dispatch_challans_order_po ON public.dispatch_challans USING btree (order_po);
ALTER TABLE public.dispatch_challans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dispatch challans access" ON public.dispatch_challans;
CREATE POLICY "Dispatch challans access" ON public.dispatch_challans FOR ALL
  USING (true);

-- ----- pending_approvals -----
CREATE TABLE IF NOT EXISTS public.pending_approvals (
  id text NOT NULL,
  title text NOT NULL,
  type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  amount numeric DEFAULT 0,
  threshold_limit numeric DEFAULT 0,
  requested_by text NOT NULL,
  requested_by_role text NOT NULL,
  target_approver_role text DEFAULT 'Owner'::text,
  status text DEFAULT 'PENDING_OWNER_APPROVAL'::text NOT NULL,
  details text,
  escalation_reason text,
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by text,
  resolution_notes text,
  timestamp text,
  CONSTRAINT pending_approvals_pkey PRIMARY KEY (id),
  CONSTRAINT pending_approvals_status_check CHECK ((status = ANY (ARRAY['PENDING_OWNER_APPROVAL'::text, 'APPROVED'::text, 'REJECTED'::text, 'CANCELLED'::text])))
);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_entity ON public.pending_approvals USING btree (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_status ON public.pending_approvals USING btree (status);
ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pending_approvals_all_policy" ON public.pending_approvals;
CREATE POLICY "pending_approvals_all_policy" ON public.pending_approvals FOR ALL TO anon, authenticated
  USING (true);

-- ----- functions -----
CREATE OR REPLACE FUNCTION public.create_order_with_lines(order_payload jsonb, lines_payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  line record;
BEGIN
  -- Insert the order header
  INSERT INTO public.customer_orders (
    id, po_no, customer_name, po_date, delivery_date, 
    status, stage, progress_step, gross_amount, tax_category, remark
  )
  VALUES (
    order_payload->>'id',
    order_payload->>'po_no',
    order_payload->>'customer_name',
    order_payload->>'po_date',
    order_payload->>'delivery_date',
    order_payload->>'status',
    order_payload->>'stage',
    (order_payload->>'progress_step')::int,
    (order_payload->>'gross_amount')::numeric,
    order_payload->>'tax_category',
    order_payload->>'remark'
  );

  -- Insert the line items
  IF lines_payload IS NOT NULL AND jsonb_typeof(lines_payload) = 'array' THEN
    FOR line IN SELECT * FROM jsonb_array_elements(lines_payload)
    LOOP
      INSERT INTO public.order_line_items (
        id, order_id, item_code, item_description, cust_part_no,
        order_qty, unit, rate, dispatched_qty, pending_qty
      )
      VALUES (
        line.value->>'id',
        line.value->>'order_id',
        line.value->>'item_code',
        line.value->>'item_description',
        line.value->>'cust_part_no',
        (line.value->>'order_qty')::numeric,
        line.value->>'unit',
        (line.value->>'rate')::numeric,
        (line.value->>'dispatched_qty')::numeric,
        (line.value->>'pending_qty')::numeric
      );
    END LOOP;
  END IF;
END;
$function$;


-- ============================================================================
-- 004_inventory_and_procurement.sql
-- Stock, append-only inventory ledger, reservations, requisitions, purchase orders, GRN, vendor returns, 3-way match, scorecards and subcontracting.
-- Part of the consolidated GuruOm Owner OS schema. Idempotent: safe to re-run.
-- ============================================================================

-- ----- stock_items -----
CREATE TABLE IF NOT EXISTS public.stock_items (
  id text NOT NULL,
  code text NOT NULL,
  description text NOT NULL,
  on_hand numeric DEFAULT 0 NOT NULL,
  reserved numeric DEFAULT 0 NOT NULL,
  available numeric DEFAULT 0 NOT NULL,
  demand numeric DEFAULT 0 NOT NULL,
  reorder_level numeric DEFAULT 0 NOT NULL,
  shortage numeric DEFAULT 0 NOT NULL,
  unit text DEFAULT 'NOS'::text NOT NULL,
  status text DEFAULT 'OK'::text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT stock_items_pkey PRIMARY KEY (id),
  CONSTRAINT stock_items_code_key UNIQUE (code),
  CONSTRAINT chk_stock_items_on_hand_non_negative CHECK ((on_hand >= (0)::numeric)),
  CONSTRAINT chk_stock_items_reserved_non_negative CHECK ((reserved >= (0)::numeric))
);
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stock items access" ON public.stock_items;
CREATE POLICY "Stock items access" ON public.stock_items FOR ALL
  USING (true);

-- ----- shortage_items -----
CREATE TABLE IF NOT EXISTS public.shortage_items (
  id text NOT NULL,
  code text NOT NULL,
  description text NOT NULL,
  required_qty numeric DEFAULT 0 NOT NULL,
  available_qty numeric DEFAULT 0 NOT NULL,
  deficit numeric DEFAULT 0 NOT NULL,
  unit text DEFAULT 'NOS'::text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT shortage_items_pkey PRIMARY KEY (id)
);
ALTER TABLE public.shortage_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shortage items access" ON public.shortage_items;
CREATE POLICY "Shortage items access" ON public.shortage_items FOR ALL
  USING (true);

-- ----- inventory_movements -----
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  item_code text NOT NULL,
  location text DEFAULT 'MAIN-WAREHOUSE'::text NOT NULL,
  quantity_change numeric NOT NULL,
  movement_type text NOT NULL,
  reference_id text,
  reference_type text DEFAULT 'manual'::text,
  balance_after numeric NOT NULL,
  actor_id uuid,
  actor_email text NOT NULL,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_movements_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_movements_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_actor ON public.inventory_movements USING btree (actor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON public.inventory_movements USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON public.inventory_movements USING btree (item_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_ref ON public.inventory_movements USING btree (reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON public.inventory_movements USING btree (movement_type);
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated reads on inventory_movements" ON public.inventory_movements;
CREATE POLICY "Allow authenticated reads on inventory_movements" ON public.inventory_movements FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Allow backend inserts on inventory_movements" ON public.inventory_movements;
CREATE POLICY "Allow backend inserts on inventory_movements" ON public.inventory_movements FOR INSERT
  WITH CHECK (true);

-- ----- order_material_reservations -----
CREATE TABLE IF NOT EXISTS public.order_material_reservations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id text NOT NULL,
  order_po text NOT NULL,
  item_code text NOT NULL,
  reserved_qty numeric(12,4) NOT NULL,
  status text DEFAULT 'ACTIVE'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT order_material_reservations_pkey PRIMARY KEY (id),
  CONSTRAINT order_material_reservations_reserved_qty_check CHECK ((reserved_qty >= (0)::numeric)),
  CONSTRAINT order_material_reservations_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'CONSUMED'::text, 'RELEASED'::text])))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_order_item_reservation ON public.order_material_reservations USING btree (order_id, item_code) WHERE (status = 'ACTIVE'::text);
CREATE INDEX IF NOT EXISTS idx_order_res_item ON public.order_material_reservations USING btree (item_code, status);
CREATE INDEX IF NOT EXISTS idx_order_res_order ON public.order_material_reservations USING btree (order_id, status);
ALTER TABLE public.order_material_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Order material reservations service access" ON public.order_material_reservations;
CREATE POLICY "Order material reservations service access" ON public.order_material_reservations FOR ALL
  USING (true);

-- ----- purchase_requisitions -----
CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
  id character varying(100) NOT NULL,
  req_number character varying(50) NOT NULL,
  order_id character varying(100),
  order_po character varying(100),
  item_code character varying(100) NOT NULL,
  item_description text NOT NULL,
  required_qty numeric(12,2) NOT NULL,
  available_stock numeric(12,2) NOT NULL,
  deficit_qty numeric(12,2) NOT NULL,
  unit character varying(20) DEFAULT 'KG'::character varying,
  status character varying(30) DEFAULT 'AUTO_GENERATED'::character varying,
  po_number character varying(50),
  created_by character varying(100) DEFAULT 'System Material Auto-Checker'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  source character varying(50) DEFAULT 'LOW_STOCK_ALERT'::character varying,
  urgency character varying(20) DEFAULT 'NORMAL'::character varying,
  approved_by character varying(100),
  approved_at timestamp with time zone,
  rejection_reason text,
  CONSTRAINT purchase_requisitions_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_requisitions_req_number_key UNIQUE (req_number),
  CONSTRAINT purchase_requisitions_order_id_fkey FOREIGN KEY (order_id) REFERENCES customer_orders(id) ON DELETE SET NULL
);

-- ----- purchase_orders -----
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id text NOT NULL,
  po_no text NOT NULL,
  supplier_code text NOT NULL,
  supplier_name text NOT NULL,
  order_date text NOT NULL,
  expected_delivery_date text NOT NULL,
  payment_terms text DEFAULT 'Net 30'::text NOT NULL,
  tax_rate numeric DEFAULT 18.0 NOT NULL,
  gross_amount numeric DEFAULT 0 NOT NULL,
  tax_amount numeric DEFAULT 0 NOT NULL,
  total_amount numeric DEFAULT 0 NOT NULL,
  status text DEFAULT 'DRAFT'::text NOT NULL,
  approval_status text DEFAULT 'PENDING'::text NOT NULL,
  approved_by text,
  approved_at timestamp with time zone,
  rejection_reason text,
  created_by text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT purchase_orders_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_orders_po_no_key UNIQUE (po_no),
  CONSTRAINT purchase_orders_approval_status_check CHECK ((approval_status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text]))),
  CONSTRAINT purchase_orders_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'PENDING_APPROVAL'::text, 'APPROVED'::text, 'REJECTED'::text, 'ISSUED'::text, 'PARTIALLY_RECEIVED'::text, 'RECEIVED'::text, 'CANCELLED'::text])))
);
CREATE INDEX IF NOT EXISTS idx_po_supplier_code ON public.purchase_orders USING btree (supplier_code);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access on purchase_orders" ON public.purchase_orders;
CREATE POLICY "Open access on purchase_orders" ON public.purchase_orders FOR ALL
  USING (true);

-- ----- purchase_order_items -----
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id text NOT NULL,
  purchase_order_id text NOT NULL,
  item_code text NOT NULL,
  item_description text NOT NULL,
  order_qty numeric DEFAULT 0 NOT NULL,
  received_qty numeric DEFAULT 0 NOT NULL,
  unit text DEFAULT 'NOS'::text NOT NULL,
  unit_price numeric DEFAULT 0 NOT NULL,
  line_total numeric DEFAULT 0 NOT NULL,
  CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON public.purchase_order_items USING btree (purchase_order_id);
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access on purchase_order_items" ON public.purchase_order_items;
CREATE POLICY "Open access on purchase_order_items" ON public.purchase_order_items FOR ALL
  USING (true);

-- ----- goods_receipt_notes -----
CREATE TABLE IF NOT EXISTS public.goods_receipt_notes (
  id text NOT NULL,
  grn_no text NOT NULL,
  po_no text NOT NULL,
  vendor_code text NOT NULL,
  vendor_name text NOT NULL,
  challan_no text NOT NULL,
  challan_date text,
  received_date text NOT NULL,
  received_by text NOT NULL,
  status text DEFAULT 'RECEIVED'::text NOT NULL,
  vehicle_no text,
  remarks text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  supplier_name character varying(200),
  item_code character varying(100),
  item_description text,
  po_expected_qty numeric(12,2),
  received_qty numeric(12,2),
  accepted_qty numeric(12,2) DEFAULT 0,
  rejected_qty numeric(12,2) DEFAULT 0,
  unit character varying(20) DEFAULT 'KG'::character varying,
  unit_price numeric(12,2) DEFAULT 0,
  is_qty_mismatched boolean DEFAULT false,
  mismatch_notes text,
  heat_lot_number character varying(100),
  delivery_challan_no character varying(100),
  carrier character varying(100),
  inspection_status character varying(30) DEFAULT 'PENDING_INSPECTION'::character varying,
  inspection_notes text,
  store_keeper_name character varying(100),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT goods_receipt_notes_pkey PRIMARY KEY (id),
  CONSTRAINT goods_receipt_notes_grn_no_key UNIQUE (grn_no),
  CONSTRAINT goods_receipt_notes_status_check CHECK ((status = ANY (ARRAY['PENDING_INSPECTION'::text, 'RECEIVED'::text, 'QC_VERIFIED'::text, 'REJECTED'::text])))
);
CREATE INDEX IF NOT EXISTS idx_grn_po_no ON public.goods_receipt_notes USING btree (po_no);
ALTER TABLE public.goods_receipt_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access on goods_receipt_notes" ON public.goods_receipt_notes;
CREATE POLICY "Open access on goods_receipt_notes" ON public.goods_receipt_notes FOR ALL
  USING (true);

-- ----- grn_items -----
CREATE TABLE IF NOT EXISTS public.grn_items (
  id text NOT NULL,
  grn_id text NOT NULL,
  item_code text NOT NULL,
  item_description text NOT NULL,
  ordered_qty numeric DEFAULT 0 NOT NULL,
  received_qty numeric DEFAULT 0 NOT NULL,
  accepted_qty numeric DEFAULT 0 NOT NULL,
  rejected_qty numeric DEFAULT 0 NOT NULL,
  unit text DEFAULT 'NOS'::text NOT NULL,
  unit_rate numeric DEFAULT 0 NOT NULL,
  rejection_reason text,
  CONSTRAINT grn_items_pkey PRIMARY KEY (id),
  CONSTRAINT grn_items_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES goods_receipt_notes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn_id ON public.grn_items USING btree (grn_id);
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access on grn_items" ON public.grn_items;
CREATE POLICY "Open access on grn_items" ON public.grn_items FOR ALL
  USING (true);

-- ----- vendor_returns -----
CREATE TABLE IF NOT EXISTS public.vendor_returns (
  id character varying(100) NOT NULL,
  return_no character varying(50) NOT NULL,
  grn_no character varying(50) NOT NULL,
  po_no character varying(50) NOT NULL,
  supplier_name character varying(200) NOT NULL,
  item_code character varying(100) NOT NULL,
  item_description text NOT NULL,
  rejected_qty numeric(12,2) NOT NULL,
  defect_category character varying(100) NOT NULL,
  defect_notes text NOT NULL,
  status character varying(30) DEFAULT 'INITIATED'::character varying,
  initiated_by character varying(100) NOT NULL,
  approved_by character varying(100),
  approved_at timestamp with time zone,
  debit_note_number character varying(50),
  debit_amount numeric(12,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vendor_returns_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_returns_return_no_key UNIQUE (return_no)
);

-- ----- vendor_bill_three_way_matches -----
CREATE TABLE IF NOT EXISTS public.vendor_bill_three_way_matches (
  id character varying(100) NOT NULL,
  bill_no character varying(50) NOT NULL,
  po_no character varying(50) NOT NULL,
  grn_no character varying(50) NOT NULL,
  supplier_name character varying(200) NOT NULL,
  po_unit_price numeric(12,2) NOT NULL,
  bill_unit_price numeric(12,2) NOT NULL,
  grn_accepted_qty numeric(12,2) NOT NULL,
  bill_invoiced_qty numeric(12,2) NOT NULL,
  po_total_expected numeric(12,2) NOT NULL,
  bill_total_invoiced numeric(12,2) NOT NULL,
  match_status character varying(40) DEFAULT 'MATCHED'::character varying,
  is_flagged_for_review boolean DEFAULT false,
  variance_details text,
  matched_by character varying(100) NOT NULL,
  matched_at timestamp with time zone DEFAULT now(),
  disbursement_status character varying(30) DEFAULT 'PENDING'::character varying,
  disbursed_amount numeric(12,2) DEFAULT 0,
  disbursed_by character varying(100),
  disbursed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vendor_bill_three_way_matches_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_bill_three_way_matches_bill_no_key UNIQUE (bill_no)
);

-- ----- vendor_scorecards -----
CREATE TABLE IF NOT EXISTS public.vendor_scorecards (
  id character varying(100) NOT NULL,
  supplier_code character varying(100) NOT NULL,
  supplier_name character varying(200) NOT NULL,
  evaluation_period character varying(50) NOT NULL,
  total_po_orders integer DEFAULT 0,
  total_deliveries integer DEFAULT 0,
  on_time_deliveries integer DEFAULT 0,
  otd_percentage numeric(5,2) DEFAULT 0.0,
  total_received_qty numeric(12,2) DEFAULT 0.0,
  accepted_qty numeric(12,2) DEFAULT 0.0,
  rejected_qty numeric(12,2) DEFAULT 0.0,
  quality_acceptance_percentage numeric(5,2) DEFAULT 0.0,
  overall_score numeric(5,2) DEFAULT 0.0,
  vendor_rating_tier character varying(30) DEFAULT 'TIER_1_EXCELLENT'::character varying,
  evaluated_by character varying(100) NOT NULL,
  evaluated_at timestamp with time zone DEFAULT now(),
  notes text,
  CONSTRAINT vendor_scorecards_pkey PRIMARY KEY (id)
);

-- ----- subcontract_orders -----
CREATE TABLE IF NOT EXISTS public.subcontract_orders (
  id character varying(100) NOT NULL,
  gate_pass_no character varying(50) NOT NULL,
  job_no character varying(100) NOT NULL,
  item_code character varying(100) NOT NULL,
  item_description text NOT NULL,
  subcontractor_name character varying(200) NOT NULL,
  process_type character varying(100) NOT NULL,
  dispatched_qty numeric(12,2) NOT NULL,
  unit character varying(20) DEFAULT 'NOS'::character varying,
  dispatch_date date DEFAULT CURRENT_DATE NOT NULL,
  expected_return_date date NOT NULL,
  actual_return_date date,
  gate_in_pass_no character varying(50),
  received_qty numeric(12,2) DEFAULT 0,
  rejected_qty numeric(12,2) DEFAULT 0,
  qc_status character varying(30) DEFAULT 'PENDING_GATE_IN'::character varying,
  status character varying(30) DEFAULT 'OUT_FOR_JOBWORK'::character varying,
  is_overdue boolean DEFAULT false,
  overdue_days integer DEFAULT 0,
  vehicle_details character varying(100),
  transporter character varying(100),
  unit_rate numeric(12,2) DEFAULT 0,
  total_process_cost numeric(12,2) DEFAULT 0,
  dispatched_by character varying(100) NOT NULL,
  received_by character varying(100),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subcontract_orders_pkey PRIMARY KEY (id),
  CONSTRAINT subcontract_orders_gate_pass_no_key UNIQUE (gate_pass_no)
);

-- ----- outwork_sendouts -----
CREATE TABLE IF NOT EXISTS public.outwork_sendouts (
  id text NOT NULL,
  send_out_id text NOT NULL,
  vendor_name text NOT NULL,
  process text NOT NULL,
  sent_qty numeric DEFAULT 0 NOT NULL,
  received_qty numeric DEFAULT 0 NOT NULL,
  rejected_qty numeric DEFAULT 0 NOT NULL,
  expected_date text NOT NULL,
  status text DEFAULT 'SENT'::text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT outwork_sendouts_pkey PRIMARY KEY (id)
);
ALTER TABLE public.outwork_sendouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Outwork sendouts access" ON public.outwork_sendouts;
CREATE POLICY "Outwork sendouts access" ON public.outwork_sendouts FOR ALL
  USING (true);

-- ----- functions -----
CREATE OR REPLACE FUNCTION public.prevent_inventory_movement_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'inventory_movements is append-only: % not allowed', TG_OP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_order_materials_atomic(p_order_id text, p_order_po text, p_actor_email text, p_allocations jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_item RECORD;
    v_stock RECORD;
    v_existing_movement_count INT;
    v_job_card_consumed_count INT;
    v_order_reserved NUMERIC := 0;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Idempotency Check (unchanged): order-level consumption already posted?
    SELECT COUNT(*) INTO v_existing_movement_count
    FROM public.inventory_movements
    WHERE reference_id = p_order_po
      AND movement_type = 'PRODUCTION_CONSUMPTION';

    IF v_existing_movement_count > 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_consumed', true,
            'message', 'Materials for order ' || p_order_po || ' have already been consumed.'
        );
    END IF;

    -- 1b. CRITICAL ISSUE #9 guard: Job-Card-level consumption already exists for
    -- this order -> order-level bulk issue would double-count the same demand.
    SELECT COUNT(*) INTO v_job_card_consumed_count
    FROM public.inventory_movements
    WHERE movement_type = 'PRODUCTION_CONSUMPTION'
      AND reference_type = 'job_card'
      AND metadata->>'orderPo' = p_order_po;

    IF v_job_card_consumed_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'ERR_ORDER_MATERIALS_ALREADY_CONSUMED',
            'message', 'Order-level material issue blocked for PO ' || p_order_po || ': materials have already been issued at Job Card level.'
        );
    END IF;

    -- 2. Multi-component lock & sufficiency check in alphabetical order to prevent deadlocks
    FOR v_item IN
        SELECT
            elem->>'item_code' AS item_code,
            (elem->>'qty')::NUMERIC AS qty,
            elem->>'description' AS description
        FROM jsonb_array_elements(p_allocations) elem
        ORDER BY elem->>'item_code' ASC
    LOOP
        SELECT * INTO v_stock
        FROM public.stock_items
        WHERE code = v_item.item_code
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'ERR_STOCK_ITEM_NOT_FOUND',
                'item_code', v_item.item_code,
                'message', 'Stock item not found: ' || v_item.item_code
            );
        END IF;

        IF v_stock.on_hand < v_item.qty THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'ERR_INSUFFICIENT_STOCK',
                'item_code', v_item.item_code,
                'required_qty', v_item.qty,
                'on_hand', v_stock.on_hand,
                'deficit', (v_item.qty - v_stock.on_hand),
                'message', 'Insufficient stock for ' || v_item.item_code || '. Required: ' || v_item.qty || ', On-hand: ' || v_stock.on_hand
            );
        END IF;
    END LOOP;

    -- 3. All items have sufficient stock -> Deduct stock, insert movements, and reconcile reservations
    FOR v_item IN
        SELECT
            elem->>'item_code' AS item_code,
            (elem->>'qty')::NUMERIC AS qty,
            elem->>'description' AS description
        FROM jsonb_array_elements(p_allocations) elem
        ORDER BY elem->>'item_code' ASC
    LOOP
        SELECT * INTO v_stock
        FROM public.stock_items
        WHERE code = v_item.item_code;

        -- Only decrement reserved by the quantity actually reserved by THIS order
        SELECT COALESCE(SUM(reserved_qty), 0) INTO v_order_reserved
        FROM public.order_material_reservations
        WHERE (order_id = p_order_id OR order_po = p_order_po)
          AND item_code = v_item.item_code
          AND status = 'ACTIVE';

        -- Deduct from stock_items
        UPDATE public.stock_items
        SET
            on_hand = on_hand - v_item.qty,
            reserved = GREATEST(0, reserved - v_order_reserved),
            available = (on_hand - v_item.qty) - GREATEST(0, reserved - v_order_reserved),
            status = CASE
                WHEN ((on_hand - v_item.qty) - GREATEST(0, reserved - v_order_reserved)) < 0 THEN 'CRITICAL'
                WHEN ((on_hand - v_item.qty) - GREATEST(0, reserved - v_order_reserved)) < reorder_level THEN 'SHORTAGE'
                ELSE 'OK'
            END,
            updated_at = v_now
        WHERE code = v_item.item_code;

        -- Insert append-only ledger movement
        INSERT INTO public.inventory_movements (
            id,
            item_code,
            location,
            quantity_change,
            movement_type,
            reference_id,
            reference_type,
            balance_after,
            actor_email,
            notes,
            created_at
        ) VALUES (
            gen_random_uuid(),
            v_item.item_code,
            'MAIN-WAREHOUSE',
            -v_item.qty,
            'PRODUCTION_CONSUMPTION',
            p_order_po,
            'order',
            v_stock.on_hand - v_item.qty,
            p_actor_email,
            'Material issued for PO ' || p_order_po || ' — ' || COALESCE(v_item.description, v_item.item_code) || ' × ' || v_item.qty,
            v_now
        );

        -- Reconcile order_material_reservations
        UPDATE public.order_material_reservations
        SET
            status = 'CONSUMED',
            updated_at = v_now
        WHERE (order_id = p_order_id OR order_po = p_order_po)
          AND item_code = v_item.item_code
          AND status = 'ACTIVE';
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'already_consumed', false,
        'message', 'Materials consumed and reservations reconciled successfully.'
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_job_card_materials_atomic(p_order_id text, p_order_po text, p_job_no text, p_actor_email text, p_allocations jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_item RECORD;
    v_stock RECORD;
    v_existing_movement_count INT;
    v_order_consumed_count INT;
    v_reservation_qty NUMERIC;
    v_consumed_from_reservation NUMERIC;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Idempotency Check: Job-Card-level consumption already posted for this job_no?
    SELECT COUNT(*) INTO v_existing_movement_count
    FROM public.inventory_movements
    WHERE reference_id = p_job_no
      AND reference_type = 'job_card'
      AND movement_type = 'PRODUCTION_CONSUMPTION';

    IF v_existing_movement_count > 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_consumed', true,
            'message', 'Materials for Job Card ' || p_job_no || ' have already been consumed.'
        );
    END IF;

    -- 2. Double-count guard: order-level bulk issue already done for this order?
    SELECT COUNT(*) INTO v_order_consumed_count
    FROM public.inventory_movements
    WHERE reference_id = p_order_po
      AND reference_type = 'order'
      AND movement_type = 'PRODUCTION_CONSUMPTION';

    IF v_order_consumed_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'ERR_ORDER_MATERIALS_ALREADY_CONSUMED',
            'message', 'Job Card material issue blocked for ' || p_job_no || ': materials for order ' || p_order_po || ' have already been consumed at order level.'
        );
    END IF;

    -- 3. Multi-component lock & sufficiency check in alphabetical order (deadlock-free)
    FOR v_item IN
        SELECT
            elem->>'item_code' AS item_code,
            (elem->>'qty')::NUMERIC AS qty,
            elem->>'description' AS description
        FROM jsonb_array_elements(p_allocations) elem
        ORDER BY elem->>'item_code' ASC
    LOOP
        SELECT * INTO v_stock
        FROM public.stock_items
        WHERE code = v_item.item_code
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'ERR_STOCK_ITEM_NOT_FOUND',
                'item_code', v_item.item_code,
                'message', 'Stock item not found: ' || v_item.item_code
            );
        END IF;

        IF v_stock.on_hand < v_item.qty THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'ERR_INSUFFICIENT_STOCK',
                'item_code', v_item.item_code,
                'required_qty', v_item.qty,
                'on_hand', v_stock.on_hand,
                'deficit', (v_item.qty - v_stock.on_hand),
                'message', 'Insufficient stock for ' || v_item.item_code || '. Required: ' || v_item.qty || ', On-hand: ' || v_stock.on_hand
            );
        END IF;
    END LOOP;

    -- 4. All components sufficient -> deduct stock, append ledger rows, partially reconcile reservations
    FOR v_item IN
        SELECT
            elem->>'item_code' AS item_code,
            (elem->>'qty')::NUMERIC AS qty,
            elem->>'description' AS description
        FROM jsonb_array_elements(p_allocations) elem
        ORDER BY elem->>'item_code' ASC
    LOOP
        SELECT * INTO v_stock
        FROM public.stock_items
        WHERE code = v_item.item_code;

        -- This order's ACTIVE reservation for this item (pool shared by its Job Cards)
        SELECT COALESCE(SUM(reserved_qty), 0) INTO v_reservation_qty
        FROM public.order_material_reservations
        WHERE (order_id = p_order_id OR order_po = p_order_po)
          AND item_code = v_item.item_code
          AND status = 'ACTIVE';

        -- Consume from the reservation pool only what it can cover (PARTIAL-aware)
        v_consumed_from_reservation := LEAST(v_reservation_qty, v_item.qty);

        -- Deduct stock; reserved drops only by the consumed-from-reservation amount
        UPDATE public.stock_items
        SET
            on_hand = on_hand - v_item.qty,
            reserved = GREATEST(0, reserved - v_consumed_from_reservation),
            available = (on_hand - v_item.qty) - GREATEST(0, reserved - v_consumed_from_reservation),
            status = CASE
                WHEN ((on_hand - v_item.qty) - GREATEST(0, reserved - v_consumed_from_reservation)) < 0 THEN 'CRITICAL'
                WHEN ((on_hand - v_item.qty) - GREATEST(0, reserved - v_consumed_from_reservation)) < reorder_level THEN 'SHORTAGE'
                ELSE 'OK'
            END,
            updated_at = v_now
        WHERE code = v_item.item_code;

        -- Append append-only ledger movement (Job-Card identity)
        INSERT INTO public.inventory_movements (
            id,
            item_code,
            location,
            quantity_change,
            movement_type,
            reference_id,
            reference_type,
            balance_after,
            actor_email,
            notes,
            metadata,
            created_at
        ) VALUES (
            gen_random_uuid(),
            v_item.item_code,
            'MAIN-WAREHOUSE',
            -v_item.qty,
            'PRODUCTION_CONSUMPTION',
            p_job_no,
            'job_card',
            v_stock.on_hand - v_item.qty,
            p_actor_email,
            'Material issued for Job Card ' || p_job_no || ' (PO ' || p_order_po || ') — ' || COALESCE(v_item.description, v_item.item_code) || ' × ' || v_item.qty,
            jsonb_build_object('orderId', p_order_id, 'orderPo', p_order_po, 'jobNo', p_job_no),
            v_now
        );

        -- PARTIAL reservation reconciliation: decrement pool, keep residual ACTIVE
        UPDATE public.order_material_reservations
        SET
            reserved_qty = GREATEST(0, reserved_qty - v_consumed_from_reservation),
            status = CASE WHEN GREATEST(0, reserved_qty - v_consumed_from_reservation) <= 0 THEN 'CONSUMED' ELSE 'ACTIVE' END,
            updated_at = v_now
        WHERE (order_id = p_order_id OR order_po = p_order_po)
          AND item_code = v_item.item_code
          AND status = 'ACTIVE'
          AND reserved_qty > 0;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'already_consumed', false,
        'message', 'Job Card materials consumed atomically and order reservations partially reconciled.'
    );
END;
$function$;

-- ----- triggers -----
DROP TRIGGER IF EXISTS no_delete_inventory_movements ON public.inventory_movements;
CREATE TRIGGER no_delete_inventory_movements BEFORE DELETE ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION prevent_inventory_movement_mutation();

DROP TRIGGER IF EXISTS no_update_inventory_movements ON public.inventory_movements;
CREATE TRIGGER no_update_inventory_movements BEFORE UPDATE ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION prevent_inventory_movement_mutation();

-- ----- views -----
CREATE OR REPLACE VIEW public.stock_levels_view WITH (security_invoker = true) AS
 SELECT item_code,
    location,
    sum(quantity_change) AS current_on_hand,
    count(*) AS total_movements,
    max(created_at) AS last_movement_at
   FROM inventory_movements
  GROUP BY item_code, location;


-- ============================================================================
-- 005_production_and_quality.sql
-- Bills of materials, route cards, job cards and operations, production logs, QC / PDI inspections and NCRs.
-- Part of the consolidated GuruOm Owner OS schema. Idempotent: safe to re-run.
-- ============================================================================

-- ----- bill_of_materials -----
CREATE TABLE IF NOT EXISTS public.bill_of_materials (
  id text NOT NULL,
  bom_code text NOT NULL,
  parent_part_code text NOT NULL,
  parent_part_name text NOT NULL,
  revision text DEFAULT 'v1.0'::text NOT NULL,
  yield_percentage numeric DEFAULT 98.5 NOT NULL,
  batch_size numeric DEFAULT 100 NOT NULL,
  status text DEFAULT 'ACTIVE'::text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT bill_of_materials_pkey PRIMARY KEY (id),
  CONSTRAINT bill_of_materials_bom_code_key UNIQUE (bom_code),
  CONSTRAINT fk_bom_parent_item FOREIGN KEY (parent_part_code) REFERENCES masters(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT bill_of_materials_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'DRAFT'::text, 'OBSOLETE'::text])))
);
CREATE INDEX IF NOT EXISTS idx_bom_parent_part ON public.bill_of_materials USING btree (parent_part_code);
ALTER TABLE public.bill_of_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access on bill_of_materials" ON public.bill_of_materials;
CREATE POLICY "Open access on bill_of_materials" ON public.bill_of_materials FOR ALL
  USING (true);

-- ----- bom_items -----
CREATE TABLE IF NOT EXISTS public.bom_items (
  id text NOT NULL,
  bom_id text NOT NULL,
  component_code text NOT NULL,
  component_name text NOT NULL,
  component_type text DEFAULT 'RAW_MATERIAL'::text NOT NULL,
  qty_per_unit numeric DEFAULT 1.0 NOT NULL,
  unit text DEFAULT 'NOS'::text NOT NULL,
  scrap_allowance_pct numeric DEFAULT 2.0 NOT NULL,
  stage text DEFAULT 'CNC_MACHINING'::text NOT NULL,
  unit_cost numeric DEFAULT 0 NOT NULL,
  CONSTRAINT bom_items_pkey PRIMARY KEY (id),
  CONSTRAINT bom_items_bom_id_fkey FOREIGN KEY (bom_id) REFERENCES bill_of_materials(id) ON DELETE CASCADE,
  CONSTRAINT fk_bom_item_component FOREIGN KEY (component_code) REFERENCES masters(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT bom_items_component_type_check CHECK ((component_type = ANY (ARRAY['RAW_MATERIAL'::text, 'HARDWARE'::text, 'PACKING'::text, 'SUB_ASSEMBLY'::text])))
);
CREATE INDEX IF NOT EXISTS idx_bom_items_bom_id ON public.bom_items USING btree (bom_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_component_code ON public.bom_items USING btree (component_code);
ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access on bom_items" ON public.bom_items;
CREATE POLICY "Open access on bom_items" ON public.bom_items FOR ALL
  USING (true);

-- ----- route_card_templates -----
CREATE TABLE IF NOT EXISTS public.route_card_templates (
  id character varying(100) NOT NULL,
  part_code character varying(100) NOT NULL,
  part_description text NOT NULL,
  sequence_no integer NOT NULL,
  operation_name character varying(150) NOT NULL,
  work_center character varying(100) NOT NULL,
  standard_time_minutes integer DEFAULT 30 NOT NULL,
  inspection_required boolean DEFAULT false,
  required_certification character varying(100) DEFAULT 'None'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT route_card_templates_pkey PRIMARY KEY (id),
  CONSTRAINT route_card_templates_part_code_sequence_no_key UNIQUE (part_code, sequence_no),
  CONSTRAINT fk_route_card_part_item FOREIGN KEY (part_code) REFERENCES masters(code) ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_route_card_templates_part_code ON public.route_card_templates USING btree (part_code);
ALTER TABLE public.route_card_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access on route_card_templates" ON public.route_card_templates;
CREATE POLICY "Open access on route_card_templates" ON public.route_card_templates FOR ALL
  USING (true);

-- ----- job_cards -----
CREATE TABLE IF NOT EXISTS public.job_cards (
  id text NOT NULL,
  job_no text NOT NULL,
  order_po text NOT NULL,
  part_code text NOT NULL,
  part_description text NOT NULL,
  order_status text DEFAULT 'CONFIRMED'::text NOT NULL,
  qty numeric DEFAULT 0 NOT NULL,
  machine text NOT NULL,
  target_date text NOT NULL,
  status text DEFAULT 'SCHEDULED'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  drawing_revision character varying(50),
  material_issued_lot character varying(100),
  current_operation character varying(150),
  job_status character varying(50) DEFAULT 'NOT_STARTED'::character varying,
  ncr_reference character varying(100),
  supervisor_sign_off character varying(100),
  remarks text,
  order_id character varying(100),
  target_qty numeric(12,2),
  material_qc_status character varying(50) DEFAULT 'ACCEPTED'::character varying,
  current_step_no integer DEFAULT 10,
  has_open_ncr boolean DEFAULT false,
  CONSTRAINT job_cards_pkey PRIMARY KEY (id),
  CONSTRAINT job_cards_job_no_key UNIQUE (job_no)
);
CREATE INDEX IF NOT EXISTS idx_job_cards_created_id_desc ON public.job_cards USING btree (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_job_cards_order_po ON public.job_cards USING btree (order_po);
ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Job cards access" ON public.job_cards;
CREATE POLICY "Job cards access" ON public.job_cards FOR ALL
  USING (true);

-- ----- job_card_operations -----
CREATE TABLE IF NOT EXISTS public.job_card_operations (
  id character varying(100) NOT NULL,
  job_card_id character varying(100) NOT NULL,
  job_no character varying(50) NOT NULL,
  sequence_no integer NOT NULL,
  operation_name character varying(150) NOT NULL,
  machine_id character varying(100),
  operator_name character varying(100),
  required_certification character varying(100) DEFAULT 'None'::character varying,
  is_certification_verified boolean DEFAULT true,
  standard_time_minutes integer DEFAULT 30 NOT NULL,
  actual_start_time timestamp with time zone,
  actual_end_time timestamp with time zone,
  actual_time_minutes integer DEFAULT 0,
  qty_processed numeric(12,2) DEFAULT 0,
  qty_rejected numeric(12,2) DEFAULT 0,
  inspection_required boolean DEFAULT false,
  inspection_passed boolean DEFAULT false,
  op_status character varying(50) DEFAULT 'PENDING'::character varying,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT job_card_operations_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_job_card_operations_card ON public.job_card_operations USING btree (job_card_id);
CREATE INDEX IF NOT EXISTS idx_job_card_operations_job_no ON public.job_card_operations USING btree (job_no);
ALTER TABLE public.job_card_operations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access on job_card_operations" ON public.job_card_operations;
CREATE POLICY "Open access on job_card_operations" ON public.job_card_operations FOR ALL
  USING (true);

-- ----- production_logs -----
CREATE TABLE IF NOT EXISTS public.production_logs (
  id text NOT NULL,
  item_code text NOT NULL,
  description text NOT NULL,
  job_no text NOT NULL,
  step_no integer DEFAULT 1 NOT NULL,
  operation_name text NOT NULL,
  qty_done numeric DEFAULT 0 NOT NULL,
  logged_timestamp text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT production_logs_pkey PRIMARY KEY (id)
);
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Production logs access" ON public.production_logs;
CREATE POLICY "Production logs access" ON public.production_logs FOR ALL
  USING (true);

-- ----- qc_inspections -----
CREATE TABLE IF NOT EXISTS public.qc_inspections (
  id text NOT NULL,
  job_no text NOT NULL,
  order_po text NOT NULL,
  part_code text NOT NULL,
  part_description text NOT NULL,
  qty numeric DEFAULT 0 NOT NULL,
  job_status text NOT NULL,
  qc_status text DEFAULT 'PENDING'::text NOT NULL,
  inspector_notes text,
  defect_category text,
  inspected_at text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT qc_inspections_pkey PRIMARY KEY (id)
);
ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "QC inspections access" ON public.qc_inspections;
CREATE POLICY "QC inspections access" ON public.qc_inspections FOR ALL
  USING (true);

-- ----- pdi_inspections -----
CREATE TABLE IF NOT EXISTS public.pdi_inspections (
  id text NOT NULL,
  job_no text NOT NULL,
  order_po text NOT NULL,
  part_code text NOT NULL,
  part_description text NOT NULL,
  qty numeric DEFAULT 0 NOT NULL,
  pdi_status text DEFAULT 'PENDING'::text NOT NULL,
  certificate_no text,
  report_date text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  pdi_passed_qty numeric(12,2) DEFAULT 0,
  physically_held_qty numeric(12,2) DEFAULT 0,
  dispatched_qty numeric(12,2) DEFAULT 0,
  variance numeric(12,2) DEFAULT 0,
  inspected_by text,
  CONSTRAINT pdi_inspections_pkey PRIMARY KEY (id)
);
ALTER TABLE public.pdi_inspections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "PDI inspections access" ON public.pdi_inspections;
CREATE POLICY "PDI inspections access" ON public.pdi_inspections FOR ALL
  USING (true);

-- ----- ncrs -----
CREATE TABLE IF NOT EXISTS public.ncrs (
  id character varying(100) NOT NULL,
  ncr_number character varying(50) NOT NULL,
  order_id character varying(100),
  order_po character varying(100),
  job_no character varying(100),
  part_code character varying(100),
  part_description text,
  defect_type character varying(100) NOT NULL,
  defect_description text NOT NULL,
  severity character varying(20) DEFAULT 'MAJOR'::character varying,
  status character varying(30) DEFAULT 'OPEN'::character varying,
  raised_by character varying(100) NOT NULL,
  closed_by character varying(100),
  resolution_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ncrs_pkey PRIMARY KEY (id),
  CONSTRAINT ncrs_ncr_number_key UNIQUE (ncr_number)
);
CREATE INDEX IF NOT EXISTS idx_ncrs_job_no ON public.ncrs USING btree (job_no);
CREATE INDEX IF NOT EXISTS idx_ncrs_order_po ON public.ncrs USING btree (order_po);

-- ----- functions -----
CREATE OR REPLACE FUNCTION public.check_bom_deletion_safety()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_active_order_count INT := 0;
    v_active_job_count INT := 0;
    v_order_po TEXT;
    v_job_no TEXT;
BEGIN
    -- 1. Check active customer orders referencing this BOM's parent part code
    -- Terminal order states ('COMPLETED', 'CANCELLED', 'CLOSED') do not block deletion
    IF OLD.status = 'ACTIVE' THEN
        SELECT COUNT(DISTINCT o.id), MIN(o.po_no)
        INTO v_active_order_count, v_order_po
        FROM public.customer_orders o
        JOIN public.order_line_items li ON li.order_id = o.id
        WHERE li.item_code = OLD.parent_part_code
          AND UPPER(o.status) NOT IN ('COMPLETED', 'CANCELLED', 'CLOSED');

        IF v_active_order_count > 0 THEN
            RAISE EXCEPTION 'BOM_IN_USE: Cannot delete BOM % because % active customer order(s) (e.g. %) currently depend on it.',
                OLD.bom_code, v_active_order_count, v_order_po
                USING ERRCODE = '23503';
        END IF;
    END IF;

    -- 2. Check active job cards referencing this BOM's parent part code / revision
    -- Terminal job states ('COMPLETED', 'CANCELLED', 'CLOSED') do not block deletion
    SELECT COUNT(*), MIN(jc.job_no)
    INTO v_active_job_count, v_job_no
    FROM public.job_cards jc
    WHERE jc.part_code = OLD.parent_part_code
      AND UPPER(COALESCE(jc.job_status, 'NOT_STARTED')) NOT IN ('COMPLETED', 'CANCELLED', 'CLOSED')
      AND (OLD.status = 'ACTIVE' OR jc.drawing_revision = OLD.revision);

    IF v_active_job_count > 0 THEN
        RAISE EXCEPTION 'BOM_IN_USE: Cannot delete BOM % because % active job card(s) (e.g. %) currently depend on it.',
            OLD.bom_code, v_active_job_count, v_job_no
            USING ERRCODE = '23503';
    END IF;

    RETURN OLD;
END;
$function$;

-- ----- triggers -----
DROP TRIGGER IF EXISTS trg_prevent_in_use_bom_deletion ON public.bill_of_materials;
CREATE TRIGGER trg_prevent_in_use_bom_deletion BEFORE DELETE ON public.bill_of_materials FOR EACH ROW EXECUTE FUNCTION check_bom_deletion_safety();


-- ============================================================================
-- 006_documents_and_notifications.sql
-- File attachments (private storage bucket) and the in-app / e-mail notification system.
-- Part of the consolidated GuruOm Owner OS schema. Idempotent: safe to re-run.
-- ============================================================================

-- ----- attachments -----
CREATE TABLE IF NOT EXISTS public.attachments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id text DEFAULT 't_00000000-0000-0000-0000-000000000001'::text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  filename text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  checksum_sha256 text NOT NULL,
  version integer DEFAULT 1 NOT NULL,
  is_current boolean DEFAULT true NOT NULL,
  scan_status text DEFAULT 'pending'::text NOT NULL,
  scan_result jsonb DEFAULT '{}'::jsonb,
  uploaded_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  CONSTRAINT attachments_pkey PRIMARY KEY (id),
  CONSTRAINT attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT attachments_scan_status_check CHECK ((scan_status = ANY (ARRAY['pending'::text, 'clean'::text, 'infected'::text, 'error'::text])))
);
CREATE INDEX IF NOT EXISTS idx_attachments_checksum ON public.attachments USING btree (checksum_sha256);
CREATE INDEX IF NOT EXISTS idx_attachments_deleted_at ON public.attachments USING btree (deleted_at);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON public.attachments USING btree (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_scan_status ON public.attachments USING btree (scan_status);
CREATE INDEX IF NOT EXISTS idx_attachments_tenant ON public.attachments USING btree (tenant_id);
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation for attachments" ON public.attachments;
CREATE POLICY "Tenant isolation for attachments" ON public.attachments FOR ALL
  USING ((tenant_id = current_setting('app.current_tenant'::text, true)))
  WITH CHECK ((tenant_id = current_setting('app.current_tenant'::text, true)));

-- ----- notifications -----
CREATE TABLE IF NOT EXISTS public.notifications (
  id text DEFAULT (gen_random_uuid())::text NOT NULL,
  user_id text,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  entity_type text,
  entity_id text,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  severity text DEFAULT 'INFO'::text NOT NULL,
  data jsonb,
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Notifications access" ON public.notifications;
CREATE POLICY "Notifications access" ON public.notifications FOR ALL
  USING (true);
DROP POLICY IF EXISTS "Public notifications read" ON public.notifications;
CREATE POLICY "Public notifications read" ON public.notifications FOR SELECT
  USING (true);

-- ----- notification_rules -----
CREATE TABLE IF NOT EXISTS public.notification_rules (
  id text NOT NULL,
  name text NOT NULL,
  description text,
  enabled boolean DEFAULT true NOT NULL,
  severity text DEFAULT 'INFO'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT notification_rules_pkey PRIMARY KEY (id),
  CONSTRAINT notification_rules_severity_check CHECK ((severity = ANY (ARRAY['CRITICAL'::text, 'HIGH'::text, 'MEDIUM'::text, 'LOW'::text, 'INFO'::text])))
);
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public notification rules read" ON public.notification_rules;
CREATE POLICY "Public notification rules read" ON public.notification_rules FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Public notification rules update" ON public.notification_rules;
CREATE POLICY "Public notification rules update" ON public.notification_rules FOR ALL
  USING (true);

-- ----- notification_recipients -----
CREATE TABLE IF NOT EXISTS public.notification_recipients (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  notification_rule_id text NOT NULL,
  recipient_type text NOT NULL,
  recipient_value text NOT NULL,
  email text,
  name text,
  enabled boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT notification_recipients_pkey PRIMARY KEY (id),
  CONSTRAINT notification_recipients_notification_rule_id_fkey FOREIGN KEY (notification_rule_id) REFERENCES notification_rules(id) ON DELETE CASCADE,
  CONSTRAINT notification_recipients_recipient_type_check CHECK ((recipient_type = ANY (ARRAY['EMAIL'::text, 'USER'::text, 'ROLE'::text])))
);
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public notification recipients modify" ON public.notification_recipients;
CREATE POLICY "Public notification recipients modify" ON public.notification_recipients FOR ALL
  USING (true);
DROP POLICY IF EXISTS "Public notification recipients read" ON public.notification_recipients;
CREATE POLICY "Public notification recipients read" ON public.notification_recipients FOR SELECT
  USING (true);

-- ----- notification_logs -----
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  event_type text NOT NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL,
  resend_email_id text,
  error_message text,
  entity_type text,
  entity_id text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  sent_at timestamp with time zone,
  CONSTRAINT notification_logs_pkey PRIMARY KEY (id),
  CONSTRAINT notification_logs_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'SENT'::text, 'FAILED'::text])))
);
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public notification logs insert" ON public.notification_logs;
CREATE POLICY "Public notification logs insert" ON public.notification_logs FOR ALL
  USING (true);
DROP POLICY IF EXISTS "Public notification logs read" ON public.notification_logs;
CREATE POLICY "Public notification logs read" ON public.notification_logs FOR SELECT
  USING (true);

-- ----- storage: private bucket for attachments -----
-- Strictly private (served through signed URLs by the backend), 25 MB limit.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments', 'attachments', false, 26214400,
  ARRAY[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv', 'text/plain', 'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET public = false;


-- ============================================================================
-- 007_finance_and_invoicing.sql
-- Customer invoices (GST), invoice items and vendor bills (TDS).
-- Part of the consolidated GuruOm Owner OS schema. Idempotent: safe to re-run.
-- ============================================================================

-- ----- customer_invoices -----
CREATE TABLE IF NOT EXISTS public.customer_invoices (
  id text NOT NULL,
  invoice_no text NOT NULL,
  customer_name text NOT NULL,
  order_po text NOT NULL,
  challan_no text NOT NULL,
  status text DEFAULT 'DRAFT'::text NOT NULL,
  date text NOT NULL,
  due_date text NOT NULL,
  total_amount numeric DEFAULT 0 NOT NULL,
  paid_amount numeric DEFAULT 0 NOT NULL,
  balance_amount numeric DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  pdf_status text DEFAULT 'pending_pdf'::text,
  attachment_id uuid,
  idempotency_key text,
  customer_id text,
  customer_gstin text,
  taxable_amount numeric(14,2) DEFAULT 0,
  cgst_amount numeric(14,2) DEFAULT 0,
  sgst_amount numeric(14,2) DEFAULT 0,
  is_einvoice_applicable boolean DEFAULT false,
  irn_number text,
  payment_received_date text,
  updated_at timestamp with time zone DEFAULT now(),
  igst_amount numeric(14,2) DEFAULT 0 NOT NULL,
  CONSTRAINT customer_invoices_pkey PRIMARY KEY (id),
  CONSTRAINT customer_invoices_invoice_no_key UNIQUE (invoice_no),
  CONSTRAINT customer_invoices_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_idempotency_key ON public.customer_invoices USING btree (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_order_po ON public.customer_invoices USING btree (order_po);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_invoices_active_order ON public.customer_invoices USING btree (order_po) WHERE (status <> 'CANCELLED'::text);
ALTER TABLE public.customer_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customer invoices access" ON public.customer_invoices;
CREATE POLICY "Customer invoices access" ON public.customer_invoices FOR ALL
  USING (true);

-- ----- customer_invoice_items -----
CREATE TABLE IF NOT EXISTS public.customer_invoice_items (
  id character varying(100) NOT NULL,
  invoice_id character varying(100) NOT NULL,
  invoice_no character varying(50) NOT NULL,
  item_code character varying(100) NOT NULL,
  item_description text NOT NULL,
  hsn_code character varying(20) NOT NULL,
  qty numeric(12,2) NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  taxable_value numeric(12,2) NOT NULL,
  gst_rate numeric(5,2) NOT NULL,
  cgst_rate numeric(5,2) DEFAULT 0,
  sgst_rate numeric(5,2) DEFAULT 0,
  igst_rate numeric(5,2) DEFAULT 0,
  cgst_amount numeric(12,2) DEFAULT 0,
  sgst_amount numeric(12,2) DEFAULT 0,
  igst_amount numeric(12,2) DEFAULT 0,
  total_item_amount numeric(12,2) NOT NULL,
  gst_override_reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT customer_invoice_items_pkey PRIMARY KEY (id)
);
ALTER TABLE public.customer_invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access on customer_invoice_items" ON public.customer_invoice_items;
CREATE POLICY "Open access on customer_invoice_items" ON public.customer_invoice_items FOR ALL
  USING (true);

-- ----- vendor_bills -----
CREATE TABLE IF NOT EXISTS public.vendor_bills (
  id text NOT NULL,
  bill_no text NOT NULL,
  vendor_name text NOT NULL,
  po_no text NOT NULL,
  status text DEFAULT 'OPEN'::text NOT NULL,
  date text NOT NULL,
  due_date text NOT NULL,
  amount numeric DEFAULT 0 NOT NULL,
  paid_amount numeric DEFAULT 0 NOT NULL,
  balance_amount numeric DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  vendor_type character varying(100),
  vendor_pan character varying(20),
  tds_section character varying(20) DEFAULT 'NONE'::character varying,
  tds_rate numeric(5,2) DEFAULT 0.0,
  tds_amount numeric(12,2) DEFAULT 0.0,
  net_payable_amount numeric(12,2) DEFAULT 0.0,
  grn_no character varying(50),
  CONSTRAINT vendor_bills_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_bills_bill_no_key UNIQUE (bill_no)
);
ALTER TABLE public.vendor_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vendor bills access" ON public.vendor_bills;
CREATE POLICY "Vendor bills access" ON public.vendor_bills FOR ALL
  USING (true);

-- ----- views -----
CREATE OR REPLACE VIEW public.customer_overdue_summary WITH (security_invoker = true) AS
 SELECT c.id AS customer_id,
    c.name AS customer_name,
    c.legal_name,
    c.customer_type,
    COALESCE(c.credit_days, 30::numeric) AS credit_days,
    COALESCE(c.credit_limit, 0::numeric) AS credit_limit,
    count(i.id) AS total_unpaid_invoices,
    COALESCE(sum(
        CASE
            WHEN (CURRENT_DATE - i.date::date) > 90 AND i.status <> 'PAID'::text THEN i.total_amount
            ELSE 0::numeric
        END), 0::numeric) AS overdue_90_days_amount,
    COALESCE(sum(
        CASE
            WHEN i.status <> 'PAID'::text THEN i.total_amount
            ELSE 0::numeric
        END), 0::numeric) AS total_outstanding_amount,
        CASE
            WHEN COALESCE(sum(
            CASE
                WHEN (CURRENT_DATE - i.date::date) > 90 AND i.status <> 'PAID'::text THEN i.total_amount
                ELSE 0::numeric
            END), 0::numeric) > 0::numeric THEN true
            ELSE false
        END AS is_credit_hold_triggered
   FROM customer_masters c
     LEFT JOIN customer_invoices i ON i.customer_name = c.name AND i.status <> 'PAID'::text
  GROUP BY c.id, c.name, c.legal_name, c.customer_type, c.credit_days, c.credit_limit;


-- ============================================================================
-- 008_hr_and_workforce.sql
-- Meetings, tasks and task templates, leave, attendance, certifications and announcements.
-- Part of the consolidated GuruOm Owner OS schema. Idempotent: safe to re-run.
-- ============================================================================

-- ----- meetings -----
CREATE TABLE IF NOT EXISTS public.meetings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  agenda text,
  section text,
  organizer_id uuid NOT NULL,
  meeting_link text,
  location text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  status text DEFAULT 'SCHEDULED'::text NOT NULL,
  org_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT meetings_pkey PRIMARY KEY (id),
  CONSTRAINT meetings_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT meetings_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT meetings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id),
  CONSTRAINT meetings_end_after_start CHECK ((end_time > start_time)),
  CONSTRAINT meetings_status_check CHECK ((status = ANY (ARRAY['SCHEDULED'::text, 'CANCELLED'::text, 'COMPLETED'::text])))
);
CREATE INDEX IF NOT EXISTS idx_meetings_organizer_id ON public.meetings USING btree (organizer_id);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON public.meetings USING btree (start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings USING btree (status);
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on meetings" ON public.meetings;
CREATE POLICY "Service role full access on meetings" ON public.meetings FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- meeting_attendees -----
CREATE TABLE IF NOT EXISTS public.meeting_attendees (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  meeting_id uuid NOT NULL,
  user_id uuid NOT NULL,
  is_required boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT meeting_attendees_pkey PRIMARY KEY (id),
  CONSTRAINT meeting_attendees_meeting_id_user_id_key UNIQUE (meeting_id, user_id),
  CONSTRAINT meeting_attendees_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  CONSTRAINT meeting_attendees_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON public.meeting_attendees USING btree (meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user_id ON public.meeting_attendees USING btree (user_id);
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on meeting_attendees" ON public.meeting_attendees;
CREATE POLICY "Service role full access on meeting_attendees" ON public.meeting_attendees FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- meeting_reminder_jobs -----
CREATE TABLE IF NOT EXISTS public.meeting_reminder_jobs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  meeting_id uuid NOT NULL,
  remind_at timestamp with time zone NOT NULL,
  offset_label text NOT NULL,
  bullmq_job_id text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT meeting_reminder_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT meeting_reminder_jobs_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_meeting_reminder_jobs_meeting_id ON public.meeting_reminder_jobs USING btree (meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_reminder_jobs_remind_at ON public.meeting_reminder_jobs USING btree (remind_at);
ALTER TABLE public.meeting_reminder_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on meeting_reminder_jobs" ON public.meeting_reminder_jobs;
CREATE POLICY "Service role full access on meeting_reminder_jobs" ON public.meeting_reminder_jobs FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- tasks -----
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  description text,
  section text,
  priority text DEFAULT 'MEDIUM'::text NOT NULL,
  status text DEFAULT 'TODO'::text NOT NULL,
  due_date timestamp with time zone,
  assigned_by uuid NOT NULL,
  linked_entity_type text,
  linked_entity_id uuid,
  linked_entity_label text,
  org_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT tasks_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id),
  CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'URGENT'::text]))),
  CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['TODO'::text, 'IN_PROGRESS'::text, 'BLOCKED'::text, 'DONE'::text, 'CANCELLED'::text])))
);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON public.tasks USING btree (assigned_by);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks USING btree (due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_linked_entity ON public.tasks USING btree (linked_entity_type, linked_entity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks USING btree (status);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on tasks" ON public.tasks;
CREATE POLICY "Service role full access on tasks" ON public.tasks FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- task_assignees -----
CREATE TABLE IF NOT EXISTS public.task_assignees (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT task_assignees_pkey PRIMARY KEY (id),
  CONSTRAINT task_assignees_task_id_user_id_key UNIQUE (task_id, user_id),
  CONSTRAINT task_assignees_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT task_assignees_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON public.task_assignees USING btree (task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON public.task_assignees USING btree (user_id);
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on task_assignees" ON public.task_assignees;
CREATE POLICY "Service role full access on task_assignees" ON public.task_assignees FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- task_comments -----
CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  task_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT task_comments_pkey PRIMARY KEY (id),
  CONSTRAINT task_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES users(id),
  CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments USING btree (task_id);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on task_comments" ON public.task_comments;
CREATE POLICY "Service role full access on task_comments" ON public.task_comments FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- task_reminder_jobs -----
CREATE TABLE IF NOT EXISTS public.task_reminder_jobs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  task_id uuid NOT NULL,
  remind_at timestamp with time zone NOT NULL,
  offset_label text NOT NULL,
  bullmq_job_id text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT task_reminder_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT task_reminder_jobs_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_reminder_jobs_task_id ON public.task_reminder_jobs USING btree (task_id);
ALTER TABLE public.task_reminder_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on task_reminder_jobs" ON public.task_reminder_jobs;
CREATE POLICY "Service role full access on task_reminder_jobs" ON public.task_reminder_jobs FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- task_templates -----
CREATE TABLE IF NOT EXISTS public.task_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT task_templates_pkey PRIMARY KEY (id),
  CONSTRAINT task_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id)
);
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on task_templates" ON public.task_templates;
CREATE POLICY "Service role full access on task_templates" ON public.task_templates FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- task_template_items -----
CREATE TABLE IF NOT EXISTS public.task_template_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  template_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'MEDIUM'::text NOT NULL,
  due_days_offset integer DEFAULT 3 NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT task_template_items_pkey PRIMARY KEY (id),
  CONSTRAINT task_template_items_template_id_fkey FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE CASCADE,
  CONSTRAINT task_template_items_priority_check CHECK ((priority = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'URGENT'::text])))
);
CREATE INDEX IF NOT EXISTS idx_task_template_items_template_id ON public.task_template_items USING btree (template_id);
ALTER TABLE public.task_template_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on task_template_items" ON public.task_template_items;
CREATE POLICY "Service role full access on task_template_items" ON public.task_template_items FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- leave_requests -----
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  requester_id uuid NOT NULL,
  leave_type text DEFAULT 'CASUAL'::text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text DEFAULT 'PENDING'::text NOT NULL,
  decided_by uuid,
  decided_at timestamp with time zone,
  decision_note text,
  org_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  employee_id uuid,  -- legacy alias of requester_id (kept in sync by trigger)
  decision_notes text,  -- legacy alias of decision_note
  CONSTRAINT leave_requests_pkey PRIMARY KEY (id),
  CONSTRAINT leave_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT leave_requests_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES users(id),
  CONSTRAINT leave_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT leave_requests_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id),
  CONSTRAINT leave_requests_dates_valid CHECK ((end_date >= start_date)),
  CONSTRAINT leave_requests_leave_type_check CHECK ((leave_type = ANY (ARRAY['CASUAL'::text, 'SICK'::text, 'EARNED'::text, 'UNPAID'::text]))),
  CONSTRAINT leave_requests_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text, 'CANCELLED'::text])))
);
CREATE INDEX IF NOT EXISTS idx_leave_requests_requester_id ON public.leave_requests USING btree (requester_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests USING btree (status);
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on leave_requests" ON public.leave_requests;
CREATE POLICY "Service role full access on leave_requests" ON public.leave_requests FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- attendance_logs -----
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  work_date date NOT NULL,
  check_in timestamp with time zone,
  check_out timestamp with time zone,
  status text DEFAULT 'PRESENT'::text NOT NULL,
  source text DEFAULT 'MANUAL'::text,
  notes text,
  org_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  ip_address text,
  device text,
  device_type text,
  browser text,
  os text,
  user_agent text,
  employee_id uuid,  -- legacy alias of user_id (kept in sync by trigger)
  log_date date,  -- legacy alias of work_date (kept in sync by trigger)
  check_in_at timestamp with time zone,  -- legacy alias of check_in
  check_out_at timestamp with time zone,  -- legacy alias of check_out
  marked_by uuid,  -- legacy alias of created_by
  CONSTRAINT attendance_logs_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_logs_user_work_date_key UNIQUE (user_id, work_date),
  CONSTRAINT attendance_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT attendance_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT attendance_logs_status_check CHECK ((status = ANY (ARRAY['PRESENT'::text, 'ABSENT'::text, 'HALF_DAY'::text, 'ON_LEAVE'::text, 'HOLIDAY'::text, 'LATE'::text])))
);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_id ON public.attendance_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_work_date ON public.attendance_logs USING btree (work_date);
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on attendance_logs" ON public.attendance_logs;
CREATE POLICY "Service role full access on attendance_logs" ON public.attendance_logs FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- employee_certifications -----
CREATE TABLE IF NOT EXISTS public.employee_certifications (
  id character varying(100) DEFAULT (gen_random_uuid())::text NOT NULL,
  employee_name character varying(100),
  employee_code character varying(50),
  certification_name character varying(100),
  valid_until date,
  created_at timestamp with time zone DEFAULT now(),
  employee_id uuid,
  title text,
  issuing_body text,
  issued_date date DEFAULT CURRENT_DATE,
  expiry_date date,
  document_url text,
  assigned_by uuid,
  org_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT employee_certifications_pkey PRIMARY KEY (id),
  CONSTRAINT employee_certifications_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT employee_certifications_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_employee_certifications_employee_id ON public.employee_certifications USING btree (employee_id);
ALTER TABLE public.employee_certifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access on employee_certifications" ON public.employee_certifications;
CREATE POLICY "Open access on employee_certifications" ON public.employee_certifications FOR ALL
  USING (true);
DROP POLICY IF EXISTS "Service role full access on employee_certifications" ON public.employee_certifications;
CREATE POLICY "Service role full access on employee_certifications" ON public.employee_certifications FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- announcements -----
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  posted_by uuid,
  pinned boolean DEFAULT false NOT NULL,
  published_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone,
  org_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,  -- legacy alias of posted_by; the API embeds creator:created_by
  CONSTRAINT announcements_pkey PRIMARY KEY (id),
  CONSTRAINT announcements_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON public.announcements USING btree (pinned);
CREATE INDEX IF NOT EXISTS idx_announcements_posted_by ON public.announcements USING btree (posted_by);
CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON public.announcements USING btree (published_at DESC);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on announcements" ON public.announcements;
CREATE POLICY "Service role full access on announcements" ON public.announcements FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- compatibility columns -----
-- The API writes both the modern and the legacy column names of these tables.
-- No-ops on a new database; repairs projects built from the earlier migration set,
-- where these columns were never created (inserts failed in the sync triggers).
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS employee_id uuid;
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS log_date date;
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS check_in_at timestamp with time zone;
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS check_out_at timestamp with time zone;
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS marked_by uuid;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS employee_id uuid;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS decision_notes text;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.attendance_logs ALTER COLUMN work_date DROP DEFAULT;

-- ----- functions -----
CREATE OR REPLACE FUNCTION public.set_meetings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_tasks_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status = 'DONE' AND (OLD.status IS DISTINCT FROM 'DONE') THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status <> 'DONE' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_leave_requests_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_leave_requests_compat()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.requester_id IS NULL AND NEW.employee_id IS NOT NULL THEN
    NEW.requester_id := NEW.employee_id;
  END IF;
  IF NEW.employee_id IS NULL AND NEW.requester_id IS NOT NULL THEN
    NEW.employee_id := NEW.requester_id;
  END IF;
  IF NEW.decision_note IS NULL AND NEW.decision_notes IS NOT NULL THEN
    NEW.decision_note := NEW.decision_notes;
  END IF;
  IF NEW.decision_notes IS NULL AND NEW.decision_note IS NOT NULL THEN
    NEW.decision_notes := NEW.decision_note;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_attendance_logs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_attendance_logs_compat()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- user_id <-> employee_id
  IF NEW.user_id IS NULL AND NEW.employee_id IS NOT NULL THEN
    NEW.user_id := NEW.employee_id;
  END IF;
  IF NEW.employee_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.employee_id := NEW.user_id;
  END IF;

  -- work_date <-> log_date
  IF NEW.work_date IS NULL AND NEW.log_date IS NOT NULL THEN
    NEW.work_date := NEW.log_date;
  END IF;
  IF NEW.log_date IS NULL AND NEW.work_date IS NOT NULL THEN
    NEW.log_date := NEW.work_date;
  END IF;

  -- check_in <-> check_in_at
  IF NEW.check_in IS NULL AND NEW.check_in_at IS NOT NULL THEN
    NEW.check_in := NEW.check_in_at;
  END IF;
  IF NEW.check_in_at IS NULL AND NEW.check_in IS NOT NULL THEN
    NEW.check_in_at := NEW.check_in;
  END IF;

  -- check_out <-> check_out_at
  IF NEW.check_out IS NULL AND NEW.check_out_at IS NOT NULL THEN
    NEW.check_out := NEW.check_out_at;
  END IF;
  IF NEW.check_out_at IS NULL AND NEW.check_out IS NOT NULL THEN
    NEW.check_out_at := NEW.check_out;
  END IF;

  -- created_by <-> marked_by
  IF NEW.created_by IS NULL AND NEW.marked_by IS NOT NULL THEN
    NEW.created_by := NEW.marked_by;
  END IF;
  IF NEW.marked_by IS NULL AND NEW.created_by IS NOT NULL THEN
    NEW.marked_by := NEW.created_by;
  END IF;

  IF NEW.work_date IS NULL THEN
    NEW.work_date := CURRENT_DATE;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_employee_certifications_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_employee_certifications_compat()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- id default
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid()::text;
  END IF;

  -- employee_code <-> employee_id
  IF NEW.employee_id IS NULL AND NEW.employee_code IS NOT NULL AND NEW.employee_code ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    NEW.employee_id := NEW.employee_code::uuid;
  END IF;
  IF NEW.employee_code IS NULL AND NEW.employee_id IS NOT NULL THEN
    NEW.employee_code := NEW.employee_id::text;
  END IF;

  -- title <-> certification_name
  IF NEW.title IS NULL AND NEW.certification_name IS NOT NULL THEN
    NEW.title := NEW.certification_name;
  END IF;
  IF NEW.certification_name IS NULL AND NEW.title IS NOT NULL THEN
    NEW.certification_name := NEW.title;
  END IF;

  -- employee_name from users
  IF NEW.employee_name IS NULL AND NEW.employee_id IS NOT NULL THEN
    SELECT full_name INTO NEW.employee_name FROM public.users WHERE id = NEW.employee_id;
  END IF;

  -- expiry_date <-> valid_until
  IF NEW.expiry_date IS NULL AND NEW.valid_until IS NOT NULL THEN
    NEW.expiry_date := NEW.valid_until;
  END IF;
  IF NEW.valid_until IS NULL AND NEW.expiry_date IS NOT NULL THEN
    NEW.valid_until := NEW.expiry_date;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_announcements_compat()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- id default
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;

  -- posted_by <-> created_by
  IF NEW.posted_by IS NULL AND NEW.created_by IS NOT NULL THEN
    NEW.posted_by := NEW.created_by;
  END IF;
  IF NEW.created_by IS NULL AND NEW.posted_by IS NOT NULL THEN
    NEW.created_by := NEW.posted_by;
  END IF;

  -- published_at <-> created_at
  IF NEW.published_at IS NULL AND NEW.created_at IS NOT NULL THEN
    NEW.published_at := NEW.created_at;
  END IF;
  IF NEW.created_at IS NULL AND NEW.published_at IS NOT NULL THEN
    NEW.created_at := NEW.published_at;
  END IF;
  IF NEW.published_at IS NULL THEN
    NEW.published_at := NOW();
  END IF;

  -- pinned default
  IF NEW.pinned IS NULL THEN
    NEW.pinned := false;
  END IF;

  -- updated_at
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$function$;

-- ----- triggers -----
DROP TRIGGER IF EXISTS trg_meetings_updated_at ON public.meetings;
CREATE TRIGGER trg_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION set_meetings_updated_at();

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION set_tasks_updated_at();

DROP TRIGGER IF EXISTS trg_leave_requests_updated_at ON public.leave_requests;
CREATE TRIGGER trg_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION set_leave_requests_updated_at();

DROP TRIGGER IF EXISTS trg_sync_leave_requests_compat ON public.leave_requests;
CREATE TRIGGER trg_sync_leave_requests_compat BEFORE INSERT OR UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION sync_leave_requests_compat();

DROP TRIGGER IF EXISTS trg_attendance_logs_updated_at ON public.attendance_logs;
CREATE TRIGGER trg_attendance_logs_updated_at BEFORE UPDATE ON public.attendance_logs FOR EACH ROW EXECUTE FUNCTION set_attendance_logs_updated_at();

DROP TRIGGER IF EXISTS trg_sync_attendance_logs_compat ON public.attendance_logs;
CREATE TRIGGER trg_sync_attendance_logs_compat BEFORE INSERT OR UPDATE ON public.attendance_logs FOR EACH ROW EXECUTE FUNCTION sync_attendance_logs_compat();

DROP TRIGGER IF EXISTS trg_employee_certifications_updated_at ON public.employee_certifications;
CREATE TRIGGER trg_employee_certifications_updated_at BEFORE UPDATE ON public.employee_certifications FOR EACH ROW EXECUTE FUNCTION set_employee_certifications_updated_at();

DROP TRIGGER IF EXISTS trg_sync_employee_certifications_compat ON public.employee_certifications;
CREATE TRIGGER trg_sync_employee_certifications_compat BEFORE INSERT OR UPDATE ON public.employee_certifications FOR EACH ROW EXECUTE FUNCTION sync_employee_certifications_compat();

DROP TRIGGER IF EXISTS trg_sync_announcements_compat ON public.announcements;
CREATE TRIGGER trg_sync_announcements_compat BEFORE INSERT OR UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION sync_announcements_compat();


-- ---------------------------------------------------------------------------
-- certifications / certification_reminder_jobs
-- Used by backend/src/modules/certifications (mounted at /api/v1/certifications).
-- No earlier migration created these tables, so that module failed on every call.
-- Columns are taken from the module's reads/writes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.certifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  issuing_body  TEXT,
  issued_date   DATE,
  expiry_date   DATE,
  notes         TEXT,
  created_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_certifications_employee_id ON public.certifications (employee_id);
CREATE INDEX IF NOT EXISTS idx_certifications_expiry_date ON public.certifications (expiry_date);

CREATE TABLE IF NOT EXISTS public.certification_reminder_jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_id UUID NOT NULL REFERENCES public.certifications(id) ON DELETE CASCADE,
  remind_at        TIMESTAMPTZ NOT NULL,
  offset_label     TEXT NOT NULL,
  bullmq_job_id    TEXT,
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_certification_reminder_jobs_cert ON public.certification_reminder_jobs (certification_id);

ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_reminder_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on certifications" ON public.certifications;
CREATE POLICY "Service role full access on certifications" ON public.certifications
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access on certification_reminder_jobs" ON public.certification_reminder_jobs;
CREATE POLICY "Service role full access on certification_reminder_jobs" ON public.certification_reminder_jobs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.set_certifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_certifications_updated_at ON public.certifications;
CREATE TRIGGER trg_certifications_updated_at
  BEFORE UPDATE ON public.certifications
  FOR EACH ROW EXECUTE FUNCTION public.set_certifications_updated_at();


-- ============================================================================
-- 009_security_grants_and_realtime.sql
-- Server-mediated access model, realtime publication and PostgREST cache reload.
-- Runs after every table exists so the grants below cover ALL tables.
-- Idempotent: safe to re-run.
-- ============================================================================

COMMENT ON SCHEMA public IS 'GuruOm Owner OS: Direct anonymous client access is restricted. All business logic, mutations, and statutory transactions must originate from the authenticated backend API service.';

-- Anonymous (public anon key) clients can never write. All mutations go through the
-- Express backend using the service_role key.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES  IN SCHEMA public TO service_role;

-- Realtime: tables the frontend subscribes to.
DO $$
DECLARE
  tbl  TEXT;
  tbls TEXT[] := ARRAY['customer_invoices', 'customer_masters', 'customer_orders', 'dispatch_challans', 'finished_goods', 'job_cards', 'machine_masters', 'masters', 'notifications', 'pdi_inspections', 'production_logs', 'profiles', 'qc_inspections', 'stock_items', 'users', 'vendor_bills', 'vendor_masters'];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY tbls LOOP
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl)
         AND NOT EXISTS (
           SELECT 1 FROM pg_publication_tables
           WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
         ) THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.' || quote_ident(tbl);
      END IF;
    END LOOP;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Make PostgREST pick up the schema immediately.
NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- 010_reference_data.sql
-- System reference data the application cannot run without. NO demo, test or
-- company-specific records live here (no users, orders, items, customers, ...).
--
--   * roles / permissions / role_permission_grants  -> DB-driven RBAC
--   * role_permissions                              -> module access matrix + approval limits
--   * notification_rules                            -> catalogue of alertable events
--
-- Every insert is "seed once": ON CONFLICT DO NOTHING, so re-running this file
-- never overwrites roles, limits or toggles you changed from the admin console.
--
-- The first login account is NOT created here. Run:
--     npx tsx scripts/create-server-admin.ts
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Canonical roles (tier 0 = ServerAdmin ... tier 6 = Client)
-- ----------------------------------------------------------------------------
INSERT INTO public.roles (name, tier, description, is_system)
VALUES 
    ('ServerAdmin', 0, 'Platform Maker / Developer Team - Supreme Authority & Infrastructure Control', true),
    ('Owner', 1, 'Owner / Managing Director - Executive Authority over Enterprise Operations', true),
    ('Admin (System)', 2, 'System Administrator - Company User & Module Management', true),
    ('Purchase Manager', 3, 'Head of Procurement & Vendor Relations (₹1,00,000 Sign-off Ceiling)', false),
    ('Accountant', 3, 'Head of Finance, Billing & Statutory Accounting (₹50,000 Sign-off Ceiling)', false),
    ('Production Planner', 3, 'Production Planning & Control (PPC) Head', false),
    ('Quality Auditor', 3, 'Lead Quality Auditor (Pre-Delivery Inspection & Final Sign-off)', false),
    ('Quality Inspector', 4, 'In-Process QC Inspector (Holds & Non-Conformance Reports)', false),
    ('Store Keeper', 4, 'Inventory Executive (Goods Receipt & Material Issues)', false),
    ('Dispatch Executive', 4, 'Logistics, Transport & Delivery Challan Dispatcher', false),
    ('Sales/Order Desk', 4, 'Customer Orders & Commercial Proposal Desk', false),
    ('Subcontractor Coordinator', 4, 'Job-Work & Outwork Operations Coordinator', false),
    ('Shop Floor Supervisor', 4, 'Shopfloor Production Line Supervisor', false),
    ('HR/Admin', 4, 'Personnel, Master Catalog & Employee Record Administrator', false),
    ('Machine Operator', 5, 'Shopfloor Machine Operator & Technician', false),
    ('Client', 6, 'External Customer Portal (View-only)', false)
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Granular permission keys
-- ----------------------------------------------------------------------------
INSERT INTO public.permissions (key, category, description)
VALUES
    -- System & ServerAdmin Exclusive Capabilities
    ('system:server_admin_vault', 'system', 'Access ServerAdmin Maker Console and platform infrastructure'),
    ('system:raw_database_access', 'system', 'Execute direct administrative database routines and inspect raw tables'),
    ('system:override_all_rules', 'system', 'Bypass monetary approval limits, holds, and state-machine transitions'),
    ('system:manage_platform_tenants', 'system', 'Configure tenant isolation, storage buckets, and server environments'),
    ('system:view_immutable_audit', 'system', 'Inspect complete append-only admin and security event audit vaults'),
    ('system:manage_permission_overrides', 'system', 'Grant or revoke per-user granular permission overrides'),
    ('system:force_password_reset', 'system', 'Invalidate active user sessions and issue one-time reset tokens'),

    -- Administration & Users
    ('admin:view_users', 'administration', 'View user accounts, credential status, and role assignments'),
    ('admin:create_users', 'administration', 'Provision new user accounts with designated role'),
    ('admin:edit_users', 'administration', 'Modify staff profile information, contact numbers, and departments'),
    ('admin:assign_roles', 'administration', 'Change user roles adhering strictly to tier hierarchy rules'),
    ('admin:manage_masters', 'administration', 'Create, edit, or delete items, customers, vendors, and machine masters'),

    -- Orders & Commercials
    ('orders:view', 'orders', 'View customer purchase orders and line-item details'),
    ('orders:create_draft', 'orders', 'Create new customer order drafts from client PO'),
    ('orders:confirm', 'orders', 'Confirm customer order drafts and initiate fulfillment pipeline'),
    ('orders:edit_commercials', 'orders', 'Modify order pricing, discounts, and payment credit terms'),
    ('orders:cancel', 'orders', 'Cancel active orders and release allocated stock'),

    -- Inventory & Stores
    ('inventory:view', 'inventory', 'View inventory balances, bin locations, and stock ledger'),
    ('inventory:create_grn', 'inventory', 'Record Goods Receipt Notes (GRN) and update batch stock'),
    ('inventory:adjust_stock', 'inventory', 'Perform physical inventory reconciliation and balance write-offs'),

    -- Production & Shopfloor
    ('production:view', 'production', 'View job cards, route cards, and live machine status'),
    ('production:create_job_card', 'production', 'Generate and release production job cards for orders'),
    ('production:log_output', 'production', 'Log hourly stage output, completed quantities, and scrap scrap rates'),

    -- Procurement
    ('procurement:view', 'procurement', 'View purchase requisitions, RFQs, and purchase orders'),
    ('procurement:create_po', 'procurement', 'Draft and issue purchase orders to vendors'),
    ('procurement:approve_high_value', 'procurement', 'Approve purchase orders exceeding role standard monetary ceilings'),

    -- Quality Control (QC & PDI)
    ('qc:view', 'qc', 'View QC in-process inspection queues and PDI inspection logs'),
    ('qc:log_inspection', 'qc', 'Record inspection parameters, pass/fail status, and upload test reports'),
    ('qc:place_hold', 'qc', 'Place quality hold or raise Non-Conformance Reports (NCR) on defective lots'),
    ('qc:release_hold', 'qc', 'Clear quality holds and authorize rework or release'),

    -- Dispatch & Logistics
    ('dispatch:view', 'dispatch', 'View delivery schedules, pending shipments, and outbound challans'),
    ('dispatch:create_challan', 'dispatch', 'Generate statutory delivery challans for outbound goods'),
    ('dispatch:confirm_delivery', 'dispatch', 'Mark consignments delivered with Proof-of-Delivery (POD) documentation'),

    -- Accounting & Invoicing
    ('finance:view', 'finance', 'View sales invoices, vendor bills, and statutory ledger'),
    ('finance:generate_invoice', 'finance', 'Generate GST e-invoices for dispatched delivery challans'),
    ('finance:record_payment', 'finance', 'Record client payment receipts and vendor remittance entries'),
    ('finance:approve_high_value', 'finance', 'Authorize high-value vendor disbursements above standard limits')
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Role -> permission grants
-- ----------------------------------------------------------------------------
-- Map ServerAdmin Role to ALL Permissions (Unrestricted Full Grant)
INSERT INTO public.role_permission_grants (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'ServerAdmin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Map Owner & Admin (System) Roles to All Operational & Executive Permissions
INSERT INTO public.role_permission_grants (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.category != 'system' OR p.key IN ('system:view_immutable_audit', 'system:manage_permission_overrides', 'system:force_password_reset')
WHERE r.name IN ('Owner', 'Admin (System)')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Map Department Heads & Staff Permissions
INSERT INTO public.role_permission_grants (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON (
    (r.name = 'Purchase Manager' AND (p.category IN ('procurement', 'inventory') OR p.key IN ('admin:view_users', 'orders:view'))) OR
    (r.name = 'Accountant' AND (p.category IN ('finance', 'orders', 'dispatch') OR p.key IN ('admin:view_users', 'dispatch:view', 'dispatch:create_challan'))) OR
    (r.name = 'Production Planner' AND (p.category IN ('production', 'inventory') OR p.key IN ('orders:view', 'qc:view', 'dispatch:view'))) OR
    (r.name = 'Quality Auditor' AND (p.category = 'qc' OR p.key IN ('production:view', 'orders:view', 'dispatch:view', 'dispatch:create_challan'))) OR
    (r.name = 'Quality Inspector' AND (p.category = 'qc' OR p.key IN ('production:view', 'production:log_output'))) OR
    (r.name = 'Store Keeper' AND (p.category = 'inventory' OR p.key IN ('procurement:view', 'production:view', 'dispatch:view', 'dispatch:create_challan'))) OR
    (r.name = 'Dispatch Executive' AND (p.category = 'dispatch' OR p.key IN ('orders:view', 'inventory:view', 'dispatch:view', 'dispatch:create_challan', 'dispatch:confirm_delivery'))) OR
    (r.name = 'Sales/Order Desk' AND (p.category = 'orders' OR p.key IN ('inventory:view', 'dispatch:view'))) OR
    (r.name = 'Subcontractor Coordinator' AND (p.category IN ('production', 'inventory') OR p.key IN ('orders:view', 'dispatch:view', 'dispatch:create_challan'))) OR
    (r.name = 'Shop Floor Supervisor' AND (p.category = 'production' OR p.key IN ('inventory:view', 'qc:view'))) OR
    (r.name = 'HR/Admin' AND (p.category = 'administration' OR p.key IN ('system:view_immutable_audit', 'admin:view_users', 'admin:create_users', 'admin:edit_users', 'admin:manage_masters'))) OR
    (r.name = 'Machine Operator' AND p.key IN ('production:view', 'production:log_output'))
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Module access matrix (view / create-edit / approve, with monetary limits)
-- ----------------------------------------------------------------------------
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
ON CONFLICT (role, module) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Notification event catalogue (recipients are configured in the admin console)
-- ----------------------------------------------------------------------------
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
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 011_item_category_and_dimensions.sql
-- Add item category and dimension columns (dim_diameter, dim_length, dim_width, dim_thickness)
-- to the public.masters table. Nullable columns to preserve existing rows.
-- ============================================================================
ALTER TABLE public.masters
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS dim_diameter numeric,
  ADD COLUMN IF NOT EXISTS dim_length numeric,
  ADD COLUMN IF NOT EXISTS dim_width numeric,
  ADD COLUMN IF NOT EXISTS dim_thickness numeric;

CREATE INDEX IF NOT EXISTS idx_masters_category ON public.masters USING btree (category);

COMMIT;
