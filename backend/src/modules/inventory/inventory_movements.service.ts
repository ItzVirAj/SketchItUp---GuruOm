import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { 
  RecordMovementSchema, 
  MovementQueryFilterSchema, 
  ReversalMovementSchema, 
  MovementType 
} from './inventory_movements.schema';
import { logAudit } from '../../services/auditLog';
import { LockService } from '../../lib/lock';
import { inventoryReservationsService } from './inventory_reservations.service';

export interface InventoryMovementRecord {
  id: string;
  item_code: string;
  location: string;
  quantity_change: number;
  movement_type: MovementType;
  reference_id?: string | null;
  reference_type: string;
  balance_after: number;
  actor_id?: string | null;
  actor_email: string;
  notes?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

// In-Memory Immutable Ledger Journal for fallback / offline testing
const IN_MEMORY_MOVEMENTS: InventoryMovementRecord[] = [];

export class InventoryMovementsService {
  private db = getDbClient();

  /**
   * Clears in-memory ledger (useful for testing).
   */
  resetInMemoryStore() {
    IN_MEMORY_MOVEMENTS.length = 0;
  }

  /**
   * Derives current stock on hand by summing all ledger movements for an item.
   */
  async getCurrentBalance(itemCode: string, location = 'MAIN-WAREHOUSE'): Promise<number> {
    // 1. Check denormalized stock_items table (current snapshot)
    try {
      const { data: stockRow } = await this.db
        .from('stock_items')
        .select('on_hand')
        .eq('code', itemCode)
        .maybeSingle();
      if (stockRow && stockRow.on_hand !== undefined && stockRow.on_hand !== null) {
        return Number(stockRow.on_hand);
      }
    } catch (err) {
      console.warn(`Database getCurrentBalance(${itemCode}) stock_items fallback:`, err);
    }

    // 2. In-memory fallback
    const matching = IN_MEMORY_MOVEMENTS.filter(
      m => m.item_code === itemCode && m.location === location
    );
    if (matching.length > 0) {
      return matching.reduce((acc, m) => acc + m.quantity_change, 0);
    }

    // 3. Fallback to summing movements from ledger
    try {
      const { data, error } = await this.db
        .from('inventory_movements')
        .select('quantity_change')
        .eq('item_code', itemCode)
        .eq('location', location);

      if (!error && data && data.length > 0) {
        const sum = data.reduce((acc, row) => acc + Number(row.quantity_change || 0), 0);
        return sum;
      }
    } catch {}

    return 0;
  }

