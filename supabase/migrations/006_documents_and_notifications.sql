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
