// ============================================================================
// File: src/utils/rbacMatrix.ts
// Description: Definitive Role-Based Access Control (RBAC) Matrix & Policy Engine
//              Aligned to GuruOm Owner OS PRD v1.0
// ============================================================================

export type AccessLevel = 'NO_ACCESS' | 'VIEW_ONLY' | 'CREATE_EDIT' | 'FULL_APPROVE';

export const ACCESS_LEVEL_RANK: Record<AccessLevel, number> = {
  'NO_ACCESS': 0,
  'VIEW_ONLY': 1,
  'CREATE_EDIT': 2,
  'FULL_APPROVE': 3
};

export type SystemModule = 
  | 'orders'
  | 'inventory'
  | 'production'
  | 'procurement'
  | 'dispatch'
  | 'accounting'
  | 'masters'
  | 'settings'
  | 'approvals'
  | 'reports'
  | 'qc'
  | 'bom'
  | 'transport'
  | 'subcontracting';

export type ScopeRule = 
  | 'ALL'
  | 'OWN_RECORDS_ONLY'
  | 'EMPLOYEE_MASTER_ONLY'
  | 'QC_HOLDS_ONLY'
  | 'PDI_ONLY'
  | 'NO_COMMERCIAL_EDIT';

export interface RolePermissionRule {
  accessLevel: AccessLevel;
  approvalLimit?: number | null; // null = Unlimited; number = max ₹ value before escalating to Owner
  scopeRule?: ScopeRule;
  description?: string;
}

export type RoleDefinitionRecord = {
  role: string;
  label: string;
  category: 'Executive' | 'Operations' | 'Quality & Logistics' | 'Commercial & Finance' | 'Administration';
  approvalLimitDisplay: string;
  scopeDescription?: string;
  permissions: Record<SystemModule, RolePermissionRule>;
};

// ============================================================================
// PRD v1.0 CTA Permission Table — Every CTA gated to specific roles
// ============================================================================
export type CtaId =
  | 'CREATE_ORDER_DRAFT'
  | 'CONFIRM_ORDER'
  | 'REQUEST_REVISION'
  | 'RAISE_CHANGE_ORDER'
  | 'VERIFY_MATERIAL_AVAILABILITY'
  | 'CREATE_PURCHASE_ORDER'
  | 'RECORD_GRN'
  | 'CREATE_JOB_CARD'
  | 'ISSUE_TO_SUBCONTRACTOR'
  | 'RECEIVE_FROM_SUBCONTRACTOR'
  | 'START_MANUFACTURING'
  | 'COMPLETE_STEP'
  | 'MARK_MANUFACTURING_COMPLETE'
  | 'UPLOAD_QC_REPORT'
  | 'UPLOAD_PDI_REPORT'
  | 'MARK_READY_TO_DISPATCH'
  | 'RAISE_NCR_REWORK'
  | 'GENERATE_INVOICE'
  | 'GENERATE_DELIVERY_CHALLAN'
  | 'MARK_IN_TRANSIT'
  | 'MARK_DELIVERED'
  | 'ORDER_RECEIVED'
  | 'MARK_DELAYED'
  | 'RECORD_PAYMENT'
  | 'MARK_ORDER_CLOSED';

export interface CtaPermission {
  ctaId: CtaId;
  label: string;
  stage: string;
  authorizedRoles: string[];
  preCondition: string;
  resultingStatus: string;
  hardGate?: string;
}

