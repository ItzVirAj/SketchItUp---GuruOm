import { describe, it, expect } from 'vitest';
import { 
  executeOrderStageTransition, 
  validateDrawingRevision, 
  validateCustomerCredit, 
  validateMaterialAvailability, 
  validateHeatLotNumber, 
  validateNoOpenNcrs, 
  validateInvoiceQuantity, 
  validateAmendmentApproval, 
  validateBlanketPoCallOff, 
  validateChangeOrder,
  validatePodRequired,
  validateOrderClosure,
  ORDER_ERROR_CODES, 
  StateMachineContext 
} from '../src/utils/orderStateMachine';

describe('GuruOm Sales & Order Management State Machine & Hard Precondition Gates', () => {

  describe('Gate 1 & Gate 2: Approved Drawing Revision Matching', () => {
    it('passes when order drawing revision matches current approved master revision', () => {
      const result = validateDrawingRevision('REV-B', 'REV-B', '00000001');
      expect(result.valid).toBe(true);
      expect(result.errorCode).toBeUndefined();
    });

    it('blocks with ERR_DRAWING_REVISION_MISMATCH when revision is mismatched', () => {
      const result = validateDrawingRevision('REV-A', 'REV-B', '00000001');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(ORDER_ERROR_CODES.ERR_DRAWING_REVISION_MISMATCH);
      expect(result.errorMessage).toContain('does not match the current approved master revision');
    });

    it('blocks with ERR_DRAWING_REVISION_MISMATCH when revision is empty', () => {
      const result = validateDrawingRevision('', 'REV-A', '00000001');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(ORDER_ERROR_CODES.ERR_DRAWING_REVISION_MISMATCH);
    });
  });

  describe('Customer Credit Control: 90+ Days Overdue Receivables Hold', () => {
    it('passes when customer has no overdue receivables > 90 days', () => {
      const result = validateCustomerCredit(false, 'Tata Motors');
      expect(result.valid).toBe(true);
    });

    it('blocks with ERR_CUSTOMER_CREDIT_HOLD when overdue > 90 days and no Owner override', () => {
      const result = validateCustomerCredit(true, 'Mahindra Aerospace');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(ORDER_ERROR_CODES.ERR_CUSTOMER_CREDIT_HOLD);
      expect(result.errorMessage).toContain('Credit Hold');
    });

    it('allows transition when Owner-level override and reason are provided', () => {
      const result = validateCustomerCredit(
        true, 
        'Mahindra Aerospace', 
        'Owner Viraj', 
        'Executive board approved exceptional credit terms for strategic defense order'
      );
      expect(result.valid).toBe(true);
      expect(result.autoActionsTriggered).toBeDefined();
      expect(result.autoActionsTriggered![0].type).toBe('CREDIT_HOLD_OVERRIDDEN');
    });
  });

  describe('Stage 3: Material Availability Check & Auto-Purchase Requisition', () => {
    it('passes and does not trigger PR when available stock is sufficient', () => {
      const result = validateMaterialAvailability(100, 150, 'RAW-ALU-6061', 'PO-2026-001');
      expect(result.valid).toBe(true);
      expect(result.autoActionsTriggered).toBeUndefined();
    });

    it('auto-triggers Purchase Requisition when available stock is deficient', () => {
      const result = validateMaterialAvailability(100, 40, 'RAW-ALU-6061', 'PO-2026-001');
      expect(result.valid).toBe(true);
      expect(result.autoActionsTriggered).toBeDefined();
      expect(result.autoActionsTriggered![0].type).toBe('PURCHASE_REQUISITION_GENERATED');
      expect(result.autoActionsTriggered![0].payload.deficitQty).toBe(60);
    });
  });

  describe('Stage 4: Mandatory Heat / Lot Number Traceability', () => {
    it('passes when heat/lot number is captured', () => {
      const result = validateHeatLotNumber('HEAT-8921-LOT-04');
      expect(result.valid).toBe(true);
    });

    it('blocks with ERR_HEAT_LOT_REQUIRED when heat/lot number is empty or whitespace', () => {
      const resultEmpty = validateHeatLotNumber('');
      expect(resultEmpty.valid).toBe(false);
      expect(resultEmpty.errorCode).toBe(ORDER_ERROR_CODES.ERR_HEAT_LOT_REQUIRED);

      const resultUndefined = validateHeatLotNumber(undefined);
      expect(resultUndefined.valid).toBe(false);
      expect(resultUndefined.errorCode).toBe(ORDER_ERROR_CODES.ERR_HEAT_LOT_REQUIRED);
    });
  });

  describe('Gate 5 & 6: Hard Block on Open NCRs at Quality Clearance & Ready to Dispatch', () => {
    it('passes when all linked NCRs are closed or no NCRs exist', () => {
      const resultNoNcrs = validateNoOpenNcrs([]);
      expect(resultNoNcrs.valid).toBe(true);
    });

    it('hard blocks with ERR_OPEN_NCR_EXISTS when linked open NCRs exist', () => {
      const openNcrs = [
        {
          id: 'ncr-1',
          ncrNumber: 'NCR-2026-004',
          jobNo: 'JC/0001/26-27',
          defectDescription: 'Shaft runout exceeded tolerance',
          status: 'OPEN'
        }
      ];

      const result = validateNoOpenNcrs(openNcrs);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(ORDER_ERROR_CODES.ERR_OPEN_NCR_EXISTS);
      expect(result.errorMessage).toContain('NCR-2026-004 on JC/0001/26-27');
    });
  });

  describe('Stage 9: Sales Invoice Quantity vs Dispatched Quantity Validation', () => {
    it('passes when invoiced quantity equals dispatched quantity', () => {
      const result = validateInvoiceQuantity(100, 100);
      expect(result.valid).toBe(true);
    });

    it('blocks with ERR_QTY_DISPATCH_MISMATCH when quantities differ without override reason', () => {
      const result = validateInvoiceQuantity(100, 90, '');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(ORDER_ERROR_CODES.ERR_QTY_DISPATCH_MISMATCH);
    });

    it('allows invoice creation with discrepancy when explicit override reason is provided and logged', () => {
      const result = validateInvoiceQuantity(
        100, 
        90, 
        'Customer requested split invoice for 90 units with balance 10 on next delivery', 
        'Accountant Ramesh'
      );
      expect(result.valid).toBe(true);
      expect(result.autoActionsTriggered).toBeDefined();
      expect(result.autoActionsTriggered![0].type).toBe('INVOICE_OVERRIDE_LOGGED');
    });
  });

  describe('Order Amendments: Price Change Requires Owner-Level Approval', () => {
    it('allows non-price amendments (Quantity, Delivery Date)', () => {
      const result = validateAmendmentApproval(false, 'Sales Executive', 'Sales/Order Desk');
      expect(result.valid).toBe(true);
    });

    it('blocks price change when actor is not Owner', () => {
      const result = validateAmendmentApproval(true, 'Accountant', 'Accountant');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(ORDER_ERROR_CODES.ERR_PRICE_AMENDMENT_OWNER_APPROVAL_REQUIRED);
    });

    it('permits price change when actor is Owner', () => {
      const result = validateAmendmentApproval(true, 'Owner', 'Owner');
      expect(result.valid).toBe(true);
    });
  });

  describe('Blanket PO Call-Off Standing Balance Verification', () => {
    it('passes when call-off quantity is within standing blanket PO balance', () => {
      const result = validateBlanketPoCallOff('BLANKET_CALLOFF', 50, 200);
      expect(result.valid).toBe(true);
    });

    it('blocks with ERR_BLANKET_PO_EXHAUSTED when call-off quantity exceeds standing balance', () => {
      const result = validateBlanketPoCallOff('BLANKET_CALLOFF', 250, 200);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(ORDER_ERROR_CODES.ERR_BLANKET_PO_EXHAUSTED);
    });
  });

  describe('End-to-End Context Transitions via executeOrderStageTransition', () => {
    it('successfully runs a full order lifecycle transition context', () => {
      const baseContext: StateMachineContext = {
        orderId: 'ord-101',
        poNo: 'PO-2026-TATA-01',
        subType: 'FRESH_PO',
        currentStage: 'PO_RECEIVED',
        targetStage: 'CONFIRMED',
        actorRole: 'Production Planner',
        actorName: 'PPC Lead',
        orderDrawingRevision: 'REV-A',
        masterDrawingRevision: 'REV-A',
        partCode: 'PART-001',
        customerName: 'Tata Motors',
        isCustomerOverdue90Days: false
      };

      const stage2Result = executeOrderStageTransition(baseContext);
      expect(stage2Result.valid).toBe(true);

      // Stage 4 with heat lot
      const stage4Context: StateMachineContext = {
        ...baseContext,
        currentStage: 'MATERIAL_CHECKED',
        targetStage: 'MATERIAL_ISSUED',
        heatLotNumber: 'HEAT-7712-LOT-01'
      };
      const stage4Result = executeOrderStageTransition(stage4Context);
      expect(stage4Result.valid).toBe(true);

      // Stage 7 Ready to Dispatch with NO open NCRs
      const stage7Context: StateMachineContext = {
        ...baseContext,
        currentStage: 'QC_INSPECTION',
        targetStage: 'READY_TO_DISPATCH',
        linkedOpenNcrs: []
      };
      const stage7Result = executeOrderStageTransition(stage7Context);
      expect(stage7Result.valid).toBe(true);
    });
  });

  describe('PRD v1.0 Hard Gates: POD Verification, Order Closure, & Change Orders', () => {
    it('blocks transition to DELIVERED when POD document URL is missing', () => {
      const podResEmpty = executeOrderStageTransition({
        orderId: 'ord-102',
        poNo: 'PO-2026-002',
        subType: 'FRESH_PO',
        currentStage: 'IN_TRANSIT',
        targetStage: 'DELIVERED',
        actorRole: 'Dispatch Executive',
        actorName: 'Logistics Head',
        orderDrawingRevision: 'REV-A',
        masterDrawingRevision: 'REV-A',
        partCode: 'PART-001',
        customerName: 'Tata Motors',
        isCustomerOverdue90Days: false,
        podDocumentUrl: ''
      });
      expect(podResEmpty.valid).toBe(false);
      expect(podResEmpty.errorCode).toBe(ORDER_ERROR_CODES.ERR_POD_REQUIRED);
    });

    it('passes transition to DELIVERED when valid POD document URL is attached', () => {
      const podResValid = executeOrderStageTransition({
        orderId: 'ord-102',
        poNo: 'PO-2026-002',
        subType: 'FRESH_PO',
        currentStage: 'IN_TRANSIT',
        targetStage: 'DELIVERED',
        actorRole: 'Dispatch Executive',
        actorName: 'Logistics Head',
        orderDrawingRevision: 'REV-A',
        masterDrawingRevision: 'REV-A',
        partCode: 'PART-001',
        customerName: 'Tata Motors',
        isCustomerOverdue90Days: false,
        podDocumentUrl: 'https://storage.guruom.in/pod/scan-2026-002.pdf'
      });
      expect(podResValid.valid).toBe(true);
    });

    it('blocks Order Closure when payment is incomplete', () => {
      const closeRes = executeOrderStageTransition({
        orderId: 'ord-103',
        poNo: 'PO-2026-003',
        subType: 'FRESH_PO',
        currentStage: 'DELIVERED',
        targetStage: 'COMPLETED',
        actorRole: 'Accountant',
        actorName: 'Finance Manager',
        orderDrawingRevision: 'REV-A',
        masterDrawingRevision: 'REV-A',
        partCode: 'PART-001',
        customerName: 'Tata Motors',
        isCustomerOverdue90Days: false,
        paymentStatus: 'PARTIAL',
        outstandingAmount: 25000
      });
      expect(closeRes.valid).toBe(false);
      expect(closeRes.errorCode).toBe(ORDER_ERROR_CODES.ERR_PAYMENT_INCOMPLETE);
    });

    it('allows Order Closure when Delivered and paymentStatus is PAID', () => {
      const closeRes = executeOrderStageTransition({
        orderId: 'ord-103',
        poNo: 'PO-2026-003',
        subType: 'FRESH_PO',
        currentStage: 'DELIVERED',
        targetStage: 'COMPLETED',
        actorRole: 'Accountant',
        actorName: 'Finance Manager',
        orderDrawingRevision: 'REV-A',
        masterDrawingRevision: 'REV-A',
        partCode: 'PART-001',
        customerName: 'Tata Motors',
        isCustomerOverdue90Days: false,
        paymentStatus: 'PAID',
        outstandingAmount: 0
      });
      expect(closeRes.valid).toBe(true);
    });

    it('blocks Change Order amendment if Job Cards exist without Owner override', () => {
      const changeRes = executeOrderStageTransition({
        orderId: 'ord-104',
        poNo: 'PO-2026-004',
        subType: 'FRESH_PO',
        currentStage: 'CONFIRMED',
        targetStage: 'DRAFT',
        actorRole: 'Sales/Order Desk',
        actorName: 'Sales Exec',
        orderDrawingRevision: 'REV-A',
        masterDrawingRevision: 'REV-A',
        partCode: 'PART-001',
        customerName: 'Tata Motors',
        isCustomerOverdue90Days: false,
        hasLinkedJobCards: true,
        isOwnerOverride: false,
        isPriceChanged: true
      });
      expect(changeRes.valid).toBe(false);
      expect(changeRes.errorCode).toBe(ORDER_ERROR_CODES.ERR_JOB_CARDS_EXIST_CHANGE_ORDER);
    });

    it('allows Change Order when Owner explicitly overrides and approves amendment', () => {
      const changeRes = executeOrderStageTransition({
        orderId: 'ord-104',
        poNo: 'PO-2026-004',
        subType: 'FRESH_PO',
        currentStage: 'CONFIRMED',
        targetStage: 'DRAFT',
        actorRole: 'Owner',
        actorName: 'Owner Viraj',
        orderDrawingRevision: 'REV-A',
        masterDrawingRevision: 'REV-A',
        partCode: 'PART-001',
        customerName: 'Tata Motors',
        isCustomerOverdue90Days: false,
        hasLinkedJobCards: true,
        isOwnerOverride: true,
        isPriceChanged: true,
        priceChangeApprovedBy: 'Owner Viraj'
      });
      expect(changeRes.valid).toBe(true);
    });

    it('validates standalone validateChangeOrder gate helper', () => {
      const blocked = validateChangeOrder(true, false, 'Sales/Order Desk');
      expect(blocked.valid).toBe(false);
      expect(blocked.errorCode).toBe(ORDER_ERROR_CODES.ERR_JOB_CARDS_EXIST_CHANGE_ORDER);

      const passed = validateChangeOrder(true, true, 'Owner');
      expect(passed.valid).toBe(true);
    });
  });

});
