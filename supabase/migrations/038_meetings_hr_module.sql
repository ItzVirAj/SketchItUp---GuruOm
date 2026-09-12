-- ============================================================================
-- Migration: 038_meetings_hr_module.sql
-- Description: HR module, first submodule "Meetings" — a lightweight meeting
--              scheduler + reminder system (NOT a meeting/video platform).
--              Owner/Admin (System)/ServerAdmin create & manage meetings;
--              every authenticated user (including Client) can view scheduled
--              meetings and copy the shared link. Reminders are dispatched by
--              the existing BullMQ worker (see backend/src/worker.ts) via the
--              existing notifications pipeline (see notifications.service.ts).
-- ============================================================================

-- 1. MEETINGS TABLE
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    agenda TEXT,
    section TEXT,                          -- optional free-text grouping, e.g. 'production', 'purchasing'
    organizer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    meeting_link TEXT,                     -- external link (Meet/Zoom/Teams/etc.) — this app never hosts the call
    location TEXT,                         -- optional physical location, alternative/addition to meeting_link
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'CANCELLED', 'COMPLETED')),
    org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT meetings_end_after_start CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON public.meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_organizer_id ON public.meetings(organizer_id);

-- 2. MEETING ATTENDEES (who a meeting is for; drives who reminders target)
CREATE TABLE IF NOT EXISTS public.meeting_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    is_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (meeting_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON public.meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user_id ON public.meeting_attendees(user_id);

-- 3. MEETING REMINDER JOBS (tracks queued BullMQ jobs so edits/cancels can
--    retract or reschedule the exact delayed job instead of guessing)
CREATE TABLE IF NOT EXISTS public.meeting_reminder_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    remind_at TIMESTAMPTZ NOT NULL,
    offset_label TEXT NOT NULL,            -- e.g. '24h_before', '15m_before'
    bullmq_job_id TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_reminder_jobs_meeting_id ON public.meeting_reminder_jobs(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_reminder_jobs_remind_at ON public.meeting_reminder_jobs(remind_at);

-- 4. Extend `notifications` with a `data` JSONB column. The existing
--    `triggerNotification` service already accepts a `data` field in its
--    Zod schema (TriggerNotificationSchema) but never persisted or broadcast
--    it — this column, plus the matching service-layer change, is what lets
--    meeting reminders carry `attendeeUserIds` to the frontend so it can
--    scope the toast to actual invitees instead of every connected client.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'data'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN data JSONB;
    END IF;
END $$;

-- 5. ROW LEVEL SECURITY
-- Per migration 037, anon mutations are already revoked schema-wide and all
-- business logic is server-mediated via the service_role key. These policies
-- match the pattern used for `users`/`sessions` in migration 007.
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_reminder_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on meetings" ON public.meetings;
CREATE POLICY "Service role full access on meetings" ON public.meetings
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access on meeting_attendees" ON public.meeting_attendees;
CREATE POLICY "Service role full access on meeting_attendees" ON public.meeting_attendees
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access on meeting_reminder_jobs" ON public.meeting_reminder_jobs;
CREATE POLICY "Service role full access on meeting_reminder_jobs" ON public.meeting_reminder_jobs
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 6. updated_at trigger (matches the convention used elsewhere, e.g. `users`)
CREATE OR REPLACE FUNCTION public.set_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_meetings_updated_at ON public.meetings;
CREATE TRIGGER trg_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.set_meetings_updated_at();