export const CTA_PERMISSION_TABLE: CtaPermission[] = [
  { ctaId: 'CREATE_ORDER_DRAFT', label: 'Create Order Draft', stage: 'Stage 1', authorizedRoles: ['Owner', 'Sales/Order Desk'], preCondition: 'Valid client PO available', resultingStatus: 'DRAFT' },
  { ctaId: 'CONFIRM_ORDER', label: 'Confirm Order', stage: 'Stage 2', authorizedRoles: ['Owner', 'Sales/Order Desk'], preCondition: 'Draft complete; pricing, qty, delivery terms & drawing revision verified', resultingStatus: 'CONFIRMED', hardGate: 'Block if required fields are missing' },
  { ctaId: 'REQUEST_REVISION', label: 'Request Revision', stage: 'Stage 2', authorizedRoles: ['Owner', 'Sales/Order Desk'], preCondition: 'Order in Draft or Confirmed state', resultingStatus: 'DRAFT' },
  { ctaId: 'RAISE_CHANGE_ORDER', label: 'Raise Change Order', stage: 'Stage 2a', authorizedRoles: ['Owner', 'Sales/Order Desk'], preCondition: 'Order Confirmed but no Job Cards created', resultingStatus: 'CONFIRMED', hardGate: 'Block if Job Cards exist unless Owner override' },
  { ctaId: 'VERIFY_MATERIAL_AVAILABILITY', label: 'Verify Material Availability', stage: 'Stage 4', authorizedRoles: ['Store Keeper', 'Owner'], preCondition: 'BOM explosion complete', resultingStatus: 'MATERIAL_VERIFIED' },
  { ctaId: 'CREATE_PURCHASE_ORDER', label: 'Create Purchase Order', stage: 'Stage 5', authorizedRoles: ['Purchase Manager', 'Owner'], preCondition: 'Order flagged Material Short', resultingStatus: 'PO_SENT' },
  { ctaId: 'RECORD_GRN', label: 'Record GRN (Goods Receipt)', stage: 'Stage 5a', authorizedRoles: ['Store Keeper', 'Owner'], preCondition: 'PO acknowledged; goods physically received', resultingStatus: 'MATERIAL_VERIFIED', hardGate: 'Auto re-triggers Material Verification for linked orders' },
  { ctaId: 'CREATE_JOB_CARD', label: 'Create Job Card', stage: 'Stage 6', authorizedRoles: ['Production Planner', 'Owner'], preCondition: 'Order status = Material Verified', resultingStatus: 'JOB_RELEASED' },
  { ctaId: 'ISSUE_TO_SUBCONTRACTOR', label: 'Issue Material to Subcontractor', stage: 'Stage 6a', authorizedRoles: ['Subcontractor Coordinator', 'Owner'], preCondition: 'Job Card step flagged as subcontracted operation', resultingStatus: 'WITH_SUBCONTRACTOR' },
  { ctaId: 'RECEIVE_FROM_SUBCONTRACTOR', label: 'Receive from Subcontractor', stage: 'Stage 6a', authorizedRoles: ['Subcontractor Coordinator', 'Owner'], preCondition: 'Material is currently with subcontractor', resultingStatus: 'STEP_COMPLETE' },
  { ctaId: 'START_MANUFACTURING', label: 'Start Manufacturing', stage: 'Stage 7', authorizedRoles: ['Machine Operator', 'Shop Floor Supervisor', 'Owner'], preCondition: 'Job Card created; materials issued', resultingStatus: 'IN_PRODUCTION' },
  { ctaId: 'COMPLETE_STEP', label: 'Complete Step', stage: 'Stage 7a', authorizedRoles: ['Machine Operator', 'Shop Floor Supervisor', 'Owner'], preCondition: 'Previous step in sequence already logged', resultingStatus: 'STEP_COMPLETE', hardGate: 'Enforce sequential gate server-side' },
  { ctaId: 'MARK_MANUFACTURING_COMPLETE', label: 'Mark Manufacturing Complete', stage: 'Stage 7b', authorizedRoles: ['Production Planner', 'Owner'], preCondition: 'All Route Card steps logged complete for that item', resultingStatus: 'READY_FOR_QC' },
  { ctaId: 'UPLOAD_QC_REPORT', label: 'Upload Quality Report', stage: 'Stage 8', authorizedRoles: ['Quality Inspector', 'Owner'], preCondition: 'Item appears in QC queue', resultingStatus: 'QC_REPORT_UPLOADED' },
  { ctaId: 'UPLOAD_PDI_REPORT', label: 'Upload PDI Report', stage: 'Stage 8a', authorizedRoles: ['Quality Auditor', 'Owner'], preCondition: 'QC Report uploaded and passed', resultingStatus: 'PDI_COMPLETE' },
  { ctaId: 'MARK_READY_TO_DISPATCH', label: 'Mark Ready to Dispatch', stage: 'Stage 8b', authorizedRoles: ['Quality Auditor', 'Owner'], preCondition: 'PDI Complete', resultingStatus: 'READY_FOR_DISPATCH' },
  { ctaId: 'RAISE_NCR_REWORK', label: 'Raise NCR & Send to Rework', stage: 'Stage 8b', authorizedRoles: ['Quality Auditor', 'Quality Inspector', 'Owner'], preCondition: 'PDI Complete with defects found', resultingStatus: 'REWORK' },
  { ctaId: 'GENERATE_INVOICE', label: 'Generate Invoice', stage: 'Stage 9', authorizedRoles: ['Accountant', 'Owner'], preCondition: 'Order status = Ready to Dispatch', resultingStatus: 'INVOICE_GENERATED' },
  { ctaId: 'GENERATE_DELIVERY_CHALLAN', label: 'Generate Delivery Challan', stage: 'Stage 9a', authorizedRoles: ['Accountant', 'Owner'], preCondition: 'Invoice generated', resultingStatus: 'DISPATCH_READY' },
  { ctaId: 'MARK_IN_TRANSIT', label: 'Mark In Transit', stage: 'Stage 10', authorizedRoles: ['Dispatch Executive', 'Owner'], preCondition: 'Challan generated; goods loaded', resultingStatus: 'IN_TRANSIT' },
  { ctaId: 'MARK_DELIVERED', label: 'Mark Delivered', stage: 'Stage 10a', authorizedRoles: ['Dispatch Executive', 'Owner'], preCondition: 'POD/E-POD document attached', resultingStatus: 'DELIVERED', hardGate: 'Server-side reject if POD attachment missing' },
  { ctaId: 'ORDER_RECEIVED', label: 'Order Received', stage: 'Stage 10a', authorizedRoles: ['Dispatch Executive', 'Owner'], preCondition: 'Goods physically received by customer (POD optional)', resultingStatus: 'DELIVERED' },
  { ctaId: 'MARK_DELAYED', label: 'Mark Delayed', stage: 'Stage 10b', authorizedRoles: ['Dispatch Executive', 'Owner'], preCondition: 'Consignment did not reach customer on schedule', resultingStatus: 'DELIVERY_DELAYED' },
  { ctaId: 'RECORD_PAYMENT', label: 'Record Payment Received', stage: 'Stage 11', authorizedRoles: ['Accountant', 'Owner'], preCondition: 'Invoice outstanding balance > 0', resultingStatus: 'PAYMENT_RECORDED' },
  { ctaId: 'MARK_ORDER_CLOSED', label: 'Mark Order Closed', stage: 'Stage 11a', authorizedRoles: ['Accountant', 'Owner'], preCondition: 'Order Delivered AND full payment received', resultingStatus: 'CLOSED', hardGate: 'Server-side block if partial payment or not Delivered' },
];

