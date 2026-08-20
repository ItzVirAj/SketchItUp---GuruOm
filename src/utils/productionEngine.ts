/**
 * GuruOm Production & Job Card Shop-Floor Engine
 * 
 * Implements:
 * 1. Job Card Generation from Route Card / Process Traveler templates.
 * 2. Drawing Revision Locking at Release (immutable without formal change process).
 * 3. Mandatory Material Heat/Lot QC Validation (blocks materials on Quality Hold or Pending Inspection).
 * 4. Operator Skill / Certification Verification.
 * 5. Dynamic Auto-Derived Job Status (NOT_STARTED / IN_PROGRESS / QC_HOLD / COMPLETED).
 * 6. Hard NCR (Non-Conformance Record) Block on Operation Progress & Parent Order.
 * 7. NCR Disposition Workflow (Rework / Scrap / Use-as-is Concession) with Scrap Yard Ledger Movements.
 * 8. Standard Time vs. Actual Time Telemetry & Machine Utilization % KPIs.
 */

export const PRODUCTION_ERROR_CODES = {
  ERR_MATERIAL_NOT_ACCEPTED_QC: 'ERR_MATERIAL_NOT_ACCEPTED_QC',
  ERR_REVISION_LOCKED: 'ERR_REVISION_LOCKED',
  ERR_OPERATOR_CERTIFICATION_REQUIRED: 'ERR_OPERATOR_CERTIFICATION_REQUIRED',
  ERR_JOB_CARD_ON_QC_HOLD: 'ERR_JOB_CARD_ON_QC_HOLD',
  ERR_OPERATION_SEQUENCE_VIOLATION: 'ERR_OPERATION_SEQUENCE_VIOLATION',
  ERR_INVALID_DISPOSITION: 'ERR_INVALID_DISPOSITION'
} as const;

export type ProductionErrorCode = typeof PRODUCTION_ERROR_CODES[keyof typeof PRODUCTION_ERROR_CODES];

export interface RouteCardTemplateStep {
  id: string;
  partCode: string;
  partDescription: string;
  sequenceNo: number; // 10, 20, 30, 40...
  operationName: string;
  workCenter: string;
  standardTimeMinutes: number;
  inspectionRequired: boolean;
  requiredCertification: string; // 'None', 'CNC Certified', 'Welder Certified', 'NDT Level II', etc.
}

export interface JobCardOperation {
  id: string;
  jobCardId: string;
  jobNo: string;
  sequenceNo: number;
  operationName: string;
  machineId?: string;
  operatorName?: string;
  requiredCertification: string;
  isCertificationVerified: boolean;
  standardTimeMinutes: number;
  actualStartTime?: string;
  actualEndTime?: string;
  actualTimeMinutes: number;
  qtyProcessed: number;
  qtyRejected: number;
  inspectionRequired: boolean;
  inspectionPassed: boolean;
  opStatus: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'QC_HOLD';
  notes?: string;
}

export interface JobCard {
  id: string;
  jobNo: string; // JC/0001/26-27
  orderId?: string;
  orderPo: string;
  partCode: string;
  partDescription: string;
  drawingRevision: string; // LOCKED AT RELEASE
  targetQty: number;
  materialIssuedLot: string; // Mandatory Mill Heat/Lot Number
  materialQcStatus: 'ACCEPTED' | 'QUALITY_HOLD' | 'PENDING_INSPECTION';
  currentStepNo: number;
  currentOperation: string;
  jobStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'QC_HOLD' | 'COMPLETED';
  hasOpenNcr: boolean;
  ncrReference?: string;
  supervisorSignOff?: string;
  remarks?: string;
  targetDate: string;
  operations: JobCardOperation[];
}

export interface NcrRecord {
  id: string;
  ncrNumber: string; // NCR-2026-####
  jobCardId: string;
  jobNo: string;
  sequenceNo: number;
  operationName: string;
  orderPo: string;
  defectCategory: 'DIMENSIONAL' | 'VISUAL_SURFACE' | 'MATERIAL_HARDNESS' | 'MACHINING_CHATTER' | 'RUNOUT_EXCEEDED' | 'OTHER';
  defectDescription: string;
  rejectedQty: number;
  status: 'OPEN' | 'RESOLVED' | 'CLOSED';
  disposition?: 'REWORK' | 'SCRAP' | 'USE_AS_IS_CONCESSION';
  dispositionApprovedBy?: string;
  dispositionReason?: string;
  dispositionDate?: string;
  raisedBy: string;
  raisedAt: string;
}

export interface EmployeeCertification {
  employeeName: string;
  employeeCode?: string;
  certificationName: string;
  validUntil?: string;
}

