import { describe, it, expect, beforeEach } from 'vitest';
import {
  completePdiInspectionForOrder,
  generateInvoiceForOrder,
  generateChallanForOrder,
  markOrderDispatched,
  markOrderDelivered,
  markOrderDelayed,
  recordOrderPaymentAndClose
} from '../src/services/supabaseServices';
import { isValidTransition } from '../src/utils/orderStateMachine';
import { CustomerOrder } from '../src/types/console';

describe('End-to-End Order Progression Workflow', () => {
  let sampleOrder: CustomerOrder;

  beforeEach(() => {
    sampleOrder = {
      id: 'ord-1',
      poNo: 'PO-2026-PROGRESSION-01',
      customerName: 'Bharat Forge Ltd',
      status: 'CONFIRMED',
      stage: 'CONFIRMED',
      progressStep: 2,
      orderDate: '2026-08-18',
      deliveryDate: '2026-08-30',
      taxCategory: 'GST 18%',
      grossAmount: 59000,
      paidAmount: 0,
      paymentStatus: 'UNPAID',
      lines: [
        {
          id: 'line-1',
          itemCode: 'FG-PIN-25MM',
          itemDescription: 'Hardened Dowel Pin 25mm x 120mm',
          orderQty: 100,
          dispatchedQty: 0,
          pendingQty: 100,
          rate: 500,
          unit: 'NOS'
        }
      ]
    };
  });

  it('validates linear state machine transitions across all 8 progression stages', () => {
    // 1. CONFIRMED -> IN_PRODUCTION
    expect(isValidTransition('CONFIRMED', 'IN_PRODUCTION')).toBe(true);

    // 2. IN_PRODUCTION -> READY_TO_DISPATCH (via PDI Pass)
    expect(isValidTransition('IN_PRODUCTION', 'READY_TO_DISPATCH')).toBe(true);

    // 3. READY_TO_DISPATCH -> DISPATCHED
    expect(isValidTransition('READY_TO_DISPATCH', 'DISPATCHED')).toBe(true);

    // 4. DISPATCHED -> DELIVERED
    expect(isValidTransition('DISPATCHED', 'DELIVERED')).toBe(true);

    // 5. DELIVERED -> PAYMENT_PENDING
    expect(isValidTransition('DELIVERED', 'PAYMENT_PENDING')).toBe(true);

    // 6. PAYMENT_PENDING -> CLOSED
    expect(isValidTransition('PAYMENT_PENDING', 'CLOSED')).toBe(true);
  });

  it('prevents illegal invalid transitions (skipping mandatory stages)', () => {
    // Cannot skip from CONFIRMED directly to DISPATCHED
    expect(isValidTransition('CONFIRMED', 'DISPATCHED')).toBe(false);

    // Cannot skip from IN_PRODUCTION directly to CLOSED
    expect(isValidTransition('IN_PRODUCTION', 'CLOSED')).toBe(false);

    // Cannot close order directly from DRAFT
    expect(isValidTransition('DRAFT', 'CLOSED')).toBe(false);
  });

  it('completes PDI inspection and transitions order to READY_TO_DISPATCH on PASS', async () => {
    const pdiPayload = {
      orderPo: sampleOrder.poNo,
      partCode: sampleOrder.lines[0].itemCode,
      partDescription: sampleOrder.lines[0].itemDescription,
      qty: 100,
      pdiStatus: 'PASS' as const,
      certificateNo: 'PDI-COC-98765',
      acceptedQty: 100,
      rejectedQty: 0,
      remarks: '100% dimensions and surface roughness within tolerance',
      pdiReportUrl: 'https://storage.guruom.in/pdi/pdi-report-01.pdf',
      checklist: {
        visualFinish: true,
        dimensionalAudit: true,
        gaugesChecked: true,
        packagingRustProof: true
      },
      inspectedBy: 'Ramesh QA Lead'
    };

    const res = await completePdiInspectionForOrder(sampleOrder.id, pdiPayload);
    expect(res.success).toBe(true);
    expect(res.pdiStatus).toBe('PASS');
    expect(res.orderStatus).toBe('READY_TO_DISPATCH');
    expect(res.certificateNo).toBe('PDI-COC-98765');
  }, 15000);

  it('generates Tax Invoice and Delivery Challan with vendor transporter', async () => {
    const invoiceData = {
      orderPo: sampleOrder.poNo,
      customerName: sampleOrder.customerName,
      totalAmount: 59000,
      taxAmount: 9000,
      invoiceNo: 'INV-26-4589',
      invoiceDate: '2026-08-18',
      items: sampleOrder.lines
    };

    const invRes = await generateInvoiceForOrder(sampleOrder.id, invoiceData);
    expect(invRes).toBeDefined();
    expect(invRes.invoiceNo).toBe('INV-26-4589');
    expect(invRes.totalAmount).toBe(59000);

    const challanData = {
      orderPo: sampleOrder.poNo,
      challanNo: 'CHL-26-1122',
      transporter: 'VRL Logistics Ltd',
      vehicleNo: 'MH 12 AB 4589',
      driverContact: '+91 98765 43210',
      remarks: 'Consignment dispatched with test certificates',
      items: sampleOrder.lines
    };

    const chlRes = await generateChallanForOrder(sampleOrder.id, challanData);
    expect(chlRes).toBeDefined();
    expect(chlRes.transporter).toBe('VRL Logistics Ltd');
    expect(chlRes.challanNo).toBe('CHL-26-1122');
  }, 15000);

  it('marks order dispatched, delivers with optional POD, and records payment to auto-close', async () => {
    // 1. Dispatch
    const dispatchData = {
      dispatchDate: '2026-08-19',
      transporter: 'SafeXpress Logistics',
      vehicleNo: 'MH 14 DE 7890',
      lrNo: 'LR-556677',
      driverContact: '+91 98111 22334',
      remarks: 'Dispatched through express courier',
      lines: sampleOrder.lines
    };

    const dispRes = await markOrderDispatched(sampleOrder.id, dispatchData);
    expect(dispRes.success).toBe(true);
    expect(dispRes.orderStatus).toBe('DISPATCHED');

    // 2. Deliver
    const deliveryData = {
      deliveryDate: '2026-08-20',
      receivedBy: 'D. Kulkarni (Store Manager)',
      podUrl: 'https://storage.guruom.in/pod/pod-signed-scan.pdf',
      remarks: 'Goods received in intact condition'
    };

    const delivRes = await markOrderDelivered(sampleOrder.id, deliveryData);
    expect(delivRes.success).toBe(true);
    expect(delivRes.orderStatus).toBe('DELIVERED');

    // 3. Record full payment -> Auto-Close Order
    const paymentData = {
      amount: 59000,
      mode: 'NEFT' as const,
      referenceNo: 'UTR-HDFC-99887766',
      paymentDate: '2026-08-21',
      currentPaid: 0,
      grossAmount: 59000,
      remarks: 'Full invoice amount settled via bank transfer',
      receivedBy: 'Finance Lead'
    };

    const payRes = await recordOrderPaymentAndClose(sampleOrder.id, paymentData);
    expect(payRes.success).toBe(true);
    expect(payRes.isFullyPaid).toBe(true);
    expect(payRes.orderStatus).toBe('PAID');
    expect(isValidTransition('DELIVERED', 'PAYMENT_PENDING')).toBe(true);
    expect(isValidTransition('PAYMENT_PENDING', 'CLOSED')).toBe(true);
  }, 15000);

  it('runs complete lifecycle: Route Card Operations -> Manufacturing Completed -> START QC/PDI -> PDI Pass -> Dispatched -> Delivered -> Closed', async () => {
    // 1. Initial State: Order is Confirmed and In Production
    expect(isValidTransition('CONFIRMED', 'IN_PRODUCTION')).toBe(true);

    // 2. All Route Card operations completed -> Order is ready for QC / PDI
    expect(isValidTransition('IN_PRODUCTION', 'MANUFACTURING_COMPLETED' as any)).toBe(true);
    expect(isValidTransition('MANUFACTURING_COMPLETED' as any, 'READY_TO_DISPATCH')).toBe(true);

    // 3. QC / PDI Check: User fills checklist and passes inspection
    const pdiPayload = {
      orderPo: sampleOrder.poNo,
      partCode: sampleOrder.lines[0].itemCode,
      partDescription: sampleOrder.lines[0].itemDescription,
      qty: 100,
      pdiStatus: 'PASS' as const,
      certificateNo: 'PDI-COC-FINAL-001',
      acceptedQty: 100,
      rejectedQty: 0,
      remarks: 'All quality checks and dimensions 100% compliant',
      checklist: {
        visualFinish: true,
        dimensionalAudit: true,
        gaugesChecked: true,
        packagingRustProof: true
      },
      inspectedBy: 'QA Lead'
    };

    const pdiResult = await completePdiInspectionForOrder(sampleOrder.id, pdiPayload);
    expect(pdiResult.success).toBe(true);
    expect(pdiResult.orderStatus).toBe('READY_TO_DISPATCH');

    // 4. Invoicing & Delivery Challan
    const invoiceResult = await generateInvoiceForOrder(sampleOrder.id, {
      orderPo: sampleOrder.poNo,
      customerName: sampleOrder.customerName,
      totalAmount: 59000,
      taxAmount: 9000,
      invoiceNo: 'INV-2026-FINAL-01',
      invoiceDate: '2026-08-18',
      items: sampleOrder.lines
    });
    expect(invoiceResult.invoiceNo).toBe('INV-2026-FINAL-01');

    const challanResult = await generateChallanForOrder(sampleOrder.id, {
      orderPo: sampleOrder.poNo,
      challanNo: 'CHL-2026-FINAL-01',
      transporter: 'VRL Logistics Ltd',
      vehicleNo: 'MH 12 CD 1234',
      items: sampleOrder.lines
    });
    expect(challanResult.challanNo).toBe('CHL-2026-FINAL-01');

    // 5. Outward Dispatch
    const dispatchResult = await markOrderDispatched(sampleOrder.id, {
      dispatchDate: '2026-08-19',
      transporter: 'VRL Logistics Ltd',
      vehicleNo: 'MH 12 CD 1234',
      lrNo: 'LR-998811'
    });
    expect(dispatchResult.orderStatus).toBe('DISPATCHED');

    // 6. Delivery Confirmation (Optional POD)
    const deliverResult = await markOrderDelivered(sampleOrder.id, {
      deliveryDate: '2026-08-20',
      receivedBy: 'Plant Manager',
      podUrl: 'https://storage.guruom.in/pod/final-pod.pdf'
    });
    expect(deliverResult.orderStatus).toBe('DELIVERED');

    // 7. Commercial Payment Settlement & Auto-Close
    const paymentResult = await recordOrderPaymentAndClose(sampleOrder.id, {
      amount: 59000,
      mode: 'RTGS',
      referenceNo: 'RTGS-PUNB-112233',
      paymentDate: '2026-08-21',
      currentPaid: 0,
      grossAmount: 59000,
      remarks: 'Full settlement received'
    });
    expect(paymentResult.success).toBe(true);
    expect(paymentResult.isFullyPaid).toBe(true);
    expect(paymentResult.orderStatus).toBe('PAID');
    expect(isValidTransition('DELIVERED', 'COMPLETED')).toBe(true);
  }, 15000);

  it('validates DELIVERY_DELAYED stage transitions: allows transit->delayed->delivered, blocks delayed->payment/close', () => {
    // In Transit -> Delivery Delayed is valid
    expect(isValidTransition('IN_TRANSIT', 'DELIVERY_DELAYED')).toBe(true);
    expect(isValidTransition('DISPATCHED', 'DELIVERY_DELAYED')).toBe(true);

    // Delivery Delayed -> Delivered is the ONLY valid forward transition
    expect(isValidTransition('DELIVERY_DELAYED', 'DELIVERED')).toBe(true);

    // Delivery Delayed cannot jump directly to Payment or Closed
    expect(isValidTransition('DELIVERY_DELAYED', 'PAYMENT_PENDING')).toBe(false);
    expect(isValidTransition('DELIVERY_DELAYED', 'COMPLETED')).toBe(false);
    expect(isValidTransition('DELIVERY_DELAYED', 'CLOSED' as any)).toBe(false);
  });

  it('handles markOrderDelayed and subsequent delivery resolution flow', async () => {
    // 1. Mark Delayed
    const delayRes = await markOrderDelayed(sampleOrder.id, {
      reason: 'Transporter mechanical breakdown near checkpost',
      followUpDate: '2026-08-25'
    });
    expect(delayRes.success).toBe(true);

    // 2. Resolve via Order Received (Mark Delivered)
    const deliverRes = await markOrderDelivered(sampleOrder.id, {
      deliveryDate: '2026-08-25',
      receivedBy: 'Stores Security (Gate 2)',
      podUrl: 'https://storage.guruom.in/pod/delayed-resolved-pod.pdf'
    });
    expect(deliverRes.success).toBe(true);
    expect(deliverRes.orderStatus).toBe('DELIVERED');
  }, 15000);
});
