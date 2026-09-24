/**
 * GuruOm Statutory Invoicing, Accounting & Order Costing Engine
 * 
 * Implements:
 * 1. GSTIN (15-char) validation & Dynamic E-Invoicing Threshold Check (> ₹5 Cr).
 * 2. HSN Code & Master-driven GST Rates (0, 5, 12, 18, 28%) with override reason logging.
 * 3. TDS Section 194C (Job-work/Contractor/Manpower) & Section 194Q (Purchase of Goods) withholding.
 * 4. Document Numbering Series: Prefix + Financial Year (starts April 1st) + Running Sequence.
 * 5. Job/Order-wise Costing (Material Cost + Labor Cost + Configurable Overhead % => Profitability %).
 * 6. Customer Credit Control (>90 days overdue => Credit Hold).
 */

export const STATUTORY_ERROR_CODES = {
  ERR_INVALID_GSTIN: 'ERR_INVALID_GSTIN',
  ERR_INVALID_HSN: 'ERR_INVALID_HSN',
  ERR_GST_RATE_OVERRIDE_REASON_REQUIRED: 'ERR_GST_RATE_OVERRIDE_REASON_REQUIRED',
  ERR_TDS_PAN_REQUIRED: 'ERR_TDS_PAN_REQUIRED',
  ERR_CUSTOMER_CREDIT_HOLD: 'ERR_CUSTOMER_CREDIT_HOLD'
} as const;

export type StatutoryErrorCode = typeof STATUTORY_ERROR_CODES[keyof typeof STATUTORY_ERROR_CODES];

// Indian GSTIN 15-char regex
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
// Indian HSN Code (4 to 8 digits)
export const HSN_REGEX = /^[0-9]{4,8}$/;
// Indian PAN (10-char alphanumeric)
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export interface TdsCalculationResult {
  tdsSection: '194C' | '194Q' | 'NONE';
  tdsRate: number; // percentage
  grossAmount: number;
  tdsAmount: number;
  netPayableAmount: number;
  panStatus: 'VALID_PAN' | 'INVALID_PAN_PENALTY_20_PERCENT';
  remarks: string;
}

export interface OrderCostingResult {
  orderRevenue: number;
  directMaterialCost: number;
  laborMinutes: number;
  laborHourlyRate: number;
  directLaborCost: number;
  primeCost: number;
  overheadPercentage: number;
  overheadCost: number;
  totalCost: number;
  grossMarginAmount: number;
  profitabilityPercentage: number;
}

/**
 * 1. Validates GSTIN format (15 characters, standard Indian state code + PAN + entity code)
 */
export function validateGstin(gstin?: string): { valid: boolean; isExempt: boolean; errorCode?: StatutoryErrorCode; errorMessage?: string } {
  if (!gstin || gstin.trim() === '') {
    return {
      valid: false,
      isExempt: false,
      errorCode: STATUTORY_ERROR_CODES.ERR_INVALID_GSTIN,
      errorMessage: 'GSTIN cannot be empty.'
    };
  }

  if (gstin.startsWith('N/A') || gstin.toLowerCase().includes('exempt')) {
    return { valid: true, isExempt: true };
  }

  if (!GSTIN_REGEX.test(gstin.trim())) {
    return {
      valid: false,
      isExempt: false,
      errorCode: STATUTORY_ERROR_CODES.ERR_INVALID_GSTIN,
      errorMessage: `Invalid GSTIN '${gstin}'. GSTIN must be a 15-character statutory format (e.g. 27ABCDE1234F1Z5).`
    };
  }

  return { valid: true, isExempt: false };
}

/**
 * 2. Dynamic E-Invoicing Turnover Threshold Gate
 */
export function isEInvoiceApplicable(annualTurnover: number, threshold = 50000000.00): {
  isApplicable: boolean;
  threshold: number;
  annualTurnover: number;
  message: string;
} {
  const isApplicable = annualTurnover >= threshold;
  return {
    isApplicable,
    threshold,
    annualTurnover,
    message: isApplicable 
      ? `E-Invoicing is MANDATORY: Annual turnover (₹${(annualTurnover / 10000000).toFixed(2)} Cr) exceeds statutory threshold of ₹${(threshold / 10000000).toFixed(2)} Cr.`
      : `E-Invoicing is not mandatory: Annual turnover (₹${(annualTurnover / 10000000).toFixed(2)} Cr) is below threshold of ₹${(threshold / 10000000).toFixed(2)} Cr.`
  };
}

