import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationsService } from '../backend/src/modules/notifications/notifications.service';
import { ordersService } from '../backend/src/modules/orders/orders.service';
import { productionService } from '../backend/src/modules/production/production.service';
import { qcService } from '../backend/src/modules/qc/qc.service';
import { dispatchService } from '../backend/src/modules/dispatch/dispatch.service';
import { invoicesService } from '../backend/src/modules/invoices/invoices.service';

describe('Real-Time Broadcast Transitions Verification', () => {
  let broadcastSpy: any;

  beforeEach(() => {
    broadcastSpy = vi.spyOn(notificationsService, 'broadcastEvent');
  });

  it('broadcasts real-time events on updateOrderStageDirectly', async () => {
    const testPo = `PO-TEST-BROADCAST-${Date.now()}`;
    await ordersService.updateOrderStageDirectly(testPo, 'CONFIRMED', 2);

    expect(broadcastSpy).toHaveBeenCalledWith(
      'order_transitioned',
      expect.objectContaining({
        orderId: testPo,
        poNo: testPo,
        status: 'CONFIRMED',
        progressStep: 2
      })
    );

    expect(broadcastSpy).toHaveBeenCalledWith(
      'order_updated',
      expect.objectContaining({
        id: testPo,
        poNo: testPo,
        status: 'CONFIRMED',
        progressStep: 2
      })
    );
  });

  it('broadcasts real-time events on Job Card release (IN_PRODUCTION transition)', async () => {
    const testPo = `PO-TEST-JC-${Date.now()}`;
    const testJobNo = `JC-TEST-${Date.now()}`;

    await productionService.createJobCard({
      id: `jc-${Date.now()}`,
      jobNo: testJobNo,
      orderPo: testPo,
      partCode: 'PART-FLG-01',
      partDescription: 'Precision Flange',
      orderStatus: 'IN_PRODUCTION',
      targetQty: 50,
      qty: 50,
      drawingRevision: 'REV-A',
      materialIssuedLot: 'HEAT-LOT-01',
      machine: 'VMC-01',
      targetDate: '2026-08-30',
      status: 'IN_PRODUCTION'
    });

    expect(broadcastSpy).toHaveBeenCalledWith(
      'order_transitioned',
      expect.objectContaining({
        orderId: testPo,
        poNo: testPo,
        status: 'IN_PRODUCTION',
        progressStep: 5
      })
    );

    expect(broadcastSpy).toHaveBeenCalledWith(
      'order_updated',
      expect.objectContaining({
        orderId: testPo,
        poNo: testPo,
        status: 'IN_PRODUCTION',
        progressStep: 5
      })
    );

    expect(broadcastSpy).toHaveBeenCalledWith(
      'job_card_created',
      expect.objectContaining({
        jobNo: testJobNo,
        orderPo: testPo
      })
    );
  });

  it('broadcasts real-time events on QC Inspection Pass', async () => {
    const testPo = `PO-TEST-QC-${Date.now()}`;
    const testJobNo = `JC-QC-${Date.now()}`;
    const testQcId = `qc-${Date.now()}`;

    await qcService.createQCInspection({
      id: testQcId,
      jobNo: testJobNo,
      orderPo: testPo,
      partCode: 'PART-FLG-01',
      partDescription: 'Precision Flange',
      qty: 50,
      jobStatus: 'IN_INSPECTION',
      qcStatus: 'PENDING'
    });

    broadcastSpy.mockClear();

    await qcService.reviewQCInspection(testQcId, {
      qcStatus: 'PASS',
      inspectorNotes: 'Dimensional check passed 100%',
      defectCategory: 'None'
    });

    expect(broadcastSpy).toHaveBeenCalledWith(
      'order_transitioned',
      expect.objectContaining({
        orderId: testPo,
        poNo: testPo,
        status: 'QC_INSPECTION',
        progressStep: 6
      })
    );

    expect(broadcastSpy).toHaveBeenCalledWith(
      'order_updated',
      expect.objectContaining({
        orderId: testPo,
        poNo: testPo,
        status: 'QC_INSPECTION',
        progressStep: 6
      })
    );

    expect(broadcastSpy).toHaveBeenCalledWith(
      'pdi_created',
      expect.objectContaining({
        jobNo: testJobNo,
        orderPo: testPo
      })
    );
  });

  it('broadcasts real-time events on PDI Inspection Pass (READY_TO_DISPATCH transition)', async () => {
    const testPo = `PO-TEST-PDI-${Date.now()}`;
    const testJobNo = `JC-PDI-${Date.now()}`;
    const testPdiId = `pdi-${Date.now()}`;

    const qcId = `qc-pdi-${Date.now()}`;
    // Create a dummy QC and review it to produce a PDI queue item
    await qcService.createQCInspection({
      id: qcId,
      jobNo: testJobNo,
      orderPo: testPo,
      partCode: 'PART-FLG-01',
      partDescription: 'Precision Flange',
      qty: 50,
      jobStatus: 'IN_INSPECTION',
      qcStatus: 'PENDING'
    });

    await qcService.reviewQCInspection(qcId, {
      qcStatus: 'PASS'
    });

    const pdiQueue = await qcService.getPDIQueue();
    const pdiItem = pdiQueue.find(p => p.orderPo === testPo);
    const targetPdiId = pdiItem?.id || testPdiId;

    broadcastSpy.mockClear();

    await qcService.passPDIInspection(targetPdiId);

    expect(broadcastSpy).toHaveBeenCalledWith(
      'order_transitioned',
      expect.objectContaining({
        orderId: testPo,
        poNo: testPo,
        status: 'READY_TO_DISPATCH',
        progressStep: 7
      })
    );

    expect(broadcastSpy).toHaveBeenCalledWith(
      'order_updated',
      expect.objectContaining({
        orderId: testPo,
        poNo: testPo,
        status: 'READY_TO_DISPATCH',
        progressStep: 7
      })
    );

    expect(broadcastSpy).toHaveBeenCalledWith(
      'pdi_updated',
      expect.objectContaining({
        pdiStatus: 'PASS',
        orderPo: testPo
      })
    );
  }, 20000);

  it('broadcasts READY_FOR_QC on Job Card completion via updateJobStatus', async () => {
    const testPo = `PO-RT-JCCOMP-${Date.now()}`;
    const testJobNo = `JC-COMP-${Date.now()}`;

    await productionService.createJobCard({
      id: `jc-${Date.now()}`,
      jobNo: testJobNo,
      orderPo: testPo,
      partCode: 'PART-FLG-01',
      partDescription: 'Precision Flange',
      orderStatus: 'IN_PRODUCTION',
      targetQty: 50,
      qty: 50,
      drawingRevision: 'REV-A',
      materialIssuedLot: 'HEAT-LOT-01',
      machine: 'VMC-01',
      targetDate: '2026-08-30',
      status: 'IN_PRODUCTION'
    });

    broadcastSpy.mockClear();

    await productionService.updateJobStatus(testJobNo, { status: 'COMPLETED' });

    expect(broadcastSpy).toHaveBeenCalledWith(
      'job_card_updated',
      expect.objectContaining({ jobNo: testJobNo, status: 'COMPLETED', jobStatus: 'COMPLETED' })
    );

    // Job completion must advance the parent order through the shared broadcast path
    expect(broadcastSpy).toHaveBeenCalledWith(
      'order_transitioned',
      expect.objectContaining({ orderId: testPo, poNo: testPo, status: 'READY_FOR_QC', progressStep: 6 })
    );
    expect(broadcastSpy).toHaveBeenCalledWith(
      'order_updated',
      expect.objectContaining({ poNo: testPo, status: 'READY_FOR_QC', progressStep: 6 })
    );
  }, 20000);

  it('does NOT advance the order until EVERY job card under it is complete (multi-job guard)', async () => {
    const testPo = `PO-RT-MULTIJC-${Date.now()}`;
    const jobA = `JC-MULTI-A-${Date.now()}`;
    const jobB = `JC-MULTI-B-${Date.now()}`;
    const ts = Date.now();

    await productionService.createJobCard({
      id: `jc-a-${ts}`,
      jobNo: jobA,
      orderPo: testPo,
      partCode: 'PART-A',
      partDescription: 'Part A',
      orderStatus: 'IN_PRODUCTION',
      targetQty: 25,
      qty: 25,
      drawingRevision: 'REV-A',
      targetDate: '2026-08-30',
      status: 'IN_PRODUCTION'
    });
    await productionService.createJobCard({
      id: `jc-b-${ts}`,
      jobNo: jobB,
      orderPo: testPo,
      partCode: 'PART-B',
      partDescription: 'Part B',
      orderStatus: 'IN_PRODUCTION',
      targetQty: 25,
      qty: 25,
      drawingRevision: 'REV-A',
      targetDate: '2026-08-30',
      status: 'IN_PRODUCTION'
    });

    broadcastSpy.mockClear();

    // Complete only the first job -> order must NOT yet advance to READY_FOR_QC
    await productionService.updateJobStatus(jobA, { status: 'COMPLETED' });
    const callsAfterFirst = broadcastSpy.mock.calls.map(c => c[0]);
    expect(callsAfterFirst).not.toContain('order_transitioned');

    // Complete the final job -> order advances to READY_FOR_QC
    await productionService.updateJobStatus(jobB, { status: 'COMPLETED' });
    expect(broadcastSpy).toHaveBeenCalledWith(
      'order_transitioned',
      expect.objectContaining({ orderId: testPo, poNo: testPo, status: 'READY_FOR_QC', progressStep: 6 })
    );
    expect(broadcastSpy).toHaveBeenCalledWith(
      'order_updated',
      expect.objectContaining({ poNo: testPo, status: 'READY_FOR_QC', progressStep: 6 })
    );
  }, 20000);

  it('records a production log and broadcasts READY_FOR_QC when cumulative qty reaches the target', async () => {
    const testPo = `PO-RT-PLOG-${Date.now()}`;
    const testJobNo = `JC-PLOG-${Date.now()}`;

    await productionService.createJobCard({
      id: `jc-plog-${Date.now()}`,
      jobNo: testJobNo,
      orderPo: testPo,
      partCode: 'PART-FLG-01',
      partDescription: 'Precision Flange',
      orderStatus: 'IN_PRODUCTION',
      targetQty: 50,
      qty: 50,
      drawingRevision: 'REV-A',
      machine: 'VMC-01',
      targetDate: '2026-08-30',
      status: 'IN_PRODUCTION'
    });

    broadcastSpy.mockClear();

    await productionService.recordProductionLog({
      jobNo: testJobNo,
      itemCode: 'PART-FLG-01',
      description: 'Precision Flange',
      stepNo: 1,
      operationName: 'CNC / VMC Milling Operation',
      qtyDone: 50,
      autoTriggerQC: true
    });

    expect(broadcastSpy).toHaveBeenCalledWith('production_log_created', expect.objectContaining({ jobNo: testJobNo }));
    expect(broadcastSpy).toHaveBeenCalledWith(
      'job_card_updated',
      expect.objectContaining({ jobNo: testJobNo, status: 'COMPLETED', jobStatus: 'COMPLETED' })
    );
    expect(broadcastSpy).toHaveBeenCalledWith(
      'order_transitioned',
      expect.objectContaining({ orderId: testPo, poNo: testPo, status: 'READY_FOR_QC', progressStep: 6 })
    );
    expect(broadcastSpy).toHaveBeenCalledWith(
      'order_updated',
      expect.objectContaining({ poNo: testPo, status: 'READY_FOR_QC', progressStep: 6 })
    );
  }, 20000);

  it('broadcasts real-time events on Dispatch delivery (Stage 10a DELIVERED transition with POD)', async () => {
    const testPo = `PO-RT-DELIVERY-${Date.now()}`;
    const challanNo = `CHL-RT-${Date.now()}`;
    const testJobNo = `JC-DELIV-${Date.now()}`;
    const qcId = `qc-deliv-${Date.now()}`;

    // 1. Seed QC and pass PDI inspection
    await qcService.createQCInspection({
      id: qcId,
      jobNo: testJobNo,
      orderPo: testPo,
      partCode: 'PART-01',
      partDescription: 'Part 01',
      qty: 10,
      jobStatus: 'IN_INSPECTION',
      qcStatus: 'PENDING'
    });
    await qcService.reviewQCInspection(qcId, { qcStatus: 'PASS' });
    const pdiQueue = await qcService.getPDIQueue();
    const pdiItem = pdiQueue.find(p => p.orderPo === testPo);
    if (pdiItem) {
      await qcService.passPDIInspection(pdiItem.id);
    }

    // 2. Advance to DISPATCHED
    await ordersService.updateOrderStageDirectly(testPo, 'DISPATCHED', 8);

    await dispatchService.createDispatch({
      challanNo,
      orderPo: testPo,
      date: new Date().toISOString().split('T')[0],
      vehicleNo: 'MH 12 AB 4589',
      transporter: 'VRL Logistics Ltd',
      status: 'DISPATCHED',
      lines: [{ itemCode: 'PART-01', qty: 10 }]
    });

    broadcastSpy.mockClear();

    await dispatchService.deliverChallan(challanNo);

    expect(broadcastSpy).toHaveBeenCalledWith(
      'dispatch_updated',
      expect.objectContaining({ challanNo, status: 'DELIVERED' })
    );
    expect(broadcastSpy).toHaveBeenCalledWith(
      'order_transitioned',
      expect.objectContaining({ orderId: testPo, poNo: testPo, status: 'DELIVERED', progressStep: 9 })
    );
    expect(broadcastSpy).toHaveBeenCalledWith(
      'order_updated',
      expect.objectContaining({ poNo: testPo, status: 'DELIVERED', progressStep: 9 })
    );
  }, 20000);

  it('broadcasts real-time events on partial and full Invoice payment (Stage 11 PAYMENT)', async () => {
    const testPo = `PO-RT-PAY-${Date.now()}`;
    const invoiceNo = `INV-RT-${Date.now()}`;

    await ordersService.updateOrderStageDirectly(testPo, 'DISPATCHED', 8);

    const inv = await invoicesService.createInvoice({
      invoiceNo,
      orderPo: testPo,
      customerName: 'AeroTech Dynamics Ltd',
      customerGstin: '27AABCU9603R1ZM',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      placeOfSupply: '27-Maharashtra',
      lines: [{ itemCode: 'PART-01', description: 'Part 01', hsnCode: '8481', qty: 10, rate: 10000, gstRate: 18 }]
    }, 'Finance Manager');

    const actualInvoiceNo = inv.invoiceNo;
    const totalGross = inv.totalAmount;

    broadcastSpy.mockClear();

    // 1. Record Partial Payment (40% of total)
    const partialAmount = Math.round(totalGross * 0.4);
    await invoicesService.recordPayment(actualInvoiceNo, {
      paymentAmount: partialAmount,
      paymentMode: 'NEFT',
      referenceNo: 'UTR-PARTIAL-001'
    });

    expect(broadcastSpy).toHaveBeenCalledWith(
      'invoice_updated',
      expect.objectContaining({ invoiceNo: actualInvoiceNo, status: 'PARTIALLY_PAID' })
    );
    expect(broadcastSpy).toHaveBeenCalledWith(
      'payment_recorded',
      expect.objectContaining({ invoiceNo: actualInvoiceNo, orderPo: testPo, amount: partialAmount, status: 'PARTIALLY_PAID' })
    );
    expect(broadcastSpy).toHaveBeenCalledWith(
      'order_updated',
      expect.objectContaining({ poNo: testPo, paidAmount: partialAmount, paymentStatus: 'PARTIAL', isFullyPaid: false })
    );

    broadcastSpy.mockClear();

    // 2. Record Remaining Balance Payment -> Full Settlement
    const remainingBalance = totalGross - partialAmount;
    await invoicesService.recordPayment(actualInvoiceNo, {
      paymentAmount: remainingBalance,
      paymentMode: 'RTGS',
      referenceNo: 'UTR-FINAL-002'
    });

    expect(broadcastSpy).toHaveBeenCalledWith(
      'invoice_updated',
      expect.objectContaining({ invoiceNo: actualInvoiceNo, status: 'PAID', balanceAmount: 0 })
    );
    expect(broadcastSpy).toHaveBeenCalledWith(
      'payment_recorded',
      expect.objectContaining({ invoiceNo: actualInvoiceNo, orderPo: testPo, amount: remainingBalance, status: 'PAID' })
    );
    expect(broadcastSpy).toHaveBeenCalledWith(
      'order_updated',
      expect.objectContaining({ poNo: testPo, paidAmount: totalGross, paymentStatus: 'PAID', isFullyPaid: true })
    );
  }, 20000);

  it('enforces hard preconditions on Order Closure (Stage 11a CLOSED transition)', async () => {
    const testPo = `PO-RT-CLOSE-${Date.now()}`;

    // Create an order in DELIVERED state but with outstanding unpaid balance
    await ordersService.createOrder({
      id: testPo,
      poNo: testPo,
      customerName: 'AeroTech Dynamics Ltd',
      poDate: new Date().toISOString().split('T')[0],
      deliveryDate: '2026-09-30',
      drawingRevision: 'REV-A',
      grossAmount: 50000,
      taxCategory: 'GST 18%',
      status: 'DELIVERED',
      lines: [{
        itemCode: 'PART-01',
        itemDescription: 'Flange',
        orderQty: 10,
        rate: 5000,
        unit: 'NOS',
        dispatchedQty: 10,
        pendingQty: 0
      }]
    });

    // 1. Attempt Order Closure while unpaid -> Must be rejected server-side
    await expect(
      ordersService.transitionOrderStage(testPo, 'CLOSED', {
        outstandingAmount: 50000,
        paymentStatus: 'UNPAID'
      })
    ).rejects.toThrow();

    // 2. Once Delivered AND Fully Paid -> Closure succeeds and broadcasts
    broadcastSpy.mockClear();

    const result = await ordersService.transitionOrderStage(testPo, 'CLOSED', {
      outstandingAmount: 0,
      paymentStatus: 'PAID',
      podDocumentUrl: 'POD-SIGNED-FINAL.pdf'
    });

    expect(result.status).toBe('CLOSED');
    expect(broadcastSpy).toHaveBeenCalledWith(
      'order_transitioned',
      expect.objectContaining({ orderId: testPo, poNo: testPo, status: 'CLOSED', progressStep: 11 })
    );
    expect(broadcastSpy).toHaveBeenCalledWith(
      'order_updated',
      expect.objectContaining({ id: testPo, poNo: testPo, status: 'CLOSED', progressStep: 11 })
    );
  }, 20000);
});
