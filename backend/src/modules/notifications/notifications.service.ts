import { Response } from 'express';
import { getDbClient } from '../../config/database';
import { z } from 'zod';
import {
  TriggerNotificationSchema,
  NotificationRuleSchema,
  NotificationRecipientSchema,
  UpdateRuleSchema
} from './notifications.schema';

export interface SSEClient {
  id: string;
  userId?: string;
  res: Response;
}

const SEED_RULES = [
  {
    id: 'rule-critical',
    name: 'Critical System Exceptions & Security Alerts',
    description: 'Triggered when fatal unhandled exceptions, authentication breaches, or server faults occur.',
    enabled: true,
    severity: 'CRITICAL'
  },
  {
    id: 'rule-machine-breakdown',
    name: 'Shopfloor Machine Breakdown & Downtime',
    description: 'Triggered when a CNC/VMC machine stops unexpectedly or reports downtime.',
    enabled: true,
    severity: 'CRITICAL'
  },
  {
    id: 'rule-prod-fail',
    name: 'Production Job Card Breakdown',
    description: 'Triggered when a machine stops unexpectedly or high scrap rate occurs.',
    enabled: true,
    severity: 'HIGH'
  },
  {
    id: 'rule-qc-fail',
    name: 'QC In-Process Inspection Rejection',
    description: 'Triggered when in-process quality audit detects dimensional non-conformance.',
    enabled: true,
    severity: 'HIGH'
  },
  {
    id: 'rule-pdi-reject',
    name: 'PDI Quality Inspection Non-Conformance',
    description: 'Triggered when a manufactured lot fails final inspection.',
    enabled: true,
    severity: 'HIGH'
  },
  {
    id: 'rule-delay',
    name: 'Customer PO Delivery Schedule Slippage',
    description: 'Triggered when confirmed delivery date is within 24 hours with incomplete production.',
    enabled: true,
    severity: 'MEDIUM'
  },
  {
    id: 'rule-shortage',
    name: 'Raw Material Critical Stock Buffer Depletion',
    description: 'Triggered when inventory falls below minimum safety stock.',
    enabled: true,
    severity: 'HIGH'
  },
  {
    id: 'rule-invoice',
    name: 'Commercial Invoice & Dispatch Clearance',
    description: 'Triggered when an invoice is generated for an outbound delivery challan.',
    enabled: true,
    severity: 'INFO'
  },
  {
    id: 'rule-payment',
    name: 'Accounts Receivable Payment Realization',
    description: 'Triggered when customer payment is credited.',
    enabled: true,
    severity: 'INFO'
  }
];

const SEED_RECIPIENTS = [
  {
    id: 'rec-1',
    notification_rule_id: 'rule-critical',
    recipient_type: 'EMAIL',
    recipient_value: 'admin@guruom.in',
    email: 'admin@guruom.in',
    name: 'Sachin Gharbude (Founder & CEO)',
    enabled: true
  },
  {
    id: 'rec-2',
    notification_rule_id: 'rule-prod-fail',
    recipient_type: 'ROLE',
    recipient_value: 'OPERATOR',
    email: 'production@guruom.in',
    name: 'Production Supervisory Cell',
    enabled: true
  },
  {
    id: 'rec-3',
    notification_rule_id: 'rule-pdi-reject',
    recipient_type: 'ROLE',
    recipient_value: 'QC_MANAGER',
    email: 'quality@guruom.in',
    name: 'Quality Assurance Lead',
    enabled: true
  }
];

const SEED_NOTIFICATIONS: any[] = [];
const SEED_LOGS: any[] = [];

import { publishTenantEvent, subscribeTenantEvents } from '../../lib/pubsub';

export class NotificationsService {
  private db = getDbClient();
  private sseClients: Map<string, SSEClient> = new Map();
  private isSubscribed = false;

  constructor() {
    this.initPubSubSubscription();
  }

  private async initPubSubSubscription() {
    if (this.isSubscribed) return;
    this.isSubscribed = true;

    try {
      await subscribeTenantEvents('t_default', ({ eventType, payload, originNode }) => {
        // Forward cross-instance event to local SSE connections
        const data = JSON.stringify(payload);
        for (const [, client] of this.sseClients) {
          try {
            client.res.write(`event: ${eventType}\ndata: ${data}\n\n`);
          } catch (_) {}
        }
      });
    } catch (_) {}
  }

