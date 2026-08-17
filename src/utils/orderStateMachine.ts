/**
 * GuruOm Sales & Order Management Workflow State Machine Engine
 * 
 * Implements strict server-side gates and business rules:
 * 1. Drawing revision matching validation (Gate 1 at Order Entry, Gate 2 at Production Release)
 * 2. Customer credit control (overdue > 90 days = Credit Hold, requires Owner override)
 * 3. Material availability auto-check & Auto-trigger Purchase Requisition on shortage
 * 4. Heat/Lot number mandatory capture at material issue for job card traceability
 * 5. Hard block on Open NCRs at Quality Clearance & Ready to Dispatch
 * 6. Sales Invoice quantity validation vs Dispatched quantity with audit override
 * 7. Order amendment approval (Price changes require Owner approval regardless of amount)
 * 8. Distinct Order Sub-Types: FRESH_PO, BLANKET_CALLOFF, AMENDMENT
 */

export type CanonicalOrderState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'RELEASED'
  | 'PENDING_VERIFICATION'
  | 'MATERIAL_CHECK'
  | 'MATERIAL_READY'
  | 'MATERIAL_SHORT'
  | 'PROCUREMENT_PENDING'
  | 'GRN'
  | 'JOB_RELEASED'
  | 'IN_PRODUCTION'
  | 'REWORK'
  | 'QC'
  | 'QC_HOLD'
  | 'QC_REPORT_UPLOADED'
  | 'PDI'
  | 'PDI_HOLD'
  | 'PDI_COMPLETE'
  | 'READY_FOR_DISPATCH'
  | 'INVOICE_GENERATED'
  | 'DISPATCH_READY'
  | 'IN_TRANSIT'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'PAYMENT_PENDING'
  | 'INVOICED'
  | 'COMPLETED';

export type OrderSubType = 'FRESH_PO' | 'BLANKET_CALLOFF' | 'AMENDMENT';

export type OrderStage = 
  | CanonicalOrderState
  | 'PO_RECEIVED'         // Alias -> SUBMITTED
  | 'CONFIRMED'           // Alias -> APPROVED
  | 'MATERIAL_CHECKED'    // Alias -> MATERIAL_READY
  | 'MATERIAL_VERIFIED'   // Alias -> MATERIAL_READY
  | 'MATERIAL_ISSUED'     // Alias -> JOB_RELEASED
  | 'QC_INSPECTION'       // Alias -> QC
  | 'READY_FOR_QC'        // Alias -> QC
  | 'READY_TO_DISPATCH'   // Alias -> READY_FOR_DISPATCH
  | 'WITH_SUBCONTRACTOR'  // Alias -> IN_PRODUCTION
  | 'PO_SENT'             // Alias -> PROCUREMENT_PENDING
  | 'GRN_RECEIVED'        // Alias -> GRN
  | 'CLOSED'              // Alias -> COMPLETED
  | 'PAID';               // Alias -> COMPLETED

/**
 * Strict Adjacency List for Valid Forward & Recovery Transitions
 * Any transition not explicitly in this graph MUST be rejected.
 */
export const ALLOWED_TRANSITIONS: Record<CanonicalOrderState, CanonicalOrderState[]> = {
  'DRAFT': ['SUBMITTED', 'APPROVED'],
  'SUBMITTED': ['APPROVED', 'DRAFT'],
  'APPROVED': ['RELEASED', 'PENDING_VERIFICATION', 'MATERIAL_CHECK', 'MATERIAL_READY', 'DRAFT'],
  'RELEASED': ['PENDING_VERIFICATION', 'MATERIAL_CHECK', 'MATERIAL_READY'],
  'PENDING_VERIFICATION': ['MATERIAL_READY', 'MATERIAL_SHORT', 'MATERIAL_CHECK', 'PROCUREMENT_PENDING'],
  'MATERIAL_CHECK': ['MATERIAL_READY', 'MATERIAL_SHORT', 'PROCUREMENT_PENDING'],
  'MATERIAL_SHORT': ['PROCUREMENT_PENDING'],
  'PROCUREMENT_PENDING': ['GRN'],
  'GRN': ['MATERIAL_READY', 'PENDING_VERIFICATION', 'MATERIAL_CHECK'],
  'MATERIAL_READY': ['JOB_RELEASED', 'IN_PRODUCTION'],
  'JOB_RELEASED': ['IN_PRODUCTION'],
  'IN_PRODUCTION': ['QC', 'QC_REPORT_UPLOADED', 'REWORK'],
  'REWORK': ['IN_PRODUCTION', 'JOB_RELEASED'],        // NCR loop-back
  'QC': ['QC_HOLD', 'QC_REPORT_UPLOADED', 'PDI', 'READY_FOR_DISPATCH'],
  'QC_HOLD': ['QC', 'REWORK'],                        // Cleared via NCR Disposition or Rework
  'QC_REPORT_UPLOADED': ['PDI', 'PDI_COMPLETE'],
  'PDI': ['PDI_HOLD', 'PDI_COMPLETE', 'READY_FOR_DISPATCH'],
  'PDI_HOLD': ['PDI', 'REWORK'],                      // Cleared via Re-inspection or Rework
  'PDI_COMPLETE': ['READY_FOR_DISPATCH', 'REWORK'],   // Ready to Dispatch or NCR Rework
  'READY_FOR_DISPATCH': ['INVOICE_GENERATED', 'DISPATCHED', 'INVOICED'],
  'INVOICE_GENERATED': ['DISPATCH_READY', 'DISPATCHED'],
  'DISPATCH_READY': ['IN_TRANSIT', 'DISPATCHED'],
  'IN_TRANSIT': ['DELIVERED'],
  'DISPATCHED': ['INVOICED', 'DELIVERED', 'IN_TRANSIT'],
  'DELIVERED': ['PAYMENT_PENDING', 'INVOICED', 'COMPLETED'],
  'PAYMENT_PENDING': ['COMPLETED'],
  'INVOICED': ['COMPLETED', 'DELIVERED'],
  'COMPLETED': []
};

