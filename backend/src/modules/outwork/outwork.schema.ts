import { z } from 'zod';

export const OutworkSendOutSchema = z.object({
  id: z.string().optional(),
  sendOutId: z.string().min(1, 'Send-out ID is required'),
  vendorName: z.string().min(1, 'Vendor name is required'),
  process: z.string().min(1, 'Subcontracting process description is required'),
  sentQty: z.coerce.number().positive('Sent quantity must be greater than 0'),
  receivedQty: z.coerce.number().nonnegative().default(0),
  rejectedQty: z.coerce.number().nonnegative().default(0),
  expectedDate: z.string().min(1, 'Expected return date is required'),
  sentDate: z.string().default(() => new Date().toISOString().split('T')[0]),
  status: z.string().default('SENT'),
  unitCost: z.coerce.number().nonnegative().default(0),
  notes: z.string().optional()
});

export const ReceiveOutworkSchema = z.object({
  receivedQty: z.coerce.number().positive('Received quantity must be greater than 0'),
  rejectedQty: z.coerce.number().nonnegative().default(0),
  notes: z.string().optional()
});
