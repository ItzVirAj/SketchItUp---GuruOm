import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { OutworkSendOutSchema, ReceiveOutworkSchema } from './outwork.schema';

const SEED_OUTWORK_SEND_OUTS = [
  {
    id: 'ow-1',
    sendOutId: 'SO-0042',
    vendorName: 'Anodize Tech Ltd',
    process: 'Hard Anodizing 25 microns',
    sentQty: 250,
    receivedQty: 250,
    rejectedQty: 0,
    expectedDate: '2026-08-12',
    sentDate: '2026-08-05',
    status: 'COMPLETED',
    unitCost: 45
  },
  {
    id: 'ow-2',
    sendOutId: 'SO-0043',
    vendorName: 'Apex Heat Treaters',
    process: 'Induction Hardening 55-60 HRC',
    sentQty: 100,
    receivedQty: 50,
    rejectedQty: 0,
    expectedDate: '2026-08-16',
    sentDate: '2026-08-10',
    status: 'PARTIALLY_RECEIVED',
    unitCost: 75
  },
  {
    id: 'ow-3',
    sendOutId: 'SO-0044',
    vendorName: 'Shree Zinc Electroplaters',
    process: 'Zinc Plating Yellow Passivation',
    sentQty: 500,
    receivedQty: 0,
    rejectedQty: 0,
    expectedDate: '2026-08-20',
    sentDate: '2026-08-12',
    status: 'SENT',
    unitCost: 18
  }
];

export class OutworkService {
  private db = getDbClient();

  async getOutworkList() {
    try {
      const { data, error } = await this.db
        .from('outwork_sendouts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(o => ({
          id: o.id,
          sendOutId: o.send_out_id,
          vendorName: o.vendor_name,
          process: o.process,
          sentQty: Number(o.sent_qty || 0),
          receivedQty: Number(o.received_qty || 0),
          rejectedQty: Number(o.rejected_qty || 0),
          expectedDate: o.expected_date,
          status: o.status
        }));
      }
    } catch (err) {
      console.warn('Database getOutworkList fallback:', err);
    }
    return SEED_OUTWORK_SEND_OUTS;
  }

  async getOutworkById(id: string) {
    try {
      const { data, error } = await this.db
        .from('outwork_sendouts')
        .select('*')
        .or(`id.eq.${id},send_out_id.eq.${id}`)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          sendOutId: data.send_out_id,
          vendorName: data.vendor_name,
          process: data.process,
          sentQty: Number(data.sent_qty || 0),
          receivedQty: Number(data.received_qty || 0),
          rejectedQty: Number(data.rejected_qty || 0),
          expectedDate: data.expected_date,
          status: data.status
        };
      }
    } catch (err) {
      console.warn('Database getOutworkById fallback:', err);
    }
    return SEED_OUTWORK_SEND_OUTS.find(o => o.id === id || o.sendOutId === id) || null;
  }

  async createOutworkSendOut(data: z.infer<typeof OutworkSendOutSchema>) {
    const validated = OutworkSendOutSchema.parse(data);
    const owId = validated.id || `ow-${Date.now()}`;

    try {
      const { error } = await this.db.from('outwork_sendouts').insert({
        id: owId,
        send_out_id: validated.sendOutId,
        vendor_name: validated.vendorName,
        process: validated.process,
        sent_qty: validated.sentQty,
        received_qty: validated.receivedQty || 0,
        rejected_qty: validated.rejectedQty || 0,
        expected_date: validated.expectedDate,
        status: validated.status || 'SENT'
      });

      if (error) throw error;
    } catch (err) {
      console.warn('Database createOutworkSendOut fallback:', err);
    }

    const created = { id: owId, ...validated };
    SEED_OUTWORK_SEND_OUTS.unshift(created as any);
    return created;
  }

  async receiveOutworkReturn(id: string, receiveData: z.infer<typeof ReceiveOutworkSchema>) {
    const { receivedQty, rejectedQty } = ReceiveOutworkSchema.parse(receiveData);

    const existing = await this.getOutworkById(id);
    if (!existing) {
      throw new Error(`Outwork record ${id} not found.`);
    }

    const newReceived = (existing.receivedQty || 0) + receivedQty;
    const newRejected = (existing.rejectedQty || 0) + (rejectedQty || 0);
    const totalProcessed = newReceived + newRejected;

    let newStatus: 'SENT' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'OVERDUE' = 'PARTIALLY_RECEIVED';
    if (totalProcessed >= existing.sentQty) {
      newStatus = 'COMPLETED';
    } else {
      const today = new Date().toISOString().split('T')[0];
      if (existing.expectedDate && today > existing.expectedDate) {
        newStatus = 'OVERDUE';
      } else {
        newStatus = 'PARTIALLY_RECEIVED';
      }
    }

    try {
      await this.db
        .from('outwork_sendouts')
        .update({
          received_qty: newReceived,
          rejected_qty: newRejected,
          status: newStatus
        })
        .or(`id.eq.${id},send_out_id.eq.${id}`);
    } catch (err) {
      console.warn('Database receiveOutworkReturn fallback:', err);
    }

    const local = SEED_OUTWORK_SEND_OUTS.find(o => o.id === id || o.sendOutId === id);
    if (local) {
      local.receivedQty = newReceived;
      local.rejectedQty = newRejected;
      local.status = newStatus;
    }

    return {
      id,
      receivedQty: newReceived,
      rejectedQty: newRejected,
      status: newStatus
    };
  }
}

export const outworkService = new OutworkService();
