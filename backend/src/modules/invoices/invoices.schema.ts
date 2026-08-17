import { z } from 'zod';

export const InvoiceItemSchema = z.object({
  id: z.string().optional(),
  itemCode: z.string().min(1, 'Item code is required'),
  itemDescription: z.string().min(1, 'Item description is required'),
  hsnCode: z.string().regex(/^[0-9]{4,8}$/, 'HSN Code must be 4 to 8 digits'),
  qty: z.coerce.number().positive('Quantity must be greater than 0'),
  unitPrice: z.coerce.number().positive('Unit price must be positive'),
  taxableValue: z.coerce.number().nonnegative().optional(),
  gstRate: z.coerce.number().refine(val => [0, 5, 12, 18, 28].includes(val), 'GST rate must be 0, 5, 12, 18, or 28%'),
  gstOverrideReason: z.string().optional()
});

export const CustomerInvoiceSchema = z.object({
  id: z.string().optional(),
  invoiceNo: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().default('Customer'),
  customerGstin: z.string().default('27AABCG1234F1Z5'),
  orderPo: z.string().default('PO-GENERAL-001'),
  challanNo: z.string().default('DC-GENERAL-001'),
  status: z.string().default('DRAFT'),
  date: z.string().default(() => new Date().toISOString().split('T')[0]),
  dueDate: z.string().default(() => new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]),
  items: z.array(InvoiceItemSchema).default([
    {
      itemCode: 'ITEM-001',
      itemDescription: 'Precision Machined Component',
      hsnCode: '84834000',
      qty: 1,
      unitPrice: 1000,
      taxableValue: 1000,
      gstRate: 18
    }
  ]),
  taxRate: z.coerce.number().nonnegative().default(18),
  totalAmount: z.coerce.number().nonnegative().optional(),
  paidAmount: z.coerce.number().nonnegative().default(0),
  balanceAmount: z.coerce.number().nonnegative().optional(),
  gstOverrideReason: z.string().optional()
});

export const RecordPaymentSchema = z.object({
  paymentAmount: z.coerce.number().positive('Payment amount must be greater than 0').optional(),
  paymentMode: z.string().default('NEFT_RTGS'),
  referenceNo: z.string().optional(),
  paymentDate: z.string().default(() => new Date().toISOString().split('T')[0]),
  notes: z.string().optional()
});
