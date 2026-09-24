import { z } from 'zod';

export const CreateTemplateItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDaysOffset: z.number().int().min(0).max(365).default(3)
});

export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  items: z.array(CreateTemplateItemSchema).min(1, 'A template needs at least one task')
});

export const ApplyTemplateSchema = z.object({
  assigneeUserIds: z.array(z.string().uuid()).min(1, 'At least one assignee is required'),
  appliedFromDate: z.string().datetime({ offset: true }).optional() // defaults to now; due dates are computed from this
});
