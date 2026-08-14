import { z } from 'zod';

export const FinishedGoodsSchema = z.object({
  id: z.string().optional(),
  orderPo: z.string().min(1, 'Order PO is required'),
  partCode: z.string().min(1, 'Part code is required'),
  partDescription: z.string().min(1, 'Part description is required'),
  pdiPassedQty: z.number().nonnegative().default(0),
  physicallyHeldQty: z.number().nonnegative().default(0),
  dispatchedQty: z.number().nonnegative().default(0),
  variance: z.number().default(0),
  location: z.string().default('FG-BAY-A1')
});

export const ReconcileFgSchema = z.object({
  physicallyHeldQty: z.number().nonnegative(),
  varianceReason: z.string().optional()
});
