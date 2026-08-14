import { z } from 'zod';

export const AuditLogSchema = z.object({
  id: z.string().optional(),
  when: z.string().optional(),
  user: z.string().min(1, 'User name is required'),
  userId: z.string().optional(),
  entity: z.string().min(1, 'Entity type is required'),
  entityId: z.string().optional(),
  action: z.string().min(1, 'Action description is required'),
  details: z.string().min(1, 'Details description is required'),
  changes: z.record(z.any()).optional()
});

export const AuditQueryFilterSchema = z.object({
  user: z.string().optional(),
  entity: z.string().optional(),
  action: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  limit: z.coerce.number().positive().default(100)
});
