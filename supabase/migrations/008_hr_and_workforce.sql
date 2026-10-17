-- ============================================================================
-- 008_hr_and_workforce.sql
-- Meetings, tasks and task templates, leave, attendance, certifications and announcements.
-- Part of the consolidated GuruOm Owner OS schema. Idempotent: safe to re-run.
-- ============================================================================

-- ----- meetings -----
CREATE TABLE IF NOT EXISTS public.meetings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  agenda text,
  section text,
  organizer_id uuid NOT NULL,
  meeting_link text,
  location text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  status text DEFAULT 'SCHEDULED'::text NOT NULL,
  org_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT meetings_pkey PRIMARY KEY (id),
  CONSTRAINT meetings_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT meetings_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT meetings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id),
  CONSTRAINT meetings_end_after_start CHECK ((end_time > start_time)),
  CONSTRAINT meetings_status_check CHECK ((status = ANY (ARRAY['SCHEDULED'::text, 'CANCELLED'::text, 'COMPLETED'::text])))
);
CREATE INDEX IF NOT EXISTS idx_meetings_organizer_id ON public.meetings USING btree (organizer_id);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON public.meetings USING btree (start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings USING btree (status);
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on meetings" ON public.meetings;
CREATE POLICY "Service role full access on meetings" ON public.meetings FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- meeting_attendees -----
CREATE TABLE IF NOT EXISTS public.meeting_attendees (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  meeting_id uuid NOT NULL,
  user_id uuid NOT NULL,
  is_required boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT meeting_attendees_pkey PRIMARY KEY (id),
  CONSTRAINT meeting_attendees_meeting_id_user_id_key UNIQUE (meeting_id, user_id),
  CONSTRAINT meeting_attendees_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  CONSTRAINT meeting_attendees_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON public.meeting_attendees USING btree (meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user_id ON public.meeting_attendees USING btree (user_id);
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on meeting_attendees" ON public.meeting_attendees;
CREATE POLICY "Service role full access on meeting_attendees" ON public.meeting_attendees FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- meeting_reminder_jobs -----
CREATE TABLE IF NOT EXISTS public.meeting_reminder_jobs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  meeting_id uuid NOT NULL,
  remind_at timestamp with time zone NOT NULL,
  offset_label text NOT NULL,
  bullmq_job_id text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT meeting_reminder_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT meeting_reminder_jobs_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_meeting_reminder_jobs_meeting_id ON public.meeting_reminder_jobs USING btree (meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_reminder_jobs_remind_at ON public.meeting_reminder_jobs USING btree (remind_at);
ALTER TABLE public.meeting_reminder_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on meeting_reminder_jobs" ON public.meeting_reminder_jobs;
CREATE POLICY "Service role full access on meeting_reminder_jobs" ON public.meeting_reminder_jobs FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- tasks -----
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  description text,
  section text,
  priority text DEFAULT 'MEDIUM'::text NOT NULL,
  status text DEFAULT 'TODO'::text NOT NULL,
  due_date timestamp with time zone,
  assigned_by uuid NOT NULL,
  linked_entity_type text,
  linked_entity_id uuid,
  linked_entity_label text,
  org_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT tasks_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id),
  CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'URGENT'::text]))),
  CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['TODO'::text, 'IN_PROGRESS'::text, 'BLOCKED'::text, 'DONE'::text, 'CANCELLED'::text])))
);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON public.tasks USING btree (assigned_by);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks USING btree (due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_linked_entity ON public.tasks USING btree (linked_entity_type, linked_entity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks USING btree (status);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on tasks" ON public.tasks;
CREATE POLICY "Service role full access on tasks" ON public.tasks FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- task_assignees -----
CREATE TABLE IF NOT EXISTS public.task_assignees (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT task_assignees_pkey PRIMARY KEY (id),
  CONSTRAINT task_assignees_task_id_user_id_key UNIQUE (task_id, user_id),
  CONSTRAINT task_assignees_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT task_assignees_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON public.task_assignees USING btree (task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON public.task_assignees USING btree (user_id);
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on task_assignees" ON public.task_assignees;
CREATE POLICY "Service role full access on task_assignees" ON public.task_assignees FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- task_comments -----
CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  task_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT task_comments_pkey PRIMARY KEY (id),
  CONSTRAINT task_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES users(id),
  CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments USING btree (task_id);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on task_comments" ON public.task_comments;
CREATE POLICY "Service role full access on task_comments" ON public.task_comments FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- task_reminder_jobs -----
CREATE TABLE IF NOT EXISTS public.task_reminder_jobs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  task_id uuid NOT NULL,
  remind_at timestamp with time zone NOT NULL,
  offset_label text NOT NULL,
  bullmq_job_id text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT task_reminder_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT task_reminder_jobs_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_reminder_jobs_task_id ON public.task_reminder_jobs USING btree (task_id);
ALTER TABLE public.task_reminder_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on task_reminder_jobs" ON public.task_reminder_jobs;
CREATE POLICY "Service role full access on task_reminder_jobs" ON public.task_reminder_jobs FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- task_templates -----
CREATE TABLE IF NOT EXISTS public.task_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT task_templates_pkey PRIMARY KEY (id),
  CONSTRAINT task_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id)
);
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on task_templates" ON public.task_templates;
CREATE POLICY "Service role full access on task_templates" ON public.task_templates FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- task_template_items -----
CREATE TABLE IF NOT EXISTS public.task_template_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  template_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'MEDIUM'::text NOT NULL,
  due_days_offset integer DEFAULT 3 NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT task_template_items_pkey PRIMARY KEY (id),
  CONSTRAINT task_template_items_template_id_fkey FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE CASCADE,
  CONSTRAINT task_template_items_priority_check CHECK ((priority = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'URGENT'::text])))
);
CREATE INDEX IF NOT EXISTS idx_task_template_items_template_id ON public.task_template_items USING btree (template_id);
ALTER TABLE public.task_template_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on task_template_items" ON public.task_template_items;
CREATE POLICY "Service role full access on task_template_items" ON public.task_template_items FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- leave_requests -----
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  requester_id uuid NOT NULL,
  leave_type text DEFAULT 'CASUAL'::text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text DEFAULT 'PENDING'::text NOT NULL,
  decided_by uuid,
  decided_at timestamp with time zone,
  decision_note text,
  org_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  employee_id uuid,  -- legacy alias of requester_id (kept in sync by trigger)
  decision_notes text,  -- legacy alias of decision_note
  CONSTRAINT leave_requests_pkey PRIMARY KEY (id),
  CONSTRAINT leave_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT leave_requests_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES users(id),
  CONSTRAINT leave_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT leave_requests_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id),
  CONSTRAINT leave_requests_dates_valid CHECK ((end_date >= start_date)),
  CONSTRAINT leave_requests_leave_type_check CHECK ((leave_type = ANY (ARRAY['CASUAL'::text, 'SICK'::text, 'EARNED'::text, 'UNPAID'::text]))),
  CONSTRAINT leave_requests_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text, 'CANCELLED'::text])))
);
CREATE INDEX IF NOT EXISTS idx_leave_requests_requester_id ON public.leave_requests USING btree (requester_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests USING btree (status);
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on leave_requests" ON public.leave_requests;
CREATE POLICY "Service role full access on leave_requests" ON public.leave_requests FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- attendance_logs -----
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  work_date date NOT NULL,
  check_in timestamp with time zone,
  check_out timestamp with time zone,
  status text DEFAULT 'PRESENT'::text NOT NULL,
  source text DEFAULT 'MANUAL'::text,
  notes text,
  org_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  ip_address text,
  device text,
  device_type text,
  browser text,
  os text,
  user_agent text,
  employee_id uuid,  -- legacy alias of user_id (kept in sync by trigger)
  log_date date,  -- legacy alias of work_date (kept in sync by trigger)
  check_in_at timestamp with time zone,  -- legacy alias of check_in
  check_out_at timestamp with time zone,  -- legacy alias of check_out
  marked_by uuid,  -- legacy alias of created_by
  CONSTRAINT attendance_logs_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_logs_user_work_date_key UNIQUE (user_id, work_date),
  CONSTRAINT attendance_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT attendance_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT attendance_logs_status_check CHECK ((status = ANY (ARRAY['PRESENT'::text, 'ABSENT'::text, 'HALF_DAY'::text, 'ON_LEAVE'::text, 'HOLIDAY'::text, 'LATE'::text])))
);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_id ON public.attendance_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_work_date ON public.attendance_logs USING btree (work_date);
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on attendance_logs" ON public.attendance_logs;
CREATE POLICY "Service role full access on attendance_logs" ON public.attendance_logs FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- employee_certifications -----
CREATE TABLE IF NOT EXISTS public.employee_certifications (
  id character varying(100) DEFAULT (gen_random_uuid())::text NOT NULL,
  employee_name character varying(100),
  employee_code character varying(50),
  certification_name character varying(100),
  valid_until date,
  created_at timestamp with time zone DEFAULT now(),
  employee_id uuid,
  title text,
  issuing_body text,
  issued_date date DEFAULT CURRENT_DATE,
  expiry_date date,
  document_url text,
  assigned_by uuid,
  org_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT employee_certifications_pkey PRIMARY KEY (id),
  CONSTRAINT employee_certifications_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT employee_certifications_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_employee_certifications_employee_id ON public.employee_certifications USING btree (employee_id);
ALTER TABLE public.employee_certifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access on employee_certifications" ON public.employee_certifications;
CREATE POLICY "Open access on employee_certifications" ON public.employee_certifications FOR ALL
  USING (true);
DROP POLICY IF EXISTS "Service role full access on employee_certifications" ON public.employee_certifications;
CREATE POLICY "Service role full access on employee_certifications" ON public.employee_certifications FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- announcements -----
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  posted_by uuid,
  pinned boolean DEFAULT false NOT NULL,
  published_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone,
  org_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,  -- legacy alias of posted_by; the API embeds creator:created_by
  CONSTRAINT announcements_pkey PRIMARY KEY (id),
  CONSTRAINT announcements_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON public.announcements USING btree (pinned);
CREATE INDEX IF NOT EXISTS idx_announcements_posted_by ON public.announcements USING btree (posted_by);
CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON public.announcements USING btree (published_at DESC);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on announcements" ON public.announcements;
CREATE POLICY "Service role full access on announcements" ON public.announcements FOR ALL
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

-- ----- compatibility columns -----
-- The API writes both the modern and the legacy column names of these tables.
-- No-ops on a new database; repairs projects built from the earlier migration set,
-- where these columns were never created (inserts failed in the sync triggers).
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS employee_id uuid;
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS log_date date;
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS check_in_at timestamp with time zone;
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS check_out_at timestamp with time zone;
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS marked_by uuid;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS employee_id uuid;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS decision_notes text;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.attendance_logs ALTER COLUMN work_date DROP DEFAULT;

-- ----- functions -----
CREATE OR REPLACE FUNCTION public.set_meetings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_tasks_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status = 'DONE' AND (OLD.status IS DISTINCT FROM 'DONE') THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status <> 'DONE' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_leave_requests_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_leave_requests_compat()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.set_attendance_logs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_attendance_logs_compat()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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

  IF NEW.work_date IS NULL THEN
    NEW.work_date := CURRENT_DATE;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_employee_certifications_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_employee_certifications_compat()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sync_announcements_compat()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

-- ----- triggers -----
DROP TRIGGER IF EXISTS trg_meetings_updated_at ON public.meetings;
CREATE TRIGGER trg_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION set_meetings_updated_at();

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION set_tasks_updated_at();

DROP TRIGGER IF EXISTS trg_leave_requests_updated_at ON public.leave_requests;
CREATE TRIGGER trg_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION set_leave_requests_updated_at();

DROP TRIGGER IF EXISTS trg_sync_leave_requests_compat ON public.leave_requests;
CREATE TRIGGER trg_sync_leave_requests_compat BEFORE INSERT OR UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION sync_leave_requests_compat();

DROP TRIGGER IF EXISTS trg_attendance_logs_updated_at ON public.attendance_logs;
CREATE TRIGGER trg_attendance_logs_updated_at BEFORE UPDATE ON public.attendance_logs FOR EACH ROW EXECUTE FUNCTION set_attendance_logs_updated_at();

DROP TRIGGER IF EXISTS trg_sync_attendance_logs_compat ON public.attendance_logs;
CREATE TRIGGER trg_sync_attendance_logs_compat BEFORE INSERT OR UPDATE ON public.attendance_logs FOR EACH ROW EXECUTE FUNCTION sync_attendance_logs_compat();

DROP TRIGGER IF EXISTS trg_employee_certifications_updated_at ON public.employee_certifications;
CREATE TRIGGER trg_employee_certifications_updated_at BEFORE UPDATE ON public.employee_certifications FOR EACH ROW EXECUTE FUNCTION set_employee_certifications_updated_at();

DROP TRIGGER IF EXISTS trg_sync_employee_certifications_compat ON public.employee_certifications;
CREATE TRIGGER trg_sync_employee_certifications_compat BEFORE INSERT OR UPDATE ON public.employee_certifications FOR EACH ROW EXECUTE FUNCTION sync_employee_certifications_compat();

DROP TRIGGER IF EXISTS trg_sync_announcements_compat ON public.announcements;
CREATE TRIGGER trg_sync_announcements_compat BEFORE INSERT OR UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION sync_announcements_compat();


-- ---------------------------------------------------------------------------
-- certifications / certification_reminder_jobs
-- Used by backend/src/modules/certifications (mounted at /api/v1/certifications).
-- No earlier migration created these tables, so that module failed on every call.
-- Columns are taken from the module's reads/writes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.certifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  issuing_body  TEXT,
  issued_date   DATE,
  expiry_date   DATE,
  notes         TEXT,
  created_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_certifications_employee_id ON public.certifications (employee_id);
CREATE INDEX IF NOT EXISTS idx_certifications_expiry_date ON public.certifications (expiry_date);

CREATE TABLE IF NOT EXISTS public.certification_reminder_jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_id UUID NOT NULL REFERENCES public.certifications(id) ON DELETE CASCADE,
  remind_at        TIMESTAMPTZ NOT NULL,
  offset_label     TEXT NOT NULL,
  bullmq_job_id    TEXT,
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_certification_reminder_jobs_cert ON public.certification_reminder_jobs (certification_id);

ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_reminder_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on certifications" ON public.certifications;
CREATE POLICY "Service role full access on certifications" ON public.certifications
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access on certification_reminder_jobs" ON public.certification_reminder_jobs;
CREATE POLICY "Service role full access on certification_reminder_jobs" ON public.certification_reminder_jobs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.set_certifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_certifications_updated_at ON public.certifications;
CREATE TRIGGER trg_certifications_updated_at
  BEFORE UPDATE ON public.certifications
  FOR EACH ROW EXECUTE FUNCTION public.set_certifications_updated_at();
