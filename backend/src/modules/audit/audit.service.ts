import { logAudit, getAuditLogs, AuditLogInput, AuditLogRecord } from '../../services/auditLog';

export class AuditService {
  /**
   * Reusable backend service method to log structured audit trail.
   */
  async recordAuditLog(input: AuditLogInput): Promise<AuditLogRecord> {
    return await logAudit(input);
  }

  /**
   * Query audit logs with pagination, search, actor, date range, and entity filters.
   */
  async getAuditLogs(filters?: {
    actorEmail?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    from?: number;
    to?: number;
    limit?: number;
  }) {
    return await getAuditLogs(filters);
  }

  /**
   * Generates export records and audits the export action itself.
   */
  async exportAuditLogs(actor: { id?: string; email: string; role?: string }, filters?: Parameters<typeof getAuditLogs>[0]) {
    const result = await getAuditLogs({ ...filters, limit: 5000, from: 0 });

    // Log the export action itself as an audit event
    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email || 'admin@guruom.in',
      actorRole: actor.role || 'Admin',
      action: 'AUDIT_LOG_EXPORTED',
      entityType: 'audit',
      entityId: `EXP-${Date.now()}`,
      afterState: {
        exportedCount: result.logs.length,
        filtersApplied: filters || {}
      },
      metadata: {
        details: `Audit trail export generated (${result.logs.length} records) by ${actor.email}`
      }
    });

    return result;
  }
}

export const auditService = new AuditService();

