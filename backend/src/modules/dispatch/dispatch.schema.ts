import { z } from 'zod';

export const DispatchChallanLineSchema = z.object({
  id: z.string().optional(),
  itemCode: z.string().min(1, 'Item code is required'),
  itemDescription: z.string().optional(),
  hsnCode: z.string().optional(),
  qty: z.coerce.number().positive('Dispatch quantity must be positive'),
  unit: z.string().optional(),
  rate: z.coerce.number().nonnegative().optional(),
  approxValue: z.coerce.number().nonnegative().optional()
});

export const DispatchChallanSchema = z.object({
  id: z.string().optional(),
  challanNo: z.string().min(1, 'Challan number is required'),
  orderPo: z.string().min(1, 'Order PO reference is required'),
  orderId: z.string().optional(),
  status: z.string().default('DISPATCHED'),
  date: z.string().min(1, 'Dispatch date is required'),
  transporter: z.string().min(1, 'Transporter name is required'),
  vehicleNo: z.string().min(1, 'Vehicle number is required'),
  lrNo: z.string().optional(),
  eWayBillNo: z.string().optional(),
  remarks: z.string().optional(),
  linesCount: z.coerce.number().int().default(1),
  lines: z.array(DispatchChallanLineSchema).optional(),
  items: z.array(DispatchChallanLineSchema).optional(),
  driverContact: z.string().optional(),
  totalInvoiceValue: z.coerce.number().nonnegative().optional(),
  idempotencyKey: z.string().optional()
});

export const UpdateDispatchSchema = z.object({
  transporter: z.string().optional(),
  vehicleNo: z.string().optional(),
  lrNo: z.string().optional(),
  eWayBillNo: z.string().optional(),
  driverContact: z.string().optional(),
  remarks: z.string().optional(),
  date: z.string().optional(),
  linesCount: z.coerce.number().int().optional(),
  lines: z.array(DispatchChallanLineSchema).optional(),
  items: z.array(DispatchChallanLineSchema).optional(),
  status: z.string().optional()
});

export const UpdateDispatchStatusSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  reason: z.string().optional()
});
