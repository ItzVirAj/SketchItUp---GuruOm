import { logAudit, getAuditLogs, AuditLogInput, AuditLogRecord } from '../../services/auditLog';

export class AuditService {
  /**
   * Reusable backend service method to log structured audit trail.
   */
  async recordAuditLog(input: AuditLogInput): Promise<AuditLogRecord> {
    return await logAudit(input);
  }

  /**
   * Query audit logs with pagination and filters.
   */
  async getAuditLogs(filters?: {
    actorEmail?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    from?: number;
    to?: number;
    limit?: number;
  }) {
    return await getAuditLogs(filters);
  }
}

export const auditService = new AuditService();