/**
 * Maps legacy/display stage strings to canonical state machine states
 */
export function normalizeOrderState(stage: any): CanonicalOrderState {
  const s = String(stage ?? '').trim().toUpperCase();
  switch (s) {
    case 'PO_RECEIVED':
      return 'SUBMITTED';
    case 'CONFIRMED':
      return 'APPROVED';
    case 'MATERIAL_CHECKED':
    case 'MATERIAL_VERIFIED':
      return 'MATERIAL_READY';
    case 'MATERIAL_ISSUED':
      return 'JOB_RELEASED';
    case 'QC_INSPECTION':
    case 'READY_FOR_QC':
      return 'QC';
    case 'READY_TO_DISPATCH':
      return 'READY_FOR_DISPATCH';
    case 'WITH_SUBCONTRACTOR':
      return 'IN_PRODUCTION';
    case 'PO_SENT':
      return 'PROCUREMENT_PENDING';
    case 'GRN_RECEIVED':
      return 'GRN';
    case 'CLOSED':
    case 'PAID':
      return 'COMPLETED';
    default:
      if (s in ALLOWED_TRANSITIONS) {
        return s as CanonicalOrderState;
      }
      return 'SUBMITTED';
  }
}

export const ORDER_STAGE_STEPS: Record<OrderStage, number> = {
  'DRAFT': 0,
  'SUBMITTED': 1,
  'PO_RECEIVED': 1,
  'APPROVED': 2,
  'CONFIRMED': 2,
  'RELEASED': 2,
  'PENDING_VERIFICATION': 3,
  'MATERIAL_CHECK': 3,
  'MATERIAL_CHECKED': 3,
  'MATERIAL_VERIFIED': 3,
  'MATERIAL_SHORT': 3,
  'MATERIAL_READY': 4,
  'PROCUREMENT_PENDING': 3,
  'PO_SENT': 3,
  'GRN': 3,
  'GRN_RECEIVED': 3,
  'JOB_RELEASED': 4,
  'MATERIAL_ISSUED': 4,
  'WITH_SUBCONTRACTOR': 5,
  'IN_PRODUCTION': 5,
  'REWORK': 5,
  'READY_FOR_QC': 6,
  'QC': 6,
  'QC_INSPECTION': 6,
  'QC_HOLD': 6,
  'QC_REPORT_UPLOADED': 6,
  'PDI': 7,
  'PDI_HOLD': 7,
  'PDI_COMPLETE': 7,
  'READY_FOR_DISPATCH': 7,
  'READY_TO_DISPATCH': 7,
  'INVOICE_GENERATED': 8,
  'DISPATCH_READY': 8,
  'DISPATCHED': 8,
  'IN_TRANSIT': 9,
  'DELIVERED': 9,
  'PAYMENT_PENDING': 10,
  'INVOICED': 10,
  'COMPLETED': 11,
  'CLOSED': 11,
  'PAID': 11
};

