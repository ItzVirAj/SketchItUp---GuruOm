import { describe, it, expect } from 'vitest';
import { 
  RBAC_ROLE_MATRIX, 
  normalizeRole, 
  getRoleModulePermission, 
  hasMinimumAccess, 
  isWithinApprovalLimit, 
  isScopeRestrictedToEmployeeMaster, 
  isScopeRestrictedToOwnRecords, 
  canPlaceClearQcHold, 
  canEditCommercialTerms,
  isRoleAuthorizedForCta,
  getCtaPermission
} from '../src/utils/rbacMatrix';

describe('RBAC Role-Permission Matrix & Monetary Approvals Engine', () => {

  it('should define all business roles in RBAC matrix with expected modules', () => {
    const roles = Object.keys(RBAC_ROLE_MATRIX);
    expect(roles.length).toBeGreaterThanOrEqual(12);

    expect(roles).toContain('Owner');
    expect(roles).toContain('Sales/Order Desk');
    expect(roles).toContain('Production Planner');
    expect(roles).toContain('Shop Floor Supervisor');
    expect(roles).toContain('Quality Inspector');
    expect(roles).toContain('Quality Auditor');
    expect(roles).toContain('Subcontractor Coordinator');
    expect(roles).toContain('Store Keeper');
    expect(roles).toContain('Purchase Manager');
    expect(roles).toContain('Dispatch Executive');
    expect(roles).toContain('Accountant');
    expect(roles).toContain('HR/Admin');
    expect(roles).toContain('Machine Operator');
    expect(roles).toContain('Admin (System)');
    expect(roles).toContain('Client');
  });

  describe('Role Normalization', () => {
    it('normalizes legacy role string variants correctly', () => {
      expect(normalizeRole('SUPER ADMIN')).toBe('Admin (System)');
      expect(normalizeRole('Owner')).toBe('Owner');
      expect(normalizeRole('OPERATOR')).toBe('Machine Operator');
      expect(normalizeRole('QC_MANAGER')).toBe('Quality Inspector');
      expect(normalizeRole('DISPATCH_CLERK')).toBe('Dispatch Executive');
      expect(normalizeRole('FINANCE_MANAGER')).toBe('Accountant');
      expect(normalizeRole('Purchase Manager')).toBe('Purchase Manager');
      expect(normalizeRole('HR/Admin')).toBe('HR/Admin');
    });
  });

  describe('Access Level Hierarchies', () => {
    it('evaluates access level rank correctly', () => {
      expect(hasMinimumAccess('FULL_APPROVE', 'VIEW_ONLY')).toBe(true);
      expect(hasMinimumAccess('FULL_APPROVE', 'CREATE_EDIT')).toBe(true);
      expect(hasMinimumAccess('FULL_APPROVE', 'FULL_APPROVE')).toBe(true);
      expect(hasMinimumAccess('CREATE_EDIT', 'VIEW_ONLY')).toBe(true);
      expect(hasMinimumAccess('CREATE_EDIT', 'CREATE_EDIT')).toBe(true);
      expect(hasMinimumAccess('CREATE_EDIT', 'FULL_APPROVE')).toBe(false);
      expect(hasMinimumAccess('VIEW_ONLY', 'CREATE_EDIT')).toBe(false);
      expect(hasMinimumAccess('NO_ACCESS', 'VIEW_ONLY')).toBe(false);
    });

    it('verifies exact access levels for Owner', () => {
      expect(getRoleModulePermission('Owner', 'orders').accessLevel).toBe('FULL_APPROVE');
      expect(getRoleModulePermission('Owner', 'inventory').accessLevel).toBe('VIEW_ONLY');
      expect(getRoleModulePermission('Owner', 'production').accessLevel).toBe('VIEW_ONLY');
      expect(getRoleModulePermission('Owner', 'procurement').accessLevel).toBe('FULL_APPROVE');
      expect(getRoleModulePermission('Owner', 'dispatch').accessLevel).toBe('VIEW_ONLY');
      expect(getRoleModulePermission('Owner', 'accounting').accessLevel).toBe('VIEW_ONLY');
      expect(getRoleModulePermission('Owner', 'masters').accessLevel).toBe('FULL_APPROVE');
      expect(getRoleModulePermission('Owner', 'settings').accessLevel).toBe('FULL_APPROVE');
    });

    it('verifies exact access levels for Sales/Order Desk', () => {
      expect(getRoleModulePermission('Sales/Order Desk', 'orders').accessLevel).toBe('CREATE_EDIT');
      expect(getRoleModulePermission('Sales/Order Desk', 'inventory').accessLevel).toBe('VIEW_ONLY');
      expect(getRoleModulePermission('Sales/Order Desk', 'production').accessLevel).toBe('NO_ACCESS');
      expect(getRoleModulePermission('Sales/Order Desk', 'procurement').accessLevel).toBe('NO_ACCESS');
      expect(getRoleModulePermission('Sales/Order Desk', 'dispatch').accessLevel).toBe('VIEW_ONLY');
      expect(getRoleModulePermission('Sales/Order Desk', 'accounting').accessLevel).toBe('NO_ACCESS');
      expect(getRoleModulePermission('Sales/Order Desk', 'masters').accessLevel).toBe('VIEW_ONLY');
    });
  });

  describe('Monetary Approval Limits & Auto-Escalation Thresholds', () => {
    it('Purchase Manager: ₹1,00,000 PO ceiling', () => {
      const pm = getRoleModulePermission('Purchase Manager', 'procurement');
      expect(pm.accessLevel).toBe('FULL_APPROVE');
      expect(pm.approvalLimit).toBe(100000);

      // Within limit
      const check50k = isWithinApprovalLimit('Purchase Manager', 50000, 'procurement');
      expect(check50k.allowed).toBe(true);
      expect(check50k.requiresEscalation).toBe(false);

      const check100k = isWithinApprovalLimit('Purchase Manager', 100000, 'procurement');
      expect(check100k.allowed).toBe(true);
      expect(check100k.requiresEscalation).toBe(false);

      // Exceeds limit -> Must escalate
      const check150k = isWithinApprovalLimit('Purchase Manager', 150000, 'procurement');
      expect(check150k.allowed).toBe(false);
      expect(check150k.requiresEscalation).toBe(true);
      expect(check150k.limit).toBe(100000);
    });

    it('Accountant: ₹50,000 vendor payment ceiling', () => {
      const acc = getRoleModulePermission('Accountant', 'accounting');
      expect(acc.accessLevel).toBe('FULL_APPROVE');
      expect(acc.approvalLimit).toBe(50000);

      // Within limit
      const check25k = isWithinApprovalLimit('Accountant', 25000, 'accounting');
      expect(check25k.allowed).toBe(true);
      expect(check25k.requiresEscalation).toBe(false);

      const check50k = isWithinApprovalLimit('Accountant', 50000, 'accounting');
      expect(check50k.allowed).toBe(true);
      expect(check50k.requiresEscalation).toBe(false);

      // Exceeds limit -> Must escalate
      const check80k = isWithinApprovalLimit('Accountant', 80000, 'accounting');
      expect(check80k.allowed).toBe(false);
      expect(check80k.requiresEscalation).toBe(true);
      expect(check80k.limit).toBe(50000);
    });

    it('Owner & Admin (System): Unlimited approval limit', () => {
      const ownerProc = isWithinApprovalLimit('Owner', 50000000, 'procurement');
      expect(ownerProc.allowed).toBe(true);
      expect(ownerProc.requiresEscalation).toBe(false);
      expect(ownerProc.limit).toBeNull();

      const ownerAcc = isWithinApprovalLimit('Owner', 50000000, 'accounting');
      expect(ownerAcc.allowed).toBe(true);
      expect(ownerAcc.requiresEscalation).toBe(false);

      const adminProc = isWithinApprovalLimit('Admin (System)', 50000000, 'procurement');
      expect(adminProc.allowed).toBe(true);
      expect(adminProc.requiresEscalation).toBe(false);
    });
  });

  describe('Scoped Row-Level Query Constraints', () => {
    it('HR/Admin: Scoped ONLY to Employee Master (Users)', () => {
      expect(isScopeRestrictedToEmployeeMaster('HR/Admin')).toBe(true);
      expect(isScopeRestrictedToEmployeeMaster('Owner')).toBe(false);
      expect(isScopeRestrictedToEmployeeMaster('Store Keeper')).toBe(false);
      expect(isScopeRestrictedToEmployeeMaster('Purchase Manager')).toBe(false);
    });

    it('Machine Operator: Scoped ONLY to Own Records', () => {
      expect(isScopeRestrictedToOwnRecords('Machine Operator')).toBe(true);
      expect(isScopeRestrictedToOwnRecords('Shop Floor Supervisor')).toBe(false);
      expect(isScopeRestrictedToOwnRecords('Owner')).toBe(false);
    });

    it('Commercial Terms Modification Protections', () => {
      expect(canEditCommercialTerms('Production Planner')).toBe(false);
      expect(canEditCommercialTerms('Dispatch Executive')).toBe(false);
      expect(canEditCommercialTerms('Sales/Order Desk')).toBe(true);
      expect(canEditCommercialTerms('Owner')).toBe(true);
    });

    it('Quality Inspector: Special QC Hold Permissions', () => {
      expect(canPlaceClearQcHold('Quality Inspector')).toBe(true);
      expect(canPlaceClearQcHold('Owner')).toBe(true);
      expect(canPlaceClearQcHold('Admin (System)')).toBe(true);
      expect(canPlaceClearQcHold('Shop Floor Supervisor')).toBe(false);
      expect(canPlaceClearQcHold('Machine Operator')).toBe(false);
    });
  });

  describe('PRD v1.0 CTA Action Table & Permissions Engine', () => {
    it('verifies that Owner has universal authority on all CTAs', () => {
      const ctas = [
        'CREATE_ORDER_DRAFT',
        'CONFIRM_ORDER',
        'VERIFY_MATERIAL_AVAILABILITY',
        'CREATE_PURCHASE_ORDER',
        'RECORD_GRN',
        'CREATE_JOB_CARD',
        'START_MANUFACTURING',
        'UPLOAD_QC_REPORT',
        'UPLOAD_PDI_REPORT',
        'GENERATE_DELIVERY_CHALLAN',
        'MARK_IN_TRANSIT',
        'MARK_DELIVERED',
        'RECORD_PAYMENT',
        'MARK_ORDER_CLOSED'
      ] as const;

      ctas.forEach(cta => {
        expect(isRoleAuthorizedForCta('Owner', cta)).toBe(true);
        expect(isRoleAuthorizedForCta('Admin (System)', cta)).toBe(true);
      });
    });

    it('verifies role-specific CTA restrictions', () => {
      // Sales Desk can confirm orders but cannot clear QC
      expect(isRoleAuthorizedForCta('Sales/Order Desk', 'CONFIRM_ORDER')).toBe(true);
      expect(isRoleAuthorizedForCta('Sales/Order Desk', 'UPLOAD_QC_REPORT')).toBe(false);

      // Quality Inspector can upload QC report but cannot confirm orders
      expect(isRoleAuthorizedForCta('Quality Inspector', 'UPLOAD_QC_REPORT')).toBe(true);
      expect(isRoleAuthorizedForCta('Quality Inspector', 'CONFIRM_ORDER')).toBe(false);

      // Dispatch Executive can mark delivered but cannot record payment
      expect(isRoleAuthorizedForCta('Dispatch Executive', 'MARK_DELIVERED')).toBe(true);
      expect(isRoleAuthorizedForCta('Dispatch Executive', 'RECORD_PAYMENT')).toBe(false);

      // Accountant can record payment and close order but cannot create job cards
      expect(isRoleAuthorizedForCta('Accountant', 'RECORD_PAYMENT')).toBe(true);
      expect(isRoleAuthorizedForCta('Accountant', 'MARK_ORDER_CLOSED')).toBe(true);
      expect(isRoleAuthorizedForCta('Accountant', 'CREATE_JOB_CARD')).toBe(false);
    });
  });

});
