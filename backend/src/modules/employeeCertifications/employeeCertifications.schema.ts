import { z } from 'zod';

export const CreateEmployeeCertificationSchema = z.object({
  employee_id: z.string().uuid({ message: 'Valid employee ID (UUID) is required.' }),
  title: z.string().min(1, 'Certificate title is required.').max(255),
  issuing_body: z.string().min(1, 'Issuing body is required.').max(255),
  issued_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Issued date must be in YYYY-MM-DD format.'),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expiry date must be in YYYY-MM-DD format.').nullable().optional(),
  document_url: z.string().nullable().optional(),
  org_id: z.string().optional()
}).refine(data => {
  if (data.expiry_date && data.issued_date) {
    return new Date(data.expiry_date) >= new Date(data.issued_date);
  }
  return true;
}, {
  message: 'Expiry date must be on or after the issued date.',
  path: ['expiry_date']
});

export const UpdateEmployeeCertificationSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  issuing_body: z.string().min(1).max(255).optional(),
  issued_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  document_url: z.string().nullable().optional()
}).refine(data => {
  if (data.expiry_date && data.issued_date) {
    return new Date(data.expiry_date) >= new Date(data.issued_date);
  }
  return true;
}, {
  message: 'Expiry date must be on or after the issued date.',
  path: ['expiry_date']
});

export const EmployeeCertificationQuerySchema = z.object({
  scope: z.enum(['all', 'mine']).optional(),
  employee_id: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'ALL']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional()
});

export type CreateEmployeeCertificationInput = z.infer<typeof CreateEmployeeCertificationSchema>;
export type UpdateEmployeeCertificationInput = z.infer<typeof UpdateEmployeeCertificationSchema>;
export type EmployeeCertificationQueryParams = z.infer<typeof EmployeeCertificationQuerySchema>;
