import { z } from 'zod';
import { getDbClient } from '../../config/database';
import { auditService } from '../audit/audit.service';
import { logger } from '../../utils/logger';
import { getRoleModulePermission } from '../../../../src/utils/rbacMatrix';
import { 
  CreateLeaveRequestSchema, 
  DecideLeaveRequestSchema, 
  LeaveListQuerySchema 
} from './leave.schema';

export interface LeaveActor {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export class ForbiddenLeaveActionError extends Error {
  readonly statusCode = 403;
  constructor(message = 'You are not authorized to perform this leave action.') {
    super(message);
    this.name = 'ForbiddenLeaveActionError';
  }
}

export class LeaveNotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message = 'Leave request not found.') {
    super(message);
    this.name = 'LeaveNotFoundError';
  }
}

export class InvalidLeaveStateError extends Error {
  readonly statusCode = 400;
  constructor(message = 'Invalid leave request state for this action.') {
    super(message);
    this.name = 'InvalidLeaveStateError';
  }
}

export class LeaveService {
  private db = getDbClient();

  private mapLeave(row: any) {
    const requesterId = row.requester_id || row.employee_id;
    const requesterUser = row.requester || row.users;
    return {
      id: row.id,
      requesterId: requesterId,
      employeeId: requesterId,
      leaveType: row.leave_type,
      startDate: row.start_date,
      endDate: row.end_date,
      reason: row.reason,
      status: row.status,
      decidedBy: row.decided_by,
      decidedAt: row.decided_at,
      decisionNote: row.decision_note || row.decision_notes || null,
      orgId: row.org_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      requester: requesterUser ? {
        id: requesterUser.id,
        name: requesterUser.full_name || requesterUser.name,
        email: requesterUser.email,
        department: requesterUser.department
      } : undefined,
      decider: row.decider ? {
        id: row.decider.id,
        name: row.decider.full_name || row.decider.name,
        email: row.decider.email
      } : undefined
    };
  }

  async listLeaveRequests(actor: LeaveActor, queryParams: z.infer<typeof LeaveListQuerySchema>) {
    const perm = getRoleModulePermission(actor.role, 'leave_requests');
    const hasAllScope = perm.scopeRule === 'ALL';

    const buildQuery = (colName: 'requester_id' | 'employee_id') => {
      let q = this.db.from('leave_requests').select('*').order('created_at', { ascending: false });

      if (!hasAllScope || queryParams.scope === 'mine') {
        q = q.eq(colName, actor.id);
      } else {
        const targetRequester = queryParams.requester_id || queryParams.requester;
        if (targetRequester) {
          q = q.eq(colName, targetRequester);
        }
      }

      if (queryParams.status) {
        q = q.eq('status', queryParams.status);
      }
      return q;
    };

    let { data, error } = await buildQuery('requester_id');
    if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache'))) {
      const res = await buildQuery('employee_id');
      data = res.data;
      error = res.error;
    }

