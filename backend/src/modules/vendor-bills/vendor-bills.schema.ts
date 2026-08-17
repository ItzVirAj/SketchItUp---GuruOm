import { z } from 'zod';

export const VendorBillCreateSchema = z.object({
  id: z.string().optional(),
  billNo: z.string().min(1, 'Bill number is required'),
  vendorId: z.string().optional(),
  vendorName: z.string().min(1, 'Vendor name is required'),
  vendorType: z.string().default('Supplier'), // Subcontractor/Job-Worker, Manpower Provider, Supplier, Transporter
  vendorPan: z.string().optional(),
  poNo: z.string().min(1, 'PO number reference is required'),
  grnNo: z.string().optional(),
  status: z.string().default('OPEN'),
  date: z.string().min(1, 'Bill date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  grossAmount: z.coerce.number().positive('Bill gross amount must be greater than 0'),
  isPurchaseOfGoods: z.boolean().default(false),
  cumulativeAnnualPurchases: z.coerce.number().default(0),
  attachmentUrl: z.string().optional()
});

export const DisburseVendorBillSchema = z.object({
  paymentAmount: z.coerce.number().positive('Disbursement amount must be greater than 0').optional(),
  paymentMode: z.string().default('NEFT_RTGS'),
  referenceNo: z.string().optional(),
  disbursementDate: z.string().default(() => new Date().toISOString().split('T')[0]),
  notes: z.string().optional()
});
