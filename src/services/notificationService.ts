import { apiClient } from '../lib/apiClient';
import { UserRole } from '../types/console';

export interface NotificationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  created_at?: string;
  updated_at?: string;
}

export interface NotificationRecipient {
  id: string;
  notification_rule_id: string;
  recipient_type: 'EMAIL' | 'USER' | 'ROLE';
  recipient_value: string;
  email?: string;
  name?: string;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationLog {
  id: string;
  event_type: string;
  recipient_email: string;
  subject: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  resend_email_id?: string;
  error_message?: string;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
  sent_at?: string;
}

export interface InAppNotification {
  id: string;
  user_id?: string;
  type: string;
  title: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  entity_type?: string;
  entity_id?: string;
  is_read: boolean;
  created_at: string;
}

// ----------------------------------------------------
// 1. CORE EVENT NOTIFICATION TRIGGER SERVICE (via REST API)
// ----------------------------------------------------
export async function triggerNotification(params: {
  eventType: string;
  entityType?: string;
  entityId?: string;
  title?: string;
  message?: string;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  data?: Record<string, any>;
  recipientEmail?: string;
  userRole?: UserRole;
  isTest?: boolean;
}): Promise<{ success: boolean; id?: string; error?: string; message?: string; logs?: any[] }> {
  try {
    const res = await apiClient.post<{ data: any; message: string }>('/notifications/trigger', params);
    return {
      success: true,
      id: res.data?.id,
      message: res.message || 'Notification processed successfully.'
    };
  } catch (err: any) {
    console.error('Trigger notification error:', err);
    return {
      success: false,
      error: err.message || 'Failed to dispatch notification.'
    };
  }
}

// ----------------------------------------------------
// 2. BUSINESS EVENT CONVENIENCE HELPERS
// ----------------------------------------------------
export async function triggerCriticalError(title: string, message: string, data?: Record<string, any>) {
  return triggerNotification({
    eventType: 'critical_error',
    severity: 'CRITICAL',
    title,
    message,
    data
  });
}

export async function triggerProductionFailure(jobNumber: string, reason: string, machine?: string) {
  return triggerNotification({
    eventType: 'production_failure',
    severity: 'HIGH',
    entityType: 'JOB_CARD',
    entityId: jobNumber,
    title: `Production Job Failed (${jobNumber})`,
    message: `Job ${jobNumber} encountered a failure. Reason: ${reason}`,
    data: { jobNumber, reason, machine: machine || 'CNC Unit 01' }
  });
}

export async function triggerPDIFailure(partName: string, defect: string, inspector?: string) {
  return triggerNotification({
    eventType: 'pdi_failure',
    severity: 'HIGH',
    entityType: 'PDI_INSPECTION',
    title: `PDI Inspection Defect: ${partName}`,
    message: `Pre-Delivery Inspection non-conformance detected for ${partName}. Defect: ${defect}`,
    data: { partName, defect, inspector: inspector || 'QC Lead' }
  });
}

export async function triggerQCFailure(partName: string, defect: string, stage?: string, inspector?: string) {
  return triggerNotification({
    eventType: 'qc_failure',
    severity: 'HIGH',
    entityType: 'QC_INSPECTION',
    title: `QC Inspection Rejection: ${partName}`,
    message: `Quality non-conformance rejected at stage [${stage || 'Production'}]. Reason: ${defect}`,
    data: { partName, defect, stage, inspector: inspector || 'QC Inspector' }
  });
}

export async function triggerMachineDowntime(machineName: string, reason: string, reportedBy?: string) {
  return triggerNotification({
    eventType: 'machine_downtime',
    severity: 'CRITICAL',
    entityType: 'MACHINE',
    entityId: machineName,
    title: `Shopfloor Machine Breakdown: ${machineName}`,
    message: `Machine [${machineName}] reported down on shopfloor. Reason: ${reason} (Reported by: ${reportedBy || 'Operator'}).`,
    data: { machineName, reason, reportedBy: reportedBy || 'Shopfloor Lead' }
  });
}

export async function triggerOrderDelayed(orderId: string, poNumber: string, customer?: string) {
  return triggerNotification({
    eventType: 'order_delayed',
    severity: 'MEDIUM',
    entityType: 'CUSTOMER_ORDER',
    entityId: orderId,
    title: `Customer PO Schedule Delay: ${poNumber}`,
    message: `Order #${poNumber} for ${customer || 'Customer'} has missed its target delivery date.`,
    data: { orderId, poNumber, customer }
  });
}

export async function triggerInventoryShortage(sku: string, code: string, available: number) {
  return triggerNotification({
    eventType: 'inventory_shortage',
    severity: 'HIGH',
    entityType: 'STOCK_ITEM',
    entityId: code,
    title: `Critical Material Shortage: ${sku} (${code})`,
    message: `Available stock for ${sku} (${code}) is at ${available} units (below safety buffer).`,
    data: { sku, code, availableUnits: available }
  });
}

export async function triggerInvoiceGenerated(invoiceNo: string, amount: number, customer?: string) {
  return triggerNotification({
    eventType: 'invoice_generated',
    severity: 'INFO',
    entityType: 'CUSTOMER_INVOICE',
    entityId: invoiceNo,
    title: `Invoice Issued #${invoiceNo}`,
    message: `Commercial Invoice #${invoiceNo} issued for ${customer || 'Client'} (Valued at ₹${amount.toLocaleString()}).`,
    data: { invoiceNo, amount, customer }
  });
}

export async function triggerPaymentReceived(invoiceNo: string, amountPaid: number) {
  return triggerNotification({
    eventType: 'payment_received',
    severity: 'INFO',
    entityType: 'CUSTOMER_INVOICE',
    entityId: invoiceNo,
    title: `Payment Received #${invoiceNo}`,
    message: `Payment of ₹${amountPaid.toLocaleString()} recorded for Invoice #${invoiceNo}.`,
    data: { invoiceNo, amountPaid }
  });
}

// ----------------------------------------------------
// 3. DATABASE ADMIN SERVICES FOR RULES & RECIPIENTS (via REST API)
// ----------------------------------------------------
export async function fetchNotificationRules(): Promise<NotificationRule[]> {
  try {
    const res = await apiClient.get<{ data: NotificationRule[] }>('/notifications/rules');
    return res.data || [];
  } catch (err) {
    console.warn('fetchNotificationRules REST error:', err);
    return [];
  }
}

export async function updateNotificationRule(id: string, enabled: boolean): Promise<boolean> {
  try {
    await apiClient.patch(`/notifications/rules/${id}`, { enabled });
    return true;
  } catch (err) {
    console.warn('updateNotificationRule REST error:', err);
    return false;
  }
}

export async function fetchNotificationRecipients(ruleId?: string): Promise<NotificationRecipient[]> {
  try {
    const res = await apiClient.get<{ data: NotificationRecipient[] }>(
      ruleId ? `/notifications/recipients?ruleId=${encodeURIComponent(ruleId)}` : '/notifications/recipients'
    );
    return res.data || [];
  } catch (err) {
    console.warn('fetchNotificationRecipients REST error:', err);
    return [];
  }
}

export async function addNotificationRecipient(recipient: Omit<NotificationRecipient, 'id'>): Promise<NotificationRecipient | null> {
  try {
    const res = await apiClient.post<{ data: NotificationRecipient }>('/notifications/recipients', {
      notificationRuleId: recipient.notification_rule_id,
      recipientType: recipient.recipient_type,
      recipientValue: recipient.recipient_value,
      email: recipient.email,
      name: recipient.name,
      enabled: recipient.enabled
    });
    return res.data;
  } catch (err) {
    console.warn('addNotificationRecipient REST error:', err);
    return null;
  }
}

export async function deleteNotificationRecipient(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/notifications/recipients/${id}`);
    return true;
  } catch (err) {
    console.warn('deleteNotificationRecipient REST error:', err);
    return false;
  }
}

export async function fetchNotificationLogs(): Promise<NotificationLog[]> {
  try {
    const res = await apiClient.get<{ data: NotificationLog[] }>('/notifications/logs');
    return res.data || [];
  } catch (err) {
    console.warn('fetchNotificationLogs REST error:', err);
    return [];
  }
}
