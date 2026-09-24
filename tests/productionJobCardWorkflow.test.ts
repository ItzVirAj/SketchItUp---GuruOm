import { describe, it, expect } from 'vitest';
import { 
  generateJobCardFromRouteCard, 
  startOperationOnJobCard, 
  completeOperationOnJobCard,
  deriveJobStatus,
  RouteCardTemplateStep,
  EmployeeCertification
} from '../src/utils/productionEngine';
import { QcService } from '../backend/src/modules/qc/qc.service';

describe('End-to-End Production Workflow: Job Card -> Route Card -> Operations -> QC -> Order Progression', () => {

  const routeCardSteps: RouteCardTemplateStep[] = [
    { 
      id: 'rc-step-10', 
      partCode: 'ITEM-0022', 
      partDescription: 'Machine Base Frame Assembly', 
      sequenceNo: 10, 
      operationName: 'Flame Cutting & Pre-machining', 
      workCenter: 'CUT-01', 
      standardTimeMinutes: 30, 
      inspectionRequired: false, 
      requiredCertification: 'None' 
    },
    { 
      id: 'rc-step-20', 
      partCode: 'ITEM-0022', 
      partDescription: 'Machine Base Frame Assembly', 
      sequenceNo: 20, 
      operationName: 'Precision CNC Milling', 
      workCenter: 'VMC-4AXIS-01', 
      standardTimeMinutes: 45, 
      inspectionRequired: false, 
      requiredCertification: 'CNC Certified' 
    },
    { 
      id: 'rc-step-30', 
      partCode: 'ITEM-0022', 
      partDescription: 'Machine Base Frame Assembly', 
      sequenceNo: 30, 
      operationName: 'Final Dimensional Inspection', 
      workCenter: 'CMM-01', 
      standardTimeMinutes: 15, 
      inspectionRequired: true, 
      requiredCertification: 'None' 
    }
  ];

  const certifiedStaff: EmployeeCertification[] = [
    { employeeName: 'Sachin Gharbude', certificationName: 'CNC Certified' },
    { employeeName: 'Pramod Parshi', certificationName: 'Quality Inspector' }
  ];

  it('executes full sequential multi-operation production flow with automatic QC handover', async () => {
    // 1. Release Job Card from existing Route Card template
    const genResult = generateJobCardFromRouteCard({
      jobNo: 'JC/0099/26-27',
      orderPo: 'PO-2026-TEST-EXEC',
      partCode: 'ITEM-0022',
      partDescription: 'Machine Base Frame Assembly',
      drawingRevision: 'REV-A',
      targetQty: 50,
      materialIssuedLot: 'HEAT-LOT-4410',
      materialQcStatus: 'ACCEPTED',
      targetDate: '2026-08-30',
      routeSteps: routeCardSteps
    });

    expect(genResult.error).toBeUndefined();
    let jobCard = genResult.jobCard!;

    expect(jobCard.jobStatus).toBe('NOT_STARTED');
    expect(jobCard.operations.length).toBe(3);
    expect(jobCard.operations[0].sequenceNo).toBe(10);
    expect(jobCard.operations[0].opStatus).toBe('PENDING');

    // 2. Start Op 10 (Flame Cutting)
    const op10Start = startOperationOnJobCard(jobCard, 10, 'CUT-01', 'Operator Rahul', certifiedStaff);
    expect(op10Start.error).toBeUndefined();
    jobCard = op10Start.jobCard!;
    expect(jobCard.jobStatus).toBe('IN_PROGRESS');
    expect(jobCard.operations[0].opStatus).toBe('IN_PROGRESS');
    expect(jobCard.operations[0].actualStartTime).toBeDefined();

    // 3. Complete Op 10
    const op10Comp = completeOperationOnJobCard(jobCard, 10, 50, 0, 28, 'Flame cutting within tolerances');
    expect(op10Comp.error).toBeUndefined();
    jobCard = op10Comp.jobCard!;
    expect(jobCard.operations[0].opStatus).toBe('COMPLETED');
    expect(jobCard.operations[0].qtyProcessed).toBe(50);
    expect(jobCard.operations[0].actualTimeMinutes).toBe(28);
    // Op 20 should still be PENDING (unlocked for next step)
    expect(jobCard.operations[1].opStatus).toBe('PENDING');

    // 4. Start Op 20 (Precision CNC Milling)
    const op20Start = startOperationOnJobCard(jobCard, 20, 'VMC-4AXIS-01', 'Sachin Gharbude', certifiedStaff);
    expect(op20Start.error).toBeUndefined();
    jobCard = op20Start.jobCard!;
    expect(jobCard.operations[1].opStatus).toBe('IN_PROGRESS');

    // 5. Complete Op 20 (with 1 rejection scrap)
    const op20Comp = completeOperationOnJobCard(jobCard, 20, 49, 1, 46, 'Bore tolerance achieved; 1 unit chatter scrap');
    expect(op20Comp.error).toBeUndefined();
    jobCard = op20Comp.jobCard!;
    expect(jobCard.operations[1].opStatus).toBe('COMPLETED');
    expect(jobCard.operations[1].qtyRejected).toBe(1);
    expect(op20Comp.scrapMovementTriggered).toBeDefined();
    expect(op20Comp.scrapMovementTriggered?.qty).toBe(1);

    // 6. Start & Complete Final Op 30 (Final Dimensional Inspection)
    const op30Start = startOperationOnJobCard(jobCard, 30, 'CMM-01', 'Pramod Parshi', certifiedStaff);
    jobCard = op30Start.jobCard!;
    expect(jobCard.operations[2].opStatus).toBe('IN_PROGRESS');

    const op30Comp = completeOperationOnJobCard(jobCard, 30, 49, 0, 14, 'All CMM coordinates in tolerance');
    jobCard = op30Comp.jobCard!;
    expect(jobCard.operations[2].opStatus).toBe('COMPLETED');

    // 7. Verify all operations completed -> Job Card status is COMPLETED
    const finalJobStatus = deriveJobStatus(jobCard.operations, jobCard.hasOpenNcr);
    expect(finalJobStatus).toBe('COMPLETED');

    // 8. Verify QC queue creation logic
    const qcService = new QcService();
    const qcInspection = await qcService.createQCInspection({
      jobNo: jobCard.jobNo,
      orderPo: jobCard.orderPo,
      partCode: jobCard.partCode,
      partDescription: jobCard.partDescription,
      qty: 49,
      jobStatus: 'COMPLETED',
      qcStatus: 'PENDING'
    });

    expect(qcInspection).toBeDefined();
    expect(qcInspection.qcStatus).toBe('PENDING');
    expect(qcInspection.jobNo).toBe('JC/0099/26-27');

    // 9. Verify QC Review PASS
    const qcReview = await qcService.reviewQCInspection(qcInspection.id, {
      qcStatus: 'PASS',
      inspectorNotes: 'Quality verified - zero defects found'
    });

    expect(qcReview.qcStatus).toBe('PASS');
  });
});
