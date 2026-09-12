-- ============================================================================
-- Migration: 042_tasks_hr_module.sql
-- Description: HR module, second submodule "Tasks" — internal action-item /
--              job assignment tracker. Distinct from `job_cards` (production's
--              shop-floor jobs tied to customer orders): these are ad-hoc
--              internal tasks ("follow up with Vendor X on delayed GRN",
--              "prep the audit binder") assigned by a section head to a
--              teammate, independent of the order state machine.
-- ============================================================================

-- 1. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    section TEXT,                          -- optional grouping, e.g. 'purchasing', 'qc'
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED')),
    due_date TIMESTAMPTZ,
    assigned_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    -- Loose polymorphic link back to whatever this task is actually about
    -- (an order, a vendor, a GRN...) without a hard FK into every module.
    linked_entity_type TEXT,               -- e.g. 'order', 'vendor', 'grn'
    linked_entity_id UUID,
    linked_entity_label TEXT,              -- human-readable snapshot (e.g. order number), survives if the source row changes
    org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON public.tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_tasks_linked_entity ON public.tasks(linked_entity_type, linked_entity_id);

-- 2. TASK ASSIGNEES (supports assigning one task to several teammates, same
--    shape as meeting_attendees for consistency)
CREATE TABLE IF NOT EXISTS public.task_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON public.task_assignees(user_id);

-- 3. TASK COMMENTS (lightweight activity/status thread — "done, waiting on QC")
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.users(id),
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);

-- 4. TASK REMINDER JOBS (mirrors meeting_reminder_jobs — tracks queued BullMQ
--    jobs so edits/status changes can retract a due-date reminder that no
--    longer applies)
CREATE TABLE IF NOT EXISTS public.task_reminder_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    remind_at TIMESTAMPTZ NOT NULL,
    offset_label TEXT NOT NULL,            -- e.g. '24h_before_due', 'overdue'
    bullmq_job_id TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_reminder_jobs_task_id ON public.task_reminder_jobs(task_id);

-- 5. ROW LEVEL SECURITY (service-role only, matching migration 037/038)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reminder_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on tasks" ON public.tasks;
CREATE POLICY "Service role full access on tasks" ON public.tasks
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access on task_assignees" ON public.task_assignees;
CREATE POLICY "Service role full access on task_assignees" ON public.task_assignees
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access on task_comments" ON public.task_comments;
CREATE POLICY "Service role full access on task_comments" ON public.task_comments
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access on task_reminder_jobs" ON public.task_reminder_jobs;
CREATE POLICY "Service role full access on task_reminder_jobs" ON public.task_reminder_jobs
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 6. updated_at trigger (same pattern as 038_meetings_hr_module.sql)
CREATE OR REPLACE FUNCTION public.set_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status = 'DONE' AND (OLD.status IS DISTINCT FROM 'DONE') THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status <> 'DONE' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_tasks_updated_at();
