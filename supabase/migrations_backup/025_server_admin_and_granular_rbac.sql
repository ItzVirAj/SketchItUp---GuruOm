-- ============================================================================
-- Migration: 025_server_admin_and_granular_rbac.sql
-- Description: Top-Tier ServerAdmin Role, Canonical Roles Table with Tier Ranks,
--              Granular Permissions, Role-Permission Mappings, User Permission
--              Overrides, and Immutable Admin Audit Logging.
-- ============================================================================

-- 1. Create Canonical Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    tier INT NOT NULL, -- 0 = ServerAdmin (Maker/Dev), 1 = Owner, 2 = Admin, 3 = Department Head, 4 = Operations Staff, 5 = Operators, 6 = Client
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_tier ON public.roles(tier);

-- 2. Create Granular Permissions Table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL, -- 'system', 'administration', 'orders', 'inventory', 'production', 'procurement', 'qc', 'dispatch', 'finance'
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_key ON public.permissions(key);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON public.permissions(category);

-- 3. Create Role-Permission Grants Mapping Table
CREATE TABLE IF NOT EXISTS public.role_permission_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permission_grants_role ON public.role_permission_grants(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permission_grants_perm ON public.role_permission_grants(permission_id);

-- 4. Create User Permission Overrides Table (Per-user explicit grants/revokes)
CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
    effect TEXT NOT NULL CHECK (effect IN ('GRANTED', 'REVOKED')),
    granted_by UUID REFERENCES public.users(id),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_user ON public.user_permission_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_perm ON public.user_permission_overrides(permission_key);

-- 5. Create Immutable Admin Audit Log Table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    actor_email TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL, -- e.g. 'ROLE_ASSIGNED', 'ROLE_REVOKED', 'PERMISSION_OVERRIDDEN', 'PASSWORD_RESET_ISSUED', 'USER_STATUS_CHANGED', 'SERVER_ADMIN_SEEDED'
    target_user_id UUID,
    target_user_email TEXT,
    before_state JSONB,
    after_state JSONB,
    ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor ON public.admin_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON public.admin_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);

-- Trigger to make admin_audit_log strictly append-only (prevent UPDATE/DELETE)
CREATE OR REPLACE FUNCTION public.prevent_admin_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'admin_audit_log is immutable and append-only: updates and deletes are strictly forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_audit_log_immutable ON public.admin_audit_log;
CREATE TRIGGER trg_admin_audit_log_immutable
BEFORE UPDATE OR DELETE ON public.admin_audit_log
FOR EACH ROW
EXECUTE FUNCTION public.prevent_admin_audit_log_mutation();

-- 6. Seed Canonical Roles with Tier Hierarchy
INSERT INTO public.roles (name, tier, description, is_system)
VALUES 
    ('ServerAdmin', 0, 'Platform Maker / Developer Team - Supreme Authority & Infrastructure Control', true),
    ('Owner', 1, 'Owner / Managing Director - Executive Authority over Enterprise Operations', true),
    ('Admin (System)', 2, 'System Administrator - Company User & Module Management', true),
    ('Purchase Manager', 3, 'Head of Procurement & Vendor Relations (₹1,00,000 Sign-off Ceiling)', false),
    ('Accountant', 3, 'Head of Finance, Billing & Statutory Accounting (₹50,000 Sign-off Ceiling)', false),
    ('Production Planner', 3, 'Production Planning & Control (PPC) Head', false),
    ('Quality Auditor', 3, 'Lead Quality Auditor (Pre-Delivery Inspection & Final Sign-off)', false),
    ('Quality Inspector', 4, 'In-Process QC Inspector (Holds & Non-Conformance Reports)', false),
    ('Store Keeper', 4, 'Inventory Executive (Goods Receipt & Material Issues)', false),
    ('Dispatch Executive', 4, 'Logistics, Transport & Delivery Challan Dispatcher', false),
    ('Sales/Order Desk', 4, 'Customer Orders & Commercial Proposal Desk', false),
    ('Subcontractor Coordinator', 4, 'Job-Work & Outwork Operations Coordinator', false),
    ('Shop Floor Supervisor', 4, 'Shopfloor Production Line Supervisor', false),
    ('HR/Admin', 4, 'Personnel, Master Catalog & Employee Record Administrator', false),
    ('Machine Operator', 5, 'Shopfloor Machine Operator & Technician', false),
    ('Client', 6, 'External Customer Portal (View-only)', false)
ON CONFLICT (name) DO UPDATE 
SET tier = EXCLUDED.tier,
    description = EXCLUDED.description,
    is_system = EXCLUDED.is_system,
    updated_at = NOW();

