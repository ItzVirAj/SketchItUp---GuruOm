import { z } from 'zod';
import { getDbClient } from '../../config/database';
import { auditService } from '../audit/audit.service';
import { logger } from '../../utils/logger';
import { enqueueJob } from '../../lib/queues';
import { CreateMeetingSchema, UpdateMeetingSchema, REMINDER_OFFSETS_MINUTES } from './meetings.schema';

export interface MeetingActor {
  id: string;
  email: string;
  name?: string;
}

export class MeetingsService {
  private db = getDbClient();

  /**
   * List meetings. `scope='mine'` restricts to meetings the requester organizes
   * or is invited to; `scope='upcoming'` (default) returns non-cancelled
   * meetings ending in the future; `scope='all'` returns everything.
   * Every authenticated role has at least VIEW_ONLY on 'meetings' (see
   * rbacMatrix.ts), so no role filtering happens here beyond the auth gate
   * already applied by requirePermission in meetings.routes.ts.
   */
  async listMeetings(requesterId: string, opts: { scope: 'upcoming' | 'mine' | 'all'; status?: string }) {
    let query = this.db
      .from('meetings')
      .select('id, title, agenda, section, organizer_id, meeting_link, location, start_time, end_time, status, created_at, updated_at')
      .order('start_time', { ascending: true });

    if (opts.status) {
      query = query.eq('status', opts.status);
    } else if (opts.scope === 'upcoming') {
      query = query.neq('status', 'CANCELLED').gte('end_time', new Date().toISOString());
    }

    const { data: meetings, error } = await query;
    if (error) throw error;
    if (!meetings || meetings.length === 0) return [];

    const meetingIds = meetings.map((m) => m.id);

    // Fetch attendees only for the meetings just fetched (avoids the
    // unfiltered-select-then-join-in-JS pattern flagged in 08-issues-and-suggestions.md).
    const { data: attendeeRows, error: attErr } = await this.db
      .from('meeting_attendees')
      .select('meeting_id, user_id, is_required, users:user_id ( id, full_name, email )')
      .in('meeting_id', meetingIds);

    if (attErr) throw attErr;

    const attendeesByMeeting = new Map<string, any[]>();
    for (const row of attendeeRows || []) {
      const list = attendeesByMeeting.get(row.meeting_id) || [];
      list.push({
        userId: row.user_id,
        isRequired: row.is_required,
        name: (row as any).users?.full_name,
        email: (row as any).users?.email
      });
      attendeesByMeeting.set(row.meeting_id, list);
    }

    let result = meetings.map((m) => this.mapMeeting(m, attendeesByMeeting.get(m.id) || []));

    if (opts.scope === 'mine') {
      result = result.filter(
        (m) => m.organizerId === requesterId || m.attendees.some((a) => a.userId === requesterId)
      );
    }

    return result;
  }

  async getMeetingById(id: string) {
    const { data: meeting, error } = await this.db.from('meetings').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!meeting) return null;

    const { data: attendeeRows } = await this.db
      .from('meeting_attendees')
      .select('user_id, is_required, users:user_id ( id, full_name, email )')
      .eq('meeting_id', id);

    const attendees = (attendeeRows || []).map((row: any) => ({
      userId: row.user_id,
      isRequired: row.is_required,
      name: row.users?.full_name,
      email: row.users?.email
    }));