export const ORDER_STAGE_LABELS: Record<OrderStage, string> = {
  'DRAFT': '0. Draft Order',
  'SUBMITTED': '1. PO Submitted',
  'PO_RECEIVED': '1. PO Received (Sales Desk)',
  'APPROVED': '2. Order Confirmed',
  'CONFIRMED': '2. Order Confirmed (PPC)',
  'RELEASED': '2. Released to Production',
  'PENDING_VERIFICATION': '3. Pending Material Verification',
  'MATERIAL_CHECK': '3. Material Checking',
  'MATERIAL_CHECKED': '3. Material Verified (Stores)',
  'MATERIAL_VERIFIED': '3. Material Verified (Stores)',
  'MATERIAL_SHORT': '3. Material Short (Procurement Required)',
  'MATERIAL_READY': '4. Material Ready & Reserved',
  'PROCUREMENT_PENDING': '3. Procurement Pending (Shortage)',
  'PO_SENT': '3. Purchase Order Sent',
  'GRN': '3. GRN Inward & Inspection',
  'GRN_RECEIVED': '3. GRN Received',
  'JOB_RELEASED': '4. Job Card Released',
  'MATERIAL_ISSUED': '4. Heat/Lot Issued (Stores)',
  'WITH_SUBCONTRACTOR': '5. With Subcontractor',
  'IN_PRODUCTION': '5. In Production (Shop Floor)',
  'REWORK': '5. Rework (NCR Disposition)',
  'READY_FOR_QC': '6. Ready for QC',
  'QC': '6. Quality Control Inspection',
  'QC_INSPECTION': '6. Quality Cleared (QC)',
  'QC_HOLD': '6. QC Deficit Hold',
  'QC_REPORT_UPLOADED': '6. QC Report Uploaded',
  'PDI': '7. Pre-Dispatch Inspection (PDI)',
  'PDI_HOLD': '7. PDI Quarantine Hold',
  'PDI_COMPLETE': '7. PDI Complete',
  'READY_FOR_DISPATCH': '7. Ready to Dispatch',
  'READY_TO_DISPATCH': '7. Ready to Dispatch',
  'INVOICE_GENERATED': '8. Invoice Generated',
  'DISPATCH_READY': '8. Dispatch Ready (Challan)',
  'DISPATCHED': '8. Dispatched',
  'IN_TRANSIT': '9. In Transit',
  'DELIVERED': '9. Delivered (POD Received)',
  'PAYMENT_PENDING': '10. Delivered — Payment Pending',
  'INVOICED': '10. Invoiced (Finance)',
  'COMPLETED': '11. Order Closed',
  'CLOSED': '11. Closed',
  'PAID': '11. Closed & Paid'
};

export const ORDER_ERROR_CODES = {
  ERR_DRAWING_REVISION_MISMATCH: 'ERR_DRAWING_REVISION_MISMATCH',
  ERR_CUSTOMER_CREDIT_HOLD: 'ERR_CUSTOMER_CREDIT_HOLD',
  ERR_MATERIAL_SHORTAGE: 'ERR_MATERIAL_SHORTAGE',
  ERR_MATERIAL_NOT_READY: 'ERR_MATERIAL_NOT_READY',
  ERR_HEAT_LOT_REQUIRED: 'ERR_HEAT_LOT_REQUIRED',
  ERR_OPEN_NCR_EXISTS: 'ERR_OPEN_NCR_EXISTS',
  ERR_PDI_NOT_PASSED: 'ERR_PDI_NOT_PASSED',
  ERR_QTY_DISPATCH_MISMATCH: 'ERR_QTY_DISPATCH_MISMATCH',
  ERR_INSUFFICIENT_FG_STOCK: 'ERR_INSUFFICIENT_FG_STOCK',
  ERR_INVOICE_EXCEEDS_DISPATCH: 'ERR_INVOICE_EXCEEDS_DISPATCH',
  ERR_FIELD_LOCKED_AFTER_APPROVAL: 'ERR_FIELD_LOCKED_AFTER_APPROVAL',
  ERR_PREVIOUS_OPERATION_INCOMPLETE: 'ERR_PREVIOUS_OPERATION_INCOMPLETE',
  ERR_SUBCON_INSPECTION_PENDING: 'ERR_SUBCON_INSPECTION_PENDING',
  ERR_FG_QTY_CANNOT_BE_MANUALLY_OVERRIDDEN: 'ERR_FG_QTY_CANNOT_BE_MANUALLY_OVERRIDDEN',
  ERR_TRANSACTION_DELETE_FORBIDDEN: 'ERR_TRANSACTION_DELETE_FORBIDDEN',
  ERR_PRICE_AMENDMENT_OWNER_APPROVAL_REQUIRED: 'ERR_PRICE_AMENDMENT_OWNER_APPROVAL_REQUIRED',
  ERR_BLANKET_PO_EXHAUSTED: 'ERR_BLANKET_PO_EXHAUSTED',
  ERR_INVALID_STAGE_TRANSITION: 'ERR_INVALID_STAGE_TRANSITION',
  // PRD v1.0 Hard Gates
  ERR_POD_REQUIRED: 'ERR_POD_REQUIRED',
  ERR_PAYMENT_INCOMPLETE: 'ERR_PAYMENT_INCOMPLETE',
  ERR_ORDER_NOT_DELIVERED: 'ERR_ORDER_NOT_DELIVERED',
  ERR_JOB_CARDS_EXIST_CHANGE_ORDER: 'ERR_JOB_CARDS_EXIST_CHANGE_ORDER',
  ERR_INVOICE_NOT_GENERATED: 'ERR_INVOICE_NOT_GENERATED',
  ERR_CHALLAN_NOT_GENERATED: 'ERR_CHALLAN_NOT_GENERATED',
  ERR_QC_REPORT_NOT_UPLOADED: 'ERR_QC_REPORT_NOT_UPLOADED'
} as const;