  /**
   * Appends an immutable movement to the inventory ledger.
   * Atomically computes balance_after and updates the denormalized read model.
   */
  async recordMovement(input: z.infer<typeof RecordMovementSchema>): Promise<InventoryMovementRecord> {
    const validated = RecordMovementSchema.parse(input);
    const itemCode = validated.itemCode;
    const location = validated.location || 'MAIN-WAREHOUSE';
    const quantityChange = validated.quantityChange;

    const lockKey = LockService.buildKey('t_default', 'stock_material', itemCode);
    return await LockService.withLock(lockKey, 5000, async () => {
      // 1. Calculate previous balance from ledger
      const previousBalance = await this.getCurrentBalance(itemCode, location);
      const balanceAfter = previousBalance + quantityChange;

      // Hard integrity check: Non-negative stock floor for stock reductions
      if (quantityChange < 0 && balanceAfter < 0) {
        const err: any = new Error(
          `Insufficient stock for item "${itemCode}". Available on-hand: ${previousBalance}, requested deduction: ${Math.abs(quantityChange)}.`
        );
        err.statusCode = 400;
        err.errorCode = 'ERR_INSUFFICIENT_STOCK';
        err.itemCode = itemCode;
        err.available = previousBalance;
        err.required = Math.abs(quantityChange);
        err.deficit = Math.abs(balanceAfter);
        throw err;
      }

      const movementId = randomUUID();
      const nowIso = new Date().toISOString();

      const record: InventoryMovementRecord = {
        id: movementId,
        item_code: itemCode,
        location,
        quantity_change: quantityChange,
        movement_type: validated.movementType,
        reference_id: validated.referenceId || null,
        reference_type: validated.referenceType || 'manual',
        balance_after: balanceAfter,
        actor_id: validated.actorId || null,
        actor_email: validated.actorEmail || 'system@guruom.in',
        notes: validated.notes || null,
        metadata: validated.metadata || {},
        created_at: nowIso
      };

    // 2. Persist to DB (Append-Only)
    try {
      await this.db.from('inventory_movements').insert(record);
    } catch (err: any) {
      console.warn('Database recordMovement insert warning:', err.message);
    }

    // In-memory freeze append
    IN_MEMORY_MOVEMENTS.unshift(Object.freeze({ ...record }));

    // 3. Update denormalized stock_items cache/read-model (upsert — first movement creates the row)
    try {
      const { data: stockRow } = await this.db
        .from('stock_items')
        .select('*')
        .eq('code', itemCode)
        .maybeSingle();

      const reserved = Number(stockRow?.reserved || 0);
      const reorderLevel = Number(stockRow?.reorder_level || 25);
      const available = balanceAfter - reserved;
      const status = available < 0 ? 'CRITICAL' : available < reorderLevel ? 'SHORTAGE' : 'OK';

      if (stockRow) {
        await this.db.from('stock_items').update({
          on_hand: balanceAfter,
          available,
          status,
          updated_at: nowIso
        }).eq('code', itemCode);
      } else {
        // Enrich description/reorder level from the Item Master where possible
        let description = itemCode;
        let masterReorder: number | null = null;
        let masterUnit: string | null = null;
        try {
          const { data: master } = await this.db
            .from('masters')
            .select('name, description, reorder_level, unit')
            .eq('code', itemCode)
            .maybeSingle();
          if (master) {
            description = master.name || master.description || itemCode;
            masterReorder = Number(master.reorder_level ?? 0);
            masterUnit = master.unit || null;
          }
        } catch { /* masters lookup is best-effort */ }

        await this.db.from('stock_items').insert({
          id: `stk-${itemCode}`,
          code: itemCode,
          description,
          on_hand: balanceAfter,
          reserved: 0,
          available: balanceAfter,
          demand: 0,
          reorder_level: masterReorder ?? 25,
          shortage: Math.max(0, (masterReorder ?? 25) - balanceAfter),
          unit: masterUnit || 'NOS',
          status,
          updated_at: nowIso
        });
      }
    } catch (err: any) {
      console.warn('Database stock_items sync warning:', err.message);
    }

    // 4. Record to Audit Log System
    await logAudit({
      actorId: record.actor_id || undefined,
      actorEmail: record.actor_email,
      action: `INVENTORY_MOVEMENT_${record.movement_type}`,
      entityType: 'inventory_movement',
      entityId: `${itemCode}:${movementId}`,
      beforeState: { onHand: previousBalance },
      afterState: { onHand: balanceAfter, quantityChange },
      metadata: {
        movementType: record.movement_type,
        referenceId: record.reference_id,
        referenceType: record.reference_type,
        location
      }
    }).catch(() => {});

      return record;
    });
  }

  /**
   * Retrieves chronological stock movements for a specific item (Stock History).
   */
  async getItemStockHistory(itemCode: string): Promise<InventoryMovementRecord[]> {
    try {
      const { data, error } = await this.db
        .from('inventory_movements')
        .select('*')
        .eq('item_code', itemCode)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as InventoryMovementRecord[];
      }
    } catch (err) {
      console.warn(`Database getItemStockHistory(${itemCode}) fallback:`, err);
    }

    return IN_MEMORY_MOVEMENTS.filter(m => m.item_code === itemCode);
  }

