import { z } from 'zod';

export const VendorBillSchema = z.object({
  id: z.string().optional(),
  billNo: z.string().min(1, 'Bill number is required'),
  vendorName: z.string().min(1, 'Vendor name is required'),
  poNo: z.string().min(1, 'PO number reference is required'),
  status: z.string().default('OPEN'),
  date: z.string().min(1, 'Bill date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  amount: z.coerce.number().nonnegative().default(0),
  paidAmount: z.coerce.number().nonnegative().default(0),
  balanceAmount: z.coerce.number().nonnegative().optional(),
  attachmentUrl: z.string().optional()
});

export const DisburseBillSchema = z.object({
  paymentAmount: z.coerce.number().positive('Disbursement amount must be greater than 0').optional(),
  paymentMode: z.string().default('NEFT_RTGS'),
  referenceNo: z.string().optional(),
  disbursementDate: z.string().default(() => new Date().toISOString().split('T')[0]),
  notes: z.string().optional()
});