    if (error) throw error;
    return (data || []).map(this.mapLeave);
  }

  async getLeaveRequestById(id: string, actor: LeaveActor) {
    const perm = getRoleModulePermission(actor.role, 'leave_requests');
    const hasAllScope = perm.scopeRule === 'ALL';

    const { data, error } = await this.db
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new LeaveNotFoundError();

    const requesterId = data.requester_id || data.employee_id;
    if (!hasAllScope && requesterId !== actor.id) {
      throw new ForbiddenLeaveActionError('You can only view your own leave requests.');
    }

    return this.mapLeave(data);
  }

  async createLeaveRequest(input: z.infer<typeof CreateLeaveRequestSchema>, actor: LeaveActor) {
    const validated = CreateLeaveRequestSchema.parse(input);

    const fullRow = {
      requester_id: actor.id,
      employee_id: actor.id,
      leave_type: validated.leaveType,
      start_date: validated.startDate,
      end_date: validated.endDate,
      reason: validated.reason || null,
      status: 'PENDING',
      created_by: actor.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let { data, error } = await this.db
      .from('leave_requests')
      .insert(fullRow)
      .select('*')
      .single();

    if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache'))) {
      const compatRow = {
        employee_id: actor.id,
        leave_type: validated.leaveType,
        start_date: validated.startDate,
        end_date: validated.endDate,
        reason: validated.reason || null,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const res = await this.db
        .from('leave_requests')
        .insert(compatRow)
        .select('*')
        .single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      logger.error('[LeaveService] Error inserting leave request:', error);
      throw error;
    }

    await auditService.recordAuditLog({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'LEAVE_REQUEST_CREATED',
      entityType: 'leave_requests',
      entityId: data.id,
      details: `${actor.email} filed a ${validated.leaveType} leave request from ${validated.startDate} to ${validated.endDate}.`
    });

    return this.mapLeave(data);
  }

  async decideLeaveRequest(id: string, input: z.infer<typeof DecideLeaveRequestSchema>, actor: LeaveActor) {
    const validated = DecideLeaveRequestSchema.parse(input);
    const decisionNote = validated.decision_note || validated.decisionNote || null;

    const { data: existing, error: findError } = await this.db
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findError) throw findError;
    if (!existing) throw new LeaveNotFoundError();

    if (existing.status !== 'PENDING') {
      throw new InvalidLeaveStateError(`Cannot decide a leave request that is already ${existing.status}.`);
    }

    const now = new Date().toISOString();
    const updatePayload = {
      status: validated.status,
      decided_by: actor.id,
      decided_at: now,
      decision_note: decisionNote,
      decision_notes: decisionNote,
      updated_by: actor.id,
      updated_at: now
    };

    let { data: updated, error: updateError } = await this.db
      .from('leave_requests')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError && (updateError.code === 'PGRST204' || updateError.message?.includes('schema cache'))) {
      const compatUpdate = {
        status: validated.status,
        decided_by: actor.id,
        decided_at: now,
        decision_notes: decisionNote,
        updated_at: now
      };
      const res = await this.db
        .from('leave_requests')
        .update(compatUpdate)
        .eq('id', id)
        .select('*')
        .single();
      updated = res.data;
      updateError = res.error;
    }

    if (updateError) {
      logger.error('[LeaveService] Error updating leave decision:', updateError);
      throw updateError;
    }

    await auditService.recordAuditLog({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: `LEAVE_REQUEST_${validated.status}`,
      entityType: 'leave_requests',
      entityId: id,
      details: `${actor.email} marked leave request ${id} as ${validated.status}. Note: ${decisionNote || 'None'}`
    });

    return this.mapLeave(updated);
  }

  async cancelLeaveRequest(id: string, actor: LeaveActor) {
    const { data: existing, error: findError } = await this.db
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findError) throw findError;
    if (!existing) throw new LeaveNotFoundError();

    const requesterId = existing.requester_id || existing.employee_id;
    if (requesterId !== actor.id) {
      throw new ForbiddenLeaveActionError('You can only cancel your own leave requests.');
    }

    if (existing.status !== 'PENDING') {
      throw new InvalidLeaveStateError('Only pending leave requests can be cancelled.');
    }

    const now = new Date().toISOString();
    let { data: updated, error: updateError } = await this.db
      .from('leave_requests')
      .update({
        status: 'CANCELLED',
        updated_by: actor.id,
        updated_at: now
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError && (updateError.code === 'PGRST204' || updateError.message?.includes('schema cache'))) {
      const res = await this.db
        .from('leave_requests')
        .update({
          status: 'CANCELLED',
          updated_at: now
        })
        .eq('id', id)
        .select('*')
        .single();
      updated = res.data;
      updateError = res.error;
    }

    if (updateError) {
      logger.error('[LeaveService] Error cancelling leave request:', updateError);
      throw updateError;
    }

    await auditService.recordAuditLog({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'LEAVE_REQUEST_CANCELLED',
      entityType: 'leave_requests',
      entityId: id,
      details: `${actor.email} cancelled their leave request ${id}.`
    });

    return this.mapLeave(updated);
  }

  async resolveLeaveRequest(id: string, status: 'APPROVED' | 'REJECTED', actorId?: string, note?: string) {
    const actor: LeaveActor = {
      id: actorId || 'system',
      email: 'approvals@guruom.in',
      role: 'Owner'
    };
    return this.decideLeaveRequest(id, { status, decision_note: note || '' }, actor);
  }
}

export const leaveService = new LeaveService();
