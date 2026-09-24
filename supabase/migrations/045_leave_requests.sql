-- ============================================================================
-- Migration: 045_leave_requests.sql
-- Description: HR Module — Leave / Time-Off Requests
--              Table public.leave_requests: id, requester_id, leave_type,
--              start_date, end_date, reason, status, decided_by, decided_at,
--              decision_note, org_id, created_at, updated_at.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    leave_type TEXT NOT NULL DEFAULT 'CASUAL' CHECK (leave_type IN ('CASUAL', 'SICK', 'EARNED', 'UNPAID')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    decided_by UUID REFERENCES public.users(id),
    decided_at TIMESTAMPTZ,
    decision_note TEXT,
    org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT leave_requests_dates_valid CHECK (end_date >= start_date)
);

-- Idempotent column reconciliations in case table pre-existed from earlier dev drafts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leave_requests' AND column_name = 'requester_id'
  ) THEN
    ALTER TABLE public.leave_requests ADD COLUMN requester_id UUID REFERENCES public.users(id) ON DELETE RESTRICT;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'leave_requests' AND column_name = 'employee_id'
    ) THEN
      UPDATE public.leave_requests SET requester_id = employee_id WHERE employee_id IS NOT NULL;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leave_requests' AND column_name = 'decision_note'
  ) THEN
    ALTER TABLE public.leave_requests ADD COLUMN decision_note TEXT;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'leave_requests' AND column_name = 'decision_notes'
    ) THEN
      UPDATE public.leave_requests SET decision_note = decision_notes WHERE decision_notes IS NOT NULL;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leave_requests' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.leave_requests ADD COLUMN org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leave_requests' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.leave_requests ADD COLUMN created_by UUID REFERENCES public.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leave_requests' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE public.leave_requests ADD COLUMN updated_by UUID REFERENCES public.users(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leave_requests_requester_id ON public.leave_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on leave_requests" ON public.leave_requests;
CREATE POLICY "Service role full access on leave_requests" ON public.leave_requests
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.set_leave_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leave_requests_updated_at ON public.leave_requests;
CREATE TRIGGER trg_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_leave_requests_updated_at();

-- Bi-directional column compatibility trigger to support both canonical and legacy schema shapes
CREATE OR REPLACE FUNCTION public.sync_leave_requests_compat() 
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_leave_requests_compat ON public.leave_requests;
CREATE TRIGGER trg_sync_leave_requests_compat
  BEFORE INSERT OR UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.sync_leave_requests_compat();