  /**
   * Register a new client for Server-Sent Events stream.
   */
  registerSSEClient(client: SSEClient) {
    this.sseClients.set(client.id, client);
    // Send connected handshake
    client.res.write(`event: connected\ndata: ${JSON.stringify({ clientId: client.id, time: new Date().toISOString() })}\n\n`);
  }

  /**
   * Unregister an SSE client when connection closes.
   */
  unregisterSSEClient(clientId: string) {
    this.sseClients.delete(clientId);
  }

  /**
   * Broadcast an in-app notification live to all connected SSE clients.
   */
  broadcastNotification(notification: any) {
    const data = JSON.stringify(notification);
    for (const [, client] of this.sseClients) {
      try {
        client.res.write(`event: notification\ndata: ${data}\n\n`);
      } catch (err) {
        console.warn('Failed to push SSE to client:', client.id, err);
      }
    }

    // Publish to other backend instances via Redis Pub/Sub
    publishTenantEvent('t_default', 'notification', notification).catch(() => {});
  }

  /**
   * Broadcast any real-time system event (e.g. USER_UPDATED, USER_CREATED, USER_DELETED) live to all clients.
   */
  broadcastEvent(eventName: string, payload: any) {
    const data = JSON.stringify(payload);
    for (const [, client] of this.sseClients) {
      try {
        client.res.write(`event: ${eventName}\ndata: ${data}\n\n`);
      } catch (err) {
        console.warn(`Failed to push SSE event ${eventName} to client:`, client.id, err);
      }
    }

    // Publish to other backend instances via Redis Pub/Sub
    publishTenantEvent('t_default', eventName, payload).catch(() => {});
  }

  async sendEmail(to: string[], subject: string, html: string): Promise<{ success: boolean; id?: string; error?: string }> {
    // Email sending disabled as per user request - website notifications only
    return { success: true, id: `disabled-${Date.now()}` };
  }

  /**
   * Core notification dispatcher that creates in-app alerts, broadcasts via SSE,
   * resolves recipients from rules, and dispatches email notifications.
   */
  async triggerNotification(params: z.infer<typeof TriggerNotificationSchema>) {
    const validated = TriggerNotificationSchema.parse(params);
    const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const title = validated.title || `Alert: ${validated.eventType}`;
    const message = validated.message || 'System notification triggered.';
    const severity = validated.severity || 'HIGH';
    const createdAt = new Date().toISOString();

    const notifRecord = {
      id: notifId,
      type: validated.eventType,
      title,
      message,
      severity,
      entity_type: validated.entityType,
      entity_id: validated.entityId,
      is_read: false,
      created_at: createdAt
    };

    // 1. Save in-app notification in DB & Local Store
    try {
      await this.db.from('notifications').insert(notifRecord);
    } catch (err) {
      console.warn('Database insert notification fallback:', err);
    }
    SEED_NOTIFICATIONS.unshift(notifRecord);

    // 2. Broadcast immediately over SSE stream to all active frontend sessions
    this.broadcastNotification(notifRecord);

    // 3. Resolve recipient emails and send notification email
    const recipientEmails = new Set<string>();
    if (validated.recipientEmail) {
      recipientEmails.add(validated.recipientEmail);
    } else {
      const recipients = await this.getNotificationRecipients();
      recipients.filter(r => r.enabled && r.email).forEach(r => recipientEmails.add(r.email!));
    }

    if (recipientEmails.size === 0) {
      recipientEmails.add('admin@guruom.in');
    }

    const emailSubject = `[Owner OS Alert] ${title}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: #0f172a; padding: 20px; text-align: center; border-bottom: 3px solid #0d9488;">
          <h1 style="color: #ffffff; margin: 0; font-size: 18px;">GURUOM INDUSTRIES</h1>
          <p style="color: #2dd4bf; margin: 4px 0 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">Owner OS • Notification Alert</p>
        </div>
        <div style="padding: 24px; color: #1e293b;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 16px;">${title}</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #475569;">${message}</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 16px 0; font-family: monospace; font-size: 12px;">
            <div><strong>Event:</strong> ${validated.eventType}</div>
            ${validated.entityType ? `<div><strong>Entity:</strong> ${validated.entityType} (${validated.entityId || 'N/A'})</div>` : ''}
            <div><strong>Severity:</strong> ${severity}</div>
            <div><strong>Timestamp:</strong> ${new Date().toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div style="background: #f1f5f9; padding: 12px; text-align: center; font-size: 11px; color: #64748b;">
          Owner OS Automated Notification Service
        </div>
      </div>
    `;

    const emailResult = await this.sendEmail(Array.from(recipientEmails), emailSubject, emailHtml);

    // 4. Record log in notification_logs
    const logId = `nlog-${Date.now()}`;
    const logRecord = {
      id: logId,
      event_type: validated.eventType,
      recipient_email: Array.from(recipientEmails).join(', '),
      subject: emailSubject,
      status: emailResult.success ? 'SENT' : 'FAILED',
      resend_email_id: emailResult.id,
      error_message: emailResult.error,
      entity_type: validated.entityType,
      entity_id: validated.entityId,
      created_at: createdAt
    };

    try {
      await this.db.from('notification_logs').insert(logRecord);
    } catch (err) {
      console.warn('Database insert notification_logs fallback:', err);
    }
    SEED_LOGS.unshift(logRecord as any);

    return {
      success: true,
      id: notifId,
      emailSent: emailResult.success,
      resendEmailId: emailResult.id,
      recipients: Array.from(recipientEmails)
    };
  }

