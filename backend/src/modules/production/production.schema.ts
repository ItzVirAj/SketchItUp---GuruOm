import { z } from 'zod';

export const JobCardSchema = z.object({
  id: z.string().optional(),
  jobNo: z.string().min(1, 'Job number is required'),
  orderPo: z.string().min(1, 'Order PO reference is required'),
  partCode: z.string().min(1, 'Part code is required'),
  partDescription: z.string().min(1, 'Part description is required'),
  orderStatus: z.string().default('CONFIRMED'),
  qty: z.coerce.number().positive('Quantity must be greater than 0'),
  machine: z.string().min(1, 'Assigned machine is required'),
  targetDate: z.string().min(1, 'Target completion date is required'),
  status: z.string().default('SCHEDULED'),
  reserveStock: z.boolean().default(false)
});

export const UpdateJobStatusSchema = z.object({
  status: z.string().min(1, 'Status is required')
});

export const ProductionLogSchema = z.object({
  id: z.string().optional(),
  itemCode: z.string().min(1, 'Item code is required'),
  description: z.string().min(1, 'Description is required'),
  jobNo: z.string().min(1, 'Job number is required'),
  stepNo: z.coerce.number().int().default(1),
  operationName: z.string().min(1, 'Operation name is required'),
  qtyDone: z.coerce.number().positive('Logged quantity must be greater than 0'),
  loggedTimestamp: z.string().optional(),
  autoTriggerQC: z.boolean().default(true)
});
