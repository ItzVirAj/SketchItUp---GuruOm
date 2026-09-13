import { z } from 'zod';

export const EmployeeUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(254).optional(),
  department: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  reportingManager: z.string().trim().max(120).optional(),
  shift: z.string().trim().max(80).optional()
}).strict();

export const EmployeeListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  department: z.string().trim().max(120).optional(),
  status: z.enum(['ACTIVE', 'REVOKED', 'SUSPENDED']).optional()
});
