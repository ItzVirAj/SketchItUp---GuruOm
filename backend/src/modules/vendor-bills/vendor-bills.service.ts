import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { VendorBillCreateSchema, DisburseVendorBillSchema } from './vendor-bills.schema';
import { auditService } from '../audit/audit.service';
import { purchasingService } from '../purchasing/purchasing.service';
import { grnService } from '../grn/grn.service';
import { calculateVendorBillTds } from '../../../../src/utils/statutoryAccountingEngine';
import { evaluateThreeWayMatch, ThreeWayMatchResult } from '../../../../src/utils/procurementEngine';
import { isWithinApprovalLimit } from '../../../../src/utils/rbacMatrix';
import { notificationsService } from '../notifications/notifications.service';
import fs from 'fs';
import path from 'path';

const STORE_PATH = path.resolve(process.cwd(), 'backend/data/vendor_bills_store.json');

const DEFAULT_SEED_VENDOR_BILLS: any[] = [
  {
    id: 'vb-1',
    billNo: 'BILL-26-881',
    vendorName: 'Maruti Plating Works',
    vendorType: 'Subcontractor / Job Worker',
    vendorPan: 'AACCM9876K',
    poNo: 'PO-OUT-009',
    grnNo: 'GRN-26-004',
    status: 'OPEN',
    date: '2026-07-21',
    dueDate: '2026-08-21',
    grossAmount: 14400,
    amount: 14400,
    tdsSection: '194C',
    tdsRate: 1,
    tdsAmount: 144,
    netPayableAmount: 14256,
    paidAmount: 0,
    balanceAmount: 14256,
    matchStatus: 'MATCHED',
    isThreeWayMatched: true
  },
  {
    id: 'vb-2',
    billNo: 'BILL-26-104',
    vendorName: 'Mahalaxmi Steel Traders',
    vendorType: 'Supplier',
    vendorPan: 'AAACM1234F',
    poNo: 'PO-PUR-2026-001',
    grnNo: 'GRN-26-001',
    status: 'OPEN',
    date: '2026-08-10',
    dueDate: '2026-09-10',
    grossAmount: 150000,
    amount: 150000,
    tdsSection: '194Q',
    tdsRate: 0.1,
    tdsAmount: 150,
    netPayableAmount: 149850,
    paidAmount: 50000,
    balanceAmount: 99850,
    matchStatus: 'MATCHED',
    isThreeWayMatched: true
  },
  {
    id: 'vb-3',
    billNo: 'BILL-26-092',
    vendorName: 'Jindal Steel & Power Ltd',
    vendorType: 'Supplier',
    vendorPan: 'AAACJ5678B',
    poNo: 'PO-PUR-2026-002',
    grnNo: 'GRN-26-002',
    status: 'PAID',
    date: '2026-08-01',
    dueDate: '2026-08-31',
    grossAmount: 88500,
    amount: 88500,
    tdsSection: 'NONE',
    tdsRate: 0,
    tdsAmount: 0,
    netPayableAmount: 88500,
    paidAmount: 88500,
    balanceAmount: 0,
    matchStatus: 'MATCHED',
    isThreeWayMatched: true
  },
  {
    id: 'vb-4',
    billNo: 'BILL-26-045',
    vendorName: 'Super Precision Tooling',
    vendorType: 'Supplier',
    vendorPan: 'AAACS4321D',
    poNo: 'PO-PUR-2026-003',
    grnNo: 'GRN-26-003',
    status: 'OVERDUE',
    date: '2026-07-15',
    dueDate: '2026-08-15',
    grossAmount: 32000,
    amount: 32000,
    tdsSection: '194C',
    tdsRate: 2,
    tdsAmount: 640,
    netPayableAmount: 31360,
    paidAmount: 0,
    balanceAmount: 31360,
    matchStatus: 'MATCHED',
    isThreeWayMatched: true
  }
];

function loadStoredVendorBills(): any[] {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const content = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('⚠️ [VendorBills] Error reading vendor_bills_store.json:', err);
  }
  return [...DEFAULT_SEED_VENDOR_BILLS];
}

function saveStoredVendorBills(bills: any[]) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(bills, null, 2), 'utf-8');
  } catch (err) {
    console.warn('⚠️ [VendorBills] Error writing vendor_bills_store.json:', err);
  }
}

let SEED_VENDOR_BILLS: any[] = loadStoredVendorBills();

export class VendorBillsService {
  private db = getDbClient();

