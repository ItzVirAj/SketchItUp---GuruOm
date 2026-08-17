import { getDbClient } from '../config/database';
import { SupabaseClient } from '@supabase/supabase-js';

export interface AuditLogInput {
  actorId?: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogRecord extends AuditLogInput {
  id: string;
  created_at: string;
}

// In-memory append-only immutable store fallback for offline/local testing
const inMemoryImmutableAuditLogs: AuditLogRecord[] = [];

/**
 * Reusable Centralized Audit Logger.
 * Records WHO, WHAT, WHEN, WHERE, BEFORE, and AFTER states.
 */
export async function logAudit(
  clientOrInput: SupabaseClient | AuditLogInput,
  inputOptional?: AuditLogInput
): Promise<AuditLogRecord> {
  const input: AuditLogInput = inputOptional || (clientOrInput as AuditLogInput);
  const db = (inputOptional ? (clientOrInput as SupabaseClient) : null) || getDbClient();

  const record: AuditLogRecord = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    actorId: input.actorId,
    actorEmail: input.actorEmail,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    beforeState: input.beforeState ?? null,
    afterState: input.afterState ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    metadata: input.metadata ?? null,
    created_at: new Date().toISOString()
  };

  try {
    const { error } = await db.from('audit_logs').insert({
      id: record.id,
      user_name: record.actorEmail || 'System User',
      actor_id: record.actorId || null,
      actor_email: record.actorEmail || null,
      entity: record.entityType || 'General',
      entity_type: record.entityType || null,
      entity_id: record.entityId || null,
      action: record.action || 'LOG',
      details: (record.metadata?.details as string) || `${record.action} on ${record.entityType || 'item'}`,
      before_state: record.beforeState || null,
      after_state: record.afterState || null,
      ip_address: record.ipAddress || null,
      user_agent: record.userAgent || null,
      metadata: record.metadata || null,
      created_at: record.created_at
    });

    if (error) {
      // Legacy-shaped audit_logs tables lack the extended columns — retry with the minimal column set
      const missingColumn = error.code === 'PGRST204' || (error.message || '').includes('Could not find the');
      if (missingColumn) {
        try {
          await db.from('audit_logs').insert({
            id: record.id,
            user_name: record.actorEmail || 'System User',
            entity: record.entityType || 'General',
            entity_id: record.entityId || null,
            action: record.action || 'LOG',
            details: (record.metadata?.details as string) || `${record.action} on ${record.entityType || 'item'}`,
            created_at: record.created_at
          });
        } catch {
          try {
            // Oldest shape: no entity_id either
            await db.from('audit_logs').insert({
              id: record.id,
              user_name: record.actorEmail || 'System User',
              entity: record.entityType || 'General',
              action: record.action || 'LOG',
              details: (record.metadata?.details as string) || `${record.action} on ${record.entityType || 'item'}`,
              created_at: record.created_at
            });
          } catch {
            // ignore fallback insert error
          }
        }
      } else {
        console.warn('⚠️ [AuditLog] DB insert warning:', error.message);
      }
    }
  } catch (err: any) {
    // Supabase table insert fallback
  }

  // Record into immutable in-memory journal
  inMemoryImmutableAuditLogs.unshift(Object.freeze({ ...record }));

  // Real-Time Push: every audited system change streams to connected clients
  try {
    const { notificationsService } = await import('../modules/notifications/notifications.service');
    notificationsService.broadcastEvent('audit_log_created', record);
  } catch {
    // broadcast is best-effort; audit persistence must never fail because of it
  }

  return record;
}

/**
 * Query audit logs with pagination and filters.
 */
export async function getAuditLogs(filters?: {
  actorEmail?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: number;
  to?: number;
  limit?: number;
}): Promise<{ logs: AuditLogRecord[]; total: number }> {
  const db = getDbClient();
  const limit = filters?.limit || 50;
  const from = filters?.from || 0;
  const to = filters?.to || from + limit - 1;

  try {
    let query = db
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters?.actorEmail) query = query.ilike('actor_email', `%${filters.actorEmail}%`);
    if (filters?.entityType) query = query.eq('entity_type', filters.entityType);
    if (filters?.entityId) query = query.eq('entity_id', filters.entityId);
    if (filters?.action) query = query.ilike('action', `%${filters.action}%`);

    const { data, error, count } = await query;
    if (!error && data) {
      const mapped = data.map((d: any) => ({
        id: d.id,
        actorId: d.actor_id,
        actorEmail: d.actor_email,
        action: d.action,
        entityType: d.entity_type,
        entityId: d.entity_id,
        beforeState: d.before_state,
        afterState: d.after_state,
        ipAddress: d.ip_address,
        userAgent: d.user_agent,
        metadata: d.metadata,
        created_at: d.created_at
      }));
      return { logs: mapped, total: count || mapped.length };
    }
  } catch (err: any) {
    console.warn('⚠️ [AuditLog] getAuditLogs fallback:', err.message);
  }

  let filtered = [...inMemoryImmutableAuditLogs];
  if (filters?.actorEmail) filtered = filtered.filter(l => l.actorEmail.toLowerCase().includes(filters.actorEmail!.toLowerCase()));
  if (filters?.entityType) filtered = filtered.filter(l => l.entityType === filters.entityType);
  if (filters?.entityId) filtered = filtered.filter(l => l.entityId === filters.entityId);
  if (filters?.action) filtered = filtered.filter(l => l.action.toLowerCase().includes(filters.action!.toLowerCase()));

  const total = filtered.length;
  const paginated = filtered.slice(from, from + limit);
  return { logs: paginated, total };
}

/**
 * Simulates attempting mutation on append-only table to enforce trigger exception.
 */
export function preventAuditLogMutation(operation: 'UPDATE' | 'DELETE'): never {
  throw new Error(`audit_logs is append-only: ${operation} not allowed`);
}
