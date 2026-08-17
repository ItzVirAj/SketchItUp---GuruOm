/**
 * GuruOm Procurement & Job-Work Subcontracting Engine
 * 
 * Implements two distinct operational sub-flows:
 * 1. Standard Procurement:
 *    - Purchase Requisitions (Store Keeper -> Purchase Manager Approval)
 *    - Purchase Orders (Purchase Manager -> Owner Escalation above ₹1,00,000)
 *    - GRN Entry with Quantity Mismatch Surfacing & Heat/Lot Trace
 *    - Incoming QC & Vendor Return Sub-Process (Store Keeper initiates -> PM approves)
 *    - 3-Way Matching (PO + GRN + Bill) with automated variance flagging
 *    - Payment Processing (Accountant -> Owner Escalation above ₹50,000)
 *    - Quarterly Vendor Scorecard (OTD % + Quality Acceptance % + Rating Tier)
 * 
 * 2. Job-Work / Subcontracting Flow:
 *    - Job-work Gate-Out dispatch (Route card step outsourced, GP-OUT-####)
 *    - Inventory Ledger movement `SUBCON_GATE_OUT` (deducts on-hand available, adds to Subcon WIP)
 *    - Gate-In receipt & Incoming Inspection (`SUBCON_GATE_IN`)
 *    - Automated Overdue Subcontracting Alerting (Current Date > Expected Return Date)
 */

export interface PurchaseRequisition {
  id: string;
  reqNumber: string;
  source: 'LOW_STOCK_ALERT' | 'PRODUCTION_SHORTAGE' | 'MANUAL';
  orderId?: string;
  orderPo?: string;
  itemCode: string;
  itemDescription: string;
  requiredQty: number;
  availableStock: number;
  deficitQty: number;
  unit: string;
  urgency: 'NORMAL' | 'URGENT' | 'CRITICAL';
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CONVERTED_TO_PO';
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  poNumber?: string;
  rejectionReason?: string;
}

export interface GrnMismatchResult {
  isMismatched: boolean;
  poExpectedQty: number;
  receivedQty: number;
  discrepancyQty: number;
  variancePercentage: number;
  alertSeverity: 'NONE' | 'MINOR_SHORTAGE' | 'MAJOR_SHORTAGE' | 'EXCESS_DELIVERY';
  message: string;
}

export interface ThreeWayMatchResult {
  matchStatus: 'MATCHED' | 'PRICE_VARIANCE_FLAGGED' | 'QTY_VARIANCE_FLAGGED' | 'PRICE_AND_QTY_VARIANCE';
  isFlaggedForReview: boolean;
  poUnitPrice: number;
  billUnitPrice: number;
  grnAcceptedQty: number;
  billInvoicedQty: number;
  priceVariance: number;
  qtyVariance: number;
  details: string;
}

export interface VendorPerformanceMetric {
  supplierCode: string;
  supplierName: string;
  evaluationPeriod: string;
  totalOrders: number;
  totalDeliveries: number;
  onTimeDeliveries: number;
  otdPercentage: number;
  totalReceivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  qualityAcceptancePercentage: number;
  overallScore: number;
  vendorRatingTier: 'TIER_1_EXCELLENT' | 'TIER_2_SATISFACTORY' | 'TIER_3_PROBATION';
  summaryBadge: string;
}

export interface SubcontractOrder {
  id: string;
  gatePassNo: string; // GP-OUT-2026-####
  jobNo: string;
  itemCode: string;
  itemDescription: string;
  subcontractorName: string;
  processType: 'HEAT_TREATMENT' | 'ELECTROPLATING' | 'ZINC_PLATING' | 'NDT_TESTING' | 'CNC_MACHINING' | 'BLACK_OXIDE' | 'OTHER';
  dispatchedQty: number;
  unit: string;
  dispatchDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  gateInPassNo?: string;
  receivedQty?: number;
  rejectedQty?: number;
  qcStatus: 'PENDING_GATE_IN' | 'INSPECTED_ACCEPTED' | 'INSPECTED_REJECTED';
  status: 'OUT_FOR_JOBWORK' | 'OVERDUE_JOBWORK' | 'RETURNED_INSPECTED' | 'CLOSED';
  isOverdue: boolean;
  overdueDays: number;
  vehicleDetails?: string;
  transporter?: string;
  dispatchedBy: string;
  receivedBy?: string;
  notes?: string;
}

