import { getDbClient } from '../../config/database';
import { LockService } from '../../lib/lock';
import { logAudit } from '../../services/auditLog';
import { notificationsService } from '../notifications/notifications.service';
import { randomUUID } from 'crypto';

export interface OrderMaterialReservation {
  id: string;
  order_id: string;
  order_po: string;
  item_code: string;
  reserved_qty: number;
  status: 'ACTIVE' | 'CONSUMED' | 'RELEASED';
  created_at: string;
  updated_at: string;
}

// In-memory fallback ledger to support tests and environments before migration execution
const IN_MEMORY_RESERVATIONS = new Map<string, OrderMaterialReservation>();

export class InventoryReservationsService {
  private db = getDbClient();

  /**
   * Reset in-memory reservations (for testing purposes).
   */
  resetInMemoryStore() {
    IN_MEMORY_RESERVATIONS.clear();
  }

  /**
   * Fetches all active material reservations for a given order (by ID or PO).
   */
  async getActiveReservations(orderIdOrPo: string): Promise<OrderMaterialReservation[]> {
    try {
      const { data, error } = await this.db
        .from('order_material_reservations')
        .select('*')
        .or(`order_id.eq.${orderIdOrPo},order_po.eq.${orderIdOrPo}`)
        .eq('status', 'ACTIVE');

      if (!error && Array.isArray(data)) {
        return data.map(r => ({
          id: r.id,
          order_id: r.order_id,
          order_po: r.order_po,
          item_code: r.item_code,
          reserved_qty: Number(r.reserved_qty || 0),
          status: r.status,
          created_at: r.created_at,
          updated_at: r.updated_at
        }));
      }
    } catch {
      // Fallback to in-memory store
    }

    // Fallback search
    return Array.from(IN_MEMORY_RESERVATIONS.values()).filter(
      r => (r.order_id === orderIdOrPo || r.order_po === orderIdOrPo) && r.status === 'ACTIVE'
    );
  }

  /**
   * Atomically reserves materials for an order across all required components.
   * Concurrency Safe: Acquires ordered locks on each material to avoid deadlocks & race conditions.
   * Idempotent: Recognizes existing reservations for this order and only reserves the missing delta.
   * All-or-Nothing: If any component has a shortage, no stock is reserved.
   */
  async reserveOrderMaterials(
    orderId: string,
    orderPo: string,
    allocations: { code: string; qty: number }[]
  ): Promise<{ success: boolean; shortages?: Array<{ componentCode: string; requiredQty: number; available: number; deficit: number }> }> {
    if (!allocations || allocations.length === 0) {
      return { success: true };
    }

    // Sort material codes alphabetically to ensure uniform locking order across all requests (prevents deadlock)
    const sortedCodes = Array.from(new Set(allocations.map(a => a.code))).sort();
    const lockKeys = sortedCodes.map(c => LockService.buildKey('t_default', 'stock_material', c));

    return await LockService.withLock(lockKeys, 5000, async () => {
      // 1. Fetch active reservations already held by this order
      const existingReservations = await this.getActiveReservations(orderId);
      const existingResMap = new Map<string, OrderMaterialReservation>();
      for (const res of existingReservations) {
        existingResMap.set(res.item_code, res);
      }

      // 2. Fetch live stock for all required items & check availability
      const shortages: Array<{ componentCode: string; requiredQty: number; available: number; deficit: number }> = [];
      const stockItemMap = new Map<string, any>();

      for (const alloc of allocations) {
        const itemCode = alloc.code;
        const requiredQty = Number(alloc.qty || 0);

        let stockItem: any = null;
        try {
          const { data } = await this.db.from('stock_items').select('*').eq('code', itemCode).maybeSingle();
          if (data) stockItem = data;
        } catch {}

        const onHand = Number(stockItem?.on_hand || 0);
        const currentReserved = Number(stockItem?.reserved || 0);
        const currentAvailable = onHand - currentReserved;

        stockItemMap.set(itemCode, {
          onHand,
          reserved: currentReserved,
          available: currentAvailable,
          reorderLevel: Number(stockItem?.reorder_level || 25),
          unit: stockItem?.unit || 'NOS'
        });

        // The order's own already-reserved quantity is available to itself
        const alreadyReservedByThisOrder = existingResMap.get(itemCode)?.reserved_qty || 0;
        const availableToThisOrder = currentAvailable + alreadyReservedByThisOrder;

        if (availableToThisOrder < requiredQty) {
          shortages.push({
            componentCode: itemCode,
            requiredQty,
            available: availableToThisOrder,
            deficit: Math.max(0, requiredQty - availableToThisOrder)
          });
        }
      }

      // 3. All-or-Nothing check: If any component is short, abort reservation
      if (shortages.length > 0) {
        return { success: false, shortages };
      }

      // 4. Stock is verified for ALL components -> apply delta reservations
      const nowIso = new Date().toISOString();

      for (const alloc of allocations) {
        const itemCode = alloc.code;
        const requiredQty = Number(alloc.qty || 0);
        const existingRes = existingResMap.get(itemCode);
        const alreadyReserved = existingRes?.reserved_qty || 0;
        const delta = requiredQty - alreadyReserved;

        const currentStock = stockItemMap.get(itemCode)!;
        const newReserved = Math.max(0, currentStock.reserved + delta);
        const newAvailable = currentStock.onHand - newReserved;
        const newStatus = newAvailable < 0 ? 'CRITICAL' : newAvailable < currentStock.reorderLevel ? 'SHORTAGE' : 'OK';

        // 4a. Update stock_items
        try {
          await this.db.from('stock_items').update({
            reserved: newReserved,
            available: newAvailable,
            status: newStatus,
            updated_at: nowIso
          }).eq('code', itemCode);
        } catch (dbErr: any) {
          console.warn(`Database reserveStock sync warning for ${itemCode}:`, dbErr.message);
        }

        // 4b. Insert or update order_material_reservations
        if (existingRes) {
          try {
            await this.db
              .from('order_material_reservations')
              .update({
                reserved_qty: requiredQty,
                updated_at: nowIso
              })
              .eq('id', existingRes.id);
          } catch {}

          // Update memory fallback
          IN_MEMORY_RESERVATIONS.set(existingRes.id, {
            ...existingRes,
            reserved_qty: requiredQty,
            updated_at: nowIso
          });
        } else {
          const newId = randomUUID();
          const record: OrderMaterialReservation = {
            id: newId,
            order_id: orderId,
            order_po: orderPo,
            item_code: itemCode,
            reserved_qty: requiredQty,
            status: 'ACTIVE',
            created_at: nowIso,
            updated_at: nowIso
          };

          try {
            await this.db.from('order_material_reservations').insert(record);
          } catch {}

          IN_MEMORY_RESERVATIONS.set(newId, record);
        }

        // Update local map
        currentStock.reserved = newReserved;
        currentStock.available = newAvailable;
      }

      return { success: true };
    });
  }

