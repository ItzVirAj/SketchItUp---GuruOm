import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { GoodsReceiptNoteSchema, UpdateGrnStatusSchema } from './grn.schema';
import { inventoryMovementsService } from '../inventory/inventory_movements.service';
import { notificationsService } from '../notifications/notifications.service';
import { ordersService } from '../orders/orders.service';
import { purchasingService } from '../purchasing/purchasing.service';
import { evaluateGrnMismatch } from '../../../../src/utils/procurementEngine';
import { logAudit } from '../../services/auditLog';

const SEED_GRNS: any[] = [];

export class GrnService {
  private db = getDbClient();

  async getGrnList() {
    try {
      const { data: grnData, error: grnErr } = await this.db
        .from('goods_receipt_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (!grnErr && grnData && grnData.length > 0) {
        const { data: itemsData } = await this.db.from('grn_items').select('*');

        return grnData.map(g => ({
          id: g.id,
          grnNo: g.grn_no,
          poNo: g.po_no,
          vendorCode: g.vendor_code,
          vendorName: g.vendor_name,
          challanNo: g.challan_no,
          challanDate: g.challan_date,
          receivedDate: g.received_date,
          receivedBy: g.received_by,
          status: g.status,
          vehicleNo: g.vehicle_no,
          remarks: g.remarks,
          isQtyMismatched: Boolean(g.is_qty_mismatched),
          mismatchNotes: g.mismatch_notes || undefined,
          items: (itemsData || []).filter(i => i.grn_id === g.id).map(i => ({
            id: i.id,
            itemCode: i.item_code,
            itemDescription: i.item_description,
            orderedQty: Number(i.ordered_qty || 0),
            receivedQty: Number(i.received_qty || 0),
            acceptedQty: Number(i.accepted_qty || 0),
            rejectedQty: Number(i.rejected_qty || 0),
            unit: i.unit || 'NOS',
            unitRate: Number(i.unit_rate || 0),
            rejectionReason: i.rejection_reason
          }))
        }));
      }
    } catch (err) {
      console.warn('Database getGrnList error:', err);
    }
    return SEED_GRNS;
  }

  async getGrnById(id: string) {
    try {
      const { data: g, error: grnErr } = await this.db
        .from('goods_receipt_notes')
        .select('*')
        .or(`id.eq.${id},grn_no.eq.${id}`)
        .maybeSingle();

      if (!grnErr && g) {
        const { data: itemsData } = await this.db.from('grn_items').select('*').eq('grn_id', g.id);

        return {
          id: g.id,
          grnNo: g.grn_no,
          poNo: g.po_no,
          vendorCode: g.vendor_code,
          vendorName: g.vendor_name,
          challanNo: g.challan_no,
          challanDate: g.challan_date,
          receivedDate: g.received_date,
          receivedBy: g.received_by,
          status: g.status,
          vehicleNo: g.vehicle_no,
          remarks: g.remarks,
          isQtyMismatched: Boolean(g.is_qty_mismatched),
          mismatchNotes: g.mismatch_notes || undefined,
          items: (itemsData || []).map(i => ({
            id: i.id,
            itemCode: i.item_code,
            itemDescription: i.item_description,
            orderedQty: Number(i.ordered_qty || 0),
            receivedQty: Number(i.received_qty || 0),
            acceptedQty: Number(i.accepted_qty || 0),
            rejectedQty: Number(i.rejected_qty || 0),
            unit: i.unit || 'NOS',
            unitRate: Number(i.unit_rate || 0),
            rejectionReason: i.rejection_reason
          }))
        };
      }
    } catch (err) {
      console.warn('Database getGrnById error:', err);
    }
    return SEED_GRNS.find(g => g.id === id || g.grnNo === id) || null;
  }