/**
 * 3. HSN and Master-Driven GST Rate Validation
 */
export function validateInvoiceLineGst(
  itemMasterGst: number,
  invoiceLineGst: number,
  overrideReason?: string
): { valid: boolean; errorCode?: StatutoryErrorCode; errorMessage?: string } {
  if (itemMasterGst === invoiceLineGst) {
    return { valid: true };
  }

  if (!overrideReason || overrideReason.trim().length < 5) {
    return {
      valid: false,
      errorCode: STATUTORY_ERROR_CODES.ERR_GST_RATE_OVERRIDE_REASON_REQUIRED,
      errorMessage: `GST rate override blocked: Invoiced GST rate (${invoiceLineGst}%) differs from master rate (${itemMasterGst}%). An explicit reason for statutory override is mandatory.`
    };
  }

  return { valid: true };
}

/**
 * 4. TDS Calculation for Vendor Bills (Section 194C & Section 194Q)
 */
export function calculateVendorBillTds(params: {
  vendorType: string;
  vendorPan?: string;
  grossAmount: number;
  isPurchaseOfGoods?: boolean;
  cumulativeAnnualPurchases?: number;
}): TdsCalculationResult {
  const { vendorType, vendorPan, grossAmount, isPurchaseOfGoods = false, cumulativeAnnualPurchases = 0 } = params;

  // 1. Check Section 194C: Subcontractors, Job-Workers, Manpower Providers
  const isSubcontractorOrContractor = 
    vendorType === 'Subcontractor/Job-Worker' || 
    vendorType === 'Manpower Provider' || 
    vendorType === 'Transporter' ||
    vendorType === 'ServiceProvider';

  if (isSubcontractorOrContractor) {
    // Check PAN validity
    const hasValidPan = vendorPan && PAN_REGEX.test(vendorPan.trim());

    if (!hasValidPan) {
      // Section 206AA penal rate of 20% for invalid/missing PAN
      const tdsRate = 20.0;
      const tdsAmount = Number(((grossAmount * tdsRate) / 100).toFixed(2));
      return {
        tdsSection: '194C',
        tdsRate,
        grossAmount,
        tdsAmount,
        netPayableAmount: Number((grossAmount - tdsAmount).toFixed(2)),
        panStatus: 'INVALID_PAN_PENALTY_20_PERCENT',
        remarks: 'TDS Section 194C: 20% higher withholding applied under Section 206AA due to missing/invalid PAN.'
      };
    }

    // Determine 1% (Individual/HUF - 4th char 'P') vs 2% (Company/LLP/Firm)
    const panFourthChar = vendorPan!.trim().charAt(3).toUpperCase();
    const isIndividual = panFourthChar === 'P';
    const tdsRate = isIndividual ? 1.0 : 2.0;
    const tdsAmount = Number(((grossAmount * tdsRate) / 100).toFixed(2));

    return {
      tdsSection: '194C',
      tdsRate,
      grossAmount,
      tdsAmount,
      netPayableAmount: Number((grossAmount - tdsAmount).toFixed(2)),
      panStatus: 'VALID_PAN',
      remarks: `TDS Section 194C: ${tdsRate}% withheld on ${isIndividual ? 'Individual/HUF' : 'Company/Firm'} contractor payment.`
    };
  }

  // 2. Check Section 194Q: Purchase of Goods exceeding ₹50 Lakhs annual threshold
  if (isPurchaseOfGoods && (cumulativeAnnualPurchases + grossAmount) > 5000000) {
    const tdsRate = 0.1; // 0.1% for purchase of goods > 50L
    const tdsAmount = Number(((grossAmount * tdsRate) / 100).toFixed(2));

    return {
      tdsSection: '194Q',
      tdsRate,
      grossAmount,
      tdsAmount,
      netPayableAmount: Number((grossAmount - tdsAmount).toFixed(2)),
      panStatus: 'VALID_PAN',
      remarks: 'TDS Section 194Q: 0.1% withheld on goods purchases exceeding ₹50 Lakhs annual threshold.'
    };
  }

  return {
    tdsSection: 'NONE',
    tdsRate: 0,
    grossAmount,
    tdsAmount: 0,
    netPayableAmount: grossAmount,
    panStatus: 'VALID_PAN',
    remarks: 'No statutory TDS applicable.'
  };
}

