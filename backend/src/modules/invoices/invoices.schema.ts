import { z } from 'zod';

export const CustomerInvoiceSchema = z.object({
  id: z.string().optional(),
  invoiceNo: z.string().min(1, 'Invoice number is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  orderPo: z.string().min(1, 'Order PO reference is required'),
  challanNo: z.string().min(1, 'Delivery challan reference is required'),
  status: z.string().default('DRAFT'),
  date: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  taxRate: z.coerce.number().nonnegative().default(18), // 18% GST standard
  totalAmount: z.coerce.number().nonnegative().default(0),
  paidAmount: z.coerce.number().nonnegative().default(0),
  balanceAmount: z.coerce.number().nonnegative().optional()
});

export const RecordPaymentSchema = z.object({
  paymentAmount: z.coerce.number().positive('Payment amount must be greater than 0').optional(),
  paymentMode: z.string().default('NEFT_RTGS'),
  referenceNo: z.string().optional(),
  paymentDate: z.string().default(() => new Date().toISOString().split('T')[0]),
  notes: z.string().optional()
});