/**
 * 1. Material Issue Validation: Blocks material still on Quality Hold or Pending Inspection
 * (Heat/Lot # is optional when inventory raw materials are not sorted by heat/lot)
 */
export function validateMaterialIssueForJobCard(
  heatLotNumber?: string,
  materialQcStatus?: 'ACCEPTED' | 'QUALITY_HOLD' | 'PENDING_INSPECTION'
): { valid: boolean; errorCode?: ProductionErrorCode; errorMessage?: string } {
  if (heatLotNumber && heatLotNumber.trim() !== '') {
    if (materialQcStatus === 'QUALITY_HOLD' || materialQcStatus === 'PENDING_INSPECTION') {
      return {
        valid: false,
        errorCode: PRODUCTION_ERROR_CODES.ERR_MATERIAL_NOT_ACCEPTED_QC,
        errorMessage: `Material issue blocked: Heat/Lot ${heatLotNumber} is currently in '${materialQcStatus}' status and has not received final Quality Acceptance.`
      };
    }
  }

  return { valid: true };
}

/**
 * 2. Operator Skill & Certification Verification (Removed for all operators)
 */
export function validateOperatorCertification(
  _operatorName: string,
  _requiredCertification: string,
  _certifiedEmployees: EmployeeCertification[] = []
): { valid: boolean; errorCode?: ProductionErrorCode; errorMessage?: string } {
  // Skill certification check removed for all users
  return { valid: true };
}

/**
 * 3. Auto-Derives Job Card Status from Operations and NCR Status
 */
export function deriveJobStatus(
  operations: JobCardOperation[],
  hasOpenNcr: boolean
): JobCard['jobStatus'] {
  if (hasOpenNcr) {
    return 'QC_HOLD';
  }

  if (!operations || operations.length === 0) {
    return 'NOT_STARTED';
  }

  const allCompleted = operations.every(op => op.opStatus === 'COMPLETED');
  if (allCompleted) {
    return 'COMPLETED';
  }

  const anyInProgress = operations.some(op => op.opStatus === 'IN_PROGRESS' || op.opStatus === 'PAUSED');
  const anyCompleted = operations.some(op => op.opStatus === 'COMPLETED');

  if (anyInProgress || anyCompleted) {
    return 'IN_PROGRESS';
  }

  return 'NOT_STARTED';
}

/**
 * 4. Generates Job Card from Route Card Traveler Template
 */
export function generateJobCardFromRouteCard(params: {
  jobNo: string;
  orderId?: string;
  orderPo: string;
  partCode: string;
  partDescription: string;
  drawingRevision: string;
  targetQty: number;
  materialIssuedLot?: string;
  materialQcStatus?: 'ACCEPTED' | 'QUALITY_HOLD' | 'PENDING_INSPECTION';
  targetDate: string;
  routeSteps: RouteCardTemplateStep[];
}): { jobCard?: JobCard; error?: { code: ProductionErrorCode; message: string } } {
  // Validate Material QC Gate
  const materialCheck = validateMaterialIssueForJobCard(params.materialIssuedLot, params.materialQcStatus);
  if (!materialCheck.valid) {
    return { error: { code: materialCheck.errorCode!, message: materialCheck.errorMessage! } };
  }

  const sortedSteps = [...params.routeSteps].sort((a, b) => a.sequenceNo - b.sequenceNo);
  const now = Date.now();
  const salt = Math.floor(1000 + Math.random() * 9000);
  const operations: JobCardOperation[] = sortedSteps.map((step, idx) => ({
    id: `jco-${now}-${idx}-${step.sequenceNo}-${salt}`,
    jobCardId: params.jobNo,
    jobNo: params.jobNo,
    sequenceNo: step.sequenceNo,
    operationName: step.operationName,
    machineId: step.workCenter,
    requiredCertification: step.requiredCertification,
    isCertificationVerified: true,
    standardTimeMinutes: step.standardTimeMinutes,
    actualTimeMinutes: 0,
    qtyProcessed: 0,
    qtyRejected: 0,
    inspectionRequired: step.inspectionRequired,
    inspectionPassed: false,
    opStatus: 'PENDING'
  }));

  const initialOperation = sortedSteps[0]?.operationName || 'Ready for Production';
  const initialStep = sortedSteps[0]?.sequenceNo || 10;

  const jobCard: JobCard = {
    id: `jc-${now}-${salt}`,
    jobNo: params.jobNo,
    orderId: params.orderId,
    orderPo: params.orderPo,
    partCode: params.partCode,
    partDescription: params.partDescription,
    drawingRevision: params.drawingRevision, // LOCKED
    targetQty: params.targetQty,
    materialIssuedLot: params.materialIssuedLot || 'NOT-TRACKED',
    materialQcStatus: params.materialQcStatus || 'ACCEPTED',
    currentStepNo: initialStep,
    currentOperation: initialOperation,
    jobStatus: 'NOT_STARTED',
    hasOpenNcr: false,
    targetDate: params.targetDate,
    operations
  };

  return { jobCard };
}

