-- ============================================================================
-- Migration: 042_canonicalize_and_constrain_user_roles.sql
-- Description: Fixes RBAC issue #7 — migration 039 had to drop the original
--   CHECK constraint on public.users.role because it only permitted a
--   5-value legacy vocabulary ('SUPER ADMIN', 'OPERATOR', 'QC_MANAGER',
--   'DISPATCH_CLERK', 'FINANCE_MANAGER') that doesn't include any of the
--   canonical role strings (rbacMatrix.ts's RBAC_ROLE_MATRIX) actually used
--   everywhere else in the app — so the column has had NO constraint at all
--   since then. This migration:
--     1. Canonicalizes any legacy/alias role strings already in the table
--        (the exact same aliases normalizeRole() in rbacMatrix.ts already
--        recognizes at the application layer — this makes the *data* match
--        what the app already treats as equivalent, instead of relying on
--        every read path to re-normalize it).
--     2. Refuses to proceed (RAISE EXCEPTION, not a silent no-op) if any
--        role value remains that isn't canonical and isn't a known alias —
--        surfaces genuinely unknown data for a human to look at, rather than
--        quietly leaving it unconstrained or guessing.
--     3. Re-adds a real CHECK constraint scoped to the 17 canonical roles
--        RBAC_ROLE_MATRIX actually defines.
--     4. Fixes the column DEFAULT, which was still 'OPERATOR' (non-canonical)
--        — left as-is, this migration's own new CHECK constraint would break
--        every future INSERT that relies on the default.
--   Scope note: `user_role` and `public.profiles.role` are intentionally left
--   alone here — user_role already defaults to a canonical value and isn't
--   the column requireAuth/rbac.middleware.ts prioritize, and profiles.role
--   is a different table/concern. Touching those is a separate follow-up if
--   actually needed, not bundled into this fix.
-- ============================================================================

-- 1. Normalize whitespace exactly as normalizeRole() does client-side
--    (`rawRole.replace(/\s+/g, ' ').trim()`), so alias matching below is reliable.
UPDATE public.users
SET role = trim(regexp_replace(role, '\s+', ' ', 'g'))
WHERE role IS NOT NULL AND role <> trim(regexp_replace(role, '\s+', ' ', 'g'));

-- 2. Canonicalize known legacy aliases — this list is a direct mirror of
--    normalizeRole() in src/utils/rbacMatrix.ts. If that function's alias
--    list changes, update both places together.
UPDATE public.users SET role = 'ServerAdmin'              WHERE role IN ('SERVER_ADMIN', 'SERVER ADMIN', 'Server Admin');
UPDATE public.users SET role = 'Admin (System)'           WHERE role IN ('SUPER ADMIN', 'Super Admin');
UPDATE public.users SET role = 'Owner'                    WHERE role IN ('Admin / Owner', 'Owner / Admin', 'Managing Director');
UPDATE public.users SET role = 'Sales/Order Desk'         WHERE role IN ('Sales', 'Sales Executive', 'Sales / Order Desk', 'Order Desk', 'Order Manager');
UPDATE public.users SET role = 'Production Planner'       WHERE role IN ('PPC', 'PPC Planner', 'Production Manager');
UPDATE public.users SET role = 'Shop Floor Supervisor'    WHERE role IN ('Production Supervisor', 'Supervisor');
UPDATE public.users SET role = 'Quality Inspector'        WHERE role IN ('QC_MANAGER', 'QC Inspector', 'Quality Manager', 'QC/QA Inspector');
UPDATE public.users SET role = 'Quality Auditor'          WHERE role IN ('PDI Auditor', 'PDI Inspector');
UPDATE public.users SET role = 'Subcontractor Coordinator' WHERE role IN ('Job-Work Coordinator', 'Subcontract Manager');
UPDATE public.users SET role = 'Store Keeper'             WHERE role IN ('Store / Inventory Executive', 'Inventory Clerk', 'Inventory/Store Manager', 'Store Manager');
UPDATE public.users SET role = 'Purchase Manager'         WHERE role IN ('Purchase Executive', 'Procurement Head', 'Procurement Manager');
UPDATE public.users SET role = 'Dispatch Executive'       WHERE role IN ('DISPATCH_CLERK', 'Logistics Coordinator', 'Transport/Dispatch User', 'Transport User');
UPDATE public.users SET role = 'Accountant'               WHERE role IN ('FINANCE_MANAGER', 'Accounts Executive', 'Finance Manager', 'Accounts/Finance User');
UPDATE public.users SET role = 'HR/Admin'                 WHERE role IN ('HR / Admin', 'HR Manager');
UPDATE public.users SET role = 'Machine Operator'         WHERE role IN ('OPERATOR', 'Technician', 'Operator');
UPDATE public.users SET role = 'Client'                   WHERE role IN ('Customer', 'CLIENT');
UPDATE public.users SET role = 'TESTER'                   WHERE role IN ('TEST_USER', 'Tester', 'Test User', 'QA_TESTER');

-- 3. Refuse to proceed if anything is still unrecognized. This is
--    deliberately a hard failure, not a warning — silently letting unknown
--    role data through is exactly the fail-open pattern this fix exists to
--    close off.
DO $$
DECLARE
  bad_roles TEXT;
BEGIN
  SELECT string_agg(DISTINCT role, ', ') INTO bad_roles
  FROM public.users
  WHERE role IS NOT NULL AND role NOT IN (
    'ServerAdmin', 'Owner', 'Sales/Order Desk', 'Production Planner', 'Shop Floor Supervisor',
    'Quality Inspector', 'Quality Auditor', 'Store Keeper', 'Purchase Manager', 'Dispatch Executive',
    'Accountant', 'HR/Admin', 'Machine Operator', 'Admin (System)', 'Subcontractor Coordinator',
    'Client', 'TESTER'
  );

  IF bad_roles IS NOT NULL THEN
    RAISE EXCEPTION 'Migration 042 aborted: found users.role value(s) that are neither a canonical role nor a known alias: %. Reconcile these manually — either fix the data, or add the value as a new alias in normalizeRole() (rbacMatrix.ts) and in this migration — then re-run.', bad_roles;
  END IF;
END $$;

-- 4. Fix the stale default before constraining — 'OPERATOR' is non-canonical
--    and would break every future INSERT that omits role once step 5 lands.
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'Machine Operator';

-- 5. Re-add a real CHECK constraint, scoped to the actual canonical vocabulary.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_canonical_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_canonical_check CHECK (
  role IS NULL OR role IN (
    'ServerAdmin', 'Owner', 'Sales/Order Desk', 'Production Planner', 'Shop Floor Supervisor',
    'Quality Inspector', 'Quality Auditor', 'Store Keeper', 'Purchase Manager', 'Dispatch Executive',
    'Accountant', 'HR/Admin', 'Machine Operator', 'Admin (System)', 'Subcontractor Coordinator',
    'Client', 'TESTER'
  )
);
