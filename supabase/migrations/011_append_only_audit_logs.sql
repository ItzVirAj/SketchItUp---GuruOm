-- ===================================================
-- Migration 010: Append-Only Immutable Audit Logs
-- ===================================================

-- 1. Create or update audit_logs table with WHO, WHAT, WHEN, WHERE, BEFORE, AFTER
DROP TABLE IF EXISTS public.audit_logs CASCADE;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,               -- e.g. 'UPDATE_INVOICE', 'RECORD_PAYMENT', 'UPDATE_ROLE', 'ADJUST_STOCK', 'LOGIN_FAILED', 'PERMISSION_DENIED'
  entity_type TEXT NOT NULL,          -- e.g. 'invoice', 'order', 'inventory', 'user', 'qc_inspection'
  entity_id TEXT NOT NULL,
  before_state JSONB DEFAULT NULL,
  after_state JSONB DEFAULT NULL,
  ip_address TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);

-- 3. Enforce Append-Only with Database-Level Triggers (Immutable Audit History)
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS no_update_audit_logs ON public.audit_logs;
CREATE TRIGGER no_update_audit_logs
BEFORE UPDATE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS no_delete_audit_logs ON public.audit_logs;
CREATE TRIGGER no_delete_audit_logs
BEFORE DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Insert policy for authenticated backend / service role
DROP POLICY IF EXISTS "Allow backend inserts on audit_logs" ON public.audit_logs;
CREATE POLICY "Allow backend inserts on audit_logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- No UPDATE or DELETE policies exist — with RLS enabled and no matching policy, updates and deletes are denied by default.
