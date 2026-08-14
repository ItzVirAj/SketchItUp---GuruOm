import { z } from 'zod';

export const ApprovalTypeEnum = z.enum([
  'DISCOUNT_OVERRIDE',
  'ORDER_CANCEL',
  'HIGH_VALUE_PO',
  'SCRAP_WRITE_OFF'
]);

export const PendingApprovalSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Approval title is required'),
  type: ApprovalTypeEnum,
  requestedBy: z.string().min(1, 'Requested by name is required'),
  timestamp: z.string().default(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
  amount: z.number().nonnegative().optional(),
  details: z.string().min(1, 'Approval details are required'),
  entityId: z.string().optional()
});

export const DecisionApprovalSchema = z.object({
  comments: z.string().optional(),
  reason: z.string().optional()
});