export type OrderErrorCode = typeof ORDER_ERROR_CODES[keyof typeof ORDER_ERROR_CODES];

export interface StateMachineContext {
  orderId: string;
  poNo: string;
  subType: OrderSubType;
  currentStage: OrderStage;
  targetStage: OrderStage;
  actorRole: string;
  actorName: string;
  
  // Gate 1 & 2: Drawing revision
  orderDrawingRevision: string;
  masterDrawingRevision: string;
  partCode: string;

  // Gate 2: Customer credit status
  customerName: string;
  isCustomerOverdue90Days: boolean;
  creditHoldOverrideBy?: string;
  creditHoldOverrideReason?: string;

  // Gate 3: Material check
  requiredMaterialQty?: number;
  availableStockQty?: number;
  autoTriggeredPr?: boolean;

  // Gate 4: Heat / Lot Number
  heatLotNumber?: string;

  // Gate 5 & 6: NCRs
  linkedOpenNcrs?: Array<{ id: string; ncrNumber: string; jobNo: string; defectDescription: string; status: string }>;

  // Gate 8: Invoice vs Dispatch quantity match
  dispatchedQty?: number;
  invoicedQty?: number;
  invoiceOverrideReason?: string;

  // Gate 9: Order amendment
  isPriceChanged?: boolean;
  priceChangeApprovedBy?: string;

  // Blanket PO
  blanketPoBalanceQty?: number;
  orderQty?: number;

  // PRD v1.0: POD Hard Gate (Mark Delivered)
  podDocumentUrl?: string;
  podAttachmentName?: string;

  // PRD v1.0: Payment Hard Gate (Mark Order Closed)
  paymentStatus?: 'UNPAID' | 'PARTIAL' | 'PAID';
  outstandingAmount?: number;

  // PRD v1.0: Change Order Gate (block if Job Cards exist)
  hasLinkedJobCards?: boolean;
  isOwnerOverride?: boolean;

  // PRD v1.0: Invoice/Challan pre-requisite gates
  hasInvoice?: boolean;
  hasChallan?: boolean;

  // PRD v1.0: QC Report gate
  hasQcReport?: boolean;
}

export interface TransitionValidationResult {
  valid: boolean;
  errorCode?: OrderErrorCode;
  errorMessage?: string;
  autoActionsTriggered?: Array<{
    type: 'PURCHASE_REQUISITION_GENERATED' | 'ESCALATED_TO_OWNER' | 'CREDIT_HOLD_OVERRIDDEN' | 'INVOICE_OVERRIDE_LOGGED';
    details: string;
    payload?: any;
  }>;
}

/**
 * Validates drawing revision match between order and master item/BOM catalog.
 */
export function validateDrawingRevision(orderRev: string, masterRev: string, partCode: string): TransitionValidationResult {
  const normOrderRev = (orderRev || '').trim().toUpperCase();
  const normMasterRev = (masterRev || '').trim().toUpperCase();

  if (!normOrderRev) {
    return {
      valid: false,
      errorCode: ORDER_ERROR_CODES.ERR_DRAWING_REVISION_MISMATCH,
      errorMessage: `Order entry rejected: Order does not reference an approved drawing revision for part "${partCode}". Approved Master Revision is "${normMasterRev}".`
    };
  }

  if (normOrderRev !== normMasterRev) {
    return {
      valid: false,
      errorCode: ORDER_ERROR_CODES.ERR_DRAWING_REVISION_MISMATCH,
      errorMessage: `Drawing Revision Mismatch Gate Blocked: Order revision "${normOrderRev}" does not match the current approved master revision "${normMasterRev}" for item "${partCode}". Update order or master drawing before proceeding.`
    };
  }

  return { valid: true };
}