/**
 * Check if a given role is authorized to perform a specific CTA action
 */
export function isRoleAuthorizedForCta(role: string, ctaId: CtaId): boolean {
  const normRole = normalizeRole(role);
  const cta = CTA_PERMISSION_TABLE.find(c => c.ctaId === ctaId);
  if (!cta) return false;
  // ServerAdmin, Owner, and Admin (System) can always act
  if (normRole === 'ServerAdmin' || normRole === 'Owner' || normRole === 'Admin (System)') return true;
  return cta.authorizedRoles.includes(normRole);
}

/**
 * Get the CTA permission definition for a given CTA ID
 */
export function getCtaPermission(ctaId: CtaId): CtaPermission | undefined {
  return CTA_PERMISSION_TABLE.find(c => c.ctaId === ctaId);
}

// ============================================================================
// Complete 12-Role Exact RBAC Permission Matrix (+ Supreme ServerAdmin Tier)
// ============================================================================
export const RBAC_ROLE_MATRIX: Record<string, RoleDefinitionRecord> = {
  'ServerAdmin': {
    role: 'ServerAdmin',
    label: 'Platform Maker / Developer Team (ServerAdmin)',
    category: 'Administration',
    approvalLimitDisplay: 'Supreme Unrestricted Authority (Maker Tier)',
    scopeDescription: 'Full platform developer access, tenant isolation control & raw ledger access',
    permissions: {
      orders: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      inventory: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      production: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      procurement: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      dispatch: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      accounting: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      masters: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      settings: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      approvals: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      reports: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      qc: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      bom: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      transport: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      subcontracting: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' }
    }
  },

  'Owner': {
    role: 'Owner',
    label: 'Owner / Managing Director',
    category: 'Executive',
    approvalLimitDisplay: 'Unlimited (Can override any hold)',
    scopeDescription: 'Unrestricted access across all company domains and holds',
    permissions: {
      orders: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      inventory: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      production: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      procurement: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      dispatch: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      accounting: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      masters: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      settings: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      approvals: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      reports: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      qc: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      bom: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      transport: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      subcontracting: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' }
    }
  },

  'Sales/Order Desk': {
    role: 'Sales/Order Desk',
    label: 'Sales & Order Desk Executive',
    category: 'Commercial & Finance',
    approvalLimitDisplay: 'No Direct Approval Authority',
    scopeDescription: 'Order creation and inquiry; inventory & finished goods visibility',
    permissions: {
      orders: { accessLevel: 'CREATE_EDIT', approvalLimit: 0, scopeRule: 'ALL' },
      inventory: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      production: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      procurement: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      dispatch: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      accounting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      masters: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      settings: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      approvals: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      reports: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      qc: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      bom: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      transport: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      subcontracting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' }
    }
  },

  'Production Planner': {
    role: 'Production Planner',
    label: 'Production Planner & PPC',
    category: 'Operations',
    approvalLimitDisplay: 'No Financial Authorization',
    scopeDescription: 'Cannot edit commercial terms on orders; full job scheduling',
    permissions: {
      orders: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'NO_COMMERCIAL_EDIT' },
      inventory: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      production: { accessLevel: 'CREATE_EDIT', approvalLimit: null, scopeRule: 'ALL' },
      procurement: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      dispatch: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      accounting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      masters: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      settings: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      approvals: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      reports: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      qc: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      bom: { accessLevel: 'CREATE_EDIT', approvalLimit: null, scopeRule: 'ALL' },
      transport: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      subcontracting: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' }
    }
  },

  'Shop Floor Supervisor': {
    role: 'Shop Floor Supervisor',
    label: 'Shop Floor Supervisor',
    category: 'Operations',
    approvalLimitDisplay: 'No Financial Authorization',
    scopeDescription: 'Full control over job cards, shifts, and raising NCRs',
    permissions: {
      orders: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      inventory: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      production: { accessLevel: 'CREATE_EDIT', approvalLimit: null, scopeRule: 'ALL' },
      procurement: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      dispatch: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      accounting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      masters: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      settings: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      approvals: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      reports: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      qc: { accessLevel: 'CREATE_EDIT', approvalLimit: null, scopeRule: 'ALL' },
      bom: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      transport: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      subcontracting: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' }
    }
  },

  'Quality Inspector': {
    role: 'Quality Inspector',
    label: 'Quality Inspector & PDI Specialist',
    category: 'Quality & Logistics',
    approvalLimitDisplay: 'No Financial Authorization',
    scopeDescription: 'Conduct inspections; place and clear QC holds exclusively',
    permissions: {
      orders: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      inventory: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      production: { accessLevel: 'CREATE_EDIT', approvalLimit: null, scopeRule: 'QC_HOLDS_ONLY' },
      procurement: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      dispatch: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      accounting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      masters: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      settings: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      approvals: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      reports: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      qc: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'QC_HOLDS_ONLY' },
      bom: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      transport: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      subcontracting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' }
    }
  },

  // PRD v1.0: Quality Auditor — distinct from QC/QA Inspector
  // Responsible for PDI Report, final Dispatch/NCR decision
  'Quality Auditor': {
    role: 'Quality Auditor',
    label: 'Quality Auditor (PDI & Dispatch Decision)',
    category: 'Quality & Logistics',
    approvalLimitDisplay: 'No Financial Authorization',
    scopeDescription: 'PDI Report upload; final Ready-to-Dispatch or NCR-Rework decision',
    permissions: {
      orders: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      inventory: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      production: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      procurement: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      dispatch: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      accounting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      masters: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      settings: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      approvals: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      reports: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      qc: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'PDI_ONLY' },
      bom: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      transport: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      subcontracting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' }
    }
  },

  'Store Keeper': {
    role: 'Store Keeper',
    label: 'Store Keeper & Materials Inward',
    category: 'Operations',
    approvalLimitDisplay: 'No Direct PO Financial Limit',
    scopeDescription: 'Create GRN, post material issue slips, record physical counts',
    permissions: {
      orders: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      inventory: { accessLevel: 'CREATE_EDIT', approvalLimit: null, scopeRule: 'ALL' },
      production: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      procurement: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      dispatch: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      accounting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      masters: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      settings: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      approvals: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      reports: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      qc: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      bom: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      transport: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      subcontracting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' }
    }
  },

  'Purchase Manager': {
    role: 'Purchase Manager',
    label: 'Purchase & Procurement Manager',
    category: 'Commercial & Finance',
    approvalLimitDisplay: '₹1,00,000 (Above this escalates to Owner)',
    scopeDescription: 'Full procurement authority up to ₹1,00,000 threshold',
    permissions: {
      orders: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      inventory: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      production: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      procurement: { accessLevel: 'FULL_APPROVE', approvalLimit: 100000, scopeRule: 'ALL' },
      dispatch: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      accounting: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      masters: { accessLevel: 'CREATE_EDIT', approvalLimit: null, scopeRule: 'ALL' },
      settings: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      approvals: { accessLevel: 'CREATE_EDIT', approvalLimit: 100000, scopeRule: 'ALL' },
      reports: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      qc: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      bom: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      transport: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      subcontracting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' }
    }
  },

  'Dispatch Executive': {
    role: 'Dispatch Executive',
    label: 'Dispatch & Logistics Executive',
    category: 'Quality & Logistics',
    approvalLimitDisplay: 'No Financial Authorization',
    scopeDescription: 'Create delivery challans; cannot modify order commercial terms',
    permissions: {
      orders: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'NO_COMMERCIAL_EDIT' },
      inventory: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      production: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      procurement: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      dispatch: { accessLevel: 'CREATE_EDIT', approvalLimit: null, scopeRule: 'ALL' },
      accounting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      masters: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      settings: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      approvals: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      reports: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      qc: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      bom: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      transport: { accessLevel: 'CREATE_EDIT', approvalLimit: null, scopeRule: 'ALL' },
      subcontracting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' }
    }
  },

  'Accountant': {
    role: 'Accountant',
    label: 'Accounts & Finance Manager',
    category: 'Commercial & Finance',
    approvalLimitDisplay: '₹50,000 (Above this escalates to Owner)',
    scopeDescription: 'Full accounting & payments up to ₹50,000 disbursement threshold',
    permissions: {
      orders: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      inventory: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      production: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      procurement: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      dispatch: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      accounting: { accessLevel: 'FULL_APPROVE', approvalLimit: 50000, scopeRule: 'ALL' },
      masters: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      settings: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      approvals: { accessLevel: 'CREATE_EDIT', approvalLimit: 50000, scopeRule: 'ALL' },
      reports: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      qc: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      bom: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      transport: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      subcontracting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' }
    }
  },

  'HR/Admin': {
    role: 'HR/Admin',
    label: 'HR & Personnel Administrator',
    category: 'Administration',
    approvalLimitDisplay: 'No Financial Authorization',
    scopeDescription: 'Scoped ONLY to Employee/User Master; blocked from Customers, Vendors, Items, Machines',
    permissions: {
      orders: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      inventory: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      production: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      procurement: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      dispatch: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      accounting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      masters: { accessLevel: 'CREATE_EDIT', approvalLimit: null, scopeRule: 'EMPLOYEE_MASTER_ONLY' },
      settings: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      approvals: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      reports: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      qc: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      bom: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      transport: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      subcontracting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' }
    }
  },

  'Machine Operator': {
    role: 'Machine Operator',
    label: 'Machine Operator / Technician',
    category: 'Operations',
    approvalLimitDisplay: 'No Financial Authorization',
    scopeDescription: 'Scoped to only their own assigned job/route cards and shift logs',
    permissions: {
      orders: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      inventory: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      production: { accessLevel: 'CREATE_EDIT', approvalLimit: null, scopeRule: 'OWN_RECORDS_ONLY' },
      procurement: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      dispatch: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      accounting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      masters: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      settings: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      approvals: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      reports: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      qc: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      bom: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      transport: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      subcontracting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' }
    }
  },

  'Admin (System)': {
    role: 'Admin (System)',
    label: 'System IT Administrator',
    category: 'Administration',
    approvalLimitDisplay: 'Unlimited (Root IT System Access)',
    scopeDescription: 'Full system root access reserved for IT/System Administrator',
    permissions: {
      orders: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      inventory: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      production: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      procurement: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      dispatch: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      accounting: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      masters: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      settings: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      approvals: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      reports: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      qc: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      bom: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      transport: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' },
      subcontracting: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' }
    }
  },

  // PRD v1.0: Subcontractor Coordinator — distinct role for job-work management
  'Subcontractor Coordinator': {
    role: 'Subcontractor Coordinator',
    label: 'Subcontractor & Job-Work Coordinator',
    category: 'Operations',
    approvalLimitDisplay: 'No Financial Authorization',
    scopeDescription: 'Issue material to subcontractors, receive returns, manage job-work challans',
    permissions: {
      orders: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'NO_COMMERCIAL_EDIT' },
      inventory: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      production: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      procurement: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      dispatch: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      accounting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      masters: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      settings: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      approvals: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      reports: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      qc: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      bom: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'ALL' },
      transport: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      subcontracting: { accessLevel: 'FULL_APPROVE', approvalLimit: null, scopeRule: 'ALL' }
    }
  },

  // PRD v1.0: Client (view-only)
  'Client': {
    role: 'Client',
    label: 'Client (View-Only)',
    category: 'Commercial & Finance',
    approvalLimitDisplay: 'No Authorization',
    scopeDescription: 'View-only access to own orders and dispatches',
    permissions: {
      orders: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'OWN_RECORDS_ONLY' },
      inventory: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      production: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      procurement: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      dispatch: { accessLevel: 'VIEW_ONLY', approvalLimit: null, scopeRule: 'OWN_RECORDS_ONLY' },
      accounting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      masters: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      settings: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      approvals: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      reports: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      qc: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      bom: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      transport: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' },
      subcontracting: { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' }
    }
  }
};

