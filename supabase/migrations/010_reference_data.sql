-- ============================================================================
-- 010_reference_data.sql
-- System reference data the application cannot run without. NO demo, test or
-- company-specific records live here (no users, orders, items, customers, ...).
--
--   * roles / permissions / role_permission_grants  -> DB-driven RBAC
--   * role_permissions                              -> module access matrix + approval limits
--   * notification_rules                            -> catalogue of alertable events
--
-- Every insert is "seed once": ON CONFLICT DO NOTHING, so re-running this file
-- never overwrites roles, limits or toggles you changed from the admin console.
--
-- The first login account is NOT created here. Run:
--     npx tsx scripts/create-server-admin.ts
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Canonical roles (tier 0 = ServerAdmin ... tier 6 = Client)
-- ----------------------------------------------------------------------------
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
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Granular permission keys
-- ----------------------------------------------------------------------------
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
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Role -> permission grants
-- ----------------------------------------------------------------------------
-- Map ServerAdmin Role to ALL Permissions (Unrestricted Full Grant)
INSERT INTO public.role_permission_grants (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'ServerAdmin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Map Owner & Admin (System) Roles to All Operational & Executive Permissions
INSERT INTO public.role_permission_grants (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.category != 'system' OR p.key IN ('system:view_immutable_audit', 'system:manage_permission_overrides', 'system:force_password_reset')
WHERE r.name IN ('Owner', 'Admin (System)')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Map Department Heads & Staff Permissions
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

-- ----------------------------------------------------------------------------
-- Module access matrix (view / create-edit / approve, with monetary limits)
-- ----------------------------------------------------------------------------
INSERT INTO public.role_permissions (role, module, access_level, approval_limit, scope_rule, description)
VALUES
  -- 1. Owner
  ('Owner', 'orders', 'FULL_APPROVE', NULL, 'ALL', 'Full control over sales orders & commercial approvals'),
  ('Owner', 'inventory', 'VIEW_ONLY', NULL, 'ALL', 'View inventory balances and ledger movements'),
  ('Owner', 'production', 'VIEW_ONLY', NULL, 'ALL', 'Monitor shop floor progress and machine velocity'),
  ('Owner', 'procurement', 'FULL_APPROVE', NULL, 'ALL', 'Unlimited purchase order authorization'),
  ('Owner', 'dispatch', 'VIEW_ONLY', NULL, 'ALL', 'View logistics and delivery challans'),
  ('Owner', 'accounting', 'VIEW_ONLY', NULL, 'ALL', 'View commercial invoices and financial ledgers'),
  ('Owner', 'masters', 'FULL_APPROVE', NULL, 'ALL', 'Full control over all master catalogs'),
  ('Owner', 'settings', 'FULL_APPROVE', NULL, 'ALL', 'Full system and company configuration'),
  ('Owner', 'approvals', 'FULL_APPROVE', NULL, 'ALL', 'Universal override on all escalation holds'),
  ('Owner', 'reports', 'FULL_APPROVE', NULL, 'ALL', 'Executive analytics and financial reporting'),

  -- 2. Sales / Order Desk
  ('Sales/Order Desk', 'orders', 'CREATE_EDIT', NULL, 'ALL', 'Create & edit customer orders, quotations, line items'),
  ('Sales/Order Desk', 'inventory', 'VIEW_ONLY', NULL, 'ALL', 'Check stock availability for promising lead times'),
  ('Sales/Order Desk', 'production', 'NO_ACCESS', NULL, 'ALL', 'No production management access'),
  ('Sales/Order Desk', 'procurement', 'NO_ACCESS', NULL, 'ALL', 'No purchasing access'),
  ('Sales/Order Desk', 'dispatch', 'VIEW_ONLY', NULL, 'ALL', 'Track customer order dispatch status'),
  ('Sales/Order Desk', 'accounting', 'NO_ACCESS', NULL, 'ALL', 'No accounting or ledger access'),
  ('Sales/Order Desk', 'masters', 'VIEW_ONLY', NULL, 'ALL', 'View customer and finished goods master catalogs'),
  ('Sales/Order Desk', 'settings', 'NO_ACCESS', NULL, 'ALL', 'No system settings access'),
  ('Sales/Order Desk', 'approvals', 'NO_ACCESS', NULL, 'ALL', 'Cannot authorize approval tickets'),
  ('Sales/Order Desk', 'reports', 'VIEW_ONLY', NULL, 'ALL', 'View sales and customer order pipeline reports'),

  -- 3. Production Planner
  ('Production Planner', 'orders', 'VIEW_ONLY', NULL, 'NO_COMMERCIAL_EDIT', 'View sales demand to plan jobs; cannot modify commercial pricing'),
  ('Production Planner', 'inventory', 'VIEW_ONLY', NULL, 'ALL', 'Check raw material and component availability for BOMs'),
  ('Production Planner', 'production', 'CREATE_EDIT', NULL, 'ALL', 'Schedule job cards, route operations, machine allocation'),
  ('Production Planner', 'procurement', 'NO_ACCESS', NULL, 'ALL', 'No procurement creation access'),
  ('Production Planner', 'dispatch', 'VIEW_ONLY', NULL, 'ALL', 'View planned dispatch dates'),
  ('Production Planner', 'accounting', 'NO_ACCESS', NULL, 'ALL', 'No accounting access'),
  ('Production Planner', 'masters', 'VIEW_ONLY', NULL, 'ALL', 'View items, BOMs, machines, and tools'),
  ('Production Planner', 'settings', 'NO_ACCESS', NULL, 'ALL', 'No system configuration access'),
  ('Production Planner', 'approvals', 'NO_ACCESS', NULL, 'ALL', 'No approval delegation'),
  ('Production Planner', 'reports', 'VIEW_ONLY', NULL, 'ALL', 'View production velocity and machine load'),

  -- 4. Shop Floor Supervisor
  ('Shop Floor Supervisor', 'orders', 'NO_ACCESS', NULL, 'ALL', 'No customer order access'),
  ('Shop Floor Supervisor', 'inventory', 'VIEW_ONLY', NULL, 'ALL', 'View WIP stock and material availability'),
  ('Shop Floor Supervisor', 'production', 'CREATE_EDIT', NULL, 'ALL', 'Issue job cards, record shift logs, raise NCR non-conformances'),
  ('Shop Floor Supervisor', 'procurement', 'NO_ACCESS', NULL, 'ALL', 'No purchasing access'),
  ('Shop Floor Supervisor', 'dispatch', 'NO_ACCESS', NULL, 'ALL', 'No dispatch access'),
  ('Shop Floor Supervisor', 'accounting', 'NO_ACCESS', NULL, 'ALL', 'No accounting access'),
  ('Shop Floor Supervisor', 'masters', 'NO_ACCESS', NULL, 'ALL', 'No master editing access'),
  ('Shop Floor Supervisor', 'settings', 'NO_ACCESS', NULL, 'ALL', 'No settings access'),
  ('Shop Floor Supervisor', 'approvals', 'NO_ACCESS', NULL, 'ALL', 'No approval rights'),
  ('Shop Floor Supervisor', 'reports', 'VIEW_ONLY', NULL, 'ALL', 'View shift output and machine downtime'),

  -- 5. Quality Inspector
  ('Quality Inspector', 'orders', 'NO_ACCESS', NULL, 'ALL', 'No sales order access'),
  ('Quality Inspector', 'inventory', 'VIEW_ONLY', NULL, 'ALL', 'Inspect quarantine stock'),
  ('Quality Inspector', 'production', 'CREATE_EDIT', NULL, 'QC_HOLDS_ONLY', 'Conduct dimensional inspections; place and clear QC holds'),
  ('Quality Inspector', 'procurement', 'NO_ACCESS', NULL, 'ALL', 'No purchasing access'),
  ('Quality Inspector', 'dispatch', 'NO_ACCESS', NULL, 'ALL', 'No dispatch access'),
  ('Quality Inspector', 'accounting', 'NO_ACCESS', NULL, 'ALL', 'No accounting access'),
  ('Quality Inspector', 'masters', 'NO_ACCESS', NULL, 'ALL', 'No masters access'),
  ('Quality Inspector', 'settings', 'NO_ACCESS', NULL, 'ALL', 'No settings access'),
  ('Quality Inspector', 'approvals', 'NO_ACCESS', NULL, 'ALL', 'No commercial approval rights'),
  ('Quality Inspector', 'reports', 'VIEW_ONLY', NULL, 'ALL', 'View defect PPM and inspection history'),

  -- 6. Store Keeper
  ('Store Keeper', 'orders', 'NO_ACCESS', NULL, 'ALL', 'No sales order access'),
  ('Store Keeper', 'inventory', 'CREATE_EDIT', NULL, 'ALL', 'Create GRN, post material issue slips, record stock counts'),
  ('Store Keeper', 'production', 'NO_ACCESS', NULL, 'ALL', 'No production editing'),
  ('Store Keeper', 'procurement', 'VIEW_ONLY', NULL, 'ALL', 'View incoming POs to receive items at gate'),
  ('Store Keeper', 'dispatch', 'VIEW_ONLY', NULL, 'ALL', 'Verify finished goods staging for dispatch'),
  ('Store Keeper', 'accounting', 'NO_ACCESS', NULL, 'ALL', 'No accounting access'),
  ('Store Keeper', 'masters', 'VIEW_ONLY', NULL, 'ALL', 'View items, UOMs, and warehouse bins'),
  ('Store Keeper', 'settings', 'NO_ACCESS', NULL, 'ALL', 'No settings access'),
  ('Store Keeper', 'approvals', 'NO_ACCESS', NULL, 'ALL', 'No approval rights'),
  ('Store Keeper', 'reports', 'VIEW_ONLY', NULL, 'ALL', 'View stock valuation and reorder levels'),

  -- 7. Purchase Manager (Approval Limit: ₹1,00,000)
  ('Purchase Manager', 'orders', 'VIEW_ONLY', NULL, 'ALL', 'View customer order demand for material planning'),
  ('Purchase Manager', 'inventory', 'VIEW_ONLY', NULL, 'ALL', 'Check stock on-hand and reorder triggers'),
  ('Purchase Manager', 'production', 'NO_ACCESS', NULL, 'ALL', 'No production access'),
  ('Purchase Manager', 'procurement', 'FULL_APPROVE', 100000, 'ALL', 'Authorize POs up to ₹1,00,000; higher values escalate to Owner'),
  ('Purchase Manager', 'dispatch', 'NO_ACCESS', NULL, 'ALL', 'No dispatch access'),
  ('Purchase Manager', 'accounting', 'VIEW_ONLY', NULL, 'ALL', 'View vendor payment schedules'),
  ('Purchase Manager', 'masters', 'CREATE_EDIT', NULL, 'ALL', 'Manage Vendor Master, RM Item Masters, and Purchase Pricelists'),
  ('Purchase Manager', 'settings', 'NO_ACCESS', NULL, 'ALL', 'No settings access'),
  ('Purchase Manager', 'approvals', 'CREATE_EDIT', 100000, 'ALL', 'Review purchase requisitions within ₹1.0L limit'),
  ('Purchase Manager', 'reports', 'VIEW_ONLY', NULL, 'ALL', 'View vendor OTIF and procurement spend analytics'),

  -- 8. Dispatch Executive
  ('Dispatch Executive', 'orders', 'VIEW_ONLY', NULL, 'NO_COMMERCIAL_EDIT', 'View dispatchable orders and customer delivery addresses'),
  ('Dispatch Executive', 'inventory', 'VIEW_ONLY', NULL, 'ALL', 'Verify finished goods stock ready for shipment'),
  ('Dispatch Executive', 'production', 'VIEW_ONLY', NULL, 'ALL', 'View completed job batches'),
  ('Dispatch Executive', 'procurement', 'NO_ACCESS', NULL, 'ALL', 'No procurement access'),
  ('Dispatch Executive', 'dispatch', 'CREATE_EDIT', NULL, 'ALL', 'Create delivery challans, schedule transporters, print packing lists'),
  ('Dispatch Executive', 'accounting', 'NO_ACCESS', NULL, 'ALL', 'No financial ledger access'),
  ('Dispatch Executive', 'masters', 'VIEW_ONLY', NULL, 'ALL', 'View customer delivery addresses and transporter masters'),
  ('Dispatch Executive', 'settings', 'NO_ACCESS', NULL, 'ALL', 'No settings access'),
  ('Dispatch Executive', 'approvals', 'NO_ACCESS', NULL, 'ALL', 'No approval rights'),
  ('Dispatch Executive', 'reports', 'VIEW_ONLY', NULL, 'ALL', 'View dispatch turnaround time and delivery metrics'),

  -- 9. Accountant (Approval Limit: ₹50,000)
  ('Accountant', 'orders', 'VIEW_ONLY', NULL, 'ALL', 'View orders for commercial invoice generation'),
  ('Accountant', 'inventory', 'VIEW_ONLY', NULL, 'ALL', 'View inventory valuation for monthly accounts'),
  ('Accountant', 'production', 'NO_ACCESS', NULL, 'ALL', 'No production access'),
  ('Accountant', 'procurement', 'VIEW_ONLY', NULL, 'ALL', 'Perform 3-way PO-GRN-Invoice matching'),
  ('Accountant', 'dispatch', 'VIEW_ONLY', NULL, 'ALL', 'Verify delivery challans for sales invoicing'),
  ('Accountant', 'accounting', 'FULL_APPROVE', 50000, 'ALL', 'Invoicing & vendor disbursements up to ₹50,000; higher amounts escalate to Owner'),
  ('Accountant', 'masters', 'VIEW_ONLY', NULL, 'ALL', 'View Customer/Vendor GSTIN, PAN, and Bank details'),
  ('Accountant', 'settings', 'NO_ACCESS', NULL, 'ALL', 'No system settings access'),
  ('Accountant', 'approvals', 'CREATE_EDIT', 50000, 'ALL', 'Authorize payment vouchers within ₹50k threshold'),
  ('Accountant', 'reports', 'FULL_APPROVE', NULL, 'ALL', 'Full P&L, GST GSTR-1/GSTR-3B registers, and debtor ageing'),

  -- 10. HR / Admin (Scoped ONLY to Employee Master)
  ('HR/Admin', 'orders', 'NO_ACCESS', NULL, 'ALL', 'No customer order access'),
  ('HR/Admin', 'inventory', 'NO_ACCESS', NULL, 'ALL', 'No inventory access'),
  ('HR/Admin', 'production', 'NO_ACCESS', NULL, 'ALL', 'No production access'),
  ('HR/Admin', 'procurement', 'NO_ACCESS', NULL, 'ALL', 'No procurement access'),
  ('HR/Admin', 'dispatch', 'NO_ACCESS', NULL, 'ALL', 'No dispatch access'),
  ('HR/Admin', 'accounting', 'NO_ACCESS', NULL, 'ALL', 'No accounting access'),
  ('HR/Admin', 'masters', 'CREATE_EDIT', NULL, 'EMPLOYEE_MASTER_ONLY', 'Scoped exclusively to Employee/User Master; strictly blocked from other masters'),
  ('HR/Admin', 'settings', 'VIEW_ONLY', NULL, 'ALL', 'View general organization setup'),
  ('HR/Admin', 'approvals', 'NO_ACCESS', NULL, 'ALL', 'No approval rights'),
  ('HR/Admin', 'reports', 'NO_ACCESS', NULL, 'ALL', 'No financial/operational report access'),

  -- 11. Machine Operator (Scoped to OWN records only)
  ('Machine Operator', 'orders', 'NO_ACCESS', NULL, 'ALL', 'No sales order access'),
  ('Machine Operator', 'inventory', 'NO_ACCESS', NULL, 'ALL', 'No inventory management'),
  ('Machine Operator', 'production', 'CREATE_EDIT', NULL, 'OWN_RECORDS_ONLY', 'Log parts produced, scrap, and runtime ONLY for assigned job cards'),
  ('Machine Operator', 'procurement', 'NO_ACCESS', NULL, 'ALL', 'No purchasing access'),
  ('Machine Operator', 'dispatch', 'NO_ACCESS', NULL, 'ALL', 'No dispatch access'),
  ('Machine Operator', 'accounting', 'NO_ACCESS', NULL, 'ALL', 'No accounting access'),
  ('Machine Operator', 'masters', 'NO_ACCESS', NULL, 'ALL', 'No masters access'),
  ('Machine Operator', 'settings', 'NO_ACCESS', NULL, 'ALL', 'No settings access'),
  ('Machine Operator', 'approvals', 'NO_ACCESS', NULL, 'ALL', 'No approval rights'),
  ('Machine Operator', 'reports', 'NO_ACCESS', NULL, 'ALL', 'No report access'),

  -- 12. Admin (System)
  ('Admin (System)', 'orders', 'FULL_APPROVE', NULL, 'ALL', 'IT Admin full root access'),
  ('Admin (System)', 'inventory', 'FULL_APPROVE', NULL, 'ALL', 'IT Admin full root access'),
  ('Admin (System)', 'production', 'FULL_APPROVE', NULL, 'ALL', 'IT Admin full root access'),
  ('Admin (System)', 'procurement', 'FULL_APPROVE', NULL, 'ALL', 'IT Admin full root access'),
  ('Admin (System)', 'dispatch', 'FULL_APPROVE', NULL, 'ALL', 'IT Admin full root access'),
  ('Admin (System)', 'accounting', 'FULL_APPROVE', NULL, 'ALL', 'IT Admin full root access'),
  ('Admin (System)', 'masters', 'FULL_APPROVE', NULL, 'ALL', 'IT Admin full root access'),
  ('Admin (System)', 'settings', 'FULL_APPROVE', NULL, 'ALL', 'IT Admin full root access'),
  ('Admin (System)', 'approvals', 'FULL_APPROVE', NULL, 'ALL', 'IT Admin full root access'),
  ('Admin (System)', 'reports', 'FULL_APPROVE', NULL, 'ALL', 'IT Admin full root access')
ON CONFLICT (role, module) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Notification event catalogue (recipients are configured in the admin console)
-- ----------------------------------------------------------------------------
INSERT INTO public.notification_rules (id, name, description, enabled, severity) VALUES
('critical_error', 'Critical System & Infrastructure Errors', 'Automated alerts for uncaught exceptions or database outages', true, 'CRITICAL'),
('production_failure', 'Shopfloor Production Job Failure', 'Machine breakdowns, tool damage or operator job rejections', true, 'CRITICAL'),
('pdi_failure', 'PDI & Quality Inspection Failure', 'Pre-Delivery Inspection non-conformance defects', true, 'HIGH'),
('order_delayed', 'Customer Order Schedule Delay', 'PO delivery date overdue or dispatch hold', true, 'HIGH'),
('inventory_shortage', 'Raw Material / SKU Shortage Alert', 'Stock level dropping below reorder point or negative available', true, 'HIGH'),
('invoice_generated', 'Customer Invoice Issued', 'Commercial invoice generated for customer dispatch', true, 'INFO'),
('payment_received', 'Customer Payment Received', 'Payment receipt logged against outstanding invoice', true, 'INFO'),
('dispatch_failed', 'Outward Dispatch Transport Exception', 'Challan transit delay or delivery vehicle breakdown', true, 'HIGH'),
('approval_required', 'Pending Management Approval', 'Purchase order or credit limit requiring sign-off', true, 'MEDIUM')
ON CONFLICT (id) DO NOTHING;
