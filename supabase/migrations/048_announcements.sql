-- ============================================================================
-- Migration: 048_announcements.sql
-- Description: HR Module — Company Announcements
--              Table public.announcements: id, title, body, posted_by, pinned,
--              published_at, expires_at, org_id, created_at, updated_at.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    posted_by UUID REFERENCES public.users(id) ON DELETE RESTRICT,
    pinned BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reconcile columns if table pre-existed
DO $$ 
BEGIN
  -- posted_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'announcements' AND column_name = 'posted_by'
  ) THEN
    ALTER TABLE public.announcements ADD COLUMN posted_by UUID REFERENCES public.users(id) ON DELETE RESTRICT;
  END IF;

  -- pinned
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'announcements' AND column_name = 'pinned'
  ) THEN
    ALTER TABLE public.announcements ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- published_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'announcements' AND column_name = 'published_at'
  ) THEN
    ALTER TABLE public.announcements ADD COLUMN published_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'announcements' AND column_name = 'created_at'
    ) THEN
      UPDATE public.announcements SET published_at = created_at WHERE published_at IS NULL;
    END IF;
  END IF;

  -- org_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'announcements' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.announcements ADD COLUMN org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;

  -- updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'announcements' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.announcements ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Sync posted_by from created_by if pre-existing
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'announcements' AND column_name = 'created_by'
  ) THEN
    UPDATE public.announcements SET posted_by = created_by WHERE posted_by IS NULL AND created_by IS NOT NULL;
  END IF;
END $$;

-- Indexes on published_at and pinned
CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON public.announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON public.announcements(pinned);
CREATE INDEX IF NOT EXISTS idx_announcements_posted_by ON public.announcements(posted_by);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on announcements" ON public.announcements;
CREATE POLICY "Service role full access on announcements" ON public.announcements
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Bi-directional column compatibility trigger
CREATE OR REPLACE FUNCTION public.sync_announcements_compat() 
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_announcements_compat ON public.announcements;
CREATE TRIGGER trg_sync_announcements_compat
  BEFORE INSERT OR UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.sync_announcements_compat();