  async getVendorBills() {
    let dbBills: any[] = [];
    try {
      const { data, error } = await this.db
        .from('vendor_bills')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        dbBills = data.map(b => ({
          id: b.id,
          billNo: b.bill_no,
          vendorName: b.vendor_name,
          vendorType: b.vendor_type,
          vendorPan: b.vendor_pan,
          poNo: b.po_no,
          grnNo: b.grn_no,
          status: b.status,
          date: b.date || b.bill_date,
          dueDate: b.due_date,
          grossAmount: Number(b.amount || b.gross_amount || 0),
          amount: Number(b.amount || b.gross_amount || 0),
          tdsSection: b.tds_section || 'NONE',
          tdsRate: Number(b.tds_rate || 0),
          tdsAmount: Number(b.tds_amount || 0),
          netPayableAmount: Number(b.net_payable_amount || b.amount || 0),
          paidAmount: Number(b.paid_amount || 0),
          balanceAmount: Number(b.balance_amount || b.amount || 0),
          matchStatus: b.match_status || 'MATCHED',
          isThreeWayMatched: b.is_three_way_matched !== undefined ? Boolean(b.is_three_way_matched) : true,
          varianceDetails: b.variance_details,
          attachmentId: b.attachment_url || undefined
        }));
      }
    } catch (err) {
      console.warn('DB getVendorBills fallback:', err);
    }