/**
 * Validates customer credit hold status (> 90 days overdue receivables).
 */
export function validateCustomerCredit(
  isOverdue90Days: boolean, 
  customerName: string, 
  overrideBy?: string, 
  overrideReason?: string
): TransitionValidationResult {
  if (isOverdue90Days) {
    // Check for Owner-level override
    const isOwnerOverride = overrideBy && (
      overrideBy.toLowerCase().includes('owner') || 
      overrideBy.toLowerCase().includes('admin') ||
      overrideBy.toLowerCase().includes('viraj')
    );

    if (!isOwnerOverride || !overrideReason) {
      return {
        valid: false,
        errorCode: ORDER_ERROR_CODES.ERR_CUSTOMER_CREDIT_HOLD,
        errorMessage: `Credit Control Blocked: Customer "${customerName}" has receivables overdue exceeding 90 days and is placed on Credit Hold. New orders cannot be confirmed or released without an explicit Owner-level override.`
      };
    }

    return {
      valid: true,
      autoActionsTriggered: [{
        type: 'CREDIT_HOLD_OVERRIDDEN',
        details: `Customer "${customerName}" Credit Hold overridden by ${overrideBy}. Reason: ${overrideReason}`
      }]
    };
  }

  return { valid: true };
}

/**
 * Validates material availability and auto-triggers Purchase Requisition on shortage.
 */
export function validateMaterialAvailability(
  requiredQty: number, 
  availableStock: number, 
  itemCode: string,
  orderPo: string
): TransitionValidationResult {
  if (availableStock < requiredQty) {
    const deficit = requiredQty - availableStock;
    const reqNumber = `PR-${Date.now().toString().slice(-6)}`;

    return {
      valid: true, // Transition proceeds, but auto-generates Purchase Requisition
      autoActionsTriggered: [{
        type: 'PURCHASE_REQUISITION_GENERATED',
        details: `Material shortage detected (${deficit} deficit). Auto-generated Purchase Requisition ${reqNumber} for item ${itemCode} linked to ${orderPo}.`,
        payload: {
          reqNumber,
          itemCode,
          requiredQty,
          availableStock,
          deficitQty: deficit,
          orderPo
        }
      }]
    };
  }

  return { valid: true };
}

/**
 * Validates mandatory heat/lot number capture for job card traceability.
 */
export function validateHeatLotNumber(heatLotNumber?: string): TransitionValidationResult {
  if (!heatLotNumber || !heatLotNumber.trim()) {
    return {
      valid: false,
      errorCode: ORDER_ERROR_CODES.ERR_HEAT_LOT_REQUIRED,
      errorMessage: `Traceability Gate Blocked: Raw Material Heat / Lot Number is mandatory for material issue and job card allocation. Enter valid mill heat/lot number.`
    };
  }

  return { valid: true };
}

/**
 * Validates that no open NCRs exist for linked job cards.
 */
export function validateNoOpenNcrs(
  linkedOpenNcrs?: Array<{ id: string; ncrNumber: string; jobNo: string; defectDescription: string; status: string }>
): TransitionValidationResult {
  if (linkedOpenNcrs && linkedOpenNcrs.length > 0) {
    const ncrSummary = linkedOpenNcrs.map(n => `${n.ncrNumber} on ${n.jobNo} (${n.defectDescription})`).join('; ');
    return {
      valid: false,
      errorCode: ORDER_ERROR_CODES.ERR_OPEN_NCR_EXISTS,
      errorMessage: `Quality Clearance Gate Blocked: Cannot proceed to Ready to Dispatch due to ${linkedOpenNcrs.length} open Non-Conformance Report(s): [${ncrSummary}]. All NCRs must be formally closed or reworked prior to dispatch release.`
    };
  }

  return { valid: true };
}

/**
 * Validates invoice quantity matches dispatched quantity from dispatch challan.
 */
