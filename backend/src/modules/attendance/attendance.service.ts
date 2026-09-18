import { z } from 'zod';
import { getDbClient } from '../../config/database';
import { auditService } from '../audit/audit.service';
import { logger } from '../../utils/logger';
import {
  CreateAttendanceSchema,
  UpdateAttendanceSchema,
  AttendanceListQuerySchema
} from './attendance.schema';

export interface AttendanceActor {
  id: string;
  email: string;
  role?: string;
  name?: string;
}

export class AttendanceNotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message = 'Attendance record not found.') {
    super(message);
    this.name = 'AttendanceNotFoundError';
  }
}

export class ForbiddenAttendanceActionError extends Error {
  readonly statusCode = 403;
  constructor(message = 'You are not authorized to perform this attendance action.') {
    super(message);
    this.name = 'ForbiddenAttendanceActionError';
  }
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export class AttendanceService {
  private db = getDbClient();

  private mapLog(row: any) {
    const userId = row.user_id || row.employee_id;
    const workDate = row.work_date || row.log_date;
    const checkIn = row.check_in || row.check_in_at;
    const checkOut = row.check_out || row.check_out_at;
    const createdBy = row.created_by || row.marked_by;
    const user = row.users || row.user;

    return {
      id: row.id,
      userId,
      employeeId: userId,
      workDate,
      logDate: workDate,
      checkIn,
      checkInAt: checkIn,
      checkOut,
      checkOutAt: checkOut,
      status: row.status,
      source: row.source || 'MANUAL',
      notes: row.notes || null,
      orgId: row.org_id,
      createdBy,
      markedBy: createdBy,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: user
        ? {
            id: user.id,
            name: user.full_name || user.name,
            email: user.email,
            department: user.department,
            role: user.role
          }
        : undefined,
      employeeName: user?.full_name || user?.name
    };
  }

  async listAttendance(
    actor: AttendanceActor,
    isOwnRecordsOnly: boolean,
    queryParams: z.infer<typeof AttendanceListQuerySchema>
  ) {
    let matchedUserIds: string[] | null = null;

    if (!isOwnRecordsOnly && queryParams.search) {
      const searchPattern = `%${queryParams.search.trim()}%`;
      const { data: users, error: userError } = await this.db
        .from('users')
        .select('id')
        .or(`full_name.ilike.${searchPattern},email.ilike.${searchPattern}`);

      if (userError) {
        logger.warn('[AttendanceService] Search users error:', userError);
      } else {
        matchedUserIds = (users || []).map((u: any) => u.id);
        if (matchedUserIds.length === 0) {
          return [];
        }
      }
    }

    const buildQuery = (colName: 'user_id' | 'employee_id', dateCol: 'work_date' | 'log_date') => {
      let q = this.db
        .from('attendance_logs')
        .select('*')
        .order(dateCol, { ascending: false });

      if (isOwnRecordsOnly || queryParams.scope === 'mine') {
        // Strictly scope to caller — search query is ignored for own records
        q = q.eq(colName, actor.id);
      } else {
        const targetUser = queryParams.userId || queryParams.user_id;
        if (targetUser) {
          q = q.eq(colName, targetUser);
        } else if (matchedUserIds !== null) {
          q = q.in(colName, matchedUserIds);
        }
      }

      if (queryParams.from) {
        q = q.gte(dateCol, queryParams.from);
      }
      if (queryParams.to) {
        q = q.lte(dateCol, queryParams.to);
      }
      if (queryParams.status) {
        q = q.eq('status', queryParams.status);
      }

      return q;
    };

    let { data, error } = await buildQuery('user_id', 'work_date');
    if (error && (error.code === 'PGRST204' || error.message?.includes('does not exist') || error.message?.includes('schema cache'))) {
      const res = await buildQuery('employee_id', 'log_date');
      data = res.data;
      error = res.error;
    }

    if (error) throw error;
    return (data || []).map((row: any) => this.mapLog(row));
  }

  async getMyAttendance(
    actor: AttendanceActor,
    queryParams: Pick<z.infer<typeof AttendanceListQuerySchema>, 'from' | 'to' | 'status'>
  ) {
    return this.listAttendance(actor, true, {
      ...queryParams,
      scope: 'mine'
    });
  }

  async createAttendance(
    input: z.input<typeof CreateAttendanceSchema>,
    actor: AttendanceActor
  ) {
    const validated = CreateAttendanceSchema.parse(input);

    const fullRow = {
      user_id: validated.userId,
      employee_id: validated.userId,
      work_date: validated.workDate,
      log_date: validated.workDate,
      status: validated.status,
      check_in: validated.checkIn,
      check_in_at: validated.checkIn,
      check_out: validated.checkOut,
      check_out_at: validated.checkOut,
      source: validated.source || 'MANUAL',
      notes: validated.notes || null,
      created_by: actor.id,
      marked_by: actor.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let { data, error } = await this.db
      .from('attendance_logs')
      .insert(fullRow)
      .select('*')
      .single();

    if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache'))) {
      const compatRow = {
        employee_id: validated.userId,
        log_date: validated.workDate,
        status: validated.status,
        check_in_at: validated.checkIn,
        check_out_at: validated.checkOut,
        notes: validated.notes || null,
        marked_by: actor.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const res = await this.db
        .from('attendance_logs')
        .insert(compatRow)
        .select('*')
        .single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      logger.error('[AttendanceService] Error inserting attendance record:', error);
      throw error;
    }

    await auditService.recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role || 'HR/Admin',
      action: 'ATTENDANCE_LOG_CREATED',
      entityType: 'attendance_logs',
      entityId: data.id,
      details: `${actor.email} recorded attendance for ${validated.userId} on ${validated.workDate} as ${validated.status}.`
    });

    return this.mapLog(data);
  }

