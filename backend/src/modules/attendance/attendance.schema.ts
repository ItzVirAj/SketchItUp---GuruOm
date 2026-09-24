import { z } from 'zod';

export const AttendanceStatusSchema = z.enum([
  'PRESENT',
  'ABSENT',
  'HALF_DAY',
  'ON_LEAVE',
  'HOLIDAY',
  'LATE'
]);

export type AttendanceStatus = z.infer<typeof AttendanceStatusSchema>;

export const AttendanceListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  status: AttendanceStatusSchema.optional(),
  scope: z.enum(['mine', 'all']).optional(),
  userId: z.string().trim().optional(),
  user_id: z.string().trim().optional()
});

export const CreateAttendanceSchema = z
  .object({
    userId: z.string().trim().optional(),
    user_id: z.string().trim().optional(),
    workDate: z.string().trim().optional(),
    work_date: z.string().trim().optional(),
    status: AttendanceStatusSchema.default('PRESENT'),
    checkIn: z.string().trim().optional().nullable(),
    check_in: z.string().trim().optional().nullable(),
    checkOut: z.string().trim().optional().nullable(),
    check_out: z.string().trim().optional().nullable(),
    source: z.string().trim().default('MANUAL'),
    notes: z.string().trim().max(1000).optional().nullable()
  })
  .refine(
    (data) => Boolean((data.userId && data.userId.length > 0) || (data.user_id && data.user_id.length > 0)),
    { message: 'User ID is required', path: ['userId'] }
  )
  .refine(
    (data) => Boolean((data.workDate && data.workDate.length > 0) || (data.work_date && data.work_date.length > 0)),
    { message: 'Work date is required', path: ['workDate'] }
  )
  .transform((data) => {
    const userId = (data.userId || data.user_id)!;
    const workDate = (data.workDate || data.work_date)!;
    const checkIn = data.checkIn || data.check_in || null;
    const checkOut = data.checkOut || data.check_out || null;
    return {
      userId,
      user_id: userId,
      workDate,
      work_date: workDate,
      status: data.status,
      checkIn,
      check_in: checkIn,
      checkOut,
      check_out: checkOut,
      source: data.source,
      notes: data.notes
    };
  });

export const UpdateAttendanceSchema = z
  .object({
    status: AttendanceStatusSchema.optional(),
    checkIn: z.string().trim().optional().nullable(),
    check_in: z.string().trim().optional().nullable(),
    checkOut: z.string().trim().optional().nullable(),
    check_out: z.string().trim().optional().nullable(),
    source: z.string().trim().optional(),
    notes: z.string().trim().max(1000).optional().nullable()
  })
  .transform((data) => {
    return {
      status: data.status,
      checkIn: data.checkIn !== undefined ? data.checkIn : data.check_in,
      check_in: data.checkIn !== undefined ? data.checkIn : data.check_in,
      checkOut: data.checkOut !== undefined ? data.checkOut : data.check_out,
      check_out: data.checkOut !== undefined ? data.checkOut : data.check_out,
      source: data.source,
      notes: data.notes
    };
  });

export const CheckInSchema = z.object({
  shift: z.string().trim().max(50).optional()
});

// Aliases for convenience
export const ListAttendanceQuerySchema = AttendanceListQuerySchema;
export const AttendanceStatusEnum = AttendanceStatusSchema;