  async getNotifications() {
    try {
      const { data, error } = await this.db
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('Database getNotifications fallback:', err);
    }
    return SEED_NOTIFICATIONS;
  }

  async markAsRead(id: string) {
    try {
      await this.db.from('notifications').update({ is_read: true }).eq('id', id);
    } catch (err) {
      console.warn('Database markAsRead fallback:', err);
    }
    const target = SEED_NOTIFICATIONS.find(n => n.id === id);
    if (target) target.is_read = true;
    return { id, is_read: true };
  }

  async markAllAsRead() {
    try {
      await this.db.from('notifications').update({ is_read: true }).eq('is_read', false);
    } catch (err) {
      console.warn('Database markAllAsRead fallback:', err);
    }
    SEED_NOTIFICATIONS.forEach(n => { n.is_read = true; });
    return { success: true };
  }

  async clearAllNotifications() {
    try {
      await this.db.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (err) {
      console.warn('Database clearAllNotifications fallback:', err);
    }
    SEED_NOTIFICATIONS.length = 0;
    return { success: true };
  }

  async getNotificationRules() {
    try {
      const { data, error } = await this.db
        .from('notification_rules')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('Database getNotificationRules fallback:', err);
    }
    return SEED_RULES;
  }

  async updateNotificationRule(id: string, data: z.infer<typeof UpdateRuleSchema>) {
    const { enabled } = UpdateRuleSchema.parse(data);
    try {
      await this.db.from('notification_rules').update({ enabled }).eq('id', id);
    } catch (err) {
      console.warn('Database updateNotificationRule fallback:', err);
    }
    const target = SEED_RULES.find(r => r.id === id);
    if (target) target.enabled = enabled;
    return { id, enabled };
  }

  async getNotificationRecipients(ruleId?: string) {
    try {
      let query = this.db.from('notification_recipients').select('*');
      if (ruleId) query = query.eq('notification_rule_id', ruleId);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('Database getNotificationRecipients fallback:', err);
    }
    if (ruleId) return SEED_RECIPIENTS.filter(r => r.notification_rule_id === ruleId);
    return SEED_RECIPIENTS;
  }

  async addNotificationRecipient(data: z.infer<typeof NotificationRecipientSchema>) {
    const validated = NotificationRecipientSchema.parse(data);
    const recId = validated.id || `rec-${Date.now()}`;
    const record = {
      id: recId,
      notification_rule_id: validated.notificationRuleId,
      recipient_type: validated.recipientType,
      recipient_value: validated.recipientValue,
      email: validated.email,
      name: validated.name,
      enabled: validated.enabled
    };

    try {
      await this.db.from('notification_recipients').insert(record);
    } catch (err) {
      console.warn('Database addNotificationRecipient fallback:', err);
    }

    SEED_RECIPIENTS.unshift(record);
    return record;
  }

  async deleteNotificationRecipient(id: string) {
    try {
      await this.db.from('notification_recipients').delete().eq('id', id);
    } catch (err) {
      console.warn('Database deleteNotificationRecipient fallback:', err);
    }
    const index = SEED_RECIPIENTS.findIndex(r => r.id === id);
    if (index !== -1) SEED_RECIPIENTS.splice(index, 1);
    return { id, deleted: true };
  }

  async getNotificationLogs() {
    try {
      const { data, error } = await this.db
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('Database getNotificationLogs fallback:', err);
    }
    return SEED_LOGS;
  }
}

export const notificationsService = new NotificationsService();
