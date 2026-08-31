-- ============================================================================
-- Migration: 013_rbac_matrix_and_escalation.sql
-- Description: Complete Role-Based Access Control (RBAC) Matrix, Monetary
--              Approval Limits, Scoped Row-Level Rules, and Escalation Ledger.
-- ============================================================================

-- 1. Create role_permissions Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL,
    module TEXT NOT NULL,
    access_level TEXT NOT NULL CHECK (access_level IN ('NO_ACCESS', 'VIEW_ONLY', 'CREATE_EDIT', 'FULL_APPROVE')),
    approval_limit NUMERIC DEFAULT NULL, -- NULL indicates unlimited (or not applicable)
    scope_rule TEXT DEFAULT 'ALL' CHECK (scope_rule IN ('ALL', 'OWN_RECORDS_ONLY', 'EMPLOYEE_MASTER_ONLY', 'QC_HOLDS_ONLY', 'NO_COMMERCIAL_EDIT')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT DEFAULT 'SYSTEM',
    UNIQUE (role, module)
);

-- 2. Create or Upgrade pending_approvals Table
DROP TABLE IF EXISTS public.pending_approvals CASCADE;

CREATE TABLE IF NOT EXISTS public.pending_approvals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- 'HIGH_VALUE_PO', 'HIGH_VALUE_PAYMENT', 'DISCOUNT_OVERRIDE', 'QC_HOLD_RELEASE', 'COMMERCIAL_OVERRIDE', 'CUSTOM'
    entity_type TEXT NOT NULL, -- 'PO', 'ORDER', 'VENDOR_PAYMENT', 'JOB_CARD', 'CUSTOMER_INVOICE'
    entity_id TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    threshold_limit NUMERIC DEFAULT 0,
    requested_by TEXT NOT NULL,
    requested_by_role TEXT NOT NULL,
    target_approver_role TEXT DEFAULT 'Owner',
    status TEXT NOT NULL DEFAULT 'PENDING_OWNER_APPROVAL' CHECK (status IN ('PENDING_OWNER_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED')),
    details TEXT,
    escalation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolution_notes TEXT
);

-- Indexes for fast query lookup
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_mod ON public.role_permissions (role, module);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_status ON public.pending_approvals (status);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_entity ON public.pending_approvals (entity_type, entity_id);

-- 3. Seed Exact Role-Permission Matrix
-- Roles:
-- 1. Owner: Order Mgmt=Full/Approve, Inventory=View, Production=View, Procurement=Full/Approve, Dispatch=View, Accounting=View, Masters=Full/Approve, Settings=Full/Approve, Approval Limit=Unlimited.
-- 2. Sales/Order Desk: Order Mgmt=Create/Edit, Inventory=View, Production=No Access, Procurement=No Access, Dispatch=View, Accounting=No Access, Masters=View, Settings=No Access.
-- 3. Production Planner: Order Mgmt=View (no commercial edit), Inventory=View, Production=Create/Edit, Procurement=No Access, Dispatch=View, Accounting=No Access, Masters=View, Settings=No Access.
-- 4. Shop Floor Supervisor: Production=Create/Edit (job cards, raises NCRs), Order Mgmt=No Access, others=No Access/View.
-- 5. Quality Inspector: Production=Create/Edit (specifically place/clear QC holds), others=No Access.
-- 6. Store Keeper: Inventory=Create/Edit (GRN, material issue, stock counts), Procurement=View, others=View/No Access.
-- 7. Purchase Manager: Procurement=Full/Approve, Masters=Create/Edit, Approval Limit=₹1,00,000 (PO above this escalates to Owner).
-- 8. Dispatch Executive: Dispatch=Create/Edit (cannot edit order commercial terms), others=View/No Access.
-- 9. Accountant: Accounting=Full/Approve (invoicing, payments, GST filing), Approval Limit=₹50,000 (vendor payments above this escalate to Owner).
-- 10. HR/Admin: Masters=Create/Edit (scoped ONLY to Employee Master — must not see other masters even at View level), Settings=View, others=No Access.
-- 11. Machine Operator: Production=Create/Edit (scoped to only their own assigned job/route card entries), others=No Access.
-- 12. Admin (System): Full/Approve on everything, Unlimited.

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
ON CONFLICT (role, module) DO UPDATE SET
  access_level = EXCLUDED.access_level,
  approval_limit = EXCLUDED.approval_limit,
  scope_rule = EXCLUDED.scope_rule,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "role_permissions_select_policy" ON public.role_permissions;
CREATE POLICY "role_permissions_select_policy" ON public.role_permissions
    FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "role_permissions_admin_write" ON public.role_permissions;
CREATE POLICY "role_permissions_admin_write" ON public.role_permissions
    FOR ALL TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('Owner', 'Admin (System)', 'SUPER ADMIN') OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('Owner', 'Admin (System)', 'SUPER ADMIN')
        )
    );

DROP POLICY IF EXISTS "pending_approvals_all_policy" ON public.pending_approvals;
CREATE POLICY "pending_approvals_all_policy" ON public.pending_approvals
    FOR ALL TO authenticated, anon USING (true);
