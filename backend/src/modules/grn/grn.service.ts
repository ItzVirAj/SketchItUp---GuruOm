import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { GoodsReceiptNoteSchema, UpdateGrnStatusSchema } from './grn.schema';

const SEED_GRNS = [
  {
    id: 'grn-1',
    grnNo: 'GRN-26-081',
    poNo: 'PO-PUR-2026-001',
    vendorCode: 'VEND-001',
    vendorName: 'Mahalaxmi Steel Traders',
    challanNo: 'CH-MST-9912',
    challanDate: '2026-08-10',
    receivedDate: '2026-08-11',
    receivedBy: 'Suresh Yadav',
    status: 'QC_VERIFIED',
    vehicleNo: 'GJ-03-BW-4451',
    remarks: 'Material test certificate verified at inward gate.',
    items: [
      {
        id: 'grn-item-1',
        itemCode: 'RAW-ALU-6061-ROD',
        itemDescription: 'Aluminium 6061 Round Bar Ø50mm',
        orderedQty: 500,
        receivedQty: 500,
        acceptedQty: 500,
        rejectedQty: 0,
        unit: 'KG',
        unitRate: 280
      }
    ]
  },
  {
    id: 'grn-2',
    grnNo: 'GRN-26-082',
    poNo: 'PO-PUR-2026-002',
    vendorCode: 'VEND-002',
    vendorName: 'Apex Tools & Inserts',
    challanNo: 'INV-APX-4431',
    challanDate: '2026-08-12',
    receivedDate: '2026-08-13',
    receivedBy: 'Rajesh Sharma',
    status: 'RECEIVED',
    vehicleNo: 'GJ-03-AX-8910',
    remarks: 'Delivered by courier.',
    items: [
      {
        id: 'grn-item-2',
        itemCode: 'TOOL-CNMG-120408',
        itemDescription: 'CNMG 120408 Turning Carbide Inserts',
        orderedQty: 50,
        receivedQty: 50,
        acceptedQty: 50,
        rejectedQty: 0,
        unit: 'NOS',
        unitRate: 450
      }
    ]
  }
];

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

    const createdGrn = { id: grnId, ...validated };
    SEED_GRNS.unshift(createdGrn as any);
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

    return { id, ...validated };
  }
}

export const grnService = new GrnService();
