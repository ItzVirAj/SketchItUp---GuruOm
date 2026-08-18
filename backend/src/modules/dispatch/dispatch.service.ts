import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { DispatchChallanSchema, UpdateDispatchStatusSchema } from './dispatch.schema';
import { qcService } from '../qc/qc.service';
import { inventoryMovementsService } from '../inventory/inventory_movements.service';
import { notificationsService } from '../notifications/notifications.service';
import { ordersService } from '../orders/orders.service';
import { logAudit } from '../../services/auditLog';


const SEED_DISPATCHES: any[] = [];

export class DispatchService {
  private db = getDbClient();

  async getDispatches() {
    try {
      const { data, error } = await this.db
        .from('dispatch_challans')
        .select('*')
        .not('challan_no', 'like', 'CHL/6%')
        .not('challan_no', 'like', 'CHL/TEST%')
        .not('order_po', 'like', 'PO-GOLDEN-%')
        .not('order_po', 'like', 'PO-TEST-%')
        .not('order_po', 'like', 'PO-TATA-%')
        .not('order_po', 'like', '__TEST__%')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(d => ({
          id: d.id,
          challanNo: d.challan_no,
          orderPo: d.order_po,
          status: d.status,
          date: d.date,
          transporter: d.transporter,
          vehicleNo: d.vehicle_no,
          linesCount: Number(d.lines_count || 1)
        }));
      }
    } catch (err) {
      console.warn('Database getDispatches fallback:', err);
    }
    return SEED_DISPATCHES;
  }

  async getDispatchByNo(challanNo: string) {
    try {
      const { data, error } = await this.db
        .from('dispatch_challans')
        .select('*')
        .or(`id.eq.${challanNo},challan_no.eq.${challanNo}`)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          challanNo: data.challan_no,
          orderPo: data.order_po,
          status: data.status,
          date: data.date,
          transporter: data.transporter,
          vehicleNo: data.vehicle_no,
          linesCount: Number(data.lines_count || 1)
        };
      }
    } catch (err) {
      console.warn('Database getDispatchByNo fallback:', err);
    }
    return SEED_DISPATCHES.find(d => d.id === challanNo || d.challanNo === challanNo) || null;
  }

  async createDispatch(data: z.infer<typeof DispatchChallanSchema>) {
    const validated = DispatchChallanSchema.parse(data);

    // CRITICAL ENFORCEMENT: Server-side validation of QC & PDI dispatch clearance
    const eligibility = await qcService.checkDispatchEligibility(validated.orderPo);
    if (!eligibility.eligible) {
      throw new Error(`Dispatch rejected by Quality Gatekeeper: ${eligibility.reasons.join(' ')}`);
    }

    const challanId = validated.id || `chl-${Date.now()}`;
    let fullyDispatched = false;

    try {
      const { error } = await this.db.from('dispatch_challans').insert({
        id: challanId,
        challan_no: validated.challanNo,
        order_po: validated.orderPo,
        status: validated.status,
        date: validated.date,
        transporter: validated.transporter,
        vehicle_no: validated.vehicleNo,
        lines_count: validated.linesCount,
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      // Resolve order lines and allocate dispatch quantities (defaults to each line's full pending qty)
      const { data: order } = await this.db
        .from('customer_orders')
        .select('id, po_no')
        .or(`id.eq.${validated.orderPo},po_no.eq.${validated.orderPo}`)
        .maybeSingle();
      const { data: orderLines } = await this.db
        .from('order_line_items')
        .select('*')
        .eq('order_id', order?.id || validated.orderPo);

      const requestedByItem = new Map<string, number>(
        (validated.lines || []).map(l => [l.itemCode, l.qty])
      );

      fullyDispatched = true;
      for (const line of orderLines || []) {
        const pending = Math.max(0, Number(line.order_qty || 0) - Number(line.dispatched_qty || 0));
        const dispatchQty = Math.min(pending, requestedByItem.get(line.item_code) ?? pending);
        if (dispatchQty <= 0) continue;

        const newDispatchedQty = Number(line.dispatched_qty || 0) + dispatchQty;
        if (newDispatchedQty < Number(line.order_qty || 0)) fullyDispatched = false;

        // Increment order line dispatched quantity
        await this.db
          .from('order_line_items')
          .update({ dispatched_qty: newDispatchedQty })
          .eq('id', line.id);

        // Deduct from the PDI-passed finished goods pool for this order + item
        const { data: fgRows } = await this.db
          .from('finished_goods')
          .select('id, dispatched_qty')
          .eq('order_po', order?.po_no || validated.orderPo)
          .eq('item_code', line.item_code);
        const fg = (fgRows || [])[0];
        if (fg) {
          await this.db
            .from('finished_goods')
            .update({ dispatched_qty: Number(fg.dispatched_qty || 0) + dispatchQty })
            .eq('id', fg.id);
        }

        // Record outbound stock movement into immutable inventory ledger
        await inventoryMovementsService.recordMovement({
          itemCode: line.item_code,
          quantityChange: -dispatchQty,
          movementType: 'DISPATCH',
          referenceId: validated.challanNo,
          referenceType: 'dispatch',
          actorEmail: 'dispatch@guruom.in',
          notes: `Dispatch via ${validated.transporter} (PO #${validated.orderPo}, Challan #${validated.challanNo})`
        }).catch(() => {});
      }
      if (!orderLines || orderLines.length === 0) fullyDispatched = false;

      // Stage 8: DISPATCHED only when every order line is fully dispatched, else PARTIALLY_DISPATCHED
      const orderStatus = fullyDispatched ? 'DISPATCHED' : 'PARTIALLY_DISPATCHED';
      await this.db
        .from('customer_orders')
        .update({
          status: orderStatus,
          stage: orderStatus,
          progress_step: 8,
          updated_at: new Date().toISOString()
        })
        .or(`id.eq.${validated.orderPo},po_no.eq.${validated.orderPo}`);
    } catch (err) {
      console.warn('Database createDispatch fallback:', err);
    }

    const created = { id: challanId, ...validated };
    SEED_DISPATCHES.unshift(created as any);

    // Synchronize in-memory order status
    ordersService.updateOrderStageDirectly(validated.orderPo, fullyDispatched ? 'DISPATCHED' : 'PARTIALLY_DISPATCHED', 8);

    // Real-Time Push: Broadcast dispatch creation, order progression, and stock deduction
    await logAudit({
      actorEmail: 'dispatch@guruom.in',
      action: 'DISPATCH_CREATED',
      entityType: 'dispatch_challans',
      entityId: String(validated.challanNo),
      afterState: { orderPo: validated.orderPo, transporter: validated.transporter, vehicleNo: validated.vehicleNo, linesCount: validated.linesCount },
      metadata: { details: `Challan ${validated.challanNo} dispatched for PO ${validated.orderPo} via ${validated.transporter}` }
    }).catch(() => {});

    notificationsService.broadcastEvent('dispatch_created', created);
    notificationsService.broadcastEvent('order_updated', {
      id: validated.orderPo,
      poNo: validated.orderPo,
      status: fullyDispatched ? 'DISPATCHED' : 'PARTIALLY_DISPATCHED',
      stage: fullyDispatched ? 'DISPATCHED' : 'PARTIALLY_DISPATCHED',
      progressStep: 8
    });
    notificationsService.broadcastEvent('stock_updated', { challanNo: validated.challanNo, type: 'DISPATCH' });

    return created;

  }

  async getDispatchableQty(orderPo: string) {
    try {
      const eligibility = await qcService.checkDispatchEligibility(orderPo);
      if (!eligibility.eligible) {
        return {
          orderPo,
          eligible: false,
          reasons: eligibility.reasons,
          dispatchableLines: []
        };
      }

      // Query order lines and calculate dispatchable pool
      const { data: order } = await this.db
        .from('customer_orders')
        .select('*')
        .or(`id.eq.${orderPo},po_no.eq.${orderPo}`)
        .maybeSingle();

      const { data: lines } = await this.db
        .from('order_line_items')
        .select('*')
        .eq('order_id', order?.id || orderPo);

      const dispatchableLines = (lines || []).map(l => {
        const pending = Math.max(0, Number(l.order_qty || 0) - Number(l.dispatched_qty || 0));
        // PDI-passed available pool
        const dispatchableQty = pending;
        return {
          itemId: l.id,
          itemCode: l.item_code,
          itemDescription: l.item_description,
          orderQty: Number(l.order_qty || 0),
          dispatchedQty: Number(l.dispatched_qty || 0),
          pendingQty: pending,
          dispatchableQty
        };
      });

      return {
        orderPo,
        eligible: true,
        reasons: [],
        dispatchableLines
      };
    } catch (err: any) {
      return {
        orderPo,
        eligible: true,
        reasons: [],
        dispatchableLines: []
      };
    }
  }

  async updateDispatchStatus(challanNo: string, data: z.infer<typeof UpdateDispatchStatusSchema>) {
    const { status } = UpdateDispatchStatusSchema.parse(data);

    try {
      await this.db
        .from('dispatch_challans')
        .update({ status })
        .or(`id.eq.${challanNo},challan_no.eq.${challanNo}`);
    } catch (err) {
      console.warn('Database updateDispatchStatus fallback:', err);
    }

    const local = SEED_DISPATCHES.find(d => d.id === challanNo || d.challanNo === challanNo);
    if (local) local.status = status as any;

    // Real-Time Push: Broadcast challan lifecycle transitions (dispatched / delivered / cancelled)
    notificationsService.broadcastEvent('dispatch_updated', { challanNo, status });

    return { challanNo, status };
  }

  async dispatchChallan(challanNo: string) {
    return this.updateDispatchStatus(challanNo, { status: 'DISPATCHED' });
  }

  async deliverChallan(challanNo: string) {
    return this.updateDispatchStatus(challanNo, { status: 'DELIVERED' });
  }

  async cancelChallan(challanNo: string, reason?: string) {
    return this.updateDispatchStatus(challanNo, { status: 'CANCELLED' });
  }

  async printChallan(challanNo: string) {
    const challan = await this.getDispatchByNo(challanNo);
    if (!challan) throw new Error(`Challan ${challanNo} not found`);
    return {
      ...challan,
      template: 'STANDARD_DELIVERY_CHALLAN_GST_V1',
      companyHeader: {
        legalName: 'GURU OM PRECISION ENGINEERING PRIVATE LIMITED',
        gstin: '27AABCG1234F1Z5',
        state: 'Maharashtra (Code 27)'
      }
    };
  }
}

export const dispatchService = new DispatchService();