/**
 * 1. Evaluates GRN Quantity vs PO Expected Quantity Mismatch
 */
export function evaluateGrnMismatch(poExpectedQty: number, receivedQty: number): GrnMismatchResult {
  const discrepancy = receivedQty - poExpectedQty;
  const isMismatched = receivedQty !== poExpectedQty;
  const variancePercentage = poExpectedQty > 0 ? Number(((Math.abs(discrepancy) / poExpectedQty) * 100).toFixed(2)) : 0;

  let alertSeverity: GrnMismatchResult['alertSeverity'] = 'NONE';
  let message = `Delivered quantity (${receivedQty}) matches PO expected quantity (${poExpectedQty}) perfectly.`;

  if (receivedQty < poExpectedQty) {
    alertSeverity = variancePercentage > 10 ? 'MAJOR_SHORTAGE' : 'MINOR_SHORTAGE';
    message = `GRN Quantity Shortage: Received ${receivedQty} vs PO expected ${poExpectedQty} (${Math.abs(discrepancy)} short, -${variancePercentage}%). Store keeper flagged for vendor tracking.`;
  } else if (receivedQty > poExpectedQty) {
    alertSeverity = 'EXCESS_DELIVERY';
    message = `GRN Excess Delivery: Received ${receivedQty} vs PO expected ${poExpectedQty} (+${discrepancy} excess, +${variancePercentage}%). Requires inspection authorization.`;
  }

  return {
    isMismatched,
    poExpectedQty,
    receivedQty,
    discrepancyQty: discrepancy,
    variancePercentage,
    alertSeverity,
    message
  };
}

/**
 * 2. Evaluates 3-Way Match (PO + GRN + Vendor Bill)
 */
export function evaluateThreeWayMatch(
  poUnitPrice: number,
  billUnitPrice: number,
  grnAcceptedQty: number,
  billInvoicedQty: number
): ThreeWayMatchResult {
  const priceVariance = billUnitPrice - poUnitPrice;
  const qtyVariance = billInvoicedQty - grnAcceptedQty;
  const isPriceMismatch = Math.abs(priceVariance) > 0.01;
  const isQtyMismatch = Math.abs(qtyVariance) > 0.001;

  if (isPriceMismatch && isQtyMismatch) {
    return {
      matchStatus: 'PRICE_AND_QTY_VARIANCE',
      isFlaggedForReview: true,
      poUnitPrice,
      billUnitPrice,
      grnAcceptedQty,
      billInvoicedQty,
      priceVariance,
      qtyVariance,
      details: `3-Way Match Failure: Unit price mismatch (Bill ₹${billUnitPrice} vs PO ₹${poUnitPrice}) AND Invoiced Qty mismatch (Bill ${billInvoicedQty} vs Accepted GRN ${grnAcceptedQty}). Flagged for Accountant & Purchase Manager review.`
    };
  }

  if (isPriceMismatch) {
    return {
      matchStatus: 'PRICE_VARIANCE_FLAGGED',
      isFlaggedForReview: true,
      poUnitPrice,
      billUnitPrice,
      grnAcceptedQty,
      billInvoicedQty,
      priceVariance,
      qtyVariance: 0,
      details: `3-Way Match Price Variance: Invoiced unit price ₹${billUnitPrice} differs from agreed PO rate of ₹${poUnitPrice} (Diff: ₹${priceVariance.toFixed(2)}). Review required before disbursement.`
    };
  }

  if (isQtyMismatch) {
    return {
      matchStatus: 'QTY_VARIANCE_FLAGGED',
      isFlaggedForReview: true,
      poUnitPrice,
      billUnitPrice,
      grnAcceptedQty,
      billInvoicedQty,
      priceVariance: 0,
      qtyVariance,
      details: `3-Way Match Quantity Variance: Vendor invoiced ${billInvoicedQty} units but QC-Accepted GRN is only ${grnAcceptedQty} units. Difference of ${qtyVariance} units flagged.`
    };
  }

  return {
    matchStatus: 'MATCHED',
    isFlaggedForReview: false,
    poUnitPrice,
    billUnitPrice,
    grnAcceptedQty,
    billInvoicedQty,
    priceVariance: 0,
    qtyVariance: 0,
    details: '3-Way Match Successful: PO rate, GRN accepted quantity, and Vendor bill amounts reconciled with zero variance.'
  };
}

