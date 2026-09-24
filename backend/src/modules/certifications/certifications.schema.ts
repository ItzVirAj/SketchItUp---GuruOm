import { z } from 'zod';

// One reminder, 30 days before expiry. Simpler than meetings/tasks' two-offset
// pattern since a certification's runway is measured in weeks/months, not hours.
export const CERTIFICATION_REMINDER_OFFSET = { label: '30d_before_expiry', minutesBeforeExpiry: 30 * 24 * 60 };

export const CreateCertificationSchema = z.object({
  employeeId: z.string().uuid(),
  name: z.string().min(1, 'Certification name is required').max(200),
  issuingBody: z.string().max(200).optional(),
  issuedDate: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().max(2000).optional()
});

export const UpdateCertificationSchema = CreateCertificationSchema.partial();

export const ListCertificationsQuerySchema = z.object({
  scope: z.enum(['mine', 'all']).default('mine'),
  employeeId: z.string().uuid().optional()
});
