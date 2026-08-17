import { describe, it, expect } from 'vitest';
import { 
  evaluateGrnMismatch, 
  evaluateThreeWayMatch, 
  computeVendorScorecard, 
  evaluateSubcontractOverdueStatus,
  SubcontractOrder 
} from '../src/utils/procurementEngine';
import { isWithinApprovalLimit } from '../src/utils/rbacMatrix';

describe('GuruOm Procurement & Job-Work Subcontracting Engine', () => {

  describe('Flow 1: Standard Procurement', () => {
    
    describe('Purchase Orders & Monetary Approval Escalation', () => {
      it('Purchase Manager PO within ₹1,00,000 limit does not require Owner escalation', () => {
        const check = isWithinApprovalLimit('Purchase Manager', 84000, 'procurement');
        expect(check.allowed).toBe(true);
        expect(check.requiresEscalation).toBe(false);
      });

      it('Purchase Manager PO exceeding ₹1,00,000 auto-escalates to Owner', () => {
        const check = isWithinApprovalLimit('Purchase Manager', 141600, 'procurement');
        expect(check.allowed).toBe(false);
        expect(check.requiresEscalation).toBe(true);
        expect(check.limit).toBe(100000);
      });
    });

    describe('GRN Quantity Mismatch Detection & Heat/Lot Trace', () => {
      it('flags shortage mismatch when delivered quantity is less than PO expected quantity', () => {
        const mismatch = evaluateGrnMismatch(100, 92);
        expect(mismatch.isMismatched).toBe(true);
        expect(mismatch.discrepancyQty).toBe(-8);
        expect(mismatch.variancePercentage).toBe(8);
        expect(mismatch.alertSeverity).toBe('MINOR_SHORTAGE');
        expect(mismatch.message).toContain('GRN Quantity Shortage: Received 92 vs PO expected 100');
      });

      it('flags major shortage when deficit exceeds 10%', () => {
        const mismatch = evaluateGrnMismatch(300, 240);
        expect(mismatch.isMismatched).toBe(true);
        expect(mismatch.alertSeverity).toBe('MAJOR_SHORTAGE');
        expect(mismatch.variancePercentage).toBe(20);
      });

      it('flags excess delivery when delivered quantity exceeds PO expected quantity', () => {
        const mismatch = evaluateGrnMismatch(100, 110);
        expect(mismatch.isMismatched).toBe(true);
        expect(mismatch.alertSeverity).toBe('EXCESS_DELIVERY');
        expect(mismatch.discrepancyQty).toBe(10);
      });

      it('confirms perfect match when quantities are equal', () => {
        const mismatch = evaluateGrnMismatch(500, 500);
        expect(mismatch.isMismatched).toBe(false);
        expect(mismatch.alertSeverity).toBe('NONE');
      });
    });

    describe('3-Way Match Verification (PO + GRN + Vendor Bill)', () => {
      it('reconciles successfully when rate and QC-accepted quantities match', () => {
        const result = evaluateThreeWayMatch(280, 280, 290, 290);
        expect(result.matchStatus).toBe('MATCHED');
        expect(result.isFlaggedForReview).toBe(false);
        expect(result.priceVariance).toBe(0);
        expect(result.qtyVariance).toBe(0);
      });

      it('flags price variance when vendor bill rate differs from agreed PO rate', () => {
        const result = evaluateThreeWayMatch(280, 295, 290, 290);
        expect(result.matchStatus).toBe('PRICE_VARIANCE_FLAGGED');
        expect(result.isFlaggedForReview).toBe(true);
        expect(result.priceVariance).toBe(15);
        expect(result.details).toContain('Invoiced unit price ₹295 differs from agreed PO rate of ₹280');
      });

      it('flags quantity variance when invoiced quantity differs from QC-accepted GRN quantity', () => {
        const result = evaluateThreeWayMatch(280, 280, 280, 300);
        expect(result.matchStatus).toBe('QTY_VARIANCE_FLAGGED');
        expect(result.isFlaggedForReview).toBe(true);
        expect(result.qtyVariance).toBe(20);
        expect(result.details).toContain('Vendor invoiced 300 units but QC-Accepted GRN is only 280 units');
      });

      it('flags combined price and quantity variance', () => {
        const result = evaluateThreeWayMatch(280, 310, 250, 300);
        expect(result.matchStatus).toBe('PRICE_AND_QTY_VARIANCE');
        expect(result.isFlaggedForReview).toBe(true);
      });
    });

    describe('Quarterly Vendor Performance Scorecards (OTD % and Quality Acceptance %)', () => {
      it('computes exact scorecard metrics for high-performing vendor (Tier 1)', () => {
        const deliveries = [
          { committedDate: '2026-08-10', actualDeliveryDate: '2026-08-09', receivedQty: 1000, acceptedQty: 990, rejectedQty: 10 },
          { committedDate: '2026-08-15', actualDeliveryDate: '2026-08-15', receivedQty: 500, acceptedQty: 500, rejectedQty: 0 }
        ];

        const scorecard = computeVendorScorecard('VEND-0001', 'Hindalco Industries Ltd', 'Q2-2026', deliveries);
        expect(scorecard.totalDeliveries).toBe(2);
        expect(scorecard.onTimeDeliveries).toBe(2);
        expect(scorecard.otdPercentage).toBe(100);
        expect(scorecard.totalReceivedQty).toBe(1500);
        expect(scorecard.acceptedQty).toBe(1490);
        expect(scorecard.qualityAcceptancePercentage).toBe(99.33);
        expect(scorecard.overallScore).toBe(99.66);
        expect(scorecard.vendorRatingTier).toBe('TIER_1_EXCELLENT');
      });

      it('computes probation rating tier when vendor has frequent delays and high rejections', () => {
        const deliveries = [
          { committedDate: '2026-08-05', actualDeliveryDate: '2026-08-12', receivedQty: 400, acceptedQty: 300, rejectedQty: 100 },
          { committedDate: '2026-08-10', actualDeliveryDate: '2026-08-18', receivedQty: 600, acceptedQty: 450, rejectedQty: 150 }
        ];

        const scorecard = computeVendorScorecard('VEND-RISK', 'Sub-Par Castings', 'Q2-2026', deliveries);
        expect(scorecard.otdPercentage).toBe(0);
        expect(scorecard.qualityAcceptancePercentage).toBe(75.0);
        expect(scorecard.overallScore).toBe(37.5);
        expect(scorecard.vendorRatingTier).toBe('TIER_3_PROBATION');
        expect(scorecard.summaryBadge).toContain('Probationary Risk');
      });
    });

  });

  describe('Flow 2: Job-Work / Subcontracting Flow', () => {
    
    it('automatically flags overdue subcontracted job-work when current date exceeds expected return date', () => {
      const activeOrder: SubcontractOrder = {
        id: 'sub-01',
        gatePassNo: 'GP-OUT-2026-081',
        jobNo: 'JC/0001/26-27',
        itemCode: '00000001',
        itemDescription: 'MAIN SPINDLE HOUSING 120MM',
        subcontractorName: 'Apex Heat Treaters Ltd',
        processType: 'HEAT_TREATMENT',
        dispatchedQty: 60,
        unit: 'NOS',
        dispatchDate: '2026-08-05',
        expectedReturnDate: '2026-08-10',
        qcStatus: 'PENDING_GATE_IN',
        status: 'OUT_FOR_JOBWORK',
        isOverdue: false,
        overdueDays: 0,
        dispatchedBy: 'PPC Planner Suresh'
      };

      // Test evaluation on 2026-08-15 (5 days after expected date 2026-08-10)
      const overdueCheck = evaluateSubcontractOverdueStatus(activeOrder, '2026-08-15');
      expect(overdueCheck.isOverdue).toBe(true);
      expect(overdueCheck.overdueDays).toBe(5);
      expect(overdueCheck.status).toBe('OVERDUE_JOBWORK');
    });

    it('does not flag overdue when current date is on or before expected return date', () => {
      const activeOrder: SubcontractOrder = {
        id: 'sub-02',
        gatePassNo: 'GP-OUT-2026-092',
        jobNo: 'JC/0002/26-27',
        itemCode: '00000002',
        itemDescription: 'HARDENED BUSH 45X60X80',
        subcontractorName: 'Bright Electroplaters Ltd',
        processType: 'ZINC_PLATING',
        dispatchedQty: 150,
        unit: 'NOS',
        dispatchDate: '2026-08-12',
        expectedReturnDate: '2026-08-20',
        qcStatus: 'PENDING_GATE_IN',
        status: 'OUT_FOR_JOBWORK',
        isOverdue: false,
        overdueDays: 0,
        dispatchedBy: 'PPC Planner Suresh'
      };

      const check = evaluateSubcontractOverdueStatus(activeOrder, '2026-08-15');
      expect(check.isOverdue).toBe(false);
      expect(check.overdueDays).toBe(0);
      expect(check.status).toBe('OUT_FOR_JOBWORK');
    });

    it('does not flag overdue when order has already been returned and inspected', () => {
      const completedOrder: SubcontractOrder = {
        id: 'sub-03',
        gatePassNo: 'GP-OUT-2026-065',
        jobNo: 'JC/0003/26-27',
        itemCode: '00000003',
        itemDescription: 'TOWER PIVOTING SECTION',
        subcontractorName: 'Dynamic NDT Testing Labs',
        processType: 'NDT_TESTING',
        dispatchedQty: 80,
        unit: 'NOS',
        dispatchDate: '2026-08-01',
        expectedReturnDate: '2026-08-04',
        actualReturnDate: '2026-08-04',
        qcStatus: 'INSPECTED_ACCEPTED',
        status: 'RETURNED_INSPECTED',
        isOverdue: false,
        overdueDays: 0,
        dispatchedBy: 'PPC Planner Suresh'
      };

      const check = evaluateSubcontractOverdueStatus(completedOrder, '2026-08-15');
      expect(check.isOverdue).toBe(false);
      expect(check.status).toBe('RETURNED_INSPECTED');
    });

  });

});
