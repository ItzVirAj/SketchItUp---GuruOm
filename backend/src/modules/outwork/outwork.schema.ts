import { z } from 'zod';

export const SubcontractGateOutSchema = z.object({
  id: z.string().optional(),
  gatePassNo: z.string().optional(),
  jobNo: z.string().min(1, 'Job number is required'),
  itemCode: z.string().min(1, 'Item code is required'),
  itemDescription: z.string().min(1, 'Item description is required'),
  subcontractorName: z.string().min(1, 'Subcontractor name is required'),
  processType: z.enum([
    'HEAT_TREATMENT',
    'ELECTROPLATING',
    'ZINC_PLATING',
    'NDT_TESTING',
    'CNC_MACHINING',
    'BLACK_OXIDE',
    'OTHER'
  ]),
  dispatchedQty: z.coerce.number().positive('Dispatched quantity must be greater than 0'),
  unit: z.string().default('NOS'),
  dispatchDate: z.string().default(() => new Date().toISOString().split('T')[0]),
  expectedReturnDate: z.string().min(1, 'Expected return date is required for automated overdue tracking'),
  vehicleDetails: z.string().optional(),
  transporter: z.string().optional().default('Direct Transporter'),
  unitRate: z.coerce.number().nonnegative().optional().default(0),
  notes: z.string().optional()
});

export const SubcontractGateInSchema = z.object({
  gatePassNo: z.string().min(1, 'Gate-out pass number is required'),
  gateInPassNo: z.string().optional(),
  receivedQty: z.coerce.number().positive('Received quantity must be positive'),
  rejectedQty: z.coerce.number().nonnegative().default(0),
  actualReturnDate: z.string().default(() => new Date().toISOString().split('T')[0]),
  qcStatus: z.enum(['INSPECTED_ACCEPTED', 'INSPECTED_REJECTED']).default('INSPECTED_ACCEPTED'),
  qcInspector: z.string().min(1, 'Inspector name is required'),
  inspectionNotes: z.string().optional(),
  notes: z.string().optional()
});