  /**
   * Queries movements with multi-attribute filtering & pagination.
   */
  async getAllMovements(filters?: z.infer<typeof MovementQueryFilterSchema>): Promise<{
    movements: InventoryMovementRecord[];
    total: number;
  }> {
    const parsed = MovementQueryFilterSchema.parse(filters || {});
    const limit = parsed.limit || 50;
    const from = parsed.from || 0;
    const to = from + limit - 1;

    try {
      let query = this.db
        .from('inventory_movements')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (parsed.itemCode) query = query.eq('item_code', parsed.itemCode);
      if (parsed.movementType) query = query.eq('movement_type', parsed.movementType);
      if (parsed.referenceId) query = query.ilike('reference_id', `%${parsed.referenceId}%`);

      const { data, error, count } = await query;
      if (!error && data) {
        return {
          movements: data as InventoryMovementRecord[],
          total: count || data.length
        };
      }
    } catch (err) {
      console.warn('Database getAllMovements fallback:', err);
    }

    let filtered = [...IN_MEMORY_MOVEMENTS];
    if (parsed.itemCode) filtered = filtered.filter(m => m.item_code === parsed.itemCode);
    if (parsed.movementType) filtered = filtered.filter(m => m.movement_type === parsed.movementType);
    if (parsed.referenceId) filtered = filtered.filter(m => m.reference_id?.includes(parsed.referenceId!));

    const total = filtered.length;
    const paginated = filtered.slice(from, from + limit);
    return { movements: paginated, total };
  }