  async updateAttendance(
    id: string,
    input: z.input<typeof UpdateAttendanceSchema>,
    actor: AttendanceActor
  ) {
    const validated = UpdateAttendanceSchema.parse(input);

    const { data: existing, error: findError } = await this.db
      .from('attendance_logs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findError) throw findError;
    if (!existing) throw new AttendanceNotFoundError();

    const now = new Date().toISOString();
    const updatePayload: any = {
      updated_at: now
    };

    if (validated.status !== undefined) updatePayload.status = validated.status;
    if (validated.checkIn !== undefined) {
      updatePayload.check_in = validated.checkIn;
      updatePayload.check_in_at = validated.checkIn;
    }
    if (validated.checkOut !== undefined) {
      updatePayload.check_out = validated.checkOut;
      updatePayload.check_out_at = validated.checkOut;
    }
    if (validated.source !== undefined) updatePayload.source = validated.source;
    if (validated.notes !== undefined) updatePayload.notes = validated.notes;

    let { data: updated, error: updateError } = await this.db
      .from('attendance_logs')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError && (updateError.code === 'PGRST204' || updateError.message?.includes('schema cache'))) {
      const compatPayload: any = { updated_at: now };
      if (validated.status !== undefined) compatPayload.status = validated.status;
      if (validated.checkIn !== undefined) compatPayload.check_in_at = validated.checkIn;
      if (validated.checkOut !== undefined) compatPayload.check_out_at = validated.checkOut;
      if (validated.notes !== undefined) compatPayload.notes = validated.notes;

      const res = await this.db
        .from('attendance_logs')
        .update(compatPayload)
        .eq('id', id)
        .select('*')
        .single();
      updated = res.data;
      updateError = res.error;
    }

    if (updateError) {
      logger.error('[AttendanceService] Error updating attendance record:', updateError);
      throw updateError;
    }

    await auditService.recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role || 'HR/Admin',
      action: 'ATTENDANCE_LOG_UPDATED',
      entityType: 'attendance_logs',
      entityId: id,
      details: `${actor.email} updated attendance record ${id}.`
    });

    return this.mapLog(updated);
  }

  async checkIn(actor: AttendanceActor, shiftOverride?: string) {
    const today = todayDateString();

    const { data: user } = await this.db
      .from('users')
      .select('shift')
      .eq('id', actor.id)
      .maybeSingle();
    const shift = shiftOverride || user?.shift || 'General-Day';

    const { data: existing } = await this.db
      .from('attendance_logs')
      .select('id, check_in, check_in_at')
      .or(`user_id.eq.${actor.id},employee_id.eq.${actor.id}`)
      .or(`work_date.eq.${today},log_date.eq.${today}`)
      .maybeSingle();

    if (existing?.check_in || existing?.check_in_at) {
      throw new Error('Already checked in today.');
    }

    const now = new Date().toISOString();
    return this.createAttendance(
      {
        userId: actor.id,
        workDate: today,
        status: 'PRESENT',
        checkIn: now,
        source: 'MANUAL',
        notes: `Shift: ${shift}`
      },
      actor
    );
  }

  async checkOut(actor: AttendanceActor) {
    const today = todayDateString();
    const { data: existing } = await this.db
      .from('attendance_logs')
      .select('id, check_in, check_in_at, check_out, check_out_at')
      .or(`user_id.eq.${actor.id},employee_id.eq.${actor.id}`)
      .or(`work_date.eq.${today},log_date.eq.${today}`)
      .maybeSingle();

    if (!existing || (!existing.check_in && !existing.check_in_at)) {
      throw new Error('You have not checked in today.');
    }
    if (existing.check_out || existing.check_out_at) {
      throw new Error('Already checked out today.');
    }

    const now = new Date().toISOString();
    return this.updateAttendance(existing.id, { checkOut: now }, actor);
  }
}

export const attendanceService = new AttendanceService();
