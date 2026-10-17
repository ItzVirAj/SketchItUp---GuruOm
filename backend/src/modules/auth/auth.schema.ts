import { z } from 'zod';

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    oldPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long.')
      .refine((val) => val !== 'Pass@123', {
        message: 'New password cannot be the default temporary password "Pass@123".'
      })
  })
  .refine((data) => Boolean(data.currentPassword || data.oldPassword), {
    message: 'Current password is required.',
    path: ['currentPassword']
  })
  .refine(
    (data) => {
      const current = (data.currentPassword || data.oldPassword || '').trim();
      return data.newPassword.trim() !== current;
    },
    {
      message: 'New password must differ from current password.',
      path: ['newPassword']
    }
  );

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
