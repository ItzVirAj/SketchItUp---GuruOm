import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationsService } from '../backend/src/modules/notifications/notifications.service';
import { ordersService } from '../backend/src/modules/orders/orders.service';
import { productionService } from '../backend/src/modules/production/production.service';
import { qcService } from '../backend/src/modules/qc/qc.service';

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
  });
});
