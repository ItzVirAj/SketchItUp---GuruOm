import { z } from 'zod';

export const StockItemSchema = z.object({
  code: z.string().min(1, 'Item code is required'),
  description: z.string().min(1, 'Description is required'),
  onHand: z.coerce.number().nonnegative().default(0),
  reserved: z.coerce.number().nonnegative().default(0),
  available: z.coerce.number().default(0),
  demand: z.coerce.number().nonnegative().default(0),
  reorderLevel: z.coerce.number().nonnegative().default(0),
  shortage: z.coerce.number().nonnegative().default(0),
  unit: z.string().default('NOS'),
  status: z.string().default('OK')
});

export const AdjustStockSchema = z.object({
  newOnHand: z.coerce.number().nonnegative('On hand quantity must be non-negative')
});

export const ShortageItemSchema = z.object({
  code: z.string().min(1, 'Item code is required'),
  description: z.string().min(1, 'Description is required'),
  requiredQty: z.coerce.number().nonnegative().default(0),
  availableQty: z.coerce.number().default(0),
  deficit: z.coerce.number().nonnegative().default(0),
  unit: z.string().default('NOS')
});