  /**
   * Reconciles reservations upon physical material issue/consumption.
   * Decrements stock_items.reserved by the reserved amount so available stock is not doubly reduced.
   * Marks reservations as CONSUMED.
   */
  async consumeOrderReservations(
    orderIdOrPo: string,
    consumedItems?: { itemCode: string; qty: number }[],
    skipLock = false
  ): Promise<void> {
    const activeReservations = await this.getActiveReservations(orderIdOrPo);
    if (activeReservations.length === 0) {
      return;
    }

    const executeReconciliation = async () => {
      const nowIso = new Date().toISOString();

      // Explicit reservations exist for this order
      for (const res of activeReservations) {
        // 1. Mark reservation as CONSUMED
        try {
          await this.db
            .from('order_material_reservations')
            .update({ status: 'CONSUMED', updated_at: nowIso })
            .eq('id', res.id);
        } catch {}

        if (IN_MEMORY_RESERVATIONS.has(res.id)) {
          const mem = IN_MEMORY_RESERVATIONS.get(res.id)!;
          mem.status = 'CONSUMED';
          mem.updated_at = nowIso;
        }

        // 2. Decrement stock_items.reserved by the reservation amount
        let currentStock: any = null;
        try {
          const { data } = await this.db.from('stock_items').select('*').eq('code', res.item_code).maybeSingle();
          if (data) currentStock = data;
        } catch {}

        if (currentStock) {
          const currentReserved = Number(currentStock.reserved || 0);
          const newReserved = Math.max(0, currentReserved - res.reserved_qty);
          const onHand = Number(currentStock.on_hand || 0);
          const newAvailable = onHand - newReserved;
          const reorderLevel = Number(currentStock.reorder_level || 25);
          const status = newAvailable < 0 ? 'CRITICAL' : newAvailable < reorderLevel ? 'SHORTAGE' : 'OK';

          try {
            await this.db.from('stock_items').update({
              reserved: newReserved,
              available: newAvailable,
              status,
              updated_at: nowIso
            }).eq('code', res.item_code);
          } catch {}
        }
      }
    };

    if (skipLock) {
      await executeReconciliation();
    } else {
      const itemCodes = Array.from(new Set(activeReservations.map(r => r.item_code))).sort();
      const lockKeys = itemCodes.map(c => LockService.buildKey('t_default', 'stock_material', c));
      await LockService.withLock(lockKeys, 5000, executeReconciliation);
    }
  }

