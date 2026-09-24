import { z } from 'zod';
import { getDbClient } from '../../config/database';
import { auditService } from '../audit/audit.service';
import { logger } from '../../utils/logger';
import { enqueueJob } from '../../lib/queues';
import { getRoleModulePermission, hasMinimumAccess } from '../../../../src/utils/rbacMatrix';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  TASK_REMINDER_OFFSETS
} from './tasks.schema';

export interface TaskActor {
  id: string;
  email: string;
  role: string;
}

export class ForbiddenTaskActionError extends Error {
  constructor(message = 'You are not the assignee, assigner, or an admin on this task.') {
    super(message);
    this.name = 'ForbiddenTaskActionError';
  }
}

export class TasksService {
  private db = getDbClient();

  /** Owner / Admin (System) / ServerAdmin / TESTER — the only roles with unrestricted task authority. */
  private hasFullTaskAccess(role: string): boolean {
    const perm = getRoleModulePermission(role, 'tasks');
    return hasMinimumAccess(perm.accessLevel, 'FULL_APPROVE');
  }

  async listTasks(actor: TaskActor, opts: { scope: 'mine' | 'assigned-by-me' | 'all'; status?: string }) {
    const fullAccess = this.hasFullTaskAccess(actor.role);

    let query = this.db
      .from('tasks')
      .select('id, title, description, section, priority, status, due_date, assigned_by, linked_entity_type, linked_entity_id, linked_entity_label, created_at, updated_at, completed_at')
      .order('due_date', { ascending: true, nullsFirst: false })
      .neq('status', 'CANCELLED');

    if (opts.status) query = query.eq('status', opts.status);

    // Non-full-access roles are hard-scoped server-side to tasks they're
    // involved in — 'scope' just changes which slice of *those* they see.
    if (!fullAccess) {
      const { data: myAssignments } = await this.db.from('task_assignees').select('task_id').eq('user_id', actor.id);
      const myTaskIds = (myAssignments || []).map((r) => r.task_id);
      query = query.or(`assigned_by.eq.${actor.id},id.in.(${myTaskIds.length ? myTaskIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);
    } else if (opts.scope === 'mine') {
      const { data: myAssignments } = await this.db.from('task_assignees').select('task_id').eq('user_id', actor.id);
      const myTaskIds = (myAssignments || []).map((r) => r.task_id);
      query = query.in('id', myTaskIds.length ? myTaskIds : ['00000000-0000-0000-0000-000000000000']);
    } else if (opts.scope === 'assigned-by-me') {
      query = query.eq('assigned_by', actor.id);
    }

    const { data: tasks, error } = await query;
    if (error) throw error;
    if (!tasks || tasks.length === 0) return [];

    const taskIds = tasks.map((t) => t.id);
    const { data: assigneeRows } = await this.db
      .from('task_assignees')
      .select('task_id, user_id, users:user_id ( id, full_name, email )')
      .in('task_id', taskIds);

    const assigneesByTask = new Map<string, any[]>();
    for (const row of assigneeRows || []) {
      const list = assigneesByTask.get(row.task_id) || [];
      list.push({ userId: row.user_id, name: (row as any).users?.full_name, email: (row as any).users?.email });
      assigneesByTask.set(row.task_id, list);
    }

    return tasks.map((t) => this.mapTask(t, assigneesByTask.get(t.id) || []));
  }

  async getTaskById(id: string) {
    const { data: task, error } = await this.db.from('tasks').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!task) return null;

    const [{ data: assigneeRows }, { data: commentRows }] = await Promise.all([
      this.db.from('task_assignees').select('user_id, users:user_id ( id, full_name, email )').eq('task_id', id),
      this.db
        .from('task_comments')
        .select('id, body, created_at, author_id, users:author_id ( id, full_name )')
        .eq('task_id', id)
        .order('created_at', { ascending: true })
    ]);

    const assignees = (assigneeRows || []).map((row: any) => ({
      userId: row.user_id,
      name: row.users?.full_name,
      email: row.users?.email
    }));
    const comments = (commentRows || []).map((row: any) => ({
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      authorId: row.author_id,
      authorName: row.users?.full_name
    }));

    return this.mapTask(task, assignees, comments);
  }

  /** Throws ForbiddenTaskActionError unless actor is full-access, the assigner, or an assignee. */
  private async assertCanActOnTask(taskId: string, actor: TaskActor) {
    if (this.hasFullTaskAccess(actor.role)) return;

    const { data: task } = await this.db.from('tasks').select('assigned_by').eq('id', taskId).maybeSingle();
    if (task?.assigned_by === actor.id) return;

    const { data: assignment } = await this.db
      .from('task_assignees')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', actor.id)
      .maybeSingle();
    if (assignment) return;

    throw new ForbiddenTaskActionError();
  }

  async createTask(input: z.infer<typeof CreateTaskSchema>, actor: TaskActor) {
    if (!this.hasFullTaskAccess(actor.role)) {
      throw new ForbiddenTaskActionError('Only Owner/Admin can assign new tasks today.');
    }
    const validated = CreateTaskSchema.parse(input);

    const { data: inserted, error } = await this.db
      .from('tasks')
      .insert({
        title: validated.title,
        description: validated.description,
        section: validated.section,
        priority: validated.priority,
        due_date: validated.dueDate || null,
        assigned_by: actor.id,
        linked_entity_type: validated.linkedEntityType,
        linked_entity_id: validated.linkedEntityId,
        linked_entity_label: validated.linkedEntityLabel,
        created_by: actor.id,
        updated_by: actor.id
      })
      .select('*')
      .single();

    if (error) throw error;
    const taskId = inserted.id;

    try {
      const { error: assErr } = await this.db
        .from('task_assignees')
        .insert(validated.assigneeUserIds.map((userId) => ({ task_id: taskId, user_id: userId })));
      if (assErr) throw assErr;
    } catch (assErr) {
      logger.error(`[Tasks] Assignee insert failed for task ${taskId}, rolling back task row.`, assErr);
      await this.db.from('tasks').delete().eq('id', taskId);
      throw assErr;
    }

    if (validated.dueDate) {
      await this.scheduleDueReminders(taskId, validated.title, validated.dueDate, validated.assigneeUserIds);
    }

    await auditService.recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'TASK_CREATED',
      entityType: 'tasks',
      entityId: taskId,
      metadata: { details: `Assigned task "${validated.title}"`, assigneeCount: validated.assigneeUserIds.length }
    });

    return this.getTaskById(taskId);
  }

  async updateTask(id: string, input: z.infer<typeof UpdateTaskSchema>, actor: TaskActor) {
    if (!this.hasFullTaskAccess(actor.role)) {
      throw new ForbiddenTaskActionError('Only Owner/Admin can edit task details today. Assignees can update status and comment.');
    }
    const existing = await this.getTaskById(id);
    if (!existing) throw new Error(`Task ${id} not found.`);
    if (existing.status === 'CANCELLED') throw new Error('Cannot edit a cancelled task.');

    const validated = UpdateTaskSchema.parse(input);
    const patch: Record<string, any> = { updated_by: actor.id };
    if (validated.title !== undefined) patch.title = validated.title;
    if (validated.description !== undefined) patch.description = validated.description;
    if (validated.section !== undefined) patch.section = validated.section;
    if (validated.priority !== undefined) patch.priority = validated.priority;
    if (validated.dueDate !== undefined) patch.due_date = validated.dueDate;
    if (validated.linkedEntityType !== undefined) patch.linked_entity_type = validated.linkedEntityType;
    if (validated.linkedEntityId !== undefined) patch.linked_entity_id = validated.linkedEntityId;
    if (validated.linkedEntityLabel !== undefined) patch.linked_entity_label = validated.linkedEntityLabel;

    const { error } = await this.db.from('tasks').update(patch).eq('id', id);
    if (error) throw error;

    if (validated.assigneeUserIds) {
      await this.db.from('task_assignees').delete().eq('task_id', id);
      await this.db
        .from('task_assignees')
        .insert(validated.assigneeUserIds.map((userId) => ({ task_id: id, user_id: userId })));
    }

    const dueDateChanged = validated.dueDate !== undefined && validated.dueDate !== existing.dueDate;
    if (dueDateChanged || validated.assigneeUserIds) {
      await this.cancelReminderJobs(id);
      const finalDue = validated.dueDate !== undefined ? validated.dueDate : existing.dueDate;
      const finalAssignees = validated.assigneeUserIds || existing.assignees.map((a) => a.userId);
      const finalTitle = validated.title || existing.title;
      if (finalDue) await this.scheduleDueReminders(id, finalTitle, finalDue, finalAssignees);
    }

    await auditService.recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'TASK_UPDATED',
      entityType: 'tasks',
      entityId: id,
      metadata: { details: `Updated task "${existing.title}"`, changedFields: Object.keys(patch) }
    });

    return this.getTaskById(id);
  }

  /** Assignee-scoped: the assignee, the assigner, or a full-access role can move the status. */
  async updateStatus(id: string, status: string, actor: TaskActor) {
    await this.assertCanActOnTask(id, actor);

    const existing = await this.getTaskById(id);
    if (!existing) throw new Error(`Task ${id} not found.`);
    if (existing.status === 'CANCELLED') throw new Error('Cannot change the status of a cancelled task.');

    const { error } = await this.db.from('tasks').update({ status, updated_by: actor.id }).eq('id', id);
    if (error) throw error;

    if (status === 'DONE') {
      await this.cancelReminderJobs(id); // no point reminding about a finished task
    }

    await auditService.recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'TASK_STATUS_CHANGED',
      entityType: 'tasks',
      entityId: id,
      metadata: { details: `"${existing.title}" moved ${existing.status} -> ${status}` }
    });

    return this.getTaskById(id);
  }

  /** Assignee-scoped: same authorization as updateStatus. */
  async addComment(id: string, body: string, actor: TaskActor) {
    await this.assertCanActOnTask(id, actor);

    const { data: comment, error } = await this.db
      .from('task_comments')
      .insert({ task_id: id, author_id: actor.id, body })
      .select('id, body, created_at, author_id')
      .single();
    if (error) throw error;

    return { id: comment.id, body: comment.body, createdAt: comment.created_at, authorId: comment.author_id };
  }

  /** Soft-delete only, matching the "no deletes on transactional records" convention from meetings/orders. */
  async cancelTask(id: string, actor: TaskActor, reason?: string) {
    if (!this.hasFullTaskAccess(actor.role)) {
      throw new ForbiddenTaskActionError('Only Owner/Admin can cancel a task today.');
    }
    const existing = await this.getTaskById(id);
    if (!existing) throw new Error(`Task ${id} not found.`);
    if (existing.status === 'CANCELLED') return existing;

    const { error } = await this.db.from('tasks').update({ status: 'CANCELLED', updated_by: actor.id }).eq('id', id);
    if (error) throw error;

    await this.cancelReminderJobs(id);

    await enqueueJob('create-notification', {
      name: 'task_cancelled',
      message: `Task "${existing.title}" has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
      severity: 'INFO',
      tenantId: 't_default'
    }).catch((err) => logger.warn('[Tasks] Failed to enqueue cancellation notification:', err));

    await auditService.recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'TASK_CANCELLED',
      entityType: 'tasks',
      entityId: id,
      metadata: { details: `Cancelled task "${existing.title}". ${reason ? `Reason: ${reason}` : ''}` }
    });

    return this.getTaskById(id);
  }

  // --------------------------------------------------------------------
  // Reminders (BullMQ) — same pattern as meetings.service.ts.
  // --------------------------------------------------------------------

  private async scheduleDueReminders(taskId: string, title: string, dueDateIso: string, assigneeUserIds: string[]) {
    const dueMs = new Date(dueDateIso).getTime();

    for (const offset of TASK_REMINDER_OFFSETS) {
      const remindAtMs = dueMs - offset.minutesBeforeDue * 60 * 1000;
      const delayMs = remindAtMs - Date.now();
      if (delayMs <= 0) continue;

      const { enqueued, jobId } = await enqueueJob(
        'task-reminder',
        { taskId, title, dueDate: dueDateIso, assigneeUserIds, offsetLabel: offset.label },
        { delay: delayMs }
      );

      const { error } = await this.db.from('task_reminder_jobs').insert({
        task_id: taskId,
        remind_at: new Date(remindAtMs).toISOString(),
        offset_label: offset.label,
        bullmq_job_id: enqueued ? jobId : null
      });
      if (error) logger.warn(`[Tasks] Could not persist reminder job row for task ${taskId}:`, error);
    }
  }

  private async cancelReminderJobs(taskId: string) {
    const { data: jobs } = await this.db
      .from('task_reminder_jobs')
      .select('id, bullmq_job_id, sent_at')
      .eq('task_id', taskId);

    for (const job of jobs || []) {
      if (job.sent_at) continue;
      if (job.bullmq_job_id) {
        try {
          const { getJobsQueue } = await import('../../lib/queues');
          const queue = getJobsQueue();
          const bullJob = await queue.getJob(job.bullmq_job_id);
          if (bullJob) await bullJob.remove();
        } catch (err) {
          logger.warn(`[Tasks] Could not remove queued reminder job ${job.bullmq_job_id}:`, err);
        }
      }
    }

    await this.db.from('task_reminder_jobs').delete().eq('task_id', taskId).is('sent_at', null);
  }

  private mapTask(row: any, assignees: any[], comments: any[] = []) {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      section: row.section,
      priority: row.priority,
      status: row.status,
      dueDate: row.due_date,
      assignedBy: row.assigned_by,
      linkedEntityType: row.linked_entity_type,
      linkedEntityId: row.linked_entity_id,
      linkedEntityLabel: row.linked_entity_label,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      assignees,
      comments
    };
  }
}

export const tasksService = new TasksService();
