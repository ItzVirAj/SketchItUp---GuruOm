-- ============================================================================
-- Migration: 046_attendance.sql
-- Description: HR Module — Attendance Logs
--              Table public.attendance_logs: id, user_id, work_date, check_in,
--              check_out, status, source, notes, org_id, created_by,
--              created_at, updated_at.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY')),
    source TEXT DEFAULT 'MANUAL',
    notes TEXT,
    org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT attendance_logs_user_work_date_key UNIQUE (user_id, work_date)
);

-- Idempotent column reconciliations in case table pre-existed from earlier dev drafts
DO $$ 
BEGIN
  -- user_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_logs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.attendance_logs ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE RESTRICT;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'attendance_logs' AND column_name = 'employee_id'
    ) THEN
      UPDATE public.attendance_logs SET user_id = employee_id WHERE employee_id IS NOT NULL;
    END IF;
  END IF;

  -- work_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_logs' AND column_name = 'work_date'
  ) THEN
    ALTER TABLE public.attendance_logs ADD COLUMN work_date DATE;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'attendance_logs' AND column_name = 'log_date'
    ) THEN
      UPDATE public.attendance_logs SET work_date = log_date WHERE log_date IS NOT NULL;
    END IF;
  END IF;

  -- check_in column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_logs' AND column_name = 'check_in'
  ) THEN
    ALTER TABLE public.attendance_logs ADD COLUMN check_in TIMESTAMPTZ;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'attendance_logs' AND column_name = 'check_in_at'
    ) THEN
      UPDATE public.attendance_logs SET check_in = check_in_at WHERE check_in_at IS NOT NULL;
    END IF;
  END IF;

  -- check_out column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_logs' AND column_name = 'check_out'
  ) THEN
    ALTER TABLE public.attendance_logs ADD COLUMN check_out TIMESTAMPTZ;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'attendance_logs' AND column_name = 'check_out_at'
    ) THEN
      UPDATE public.attendance_logs SET check_out = check_out_at WHERE check_out_at IS NOT NULL;
    END IF;
  END IF;

  -- source column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_logs' AND column_name = 'source'
  ) THEN
    ALTER TABLE public.attendance_logs ADD COLUMN source TEXT DEFAULT 'MANUAL';
  END IF;

  -- org_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_logs' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.attendance_logs ADD COLUMN org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;

  -- created_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_logs' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.attendance_logs ADD COLUMN created_by UUID REFERENCES public.users(id);
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'attendance_logs' AND column_name = 'marked_by'
    ) THEN
      UPDATE public.attendance_logs SET created_by = marked_by WHERE marked_by IS NOT NULL;
    END IF;
  END IF;

  -- Update status check constraint if needed
  ALTER TABLE public.attendance_logs DROP CONSTRAINT IF EXISTS attendance_logs_status_check;
  ALTER TABLE public.attendance_logs ADD CONSTRAINT attendance_logs_status_check
    CHECK (status IN ('PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'LATE'));

  -- Ensure unique index exists on (user_id, work_date)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_logs_user_work_date_key'
  ) THEN
    -- In case duplicates existed in earlier tests, keep only the latest row per (user_id, work_date)
    DELETE FROM public.attendance_logs a USING public.attendance_logs b
    WHERE a.id < b.id 
      AND a.user_id = b.user_id 
      AND a.work_date = b.work_date 
      AND a.user_id IS NOT NULL 
      AND a.work_date IS NOT NULL;

    BEGIN
      ALTER TABLE public.attendance_logs ADD CONSTRAINT attendance_logs_user_work_date_key UNIQUE (user_id, work_date);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_id ON public.attendance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_work_date ON public.attendance_logs(work_date);

ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on attendance_logs" ON public.attendance_logs;
CREATE POLICY "Service role full access on attendance_logs" ON public.attendance_logs
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.set_attendance_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_logs_updated_at ON public.attendance_logs;
CREATE TRIGGER trg_attendance_logs_updated_at
  BEFORE UPDATE ON public.attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_attendance_logs_updated_at();

-- Bi-directional column compatibility trigger to support both canonical and legacy column shapes
CREATE OR REPLACE FUNCTION public.sync_attendance_logs_compat() 
RETURNS TRIGGER AS $$
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_attendance_logs_compat ON public.attendance_logs;
CREATE TRIGGER trg_sync_attendance_logs_compat
  BEFORE INSERT OR UPDATE ON public.attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.sync_attendance_logs_compat();
