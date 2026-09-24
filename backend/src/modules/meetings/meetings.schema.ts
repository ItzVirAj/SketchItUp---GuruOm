import { z } from 'zod';

export const MeetingStatusEnum = z.enum(['SCHEDULED', 'CANCELLED', 'COMPLETED']);

// Reminder offsets fired before start_time. Fixed for v1 (not yet user-configurable).
export const REMINDER_OFFSETS_MINUTES: { label: string; minutesBefore: number }[] = [
  { label: '24h_before', minutesBefore: 24 * 60 },
  { label: '15m_before', minutesBefore: 15 }
];

export const CreateMeetingSchema = z
  .object({
    title: z.string().min(1, 'Meeting title is required').max(200),
    agenda: z.string().max(4000).optional(),
    section: z.string().max(100).optional(),
    meetingLink: z.string().url('Meeting link must be a valid URL').optional().or(z.literal('')),
    location: z.string().max(300).optional(),
    startTime: z.string().datetime({ offset: true, message: 'startTime must be an ISO 8601 datetime' }),
    endTime: z.string().datetime({ offset: true, message: 'endTime must be an ISO 8601 datetime' }),
    attendeeUserIds: z.array(z.string().uuid()).default([])
  })
  .refine((data) => new Date(data.endTime).getTime() > new Date(data.startTime).getTime(), {
    message: 'endTime must be after startTime',
    path: ['endTime']
  })
  .refine((data) => new Date(data.startTime).getTime() > Date.now() - 5 * 60 * 1000, {
    message: 'startTime cannot be in the past',
    path: ['startTime']
  });

export const UpdateMeetingSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    agenda: z.string().max(4000).optional(),
    section: z.string().max(100).optional(),
    meetingLink: z.string().url().optional().or(z.literal('')),
    location: z.string().max(300).optional(),
    startTime: z.string().datetime({ offset: true }).optional(),
    endTime: z.string().datetime({ offset: true }).optional(),
    attendeeUserIds: z.array(z.string().uuid()).optional()
  })
  .refine(
    (data) =>
      !data.startTime || !data.endTime || new Date(data.endTime).getTime() > new Date(data.startTime).getTime(),
    { message: 'endTime must be after startTime', path: ['endTime'] }
  );

export const ListMeetingsQuerySchema = z.object({
  scope: z.enum(['upcoming', 'mine', 'all']).default('upcoming'),
  status: MeetingStatusEnum.optional()
});
