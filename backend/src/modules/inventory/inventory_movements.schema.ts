import { z } from 'zod';

export const MovementTypeEnum = z.enum([
  'OPENING_BALANCE',
  'GRN',
  'PRODUCTION_CONSUMPTION',
  'PRODUCTION_OUTPUT',
  'DISPATCH',
  'RETURN',
  'ADJUSTMENT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'DAMAGE_WRITE_OFF',
  'CORRECTION'
]);

export type MovementType = z.infer<typeof MovementTypeEnum>;

export const RecordMovementSchema = z.object({
  itemCode: z.string().min(1, 'Item code is required'),
  location: z.string().default('MAIN-WAREHOUSE'),
  quantityChange: z.number().refine(n => n !== 0, 'Quantity change cannot be 0'),
  movementType: MovementTypeEnum,
  referenceId: z.string().optional(),
  referenceType: z.enum(['grn', 'job_card', 'dispatch', 'order', 'adjustment', 'correction', 'manual', 'system']).default('manual'),
  actorId: z.string().optional(),
  actorEmail: z.string().email().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export const MovementQueryFilterSchema = z.object({
  itemCode: z.string().optional(),
  movementType: z.string().optional(),
  referenceId: z.string().optional(),
  from: z.coerce.number().optional().default(0),
  limit: z.coerce.number().optional().default(50)
});

export const ReversalMovementSchema = z.object({
  originalMovementId: z.string().min(1, 'Original movement ID is required'),
  reason: z.string().min(3, 'Reason for correction is required')
});