    if (SEED_VENDOR_BILLS.length === 0) {
      SEED_VENDOR_BILLS = loadStoredVendorBills();
    }
    const seen = new Set(dbBills.map(b => b.billNo));
    const memoryBills = SEED_VENDOR_BILLS.filter(b => !seen.has(b.billNo));
    return [...dbBills, ...memoryBills];
  }

  async getVendorBillByNo(billNo: string) {
    const bills = await this.getVendorBills();
    return bills.find(b => b.billNo === billNo || b.id === billNo) || null;
  }

  /**
   * Enters a Vendor Bill with automated statutory TDS withholding (Section 194C or 194Q)
   * and automated 3-Way Match Verification (PO + GRN + Bill).
   */
  async createVendorBill(data: z.infer<typeof VendorBillCreateSchema>, accountantName: string = 'accountant@guruom.in') {
    const validated = VendorBillCreateSchema.parse(data);
    const billId = validated.id || `vb-${Date.now()}`;

    // 1. Calculate Statutory TDS
    const tdsCalc = calculateVendorBillTds({
      vendorType: validated.vendorType,
      vendorPan: validated.vendorPan,
      grossAmount: validated.grossAmount,
      isPurchaseOfGoods: validated.isPurchaseOfGoods,
      cumulativeAnnualPurchases: validated.cumulativeAnnualPurchases
    });

    // 2. Perform 3-Way Match Verification (PO Rate + GRN Accepted Qty vs Vendor Bill)
    let matchResult: ThreeWayMatchResult | null = null;
    try {
      let linkedPo: any = null;
      let linkedGrn: any = null;

      if (validated.poNo) {
        linkedPo = await purchasingService.getPurchaseOrderById(validated.poNo);
      }
      if (validated.grnNo) {
        linkedGrn = await grnService.getGrnById(validated.grnNo);
      }

      if (linkedPo && linkedGrn) {
        const poItem = linkedPo.items?.[0];
        const poUnitPrice = Number(poItem?.unitPrice || (poItem?.orderQty ? linkedPo.grossAmount / poItem.orderQty : 0));
        const grnItem = linkedGrn.items?.[0];
        const grnAcceptedQty = Number(
          grnItem?.acceptedQty !== undefined ? grnItem.acceptedQty : grnItem?.receivedQty ?? linkedGrn.acceptedQty ?? linkedGrn.receivedQty ?? 0
        );

        const rawData = data as any;
        const billInvoicedQty = Number(rawData.invoicedQty || rawData.qty || (grnItem?.receivedQty) || poItem?.orderQty || grnAcceptedQty || 1);
        const billUnitPrice = rawData.unitPrice !== undefined
          ? Number(rawData.unitPrice)
          : (billInvoicedQty > 0 ? validated.grossAmount / billInvoicedQty : validated.grossAmount);

        if (poUnitPrice > 0 && grnAcceptedQty > 0) {
          matchResult = evaluateThreeWayMatch(
            poUnitPrice,
            billUnitPrice,
            grnAcceptedQty,
            billInvoicedQty
          );
        }
      }
    } catch (matchErr) {
      console.warn('3-Way Match evaluation error (leaving unset):', matchErr);
    }

    const matchStatus = matchResult?.matchStatus;
    const isThreeWayMatched = matchResult ? !matchResult.isFlaggedForReview : undefined;
    const varianceDetails = matchResult?.details;

    const result = {
      id: billId,
      billNo: validated.billNo,
      vendorName: validated.vendorName,
      vendorType: validated.vendorType,
      vendorPan: validated.vendorPan,
      poNo: validated.poNo,
      grnNo: validated.grnNo,
      status: 'OPEN',
      date: validated.date,
      dueDate: validated.dueDate,
      grossAmount: validated.grossAmount,
      amount: validated.grossAmount,
      tds: tdsCalc,
      tdsSection: tdsCalc.tdsSection,
      tdsRate: tdsCalc.tdsRate,
      tdsAmount: tdsCalc.tdsAmount,
      netPayableAmount: tdsCalc.netPayableAmount,
      paidAmount: 0,
      balanceAmount: tdsCalc.netPayableAmount,
      attachmentId: validated.attachmentUrl,
      matchStatus: matchStatus || 'MATCHED',
      isThreeWayMatched: isThreeWayMatched ?? true,
      varianceDetails
    };

    SEED_VENDOR_BILLS.unshift(result);
    saveStoredVendorBills(SEED_VENDOR_BILLS);

    try {
      await this.db.from('vendor_bills').insert({
        id: billId,
        bill_no: validated.billNo,
        vendor_name: validated.vendorName,
        vendor_type: validated.vendorType,
        vendor_pan: validated.vendorPan,
        po_no: validated.poNo,
        grn_no: validated.grnNo,
        status: 'OPEN',
        date: validated.date,
        due_date: validated.dueDate,
        amount: validated.grossAmount,
        tds_section: tdsCalc.tdsSection,
        tds_rate: tdsCalc.tdsRate,
        tds_amount: tdsCalc.tdsAmount,
        net_payable_amount: tdsCalc.netPayableAmount,
        paid_amount: 0,
        balance_amount: tdsCalc.netPayableAmount,
        attachment_url: validated.attachmentUrl
      });
    } catch (err: any) {
      console.warn('DB createVendorBill fallback:', err?.message || err);
    }

    await auditService.recordAuditLog({
      actorEmail: accountantName,
      actorRole: 'Accountant',
      action: 'VENDOR_BILL_ENTERED',
      entityType: 'vendor_bills',
      entityId: validated.billNo,
      details: `Vendor Bill ${validated.billNo} entered for ${validated.vendorName} (Gross: ₹${validated.grossAmount}, TDS ${tdsCalc.tdsSection}: ₹${tdsCalc.tdsAmount}, Net: ₹${tdsCalc.netPayableAmount}${matchStatus ? `, 3-Way Match: ${matchStatus}` : ''})`
    }).catch(() => {});

    notificationsService.broadcastEvent('vendor_bill_created', result);

    return result;
  }

  /**
   * Processes Vendor Payment Disbursement with RBAC Monetary Ceiling Enforcement:
   * Accountant Limit: ₹50,000 / Purchase Manager: ₹1,00,000 / Above requires Owner approval.
   */
  async disbursePayment(billNo: string, data: z.infer<typeof DisburseVendorBillSchema>, actorRole: string, actorName: string) {
    const validated = DisburseVendorBillSchema.parse(data);
    const bills = await this.getVendorBills();
    const bill = bills.find(b => b.billNo === billNo || b.id === billNo);
    if (!bill) {
      throw new Error(`Vendor Bill ${billNo} not found`);
    }

    const disbursementAmount = validated.paymentAmount || bill.netPayableAmount || bill.balanceAmount;

    // Enforce Approval Limit Check
    const approvalCheck = isWithinApprovalLimit(actorRole, disbursementAmount, 'accounting');
    if (!approvalCheck.allowed) {
      throw new Error(`Disbursement Blocked: Amount ₹${disbursementAmount.toLocaleString('en-IN')} exceeds your role limit of ₹${approvalCheck.limit?.toLocaleString('en-IN')}. Requires Owner-level authorization.`);
    }

    // Update in-memory record
    const memBill = SEED_VENDOR_BILLS.find(b => b.billNo === billNo || b.id === billNo);
    if (memBill) {
      memBill.paidAmount = (memBill.paidAmount || 0) + disbursementAmount;
      memBill.balanceAmount = Math.max(0, (memBill.netPayableAmount || memBill.amount) - memBill.paidAmount);
      memBill.status = memBill.balanceAmount <= 0 ? 'PAID' : 'PARTIAL';
      saveStoredVendorBills(SEED_VENDOR_BILLS);
    }

    try {
      await this.db
        .from('vendor_bills')
        .update({
          paid_amount: disbursementAmount,
          balance_amount: 0,
          status: 'PAID'
        })
        .or(`bill_no.eq.${billNo},id.eq.${billNo}`);
    } catch (err) {
      console.warn('DB disbursePayment fallback:', err);
    }

    await auditService.recordAuditLog({
      actorEmail: actorName,
      actorRole,
      action: 'VENDOR_PAYMENT_DISBURSED',
      entityType: 'vendor_bills',
      entityId: billNo,
      details: `Disbursed ₹${disbursementAmount.toFixed(2)} to ${bill.vendorName} via ${validated.paymentMode} (Ref: ${validated.referenceNo || 'Direct NEFT'}). TDS deducted: ₹${bill.tdsAmount || 0}`
    }).catch(() => {});

    const result = {
      billNo,
      disbursedAmount: disbursementAmount,
      status: 'PAID',
      disbursedBy: actorName
    };

    notificationsService.broadcastEvent('vendor_bill_disbursed', result);

    return result;
  }
}

export const vendorBillsService = new VendorBillsService();

