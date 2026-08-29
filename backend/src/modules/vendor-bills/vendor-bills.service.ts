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

export class VendorBillsService {
  private db = getDbClient();

  async getVendorBills() {
    try {
      const { data, error } = await this.db
        .from('vendor_bills')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(b => ({
          id: b.id,
          billNo: b.bill_no,
          vendorName: b.vendor_name,
          vendorType: b.vendor_type,
          vendorPan: b.vendor_pan,
          poNo: b.po_no,
          grnNo: b.grn_no,
          status: b.status,
          date: b.bill_date || b.date,
          dueDate: b.due_date,
          grossAmount: Number(b.gross_amount || b.amount || 0),
          amount: Number(b.gross_amount || b.amount || 0),
          tdsSection: b.tds_section || 'NONE',
          tdsRate: Number(b.tds_rate || 0),
          tdsAmount: Number(b.tds_amount || 0),
          netPayableAmount: Number(b.net_payable_amount || b.amount || 0),
          paidAmount: Number(b.paid_amount || 0),
          balanceAmount: Number(b.balance_amount || b.amount || 0),
          matchStatus: b.match_status,
          isThreeWayMatched: b.is_three_way_matched !== undefined ? Boolean(b.is_three_way_matched) : undefined,
          varianceDetails: b.variance_details
        }));
      }
    } catch (err) {
      console.warn('DB getVendorBills fallback:', err);
    }

    return [];
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
        bill_date: validated.date,
        due_date: validated.dueDate,
        gross_amount: validated.grossAmount,
        tds_section: tdsCalc.tdsSection,
        tds_rate: tdsCalc.tdsRate,
        tds_amount: tdsCalc.tdsAmount,
        net_payable_amount: tdsCalc.netPayableAmount,
        paid_amount: 0,
        balance_amount: tdsCalc.netPayableAmount,
        attachment_url: validated.attachmentUrl,
        match_status: matchStatus,
        is_three_way_matched: isThreeWayMatched,
        variance_details: varianceDetails
      });
    } catch (err) {
      console.warn('DB createVendorBill fallback:', err);
    }

    await auditService.recordAuditLog({
      actorEmail: accountantName,
      actorRole: 'Accountant',
      action: 'VENDOR_BILL_ENTERED',
      entityType: 'vendor_bills',
      entityId: validated.billNo,
      details: `Vendor Bill ${validated.billNo} entered for ${validated.vendorName} (Gross: ₹${validated.grossAmount}, TDS ${tdsCalc.tdsSection}: ₹${tdsCalc.tdsAmount}, Net: ₹${tdsCalc.netPayableAmount}${matchStatus ? `, 3-Way Match: ${matchStatus}` : ''})`
    }).catch(() => {});

    const result = {
      id: billId,
      ...validated,
      tds: tdsCalc,
      netPayableAmount: tdsCalc.netPayableAmount,
      matchStatus,
      isThreeWayMatched,
      varianceDetails
    };

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

