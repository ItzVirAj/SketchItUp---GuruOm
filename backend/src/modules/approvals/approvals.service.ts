import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { PendingApprovalSchema, DecisionApprovalSchema } from './approvals.schema';
import { auditService } from '../audit/audit.service';
import { ordersService } from '../orders/orders.service';
import { purchasingService } from '../purchasing/purchasing.service';

const SEED_APPROVALS = [
  {
    id: 'appr-1',
    title: 'High Value Steel Purchase Order',
    type: 'HIGH_VALUE_PO',
    requestedBy: 'Amit Joshi (Procurement)',
    timestamp: '11:20 AM',
    amount: 385000,
    details: 'PO-2026-004 exceeds standard single-sign threshold (₹2.5L limit).',
    entityId: 'PO-2026-004'
  },
  {
    id: 'appr-2',
    title: 'Special Customer Discount (5.5%)',
    type: 'DISCOUNT_OVERRIDE',
    requestedBy: 'Kavita Patel (Sales)',
    timestamp: '02:15 PM',
    amount: 45000,
    details: 'Order PO-2026-001 discount adjustment for annual volume rebate.',
    entityId: 'PO-2026-001'
  },
  {
    id: 'appr-3',
    title: 'Scrap Raw Material Write-off',
    type: 'SCRAP_WRITE_OFF',
    requestedBy: 'Deepak Sharma (Production)',
    timestamp: 'Yesterday',
    amount: 18200,
    details: 'Defective forging billet scrap write-off authorization.',
    entityId: 'SCRAP-2026-09'
  }
];

export class ApprovalsService {
  private db = getDbClient();

  async getPendingApprovals() {
    try {
      const { data, error } = await this.db
        .from('pending_approvals')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(a => ({
          id: a.id,
          title: a.title,
          type: a.type,
          requestedBy: a.requested_by,
          timestamp: a.timestamp,
          amount: a.amount ? Number(a.amount) : undefined,
          details: a.details,
          entityId: a.entity_id
        }));
      }
    } catch (err) {
      console.warn('Database getPendingApprovals fallback:', err);
    }
    return SEED_APPROVALS;
  }

  async getApprovalById(id: string) {
    try {
      const { data, error } = await this.db
        .from('pending_approvals')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          title: data.title,
          type: data.type,
          requestedBy: data.requested_by,
          timestamp: data.timestamp,
          amount: data.amount ? Number(data.amount) : undefined,
          details: data.details,
          entityId: data.entity_id
        };
      }
    } catch (err) {
      console.warn('Database getApprovalById fallback:', err);
    }
    return SEED_APPROVALS.find(a => a.id === id) || null;
  }

  async createApprovalRequest(data: z.infer<typeof PendingApprovalSchema>) {
    const validated = PendingApprovalSchema.parse(data);
    const apprId = validated.id || `appr-${Date.now()}`;

    try {
      const { error } = await this.db.from('pending_approvals').insert({
        id: apprId,
        title: validated.title,
        type: validated.type,
        requested_by: validated.requestedBy,
        timestamp: validated.timestamp,
        amount: validated.amount,
        details: validated.details
      });

      if (error) throw error;
    } catch (err) {
      console.warn('Database createApprovalRequest fallback:', err);
    }

    const created = { id: apprId, ...validated };
    SEED_APPROVALS.unshift(created as any);
    return created;
  }

  async approveRequest(id: string, decision: z.infer<typeof DecisionApprovalSchema>, actorName: string, actorId?: string) {
    const existing = await this.getApprovalById(id);
    if (!existing) {
      throw new Error(`Approval request #${id} not found.`);
    }

    // 1. Update the underlying entity status
    if (existing.entityId) {
      try {
        if (existing.type === 'HIGH_VALUE_PO') {
          await purchasingService.approvePurchaseOrder(existing.entityId, actorName);
        } else if (existing.type === 'ORDER_CANCEL') {
          await ordersService.updateOrderStatus(existing.entityId, { status: 'CANCELLED' }, actorName);
        }
      } catch (entityErr) {
        console.warn(`Could not cascade approval update to source entity ${existing.entityId}:`, entityErr);
      }
    }

    // 2. Record audit log via AuditService
    await auditService.recordAuditLog({
      userId: actorId,
      userName: actorName,
      entity: `Approval (${existing.type})`,
      entityId: existing.entityId || existing.id,
      action: 'APPROVE',
      details: `Approved "${existing.title}". ${decision.comments ? `Comments: ${decision.comments}` : ''}`
    });

    // 3. Remove / Resolve pending approval
    try {
      await this.db.from('pending_approvals').delete().eq('id', id);
    } catch (err) {
      console.warn('Database delete approval fallback:', err);
    }

    const index = SEED_APPROVALS.findIndex(a => a.id === id);
    if (index !== -1) {
      SEED_APPROVALS.splice(index, 1);
    }

    return { id, status: 'APPROVED', approvedBy: actorName, entityId: existing.entityId };
  }

  async rejectRequest(id: string, decision: z.infer<typeof DecisionApprovalSchema>, actorName: string, actorId?: string) {
    const existing = await this.getApprovalById(id);
    if (!existing) {
      throw new Error(`Approval request #${id} not found.`);
    }

    // 1. Record audit log via AuditService
    await auditService.recordAuditLog({
      userId: actorId,
      userName: actorName,
      entity: `Approval (${existing.type})`,
      entityId: existing.entityId || existing.id,
      action: 'REJECT',
      details: `Rejected "${existing.title}". Reason: ${decision.reason || decision.comments || 'Not specified'}`
    });

    // 2. Remove / Resolve pending approval
    try {
      await this.db.from('pending_approvals').delete().eq('id', id);
    } catch (err) {
      console.warn('Database delete approval fallback:', err);
    }

    const index = SEED_APPROVALS.findIndex(a => a.id === id);
    if (index !== -1) {
      SEED_APPROVALS.splice(index, 1);
    }

    return { id, status: 'REJECTED', rejectedBy: actorName, entityId: existing.entityId };
  }
}

export const approvalsService = new ApprovalsService();