  async createGrn(data: z.infer<typeof GoodsReceiptNoteSchema>) {
    const validated = GoodsReceiptNoteSchema.parse(data);
    const grnId = validated.id || `grn-${Date.now()}`;

    // 1. Look up originating Purchase Order to compare expected vs received quantities
    let originatingPo: any = null;
    try {
      if (validated.poNo) {
        originatingPo = await purchasingService.getPurchaseOrderById(validated.poNo);
      }
    } catch (poErr) {
      console.warn('Error fetching PO for GRN mismatch evaluation:', poErr);
    }

    let isQtyMismatched = false;
    const mismatchMessages: string[] = [];

    if (validated.items && validated.items.length > 0) {
      for (const item of validated.items) {
        const matchedPoItem = originatingPo?.items?.find(
          (pi: any) => pi.itemCode?.toLowerCase().trim() === item.itemCode?.toLowerCase().trim()
        );
        const expectedQty = Number(matchedPoItem?.orderQty ?? item.orderedQty ?? 0);
        const receivedQty = Number(item.receivedQty || 0);

        if (expectedQty > 0 || receivedQty > 0) {
          const evalResult = evaluateGrnMismatch(expectedQty, receivedQty);
          if (evalResult.isMismatched) {
            isQtyMismatched = true;
            mismatchMessages.push(evalResult.message);
          }
        }
      }
    }

    const mismatchNotes = mismatchMessages.length > 0 ? mismatchMessages.join(' | ') : undefined;

    try {
      const { error: insertErr } = await this.db.from('goods_receipt_notes').insert({
        id: grnId,
        grn_no: validated.grnNo,
        po_no: validated.poNo,
        vendor_code: validated.vendorCode,
        vendor_name: validated.vendorName,
        challan_no: validated.challanNo,
        challan_date: validated.challanDate,
        received_date: validated.receivedDate,
        received_by: validated.receivedBy,
        status: validated.status,
        vehicle_no: validated.vehicleNo,
        remarks: validated.remarks,
        is_qty_mismatched: isQtyMismatched,
        mismatch_notes: mismatchNotes || null,
        created_at: new Date().toISOString()
      });

      if (insertErr) throw insertErr;

      if (validated.items && validated.items.length > 0) {
        const itemRows = validated.items.map(it => ({
          id: it.id || `grn-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          grn_id: grnId,
          item_code: it.itemCode,
          item_description: it.itemDescription,
          ordered_qty: it.orderedQty,
          received_qty: it.receivedQty,
          accepted_qty: it.acceptedQty,
          rejected_qty: it.rejectedQty,
          unit: it.unit,
          unit_rate: it.unitRate,
          rejection_reason: it.rejectionReason
        }));

        await this.db.from('grn_items').insert(itemRows);
      }
    } catch (err) {
      console.warn('Database createGrn error:', err);
    }

    // Record inbound movements into immutable inventory ledger
    if (validated.items && validated.items.length > 0) {
      for (const item of validated.items) {
        const qty = item.acceptedQty !== undefined ? item.acceptedQty : item.receivedQty;
        if (qty > 0) {
          await inventoryMovementsService.recordMovement({
            itemCode: item.itemCode,
            quantityChange: qty,
            movementType: 'GRN',
            referenceId: validated.grnNo,
            referenceType: 'grn',
            actorEmail: validated.receivedBy.includes('@') ? validated.receivedBy : 'warehouse@guruom.in',
            notes: `Goods receipt from ${validated.vendorName} (Challan #${validated.challanNo})`
          }).catch(() => {});
        }
      }
    }

    const createdGrn = {
      id: grnId,
      ...validated,
      isQtyMismatched,
      mismatchNotes
    };
    SEED_GRNS.unshift(createdGrn as any);

    // AUTOMATED CHAIN TRIGGER: Re-evaluate material availability for all orders waiting on raw materials
    ordersService.recheckMaterialAvailabilityForWaitingOrders().catch(err => {
      console.warn('Background recheckMaterialAvailability error:', err);
    });

    // Real-Time Push: Broadcast GRN creation & stock update
    await logAudit({
      actorEmail: 'stores@guruom.in',
      action: 'GRN_RECORDED',
      entityType: 'goods_receipt_notes',
      entityId: String(createdGrn.grnNo || createdGrn.id || ''),
      afterState: { poNo: createdGrn.poNo, vendor: createdGrn.vendorName, receivedQty: createdGrn.receivedQty, status: createdGrn.status },
      metadata: { details: `GRN ${createdGrn.grnNo} recorded for PO ${createdGrn.poNo} from ${createdGrn.vendorName || 'vendor'}` }
    }).catch(() => {});

    notificationsService.broadcastEvent('grn_created', createdGrn);
    notificationsService.broadcastEvent('stock_updated', { grnNo: validated.grnNo, items: validated.items });

    return createdGrn;
  }

  async updateGrnStatus(id: string, data: z.infer<typeof UpdateGrnStatusSchema>) {
    const validated = UpdateGrnStatusSchema.parse(data);

    try {
      await this.db
        .from('goods_receipt_notes')
        .update({
          status: validated.status,
          remarks: validated.remarks
        })
        .or(`id.eq.${id},grn_no.eq.${id}`);
    } catch (err) {
      console.warn('Database updateGrnStatus error:', err);
    }

    const local = SEED_GRNS.find(g => g.id === id || g.grnNo === id);
    if (local) {
      local.status = validated.status;
      if (validated.remarks) local.remarks = validated.remarks;
    }

    const updated = { id, ...validated };

    if (validated.status === 'ACCEPTED' || validated.status === 'COMPLETED') {
      ordersService.recheckMaterialAvailabilityForWaitingOrders().catch(() => {});
    }

    notificationsService.broadcastEvent('grn_updated', updated);
    notificationsService.broadcastEvent('stock_updated', { grnId: id, status: validated.status });

    return updated;
  }
}

export const grnService = new GrnService();

