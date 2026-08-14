import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { VendorBillSchema, DisburseBillSchema } from './vendor-bills.schema';

const SEED_VENDOR_BILLS = [
  {
    id: 'bill-1',
    billNo: 'BILL-2026-001',
    vendorName: 'Jindal Steel & Power Ltd',
    poNo: 'PO-RM-2026-001',
    status: 'OPEN',
    date: '2026-08-05',
    dueDate: '2026-09-05',
    amount: 145000.00,
    paidAmount: 0.00,
    balanceAmount: 145000.00,
    attachmentUrl: undefined
  },
  {
    id: 'bill-2',
    billNo: 'BILL-2026-002',
    vendorName: 'Anodize Tech Ltd',
    poNo: 'PO-OW-2026-002',
    status: 'PARTIAL',
    date: '2026-08-01',
    dueDate: '2026-08-31',
    amount: 32000.00,
    paidAmount: 15000.00,
    balanceAmount: 17000.00,
    attachmentUrl: undefined
  },
  {
    id: 'bill-3',
    billNo: 'BILL-2026-003',
    vendorName: 'Sandvik Coromant Cutting Tools',
    poNo: 'PO-TL-2026-003',
    status: 'PAID',
    date: '2026-07-15',
    dueDate: '2026-08-15',
    amount: 68000.00,
    paidAmount: 68000.00,
    balanceAmount: 0.00,
    attachmentUrl: undefined
  }
];

export class VendorBillsService {
  private db = getDbClient();

  private roundMoney(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

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
          poNo: b.po_no,
          status: b.status,
          date: b.date,
          dueDate: b.due_date,
          amount: this.roundMoney(Number(b.amount || 0)),
          paidAmount: this.roundMoney(Number(b.paid_amount || 0)),
          balanceAmount: this.roundMoney(Number(b.balance_amount ?? (b.amount - (b.paid_amount || 0)))),
          attachmentUrl: b.attachment_url
        }));
      }
    } catch (err) {
      console.warn('Database getVendorBills fallback:', err);
    }
    return SEED_VENDOR_BILLS;
  }

  async getVendorBillByNo(billNo: string) {
    try {
      const { data, error } = await this.db
        .from('vendor_bills')
        .select('*')
        .or(`id.eq.${billNo},bill_no.eq.${billNo}`)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          billNo: data.bill_no,
          vendorName: data.vendor_name,
          poNo: data.po_no,
          status: data.status,
          date: data.date,
          dueDate: data.due_date,
          amount: this.roundMoney(Number(data.amount || 0)),
          paidAmount: this.roundMoney(Number(data.paid_amount || 0)),
          balanceAmount: this.roundMoney(Number(data.balance_amount ?? (data.amount - (data.paid_amount || 0)))),
          attachmentUrl: data.attachment_url
        };
      }
    } catch (err) {
      console.warn('Database getVendorBillByNo fallback:', err);
    }
    return SEED_VENDOR_BILLS.find(b => b.id === billNo || b.billNo === billNo) || null;
  }

  async createVendorBill(data: z.infer<typeof VendorBillSchema>) {
    const validated = VendorBillSchema.parse(data);
    const billId = validated.id || `bill-${Date.now()}`;

    const amount = this.roundMoney(validated.amount);
    const paidAmount = this.roundMoney(validated.paidAmount || 0);
    const balanceAmount = this.roundMoney(validated.balanceAmount ?? (amount - paidAmount));

    let status: 'PAID' | 'OVERDUE' | 'OPEN' | 'PARTIAL' = validated.status || 'OPEN';
    if (balanceAmount === 0 && paidAmount > 0) {
      status = 'PAID';
    } else if (paidAmount > 0 && balanceAmount > 0) {
      status = 'PARTIAL';
    }

    try {
      const { error } = await this.db.from('vendor_bills').insert({
        id: billId,
        bill_no: validated.billNo,
        vendor_name: validated.vendorName,
        po_no: validated.poNo,
        status,
        date: validated.date,
        due_date: validated.dueDate,
        amount,
        paid_amount: paidAmount,
        balance_amount: balanceAmount,
        attachment_url: validated.attachmentUrl,
        created_at: new Date().toISOString()
      });

      if (error) throw error;
    } catch (err) {
      console.warn('Database createVendorBill fallback:', err);
    }

    const created = {
      id: billId,
      billNo: validated.billNo,
      vendorName: validated.vendorName,
      poNo: validated.poNo,
      status,
      date: validated.date,
      dueDate: validated.dueDate,
      amount,
      paidAmount,
      balanceAmount,
      attachmentUrl: validated.attachmentUrl
    };

    SEED_VENDOR_BILLS.unshift(created as any);
    return created;
  }

  async disbursePayment(billNo: string, paymentData: z.infer<typeof DisburseBillSchema>) {
    const { paymentAmount } = DisburseBillSchema.parse(paymentData || {});
    const existing = await this.getVendorBillByNo(billNo);

    if (!existing) {
      throw new Error(`Vendor bill ${billNo} not found.`);
    }

    const amountToPay = paymentAmount !== undefined ? this.roundMoney(paymentAmount) : existing.balanceAmount;
    const newPaidAmount = this.roundMoney(existing.paidAmount + amountToPay);
    const newBalance = this.roundMoney(Math.max(0, existing.amount - newPaidAmount));

    let newStatus: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'OPEN' = 'PARTIAL';
    if (newBalance <= 0) {
      newStatus = 'PAID';
    }

    try {
      await this.db
        .from('vendor_bills')
        .update({
          status: newStatus,
          paid_amount: newPaidAmount,
          balance_amount: newBalance,
          updated_at: new Date().toISOString()
        })
        .or(`id.eq.${billNo},bill_no.eq.${billNo}`);
    } catch (err) {
      console.warn('Database disbursePayment fallback:', err);
    }

    const local = SEED_VENDOR_BILLS.find(b => b.id === billNo || b.billNo === billNo);
    if (local) {
      local.paidAmount = newPaidAmount;
      local.balanceAmount = newBalance;
      local.status = newStatus;
    }

    return {
      billNo,
      paidAmount: newPaidAmount,
      balanceAmount: newBalance,
      status: newStatus
    };
  }
}

export const vendorBillsService = new VendorBillsService();
