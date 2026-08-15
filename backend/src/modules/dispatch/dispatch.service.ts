import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { DispatchChallanSchema, UpdateDispatchStatusSchema } from './dispatch.schema';
import { qcService } from '../qc/qc.service';
import { inventoryMovementsService } from '../inventory/inventory_movements.service';

const SEED_DISPATCHES = [
  {
    id: 'chl-1',
    challanNo: 'CHL/0001/26-27',
    orderPo: 'PO-2026-002',
    status: 'DISPATCHED',
    date: '2026-08-14',
    transporter: 'VRL Logistics Ltd',
    vehicleNo: 'MH-12-AB-9876',
    linesCount: 1
  }
];

export class DispatchService {
  private db = getDbClient();

  async getDispatches() {
    try {
      const { data, error } = await this.db
        .from('dispatch_challans')
        .select('*')
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

      // Update customer order status and finished goods dispatched quantity
      await this.db
        .from('customer_orders')
        .update({
          status: 'PARTIALLY_DISPATCHED',
          progress_step: 3,
          updated_at: new Date().toISOString()
        })
        .or(`id.eq.${validated.orderPo},po_no.eq.${validated.orderPo}`);

      // Record outbound stock movement into immutable inventory ledger
      await inventoryMovementsService.recordMovement({
        itemCode: '00000001',
        quantityChange: -Number(validated.linesCount || 1) * 20,
        movementType: 'DISPATCH',
        referenceId: validated.challanNo,
        referenceType: 'dispatch',
        actorEmail: 'dispatch@guruom.in',
        notes: `Dispatch via ${validated.transporter} (PO #${validated.orderPo}, Challan #${validated.challanNo})`
      }).catch(() => {});
    } catch (err) {
      console.warn('Database createDispatch fallback:', err);
    }

    const created = { id: challanId, ...validated };
    SEED_DISPATCHES.unshift(created as any);
    return created;
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

    return { challanNo, status };
  }
}

export const dispatchService = new DispatchService();