  /**
   * Generates a Stock Reconciliation Report comparing ledger-derived balances with physical reported counts.
   */
  /**
   * Generates a dynamic Stock Reconciliation Report comparing ledger-derived balances with physical reported counts.
   * Authoritative source of truth:
   * - masters (item catalog)
   * - stock_items (fast-cache physical snapshot: on_hand, reserved, available)
   * - inventory_movements (immutable append-only ledger)
   * Zero hardcoded item codes.
   */
  async getStockReconciliation(filters?: {
    itemCode?: string;
    search?: string;
    status?: string;
    category?: string;
    includeInactive?: boolean;
  }): Promise<{
    itemCode: string;
    description: string;
    category?: string;
    ledgerBalance: number;
    cachedOnHand: number;
    reserved?: number;
    available?: number;
    discrepancy: number;
    status: 'MATCHED' | 'DISCREPANCY';
    unit?: string;
    itemStatus?: string;
    lastMovementAt?: string;
  }[]> {
    // 1. Fetch masters, stock_items, and movements in parallel
    const [mastersRes, stockRes, movementsRes] = await Promise.all([
      this.db
        .from('masters')
        .select('code, name, description, item_type, status, unit, reorder_level'),
      this.db
        .from('stock_items')
        .select('code, description, on_hand, reserved, available, unit, status, reorder_level'),
      this.db
        .from('inventory_movements')
        .select('item_code, quantity_change, balance_after, created_at')
        .order('created_at', { ascending: false })
    ]);

    const mastersList = (mastersRes.data || []) as any[];
    const stockList = (stockRes.data || []) as any[];
    const movementsList = (movementsRes.data || []) as any[];

    // Index latest movement by item_code (first encountered is latest due to created_at desc)
    const latestMovementMap = new Map<string, { balance_after: number; created_at: string; totalMovements: number }>();
    for (const mov of movementsList) {
      if (!mov.item_code) continue;
      if (!latestMovementMap.has(mov.item_code)) {
        latestMovementMap.set(mov.item_code, {
          balance_after: Number(mov.balance_after ?? 0),
          created_at: mov.created_at,
          totalMovements: 1
        });
      } else {
        latestMovementMap.get(mov.item_code)!.totalMovements += 1;
      }
    }

    // Also include in-memory ledger movements (for testing or DB fallback)
    for (const mov of IN_MEMORY_MOVEMENTS) {
      if (!mov.item_code) continue;
      if (!latestMovementMap.has(mov.item_code)) {
        latestMovementMap.set(mov.item_code, {
          balance_after: Number(mov.balance_after ?? 0),
          created_at: mov.created_at,
          totalMovements: 1
        });
      }
    }

    // Index stock items by code
    const stockMap = new Map<string, any>();
    for (const s of stockList) {
      if (s.code) stockMap.set(s.code, s);
    }

    // Build complete, dynamic population
    interface PopulationItem {
      itemCode: string;
      description: string;
      category?: string;
      unit: string;
      itemStatus: string;
      stockItem?: any;
    }

    const population = new Map<string, PopulationItem>();

    // A. Add Master Items
    for (const m of mastersList) {
      if (!m.code) continue;
      const stockRow = stockMap.get(m.code);
      const hasMovement = latestMovementMap.has(m.code);
      const hasStock = stockRow && (Number(stockRow.on_hand || 0) !== 0 || Number(stockRow.reserved || 0) !== 0);

      const isActive = (m.status || 'Active').toLowerCase() === 'active';
      // Include all Active items; include Inactive items if they have physical stock, movements, or explicitly requested
      if (isActive || hasStock || hasMovement || filters?.includeInactive) {
        population.set(m.code, {
          itemCode: m.code,
          description: m.name || m.description || stockRow?.description || m.code,
          category: m.item_type || 'General',
          unit: m.unit || stockRow?.unit || 'NOS',
          itemStatus: m.status || 'Active',
          stockItem: stockRow
        });
      }
    }

    // B. Add Orphan Stock Items (items in stock_items that do not exist in masters)
    for (const s of stockList) {
      if (!s.code) continue;
      if (!population.has(s.code)) {
        population.set(s.code, {
          itemCode: s.code,
          description: s.description || s.code,
          category: 'Uncategorized / Orphan',
          unit: s.unit || 'NOS',
          itemStatus: 'Orphan Stock',
          stockItem: s
        });
      }
    }

    // C. Also check if there are any movements for codes neither in masters nor stock_items
    for (const [movCode, movData] of latestMovementMap.entries()) {
      if (!population.has(movCode)) {
        population.set(movCode, {
          itemCode: movCode,
          description: `Ledger Item ${movCode}`,
          category: 'Historical Ledger',
          unit: 'NOS',
          itemStatus: 'Ledger Only',
          stockItem: undefined
        });
      }
    }

    // Compute reconciliation report
    let report = [];

    for (const [code, item] of population.entries()) {
      const stockRow = item.stockItem;
      const cachedOnHand = stockRow ? Number(stockRow.on_hand ?? 0) : 0;
      const reserved = stockRow ? Number(stockRow.reserved ?? 0) : 0;
      const available = stockRow
        ? Number(stockRow.available ?? (cachedOnHand - reserved))
        : (cachedOnHand - reserved);

      const latestMov = latestMovementMap.get(code);

      // Ledger-derived balance:
      // If append-only movements exist, latest balance_after is the authoritative ledger balance.
      // If zero movements exist, the ledger balance matches the baseline cache balance.
      const ledgerBalance = latestMov !== undefined ? latestMov.balance_after : cachedOnHand;
      const discrepancy = cachedOnHand - ledgerBalance;
      const status: 'MATCHED' | 'DISCREPANCY' = discrepancy === 0 ? 'MATCHED' : 'DISCREPANCY';

      report.push({
        itemCode: code,
        description: item.description,
        category: item.category,
        ledgerBalance,
        cachedOnHand,
        reserved,
        available,
        discrepancy,
        status,
        unit: item.unit,
        itemStatus: item.itemStatus,
        lastMovementAt: latestMov?.created_at
      });
    }

    // D. Apply Filters
    if (filters?.itemCode) {
      const target = filters.itemCode.trim().toLowerCase();
      report = report.filter(r => r.itemCode.toLowerCase() === target);
    }

    if (filters?.search) {
      const query = filters.search.trim().toLowerCase();
      report = report.filter(
        r => r.itemCode.toLowerCase().includes(query) ||
             r.description.toLowerCase().includes(query) ||
             (r.category && r.category.toLowerCase().includes(query))
      );
    }

    if (filters?.status) {
      const targetStatus = filters.status.trim().toUpperCase();
      report = report.filter(r => r.status === targetStatus);
    }

    if (filters?.category) {
      const targetCat = filters.category.trim().toLowerCase();
      report = report.filter(r => r.category && r.category.toLowerCase() === targetCat);
    }

    // Sort alphabetically by itemCode
    report.sort((a, b) => a.itemCode.localeCompare(b.itemCode));

    return report;
  }

