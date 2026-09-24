import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  executeOrderStageTransition, 
  normalizeOrderState,
  ALLOWED_TRANSITIONS,
  ORDER_ERROR_CODES, 
  StateMachineContext,
  CanonicalOrderState
} from '../src/utils/orderStateMachine';
import { 
  generateJobCardFromRouteCard, 
  startOperationOnJobCard,
  completeOperationOnJobCard,
  PRODUCTION_ERROR_CODES,
  EmployeeCertification,
  JobCard
} from '../src/utils/productionEngine';
import { ordersService } from '../backend/src/modules/orders/orders.service';
import { invoicesService } from '../backend/src/modules/invoices/invoices.service';
import { productionService } from '../backend/src/modules/production/production.service';
import { getDbClient } from '../backend/src/config/database';

const SAMPLE_CERTIFIED_OPERATORS: EmployeeCertification[] = [
  { employeeName: 'Rajesh Sharma', certificationName: 'CNC Certified' },
  { employeeName: 'Vikram Patil', certificationName: 'CNC Certified' },
  { employeeName: 'Quality Inspector Rajesh', certificationName: 'Quality Inspector Level 2' }
];

describe('Strict Enterprise Order State Machine & Server-Side Hard Enforcement (Steps 1–8)', () => {
  beforeAll(async () => {
    const existing = await ordersService.getOrders();
    if (!existing.some(o => o.poNo === 'PO-2026-001')) {
      await ordersService.createOrder({
        id: 'ord-seed-001',
        poNo: 'PO-2026-001',
        customerName: 'Tata Motors Limited',
        poDate: '2026-08-01',
        deliveryDate: '2026-09-01',
        status: 'APPROVED',
        grossAmount: 125000,
        lines: [
          {
            id: 'line-seed-001',
            itemCode: '00000001',
            itemDescription: 'MAIN SPINDLE HOUSING 120MM',
            orderQty: 100,
            rate: 1250
          }
        ]
      }, { role: 'Sales/Order Desk', name: 'Seed User' });
    }
    if (!existing.some(o => o.poNo === 'PO-2026-002')) {
      await ordersService.createOrder({
        id: 'ord-seed-002',
        poNo: 'PO-2026-002',
        customerName: 'Tata Motors Limited',
        poDate: '2026-08-01',
        deliveryDate: '2026-09-01',
        status: 'DISPATCHED',
        grossAmount: 625000,
        lines: [
          {
            id: 'line-seed-002',
            itemCode: '00000001',
            itemDescription: 'MAIN SPINDLE HOUSING 120MM',
            orderQty: 500,
            dispatchedQty: 50,
            rate: 1250
          }
        ]
      }, { role: 'Sales/Order Desk', name: 'Seed User' });
    }
  });

  describe('Step 1: Strict Adjacency Transition Graph Enforcement', () => {
    it('allows valid single-step forward progression along golden path', () => {
      const validTransitions: Array<[CanonicalOrderState, CanonicalOrderState]> = [
        ['DRAFT', 'SUBMITTED'],
        ['SUBMITTED', 'APPROVED'],
        ['APPROVED', 'RELEASED'],
        ['RELEASED', 'MATERIAL_CHECK'],
        ['MATERIAL_CHECK', 'MATERIAL_READY'],
        ['MATERIAL_READY', 'JOB_RELEASED'],
        ['JOB_RELEASED', 'IN_PRODUCTION'],
        ['IN_PRODUCTION', 'QC'],
        ['QC', 'PDI'],
        ['PDI', 'READY_FOR_DISPATCH'],
        ['READY_FOR_DISPATCH', 'DISPATCHED'],
        ['DISPATCHED', 'INVOICED'],
        ['INVOICED', 'COMPLETED']
      ];

      for (const [from, to] of validTransitions) {
        const ctx: StateMachineContext = {
          orderId: 'ORD-TEST-001',
          poNo: 'PO-TEST-001',
          subType: 'FRESH_PO',
          currentStage: from,
          targetStage: to,
          actorRole: 'Production Planner',
          actorName: 'Planner Admin',
          orderDrawingRevision: 'REV-A',
          masterDrawingRevision: 'REV-A',
          partCode: '00000001',
          customerName: 'Tata Motors',
          isCustomerOverdue90Days: false,
          heatLotNumber: 'HEAT-9021-LOT-01',
          dispatchedQty: 100,
          invoicedQty: 100
        };

        const res = executeOrderStageTransition(ctx);
        expect(res.valid, `Transition ${from} -> ${to} should be valid`).toBe(true);
      }
    });

    it('rejects forbidden skips: DRAFT -> DISPATCHED', () => {
      const ctx: StateMachineContext = {
        orderId: 'ORD-TEST-001',
        poNo: 'PO-TEST-001',
        subType: 'FRESH_PO',
        currentStage: 'DRAFT',
        targetStage: 'DISPATCHED',
        actorRole: 'Sales Desk',
        actorName: 'Sales User',
        orderDrawingRevision: 'REV-A',
        masterDrawingRevision: 'REV-A',
        partCode: '00000001',
        customerName: 'Tata Motors',
        isCustomerOverdue90Days: false
      };

      const res = executeOrderStageTransition(ctx);
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe(ORDER_ERROR_CODES.ERR_INVALID_STAGE_TRANSITION);
      expect(res.errorMessage).toContain('structurally forbidden');
    });

    it('rejects forbidden skips: IN_PRODUCTION -> INVOICED', () => {
      const ctx: StateMachineContext = {
        orderId: 'ORD-TEST-001',
        poNo: 'PO-TEST-001',
        subType: 'FRESH_PO',
        currentStage: 'IN_PRODUCTION',
        targetStage: 'INVOICED',
        actorRole: 'Finance Desk',
        actorName: 'Accountant',
        orderDrawingRevision: 'REV-A',
        masterDrawingRevision: 'REV-A',
        partCode: '00000001',
        customerName: 'Tata Motors',
        isCustomerOverdue90Days: false,
        dispatchedQty: 100,
        invoicedQty: 100
      };

      const res = executeOrderStageTransition(ctx);
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe(ORDER_ERROR_CODES.ERR_INVALID_STAGE_TRANSITION);
    });

    it('rejects forbidden skip: SUBMITTED -> COMPLETED', () => {
      const ctx: StateMachineContext = {
        orderId: 'ORD-TEST-001',
        poNo: 'PO-TEST-001',
        subType: 'FRESH_PO',
        currentStage: 'SUBMITTED',
        targetStage: 'COMPLETED',
        actorRole: 'Owner',
        actorName: 'Owner User',
        orderDrawingRevision: 'REV-A',
        masterDrawingRevision: 'REV-A',
        partCode: '00000001',
        customerName: 'Tata Motors',
        isCustomerOverdue90Days: false
      };

      const res = executeOrderStageTransition(ctx);
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe(ORDER_ERROR_CODES.ERR_INVALID_STAGE_TRANSITION);
    });

    it('allows recovery transitions: QC_HOLD -> QC after NCR disposition', () => {
      const ctx: StateMachineContext = {
        orderId: 'ORD-TEST-001',
        poNo: 'PO-TEST-001',
        subType: 'FRESH_PO',
        currentStage: 'QC_HOLD',
        targetStage: 'QC',
        actorRole: 'Quality Inspector',
        actorName: 'QC Lead',
        orderDrawingRevision: 'REV-A',
        masterDrawingRevision: 'REV-A',
        partCode: '00000001',
        customerName: 'Tata Motors',
        isCustomerOverdue90Days: false,
        linkedOpenNcrs: []
      };

      const res = executeOrderStageTransition(ctx);
      expect(res.valid).toBe(true);
    });

    it('allows recovery transitions: PDI_HOLD -> PDI', () => {
      const ctx: StateMachineContext = {
        orderId: 'ORD-TEST-001',
        poNo: 'PO-TEST-001',
        subType: 'FRESH_PO',
        currentStage: 'PDI_HOLD',
        targetStage: 'PDI',
        actorRole: 'Quality Inspector',
        actorName: 'QC Lead',
        orderDrawingRevision: 'REV-A',
        masterDrawingRevision: 'REV-A',
        partCode: '00000001',
        customerName: 'Tata Motors',
        isCustomerOverdue90Days: false,
        linkedOpenNcrs: []
      };

      const res = executeOrderStageTransition(ctx);
      expect(res.valid).toBe(true);
    });
  });

  describe('Step 2: Field-Level Locking Tied to State', () => {
    it('rejects direct field modification on approved order', async () => {
      // Mock order in APPROVED state
      const mockOrderId = 'PO-2026-001';
      await expect(
        ordersService.updateOrder(mockOrderId, { customerName: 'Different Customer Ltd' }, { role: 'Sales/Order Desk' })
      ).rejects.toThrow(/locked after order approval/i);
    });

    it('rejects unit price modification on approved order without amendment', async () => {
      const mockOrderId = 'PO-2026-001';
      await expect(
        ordersService.updateOrder(mockOrderId, { grossAmount: 999999 }, { role: 'Sales/Order Desk' })
      ).rejects.toThrow(/locked after order approval/i);
    });

    it('allows editing non-locked fields (remarks/notes) on approved order', async () => {
      const mockOrderId = 'PO-2026-001';
      const updated = await ordersService.updateOrder(
        mockOrderId, 
        { remark: 'Expedite packaging per customer request' }, 
        { role: 'Production Planner' }
      );
      expect(updated.remark).toBe('Expedite packaging per customer request');
    });
  });

  describe('Step 3: Procurement Dependency Branching', () => {
    it('blocks direct Job Card release when order is in PROCUREMENT_PENDING', () => {
      const ctx: StateMachineContext = {
        orderId: 'ORD-DEFICIT-001',
        poNo: 'PO-DEFICIT-001',
        subType: 'FRESH_PO',
        currentStage: 'PROCUREMENT_PENDING',
        targetStage: 'JOB_RELEASED',
        actorRole: 'Production Planner',
        actorName: 'Planner',
        orderDrawingRevision: 'REV-A',
        masterDrawingRevision: 'REV-A',
        partCode: '00000001',
        customerName: 'Tata Motors',
        isCustomerOverdue90Days: false
      };

      const res = executeOrderStageTransition(ctx);
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe(ORDER_ERROR_CODES.ERR_INVALID_STAGE_TRANSITION);
    });

    it('allows progression from PROCUREMENT_PENDING -> GRN -> MATERIAL_READY -> JOB_RELEASED', () => {
      // Step A: PROCUREMENT_PENDING -> GRN
      const res1 = executeOrderStageTransition({
        orderId: 'ORD-1', poNo: 'PO-1', subType: 'FRESH_PO',
        currentStage: 'PROCUREMENT_PENDING', targetStage: 'GRN',
        actorRole: 'Store Keeper', actorName: 'Store Keeper',
        orderDrawingRevision: 'REV-A', masterDrawingRevision: 'REV-A',
        partCode: '00000001', customerName: 'Tata', isCustomerOverdue90Days: false
      });
      expect(res1.valid).toBe(true);

      // Step B: GRN -> MATERIAL_READY
      const res2 = executeOrderStageTransition({
        orderId: 'ORD-1', poNo: 'PO-1', subType: 'FRESH_PO',
        currentStage: 'GRN', targetStage: 'MATERIAL_READY',
        actorRole: 'Store Keeper', actorName: 'Store Keeper',
        orderDrawingRevision: 'REV-A', masterDrawingRevision: 'REV-A',
        partCode: '00000001', customerName: 'Tata', isCustomerOverdue90Days: false
      });
      expect(res2.valid).toBe(true);

      // Step C: MATERIAL_READY -> JOB_RELEASED
      const res3 = executeOrderStageTransition({
        orderId: 'ORD-1', poNo: 'PO-1', subType: 'FRESH_PO',
        currentStage: 'MATERIAL_READY', targetStage: 'JOB_RELEASED',
        actorRole: 'Production Planner', actorName: 'Planner',
        orderDrawingRevision: 'REV-A', masterDrawingRevision: 'REV-A',
        partCode: '00000001', customerName: 'Tata', isCustomerOverdue90Days: false,
        heatLotNumber: 'HEAT-9821-LOT-01'
      });
      expect(res3.valid).toBe(true);
    });
  });

  describe('Step 4: Sequential Gated Production Operations', () => {
    it('blocks starting operation N+1 when operation N is not COMPLETED', () => {
      // Create a fresh multi-step job card
      const testJobCard: JobCard = {
        id: 'jc-test-seq',
        jobNo: 'JC/TEST/001',
        orderPo: 'PO-2026-TEST',
        partCode: '00000001',
        partDescription: 'MAIN SPINDLE HOUSING 120MM',
        drawingRevision: 'REV-A',
        targetQty: 100,
        materialIssuedLot: 'HEAT-101',
        materialQcStatus: 'ACCEPTED',
        currentStepNo: 10,
        currentOperation: 'CNC Rough Turning & Facing',
        jobStatus: 'IN_PROGRESS',
        hasOpenNcr: false,
        operations: [
          { id: 'op-10', jobCardId: 'jc-test-seq', jobNo: 'JC/TEST/001', sequenceNo: 10, operationName: 'CNC Rough Turning & Facing', requiredCertification: 'CNC Certified', standardTimeMinutes: 45, qtyProcessed: 0, qtyRejected: 0, inspectionRequired: false, inspectionPassed: false, opStatus: 'IN_PROGRESS' },
          { id: 'op-20', jobCardId: 'jc-test-seq', jobNo: 'JC/TEST/001', sequenceNo: 20, operationName: 'VMC 4-Axis Bore Milling', requiredCertification: 'CNC Certified', standardTimeMinutes: 60, qtyProcessed: 0, qtyRejected: 0, inspectionRequired: true, inspectionPassed: false, opStatus: 'PENDING' }
        ]
      };

      // Try starting Op 20 while Op 10 is still IN_PROGRESS
      const result = startOperationOnJobCard(
        testJobCard, 
        20, 
        'VMC-4AXIS-02', 
        'Vikram Patil', 
        SAMPLE_CERTIFIED_OPERATORS
      );

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe(PRODUCTION_ERROR_CODES.ERR_OPERATION_SEQUENCE_VIOLATION);
      expect(result.error?.message).toContain('Sequential Operation Gate Blocked');
    });

    it('blocks subsequent operation when prior subcontracted operation has not passed inspection', () => {
      const subcontractJobCard: JobCard = {
        id: 'jc-test-subcon',
        jobNo: 'JC/TEST/002',
        orderPo: 'PO-2026-TEST',
        partCode: '00000001',
        partDescription: 'MAIN SPINDLE HOUSING 120MM',
        drawingRevision: 'REV-A',
        targetQty: 100,
        materialIssuedLot: 'HEAT-101',
        materialQcStatus: 'ACCEPTED',
        currentStepNo: 30,
        currentOperation: 'Outsourced Heat Treatment Case Hardening',
        jobStatus: 'IN_PROGRESS',
        hasOpenNcr: false,
        operations: [
          { id: 'op-10', jobCardId: 'jc-test-subcon', jobNo: 'JC/TEST/002', sequenceNo: 10, operationName: 'CNC Rough Turning', requiredCertification: 'CNC Certified', standardTimeMinutes: 45, qtyProcessed: 100, qtyRejected: 0, inspectionRequired: false, inspectionPassed: true, opStatus: 'COMPLETED' },
          { id: 'op-20', jobCardId: 'jc-test-subcon', jobNo: 'JC/TEST/002', sequenceNo: 20, operationName: 'Outsourced Heat Treatment Outwork', machineId: 'HEAT-TREAT-OUTWORK', requiredCertification: 'None', standardTimeMinutes: 120, qtyProcessed: 100, qtyRejected: 0, inspectionRequired: true, inspectionPassed: false, opStatus: 'COMPLETED' },
          { id: 'op-30', jobCardId: 'jc-test-subcon', jobNo: 'JC/TEST/002', sequenceNo: 30, operationName: 'Cylindrical Precision Grinding', machineId: 'GRINDING-01', requiredCertification: 'None', standardTimeMinutes: 35, qtyProcessed: 0, qtyRejected: 0, inspectionRequired: true, inspectionPassed: false, opStatus: 'PENDING' }
        ]
      };

      const result = startOperationOnJobCard(
        subcontractJobCard, 
        30, 
        'GRINDING-01', 
        'Rajesh Sharma', 
        SAMPLE_CERTIFIED_OPERATORS
      );

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe(PRODUCTION_ERROR_CODES.ERR_OPERATION_SEQUENCE_VIOLATION);
      expect(result.error?.message).toContain('Subcontract Quality Gate Blocked');
    });
  });

  describe('Step 5: Hard Gates at QC, PDI, Dispatch, and Invoice', () => {
    it('rejects invoice generation for orders still in production', async () => {
      const invoicePayload = {
        customerId: 'cust-1',
        customerName: 'Tata Motors Limited',
        customerGstin: '27AABCT1332L1Z5',
        orderPo: 'PO-2026-001', // PO-2026-001 is in IN_PRODUCTION / PO_RECEIVED
        challanNo: 'CHL/PENDING/01',
        date: '2026-08-15',
        dueDate: '2026-09-15',
        status: 'UNPAID' as const,
        items: [
          {
            itemCode: '00000001',
            itemDescription: 'MAIN SPINDLE HOUSING 120MM',
            hsnCode: '8483',
            qty: 100,
            unitPrice: 1250,
            gstRate: 18.0
          }
        ]
      };

      await expect(
        invoicesService.createInvoice(invoicePayload, 'Accountant')
      ).rejects.toThrow(/Order must be physically DISPATCHED before invoice generation/i);
    });

    it('rejects invoice exceeding dispatched quantity', async () => {
      const invoicePayload = {
        customerId: 'cust-1',
        customerName: 'Tata Motors Limited',
        customerGstin: '27AABCT1332L1Z5',
        orderPo: 'PO-2026-002', // Dispatched 50 units
        challanNo: 'CHL/0001/26-27',
        date: '2026-08-15',
        dueDate: '2026-09-15',
        status: 'UNPAID' as const,
        items: [
          {
            itemCode: '00000001',
            itemDescription: 'MAIN SPINDLE HOUSING 120MM',
            hsnCode: '8483',
            qty: 500, // Attempting to invoice 500 when only 50 were dispatched
            unitPrice: 1250,
            gstRate: 18.0
          }
        ]
      };

      await expect(
        invoicesService.createInvoice(invoicePayload, 'Accountant')
      ).rejects.toThrow(/exceeds eligible physically dispatched quantity/i);
    });
  });

  describe('Step 6: Price Amendments Requiring Owner Approval', () => {
    it('escalates price change amendment to Owner when submitted by non-owner', async () => {
      const result = await ordersService.createAmendment(
        'PO-2026-001',
        {
          orderId: 'PO-2026-001',
          amendmentType: 'PRICE',
          newUnitPrice: 1450,
          reason: 'Raw material alloy surcharge increase'
        },
        { role: 'Sales/Order Desk', name: 'Sales Clerk' }
      );

      expect(result.status).toBe('ESCALATED_TO_OWNER');
      expect(result.escalated).toBe(true);
      expect(result.message).toContain('requires Owner authorization');
    });
  });

  describe('Step 7: Order Confirmation Persistence & 7-Stage Pipeline Regression', () => {
    it('creates an order in PO_RECEIVED/DRAFT, confirms it, and ensures state persists across re-fetches without reverting', async () => {
      // 1. Create a fresh test order
      const newPoNo = `PO-TEST-REG-${Date.now()}`;
      const created = await ordersService.createOrder({
        poNo: newPoNo,
        customerName: 'Tata Motors Limited',
        poDate: '2026-08-15',
        deliveryDate: '2026-09-30',
        subType: 'FRESH_PO',
        grossAmount: 150000,
        taxCategory: 'GST 18%',
        lines: [
          {
            id: 'line-test-1',
            itemCode: '00000001',
            itemDescription: 'MAIN SPINDLE HOUSING 120MM',
            custPartNo: 'TM-SP-001',
            orderQty: 100,
            unit: 'NOS',
            rate: 1500,
            drawingRevision: 'REV-A'
          }
        ]
      }, { role: 'Sales/Order Desk', name: 'Commercial Officer' });

      expect(created).toBeDefined();
      expect(created.status).toBe('PO_RECEIVED');
      expect(created.progressStep).toBe(1);

      // 2. Transition/Confirm Order
      const transitionResult = await ordersService.transitionOrderStage(
        created.id,
        { targetStage: 'CONFIRMED' },
        { role: 'Production Planner', name: 'Executive Planner' }
      );

      expect(transitionResult.status).toBe('CONFIRMED');
      expect(transitionResult.progressStep).toBe(2);

      // 3. Re-fetch from backend service (simulating page reload)
      const refetched = await ordersService.getOrderById(created.id);
      expect(refetched).toBeDefined();
      expect(refetched?.status).toBe('CONFIRMED');
      expect(refetched?.progressStep).toBe(2);

      // 4. Also check getOrders() list re-fetch
      const allOrders = await ordersService.getOrders();
      const matched = allOrders.find(o => o.id === created.id || o.poNo === newPoNo);
      expect(matched).toBeDefined();
      expect(matched?.status).toBe('CONFIRMED');
      expect(matched?.progressStep).toBe(2);
    }, 15000);

    it('enforces recency sorting, dynamic Material Check progression, and Job Card PO selector gating', async () => {
      // 1. Create a brand new order
      const freshPoNo = `PO-GOLDEN-${Date.now()}`;
      const freshOrder = await ordersService.createOrder({
        poNo: freshPoNo,
        customerName: 'Bharat Heavy Electricals Ltd',
        poDate: '2026-08-16',
        deliveryDate: '2026-10-15',
        subType: 'FRESH_PO',
        grossAmount: 220000,
        taxCategory: 'GST 18%',
        drawingRevision: 'REV-A',
        lines: [
          {
            id: `line-${Date.now()}`,
            itemCode: '00000001',
            itemDescription: 'MAIN SPINDLE HOUSING 120MM',
            custPartNo: 'BHEL-SP-120',
            orderQty: 50,
            unit: 'NOS',
            rate: 4400,
            drawingRevision: 'REV-A'
          }
        ]
      }, { role: 'Sales/Order Desk', name: 'Sales Officer' });

      expect(freshOrder).toBeDefined();

      // Part 1: Verify this new order appears at the top of getOrders() due to recency sorting
      const ordersList = await ordersService.getOrders();
      expect(ordersList.length).toBeGreaterThan(0);
      expect(ordersList[0].poNo).toBe(freshPoNo);

      // Part 2: Confirm the order
      const confirmed = await ordersService.transitionOrderStage(
        freshOrder.id,
        { targetStage: 'CONFIRMED' },
        { role: 'Sales/Order Desk', name: 'Manager' }
      );
      expect(confirmed.status).toBe('CONFIRMED');
      expect(confirmed.progressStep).toBe(2);

      // Part 3: Server-side validation rejects creating a Job Card on an unverified order (CONFIRMED / stage 2)
      await expect(
        productionService.createJobCard({
          orderPo: freshPoNo,
          orderId: freshOrder.id,
          partCode: '00000001',
          partDescription: 'MAIN SPINDLE HOUSING 120MM',
          drawingRevision: 'REV-A',
          targetQty: 50,
          targetDate: '2026-09-01',
          materialIssuedLot: 'HEAT-TEST-LOT',
          materialQcStatus: 'ACCEPTED'
        }, 'Production Planner')
      ).rejects.toThrow(/Order must complete Stage 3 Material Verification/);

      // Part 4: Run Material Check to advance order to Stage 3 (MATERIAL_READY with Heat/Lot)
      const materialReadyOrder = await ordersService.transitionOrderStage(
        freshOrder.id,
        { 
          targetStage: 'MATERIAL_READY',
          heatLotNumber: 'HEAT-LOT-BHEL-0099'
        },
        { role: 'Production Planner', name: 'PPC Lead' }
      );
      expect(materialReadyOrder.status).toBe('MATERIAL_READY');
      expect(materialReadyOrder.heatLotNumber).toBe('HEAT-LOT-BHEL-0099');
      expect(materialReadyOrder.progressStep).toBeGreaterThanOrEqual(3);

      // Part 5: Now creating a Job Card for this MATERIAL_READY order succeeds
      const jobCard = await productionService.createJobCard({
        orderPo: freshPoNo,
        orderId: freshOrder.id,
        partCode: '00000001',
        partDescription: 'MAIN SPINDLE HOUSING 120MM',
        drawingRevision: 'REV-A',
        targetQty: 50,
        targetDate: '2026-09-01',
        materialIssuedLot: 'HEAT-LOT-BHEL-0099',
        materialQcStatus: 'ACCEPTED'
      }, 'Production Planner');

      expect(jobCard).toBeDefined();
      expect(jobCard.orderPo).toBe(freshPoNo);
      expect(jobCard.partCode).toBe('00000001');
      expect(jobCard.drawingRevision).toBe('REV-A');
      expect(jobCard.materialIssuedLot).toBe('HEAT-LOT-BHEL-0099');
      expect(jobCard.targetQty).toBe(50);
    }, 15000);
  });

  afterAll(async () => {
    // Automated Teardown: Clean up any test orders, line items, and job cards generated in this test run
    try {
      const db = getDbClient();
      const { data: testOrders } = await db
        .from('customer_orders')
        .select('id, po_no')
        .or('po_no.ilike.PO-TEST-REG-%,po_no.ilike.PO-GOLDEN-%,po_no.ilike.PO-PERSIST-%,po_no.ilike.__TEST__%');

      if (testOrders && testOrders.length > 0) {
        for (const to of testOrders) {
          await db.from('material_reservations').delete().eq('order_po', to.po_no);
          await db.from('job_cards').delete().eq('order_po', to.po_no);
          await db.from('order_line_items').delete().eq('order_id', to.id);
          await db.from('customer_orders').delete().eq('id', to.id);
        }
      }
    } catch (cleanupErr) {
      console.warn('strictOrderStateMachine afterAll cleanup warning:', cleanupErr);
    }
  });
});
