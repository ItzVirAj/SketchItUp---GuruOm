import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { CustomerInvoiceSchema, RecordPaymentSchema } from './invoices.schema';
import { dispatchService } from '../dispatch/dispatch.service';

const SEED_INVOICES = [
  {
    id: 'inv-1',
    invoiceNo: 'INV/2026/001',
    customerName: 'Bharat Heavy Electricals Ltd (BHEL)',
    orderPo: 'PO-2026-002',
    challanNo: 'CHL/0001/26-27',
    status: 'PAID',
    date: '2026-08-10',
    dueDate: '2026-09-10',
    totalAmount: 185000.00,
    paidAmount: 185000.00,
    balanceAmount: 0.00
  },
  {
    id: 'inv-2',
    invoiceNo: 'INV/2026/002',
    customerName: 'Tata Motors Powertrain Division',
    orderPo: 'PO-2026-001',
    challanNo: 'CHL/0002/26-27',
    status: 'PARTIAL',
    date: '2026-08-01',
    dueDate: '2026-08-31',
    totalAmount: 420000.00,
    paidAmount: 200000.00,
    balanceAmount: 220000.00
  },
  {
    id: 'inv-3',
    invoiceNo: 'INV/2026/003',
    customerName: 'Larsen & Toubro Heavy Eng.',
    orderPo: 'PO-2026-003',
    challanNo: 'CHL/0003/26-27',
    status: 'OVERDUE',
    date: '2026-07-01',
    dueDate: '2026-07-31',
    totalAmount: 95000.00,
    paidAmount: 0.00,
    balanceAmount: 95000.00
  }
];

export class InvoicesService {
  private db = getDbClient();

  private roundMoney(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  async getInvoices() {
    try {
      const { data, error } = await this.db
        .from('customer_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(inv => ({
          id: inv.id,
          invoiceNo: inv.invoice_no,
          customerName: inv.customer_name,
          orderPo: inv.order_po,
          challanNo: inv.challan_no,
          status: inv.status,
          date: inv.date,
          dueDate: inv.due_date,
          totalAmount: this.roundMoney(Number(inv.total_amount || 0)),
          paidAmount: this.roundMoney(Number(inv.paid_amount || 0)),
          balanceAmount: this.roundMoney(Number(inv.balance_amount ?? (inv.total_amount - (inv.paid_amount || 0))))
        }));
      }
    } catch (err) {
      console.warn('Database getInvoices fallback:', err);
    }
    return SEED_INVOICES;
  }

  async getInvoiceByNo(invoiceNo: string) {
    try {
      const { data, error } = await this.db
        .from('customer_invoices')
        .select('*')
        .or(`id.eq.${invoiceNo},invoice_no.eq.${invoiceNo}`)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          invoiceNo: data.invoice_no,
          customerName: data.customer_name,
          orderPo: data.order_po,
          challanNo: data.challan_no,
          status: data.status,
          date: data.date,
          dueDate: data.due_date,
          totalAmount: this.roundMoney(Number(data.total_amount || 0)),
          paidAmount: this.roundMoney(Number(data.paid_amount || 0)),
          balanceAmount: this.roundMoney(Number(data.balance_amount ?? (data.total_amount - (data.paid_amount || 0))))
        };
      }
    } catch (err) {
      console.warn('Database getInvoiceByNo fallback:', err);
    }
    return SEED_INVOICES.find(i => i.id === invoiceNo || i.invoiceNo === invoiceNo) || null;
  }

  async createInvoice(data: z.infer<typeof CustomerInvoiceSchema>) {
    const validated = CustomerInvoiceSchema.parse(data);
    const invId = validated.id || `inv-${Date.now()}`;

    // Cross-module link: optionally verify challan existence
    try {
      const challan = await dispatchService.getDispatchByNo(validated.challanNo);
      if (challan && challan.orderPo && challan.orderPo !== validated.orderPo) {
        console.warn(`Invoice orderPo (${validated.orderPo}) differs from Challan orderPo (${challan.orderPo})`);
      }
    } catch (dispatchErr) {
      console.warn('Challan verification check bypassed:', dispatchErr);
    }

    const totalAmount = this.roundMoney(validated.totalAmount);
    const paidAmount = this.roundMoney(validated.paidAmount || 0);
    const balanceAmount = this.roundMoney(validated.balanceAmount ?? (totalAmount - paidAmount));

    let status: 'PAID' | 'OVERDUE' | 'PARTIAL' | 'DRAFT' = validated.status || 'DRAFT';
    if (balanceAmount === 0 && paidAmount > 0) {
      status = 'PAID';
    } else if (paidAmount > 0 && balanceAmount > 0) {
      status = 'PARTIAL';
    }

    try {
      const { error } = await this.db.from('customer_invoices').insert({
        id: invId,
        invoice_no: validated.invoiceNo,
        customer_name: validated.customerName,
        order_po: validated.orderPo,
        challan_no: validated.challanNo,
        status,
        date: validated.date,
        due_date: validated.dueDate,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        balance_amount: balanceAmount,
        created_at: new Date().toISOString()
      });

      if (error) throw error;
    } catch (err) {
      console.warn('Database createInvoice fallback:', err);
    }

    const created = {
      id: invId,
      invoiceNo: validated.invoiceNo,
      customerName: validated.customerName,
      orderPo: validated.orderPo,
      challanNo: validated.challanNo,
      status,
      date: validated.date,
      dueDate: validated.dueDate,
      totalAmount,
      paidAmount,
      balanceAmount
    };

    SEED_INVOICES.unshift(created as any);
    return created;
  }

  async recordPayment(invoiceNo: string, paymentData: z.infer<typeof RecordPaymentSchema>) {
    const { paymentAmount } = RecordPaymentSchema.parse(paymentData || {});
    const existing = await this.getInvoiceByNo(invoiceNo);

    if (!existing) {
      throw new Error(`Customer invoice ${invoiceNo} not found.`);
    }

    const amountToPay = paymentAmount !== undefined ? this.roundMoney(paymentAmount) : existing.balanceAmount;
    const newPaidAmount = this.roundMoney(existing.paidAmount + amountToPay);
    const newBalance = this.roundMoney(Math.max(0, existing.totalAmount - newPaidAmount));

    let newStatus: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'DRAFT' = 'PARTIAL';
    if (newBalance <= 0) {
      newStatus = 'PAID';
    }

    try {
      await this.db
        .from('customer_invoices')
        .update({
          status: newStatus,
          paid_amount: newPaidAmount,
          balance_amount: newBalance,
          updated_at: new Date().toISOString()
        })
        .or(`id.eq.${invoiceNo},invoice_no.eq.${invoiceNo}`);
    } catch (err) {
      console.warn('Database recordPayment fallback:', err);
    }

    const local = SEED_INVOICES.find(i => i.id === invoiceNo || i.invoiceNo === invoiceNo);
    if (local) {
      local.paidAmount = newPaidAmount;
      local.balanceAmount = newBalance;
      local.status = newStatus;
    }

    return {
      invoiceNo,
      paidAmount: newPaidAmount,
      balanceAmount: newBalance,
      status: newStatus
    };
  }
}

export const invoicesService = new InvoicesService();