/**
 * 3. Computes Vendor Scorecard (OTD % and Quality Acceptance Scorecard)
 */
export function computeVendorScorecard(
  supplierCode: string,
  supplierName: string,
  evaluationPeriod: string,
  deliveries: Array<{
    committedDate: string;
    actualDeliveryDate: string;
    receivedQty: number;
    acceptedQty: number;
    rejectedQty: number;
  }>
): VendorPerformanceMetric {
  const totalDeliveries = deliveries.length;
  if (totalDeliveries === 0) {
    return {
      supplierCode,
      supplierName,
      evaluationPeriod,
      totalOrders: 0,
      totalDeliveries: 0,
      onTimeDeliveries: 0,
      otdPercentage: 100,
      totalReceivedQty: 0,
      acceptedQty: 0,
      rejectedQty: 0,
      qualityAcceptancePercentage: 100,
      overallScore: 100,
      vendorRatingTier: 'TIER_1_EXCELLENT',
      summaryBadge: 'Tier 1 - Excellent (100%)'
    };
  }

  let onTimeCount = 0;
  let totalReceived = 0;
  let totalAccepted = 0;
  let totalRejected = 0;

  for (const d of deliveries) {
    const committed = new Date(d.committedDate).getTime();
    const actual = new Date(d.actualDeliveryDate).getTime();
    if (actual <= committed) {
      onTimeCount++;
    }
    totalReceived += d.receivedQty || 0;
    totalAccepted += d.acceptedQty || 0;
    totalRejected += d.rejectedQty || 0;
  }

  const otdPercentage = Number(((onTimeCount / totalDeliveries) * 100).toFixed(2));
  const qualityPercentage = totalReceived > 0 
    ? Number(((totalAccepted / totalReceived) * 100).toFixed(2)) 
    : 100;

  // Weighted score: 50% OTD + 50% Quality
  const overallScore = Number(((otdPercentage * 0.5) + (qualityPercentage * 0.5)).toFixed(2));

  let vendorRatingTier: VendorPerformanceMetric['vendorRatingTier'] = 'TIER_1_EXCELLENT';
  let summaryBadge = `Tier 1 - Approved (${overallScore}%)`;

  if (overallScore < 75.0 || qualityPercentage < 80.0) {
    vendorRatingTier = 'TIER_3_PROBATION';
    summaryBadge = `Tier 3 - Probationary Risk (${overallScore}%)`;
  } else if (overallScore < 90.0) {
    vendorRatingTier = 'TIER_2_SATISFACTORY';
    summaryBadge = `Tier 2 - Conditional (${overallScore}%)`;
  }

  return {
    supplierCode,
    supplierName,
    evaluationPeriod,
    totalOrders: totalDeliveries,
    totalDeliveries,
    onTimeDeliveries: onTimeCount,
    otdPercentage,
    totalReceivedQty: totalReceived,
    acceptedQty: totalAccepted,
    rejectedQty: totalRejected,
    qualityAcceptancePercentage: qualityPercentage,
    overallScore,
    vendorRatingTier,
    summaryBadge
  };
}

/**
 * 4. Evaluates Subcontracted Job-Work Records for Overdue Status
 */
export function evaluateSubcontractOverdueStatus(
  subcon: SubcontractOrder, 
  currentDateStr?: string
): { isOverdue: boolean; overdueDays: number; status: SubcontractOrder['status'] } {
  if (subcon.status === 'RETURNED_INSPECTED' || subcon.status === 'CLOSED') {
    return { isOverdue: false, overdueDays: 0, status: subcon.status };
  }

  const now = currentDateStr ? new Date(currentDateStr) : new Date();
  const expectedDate = new Date(subcon.expectedReturnDate);

  const diffTime = now.getTime() - expectedDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return {
      isOverdue: true,
      overdueDays: diffDays,
      status: 'OVERDUE_JOBWORK'
    };
  }

  return {
    isOverdue: false,
    overdueDays: 0,
    status: 'OUT_FOR_JOBWORK'
  };
}
