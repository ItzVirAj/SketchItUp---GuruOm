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

export const PurchaseRequisitionSchema = z.object({
  id: z.string().optional(),
  reqNumber: z.string().optional(),
  source: z.enum(['LOW_STOCK_ALERT', 'PRODUCTION_SHORTAGE', 'MANUAL']).default('LOW_STOCK_ALERT'),
  orderId: z.string().optional(),
  orderPo: z.string().optional(),
  itemCode: z.string().min(1, 'Item code is required'),
  itemDescription: z.string().min(1, 'Item description is required'),
  requiredQty: z.coerce.number().positive('Required quantity must be positive'),
  availableStock: z.coerce.number().nonnegative().default(0),
  deficitQty: z.coerce.number().nonnegative().default(0),
  unit: z.string().default('KG'),
  urgency: z.enum(['NORMAL', 'URGENT', 'CRITICAL']).default('NORMAL'),
  status: z.string().default('PENDING_APPROVAL'),
  requestedBy: z.string().min(1, 'Requested by is required'),
  notes: z.string().optional()
});

export const GrnEntrySchema = z.object({
  id: z.string().optional(),
  grnNo: z.string().optional(),
  poNo: z.string().min(1, 'PO number is required'),
  supplierName: z.string().min(1, 'Supplier name is required'),
  itemCode: z.string().min(1, 'Item code is required'),
  itemDescription: z.string().min(1, 'Item description is required'),
  poExpectedQty: z.coerce.number().positive('Expected quantity must be positive'),
  receivedQty: z.coerce.number().positive('Received quantity must be positive'),
  unit: z.string().default('KG'),
  unitPrice: z.coerce.number().nonnegative().default(0),
  heatLotNumber: z.string().min(1, 'Mill Heat/Lot number is mandatory for raw material receipt'),
  deliveryChallanNo: z.string().min(1, 'Delivery challan number is required'),
  carrier: z.string().optional().default('Direct Transporter'),
  storeKeeperName: z.string().min(1, 'Store keeper name is required'),
  notes: z.string().optional()
});

export const IncomingQcInspectionSchema = z.object({
  grnNo: z.string().min(1, 'GRN number is required'),
  acceptedQty: z.coerce.number().nonnegative('Accepted quantity must be non-negative'),
  rejectedQty: z.coerce.number().nonnegative('Rejected quantity must be non-negative'),
  inspectionStatus: z.enum(['PASSED', 'PARTIAL_REJECT', 'REJECTED']),
  inspectedBy: z.string().min(1, 'Inspector name is required'),
  inspectionNotes: z.string().optional(),
  defectCategory: z.string().optional()
});

export const VendorReturnSchema = z.object({
  id: z.string().optional(),
  returnNo: z.string().optional(),
  grnNo: z.string().min(1, 'GRN number is required'),
  poNo: z.string().min(1, 'PO number is required'),
  supplierName: z.string().min(1, 'Supplier name is required'),
  itemCode: z.string().min(1, 'Item code is required'),
  itemDescription: z.string().min(1, 'Item description is required'),
  rejectedQty: z.coerce.number().positive('Rejected quantity must be positive'),
  defectCategory: z.string().min(1, 'Defect category is required'),
  defectNotes: z.string().min(1, 'Defect notes are required'),
  initiatedBy: z.string().min(1, 'Initiator name is required'),
  debitAmount: z.coerce.number().nonnegative().optional().default(0)
});