export function validateInvoiceQuantity(
  dispatchedQty: number, 
  invoicedQty: number, 
  overrideReason?: string,
  actorName?: string
): TransitionValidationResult {
  if (dispatchedQty !== invoicedQty) {
    if (!overrideReason || !overrideReason.trim()) {
      return {
        valid: false,
        errorCode: ORDER_ERROR_CODES.ERR_QTY_DISPATCH_MISMATCH,
        errorMessage: `Commercial Gate Blocked: Invoice quantity (${invoicedQty}) does not match physically dispatched quantity (${dispatchedQty}). Enter an explicit override reason with audit authorization to continue.`
      };
    }

    return {
      valid: true,
      autoActionsTriggered: [{
        type: 'INVOICE_OVERRIDE_LOGGED',
        details: `Invoice qty mismatch (${invoicedQty} vs ${dispatchedQty} dispatched) approved by ${actorName || 'Authorized User'}. Reason: ${overrideReason}`
      }]
    };
  }

  return { valid: true };
}

/**
 * Validates order amendment rules (Price amendments require Owner-level approval).
 */
export function validateAmendmentApproval(
  isPriceChanged: boolean, 
  approvedBy?: string, 
  actorRole?: string
): TransitionValidationResult {
  if (isPriceChanged) {
    const isOwner = actorRole === 'Owner' || (approvedBy && approvedBy.toLowerCase().includes('owner'));
    if (!isOwner) {
      return {
        valid: false,
        errorCode: ORDER_ERROR_CODES.ERR_PRICE_AMENDMENT_OWNER_APPROVAL_REQUIRED,
        errorMessage: `Commercial Policy Blocked: Order unit price modifications strictly require Owner-level authorization regardless of monetary transaction value.`
      };
    }
  }

  return { valid: true };
}

/**
 * Validates blanket PO call-off quantity against standing contract balance.
 */
export function validateBlanketPoCallOff(
  subType: OrderSubType, 
  orderQty: number, 
  blanketBalanceQty?: number
): TransitionValidationResult {
  if (subType === 'BLANKET_CALLOFF') {
    if (blanketBalanceQty !== undefined && orderQty > blanketBalanceQty) {
      return {
        valid: false,
        errorCode: ORDER_ERROR_CODES.ERR_BLANKET_PO_EXHAUSTED,
        errorMessage: `Blanket PO Gate Blocked: Call-off quantity (${orderQty}) exceeds remaining standing blanket PO balance (${blanketBalanceQty}). Create a contract amendment or fresh PO.`
      };
    }
  }

  return { valid: true };
}

/**
 * Main State Machine Transition Function
 * Evaluates all preconditions for moving an order from currentStage to targetStage.
 */
/**
 * Main State Machine Transition Function
 * Evaluates all preconditions for moving an order from currentStage to targetStage.
 */