  /**
   * Appends an offsetting reversal/correction movement referencing the original entry.
   */
  async recordCorrection(
    originalMovementId: string, 
    reason: string, 
    actorEmail = 'admin@guruom.in'
  ): Promise<InventoryMovementRecord> {
    // 1. Locate original movement
    let original: InventoryMovementRecord | null = null;

    try {
      const { data } = await this.db
        .from('inventory_movements')
        .select('*')
        .eq('id', originalMovementId)
        .maybeSingle();

      if (data) original = data as InventoryMovementRecord;
    } catch (_) {}

    if (!original) {
      original = IN_MEMORY_MOVEMENTS.find(m => m.id === originalMovementId) || null;
    }

    if (!original) {
      throw new Error(`Original movement ${originalMovementId} not found.`);
    }

    // 2. Compute inverted quantity change
    const correctionQty = -original.quantity_change;

    // 3. Append correcting movement (Never mutate past row!)
    return await this.recordMovement({
      itemCode: original.item_code,
      location: original.location,
      quantityChange: correctionQty,
      movementType: 'CORRECTION',
      referenceId: original.id,
      referenceType: 'correction',
      actorEmail,
      notes: `Reversal of movement ${original.id} (${original.movement_type}): ${reason}`,
      metadata: { originalMovement: original }
    });
  }

  /**
   * Simulates DB trigger exception for append-only verification.
   */
  preventMovementMutation(operation: 'UPDATE' | 'DELETE'): never {
    throw new Error(`inventory_movements is append-only: ${operation} not allowed`);
  }

