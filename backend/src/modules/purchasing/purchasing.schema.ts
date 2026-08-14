import { z } from 'zod';

export const PurchaseOrderItemSchema = z.object({
  id: z.string().optional(),
  itemCode: z.string().min(1, 'Item code is required'),
  itemDescription: z.string().min(1, 'Description is required'),
  orderQty: z.coerce.number().positive('Order quantity must be greater than zero'),
  receivedQty: z.coerce.number().nonnegative().default(0),
  unit: z.string().default('NOS'),
  unitPrice: z.coerce.number().nonnegative('Unit price must be non-negative').default(0),
  lineTotal: z.coerce.number().nonnegative().default(0)
});

export const PurchaseOrderSchema = z.object({
  id: z.string().optional(),
  poNo: z.string().min(1, 'Purchase Order number is required'),
  supplierCode: z.string().min(1, 'Supplier code is required'),
  supplierName: z.string().min(1, 'Supplier name is required'),
  orderDate: z.string().min(1, 'Order date is required'),
  expectedDeliveryDate: z.string().min(1, 'Expected delivery date is required'),
  paymentTerms: z.string().default('Net 30'),
  taxRate: z.coerce.number().nonnegative().default(18.0),
  grossAmount: z.coerce.number().nonnegative().default(0),
  taxAmount: z.coerce.number().nonnegative().default(0),
  totalAmount: z.coerce.number().nonnegative().default(0),
  status: z.string().default('DRAFT'),
  approvalStatus: z.string().default('PENDING'),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
  rejectionReason: z.string().optional(),
  createdBy: z.string().default('Owner OS Admin'),
  notes: z.string().optional(),
  items: z.array(PurchaseOrderItemSchema).default([])
});

export const ApprovalDecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().optional()
});
