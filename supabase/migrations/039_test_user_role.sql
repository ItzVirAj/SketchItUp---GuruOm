-- ============================================================================
-- Migration 039: Add Testing Role (TESTER) & Provision user@guruom.in
-- Description: Creates the TESTER role in public.roles and grants full operational
--              permissions in public.role_permission_grants.
--              Provisions user@guruom.in directly in public.users with Pass@123.
--              Does NOT touch legacy auth.users or profiles tables.
-- ============================================================================

-- 1. Ensure any legacy role check constraints on public.users do not block 'TESTER'
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.users'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%role%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 2. Insert/Upsert the 'TESTER' role in public.roles (Tier 3: Operations Authority)
INSERT INTO public.roles (name, tier, description, is_system)
VALUES (
    'TESTER',
    3,
    'QA / Operations Testing Role - Full Operational Access Across All Workflows (Admin Panel Restricted)',
    false
)
ON CONFLICT (name) DO UPDATE
SET tier = EXCLUDED.tier,
    description = EXCLUDED.description,
    updated_at = NOW();

-- 3. Grant ALL Operational & Commercial Permissions to 'TESTER'
-- Grants orders, inventory, production, procurement, qc, dispatch, finance, masters
-- Strictly EXCLUDES system:* vault tools and admin:view_users / admin:create_users / admin:assign_roles
INSERT INTO public.role_permission_grants (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'TESTER'
  AND (
    p.category NOT IN ('system', 'administration')
    OR p.key = 'admin:manage_masters'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. Upsert user@guruom.in in public.users
-- Argon2id password hash for 'Pass@123':
-- $argon2id$v=19$m=65536,p=1,t=3$5v6as5TwWV10fWTFABFLag$K4YePDQ5n3vqWeNSN1ZsTzZyXTJqzA/sOVKBiNiM4c0
INSERT INTO public.users (
    id,
    email,
    password_hash,
    full_name,
    role,
    user_role,
    department,
    phone,
    status,
    is_temporary_password,
    failed_login_attempts,
    lockout_until,
    created_at,
    updated_at
) VALUES (
    COALESCE(
        (SELECT id FROM public.users WHERE LOWER(email) = 'user@guruom.in'),
        gen_random_uuid()
    ),
    'user@guruom.in',
    '$argon2id$v=19$m=65536,p=1,t=3$5v6as5TwWV10fWTFABFLag$K4YePDQ5n3vqWeNSN1ZsTzZyXTJqzA/sOVKBiNiM4c0',
    'Testing User (Full Access)',
    'TESTER',
    'TESTER',
    'Quality Assurance & Testing',
    '+91 98250 12345',
    'ACTIVE',
    false,
    0,
    NULL,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = 'TESTER',
    user_role = 'TESTER',
    department = EXCLUDED.department,
    phone = EXCLUDED.phone,
    status = 'ACTIVE',
    is_temporary_password = false,
    failed_login_attempts = 0,
    lockout_until = NULL,
    updated_at = NOW();

-- 5. Clear any stale sessions to ensure a clean login
DELETE FROM public.sessions
WHERE user_id IN (SELECT id FROM public.users WHERE LOWER(email) = 'user@guruom.in');
