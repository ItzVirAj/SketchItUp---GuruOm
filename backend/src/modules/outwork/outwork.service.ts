import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { SubcontractGateOutSchema, SubcontractGateInSchema } from './outwork.schema';
import { auditService } from '../audit/audit.service';
import { inventoryService } from '../inventory/inventory.service';
import { 
  evaluateSubcontractOverdueStatus, 
  SubcontractOrder 
} from '../../../../src/utils/procurementEngine';

const SEED_SUBCONTRACT_ORDERS: SubcontractOrder[] = [];

export class OutworkService {
  private db = getDbClient();

  /**
   * Fetches all job-work subcontracting dispatches with real-time automated overdue calculation.
   */
  async getSubcontractOrders() {
    try {
      const { data, error } = await this.db
        .from('subcontract_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(sub => {
          const rawOrder: SubcontractOrder = {
            id: sub.id,
            gatePassNo: sub.gate_pass_no,
            jobNo: sub.job_no,
            itemCode: sub.item_code,
            itemDescription: sub.item_description,
            subcontractorName: sub.subcontractor_name,
            processType: sub.process_type,
            dispatchedQty: Number(sub.dispatched_qty || 0),
            unit: sub.unit || 'NOS',
            dispatchDate: sub.dispatch_date,
            expectedReturnDate: sub.expected_return_date,
            actualReturnDate: sub.actual_return_date,
            gateInPassNo: sub.gate_in_pass_no,
            receivedQty: Number(sub.received_qty || 0),
            rejectedQty: Number(sub.rejected_qty || 0),
            qcStatus: sub.qc_status || 'PENDING_GATE_IN',
            status: sub.status || 'OUT_FOR_JOBWORK',
            isOverdue: sub.is_overdue || false,
            overdueDays: Number(sub.overdue_days || 0),
            vehicleDetails: sub.vehicle_details,
            transporter: sub.transporter,
            dispatchedBy: sub.dispatched_by,
            receivedBy: sub.received_by,
            notes: sub.notes
          };

          // Evaluate live overdue status based on current date
          const overdueEval = evaluateSubcontractOverdueStatus(rawOrder);
          return {
            ...rawOrder,
            isOverdue: overdueEval.isOverdue,
            overdueDays: overdueEval.overdueDays,
            status: overdueEval.status
          };
        });
      }
    } catch (err) {
      console.warn('DB getSubcontractOrders fallback:', err);
    }

    // Fallback seed with live overdue evaluation
    return SEED_SUBCONTRACT_ORDERS.map(sub => {
      const overdueEval = evaluateSubcontractOverdueStatus(sub);
      return {
        ...sub,
        isOverdue: overdueEval.isOverdue,
        overdueDays: overdueEval.overdueDays,
        status: overdueEval.status
      };
    });
  }

  /**
   * Dispatches material for outsourced job-work:
   * 1. Creates Outward Gate Pass (GP-OUT-2026-####)
   * 2. Deducts on-hand stock via SUBCON_GATE_OUT ledger movement
   * 3. Updates Job Card status to OUT_FOR_JOBWORK
   */
  async dispatchSubcontractGateOut(data: z.infer<typeof SubcontractGateOutSchema>, actorName: string) {
    const validated = SubcontractGateOutSchema.parse(data);
    const subId = validated.id || `sub-${Date.now()}`;
    const gatePassNo = validated.gatePassNo || `GP-OUT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    try {
      await this.db.from('subcontract_orders').insert({
        id: subId,
        gate_pass_no: gatePassNo,
        job_no: validated.jobNo,
        item_code: validated.itemCode,
        item_description: validated.itemDescription,
        subcontractor_name: validated.subcontractorName,
        process_type: validated.processType,
        dispatched_qty: validated.dispatchedQty,
        unit: validated.unit,
        dispatch_date: validated.dispatchDate,
        expected_return_date: validated.expectedReturnDate,
        qc_status: 'PENDING_GATE_IN',
        status: 'OUT_FOR_JOBWORK',
        is_overdue: false,
        overdue_days: 0,
        vehicle_details: validated.vehicleDetails,
        transporter: validated.transporter,
        unit_rate: validated.unitRate,
        total_process_cost: (validated.unitRate || 0) * validated.dispatchedQty,
        dispatched_by: actorName,
        notes: validated.notes,
        created_at: new Date().toISOString()
      });

      // 1. Record Ledger Movement SUBCON_GATE_OUT
      await inventoryService.recordMovement({
        itemCode: validated.itemCode,
        movementType: 'TRANSFER_OUT',
        qty: validated.dispatchedQty,
        referenceDoc: gatePassNo,
        actor: actorName,
        notes: `Outward job-work dispatch for ${validated.processType} at ${validated.subcontractorName}. Gate Pass: ${gatePassNo}`
      });

      // 2. Update linked Job Card
      await this.db
        .from('job_cards')
        .update({ status: 'OUT_FOR_JOBWORK' })
        .or(`job_no.eq.${validated.jobNo},id.eq.${validated.jobNo}`);

    } catch (err) {
      console.warn('DB dispatchSubcontractGateOut fallback:', err);
    }

    await auditService.recordAuditLog({
      actorEmail: actorName,
      actorRole: 'Production Planner',
      action: 'SUBCONTRACT_GATE_OUT_DISPATCHED',
      entityType: 'subcontract_orders',
      entityId: gatePassNo,
      details: `Gate-Out ${gatePassNo}: ${validated.dispatchedQty} ${validated.unit} of ${validated.itemCode} dispatched to ${validated.subcontractorName} for ${validated.processType}. Expected: ${validated.expectedReturnDate}`
    }).catch(() => {});

    return {
      id: subId,
      gatePassNo,
      ...validated,
      dispatchedBy: actorName,
      status: 'OUT_FOR_JOBWORK'
    };
  }

  /**
   * Receives material back from subcontractor:
   * 1. Records Inward Gate Pass (GP-IN-2026-####)
   * 2. Restores material into factory inventory via SUBCON_GATE_IN ledger movement
   * 3. Records incoming quality inspection
   */
  async receiveSubcontractGateIn(data: z.infer<typeof SubcontractGateInSchema>, actorName: string) {
    const validated = SubcontractGateInSchema.parse(data);
    const gateInPassNo = validated.gateInPassNo || `GP-IN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    try {
      await this.db
        .from('subcontract_orders')
        .update({
          gate_in_pass_no: gateInPassNo,
          actual_return_date: validated.actualReturnDate,
          received_qty: validated.receivedQty,
          rejected_qty: validated.rejectedQty,
          qc_status: validated.qcStatus,
          status: 'RETURNED_INSPECTED',
          is_overdue: false,
          overdue_days: 0,
          received_by: actorName,
          notes: validated.notes || validated.inspectionNotes,
          updated_at: new Date().toISOString()
        })
        .or(`gate_pass_no.eq.${validated.gatePassNo},id.eq.${validated.gatePassNo}`);

      // Record Ledger Movement SUBCON_GATE_IN
      await inventoryService.recordMovement({
        itemCode: 'SUBCON-RETURN',
        movementType: 'TRANSFER_IN',
        qty: validated.receivedQty,
        referenceDoc: gateInPassNo,
        actor: actorName,
        notes: `Inward job-work receipt for ${validated.gatePassNo}. QC Inspection: ${validated.qcStatus}. Notes: ${validated.inspectionNotes || 'Accepted'}`
      });
    } catch (err) {
      console.warn('DB receiveSubcontractGateIn fallback:', err);
    }

    await auditService.recordAuditLog({
      actorEmail: actorName,
      actorRole: 'Quality Inspector',
      action: 'SUBCONTRACT_GATE_IN_RECEIVED',
      entityType: 'subcontract_orders',
      entityId: validated.gatePassNo,
      details: `Gate-In ${gateInPassNo} (Linked: ${validated.gatePassNo}): ${validated.receivedQty} received, ${validated.rejectedQty} rejected (${validated.qcStatus})`
    }).catch(() => {});

    return {
      gatePassNo: validated.gatePassNo,
      gateInPassNo,
      status: 'RETURNED_INSPECTED',
      receivedBy: actorName
    };
  }

  /**
   * Real-time automated query for overdue subcontracting alerts.
   */
  async getOverdueSubcontractAlerts() {
    const all = await this.getSubcontractOrders();
    return all.filter(s => s.isOverdue && s.status === 'OVERDUE_JOBWORK');
  }
}

export const outworkService = new OutworkService();
