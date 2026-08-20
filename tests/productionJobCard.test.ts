import { describe, it, expect } from 'vitest';
import { 
  validateMaterialIssueForJobCard, 
  validateOperatorCertification, 
  deriveJobStatus, 
  generateJobCardFromRouteCard, 
  startOperationOnJobCard, 
  completeOperationOnJobCard, 
  raiseNcrOnJobCard, 
  resolveNcrOnJobCard, 
  computeProductionKpis, 
  PRODUCTION_ERROR_CODES, 
  RouteCardTemplateStep, 
  EmployeeCertification, 
  JobCardOperation, 
  NcrRecord 
} from '../src/utils/productionEngine';

describe('GuruOm Production & Job Card Shop-Floor Engine', () => {

  const sampleRouteSteps: RouteCardTemplateStep[] = [
    { id: 'rt-1', partCode: '00000001', partDescription: 'MAIN SPINDLE HOUSING 120MM', sequenceNo: 10, operationName: 'CNC Rough Turning & Facing', workCenter: 'CNC-LATHE-01', standardTimeMinutes: 45, inspectionRequired: false, requiredCertification: 'CNC Certified' },
    { id: 'rt-2', partCode: '00000001', partDescription: 'MAIN SPINDLE HOUSING 120MM', sequenceNo: 20, operationName: 'VMC 4-Axis Bore & Keyway Milling', workCenter: 'VMC-4AXIS-02', standardTimeMinutes: 60, inspectionRequired: true, requiredCertification: 'CNC Certified' },
    { id: 'rt-3', partCode: '00000001', partDescription: 'MAIN SPINDLE HOUSING 120MM', sequenceNo: 30, operationName: 'Final Dimensional Quality Inspection', workCenter: 'INSPECTION-BAY', standardTimeMinutes: 20, inspectionRequired: true, requiredCertification: 'Quality Inspector Level 2' }
  ];

  const sampleCertifications: EmployeeCertification[] = [
    { employeeName: 'Rajesh Sharma', certificationName: 'CNC Certified' },
    { employeeName: 'Sunil Jadhav', certificationName: 'Welder Certified' },
    { employeeName: 'Quality Inspector Rajesh', certificationName: 'Quality Inspector Level 2' }
  ];

  describe('Gate 1: Material Issue QC Acceptance Check', () => {
    it('allows job card release when material heat/lot has ACCEPTED QC status', () => {
      const check = validateMaterialIssueForJobCard('HEAT-9821-LOT-01', 'ACCEPTED');
      expect(check.valid).toBe(true);
    });

    it('blocks release with ERR_MATERIAL_NOT_ACCEPTED_QC when material is on QUALITY_HOLD', () => {
      const check = validateMaterialIssueForJobCard('HEAT-9821-LOT-01', 'QUALITY_HOLD');
      expect(check.valid).toBe(false);
      expect(check.errorCode).toBe(PRODUCTION_ERROR_CODES.ERR_MATERIAL_NOT_ACCEPTED_QC);
      expect(check.errorMessage).toContain('QUALITY_HOLD');
    });

    it('blocks release when material is in PENDING_INSPECTION status', () => {
      const check = validateMaterialIssueForJobCard('HEAT-9821-LOT-01', 'PENDING_INSPECTION');
      expect(check.valid).toBe(false);
      expect(check.errorCode).toBe(PRODUCTION_ERROR_CODES.ERR_MATERIAL_NOT_ACCEPTED_QC);
    });

    it('allows release when heat/lot number is empty or omitted', () => {
      const checkEmpty = validateMaterialIssueForJobCard('', 'ACCEPTED');
      expect(checkEmpty.valid).toBe(true);

      const checkUndefined = validateMaterialIssueForJobCard(undefined, 'ACCEPTED');
      expect(checkUndefined.valid).toBe(true);
    });
  });

  describe('Gate 2: Job Card Generation from Route Card with Locked Drawing Revision', () => {
    it('generates a full Job Card with locked revision and populated operation sequence', () => {
      const result = generateJobCardFromRouteCard({
        jobNo: 'JC/0001/26-27',
        orderPo: 'PO-2026-TATA-01',
        partCode: '00000001',
        partDescription: 'MAIN SPINDLE HOUSING 120MM',
        drawingRevision: 'REV-B', // LOCKED
        targetQty: 100,
        materialIssuedLot: 'HEAT-9821-LOT-01',
        materialQcStatus: 'ACCEPTED',
        targetDate: '2026-08-25',
        routeSteps: sampleRouteSteps
      });

      expect(result.error).toBeUndefined();
      expect(result.jobCard).toBeDefined();
      const jc = result.jobCard!;

      expect(jc.jobNo).toBe('JC/0001/26-27');
      expect(jc.drawingRevision).toBe('REV-B');
      expect(jc.jobStatus).toBe('NOT_STARTED');
      expect(jc.currentStepNo).toBe(10);
      expect(jc.operations.length).toBe(3);
      expect(jc.operations[0].operationName).toBe('CNC Rough Turning & Facing');
      expect(jc.operations[0].requiredCertification).toBe('CNC Certified');
    });
  });

  describe('Gate 3: Operator Skill & Certification Verification (Open to All)', () => {
    it('permits any operator to start operation without certification restrictions', () => {
      const check1 = validateOperatorCertification('Rajesh Sharma', 'CNC Certified', sampleCertifications);
      expect(check1.valid).toBe(true);

      const check2 = validateOperatorCertification('Sachin G. (Lead Machinist)', 'CNC Certified', sampleCertifications);
      expect(check2.valid).toBe(true);

      const check3 = validateOperatorCertification('Helper Mohan', 'None', sampleCertifications);
      expect(check3.valid).toBe(true);
    });
  });

  describe('Gate 4 & 5: Operation Execution, Time Logging & Auto-Derived Status', () => {
    it('transitions Job Card to IN_PROGRESS when first operation starts', () => {
      const jcGen = generateJobCardFromRouteCard({
        jobNo: 'JC/0002/26-27',
        orderPo: 'PO-2026-002',
        partCode: '00000001',
        partDescription: 'MAIN SPINDLE HOUSING 120MM',
        drawingRevision: 'REV-B',
        targetQty: 50,
        materialIssuedLot: 'HEAT-9821-LOT-01',
        materialQcStatus: 'ACCEPTED',
        targetDate: '2026-08-25',
        routeSteps: sampleRouteSteps
      });

      const startRes = startOperationOnJobCard(
        jcGen.jobCard!,
        10,
        'CNC-LATHE-01',
        'Rajesh Sharma',
        sampleCertifications
      );

      expect(startRes.error).toBeUndefined();
      expect(startRes.jobCard.jobStatus).toBe('IN_PROGRESS');
      expect(startRes.jobCard.operations[0].opStatus).toBe('IN_PROGRESS');
      expect(startRes.jobCard.operations[0].machineId).toBe('CNC-LATHE-01');
    });

    it('completes operation, logs standard vs actual time, and advances current step', () => {
      const jcGen = generateJobCardFromRouteCard({
        jobNo: 'JC/0002/26-27',
        orderPo: 'PO-2026-002',
        partCode: '00000001',
        partDescription: 'MAIN SPINDLE HOUSING 120MM',
        drawingRevision: 'REV-B',
        targetQty: 50,
        materialIssuedLot: 'HEAT-9821-LOT-01',
        materialQcStatus: 'ACCEPTED',
        targetDate: '2026-08-25',
        routeSteps: sampleRouteSteps
      });

      const started = startOperationOnJobCard(jcGen.jobCard!, 10, 'CNC-LATHE-01', 'Rajesh Sharma', sampleCertifications);
      const completed = completeOperationOnJobCard(started.jobCard, 10, 50, 0, 40, 'Clean batch');

      expect(completed.jobCard.operations[0].opStatus).toBe('COMPLETED');
      expect(completed.jobCard.operations[0].actualTimeMinutes).toBe(40);
      expect(completed.jobCard.currentStepNo).toBe(20);
      expect(completed.jobCard.currentOperation).toBe('VMC 4-Axis Bore & Keyway Milling');
    });

    it('triggers scrap yard inventory movement when rejection occurs at an operation', () => {
      const jcGen = generateJobCardFromRouteCard({
        jobNo: 'JC/0003/26-27',
        orderPo: 'PO-2026-003',
        partCode: '00000001',
        partDescription: 'MAIN SPINDLE HOUSING 120MM',
        drawingRevision: 'REV-B',
        targetQty: 50,
        materialIssuedLot: 'HEAT-9821-LOT-01',
        materialQcStatus: 'ACCEPTED',
        targetDate: '2026-08-25',
        routeSteps: sampleRouteSteps
      });

      const started = startOperationOnJobCard(jcGen.jobCard!, 10, 'CNC-LATHE-01', 'Rajesh Sharma', sampleCertifications);
      const completed = completeOperationOnJobCard(started.jobCard, 10, 48, 2, 45, '2 parts undersized bore');

      expect(completed.scrapMovementTriggered).toBeDefined();
      expect(completed.scrapMovementTriggered!.qty).toBe(2);
      expect(completed.scrapMovementTriggered!.location).toBe('Scrap & Rejection Yard');
    });
  });

  describe('Gate 6 & 7: NCR Workflow & Hard QC Hold System Block', () => {
    it('raising an NCR immediately locks Job Card in QC_HOLD and sets ncrReference', () => {
      const jcGen = generateJobCardFromRouteCard({
        jobNo: 'JC/0004/26-27',
        orderPo: 'PO-2026-004',
        partCode: '00000001',
        partDescription: 'MAIN SPINDLE HOUSING 120MM',
        drawingRevision: 'REV-B',
        targetQty: 50,
        materialIssuedLot: 'HEAT-9821-LOT-01',
        materialQcStatus: 'ACCEPTED',
        targetDate: '2026-08-25',
        routeSteps: sampleRouteSteps
      });

      const ncr: NcrRecord = {
        id: 'ncr-1',
        ncrNumber: 'NCR-2026-081',
        jobCardId: 'jc-4',
        jobNo: 'JC/0004/26-27',
        sequenceNo: 10,
        operationName: 'CNC Rough Turning & Facing',
        orderPo: 'PO-2026-004',
        defectCategory: 'DIMENSIONAL',
        defectDescription: 'Shaft runout exceeded tolerance by 0.05mm',
        rejectedQty: 1,
        status: 'OPEN',
        raisedBy: 'Quality Inspector Rajesh',
        raisedAt: '2026-08-15'
      };

      const lockedJobCard = raiseNcrOnJobCard(jcGen.jobCard!, ncr);
      expect(lockedJobCard.jobStatus).toBe('QC_HOLD');
      expect(lockedJobCard.hasOpenNcr).toBe(true);
      expect(lockedJobCard.ncrReference).toBe('NCR-2026-081');

      // Attempting to start next operation MUST be hard blocked with ERR_JOB_CARD_ON_QC_HOLD
      const nextOpAttempt = startOperationOnJobCard(
        lockedJobCard, 
        20, 
        'VMC-4AXIS-02', 
        'Rajesh Sharma', 
        sampleCertifications
      );

      expect(nextOpAttempt.error).toBeDefined();
      expect(nextOpAttempt.error!.code).toBe(PRODUCTION_ERROR_CODES.ERR_JOB_CARD_ON_QC_HOLD);
      expect(nextOpAttempt.error!.message).toContain('locked on QC Hold due to open Non-Conformance Report');
    });

    it('resolving NCR disposition clears the QC Hold and logs disposition audit', () => {
      const jcGen = generateJobCardFromRouteCard({
        jobNo: 'JC/0005/26-27',
        orderPo: 'PO-2026-005',
        partCode: '00000001',
        partDescription: 'MAIN SPINDLE HOUSING 120MM',
        drawingRevision: 'REV-B',
        targetQty: 50,
        materialIssuedLot: 'HEAT-9821-LOT-01',
        materialQcStatus: 'ACCEPTED',
        targetDate: '2026-08-25',
        routeSteps: sampleRouteSteps
      });

      const ncr: NcrRecord = {
        id: 'ncr-2',
        ncrNumber: 'NCR-2026-092',
        jobCardId: 'jc-5',
        jobNo: 'JC/0005/26-27',
        sequenceNo: 10,
        operationName: 'CNC Rough Turning & Facing',
        orderPo: 'PO-2026-005',
        defectCategory: 'MACHINING_CHATTER',
        defectDescription: 'Surface chatter marks on face',
        rejectedQty: 1,
        status: 'OPEN',
        raisedBy: 'Quality Inspector Rajesh',
        raisedAt: '2026-08-15'
      };

      const lockedJobCard = raiseNcrOnJobCard(jcGen.jobCard!, ncr);
      expect(lockedJobCard.jobStatus).toBe('QC_HOLD');

      const resolved = resolveNcrOnJobCard(
        lockedJobCard,
        'NCR-2026-092',
        'REWORK',
        'Quality Head Sharma',
        'Approved skim cut rework to clean face'
      );

      expect(resolved.jobCard.hasOpenNcr).toBe(false);
      expect(resolved.jobCard.ncrReference).toBeUndefined();
      expect(resolved.jobCard.remarks).toContain('NCR NCR-2026-092 resolved with disposition REWORK');
    });
  });

  describe('Machine Utilization & Production Telemetry Telemetry', () => {
    it('computes Machine Utilization % and schedule variance correctly', () => {
      const ops: JobCardOperation[] = [
        { id: '1', jobNo: 'JC-1', sequenceNo: 10, operationName: 'Turning', standardTimeMinutes: 60, actualTimeMinutes: 50, qtyProcessed: 10, qtyRejected: 0, requiredCertification: 'None', isCertificationVerified: true, opStatus: 'COMPLETED', inspectionRequired: false, inspectionPassed: true },
        { id: '2', jobNo: 'JC-1', sequenceNo: 20, operationName: 'Milling', standardTimeMinutes: 40, actualTimeMinutes: 50, qtyProcessed: 10, qtyRejected: 0, requiredCertification: 'None', isCertificationVerified: true, opStatus: 'COMPLETED', inspectionRequired: false, inspectionPassed: true }
      ];

      const kpis = computeProductionKpis(ops);
      expect(kpis.totalStandardMinutes).toBe(100);
      expect(kpis.totalActualMinutes).toBe(100);
      expect(kpis.machineUtilizationPercentage).toBe(100);
      expect(kpis.scheduleVarianceMinutes).toBe(0);
      expect(kpis.isBehindSchedule).toBe(false);
    });
  });

});
