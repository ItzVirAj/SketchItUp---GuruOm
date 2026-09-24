-- ============================================================================
-- Migration: 041_fix_owner_identity.sql
-- Description: Repairs the Owner identity after migration 040_revert_tester_role.sql
--              wrongly promoted the QA test account (user@guruom.in) to the 'Owner' role.
--   - Upserts the canonical Owner: Sachin Gharbude / owner@guruom.in (role 'Owner').
--   - Demotes user@guruom.in to a non-privileged OPERATOR test account (never Owner).
--   - Removes the ad-hoc TESTER role grants + role row (idempotent).
--   - Clears sessions for both accounts so they re-authenticate cleanly.
-- Safe to re-run: every statement is idempotent.
-- ============================================================================

-- 1. Upsert the canonical Owner account (Sachin Gharbude / owner@guruom.in).
INSERT INTO public.users (
    id, email, password_hash, full_name, role, user_role, department, phone, status,
    is_temporary_password, failed_login_attempts, lockout_until, created_at, updated_at
) VALUES (
    COALESCE((SELECT id FROM public.users WHERE LOWER(email) = 'owner@guruom.in'), gen_random_uuid()),
    'owner@guruom.in',
    '$argon2id$v=19$m=65536,p=1,t=3$5v6as5TwWV10fWTFABFLag$K4YePDQ5n3vqWeNSN1ZsTzZyXTJqzA/sOVKBiNiM4c0',
    'Sachin Gharbude',
    'Owner',
    'Owner',
    'Executive / Management',
    '+91 97639 69798',
    'ACTIVE',
    false, 0, NULL, NOW(), NOW()
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = 'Sachin Gharbude',
    role = 'Owner',
    user_role = 'Owner',
    department = EXCLUDED.department,
    phone = EXCLUDED.phone,
    status = 'ACTIVE',
    is_temporary_password = false,
    failed_login_attempts = 0,
    lockout_until = NULL,
    updated_at = NOW();

-- 2. Demote the QA test account (user@guruom.in) — it must never carry the Owner role.
UPDATE public.users
SET
    role = 'OPERATOR',
    user_role = 'OPERATOR',
    full_name = 'QA Test User',
    department = 'Quality Assurance & Testing',
    updated_at = NOW()
WHERE LOWER(email) = 'user@guruom.in';

-- 3. Remove TESTER's permission grants (DB-driven roles/permissions system).
DELETE FROM public.role_permission_grants
WHERE role_id IN (SELECT id FROM public.roles WHERE name = 'TESTER');

-- 4. Remove the TESTER role row itself, now that nothing references it.
DELETE FROM public.roles WHERE name = 'TESTER';

-- 5. Clear sessions so both accounts re-authenticate cleanly.
DELETE FROM public.sessions
WHERE user_id IN (
    SELECT id FROM public.users
    WHERE LOWER(email) IN ('owner@guruom.in', 'user@guruom.in')
);