// ============================================================================
// Normalization & Helper Functions
// ============================================================================

export function normalizeRole(rawRole?: string | null): string {
  if (!rawRole || typeof rawRole !== 'string') return 'Shop Floor Supervisor';
  const trimmed = rawRole.replace(/\s+/g, ' ').trim();

  if (trimmed === 'ServerAdmin' || trimmed === 'SERVER_ADMIN' || trimmed === 'SERVER ADMIN' || trimmed === 'Server Admin') {
    return 'ServerAdmin';
  }
  if (trimmed === 'SUPER ADMIN' || trimmed === 'Super Admin' || trimmed === 'Admin (System)') {
    return 'Admin (System)';
  }
  if (trimmed === 'Owner' || trimmed === 'Admin / Owner' || trimmed === 'Owner / Admin' || trimmed === 'Managing Director') {
    return 'Owner';
  }
  if (trimmed === 'Sales' || trimmed === 'Sales Executive' || trimmed === 'Sales / Order Desk' || trimmed === 'Order Desk' || trimmed === 'Order Manager') {
    return 'Sales/Order Desk';
  }
  if (trimmed === 'Production Planner' || trimmed === 'PPC' || trimmed === 'PPC Planner' || trimmed === 'Production Manager') {
    return 'Production Planner';
  }
  if (trimmed === 'Shop Floor Supervisor' || trimmed === 'Production Supervisor' || trimmed === 'Supervisor') {
    return 'Shop Floor Supervisor';
  }
  if (trimmed === 'QC_MANAGER' || trimmed === 'Quality Inspector' || trimmed === 'QC Inspector' || trimmed === 'Quality Manager' || trimmed === 'QC/QA Inspector') {
    return 'Quality Inspector';
  }
  if (trimmed === 'Quality Auditor' || trimmed === 'PDI Auditor' || trimmed === 'PDI Inspector') {
    return 'Quality Auditor';
  }
  if (trimmed === 'Subcontractor Coordinator' || trimmed === 'Job-Work Coordinator' || trimmed === 'Subcontract Manager') {
    return 'Subcontractor Coordinator';
  }
  if (trimmed === 'Store Keeper' || trimmed === 'Store / Inventory Executive' || trimmed === 'Inventory Clerk' || trimmed === 'Inventory/Store Manager' || trimmed === 'Store Manager') {
    return 'Store Keeper';
  }
  if (trimmed === 'Purchase Manager' || trimmed === 'Purchase Executive' || trimmed === 'Procurement Head' || trimmed === 'Procurement Manager') {
    return 'Purchase Manager';
  }
  if (trimmed === 'DISPATCH_CLERK' || trimmed === 'Dispatch Executive' || trimmed === 'Logistics Coordinator' || trimmed === 'Transport/Dispatch User' || trimmed === 'Transport User') {
    return 'Dispatch Executive';
  }
  if (trimmed === 'FINANCE_MANAGER' || trimmed === 'Accountant' || trimmed === 'Accounts Executive' || trimmed === 'Finance Manager' || trimmed === 'Accounts/Finance User') {
    return 'Accountant';
  }
  if (trimmed === 'HR/Admin' || trimmed === 'HR / Admin' || trimmed === 'HR Manager') {
    return 'HR/Admin';
  }
  if (trimmed === 'OPERATOR' || trimmed === 'Machine Operator' || trimmed === 'Technician' || trimmed === 'Operator') {
    return 'Machine Operator';
  }
  if (trimmed === 'Client' || trimmed === 'Customer' || trimmed === 'CLIENT') {
    return 'Client';
  }

  // Exact match fallback
  if (RBAC_ROLE_MATRIX[trimmed]) {
    return trimmed;
  }

  return 'Shop Floor Supervisor';
}

