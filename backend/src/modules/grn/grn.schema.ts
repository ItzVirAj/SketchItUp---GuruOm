import { z } from 'zod';

export const GrnItemSchema = z.object({
  id: z.string().optional(),
  itemCode: z.string().min(1, 'Item code is required'),
  itemDescription: z.string().min(1, 'Description is required'),
  orderedQty: z.coerce.number().nonnegative().default(0),
  receivedQty: z.coerce.number().nonnegative().default(0),
  acceptedQty: z.coerce.number().nonnegative().default(0),
  rejectedQty: z.coerce.number().nonnegative().default(0),
  unit: z.string().default('NOS'),
  unitRate: z.coerce.number().nonnegative().default(0),
  rejectionReason: z.string().optional()
});

export const GoodsReceiptNoteSchema = z.object({
  id: z.string().optional(),
  grnNo: z.string().min(1, 'GRN number is required'),
  poNo: z.string().min(1, 'PO number is required'),
  vendorCode: z.string().min(1, 'Vendor code is required'),
  vendorName: z.string().min(1, 'Vendor name is required'),
  challanNo: z.string().min(1, 'Challan number is required'),
  challanDate: z.string().optional(),
  receivedDate: z.string().min(1, 'Received date is required'),
  receivedBy: z.string().min(1, 'Received by name is required'),
  status: z.string().default('RECEIVED'),
  vehicleNo: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(GrnItemSchema).default([])
});

export const UpdateGrnStatusSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  remarks: z.string().optional()
});
