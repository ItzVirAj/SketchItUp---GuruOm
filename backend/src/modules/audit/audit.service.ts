import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { AuditLogSchema, AuditQueryFilterSchema } from './audit.schema';

export interface RecordAuditParams {
  userId?: string;
  userName: string;
  entity: string;
  entityId?: string;
  action: string;
  details: string;
  changes?: Record<string, any>;
}

const SEED_AUDIT_LOGS = [
  {
    id: 'log-1',
    when: '10:45 AM - Today',
    user: 'Pramod Parshi (Founder & CEO)',
    entity: 'Order PO-2026-002',
    action: 'Status Transition',
    details: 'Shifted order status from IN_PRODUCTION to DISPATCH_READY.'
  },
  {
    id: 'log-2',
    when: '09:15 AM - Today',
    user: 'Deepak Sharma (Production Head)',
    entity: 'Job Card JC/0001/26-27',
    action: 'Material Reservation',
    details: 'Reserved 120 units of part 00000001 for machining.'
  },
  {
    id: 'log-3',
    when: 'Yesterday 04:30 PM',
    user: 'System Automated',
    entity: 'Quality Control',
    action: 'Compliance Issuance',
    details: 'Issued Certificate of Compliance PDI-2026-8812.'
  }
];

export class AuditService {
  private db = getDbClient();

  /**
   * Reusable backend service method for other modules to record audit logs directly.
   */
  async recordAuditLog(params: RecordAuditParams) {
    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const whenTime = new Date().toLocaleString('en-IN', { hour12: true });

    try {
      await this.db.from('audit_logs').insert({
        id: logId,
        user_name: params.userName,
        entity: params.entity,
        action: params.action,
        details: params.details,
        when_time: whenTime,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Database recordAuditLog fallback:', err);
    }

    const created = {
      id: logId,
      when: whenTime,
      user: params.userName,
      entity: params.entity,
      action: params.action,
      details: params.details
    };

    SEED_AUDIT_LOGS.unshift(created);
    return created;
  }

  async getAuditLogs(filters?: z.infer<typeof AuditQueryFilterSchema>) {
    const parsed = AuditQueryFilterSchema.parse(filters || {});
    const limit = parsed.limit || 100;

    try {
      let query = this.db.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);

      if (parsed.entity) {
        query = query.ilike('entity', `%${parsed.entity}%`);
      }
      if (parsed.user) {
        query = query.ilike('user_name', `%${parsed.user}%`);
      }
      if (parsed.action) {
        query = query.ilike('action', `%${parsed.action}%`);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map(log => ({
          id: log.id,
          when: log.when_time || new Date(log.created_at).toLocaleTimeString('en-IN', { hour12: true }),
          user: log.user_name,
          entity: log.entity,
          action: log.action,
          details: log.details
        }));
      }
    } catch (err) {
      console.warn('Database getAuditLogs fallback:', err);
    }

    return SEED_AUDIT_LOGS.slice(0, limit);
  }

  async createAuditLog(data: z.infer<typeof AuditLogSchema>) {
    const validated = AuditLogSchema.parse(data);
    return this.recordAuditLog({
      userId: validated.userId,
      userName: validated.user,
      entity: validated.entity,
      entityId: validated.entityId,
      action: validated.action,
      details: validated.details,
      changes: validated.changes
    });
  }
}

export const auditService = new AuditService();

export async function recordAuditLog(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  changes?: Record<string, any>
) {
  return auditService.recordAuditLog({
    userId,
    userName: 'System Admin',
    action,
    entity,
    entityId,
    details: `${action} on ${entity} (${entityId || ''})`,
    changes
  });
}