export function executeOrderStageTransition(ctx: StateMachineContext): TransitionValidationResult {
  const autoActions: TransitionValidationResult['autoActionsTriggered'] = [];

  const fromCanonical = normalizeOrderState(ctx.currentStage || 'DRAFT');
  const toCanonical = normalizeOrderState(ctx.targetStage);

  // 1. Strict Adjacency Transition Graph Validation (when moving across distinct stages)
  if (ctx.currentStage && ctx.currentStage !== ctx.targetStage && fromCanonical !== toCanonical) {
    const allowed = ALLOWED_TRANSITIONS[fromCanonical] || [];
    if (!allowed.includes(toCanonical)) {
      return {
        valid: false,
        errorCode: ORDER_ERROR_CODES.ERR_INVALID_STAGE_TRANSITION,
        errorMessage: `State Machine Gate Blocked: Transition from state "${ctx.currentStage}" (${fromCanonical}) to "${ctx.targetStage}" (${toCanonical}) is structurally forbidden. Valid next states from ${fromCanonical}: [${allowed.join(', ') || 'NONE - Terminal State'}].`
      };
    }
  }

  // 2. Stage 1: PO Received / Submitted (Sales/Order Desk entry)
  if (toCanonical === 'SUBMITTED' || ctx.targetStage === 'PO_RECEIVED') {
    // 1. Drawing Revision Check (Gate 1)
    const drawRes = validateDrawingRevision(ctx.orderDrawingRevision, ctx.masterDrawingRevision, ctx.partCode);
    if (!drawRes.valid) return drawRes;

    // 2. Customer Credit Hold Check
    const creditRes = validateCustomerCredit(
      ctx.isCustomerOverdue90Days, 
      ctx.customerName, 
      ctx.creditHoldOverrideBy, 
      ctx.creditHoldOverrideReason
    );
    if (!creditRes.valid) return creditRes;
    if (creditRes.autoActionsTriggered) autoActions.push(...creditRes.autoActionsTriggered);

    // 3. Blanket PO Call-off check
    if (ctx.subType === 'BLANKET_CALLOFF') {
      const bRes = validateBlanketPoCallOff(ctx.subType, ctx.orderQty || 0, ctx.blanketPoBalanceQty);
      if (!bRes.valid) return bRes;
    }
  }

  // 3. Stage 2: Approved & Released to Production (Production Planner)
  if (toCanonical === 'APPROVED' || toCanonical === 'RELEASED' || ctx.targetStage === 'CONFIRMED') {
    // 1. Second Gate: Drawing Revision Check
    const drawRes = validateDrawingRevision(ctx.orderDrawingRevision, ctx.masterDrawingRevision, ctx.partCode);
    if (!drawRes.valid) return drawRes;

    // 2. Second Gate: Customer Credit Hold Check
    const creditRes = validateCustomerCredit(
      ctx.isCustomerOverdue90Days, 
      ctx.customerName, 
      ctx.creditHoldOverrideBy, 
      ctx.creditHoldOverrideReason
    );
    if (!creditRes.valid) return creditRes;
    if (creditRes.autoActionsTriggered) autoActions.push(...creditRes.autoActionsTriggered);
  }

  // 4. Stage 3: Material Availability Check (Store Keeper)
  if (toCanonical === 'MATERIAL_CHECK' || ctx.targetStage === 'MATERIAL_CHECKED') {
    if (ctx.requiredMaterialQty !== undefined && ctx.availableStockQty !== undefined) {
      const matRes = validateMaterialAvailability(
        ctx.requiredMaterialQty, 
        ctx.availableStockQty, 
        ctx.partCode, 
        ctx.poNo
      );
      if (!matRes.valid) return matRes;
      if (matRes.autoActionsTriggered) autoActions.push(...matRes.autoActionsTriggered);
    }
  }

  // 5. Stage 4: Job Card Release & Material Issue (Heat/Lot Number Captured)
  if (toCanonical === 'JOB_RELEASED' || toCanonical === 'IN_PRODUCTION' || ctx.targetStage === 'MATERIAL_ISSUED') {
    // Block release directly from procurement pending
    if (fromCanonical === 'PROCUREMENT_PENDING') {
      return {
        valid: false,
        errorCode: ORDER_ERROR_CODES.ERR_MATERIAL_NOT_READY,
        errorMessage: `Procurement Dependency Blocked: Cannot release job card while raw materials are in PROCUREMENT_PENDING status. Inward GRN is required before production release.`
      };
    }

    if (ctx.heatLotNumber !== undefined) {
      const heatRes = validateHeatLotNumber(ctx.heatLotNumber);
      if (!heatRes.valid) return heatRes;
    }
  }

  // 6. Stage 6 & 7: QC Clearance, PDI & Ready to Dispatch (Hard Block on Open NCRs)
  if (toCanonical === 'QC' || toCanonical === 'PDI' || toCanonical === 'PDI_COMPLETE' || toCanonical === 'READY_FOR_DISPATCH' || ctx.targetStage === 'QC_INSPECTION' || ctx.targetStage === 'READY_TO_DISPATCH') {
    const ncrRes = validateNoOpenNcrs(ctx.linkedOpenNcrs);
    if (!ncrRes.valid) return ncrRes;
  }

  // 6a. PRD v1.0: PDI requires QC Report uploaded
  if (toCanonical === 'PDI' || toCanonical === 'PDI_COMPLETE') {
    if (ctx.hasQcReport === false) {
      return {
        valid: false,
        errorCode: ORDER_ERROR_CODES.ERR_QC_REPORT_NOT_UPLOADED,
        errorMessage: `PDI Gate Blocked: QC Report must be uploaded and passed before PDI can proceed. Upload the Quality Report first.`
      };
    }
  }

  // 7. Stage 9: Sales Invoice Generation (Validate Invoiced Qty vs Dispatched Qty)
  if (toCanonical === 'INVOICED' || toCanonical === 'INVOICE_GENERATED' || ctx.targetStage === 'INVOICED') {
    if (ctx.dispatchedQty !== undefined && ctx.invoicedQty !== undefined) {
      const invRes = validateInvoiceQuantity(
        ctx.dispatchedQty, 
        ctx.invoicedQty, 
        ctx.invoiceOverrideReason, 
        ctx.actorName
      );
      if (!invRes.valid) return invRes;
      if (invRes.autoActionsTriggered) autoActions.push(...invRes.autoActionsTriggered);
    }
  }

  // 8. PRD v1.0 Hard Gate: Mark In Transit requires Challan generated
  if (toCanonical === 'IN_TRANSIT') {
    if (ctx.hasChallan === false) {
      return {
        valid: false,
        errorCode: ORDER_ERROR_CODES.ERR_CHALLAN_NOT_GENERATED,
        errorMessage: `Dispatch Gate Blocked: A Delivery Challan must be generated before marking goods as In Transit.`
      };
    }
  }

  // 9. PRD v1.0 Hard Gate: Mark Delivered requires POD document
  if (toCanonical === 'DELIVERED' || ctx.targetStage === 'DELIVERED') {
    const podRes = validatePodRequired(ctx.podDocumentUrl);
    if (!podRes.valid) return podRes;
  }

  // 10. PRD v1.0 Hard Gate: Mark Order Closed requires Delivered + Full Payment
  if (toCanonical === 'COMPLETED' || ctx.targetStage === 'CLOSED') {
    const closeRes = validateOrderClosure(fromCanonical, ctx.paymentStatus, ctx.outstandingAmount);
    if (!closeRes.valid) return closeRes;
  }

  // 11. PRD v1.0: Change Order Gate — block amendment if Job Cards exist (unless Owner override)
  if (ctx.isPriceChanged || ctx.targetStage === 'DRAFT') {
    if (ctx.hasLinkedJobCards && !ctx.isOwnerOverride && fromCanonical !== 'DRAFT') {
      return {
        valid: false,
        errorCode: ORDER_ERROR_CODES.ERR_JOB_CARDS_EXIST_CHANGE_ORDER,
        errorMessage: `Change Order Gate Blocked: Cannot amend order — Job Cards already exist. Only Owner can override this gate.`
      };
    }
  }

  // Amendments (price change approval)
  if (ctx.isPriceChanged) {
    const amendRes = validateAmendmentApproval(ctx.isPriceChanged, ctx.priceChangeApprovedBy, ctx.actorRole);
    if (!amendRes.valid) return amendRes;
  }

  return {
    valid: true,
    autoActionsTriggered: autoActions.length > 0 ? autoActions : undefined
  };
}

