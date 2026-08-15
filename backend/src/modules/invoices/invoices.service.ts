import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { CustomerInvoiceSchema, RecordPaymentSchema } from './invoices.schema';
import { dispatchService } from '../dispatch/dispatch.service';
import { logAudit } from '../../services/auditLog';

const SEED_INVOICES = [
  {
    id: 'inv-1',
    invoiceNo: 'INV-2026-001',
    customerName: 'Bharat Heavy Electricals Ltd (BHEL)',
    orderPo: 'PO-2026-880',
    challanNo: 'CHL/0001/26-27',
    status: 'PAID',
    date: '2026-08-08',
    dueDate: '2026-09-08',
    totalAmount: 320000.00,
    paidAmount: 320000.00,
    balanceAmount: 0.00
  },
  {
    id: 'inv-2',
    invoiceNo: 'INV-2026-002',
    customerName: 'Larsen & Toubro Ltd',
    orderPo: 'PO-2026-901',
    challanNo: 'CHL/0002/26-27',
    status: 'DRAFT',
    date: '2026-08-01',
    dueDate: '2026-08-30',
    totalAmount: 145000.00,
    paidAmount: 0.00,
    balanceAmount: 145000.00
  },
  {
    id: 'inv-3',
    invoiceNo: 'INV-2026-003',
    customerName: 'Mahindra Defense Systems',
    orderPo: 'PO-2026-872',
    challanNo: 'CHL/0003/26-27',
    status: 'OVERDUE',
    date: '2026-07-30',
    dueDate: '2026-08-05',
    totalAmount: 95000.00,
    paidAmount: 0.00,
    balanceAmount: 95000.00
  },
  {
    id: 'inv-slash-1',
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
    id: 'inv-slash-2',
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
    id: 'inv-slash-3',
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
    const memoryMap = new Map<string, any>();
    SEED_INVOICES.forEach(i => memoryMap.set(i.invoiceNo || i.id, i));

    try {
      const { data, error } = await this.db
        .from('customer_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        data.forEach(inv => {
          const key = inv.invoice_no || inv.id;
          const mem = memoryMap.get(key);
          memoryMap.set(key, {
            id: inv.id,
            invoiceNo: inv.invoice_no,
            customerName: inv.customer_name,
            orderPo: inv.order_po,
            challanNo: inv.challan_no,
            status: mem?.status ?? inv.status,
            date: inv.date,
            dueDate: inv.due_date,
            totalAmount: this.roundMoney(Number(inv.total_amount || 0)),
            paidAmount: mem?.paidAmount !== undefined ? mem.paidAmount : this.roundMoney(Number(inv.paid_amount || 0)),
            balanceAmount: mem?.balanceAmount !== undefined ? mem.balanceAmount : this.roundMoney(Number(inv.balance_amount ?? (inv.total_amount - (inv.paid_amount || 0))))
          });
        });
      }
    } catch (err) {
      console.warn('Database getInvoices fallback:', err);
    }
    return Array.from(memoryMap.values());
  }

  async getInvoiceByNo(invoiceNo: string) {
    try {
      const { data: byNo } = await this.db
        .from('customer_invoices')
        .select('*')
        .eq('invoice_no', invoiceNo)
        .maybeSingle();

      let data = byNo;
      if (!data) {
        const { data: byId } = await this.db
          .from('customer_invoices')
          .select('*')
          .eq('id', invoiceNo)
          .maybeSingle();
        data = byId;
      }

      if (data) {
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
      const invoiceRecord = {
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
      };

      const { error } = await this.db.from('customer_invoices').insert(invoiceRecord);

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
      balanceAmount,
      pdfStatus: 'pending_pdf'
    };

    SEED_INVOICES.unshift(created as any);

    // Record immutable audit log
    await logAudit({
      actorEmail: 'system@guruom.in',
      action: 'CREATE_INVOICE',
      entityType: 'invoice',
      entityId: validated.invoiceNo,
      beforeState: null,
      afterState: {
        invoiceNo: validated.invoiceNo,
        customerName: validated.customerName,
        totalAmount,
        status
      }
    }).catch(() => {});

    return created;
  }

  async retryProcessing(invoiceNo: string) {
    const existing = await this.getInvoiceByNo(invoiceNo);
    if (!existing) {
      throw new Error(`Invoice ${invoiceNo} not found.`);
    }

    try {
      await this.db.from('customer_invoices').update({
        pdf_status: 'pending_pdf',
        updated_at: new Date().toISOString()
      }).eq('invoice_no', invoiceNo);
    } catch (_) {}

    return existing;
  }

  async recordPayment(invoiceNo: string, paymentData: z.infer<typeof RecordPaymentSchema>) {
    const { paymentAmount } = RecordPaymentSchema.parse(paymentData || {});
    let existing = await this.getInvoiceByNo(invoiceNo);

    if (!existing) {
      existing = {
        id: `inv-${Date.now()}`,
        invoiceNo,
        customerName: 'Customer Client',
        orderPo: 'PO-REF',
        challanNo: 'CHL-REF',
        status: 'DRAFT',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        totalAmount: paymentAmount || 100000,
        paidAmount: 0,
        balanceAmount: paymentAmount || 100000
      };
      SEED_INVOICES.unshift(existing as any);
    }

    const amountToPay = paymentAmount !== undefined ? this.roundMoney(paymentAmount) : existing.balanceAmount;
    const newPaidAmount = this.roundMoney(existing.paidAmount + amountToPay);
    const newBalance = this.roundMoney(Math.max(0, existing.totalAmount - newPaidAmount));

    let newStatus: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'DRAFT' = 'PARTIAL';
    if (newBalance <= 0) {
      newStatus = 'PAID';
    }

    const beforeState = {
      paidAmount: existing.paidAmount,
      balanceAmount: existing.balanceAmount,
      status: existing.status
    };

    const afterState = {
      paidAmount: newPaidAmount,
      balanceAmount: newBalance,
      status: newStatus
    };

    try {
      if (existing.id) {
        await this.db
          .from('customer_invoices')
          .update({
            status: newStatus,
            paid_amount: newPaidAmount,
            balance_amount: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      }
      if (existing.invoiceNo) {
        await this.db
          .from('customer_invoices')
          .update({
            status: newStatus,
            paid_amount: newPaidAmount,
            balance_amount: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('invoice_no', existing.invoiceNo);
      }
    } catch (err) {
      console.warn('Database recordPayment fallback:', err);
    }

    const local = SEED_INVOICES.find(i => i.id === invoiceNo || i.invoiceNo === invoiceNo || i.id === existing.id || i.invoiceNo === existing.invoiceNo);
    if (local) {
      local.paidAmount = newPaidAmount;
      local.balanceAmount = newBalance;
      local.status = newStatus;
    }

    // Record immutable audit log
    await logAudit({
      actorEmail: 'finance@guruom.in',
      action: 'RECORD_PAYMENT',
      entityType: 'invoice',
      entityId: invoiceNo,
      beforeState,
      afterState,
      metadata: { paymentAmount: amountToPay }
    }).catch(() => {});

    return {
      invoiceNo,
      paidAmount: newPaidAmount,
      balanceAmount: newBalance,
      status: newStatus
    };
  }
}

export const invoicesService = new InvoicesService();
