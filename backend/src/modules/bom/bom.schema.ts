import { z } from 'zod';

export const BomItemSchema = z.object({
  id: z.string().optional(),
  componentCode: z.string().min(1, 'Component code is required'),
  componentName: z.string().min(1, 'Component name is required'),
  componentType: z.string().default('RAW_MATERIAL'),
  qtyPerUnit: z.coerce.number().positive('Quantity per unit must be greater than zero'),
  unit: z.string().default('NOS'),
  scrapAllowancePct: z.coerce.number().nonnegative().default(2.0),
  stage: z.string().default('CNC_MACHINING'),
  unitCost: z.coerce.number().nonnegative().default(0)
});

export const BillOfMaterialsSchema = z.object({
  id: z.string().optional(),
  bomCode: z.string().min(1, 'BOM Code is required'),
  parentPartCode: z.string().min(1, 'Parent part code is required'),
  parentPartName: z.string().min(1, 'Parent part name is required'),
  revision: z.string().default('v1.0'),
  yieldPercentage: z.coerce.number().default(98.5),
  batchSize: z.coerce.number().positive().default(100),
  status: z.string().default('ACTIVE'),
  notes: z.string().optional(),
  components: z.array(BomItemSchema).default([])
});
