import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { AdjustStockSchema } from './inventory.schema';

export class InventoryService {
  private db = getDbClient();

  /**
   * Fetches current stock inventory levels.
   */
  async getStock() {
    try {
      const { data, error } = await this.db
        .from('stock_items')
        .select('*')
        .order('code', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map(s => ({
          code: s.code,
          description: s.description,
          onHand: Number(s.on_hand || 0),
          reserved: Number(s.reserved || 0),
          available: Number(s.available || 0),
          demand: Number(s.demand || 0),
          reorderLevel: Number(s.reorder_level || 0),
          shortage: Number(s.shortage || 0),
          unit: s.unit || 'NOS',
          status: s.status
        }));
      }
    } catch (err) {
      console.warn('Database getStock error:', err);
    }
    return [];
  }

  /**
   * Adjusts on-hand quantity for a stock item, recomputing availability and status.
   */
  async adjustStock(code: string, data: z.infer<typeof AdjustStockSchema>) {
    const { newOnHand } = AdjustStockSchema.parse(data);

    try {
      const { data: current } = await this.db
        .from('stock_items')
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (!current) {
        return { code, onHand: newOnHand, available: newOnHand, status: 'OK' };
      }

      const reserved = Number(current.reserved || 0);
      const reorderLevel = Number(current.reorder_level || 0);
      const available = newOnHand - reserved;
      const status = available < 0 ? 'CRITICAL' : available < reorderLevel ? 'SHORTAGE' : 'OK';

      await this.db.from('stock_items').update({
        on_hand: newOnHand,
        available,
        status,
        updated_at: new Date().toISOString()
      }).eq('code', code);

      return {
        code,
        onHand: newOnHand,
        reserved,
        available,
        reorderLevel,
        status
      };
    } catch (err) {
      console.warn('Database adjustStock error:', err);
      return { code, onHand: newOnHand };
    }
  }

  /**
   * Gets a specific stock item by code.
   */
  async getStockItem(code: string) {
    try {
      const { data: s } = await this.db
        .from('stock_items')
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (s) {
        return {
          code: s.code,
          description: s.description,
          onHand: Number(s.on_hand || 0),
          reserved: Number(s.reserved || 0),
          available: Number(s.available || 0),
          demand: Number(s.demand || 0),
          reorderLevel: Number(s.reorder_level || 0),
          shortage: Number(s.shortage || 0),
          unit: s.unit || 'NOS',
          status: s.status
        };
      }
    } catch (err) {
      console.warn(`Database getStockItem(${code}) error:`, err);
    }
    return null;
  }

  /**
   * Reserves stock quantity for production job card.
   */
  async reserveStock(code: string, qty: number) {
    try {
      const current = await this.getStockItem(code);
      if (current) {
        const newReserved = (current.reserved || 0) + qty;
        const newAvailable = (current.onHand || 0) - newReserved;
        const status = newAvailable < 0 ? 'CRITICAL' : newAvailable < current.reorderLevel ? 'SHORTAGE' : 'OK';

        await this.db.from('stock_items').update({
          reserved: newReserved,
          available: newAvailable,
          status,
          updated_at: new Date().toISOString()
        }).eq('code', code);
      }
    } catch (err) {
      console.warn(`Database reserveStock(${code}) error:`, err);
    }
  }

  /**
   * Fetches active stock shortages.
   */
  async getShortages() {
    try {
      const { data, error } = await this.db
        .from('shortage_items')
        .select('*')
        .order('deficit', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(sh => ({
          code: sh.code,
          description: sh.description,
          requiredQty: Number(sh.required_qty || 0),
          availableQty: Number(sh.available_qty || 0),
          deficit: Number(sh.deficit || 0),
          unit: sh.unit || 'NOS'
        }));
      }
    } catch (err) {
      console.warn('Database getShortages error:', err);
    }
    return [];
  }
}

export const inventoryService = new InventoryService();
