import { describe, it, expect } from 'vitest';
import { 
  validateGstin, 
  isEInvoiceApplicable, 
  validateInvoiceLineGst, 
  calculateVendorBillTds, 
  getCurrentFinancialYear, 
  formatDocumentNumber, 
  calculateOrderCosting, 
  STATUTORY_ERROR_CODES 
} from '../src/utils/statutoryAccountingEngine';
import { isWithinApprovalLimit } from '../src/utils/rbacMatrix';

describe('GuruOm Statutory Invoicing, Accounting & Order Costing Engine', () => {

  describe('Statutory GSTIN Validation & Dynamic E-Invoicing Threshold', () => {
    it('validates 15-character statutory Indian GSTIN format', () => {
      const validCheck = validateGstin('27AABCG1234F1Z5');
      expect(validCheck.valid).toBe(true);
      expect(validCheck.isExempt).toBe(false);
    });

    it('permits GST-exempt customers with N/A flag', () => {
      const exemptCheck = validateGstin('N/A — GST-exempt');
      expect(exemptCheck.valid).toBe(true);
      expect(exemptCheck.isExempt).toBe(true);
    });

    it('rejects malformed GSTIN with ERR_INVALID_GSTIN', () => {
      const invalidCheck = validateGstin('27INVALIDGST');
      expect(invalidCheck.valid).toBe(false);
      expect(invalidCheck.errorCode).toBe(STATUTORY_ERROR_CODES.ERR_INVALID_GSTIN);
      expect(invalidCheck.errorMessage).toContain('15-character statutory format');
    });

    it('flags E-Invoicing as mandatory when annual turnover exceeds ₹5 Crore threshold', () => {
      const result = isEInvoiceApplicable(68500000.0, 50000000.0); // 6.85 Cr vs 5 Cr
      expect(result.isApplicable).toBe(true);
      expect(result.message).toContain('E-Invoicing is MANDATORY');
    });

    it('does not flag E-Invoicing when annual turnover is below threshold', () => {
      const result = isEInvoiceApplicable(35000000.0, 50000000.0); // 3.5 Cr vs 5 Cr
      expect(result.isApplicable).toBe(false);
      expect(result.message).toContain('E-Invoicing is not mandatory');
    });
  });

  describe('HSN & Master-Driven GST Rates on Invoice Line Items', () => {
    it('passes when invoiced GST rate matches master GST rate', () => {
      const check = validateInvoiceLineGst(18.0, 18.0);
      expect(check.valid).toBe(true);
    });

    it('blocks manual GST rate override without reason with ERR_GST_RATE_OVERRIDE_REASON_REQUIRED', () => {
      const check = validateInvoiceLineGst(18.0, 12.0, '');
      expect(check.valid).toBe(false);
      expect(check.errorCode).toBe(STATUTORY_ERROR_CODES.ERR_GST_RATE_OVERRIDE_REASON_REQUIRED);
      expect(check.errorMessage).toContain('explicit reason for statutory override is mandatory');
    });

    it('allows GST rate override when a valid statutory reason is provided', () => {
      const check = validateInvoiceLineGst(18.0, 5.0, 'Concessional GST rate for defense export order per Notification 41/2026');
      expect(check.valid).toBe(true);
    });
  });

  describe('Statutory TDS Withholding on Vendor Bills (Section 194C & Section 194Q)', () => {
    it('applies 1% TDS under Section 194C for Individual/HUF Subcontractors', () => {
      const result = calculateVendorBillTds({
        vendorType: 'Subcontractor/Job-Worker',
        vendorPan: 'ABCPJ1234F', // 4th char (index 3) is 'P' = Individual
        grossAmount: 50000
      });

      expect(result.tdsSection).toBe('194C');
      expect(result.tdsRate).toBe(1.0);
      expect(result.tdsAmount).toBe(500);
      expect(result.netPayableAmount).toBe(49500);
      expect(result.panStatus).toBe('VALID_PAN');
    });

    it('applies 2% TDS under Section 194C for Corporate/LLP Subcontractors', () => {
      const result = calculateVendorBillTds({
        vendorType: 'Subcontractor/Job-Worker',
        vendorPan: 'AABCC1234F', // 4th char C = Company
        grossAmount: 100000
      });

      expect(result.tdsSection).toBe('194C');
      expect(result.tdsRate).toBe(2.0);
      expect(result.tdsAmount).toBe(2000);
      expect(result.netPayableAmount).toBe(98000);
    });

    it('applies 20% penal TDS under Section 206AA when PAN is missing or invalid', () => {
      const result = calculateVendorBillTds({
        vendorType: 'Subcontractor/Job-Worker',
        vendorPan: '',
        grossAmount: 50000
      });

      expect(result.tdsSection).toBe('194C');
      expect(result.tdsRate).toBe(20.0);
      expect(result.tdsAmount).toBe(10000);
      expect(result.netPayableAmount).toBe(40000);
      expect(result.panStatus).toBe('INVALID_PAN_PENALTY_20_PERCENT');
    });

    it('applies 0.1% TDS under Section 194Q for goods purchase exceeding ₹50 Lakhs', () => {
      const result = calculateVendorBillTds({
        vendorType: 'Supplier',
        vendorPan: 'AABCH9821C',
        grossAmount: 200000,
        isPurchaseOfGoods: true,
        cumulativeAnnualPurchases: 5200000 // > 50L
      });

      expect(result.tdsSection).toBe('194Q');
      expect(result.tdsRate).toBe(0.1);
      expect(result.tdsAmount).toBe(200);
      expect(result.netPayableAmount).toBe(199800);
    });
  });

  describe('Document Numbering Series & Financial Year Reset', () => {
    it('computes FY 2526 for dates between April 2025 and March 2026', () => {
      const fyAugust2025 = getCurrentFinancialYear('2025-08-15');
      expect(fyAugust2025).toBe('2526');

      const fyMarch2026 = getCurrentFinancialYear('2026-03-31');
      expect(fyMarch2026).toBe('2526');
    });

    it('computes FY 2627 for dates starting April 1st 2026', () => {
      const fyApril2026 = getCurrentFinancialYear('2026-04-01');
      expect(fyApril2026).toBe('2627');

      const fyAugust2026 = getCurrentFinancialYear('2026-08-15');
      expect(fyAugust2026).toBe('2627');
    });

    it('formats document numbers with prefix, FY and padded running sequence', () => {
      const invNo = formatDocumentNumber('INV', '2526', 1);
      expect(invNo).toBe('INV-2526-0001');

      const poNo = formatDocumentNumber('PO', '2627', 81);
      expect(poNo).toBe('PO-2627-0081');
    });
  });

  describe('Job/Order-Wise Costing & Profitability % Calculation', () => {
    it('computes prime cost, 18% overhead allocation, gross margin and profitability %', () => {
      const costing = calculateOrderCosting({
        orderRevenue: 100000,
        directMaterialCost: 40000,
        laborMinutes: 120, // 2 hours
        laborHourlyRate: 300, // ₹600 labor cost
        overheadPercentage: 18.0
      });

      expect(costing.directLaborCost).toBe(600);
      expect(costing.primeCost).toBe(40600); // 40000 + 600
      expect(costing.overheadCost).toBe(7308); // 18% of 40600 = 7308
      expect(costing.totalCost).toBe(47908); // 40600 + 7308
      expect(costing.grossMarginAmount).toBe(52092); // 100000 - 47908
      expect(costing.profitabilityPercentage).toBe(52.09);
    });
  });

  describe('Vendor Payment RBAC Monetary Limits Enforcement', () => {
    it('Accountant can approve payment disbursement up to ₹50,000', () => {
      const check = isWithinApprovalLimit('Accountant', 45000, 'accounting');
      expect(check.allowed).toBe(true);
      expect(check.requiresEscalation).toBe(false);
    });

    it('Accountant payment exceeding ₹50,000 requires Owner authorization', () => {
      const check = isWithinApprovalLimit('Accountant', 75000, 'accounting');
      expect(check.allowed).toBe(false);
      expect(check.requiresEscalation).toBe(true);
      expect(check.limit).toBe(50000);
    });

    it('Owner has unlimited payment disbursement approval limit', () => {
      const check = isWithinApprovalLimit('Owner', 500000, 'accounting');
      expect(check.allowed).toBe(true);
      expect(check.requiresEscalation).toBe(false);
    });
  });

});
