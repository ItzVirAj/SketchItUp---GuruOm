import { z } from 'zod';
import { getDbClient } from '../../config/database';
import { auditService } from '../audit/audit.service';
import { logger } from '../../utils/logger';
import { enqueueJob } from '../../lib/queues';
import { CreateCertificationSchema, UpdateCertificationSchema, CERTIFICATION_REMINDER_OFFSET } from './certifications.schema';

export interface CertActor {
  id: string;
  email: string;
}

export class CertificationsService {
  private db = getDbClient();

  async listCertifications(actor: CertActor, canViewAll: boolean, opts: { scope: 'mine' | 'all'; employeeId?: string }) {
    let query = this.db
      .from('certifications')
      .select('*, users:employee_id ( id, full_name )')
      .order('expiry_date', { ascending: true, nullsFirst: false });

    if (!canViewAll) {
      query = query.eq('employee_id', actor.id);
    } else if (opts.employeeId) {
      query = query.eq('employee_id', opts.employeeId);
    } else if (opts.scope === 'mine') {
      query = query.eq('employee_id', actor.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(this.mapCert);
  }

  async getCertificationById(id: string) {
    const { data, error } = await this.db
      .from('certifications')
      .select('*, users:employee_id ( id, full_name )')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapCert(data) : null;
  }

  async createCertification(input: z.infer<typeof CreateCertificationSchema>, actor: CertActor) {
    const validated = CreateCertificationSchema.parse(input);

    const { data: inserted, error } = await this.db
      .from('certifications')
      .insert({
        employee_id: validated.employeeId,
        name: validated.name,
        issuing_body: validated.issuingBody,
        issued_date: validated.issuedDate || null,
        expiry_date: validated.expiryDate || null,
        notes: validated.notes,
        created_by: actor.id
      })
      .select('*')
      .single();
    if (error) throw error;

    if (validated.expiryDate) {
      await this.scheduleExpiryReminder(inserted.id, validated.name, validated.expiryDate, validated.employeeId);
    }

    await auditService.recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'CERTIFICATION_ADDED',
      entityType: 'certifications',
      entityId: inserted.id,
      metadata: { details: `Added "${validated.name}" for employee ${validated.employeeId}.` }
    });

    return this.getCertificationById(inserted.id);
  }

  async updateCertification(id: string, input: z.infer<typeof UpdateCertificationSchema>, actor: CertActor) {
    const validated = UpdateCertificationSchema.parse(input);
    const patch: Record<string, any> = {};
    if (validated.name !== undefined) patch.name = validated.name;
    if (validated.issuingBody !== undefined) patch.issuing_body = validated.issuingBody;
    if (validated.issuedDate !== undefined) patch.issued_date = validated.issuedDate;
    if (validated.expiryDate !== undefined) patch.expiry_date = validated.expiryDate;
    if (validated.notes !== undefined) patch.notes = validated.notes;

    const { error } = await this.db.from('certifications').update(patch).eq('id', id);
    if (error) throw error;

    if (validated.expiryDate !== undefined) {
      const existing = await this.getCertificationById(id);
      await this.cancelReminderJobs(id);
      if (validated.expiryDate && existing) {
        await this.scheduleExpiryReminder(id, validated.name || existing.name, validated.expiryDate, existing.employeeId);
      }
    }

    await auditService.recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'CERTIFICATION_UPDATED',
      entityType: 'certifications',
      entityId: id,
      metadata: { details: `Updated certification ${id}.` }
    });

    return this.getCertificationById(id);
  }

  async deleteCertification(id: string, actor: CertActor) {
    await this.cancelReminderJobs(id);
    const { error } = await this.db.from('certifications').delete().eq('id', id);
    if (error) throw error;

    await auditService.recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'CERTIFICATION_DELETED',
      entityType: 'certifications',
      entityId: id,
      metadata: { details: `Deleted certification ${id}.` }
    });
    return { id, deleted: true };
  }

  private async scheduleExpiryReminder(certId: string, name: string, expiryDateIso: string, employeeId: string) {
    const expiryMs = new Date(expiryDateIso).getTime();
    const remindAtMs = expiryMs - CERTIFICATION_REMINDER_OFFSET.minutesBeforeExpiry * 60 * 1000;
    const delayMs = remindAtMs - Date.now();
    if (delayMs <= 0) return; // already within (or past) the reminder window — skip, don't fire immediately

    const { enqueued, jobId } = await enqueueJob(
      'certification-reminder',
      { certificationId: certId, name, expiryDate: expiryDateIso, employeeId, offsetLabel: CERTIFICATION_REMINDER_OFFSET.label },
      { delay: delayMs }
    );

    const { error } = await this.db.from('certification_reminder_jobs').insert({
      certification_id: certId,
      remind_at: new Date(remindAtMs).toISOString(),
      offset_label: CERTIFICATION_REMINDER_OFFSET.label,
      bullmq_job_id: enqueued ? jobId : null
    });
    if (error) logger.warn(`[Certifications] Could not persist reminder job row for ${certId}:`, error);
  }

  private async cancelReminderJobs(certId: string) {
    const { data: jobs } = await this.db
      .from('certification_reminder_jobs')
      .select('id, bullmq_job_id, sent_at')
      .eq('certification_id', certId);

    for (const job of jobs || []) {
      if (job.sent_at || !job.bullmq_job_id) continue;
      try {
        const { getJobsQueue } = await import('../../lib/queues');
        const queue = getJobsQueue();
        const bullJob = await queue.getJob(job.bullmq_job_id);
        if (bullJob) await bullJob.remove();
      } catch (err) {
        logger.warn(`[Certifications] Could not remove queued reminder job ${job.bullmq_job_id}:`, err);
      }
    }
    await this.db.from('certification_reminder_jobs').delete().eq('certification_id', certId).is('sent_at', null);
  }

  private mapCert(row: any) {
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.users?.full_name,
      name: row.name,
      issuingBody: row.issuing_body,
      issuedDate: row.issued_date,
      expiryDate: row.expiry_date,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const certificationsService = new CertificationsService();
