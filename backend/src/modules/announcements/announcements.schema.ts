import { z } from 'zod';

export const CreateAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Body is required').max(5000),
  pinned: z.boolean().optional().default(false),
  publishedAt: z.string().datetime({ offset: true }).optional(),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional()
});

export const UpdateAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).optional(),
  body: z.string().min(1, 'Body is required').max(5000).optional(),
  pinned: z.boolean().optional(),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional()
});

export type CreateAnnouncementInput = z.infer<typeof CreateAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof UpdateAnnouncementSchema>;

