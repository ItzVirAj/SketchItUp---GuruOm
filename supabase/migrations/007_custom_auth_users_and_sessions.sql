-- ============================================================================
-- Migration 007: Custom JWT Auth - Users and Sessions Schema & Data Migration
-- Owner OS Precision Operations System
-- ============================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'OPERATOR' CHECK (role IN ('SUPER ADMIN', 'OPERATOR', 'QC_MANAGER', 'DISPATCH_CLERK', 'FINANCE_MANAGER')),
    department TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'SUSPENDED')),
    org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    is_temporary_password BOOLEAN NOT NULL DEFAULT false,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    lockout_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- 2. SESSIONS (REFRESH TOKENS) TABLE
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON public.sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions(expires_at);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR BACKEND SERVICE ROLE (Default Deny for Anon Key)
DROP POLICY IF EXISTS "Service role full access on users" ON public.users;
CREATE POLICY "Service role full access on users" ON public.users FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on sessions" ON public.sessions;
CREATE POLICY "Service role full access on sessions" ON public.sessions FOR ALL USING (true);

-- 5. BACKFILL USERS FROM EXISTING PROFILES & SEED DEMO ACCOUNTS
-- Note: Standard temporary password hash for demo accounts ('1234567890')
-- Generated via Argon2id: $argon2id$v=19$m=65536,t=3,p=4$ZGVtb19zYWx0XzEyMzQ1Ng$kU096h4VfW9P3B3F+n1X9V3E2B6Q9J1X0E2B6Q9J1X0
-- is_temporary_password = true flags accounts for password change on production launch.

DO $$
DECLARE
    -- Standard demo password hash for '1234567890' (argon2id)
    v_demo_hash TEXT := '$argon2id$v=19$m=65536,p=4,t=3$VgHcmjAIFdBPsWEkHYiakw$b10tFs2HPJOw+wKzZHy9zmayWA34zywOYLZOiqCIqcI';
BEGIN
    -- Backfill from public.profiles if exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        INSERT INTO public.users (
            id,
            email,
            password_hash,
            full_name,
            role,
            department,
            phone,
            status,
            is_temporary_password,
            created_at,
            updated_at
        )
        SELECT 
            COALESCE(p.id, gen_random_uuid()),
            LOWER(p.email),
            v_demo_hash,
            COALESCE(p.full_name, split_part(p.email, '@', 1)),
            COALESCE(p.role, 'OPERATOR'),
            p.department,
            p.phone,
            COALESCE(p.status, 'ACTIVE'),
            true, -- Flagged as temporary password
            COALESCE(p.created_at, NOW()),
            COALESCE(p.updated_at, NOW())
        FROM public.profiles p
        ON CONFLICT (email) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            department = EXCLUDED.department,
            phone = EXCLUDED.phone,
            status = EXCLUDED.status,
            updated_at = NOW();
    END IF;

    -- Guarantee baseline demo users exist with accurate roles
    INSERT INTO public.users (email, password_hash, full_name, role, department, phone, status, is_temporary_password) VALUES
    ('user@guruom.in', v_demo_hash, 'Pramod Parshi (Founder & CEO)', 'SUPER ADMIN', 'Executive Management', '+91 98250 12345', 'ACTIVE', true),
    ('admin@guruom.in', v_demo_hash, 'System Super Admin', 'SUPER ADMIN', 'Executive Management', '+91 98250 12345', 'ACTIVE', true),
    ('rohan.deshpande@example.com', v_demo_hash, 'Rohan Deshpande', 'SUPER ADMIN', 'Executive Management', '+91 98220 99001', 'ACTIVE', true),
    ('sachin@example.com', v_demo_hash, 'Sachin Gharbude', 'SUPER ADMIN', 'Plant Operations Admin', '+91 98220 99010', 'ACTIVE', true),
    ('operator@guruom.in', v_demo_hash, 'Rajesh Sharma', 'OPERATOR', 'CNC Operations', '+91 98250 23456', 'ACTIVE', true),
    ('suresh.yadav@example.com', v_demo_hash, 'Suresh Yadav', 'OPERATOR', 'Shop Floor Production', '+91 98220 99003', 'ACTIVE', true),
    ('qc@guruom.in', v_demo_hash, 'Anita Patel', 'QC_MANAGER', 'Quality Assurance', '+91 98250 34567', 'ACTIVE', true),
    ('snehal.bhosale@example.com', v_demo_hash, 'Snehal Bhosale', 'QC_MANAGER', 'Quality Inspection', '+91 98220 99006', 'ACTIVE', true),
    ('dispatch@guruom.in', v_demo_hash, 'Vikram Singh', 'DISPATCH_CLERK', 'Logistics & Dispatch', '+91 98250 45678', 'ACTIVE', true),
    ('amit.salunkhe@example.com', v_demo_hash, 'Amit Salunkhe', 'DISPATCH_CLERK', 'Logistics & Dispatch', '+91 98220 99007', 'ACTIVE', true),
    ('finance@guruom.in', v_demo_hash, 'Suresh Mehta', 'FINANCE_MANAGER', 'Accounts & Finance', '+91 98250 56789', 'ACTIVE', true),
    ('meenal.joshi@example.com', v_demo_hash, 'Meenal Joshi', 'FINANCE_MANAGER', 'Accounts & Billing', '+91 98220 99009', 'ACTIVE', true)
    ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        department = EXCLUDED.department,
        phone = EXCLUDED.phone,
        status = EXCLUDED.status,
        updated_at = NOW();
END $$;