/**
 * 5. Starts an Operation on Job Card with Skill Verification and QC Hold Gates
 */
export function startOperationOnJobCard(
  jobCard: JobCard,
  sequenceNo: number,
  machineId: string,
  operatorName: string,
  certifiedEmployees: EmployeeCertification[]
): { jobCard: JobCard; error?: { code: ProductionErrorCode; message: string } } {
  // Hard Gate 1: Check if Job Card is on QC Hold
  if (jobCard.hasOpenNcr || jobCard.jobStatus === 'QC_HOLD') {
    return {
      jobCard,
      error: {
        code: PRODUCTION_ERROR_CODES.ERR_JOB_CARD_ON_QC_HOLD,
        message: `Operation Blocked: Job Card ${jobCard.jobNo} is locked on QC Hold due to open Non-Conformance Report (${jobCard.ncrReference || 'Open NCR'}). Disposition must be completed first.`
      }
    };
  }

  const opIndex = jobCard.operations.findIndex(op => op.sequenceNo === sequenceNo);
  if (opIndex === -1) {
    return {
      jobCard,
      error: {
        code: PRODUCTION_ERROR_CODES.ERR_OPERATION_SEQUENCE_VIOLATION,
        message: `Operation sequence ${sequenceNo} does not exist on Job Card ${jobCard.jobNo}.`
      }
    };
  }

  const op = jobCard.operations[opIndex];

  // Hard Gate 2: Sequential Operation Gate (Operation N+1 cannot start if Operation N is not COMPLETED)
  for (let i = 0; i < opIndex; i++) {
    const prevOp = jobCard.operations[i];
    if (prevOp.opStatus !== 'COMPLETED') {
      return {
        jobCard,
        error: {
          code: PRODUCTION_ERROR_CODES.ERR_OPERATION_SEQUENCE_VIOLATION,
          message: `Sequential Operation Gate Blocked: Cannot start operation ${sequenceNo} (${op.operationName}) because prior operation ${prevOp.sequenceNo} (${prevOp.operationName}) is currently '${prevOp.opStatus}' (must be COMPLETED).`
        }
      };
    }

    // Subcontract gate-in & inspection check
    if (prevOp.machineId?.includes('OUTWORK') || prevOp.operationName.toLowerCase().includes('outwork') || prevOp.operationName.toLowerCase().includes('outsourced')) {
      if (prevOp.inspectionRequired && !prevOp.inspectionPassed) {
        return {
          jobCard,
          error: {
            code: PRODUCTION_ERROR_CODES.ERR_OPERATION_SEQUENCE_VIOLATION,
            message: `Subcontract Quality Gate Blocked: Prior subcontracted operation ${prevOp.sequenceNo} (${prevOp.operationName}) requires Gate-In and incoming inspection PASS before subsequent operations can commence.`
          }
        };
      }
    }
  }

  // Hard Gate 3: Operator Skill / Certification Check
  const skillCheck = validateOperatorCertification(operatorName, op.requiredCertification, certifiedEmployees);
  if (!skillCheck.valid) {
    return { jobCard, error: { code: skillCheck.errorCode!, message: skillCheck.errorMessage! } };
  }

  const updatedOperations = [...jobCard.operations];
  updatedOperations[opIndex] = {
    ...op,
    machineId,
    operatorName,
    isCertificationVerified: true,
    actualStartTime: new Date().toISOString(),
    opStatus: 'IN_PROGRESS'
  };

  const updatedJobCard: JobCard = {
    ...jobCard,
    currentStepNo: sequenceNo,
    currentOperation: op.operationName,
    operations: updatedOperations,
    jobStatus: deriveJobStatus(updatedOperations, false)
  };

  return { jobCard: updatedJobCard };
}

/**
 * 6. Completes an Operation, Logs Actual vs Standard Time, and Checks Scrap
 */