export function getRoleModulePermission(role: string, module: SystemModule): RolePermissionRule {
  const normRole = normalizeRole(role);
  const roleDef = RBAC_ROLE_MATRIX[normRole] || RBAC_ROLE_MATRIX['Shop Floor Supervisor'];
  return roleDef.permissions[module] || { accessLevel: 'NO_ACCESS', approvalLimit: null, scopeRule: 'ALL' };
}

export function hasMinimumAccess(userAccess: AccessLevel, requiredAccess: AccessLevel): boolean {
  return (ACCESS_LEVEL_RANK[userAccess] ?? 0) >= (ACCESS_LEVEL_RANK[requiredAccess] ?? 0);
}

export function isWithinApprovalLimit(
  role: string, 
  amount: number, 
  module: SystemModule = 'procurement'
): { allowed: boolean; limit: number | null; requiresEscalation: boolean } {
  const normRole = normalizeRole(role);
  const perm = getRoleModulePermission(normRole, module);

  // Unlimited authority (Owner, Admin)
  if (perm.approvalLimit === null || perm.approvalLimit === undefined) {
    return { allowed: true, limit: null, requiresEscalation: false };
  }

  // Role has a defined monetary ceiling
  if (amount <= perm.approvalLimit) {
    return { allowed: true, limit: perm.approvalLimit, requiresEscalation: false };
  }

  // Transaction exceeds role authority -> auto-escalate to Owner
  return { allowed: false, limit: perm.approvalLimit, requiresEscalation: true };
}

export function isScopeRestrictedToOwnRecords(role: string, module: SystemModule = 'production'): boolean {
  const perm = getRoleModulePermission(role, module);
  return perm.scopeRule === 'OWN_RECORDS_ONLY';
}

export function isScopeRestrictedToEmployeeMaster(role: string): boolean {
  const perm = getRoleModulePermission(role, 'masters');
  return perm.scopeRule === 'EMPLOYEE_MASTER_ONLY';
}

export function canPlaceClearQcHold(role: string): boolean {
  const normRole = normalizeRole(role);
  if (normRole === 'Owner' || normRole === 'Admin (System)') return true;
  return normRole === 'Quality Inspector';
}

export function canEditCommercialTerms(role: string): boolean {
  const normRole = normalizeRole(role);
  const perm = getRoleModulePermission(normRole, 'orders');
  if (perm.scopeRule === 'NO_COMMERCIAL_EDIT') return false;
  return hasMinimumAccess(perm.accessLevel, 'CREATE_EDIT');
}
