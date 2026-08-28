import { z } from 'zod';

export const OrderLineItemSchema = z.preprocess(
  (raw: any) => ({
    ...raw,
    // Accept 'description' as fallback for 'itemDescription'
    itemDescription: raw?.itemDescription || raw?.description || ''
  }),
  z.object({
    id: z.string().optional(),
    itemCode: z.string().min(1, 'Item code is required'),
    itemDescription: z.string().min(1, 'Description is required'),
    custPartNo: z.string().optional().default(''),
    orderQty: z.number().positive('Order quantity must be positive'),
    unit: z.string().default('NOS'),
    dispatchedQty: z.number().nonnegative().default(0),
    pendingQty: z.number().nonnegative().optional(),
    rate: z.number().nonnegative().default(0),
    drawingRevision: z.string().optional().default('REV-A')
  })
);

export const CustomerOrderSchema = z.object({
  id: z.string().optional(),
  poNo: z.string().min(1, 'PO number is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  poDate: z.string().min(1, 'PO Date is required'),
  deliveryDate: z.string().min(1, 'Delivery Date is required'),
  status: z.string().default('PO_RECEIVED'),
  stage: z.string().optional().default('PO_RECEIVED'),
  progressStep: z.number().int().min(0).max(10).default(1),
  grossAmount: z.number().nonnegative().default(0),
  taxCategory: z.string().optional().default('GST 18%'),
  remark: z.string().optional().default(''),
  clientPoFile: z.string().optional(),
  
  // Sub-Types & State Machine Gates
  subType: z.enum(['FRESH_PO', 'BLANKET_CALLOFF', 'AMENDMENT']).default('FRESH_PO'),
  blanketPoId: z.string().optional(),
  blanketPoBalance: z.number().optional(),
  drawingRevision: z.string().min(1, 'Drawing revision is mandatory').default('REV-A'),
  masterDrawingRevision: z.string().optional(),
  heatLotNumber: z.string().optional(),
  creditHoldOverrideBy: z.string().optional(),
  creditHoldOverrideReason: z.string().optional(),
  invoiceOverrideReason: z.string().optional(),
  
  lines: z.array(OrderLineItemSchema).default([]),
  jobCards: z.array(z.any()).optional(),
  dispatches: z.array(z.any()).optional()
});

export const UpdateOrderStatusSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  stage: z.string().optional(),
  progressStep: z.number().int().min(0).optional(),
  heatLotNumber: z.string().optional(),
  creditHoldOverrideBy: z.string().optional(),
  creditHoldOverrideReason: z.string().optional(),
  invoiceOverrideReason: z.string().optional(),
  dispatchedQty: z.number().optional(),
  invoicedQty: z.number().optional()
});

export const OrderAmendmentSchema = z.object({
  amendmentType: z.enum(['QUANTITY', 'DELIVERY_DATE', 'PRICE']),
  newQuantity: z.number().positive().optional(),
  newDeliveryDate: z.string().optional(),
  newUnitPrice: z.number().positive().optional(),
  reason: z.string().min(5, 'Reason for amendment is required'),
  approvedBy: z.string().optional()
});