/**
 * 5. Computes Indian Financial Year Code (April 1st to March 31st)
 * E.g., Date 2026-08-15 => FY 2026-2027 => "2627"
 *       Date 2026-02-10 => FY 2025-2026 => "2526"
 */
export function getCurrentFinancialYear(dateInput?: Date | string): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  const month = date.getMonth(); // 0 = Jan, 3 = April
  const year = date.getFullYear();

  let startYear: number;
  let endYear: number;

  if (month >= 3) {
    // April to December
    startYear = year;
    endYear = year + 1;
  } else {
    // January to March
    startYear = year - 1;
    endYear = year;
  }

  const startStr = String(startYear % 100).padStart(2, '0');
  const endStr = String(endYear % 100).padStart(2, '0');
  return `${startStr}${endStr}`;
}

/**
 * 6. Generates Document Number in exact Prefix-FY-RunningNumber format
 */
export function formatDocumentNumber(prefix: string, fy: string, runningNumber: number, padding = 4): string {
  const padded = String(runningNumber).padStart(padding, '0');
  return `${prefix}-${fy}-${padded}`;
}

/**
 * 7. Job/Order-Wise Costing & Profitability Calculation
 */
export function calculateOrderCosting(params: {
  orderRevenue: number;
  directMaterialCost: number;
  laborMinutes: number;
  laborHourlyRate?: number; // default ₹300/hr
  overheadPercentage?: number; // default 18%
}): OrderCostingResult {
  const { 
    orderRevenue, 
    directMaterialCost, 
    laborMinutes, 
    laborHourlyRate = 300.0, 
    overheadPercentage = 18.0 
  } = params;

  const directLaborCost = Number(((laborMinutes / 60) * laborHourlyRate).toFixed(2));
  const primeCost = Number((directMaterialCost + directLaborCost).toFixed(2));
  const overheadCost = Number((primeCost * (overheadPercentage / 100)).toFixed(2));
  const totalCost = Number((primeCost + overheadCost).toFixed(2));
  const grossMarginAmount = Number((orderRevenue - totalCost).toFixed(2));
  const profitabilityPercentage = orderRevenue > 0 
    ? Number(((grossMarginAmount / orderRevenue) * 100).toFixed(2)) 
    : 0;

  return {
    orderRevenue,
    directMaterialCost,
    laborMinutes,
    laborHourlyRate,
    directLaborCost,
    primeCost,
    overheadPercentage,
    overheadCost,
    totalCost,
    grossMarginAmount,
    profitabilityPercentage
  };
}

/**
 * 8. Automatic Intra-State (CGST + SGST) vs Inter-State (IGST) Tax Engine
 * Determines tax classification based on Buyer State code vs Seller Base (27 - Maharashtra).
 */
export function calculateGstTaxSplit(params: {
  taxableAmount: number;
  gstRate: number;
  sellerStateCode?: string; // default '27' (Maharashtra)
  buyerGstin?: string;
  buyerStateCode?: string;
}): {
  isIntraState: boolean;
  buyerStateCode: string;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGstAmount: number;
  totalAmount: number;
} {
  const sellerState = (params.sellerStateCode || '27').trim();
  let buyerState = (params.buyerStateCode || '').trim();
  if (!buyerState && params.buyerGstin && params.buyerGstin.trim().length >= 2) {
    buyerState = params.buyerGstin.trim().substring(0, 2);
  }
  if (!buyerState) {
    buyerState = sellerState; // default intra-state if unassigned
  }

  const isIntraState = sellerState === buyerState;
  const taxable = Number(params.taxableAmount || 0);
  const rate = Number(params.gstRate ?? 18);
  const totalGst = Number(((taxable * rate) / 100).toFixed(2));

  if (isIntraState) {
    const halfRate = rate / 2;
    const halfGst = Number((totalGst / 2).toFixed(2));
    return {
      isIntraState: true,
      buyerStateCode: buyerState,
      cgstRate: halfRate,
      sgstRate: halfRate,
      igstRate: 0,
      cgstAmount: halfGst,
      sgstAmount: halfGst,
      igstAmount: 0,
      totalGstAmount: totalGst,
      totalAmount: Number((taxable + totalGst).toFixed(2))
    };
  } else {
    return {
      isIntraState: false,
      buyerStateCode: buyerState,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: rate,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: totalGst,
      totalGstAmount: totalGst,
      totalAmount: Number((taxable + totalGst).toFixed(2))
    };
  }
}
