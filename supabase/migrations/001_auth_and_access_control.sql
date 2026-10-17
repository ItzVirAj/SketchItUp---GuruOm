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
