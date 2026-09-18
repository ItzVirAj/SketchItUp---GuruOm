import { z } from 'zod';

export const LeaveTypeSchema = z.enum(['CASUAL', 'SICK', 'EARNED', 'UNPAID']);
export const LeaveStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);

export const CreateLeaveRequestSchema = z
  .object({
    leaveType: LeaveTypeSchema.optional(),
    leave_type: LeaveTypeSchema.optional(),
    startDate: z.string().trim().optional(),
    start_date: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    end_date: z.string().trim().optional(),
    reason: z.string().trim().max(1000).optional().nullable()
  })
  .refine(
    (data) => Boolean((data.startDate && data.startDate.length > 0) || (data.start_date && data.start_date.length > 0)),
    {
      message: 'Start date is required',
      path: ['startDate']
    }
  )
  .refine(
    (data) => Boolean((data.endDate && data.endDate.length > 0) || (data.end_date && data.end_date.length > 0)),
    {
      message: 'End date is required',
      path: ['endDate']
    }
  )
  .refine(
    (data) => {
      const sStr = data.startDate || data.start_date;
      const eStr = data.endDate || data.end_date;
      if (!sStr || !eStr) return true;
      const s = new Date(sStr).getTime();
      const e = new Date(eStr).getTime();
      return !isNaN(s) && !isNaN(e) && e >= s;
    },
    {
      message: 'End date must be on or after start date',
      path: ['endDate']
    }
  )
  .transform((data) => {
    const leaveType = data.leaveType || data.leave_type || 'CASUAL';
    const startDate = (data.startDate || data.start_date)!;
    const endDate = (data.endDate || data.end_date)!;
    return {
      leaveType,
      leave_type: leaveType,
      startDate,
      start_date: startDate,
      endDate,
      end_date: endDate,
      reason: data.reason
    };
  });

export const DecideLeaveRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  decision_note: z.string().trim().max(1000).optional().nullable(),
  decisionNote: z.string().trim().max(1000).optional().nullable()
});

export const LeaveListQuerySchema = z.object({
  status: LeaveStatusSchema.optional(),
  requester: z.string().trim().optional(),
  requester_id: z.string().trim().optional(),
  scope: z.enum(['mine', 'all']).optional()
});

// Aliases for convenience
export const createLeaveRequestSchema = CreateLeaveRequestSchema;
export const decideLeaveRequestSchema = DecideLeaveRequestSchema;
export const leaveQuerySchema = LeaveListQuerySchema;
