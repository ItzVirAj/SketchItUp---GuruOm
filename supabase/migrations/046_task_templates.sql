-- ============================================================================
-- Migration: 046_task_templates.sql
-- Description: HR module — Task Templates. A named, reusable bundle of task
--   definitions (e.g. "New Hire Onboarding") that gets "applied" to one or
--   more people, creating real rows in the EXISTING `tasks`/`task_assignees`
--   tables (038_meetings_hr_module.sql / 041_tasks_hr_module.sql) — this is
--   not a parallel task system, just a factory for the one that exists.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    due_days_offset INTEGER NOT NULL DEFAULT 3,  -- due_date = application date + this many days
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_template_items_template_id ON public.task_template_items(template_id);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_template_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on task_templates" ON public.task_templates;
CREATE POLICY "Service role full access on task_templates" ON public.task_templates
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access on task_template_items" ON public.task_template_items;
CREATE POLICY "Service role full access on task_template_items" ON public.task_template_items
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Seed one ready-to-use template so the feature isn't empty on first load.
INSERT INTO public.task_templates (id, name, description)
VALUES ('00000000-0000-0000-0000-000000000101', 'New Hire Onboarding', 'Standard checklist applied when a new employee joins.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.task_template_items (template_id, title, description, priority, due_days_offset, sort_order)
SELECT '00000000-0000-0000-0000-000000000101', title, description, priority, offset_days, ord
FROM (VALUES
  ('IT & system access setup', 'Create login, email, and grant baseline module access.', 'HIGH', 1, 1),
  ('Issue ID card / safety gear', 'Factory ID, PPE, and site induction materials.', 'HIGH', 1, 2),
  ('Safety briefing', 'Walk the shop floor safety procedures and emergency exits.', 'MEDIUM', 2, 3),
  ('Assign reporting manager & shift', 'Confirm department, shift, and reporting line in Employee Management.', 'MEDIUM', 2, 4),
  ('30-day check-in', 'Quick sync on how onboarding is going.', 'LOW', 30, 5)
) AS t(title, description, priority, offset_days, ord)
WHERE NOT EXISTS (SELECT 1 FROM public.task_template_items WHERE template_id = '00000000-0000-0000-0000-000000000101');
