import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { AdjustStockSchema } from './inventory.schema';
import { inventoryMovementsService } from './inventory_movements.service';
import { notificationsService } from '../notifications/notifications.service';
import { logAudit } from '../../services/auditLog';

export class InventoryService {
  private db = getDbClient();

  /**
   * Fetches current stock inventory levels derived from the append-only movement ledger.
   */
  async getStock() {
    try {
      const { data, error } = await this.db
        .from('stock_items')
        .select('*')
        .order('code', { ascending: true });

      if (!error && data && data.length > 0) {
        // Derive on_hand from ledger movements
        const results = await Promise.all(
          data.map(async s => {
            const ledgerOnHand = await inventoryMovementsService.getCurrentBalance(s.code);
            const onHand = ledgerOnHand !== 0 ? ledgerOnHand : Number(s.on_hand || 0);
            const reserved = Number(s.reserved || 0);
            const available = onHand - reserved;
            const reorderLevel = Number(s.reorder_level || 0);
            const shortage = Math.max(0, reorderLevel - available);
            const status = available < 0 ? 'CRITICAL' : available < reorderLevel ? 'SHORTAGE' : 'OK';

            return {
              code: s.code,
              description: s.description,
              onHand,
              reserved,
              available,
              demand: Number(s.demand || 0),
              reorderLevel,
              shortage,
              unit: s.unit || 'NOS',
              status
            };
          })
        );

        return results;
      }
    } catch (err) {
      console.warn('Database getStock error:', err);
    }

    return [];
  }

  /**
   * Adjusts stock quantity by creating an immutable ADJUSTMENT movement entry in the ledger.
   * (Does NOT overwrite quantity directly).
   */
  async adjustStock(
    code: string, 
    data: z.infer<typeof AdjustStockSchema>, 
    actorEmail = 'inventory@guruom.in'
  ) {
    const { newOnHand, reason } = AdjustStockSchema.parse(data);

    // 1. Get current derived balance
    const currentBalance = await inventoryMovementsService.getCurrentBalance(code);
    const delta = newOnHand - currentBalance;

    if (delta === 0) {
      return {
        code,
        onHand: currentBalance,
        available: currentBalance,
        status: 'OK'
      };
    }

    // 2. Append movement to immutable ledger
    const movement = await inventoryMovementsService.recordMovement({
      itemCode: code,
      quantityChange: delta,
      movementType: 'ADJUSTMENT',
      referenceType: 'adjustment',
      actorEmail,
      notes: `Manual stock adjustment to ${newOnHand} (Delta: ${delta > 0 ? '+' : ''}${delta})${reason ? ` — ${reason}` : ''}`
    });

    const reserved = 0;
    const available = movement.balance_after - reserved;

    // Record audit log for the adjustment
    await logAudit({
      actorEmail,
      action: 'ADJUST_STOCK',
      entityType: 'inventory',
      entityId: code,
      beforeState: { onHand: currentBalance },
      afterState: { onHand: newOnHand, available, delta },
      metadata: { movementId: movement.id }
    }).catch(() => {});

    // Real-Time Push: every connected client refetches live stock levels
    notificationsService.broadcastEvent('stock_updated', {
      itemCode: code,
      onHand: movement.balance_after,
      available,
      delta,
      movementType: 'ADJUSTMENT',
      reason
    });

    return {
      code,
      onHand: movement.balance_after,
      reserved,
      available,
      reorderLevel: 25,
      status: available < 0 ? 'CRITICAL' : available < 25 ? 'SHORTAGE' : 'OK',
      movementId: movement.id
    };
  }

  /**
   * Gets a specific stock item by code.
   */
  async getStockItem(code: string) {
    let onHand = await inventoryMovementsService.getCurrentBalance(code);
    let reserved = 0;
    let reorderLevel = 25;
    let description = 'Precision Item';
    let unit = 'NOS';

    try {
      const { data } = await this.db.from('stock_items').select('*').eq('code', code).maybeSingle();
      if (data) {
        if (onHand === 0 && data.on_hand !== undefined && data.on_hand !== null) {
          onHand = Number(data.on_hand || 0);
        }
        reserved = Number(data.reserved || 0);
        reorderLevel = Number(data.reorder_level || 25);
        description = data.description || description;
        unit = data.unit || unit;
      }
    } catch (_) {}

    const available = onHand - reserved;
    return {
      code,
      description,
      onHand,
      reserved,
      available,
      demand: 0,
      reorderLevel,
      shortage: Math.max(0, reorderLevel - available),
      unit,
      status: (available < 0 ? 'CRITICAL' : available < reorderLevel ? 'SHORTAGE' : 'OK') as 'CRITICAL' | 'SHORTAGE' | 'OK'
    };
  }

  /**
   * Reserves stock quantity for production job card.
   */
  async reserveStock(code: string, qty: number, orderPo?: string) {
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

    await logAudit({
      actorEmail: 'inventory@guruom.in',
      action: 'RESERVE_MATERIAL',
      entityType: 'order',
      entityId: orderPo || code,
      afterState: { code, reservedQty: qty }
    }).catch(() => {});
  }


  /**
   * Fetches active stock shortages.
   */
  async getShortages() {
    const stock = await this.getStock();
    return stock
      .filter(s => s.status === 'SHORTAGE' || s.status === 'CRITICAL')
      .map(s => ({
        code: s.code,
        description: s.description,
        requiredQty: s.reorderLevel + s.reserved,
        availableQty: s.available,
        deficit: Math.abs(Math.min(0, s.available)) || (s.reorderLevel - s.available),
        unit: s.unit
      }));
  }
}

export const inventoryService = new InventoryService();
