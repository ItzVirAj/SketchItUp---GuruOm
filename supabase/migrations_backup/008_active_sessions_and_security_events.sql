-- ============================================================================
-- Migration 008: Active Sessions & Suspicious Login Security Events Schema
-- SketchItUp Owner OS Precision Security System
-- ============================================================================

-- 1. ENHANCE SESSIONS TABLE WITH METADATA & TOKEN FAMILIES
ALTER TABLE public.sessions 
    ADD COLUMN IF NOT EXISTS token_family_id UUID DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'desktop',
    ADD COLUMN IF NOT EXISTS device_name TEXT DEFAULT 'Unknown Device',
    ADD COLUMN IF NOT EXISTS browser TEXT,
    ADD COLUMN IF NOT EXISTS browser_version TEXT,
    ADD COLUMN IF NOT EXISTS os TEXT,
    ADD COLUMN IF NOT EXISTS os_version TEXT,
    ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India',
    ADD COLUMN IF NOT EXISTS region TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Mumbai',
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS risk_score INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS revoked_reason TEXT;

-- Indexing for fast session lookups and token family lookups
CREATE INDEX IF NOT EXISTS idx_sessions_token_family_id ON public.sessions(token_family_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_last_used ON public.sessions(user_id, last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked_at ON public.sessions(revoked_at);

-- 2. CREATE SECURITY EVENTS AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    session_id UUID,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    ip_address TEXT,
    user_agent TEXT,
    device_name TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    country TEXT,
    region TEXT,
    city TEXT,
    risk_score INT DEFAULT 0,
    risk_level TEXT DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    flagged_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for fast security query retrieval
CREATE INDEX IF NOT EXISTS idx_sec_events_user_id ON public.security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_events_event_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sec_events_severity ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_sec_events_created_at ON public.security_events(created_at DESC);

-- 3. ENABLE ROW LEVEL SECURITY ON SECURITY EVENTS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR BACKEND SERVICE ROLE
DROP POLICY IF EXISTS "Service role full access on security_events" ON public.security_events;
CREATE POLICY "Service role full access on security_events" ON public.security_events FOR ALL USING (true);
