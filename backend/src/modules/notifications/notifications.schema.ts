import { z } from 'zod';

export const TriggerNotificationSchema = z.object({
  eventType: z.string().min(1, 'Event type is required'),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  title: z.string().optional(),
  message: z.string().optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).default('HIGH'),
  data: z.record(z.any()).optional(),
  recipientEmail: z.string().email().optional(),
  userRole: z.string().optional(),
  isTest: z.boolean().default(false)
});

export const NotificationRuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Rule name is required'),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).default('HIGH')
});

export const NotificationRecipientSchema = z.object({
  id: z.string().optional(),
  notificationRuleId: z.string().min(1, 'Rule ID is required'),
  recipientType: z.enum(['EMAIL', 'USER', 'ROLE']).default('EMAIL'),
  recipientValue: z.string().min(1, 'Recipient value is required'),
  email: z.string().email().optional(),
  name: z.string().optional(),
  enabled: z.boolean().default(true)
});

export const UpdateRuleSchema = z.object({
  enabled: z.boolean()
});
