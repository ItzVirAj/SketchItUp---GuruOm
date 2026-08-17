import { z } from 'zod';

export const RouteCardStepSchema = z.object({
  id: z.string().optional(),
  partCode: z.string().min(1, 'Part code is required'),
  partDescription: z.string().min(1, 'Part description is required'),
  sequenceNo: z.coerce.number().int().positive('Sequence must be positive (e.g. 10, 20, 30)'),
  operationName: z.string().min(1, 'Operation name is required'),
  workCenter: z.string().min(1, 'Work center is required'),
  standardTimeMinutes: z.coerce.number().positive('Standard time must be greater than 0'),
  inspectionRequired: z.boolean().default(false),
  requiredCertification: z.string().default('None')
});

export const JobCardCreateSchema = z.object({
  jobNo: z.string().optional(),
  orderId: z.string().optional(),
  orderPo: z.string().min(1, 'Order reference is required'),
  partCode: z.string().min(1, 'Part code is required'),
  partDescription: z.string().min(1, 'Part description is required'),
  drawingRevision: z.string().min(1, 'Drawing revision is required (locked at release)'),
  targetQty: z.coerce.number().positive('Quantity to produce must be greater than 0'),
  materialIssuedLot: z.string().optional(),
  materialQcStatus: z.enum(['ACCEPTED', 'QUALITY_HOLD', 'PENDING_INSPECTION']).default('ACCEPTED'),
  targetDate: z.string().min(1, 'Target completion date is required'),
  remarks: z.string().optional()
});

export const StartOperationSchema = z.object({
  sequenceNo: z.coerce.number().int().positive('Sequence number is required'),
  machineId: z.string().min(1, 'Machine ID is required'),
  operatorName: z.string().min(1, 'Operator name is required')
});

export const CompleteOperationSchema = z.object({
  sequenceNo: z.coerce.number().int().positive('Sequence number is required'),
  qtyProcessed: z.coerce.number().nonnegative('Processed quantity must be non-negative'),
  qtyRejected: z.coerce.number().nonnegative('Rejected quantity must be non-negative'),
  actualMinutes: z.coerce.number().positive('Actual time spent (minutes) is required'),
  notes: z.string().optional()
});

export const RaiseNcrSchema = z.object({
  jobNo: z.string().min(1, 'Job number is required'),
  sequenceNo: z.coerce.number().int().positive('Sequence number is required'),
  operationName: z.string().min(1, 'Operation name is required'),
  orderPo: z.string().min(1, 'Order PO is required'),
  defectCategory: z.enum([
    'DIMENSIONAL',
    'VISUAL_SURFACE',
    'MATERIAL_HARDNESS',
    'MACHINING_CHATTER',
    'RUNOUT_EXCEEDED',
    'OTHER'
  ]),
  defectDescription: z.string().min(1, 'Defect description is required'),
  rejectedQty: z.coerce.number().positive('Rejected quantity must be greater than 0')
});

export const NcrDispositionSchema = z.object({
  ncrNumber: z.string().min(1, 'NCR number is required'),
  disposition: z.enum(['REWORK', 'SCRAP', 'USE_AS_IS_CONCESSION']),
  reason: z.string().min(1, 'Disposition justification reason is required')
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
