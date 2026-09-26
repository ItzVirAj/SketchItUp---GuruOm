-- One row per calendar day. Populated by metrics.service.ts — either the
-- daily BullMQ job (backend/src/worker.ts) or a manual/cron call to
-- POST /api/v1/metrics/capture-today. Feeds the copilot's get_business_trends tool.

CREATE TABLE IF NOT EXISTS public.daily_snapshots (
  snapshot_date DATE PRIMARY KEY,
  revenue NUMERIC NOT NULL DEFAULT 0,
  open_order_count INTEGER NOT NULL DEFAULT 0,
  avg_order_value NUMERIC NOT NULL DEFAULT 0,
  top_customer TEXT,
  rejection_rate NUMERIC NOT NULL DEFAULT 0, -- 0..1
  orders_placed_count INTEGER NOT NULL DEFAULT 0,
  qc_inspected_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_snapshots_date ON public.daily_snapshots (snapshot_date DESC);

ALTER TABLE public.daily_snapshots ENABLE ROW LEVEL SECURITY;

-- Only the backend (service-role key, which bypasses RLS entirely per your
-- config/database.ts) ever touches this table — same posture as audit_logs.
DROP POLICY IF EXISTS "Backend full access on daily_snapshots" ON public.daily_snapshots;
CREATE POLICY "Backend full access on daily_snapshots"
ON public.daily_snapshots
FOR ALL
USING (true)
WITH CHECK (true);