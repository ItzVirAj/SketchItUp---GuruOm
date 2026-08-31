import { getDbClient } from '../../config/database';
import { 
  OrderSubType, 
  OrderStage, 
  ORDER_ERROR_CODES, 
  TransitionValidationResult,
  StateMachineContext,
  executeOrderStageTransition
} from '../../../../src/utils/orderStateMachine';
import { auditService } from '../audit/audit.service';

export class OrderStateMachineService {
  private db = getDbClient();

  /**
   * Evaluates server-side preconditions for an order stage transition,
   * querying item masters, customer credit aging, inventory ledgers, and open NCRs.
   */
  async validateAndExecuteTransition(ctx: StateMachineContext): Promise<TransitionValidationResult> {
    // 1. Fetch Item Master Drawing Revision if not provided
    if (!ctx.masterDrawingRevision && ctx.partCode) {
      try {
        const { data: itemData } = await this.db
          .from('items')
          .select('drawing_revision, code, description')
          .or(`code.eq.${ctx.partCode},item_code.eq.${ctx.partCode}`)
          .maybeSingle();

        if (itemData && itemData.drawing_revision) {
          ctx.masterDrawingRevision = itemData.drawing_revision;
        } else {
          // Fallback to default approved revision
          ctx.masterDrawingRevision = 'REV-A';
        }
      } catch (err) {
        ctx.masterDrawingRevision = ctx.masterDrawingRevision || 'REV-A';
      }
    }

    // 2. Fetch Customer 90-Day Overdue Receivables Status
    if (ctx.isCustomerOverdue90Days === undefined && ctx.customerName) {
      try {
        const { data: invoices } = await this.db
          .from('customer_invoices')
          .select('total_amount, invoice_date, status')
          .eq('customer_name', ctx.customerName)
          .neq('status', 'PAID');

        if (invoices && invoices.length > 0) {
          const now = new Date();
          const hasOverdue90 = invoices.some(inv => {
            const invDate = new Date(inv.invoice_date);
            const diffDays = Math.floor((now.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays > 90;
          });
          ctx.isCustomerOverdue90Days = hasOverdue90;
        } else {
          ctx.isCustomerOverdue90Days = false;
        }
      } catch (err) {
        ctx.isCustomerOverdue90Days = false;
      }
    }

    // 3. Fetch Linked Open NCRs for the Order / Job Cards
    if (ctx.linkedOpenNcrs === undefined && (ctx.poNo || ctx.orderId)) {
      try {
        const { data: ncrs } = await this.db
          .from('ncrs')
          .select('*')
          .or(`order_po.eq.${ctx.poNo},order_id.eq.${ctx.orderId}`)
          .in('status', ['OPEN', 'UNDER_REVIEW', 'REWORK_PLANNED']);

        if (ncrs && ncrs.length > 0) {
          ctx.linkedOpenNcrs = ncrs.map(n => ({
            id: n.id,
            ncrNumber: n.ncr_number,
            jobNo: n.job_no || 'N/A',
            defectDescription: n.defect_description || n.defect_type,
            status: n.status
          }));
        } else {
          ctx.linkedOpenNcrs = [];
        }
      } catch (err) {
        ctx.linkedOpenNcrs = [];
      }
    }

    // 4. Execute Core State Machine Rule Engine
    const result = executeOrderStageTransition(ctx);

    // 5. Handle Side-Effects (Auto-Purchase Requisitions, Credit Override Logging, Audit Log)
    if (result.valid && result.autoActionsTriggered) {
      for (const action of result.autoActionsTriggered) {
        if (action.type === 'PURCHASE_REQUISITION_GENERATED' && action.payload) {
          try {
            const p = action.payload;
            await this.db.from('purchase_requisitions').insert({
              id: require('crypto').randomUUID(),
              req_number: p.reqNumber,
              order_id: ctx.orderId,
              order_po: ctx.poNo,
              item_code: p.itemCode,
              item_description: `Raw material for ${ctx.poNo}`,
              required_qty: p.requiredQty,
              available_stock: p.availableStock,
              deficit_qty: p.deficitQty,
              status: 'AUTO_GENERATED',
              created_by: 'System Material Auto-Checker'
            });
          } catch (dbErr) {
            console.warn('Purchase requisition DB insert fallback:', dbErr);
          }
        }

        // Write to audit log
        await auditService.recordAuditLog({
          actorEmail: ctx.actorName,
          actorRole: ctx.actorRole,
          action: action.type,
          entityType: 'customer_orders',
          entityId: ctx.orderId || ctx.poNo,
          details: action.details,
          metadata: {
            context: ctx,
            actionPayload: action.payload
          }
        }).catch(() => {});
      }
    } else if (!result.valid) {
      // Record blocked transition event in audit log
      await auditService.recordAuditLog({
        actorEmail: ctx.actorName,
        actorRole: ctx.actorRole,
        action: 'ORDER_STAGE_GATE_BLOCKED',
        entityType: 'customer_orders',
        entityId: ctx.orderId || ctx.poNo,
        details: `Stage transition to ${ctx.targetStage} blocked by ${result.errorCode}: ${result.errorMessage}`,
        metadata: {
          errorCode: result.errorCode,
          currentStage: ctx.currentStage,
          targetStage: ctx.targetStage
        }
      }).catch(() => {});
    }

    return result;
  }
}

export const orderStateMachineService = new OrderStateMachineService();