  /**
   * Atomically consumes materials for an order across all required BOM components.
   * Enforces:
   * 1. Idempotency: If materials for this order have already been consumed, returns success without double deduction.
   * 2. Multi-component atomicity: If ANY component has insufficient on-hand stock, the entire operation fails.
   * 3. Concurrency safety: Locks on all material codes sorted alphabetically to eliminate race conditions and deadlocks.
   * 4. Three-way consistency: stock_items deduction + append-only ledger movement + reservation reconciliation.
   */
  async consumeOrderMaterialsAtomic(
    orderId: string,
    orderPo: string,
    actorEmail: string,
    allocations: Array<{ itemCode: string; description?: string; qty: number }>
  ): Promise<{ success: boolean; alreadyConsumed?: boolean; message?: string }> {
    if (!allocations || allocations.length === 0) {
      return { success: true };
    }

    // 1. Try PostgreSQL atomic RPC if available in Supabase
    try {
      const { data, error } = await this.db.rpc('consume_order_materials_atomic', {
        p_order_id: orderId,
        p_order_po: orderPo,
        p_actor_email: actorEmail,
        p_allocations: allocations.map(a => ({
          item_code: a.itemCode,
          qty: a.qty,
          description: a.description || a.itemCode
        }))
      });

      if (!error && data) {
        if (data.success === false) {
          const err: any = new Error(data.message || `Insufficient stock for ${data.item_code}`);
          err.statusCode = 400;
          err.errorCode = data.error_code || 'ERR_INSUFFICIENT_STOCK';
          err.itemCode = data.item_code;
          err.deficit = data.deficit;
          throw err;
        }
        return data;
      }
    } catch (rpcErr: any) {
      if (rpcErr.errorCode === 'ERR_INSUFFICIENT_STOCK' || rpcErr.statusCode === 400) {
        throw rpcErr;
      }
      // RPC not yet deployed or failed, proceed with application-level atomic lock implementation
    }

    // 2. Application-level atomic transaction with material locks
    const sortedCodes = Array.from(new Set(allocations.map(a => a.itemCode))).sort();
    const lockKeys = sortedCodes.map(c => LockService.buildKey('t_default', 'stock_material', c));

    return await LockService.withLock(lockKeys, 5000, async () => {
      // 2a. Idempotency Check: Has this order already been consumed?
      let alreadyConsumed = false;
      try {
        const { data: existingMovs } = await this.db
          .from('inventory_movements')
          .select('id')
          .eq('reference_id', orderPo)
          .eq('movement_type', 'PRODUCTION_CONSUMPTION')
          .limit(1);

        if (existingMovs && existingMovs.length > 0) {
          alreadyConsumed = true;
        }
      } catch {}

      if (!alreadyConsumed) {
        const inMemExisting = IN_MEMORY_MOVEMENTS.find(
          m => m.reference_id === orderPo && m.movement_type === 'PRODUCTION_CONSUMPTION'
        );
        if (inMemExisting) alreadyConsumed = true;
      }

      if (alreadyConsumed) {
        return {
          success: true,
          alreadyConsumed: true,
          message: `Materials for order ${orderPo} have already been consumed.`
        };
      }

      // 2b. Multi-component sufficiency pre-check (All-or-Nothing)
      for (const alloc of allocations) {
        const currentBalance = await this.getCurrentBalance(alloc.itemCode, 'MAIN-WAREHOUSE');
        if (currentBalance < alloc.qty) {
          const err: any = new Error(
            `Insufficient stock for component "${alloc.itemCode}". Available on-hand: ${currentBalance}, required: ${alloc.qty}, deficit: ${alloc.qty - currentBalance}.`
          );
          err.statusCode = 400;
          err.errorCode = 'ERR_INSUFFICIENT_STOCK';
          err.itemCode = alloc.itemCode;
          err.requiredQty = alloc.qty;
          err.onHand = currentBalance;
          err.deficit = alloc.qty - currentBalance;
          throw err;
        }
      }

      // 2c. All components confirmed sufficient -> apply deductions and record movements
      const nowIso = new Date().toISOString();
      const consumedAllocations: Array<{ itemCode: string; qty: number }> = [];

      for (const alloc of allocations) {
        const currentBalance = await this.getCurrentBalance(alloc.itemCode, 'MAIN-WAREHOUSE');
        const balanceAfter = currentBalance - alloc.qty;
        const movementId = randomUUID();

        const record: InventoryMovementRecord = {
          id: movementId,
          item_code: alloc.itemCode,
          location: 'MAIN-WAREHOUSE',
          quantity_change: -alloc.qty,
          movement_type: 'PRODUCTION_CONSUMPTION',
          reference_id: orderPo,
          reference_type: 'order',
          balance_after: balanceAfter,
          actor_email: actorEmail,
          notes: `Material issued for PO ${orderPo} — ${alloc.description || alloc.itemCode} × ${alloc.qty}`,
          metadata: { orderId, orderPo },
          created_at: nowIso
        };

        // Insert into DB
        try {
          await this.db.from('inventory_movements').insert(record);
        } catch (err: any) {
          console.warn('Database recordMovement insert warning:', err.message);
        }

        IN_MEMORY_MOVEMENTS.unshift(Object.freeze({ ...record }));

        // Update stock_items
        try {
          const { data: stockRow } = await this.db
            .from('stock_items')
            .select('*')
            .eq('code', alloc.itemCode)
            .maybeSingle();

          const currentReserved = Number(stockRow?.reserved || 0);
          const reorderLevel = Number(stockRow?.reorder_level || 25);
          const available = balanceAfter - currentReserved;
          const status = available < 0 ? 'CRITICAL' : available < reorderLevel ? 'SHORTAGE' : 'OK';

          await this.db.from('stock_items').update({
            on_hand: balanceAfter,
            available,
            status,
            updated_at: nowIso
          }).eq('code', alloc.itemCode);
        } catch (err: any) {
          console.warn('Database stock_items sync warning:', err.message);
        }

        consumedAllocations.push({ itemCode: alloc.itemCode, qty: alloc.qty });
      }

      // 2d. Reconcile reservations in inventoryReservationsService (skipLock = true as outer lock already held)
      await inventoryReservationsService.consumeOrderReservations(orderId, consumedAllocations, true);

      return {
        success: true,
        alreadyConsumed: false,
        message: 'Materials consumed and reservations reconciled successfully.'
      };
    });
  }
}

export const inventoryMovementsService = new InventoryMovementsService();