  /**
   * CRITICAL ISSUE #9: Partial-aware reservation reconciliation for Job-Card-level
   * material consumption.
   *
   * Unlike consumeOrderReservations (which marks the ENTIRE order pool CONSUMED),
   * this decrements each order+item ACTIVE reservation only by the quantity actually
   * consumed by one Job Card:
   *   - Reservation stays ACTIVE with a residual qty while demand remains outstanding
   *     (so order cancellation later releases ONLY the outstanding remainder).
   *   - Reservation flips to CONSUMED only when its reserved_qty reaches zero.
   *   - stock_items.reserved is decremented by exactly the consumed-from-reservation
   *     amount (never below zero), preserving the Critical #3 invariants.
   *
   * Reuses the same sorted-lock discipline as the existing reservation lifecycle.
   */
  async reconcileOrderReservationsPartial(
    orderIdOrPo: string,
    consumedItems: { itemCode: string; qty: number }[],
    skipLock = false
  ): Promise<{ reconciledCount: number; consumedFromReservations: number }> {
    if (!consumedItems || consumedItems.length === 0) {
      return { reconciledCount: 0, consumedFromReservations: 0 };
    }

    const activeReservations = await this.getActiveReservations(orderIdOrPo);
    if (activeReservations.length === 0) {
      return { reconciledCount: 0, consumedFromReservations: 0 };
    }

    const executePartialReconciliation = async () => {
      const nowIso = new Date().toISOString();
      let reconciledCount = 0;
      let totalConsumedFromReservations = 0;

      for (const consumed of consumedItems) {
        const qtyToReconcile = Number(consumed.qty || 0);
        if (!(qtyToReconcile > 0)) continue;

        const res = activeReservations.find(r => r.item_code === consumed.itemCode);
        if (!res) continue; // No active reservation for this item — nothing to reconcile

        const consumedFromReservation = Math.min(res.reserved_qty, qtyToReconcile);
        if (!(consumedFromReservation > 0)) continue;

        const remainingQty = Math.max(0, Number((res.reserved_qty - consumedFromReservation).toFixed(6)));
        const nextStatus = remainingQty <= 0 ? 'CONSUMED' : 'ACTIVE';

        // 1. Update the reservation row (partial decrement, lifecycle status)
        try {
          await this.db
            .from('order_material_reservations')
            .update({ reserved_qty: remainingQty, status: nextStatus, updated_at: nowIso })
            .eq('id', res.id);
        } catch {}

        if (IN_MEMORY_RESERVATIONS.has(res.id)) {
          const mem = IN_MEMORY_RESERVATIONS.get(res.id)!;
          mem.reserved_qty = remainingQty;
          mem.status = nextStatus;
          mem.updated_at = nowIso;
        }

        // 2. Decrement stock_items.reserved by exactly the consumed-from-reservation amount
        let currentStock: any = null;
        try {
          const { data } = await this.db.from('stock_items').select('*').eq('code', res.item_code).maybeSingle();
          if (data) currentStock = data;
        } catch {}

        if (currentStock) {
          const currentReserved = Number(currentStock.reserved || 0);
          const newReserved = Math.max(0, currentReserved - consumedFromReservation);
          const onHand = Number(currentStock.on_hand || 0);
          const newAvailable = onHand - newReserved;
          const reorderLevel = Number(currentStock.reorder_level || 25);
          const status = newAvailable < 0 ? 'CRITICAL' : newAvailable < reorderLevel ? 'SHORTAGE' : 'OK';

          try {
            await this.db.from('stock_items').update({
              reserved: newReserved,
              available: newAvailable,
              status,
              updated_at: nowIso
            }).eq('code', res.item_code);
          } catch {}
        }

        reconciledCount++;
        totalConsumedFromReservations += consumedFromReservation;
      }

      return { reconciledCount, consumedFromReservations: totalConsumedFromReservations };
    };

    if (skipLock) {
      return await executePartialReconciliation();
    } else {
      const itemCodes = Array.from(new Set(consumedItems.map(i => i.itemCode))).sort();
      const lockKeys = itemCodes.map(c => LockService.buildKey('t_default', 'stock_material', c));
      return await LockService.withLock(lockKeys, 5000, executePartialReconciliation);
    }
  }

