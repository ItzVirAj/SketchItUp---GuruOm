import { z } from 'zod';

export const QCInspectionSchema = z.object({
  id: z.string().optional(),
  jobNo: z.string().min(1, 'Job number is required'),
  orderPo: z.string().min(1, 'Order PO reference is required'),
  partCode: z.string().min(1, 'Part code is required'),
  partDescription: z.string().min(1, 'Part description is required'),
  qty: z.coerce.number().positive('Quantity must be greater than 0'),
  jobStatus: z.string().default('IN_INSPECTION'),
  qcStatus: z.string().default('PENDING'),
  inspectorNotes: z.string().optional(),
  defectCategory: z.string().optional(),
  inspectedAt: z.string().optional()
});

export const ReviewQCSchema = z.object({
  qcStatus: z.string().min(1, 'QC status is required'),
  inspectorNotes: z.string().optional(),
  defectCategory: z.string().optional()
});

export const PDIInspectionSchema = z.object({
  id: z.string().optional(),
  jobNo: z.string().min(1, 'Job number is required'),
  orderPo: z.string().min(1, 'Order PO reference is required'),
  partCode: z.string().min(1, 'Part code is required'),
  partDescription: z.string().min(1, 'Part description is required'),
  qty: z.coerce.number().positive('Quantity must be greater than 0'),
  pdiStatus: z.string().default('PENDING'),
  certificateNo: z.string().optional(),
  reportDate: z.string().optional()
});