// ============================================================================
// PRD v1.0: Hard Gate Validator Functions
// ============================================================================

/**
 * PRD v1.0 Hard Gate: POD (Proof of Delivery) required for "Mark Delivered" transition.
 * Server-side reject if POD attachment is missing.
 */
export function validatePodRequired(podDocumentUrl?: string): TransitionValidationResult {
  if (!podDocumentUrl || podDocumentUrl.trim() === '') {
    return {
      valid: false,
      errorCode: ORDER_ERROR_CODES.ERR_POD_REQUIRED,
      errorMessage: `Delivery Gate Blocked: A Proof of Delivery (POD/E-POD) document must be attached before marking as Delivered. Upload the POD document first.`
    };
  }
  return { valid: true };
}

/**
 * PRD v1.0 Hard Gate: Order Closure requires Delivered status AND full payment.
 */
export function validateOrderClosure(
  currentState: CanonicalOrderState,
  paymentStatus?: 'UNPAID' | 'PARTIAL' | 'PAID',
  outstandingAmount?: number
): TransitionValidationResult {
  // Must be delivered first
  const deliveredStates: CanonicalOrderState[] = ['DELIVERED', 'PAYMENT_PENDING', 'INVOICED'];
  if (!deliveredStates.includes(currentState)) {
    return {
      valid: false,
      errorCode: ORDER_ERROR_CODES.ERR_ORDER_NOT_DELIVERED,
      errorMessage: `Closure Gate Blocked: Order must be in Delivered/Invoiced status before closing. Current status: ${currentState}.`
    };
  }

  // Must have full payment
  if (paymentStatus && paymentStatus !== 'PAID') {
    return {
      valid: false,
      errorCode: ORDER_ERROR_CODES.ERR_PAYMENT_INCOMPLETE,
      errorMessage: `Closure Gate Blocked: Full payment is required before closing this order. Current payment status: ${paymentStatus}. Outstanding: ₹${outstandingAmount?.toLocaleString('en-IN') ?? '0'}.`
    };
  }

  return { valid: true };
}

/**
 * PRD v1.0: Change Order validation — blocks amendment if Job Cards exist unless Owner override.
 */
export function validateChangeOrder(
  hasLinkedJobCards: boolean,
  isOwnerOverride: boolean,
  actorRole: string
): TransitionValidationResult {
  if (hasLinkedJobCards && !isOwnerOverride) {
    return {
      valid: false,
      errorCode: ORDER_ERROR_CODES.ERR_JOB_CARDS_EXIST_CHANGE_ORDER,
      errorMessage: `Change Order Gate Blocked: Job Cards already exist for this order. Only the Owner can override this restriction. Current actor role: ${actorRole}.`
    };
  }
  return { valid: true };
}
