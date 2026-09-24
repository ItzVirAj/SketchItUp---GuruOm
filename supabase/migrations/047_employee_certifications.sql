-- ============================================================================
-- Migration: 047_employee_certifications.sql
-- Description: HR Module — Employee Certifications & Skills Qualification
--              Table public.employee_certifications: id, employee_id, title,
--              issuing_body, issued_date, expiry_date, document_url,
--              assigned_by, org_id, created_at, updated_at.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.employee_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    issuing_body TEXT,
    issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    document_url TEXT,
    assigned_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reconcile columns if the table already pre-existed
DO $$ 
BEGIN
  -- id default
  ALTER TABLE public.employee_certifications ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

  -- Relax legacy NOT NULL columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_certifications' AND column_name = 'employee_name'
  ) THEN
    ALTER TABLE public.employee_certifications ALTER COLUMN employee_name DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_certifications' AND column_name = 'certification_name'
  ) THEN
    ALTER TABLE public.employee_certifications ALTER COLUMN certification_name DROP NOT NULL;
  END IF;

  -- employee_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_certifications' AND column_name = 'employee_id'
  ) THEN
    ALTER TABLE public.employee_certifications ADD COLUMN employee_id UUID REFERENCES public.users(id) ON DELETE RESTRICT;
  END IF;

  -- title
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_certifications' AND column_name = 'title'
  ) THEN
    ALTER TABLE public.employee_certifications ADD COLUMN title TEXT;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'employee_certifications' AND column_name = 'certification_name'
    ) THEN
      UPDATE public.employee_certifications SET title = certification_name WHERE title IS NULL AND certification_name IS NOT NULL;
    END IF;
  END IF;

  -- issuing_body
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_certifications' AND column_name = 'issuing_body'
  ) THEN
    ALTER TABLE public.employee_certifications ADD COLUMN issuing_body TEXT;
  END IF;

  -- issued_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_certifications' AND column_name = 'issued_date'
  ) THEN
    ALTER TABLE public.employee_certifications ADD COLUMN issued_date DATE DEFAULT CURRENT_DATE;
  END IF;

  -- expiry_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_certifications' AND column_name = 'expiry_date'
  ) THEN
    ALTER TABLE public.employee_certifications ADD COLUMN expiry_date DATE;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'employee_certifications' AND column_name = 'valid_until'
    ) THEN
      UPDATE public.employee_certifications SET expiry_date = valid_until WHERE expiry_date IS NULL AND valid_until IS NOT NULL;
    END IF;
  END IF;

  -- document_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_certifications' AND column_name = 'document_url'
  ) THEN
    ALTER TABLE public.employee_certifications ADD COLUMN document_url TEXT;
  END IF;

  -- assigned_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_certifications' AND column_name = 'assigned_by'
  ) THEN
    ALTER TABLE public.employee_certifications ADD COLUMN assigned_by UUID REFERENCES public.users(id) ON DELETE RESTRICT;
  END IF;

  -- org_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_certifications' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.employee_certifications ADD COLUMN org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;

  -- updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_certifications' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.employee_certifications ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_employee_certifications_employee_id ON public.employee_certifications(employee_id);

ALTER TABLE public.employee_certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on employee_certifications" ON public.employee_certifications;
CREATE POLICY "Service role full access on employee_certifications" ON public.employee_certifications
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.set_employee_certifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employee_certifications_updated_at ON public.employee_certifications;
CREATE TRIGGER trg_employee_certifications_updated_at
  BEFORE UPDATE ON public.employee_certifications
  FOR EACH ROW EXECUTE FUNCTION public.set_employee_certifications_updated_at();

-- Bi-directional column compatibility trigger to support both title/certification_name and expiry_date/valid_until
CREATE OR REPLACE FUNCTION public.sync_employee_certifications_compat() 
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_employee_certifications_compat ON public.employee_certifications;
CREATE TRIGGER trg_sync_employee_certifications_compat
  BEFORE INSERT OR UPDATE ON public.employee_certifications
  FOR EACH ROW EXECUTE FUNCTION public.sync_employee_certifications_compat();