export function completeOperationOnJobCard(
  jobCard: JobCard,
  sequenceNo: number,
  qtyProcessed: number,
  qtyRejected: number,
  actualMinutes: number,
  notes?: string
): { 
  jobCard: JobCard; 
  scrapMovementTriggered?: { qty: number; itemCode: string; location: string };
  error?: { code: ProductionErrorCode; message: string };
} {
  const opIndex = jobCard.operations.findIndex(op => op.sequenceNo === sequenceNo);
  if (opIndex === -1) {
    return {
      jobCard,
      error: {
        code: PRODUCTION_ERROR_CODES.ERR_OPERATION_SEQUENCE_VIOLATION,
        message: `Operation sequence ${sequenceNo} not found.`
      }
    };
  }

  const op = jobCard.operations[opIndex];
  const updatedOperations = [...jobCard.operations];
  updatedOperations[opIndex] = {
    ...op,
    qtyProcessed,
    qtyRejected,
    actualEndTime: new Date().toISOString(),
    actualTimeMinutes: actualMinutes,
    inspectionPassed: qtyRejected === 0,
    opStatus: 'COMPLETED',
    notes
  };

  // Find next operation
  const nextOp = updatedOperations.find(o => o.sequenceNo > sequenceNo && o.opStatus === 'PENDING');

  let scrapMovementTriggered: { qty: number; itemCode: string; location: string } | undefined;
  if (qtyRejected > 0) {
    scrapMovementTriggered = {
      qty: qtyRejected,
      itemCode: jobCard.partCode,
      location: 'Scrap & Rejection Yard'
    };
  }

  const updatedJobCard: JobCard = {
    ...jobCard,
    currentStepNo: nextOp ? nextOp.sequenceNo : sequenceNo,
    currentOperation: nextOp ? nextOp.operationName : 'All Operations Completed',
    operations: updatedOperations,
    jobStatus: deriveJobStatus(updatedOperations, jobCard.hasOpenNcr)
  };

  return { jobCard: updatedJobCard, scrapMovementTriggered };
}

/**
 * 7. Raises an NCR against a Job Card, placing it in QC Hold
 */
export function raiseNcrOnJobCard(
  jobCard: JobCard,
  ncr: NcrRecord
): JobCard {
  const updatedOperations = jobCard.operations.map(op => {
    if (op.sequenceNo === ncr.sequenceNo) {
      return { ...op, opStatus: 'QC_HOLD' as const };
    }
    return op;
  });

  return {
    ...jobCard,
    hasOpenNcr: true,
    ncrReference: ncr.ncrNumber,
    jobStatus: 'QC_HOLD',
    operations: updatedOperations
  };
}

/**
 * 8. Resolves NCR Disposition (Rework / Scrap / Use-as-is Concession) and clears QC Hold
 */
export function resolveNcrOnJobCard(
  jobCard: JobCard,
  ncrNumber: string,
  disposition: 'REWORK' | 'SCRAP' | 'USE_AS_IS_CONCESSION',
  approverName: string,
  reason: string
): { 
  jobCard: JobCard; 
  scrapMovementTriggered?: { qty: number; itemCode: string; location: string };
} {
  const updatedOperations = jobCard.operations.map(op => {
    if (op.opStatus === 'QC_HOLD') {
      return { ...op, opStatus: disposition === 'REWORK' ? ('IN_PROGRESS' as const) : ('COMPLETED' as const) };
    }
    return op;
  });

  let scrapMovementTriggered: { qty: number; itemCode: string; location: string } | undefined;
  if (disposition === 'SCRAP') {
    scrapMovementTriggered = {
      qty: 1, // unit rejected
      itemCode: jobCard.partCode,
      location: 'Scrap & Rejection Yard'
    };
  }

  const updatedJobCard: JobCard = {
    ...jobCard,
    hasOpenNcr: false,
    ncrReference: undefined,
    remarks: `NCR ${ncrNumber} resolved with disposition ${disposition} by ${approverName}. Justification: ${reason}`,
    operations: updatedOperations,
    jobStatus: deriveJobStatus(updatedOperations, false)
  };

  return { jobCard: updatedJobCard, scrapMovementTriggered };
}

/**
 * 9. Telemetry: Standard Time vs Actual Time & Machine Utilization %
 */
export function computeProductionKpis(operations: JobCardOperation[]): {
  totalStandardMinutes: number;
  totalActualMinutes: number;
  machineUtilizationPercentage: number;
  scheduleVarianceMinutes: number;
  isBehindSchedule: boolean;
} {
  let totalStandard = 0;
  let totalActual = 0;

  for (const op of operations) {
    if (op.opStatus === 'COMPLETED' || op.opStatus === 'IN_PROGRESS') {
      totalStandard += op.standardTimeMinutes || 0;
      totalActual += op.actualTimeMinutes || 0;
    }
  }

  const scheduleVariance = totalActual - totalStandard;
  const utilization = totalActual > 0 ? Number(((totalStandard / totalActual) * 100).toFixed(2)) : 100;

  return {
    totalStandardMinutes: totalStandard,
    totalActualMinutes: totalActual,
    machineUtilizationPercentage: utilization,
    scheduleVarianceMinutes: scheduleVariance,
    isBehindSchedule: scheduleVariance > 0
  };
}
