import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { FinishedGoodsSchema, ReconcileFgSchema } from './finished-goods.schema';
import { inventoryService } from '../inventory/inventory.service';

const SEED_FINISHED_GOODS = [
  {
    id: 'fg-1',
    orderPo: 'PO-2026-002',
    partCode: '00000002',
    partDescription: 'HARDENED BUSH 45X60X80',
    pdiPassedQty: 150,
    physicallyHeldQty: 150,
    dispatchedQty: 0,
    variance: 0,
    location: 'FG-BAY-A1'
  }
];

export class FinishedGoodsService {
  private db = getDbClient();

  async getFinishedGoods() {
    try {
      const { data, error } = await this.db
        .from('finished_goods')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(f => ({
          id: f.id,
          orderPo: f.order_po,
          partCode: f.part_code,
          partDescription: f.part_description,
          pdiPassedQty: Number(f.pdi_passed_qty || 0),
          physicallyHeldQty: Number(f.physically_held_qty || 0),
          dispatchedQty: Number(f.dispatched_qty || 0),
          variance: Number(f.variance || 0),
          location: f.location || 'FG-BAY-A1'
        }));
      }
    } catch (err) {
      console.warn('Database getFinishedGoods fallback:', err);
    }
    return SEED_FINISHED_GOODS;
  }

  async getFinishedGoodsByOrder(orderPo: string) {
    try {
      const { data, error } = await this.db
        .from('finished_goods')
        .select('*')
        .or(`order_po.eq.${orderPo},part_code.eq.${orderPo}`);

      if (!error && data && data.length > 0) {
        return data.map(f => ({
          id: f.id,
          orderPo: f.order_po,
          partCode: f.part_code,
          partDescription: f.part_description,
          pdiPassedQty: Number(f.pdi_passed_qty || 0),
          physicallyHeldQty: Number(f.physically_held_qty || 0),
          dispatchedQty: Number(f.dispatched_qty || 0),
          variance: Number(f.variance || 0),
          location: f.location || 'FG-BAY-A1'
        }));
      }
    } catch (err) {
      console.warn('Database getFinishedGoodsByOrder fallback:', err);
    }
    return SEED_FINISHED_GOODS.filter(f => f.orderPo === orderPo || f.partCode === orderPo);
  }

  async recordFinishedGoods(data: z.infer<typeof FinishedGoodsSchema>) {
    const validated = FinishedGoodsSchema.parse(data);
    const fgId = validated.id || `fg-${Date.now()}`;

    try {
      const { error } = await this.db.from('finished_goods').insert({
        id: fgId,
        order_po: validated.orderPo,
        part_code: validated.partCode,
        part_description: validated.partDescription,
        pdi_passed_qty: validated.pdiPassedQty,
        physically_held_qty: validated.physicallyHeldQty,
        dispatched_qty: validated.dispatchedQty,
        variance: validated.variance,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (error) throw error;
    } catch (err) {
      console.warn('Database recordFinishedGoods fallback:', err);
    }

    const created = { id: fgId, ...validated };
    SEED_FINISHED_GOODS.unshift(created as any);
    return created;
  }

  async reconcileFinishedGoods(id: string, data: z.infer<typeof ReconcileFgSchema>) {
    const { physicallyHeldQty } = ReconcileFgSchema.parse(data);

    const fg = SEED_FINISHED_GOODS.find(f => f.id === id || f.orderPo === id);
    const pdiPassed = fg ? fg.pdiPassedQty : physicallyHeldQty;
    const dispatched = fg ? fg.dispatchedQty : 0;
    const expectedHeld = pdiPassed - dispatched;
    const variance = physicallyHeldQty - expectedHeld;

    try {
      await this.db
        .from('finished_goods')
        .update({
          physically_held_qty: physicallyHeldQty,
          variance,
          updated_at: new Date().toISOString()
        })
        .or(`id.eq.${id},order_po.eq.${id}`);
    } catch (err) {
      console.warn('Database reconcileFinishedGoods fallback:', err);
    }

    if (fg) {
      fg.physicallyHeldQty = physicallyHeldQty;
      fg.variance = variance;
    }

    return { id, physicallyHeldQty, variance };
  }
}

export const finishedGoodsService = new FinishedGoodsService();