-- 7. Seed Granular Capabilities into permissions table
INSERT INTO public.permissions (key, category, description)
VALUES
    -- System & ServerAdmin Exclusive Capabilities
    ('system:server_admin_vault', 'system', 'Access ServerAdmin Maker Console and platform infrastructure'),
    ('system:raw_database_access', 'system', 'Execute direct administrative database routines and inspect raw tables'),
    ('system:override_all_rules', 'system', 'Bypass monetary approval limits, holds, and state-machine transitions'),
    ('system:manage_platform_tenants', 'system', 'Configure tenant isolation, storage buckets, and server environments'),
    ('system:view_immutable_audit', 'system', 'Inspect complete append-only admin and security event audit vaults'),
    ('system:manage_permission_overrides', 'system', 'Grant or revoke per-user granular permission overrides'),
    ('system:force_password_reset', 'system', 'Invalidate active user sessions and issue one-time reset tokens'),

    -- Administration & Users
    ('admin:view_users', 'administration', 'View user accounts, credential status, and role assignments'),
    ('admin:create_users', 'administration', 'Provision new user accounts with designated role'),
    ('admin:edit_users', 'administration', 'Modify staff profile information, contact numbers, and departments'),
    ('admin:assign_roles', 'administration', 'Change user roles adhering strictly to tier hierarchy rules'),
    ('admin:manage_masters', 'administration', 'Create, edit, or delete items, customers, vendors, and machine masters'),

    -- Orders & Commercials
    ('orders:view', 'orders', 'View customer purchase orders and line-item details'),
    ('orders:create_draft', 'orders', 'Create new customer order drafts from client PO'),
    ('orders:confirm', 'orders', 'Confirm customer order drafts and initiate fulfillment pipeline'),
    ('orders:edit_commercials', 'orders', 'Modify order pricing, discounts, and payment credit terms'),
    ('orders:cancel', 'orders', 'Cancel active orders and release allocated stock'),

    -- Inventory & Stores
    ('inventory:view', 'inventory', 'View inventory balances, bin locations, and stock ledger'),
    ('inventory:create_grn', 'inventory', 'Record Goods Receipt Notes (GRN) and update batch stock'),
    ('inventory:adjust_stock', 'inventory', 'Perform physical inventory reconciliation and balance write-offs'),

    -- Production & Shopfloor
    ('production:view', 'production', 'View job cards, route cards, and live machine status'),
    ('production:create_job_card', 'production', 'Generate and release production job cards for orders'),
    ('production:log_output', 'production', 'Log hourly stage output, completed quantities, and scrap scrap rates'),

    -- Procurement
    ('procurement:view', 'procurement', 'View purchase requisitions, RFQs, and purchase orders'),
    ('procurement:create_po', 'procurement', 'Draft and issue purchase orders to vendors'),
    ('procurement:approve_high_value', 'procurement', 'Approve purchase orders exceeding role standard monetary ceilings'),

    -- Quality Control (QC & PDI)
    ('qc:view', 'qc', 'View QC in-process inspection queues and PDI inspection logs'),
    ('qc:log_inspection', 'qc', 'Record inspection parameters, pass/fail status, and upload test reports'),
    ('qc:place_hold', 'qc', 'Place quality hold or raise Non-Conformance Reports (NCR) on defective lots'),
    ('qc:release_hold', 'qc', 'Clear quality holds and authorize rework or release'),

    -- Dispatch & Logistics
    ('dispatch:view', 'dispatch', 'View delivery schedules, pending shipments, and outbound challans'),
    ('dispatch:create_challan', 'dispatch', 'Generate statutory delivery challans for outbound goods'),
    ('dispatch:confirm_delivery', 'dispatch', 'Mark consignments delivered with Proof-of-Delivery (POD) documentation'),

    -- Accounting & Invoicing
    ('finance:view', 'finance', 'View sales invoices, vendor bills, and statutory ledger'),
    ('finance:generate_invoice', 'finance', 'Generate GST e-invoices for dispatched delivery challans'),
    ('finance:record_payment', 'finance', 'Record client payment receipts and vendor remittance entries'),
    ('finance:approve_high_value', 'finance', 'Authorize high-value vendor disbursements above standard limits')
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description,
    category = EXCLUDED.category;

-- 8. Map ServerAdmin Role to ALL Permissions (Unrestricted Full Grant)
INSERT INTO public.role_permission_grants (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'ServerAdmin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 9. Map Owner & Admin (System) Roles to All Operational & Executive Permissions
INSERT INTO public.role_permission_grants (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.category != 'system' OR p.key IN ('system:view_immutable_audit', 'system:manage_permission_overrides', 'system:force_password_reset')
WHERE r.name IN ('Owner', 'Admin (System)')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 10. Map Department Heads & Staff Permissions
INSERT INTO public.role_permission_grants (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON (
    (r.name = 'Purchase Manager' AND (p.category IN ('procurement', 'inventory') OR p.key IN ('admin:view_users', 'orders:view'))) OR
    (r.name = 'Accountant' AND (p.category IN ('finance', 'orders', 'dispatch') OR p.key IN ('admin:view_users', 'dispatch:view', 'dispatch:create_challan'))) OR
    (r.name = 'Production Planner' AND (p.category IN ('production', 'inventory') OR p.key IN ('orders:view', 'qc:view', 'dispatch:view'))) OR
    (r.name = 'Quality Auditor' AND (p.category = 'qc' OR p.key IN ('production:view', 'orders:view', 'dispatch:view', 'dispatch:create_challan'))) OR
    (r.name = 'Quality Inspector' AND (p.category = 'qc' OR p.key IN ('production:view', 'production:log_output'))) OR
    (r.name = 'Store Keeper' AND (p.category = 'inventory' OR p.key IN ('procurement:view', 'production:view', 'dispatch:view', 'dispatch:create_challan'))) OR
    (r.name = 'Dispatch Executive' AND (p.category = 'dispatch' OR p.key IN ('orders:view', 'inventory:view', 'dispatch:view', 'dispatch:create_challan', 'dispatch:confirm_delivery'))) OR
    (r.name = 'Sales/Order Desk' AND (p.category = 'orders' OR p.key IN ('inventory:view', 'dispatch:view'))) OR
    (r.name = 'Subcontractor Coordinator' AND (p.category IN ('production', 'inventory') OR p.key IN ('orders:view', 'dispatch:view', 'dispatch:create_challan'))) OR
    (r.name = 'Shop Floor Supervisor' AND (p.category = 'production' OR p.key IN ('inventory:view', 'qc:view'))) OR
    (r.name = 'HR/Admin' AND (p.category = 'administration' OR p.key IN ('system:view_immutable_audit', 'admin:view_users', 'admin:create_users', 'admin:edit_users', 'admin:manage_masters'))) OR
    (r.name = 'Machine Operator' AND p.key IN ('production:view', 'production:log_output'))
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
