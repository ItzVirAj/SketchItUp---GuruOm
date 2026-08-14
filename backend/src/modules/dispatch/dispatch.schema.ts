import { z } from 'zod';

export const DispatchChallanSchema = z.object({
  id: z.string().optional(),
  challanNo: z.string().min(1, 'Challan number is required'),
  orderPo: z.string().min(1, 'Order PO reference is required'),
  status: z.string().default('DISPATCHED'),
  date: z.string().min(1, 'Dispatch date is required'),
  transporter: z.string().min(1, 'Transporter name is required'),
  vehicleNo: z.string().min(1, 'Vehicle number is required'),
  linesCount: z.coerce.number().int().default(1),
  driverContact: z.string().optional(),
  totalInvoiceValue: z.coerce.number().nonnegative().optional()
});

export const UpdateDispatchStatusSchema = z.object({
  status: z.string().min(1, 'Status is required')
});
