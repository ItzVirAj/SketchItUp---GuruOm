import { z } from 'zod';

export const OrderLineItemSchema = z.object({
  id: z.string().optional(),
  itemCode: z.string().min(1, 'Item code is required'),
  itemDescription: z.string().min(1, 'Description is required'),
  custPartNo: z.string().optional().default(''),
  orderQty: z.number().positive('Order quantity must be positive'),
  unit: z.string().default('NOS'),
  dispatchedQty: z.number().nonnegative().default(0),
  pendingQty: z.number().nonnegative().optional(),
  rate: z.number().nonnegative().default(0)
});

export const CustomerOrderSchema = z.object({
  id: z.string().min(1, 'Order ID is required'),
  poNo: z.string().min(1, 'PO number is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  poDate: z.string().min(1, 'PO Date is required'),
  deliveryDate: z.string().min(1, 'Delivery Date is required'),
  status: z.string().default('CONFIRMED'),
  progressStep: z.number().int().min(0).max(10).default(0),
  grossAmount: z.number().nonnegative().default(0),
  taxCategory: z.string().optional().default('GST 18%'),
  remark: z.string().optional().default(''),
  clientPoFile: z.string().optional(),
  lines: z.array(OrderLineItemSchema).default([]),
  jobCards: z.array(z.any()).optional(),
  dispatches: z.array(z.any()).optional()
});

export const UpdateOrderStatusSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  progressStep: z.number().int().min(0).optional()
});