    return this.mapMeeting(meeting, attendees);
  }

  async createMeeting(input: z.infer<typeof CreateMeetingSchema>, actor: MeetingActor) {
    const validated = CreateMeetingSchema.parse(input);

    const { data: inserted, error } = await this.db
      .from('meetings')
      .insert({
        title: validated.title,
        agenda: validated.agenda || null,
        section: validated.section || null,
        organizer_id: actor.id,
        meeting_link: validated.meetingLink || null,
        location: validated.location || null,
        start_time: validated.startTime,
        end_time: validated.endTime,
        created_by: actor.id,
        updated_by: actor.id
      })
      .select('*')
      .single();

    if (error) throw error;
    const meetingId = inserted.id;

    // Always include the organizer as an attendee, de-duplicated.
    const attendeeIds = Array.from(new Set([actor.id, ...validated.attendeeUserIds]));

    try {
      if (attendeeIds.length > 0) {
        const { error: attErr } = await this.db
          .from('meeting_attendees')
          .insert(attendeeIds.map((userId) => ({ meeting_id: meetingId, user_id: userId })));
        if (attErr) throw attErr;
      }
    } catch (attErr) {
      // Manual rollback: this module intentionally avoids leaving an
      // attendee-less meeting behind (see 08-issues-and-suggestions.md's
      // note on the orders module lacking a transaction for header+lines).
      logger.error(`[Meetings] Attendee insert failed for meeting ${meetingId}, rolling back meeting row.`, attErr);
      await this.db.from('meetings').delete().eq('id', meetingId);
      throw attErr;
    }

    await this.scheduleReminders(meetingId, validated.title, validated.startTime, attendeeIds, validated.meetingLink);

    await auditService.recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'MEETING_CREATED',
      entityType: 'meetings',
      entityId: meetingId,
      metadata: { details: `Scheduled meeting "${validated.title}" for ${validated.startTime}`, attendeeCount: attendeeIds.length }
    });

    return this.getMeetingById(meetingId);
  }

  async updateMeeting(id: string, input: z.infer<typeof UpdateMeetingSchema>, actor: MeetingActor) {
    const existing = await this.getMeetingById(id);
    if (!existing) throw new Error(`Meeting ${id} not found.`);
    if (existing.status !== 'SCHEDULED') {
      throw new Error(`Cannot edit a meeting with status ${existing.status}.`);
    }

    const validated = UpdateMeetingSchema.parse(input);
    const patch: Record<string, any> = { updated_by: actor.id };
    if (validated.title !== undefined) patch.title = validated.title;
    if (validated.agenda !== undefined) patch.agenda = validated.agenda || null;
    if (validated.section !== undefined) patch.section = validated.section || null;
    if (validated.meetingLink !== undefined) patch.meeting_link = validated.meetingLink || null;
    if (validated.location !== undefined) patch.location = validated.location || null;
    if (validated.startTime !== undefined) patch.start_time = validated.startTime;
    if (validated.endTime !== undefined) patch.end_time = validated.endTime;

    const { error } = await this.db.from('meetings').update(patch).eq('id', id);
    if (error) throw error;

    if (validated.attendeeUserIds) {
      const attendeeIds = Array.from(new Set([existing.organizerId, ...validated.attendeeUserIds]));
      // Delete-then-reinsert with rollback — mirrors the create path's
      // guarantee that a failed attendee write never leaves a meeting
      // attendee-less (createMeeting does the same above).
      const { error: delErr } = await this.db.from('meeting_attendees').delete().eq('meeting_id', id);
      if (delErr) throw delErr;
      const { error: insErr } = await this.db
        .from('meeting_attendees')
        .insert(attendeeIds.map((userId) => ({ meeting_id: id, user_id: userId })));
      if (insErr) {
        logger.error(`[Meetings] Attendee reinsert failed for meeting ${id}, restoring previous attendee set.`, insErr);
        const previousIds = Array.from(new Set([existing.organizerId, ...existing.attendees.map((a) => a.userId)]));
        if (previousIds.length > 0) {
          await this.db.from('meeting_attendees').insert(previousIds.map((userId) => ({ meeting_id: id, user_id: userId })));
        }
        throw insErr;
      }
    }

    const timeChanged = validated.startTime && validated.startTime !== existing.startTime;
    if (timeChanged || validated.attendeeUserIds) {
      // Time (or attendee list) changed — retract the old reminder jobs and
      // schedule fresh ones against the new time/attendees.
      await this.cancelReminderJobs(id);
      const finalStart = validated.startTime || existing.startTime;
      const finalAttendees = validated.attendeeUserIds
        ? Array.from(new Set([existing.organizerId, ...validated.attendeeUserIds]))
        : existing.attendees.map((a) => a.userId);
      const finalTitle = validated.title || existing.title;
      const finalLink = validated.meetingLink !== undefined ? validated.meetingLink : existing.meetingLink;
      await this.scheduleReminders(id, finalTitle, finalStart, finalAttendees, finalLink || undefined);
    }

    await auditService.recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'MEETING_UPDATED',
      entityType: 'meetings',
      entityId: id,
      metadata: { details: `Updated meeting "${existing.title}"`, changedFields: Object.keys(patch) }
    });

    return this.getMeetingById(id);
  }

  /**
   * Soft-delete only — this codebase's convention (server.ts: "No Deletes on
   * Transactional Records") is applied here too: cancelling sets status and
   * fires a cancellation notification instead of removing the row.
   */
  async cancelMeeting(id: string, actor: MeetingActor, reason?: string) {
    const existing = await this.getMeetingById(id);
    if (!existing) throw new Error(`Meeting ${id} not found.`);
    if (existing.status === 'CANCELLED') return existing;

    const { error } = await this.db
      .from('meetings')
      .update({ status: 'CANCELLED', updated_by: actor.id })
      .eq('id', id);
    if (error) throw error;

    await this.cancelReminderJobs(id);

    await enqueueJob('create-notification', {
      name: 'meeting_cancelled',
      message: `Meeting "${existing.title}" scheduled for ${new Date(existing.startTime).toLocaleString('en-IN')} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
      severity: 'MEDIUM',
      tenantId: 't_default'
    }).catch((err) => logger.warn('[Meetings] Failed to enqueue cancellation notification:', err));

    await auditService.recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'MEETING_CANCELLED',
      entityType: 'meetings',
      entityId: id,
      metadata: { details: `Cancelled meeting "${existing.title}". ${reason ? `Reason: ${reason}` : ''}` }
    });

    return this.getMeetingById(id);
  }

  // --------------------------------------------------------------------
  // Reminder scheduling (BullMQ). See backend/src/worker.ts::processMeetingReminder
  // and backend/src/lib/queues.ts::MeetingReminderJobData.
  // --------------------------------------------------------------------

  private async scheduleReminders(
    meetingId: string,
    title: string,
    startTimeIso: string,
    attendeeUserIds: string[],
    meetingLink?: string
  ) {
    const startMs = new Date(startTimeIso).getTime();

    for (const offset of REMINDER_OFFSETS_MINUTES) {
      const remindAtMs = startMs - offset.minutesBefore * 60 * 1000;
      const delayMs = remindAtMs - Date.now();
      if (delayMs <= 0) continue; // meeting is sooner than this offset — skip, don't fire immediately

      const { enqueued, jobId } = await enqueueJob(
        'meeting-reminder',
        {
          meetingId,
          title,
          startTime: startTimeIso,
          meetingLink,
          attendeeUserIds,
          offsetLabel: offset.label
        },
        { delay: delayMs }
      );

      const { error } = await this.db.from('meeting_reminder_jobs').insert({
        meeting_id: meetingId,
        remind_at: new Date(remindAtMs).toISOString(),
        offset_label: offset.label,
        bullmq_job_id: enqueued ? jobId : null
      });
      if (error) logger.warn(`[Meetings] Could not persist reminder job row for meeting ${meetingId}:`, error);
    }
  }

  private async cancelReminderJobs(meetingId: string) {
    const { data: jobs } = await this.db
      .from('meeting_reminder_jobs')
      .select('id, bullmq_job_id, sent_at')
      .eq('meeting_id', meetingId);

    for (const job of jobs || []) {
      if (job.sent_at) continue; // already fired, nothing to retract
      if (job.bullmq_job_id) {
        try {
          const { getJobsQueue } = await import('../../lib/queues');
          const queue = getJobsQueue();
          const bullJob = await queue.getJob(job.bullmq_job_id);
          if (bullJob) await bullJob.remove();
        } catch (err) {
          logger.warn(`[Meetings] Could not remove queued reminder job ${job.bullmq_job_id}:`, err);
        }
      }
    }

    await this.db.from('meeting_reminder_jobs').delete().eq('meeting_id', meetingId).is('sent_at', null);
  }

  private mapMeeting(row: any, attendees: any[]) {
    return {
      id: row.id,
      title: row.title,
      agenda: row.agenda,
      section: row.section,
      organizerId: row.organizer_id,
      meetingLink: row.meeting_link,
      location: row.location,
      startTime: row.start_time,
      endTime: row.end_time,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      attendees
    };
  }
}

export const meetingsService = new MeetingsService();