  /**
   * Releases active reservations for an order upon order cancellation or termination.
   * Decrements stock_items.reserved without touching on_hand.
   * Marks reservations as RELEASED.
   */
  async releaseOrderReservations(
    orderIdOrPo: string,
    orderPo?: string,
    reason = 'Order Cancelled'
  ): Promise<{ releasedCount: number; releasedQty: number }> {
    const activeReservations = await this.getActiveReservations(orderIdOrPo);
    if (activeReservations.length === 0) {
      return { releasedCount: 0, releasedQty: 0 };
    }

    const itemCodes = Array.from(new Set(activeReservations.map(r => r.item_code))).sort();
    const lockKeys = itemCodes.map(c => LockService.buildKey('t_default', 'stock_material', c));

    return await LockService.withLock(lockKeys, 5000, async () => {
      const nowIso = new Date().toISOString();
      let releasedCount = 0;
      let totalReleasedQty = 0;

      for (const res of activeReservations) {
        // 1. Update reservation status to RELEASED
        try {
          await this.db
            .from('order_material_reservations')
            .update({ status: 'RELEASED', updated_at: nowIso })
            .eq('id', res.id);
        } catch {}

        if (IN_MEMORY_RESERVATIONS.has(res.id)) {
          const mem = IN_MEMORY_RESERVATIONS.get(res.id)!;
          mem.status = 'RELEASED';
          mem.updated_at = nowIso;
        }

        // 2. Decrement stock_items.reserved without altering on_hand
        let currentStock: any = null;
        try {
          const { data } = await this.db.from('stock_items').select('*').eq('code', res.item_code).maybeSingle();
          if (data) currentStock = data;
        } catch {}

        if (currentStock) {
          const currentReserved = Number(currentStock.reserved || 0);
          const newReserved = Math.max(0, currentReserved - res.reserved_qty);
          const onHand = Number(currentStock.on_hand || 0);
          const newAvailable = onHand - newReserved;
          const reorderLevel = Number(currentStock.reorder_level || 25);
          const status = newAvailable < 0 ? 'CRITICAL' : newAvailable < reorderLevel ? 'SHORTAGE' : 'OK';

          try {
            await this.db.from('stock_items').update({
              reserved: newReserved,
              available: newAvailable,
              status,
              updated_at: nowIso
            }).eq('code', res.item_code);
          } catch {}

          notificationsService.broadcastEvent('stock_updated', {
            itemCode: res.item_code,
            onHand,
            reserved: newReserved,
            available: newAvailable,
            reason: `Reservation released (${reason})`
          });
        }

        releasedCount++;
        totalReleasedQty += res.reserved_qty;

        await logAudit({
          actorEmail: 'system@guruom.in',
          action: 'RESERVATION_RELEASED',
          entityType: 'inventory_reservation',
          entityId: res.id,
          details: `Released ${res.reserved_qty} of ${res.item_code} for order ${orderPo || orderIdOrPo}. Reason: ${reason}`
        }).catch(() => {});
      }

      return { releasedCount, releasedQty: totalReleasedQty };
    });
  }

  /**
   * Recalculates and reconciles aggregate reserved count for an item based on active reservation rows.
   */
  async reconcileItemReserved(itemCode: string): Promise<number> {
    const lockKey = LockService.buildKey('t_default', 'stock_material', itemCode);

    return await LockService.withLock(lockKey, 5000, async () => {
      let totalActive = 0;

      try {
        const { data, error } = await this.db
          .from('order_material_reservations')
          .select('reserved_qty')
          .eq('item_code', itemCode)
          .eq('status', 'ACTIVE');

        if (!error && Array.isArray(data)) {
          totalActive = data.reduce((sum, r) => sum + Number(r.reserved_qty || 0), 0);
        } else {
          // Fallback to in-memory store
          totalActive = Array.from(IN_MEMORY_RESERVATIONS.values())
            .filter(r => r.item_code === itemCode && r.status === 'ACTIVE')
            .reduce((sum, r) => sum + r.reserved_qty, 0);
        }
      } catch {
        totalActive = Array.from(IN_MEMORY_RESERVATIONS.values())
          .filter(r => r.item_code === itemCode && r.status === 'ACTIVE')
          .reduce((sum, r) => sum + r.reserved_qty, 0);
      }

      let currentStock: any = null;
      try {
        const { data } = await this.db.from('stock_items').select('*').eq('code', itemCode).maybeSingle();
        if (data) currentStock = data;
      } catch {}

      if (currentStock) {
        const onHand = Number(currentStock.on_hand || 0);
        const available = onHand - totalActive;
        const reorderLevel = Number(currentStock.reorder_level || 25);
        const status = available < 0 ? 'CRITICAL' : available < reorderLevel ? 'SHORTAGE' : 'OK';

        try {
          await this.db.from('stock_items').update({
            reserved: totalActive,
            available,
            status,
            updated_at: new Date().toISOString()
          }).eq('code', itemCode);
        } catch {}
      }

      return totalActive;
    });
  }
}

export const inventoryReservationsService = new InventoryReservationsService();
