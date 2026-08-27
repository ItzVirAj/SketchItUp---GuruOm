import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { DispatchChallanSchema, UpdateDispatchSchema, UpdateDispatchStatusSchema } from './dispatch.schema';
import { qcService } from '../qc/qc.service';
import { inventoryMovementsService } from '../inventory/inventory_movements.service';
import { notificationsService } from '../notifications/notifications.service';
import { ordersService } from '../orders/orders.service';
import { logAudit } from '../../services/auditLog';
import { getCurrentFinancialYear, formatDocumentNumber } from '../../../../src/utils/statutoryAccountingEngine';

const SEED_DISPATCHES: any[] = [];
const documentSequenceState: Record<string, number> = {};

export class DispatchService {
  private db = getDbClient();
  private idempotencyCache = new Map<string, { result: any; timestamp: number }>();
  private orderCreationLocks = new Map<string, Promise<any>>();

  /**
   * Generates next atomic document number in format CHL-[FY]-[0001]
   */
  async getNextDocumentNumber(seriesCode = 'CHL', prefix = 'CHL'): Promise<string> {
    const fy = getCurrentFinancialYear();
    const seqKey = `${seriesCode}-${fy}`;

    try {
      const { data, error } = await this.db.rpc('get_next_document_number', {
        p_series_code: seriesCode,
        p_prefix: prefix,
        p_fy: fy
      });

      if (!error && data) {
        return data as string;
      }
    } catch (err) {
      console.warn('DB getNextDocumentNumber fallback for dispatch:', err);
    }

    const current = (documentSequenceState[seqKey] || 0) + 1;
    documentSequenceState[seqKey] = current;
    return formatDocumentNumber(prefix, fy, current);
  }

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
        return data.map(d => {
          const memory = SEED_DISPATCHES.find(m => m.id === d.id || m.challanNo === d.challan_no);
          return {
            id: d.id,
            challanNo: d.challan_no,
            orderPo: d.order_po,
            status: d.status,
            date: d.date,
            transporter: d.transporter,
            vehicleNo: d.vehicle_no,
            lrNo: d.lr_no || memory?.lrNo,
            eWayBillNo: d.e_way_bill_no || memory?.eWayBillNo,
            driverContact: d.driver_contact || memory?.driverContact,
            remarks: d.remarks || memory?.remarks,
            linesCount: Number(d.lines_count || memory?.linesCount || 1),
            lines: memory?.lines || memory?.items || [],
            totalInvoiceValue: Number(d.total_invoice_value || memory?.totalInvoiceValue || 0),
            createdAt: d.created_at
          };
        });
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
        const memory = SEED_DISPATCHES.find(m => m.id === data.id || m.challanNo === data.challan_no);
        return {
          id: data.id,
          challanNo: data.challan_no,
          orderPo: data.order_po,
          status: data.status,
          date: data.date,
          transporter: data.transporter,
          vehicleNo: data.vehicle_no,
          lrNo: data.lr_no || memory?.lrNo,
          eWayBillNo: data.e_way_bill_no || memory?.eWayBillNo,
          driverContact: data.driver_contact || memory?.driverContact,
          remarks: data.remarks || memory?.remarks,
          linesCount: Number(data.lines_count || memory?.linesCount || 1),
          lines: memory?.lines || memory?.items || [],
          totalInvoiceValue: Number(data.total_invoice_value || memory?.totalInvoiceValue || 0),
          createdAt: data.created_at
        };
      }
    } catch (err) {
      console.warn('Database getDispatchByNo fallback:', err);
    }
    return SEED_DISPATCHES.find(d => d.id === challanNo || d.challanNo === challanNo) || null;
  }

  /**
   * Creates a Delivery Challan with full Idempotency protection, Concurrency Locking,
   * Dispatchable Quantity check, and Open-Draft reservation.
   */
  async createDispatch(data: z.infer<typeof DispatchChallanSchema>, actorEmail = 'dispatch@guruom.in') {
    const validated = DispatchChallanSchema.parse(data);

    // 1. Check Idempotency Key in Memory Cache (24h validity)
    if (validated.idempotencyKey && this.idempotencyCache.has(validated.idempotencyKey)) {
      const cached = this.idempotencyCache.get(validated.idempotencyKey)!;
      console.log(`[Idempotency] Returning cached dispatch creation for key: ${validated.idempotencyKey}`);
      return cached.result;
    }

    // 2. Concurrency Mutex Lock per orderPo to serialize near-simultaneous double clicks / API calls
    const lockKey = validated.orderPo;
    while (this.orderCreationLocks.has(lockKey)) {
      await this.orderCreationLocks.get(lockKey);
    }

    let releaseLock: () => void = () => {};
    const lockPromise = new Promise<void>(resolve => {
      releaseLock = resolve;
    });
    this.orderCreationLocks.set(lockKey, lockPromise);

    try {
      // 3. Quality Gatekeeper Eligibility Check
      const eligibility = await qcService.checkDispatchEligibility(validated.orderPo);
      if (!eligibility.eligible) {
        throw new Error(`Dispatch rejected by Quality Gatekeeper: ${eligibility.reasons.join(' ')}`);
      }

      // 4. Check for active duplicate draft or existing challan by idempotency key in DB
      try {
        if (validated.idempotencyKey) {
          const { data: existingByKey } = await this.db
            .from('dispatch_challans')
            .select('*')
            .eq('idempotency_key', validated.idempotencyKey)
            .maybeSingle();

          if (existingByKey) {
            const res = {
              id: existingByKey.id,
              challanNo: existingByKey.challan_no,
              orderPo: existingByKey.order_po,
              status: existingByKey.status,
              date: existingByKey.date,
              transporter: existingByKey.transporter,
              vehicleNo: existingByKey.vehicle_no,
              linesCount: Number(existingByKey.lines_count || 1)
            };
            this.idempotencyCache.set(validated.idempotencyKey, { result: res, timestamp: Date.now() });
            return res;
          }
        }
      } catch (_) {}

      // 5. Query Order & Pending Order Line Items
      let order: any = null;
      let orderLines: any[] = [];
      try {
        const { data: ord } = await this.db
          .from('customer_orders')
          .select('id, po_no, customer_name')
          .or(`id.eq.${validated.orderPo},po_no.eq.${validated.orderPo}`)
          .maybeSingle();
        order = ord;

        if (order?.id) {
          const { data: lines } = await this.db
            .from('order_line_items')
            .select('*')
            .eq('order_id', order.id);
          orderLines = lines || [];
        }
      } catch (_) {}

      // Fallback to in-memory order lookup if database returned empty
      if (!orderLines || orderLines.length === 0) {
        const memoryOrder = await ordersService.getOrderById(validated.orderPo);
        if (memoryOrder) {
          order = { id: memoryOrder.id, po_no: memoryOrder.poNo, customer_name: memoryOrder.customerName };
          orderLines = (memoryOrder.lines || []).map(l => ({
            id: l.id,
            item_code: l.itemCode,
            item_description: l.itemDescription || l.description,
            order_qty: l.orderQty,
            dispatched_qty: l.dispatchedQty || 0,
            rate: l.rate || l.unitPrice || 0
          }));
        }
      }

      // 6. Fetch existing non-cancelled challans to calculate reserved quantities in open drafts
      const existingChallans = await this.getDispatchesForOrder(validated.orderPo);
      const openDraftChallans = existingChallans.filter(
        c => ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(c.status) && c.challanNo !== validated.challanNo
      );

      const requestedLines = validated.lines || validated.items || (
        orderLines.length > 0 
          ? orderLines.map(l => ({
              itemCode: l.item_code,
              qty: Math.max(0, Number(l.order_qty || 0) - Number(l.dispatched_qty || 0))
            }))
          : []
      );

      // Check available dispatchable quantity per item
      for (const reqLine of requestedLines) {
        const matchingOrderLine = orderLines.find(l => l.item_code === reqLine.itemCode);
        if (matchingOrderLine) {
          const orderQty = Number(matchingOrderLine.order_qty || 0);
          const alreadyDispatched = Number(matchingOrderLine.dispatched_qty || 0);
          const pending = Math.max(0, orderQty - alreadyDispatched);

          // Calculate quantity already reserved by active draft challans
          let reservedInDrafts = 0;
          for (const draft of openDraftChallans) {
            const draftLine = (draft.lines || []).find((dl: any) => dl.itemCode === reqLine.itemCode);
            if (draftLine) {
              reservedInDrafts += Number(draftLine.qty || 0);
            }
          }

          const availableForNewChallan = Math.max(0, pending - reservedInDrafts);
          if (reqLine.qty > availableForNewChallan) {
            throw new Error(
              `Dispatchable Quantity Exceeded: Item "${reqLine.itemCode}" has only ${availableForNewChallan} units available (Pending: ${pending}, Reserved in open drafts: ${reservedInDrafts}). Cannot dispatch requested ${reqLine.qty}.`
            );
          }
        }
      }

      // 7. Resolve Unique Challan Number
      const challanId = validated.id || `chl-${Date.now()}`;
      let challanNo = validated.challanNo;

      if (challanNo) {
        try {
          const { data: existing } = await this.db
            .from('dispatch_challans')
            .select('id, challan_no, order_po, status')
            .eq('challan_no', challanNo)
            .maybeSingle();

          if (existing) {
            if (existing.order_po === validated.orderPo && ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(existing.status)) {
              console.log(`Challan ${challanNo} already exists for order ${validated.orderPo}, updating existing record.`);
              await this.db
                .from('dispatch_challans')
                .update({
                  transporter: validated.transporter,
                  vehicle_no: validated.vehicleNo,
                  status: validated.status || 'DISPATCH_READY',
                  date: validated.date,
                  lr_no: validated.lrNo,
                  e_way_bill_no: validated.eWayBillNo,
                  remarks: validated.remarks,
                  driver_contact: validated.driverContact
                })
                .eq('id', existing.id);

              const updatedRes = { id: existing.id, ...validated, challanNo };
              if (validated.idempotencyKey) {
                this.idempotencyCache.set(validated.idempotencyKey, { result: updatedRes, timestamp: Date.now() });
              }
              return updatedRes;
            } else {
              challanNo = await this.getNextDocumentNumber('CHL', 'CHL');
            }
          }
        } catch (_) {}
      } else {
        challanNo = await this.getNextDocumentNumber('CHL', 'CHL');
      }

      // 8. Insert Record
      let fullyDispatched = false;
      const isDraftOrReady = ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(validated.status || 'DISPATCHED');

      try {
        const insertData: any = {
          id: challanId,
          challan_no: challanNo,
          order_po: validated.orderPo,
          status: validated.status || 'DISPATCHED',
          date: validated.date,
          transporter: validated.transporter,
          vehicle_no: validated.vehicleNo,
          lines_count: validated.linesCount || requestedLines.length || 1,
          created_at: new Date().toISOString()
        };

        const { error } = await this.db.from('dispatch_challans').insert(insertData);

        if (error) {
          if (error.code === '23505') {
            console.warn(`Unique constraint 23505 on challan_no "${challanNo}". Generating fresh sequence...`);
            challanNo = await this.getNextDocumentNumber('CHL', 'CHL');
            insertData.challan_no = challanNo;
            const retry = await this.db.from('dispatch_challans').insert(insertData);
            if (retry.error && retry.error.code !== '23505') throw retry.error;
          } else {
            throw error;
          }
        }

        // If status is DISPATCHED, allocate lines immediately and update order lines & FG
        if (!isDraftOrReady) {
          const requestedByItem = new Map<string, number>(
            requestedLines.map(l => [l.itemCode, l.qty])
          );

          fullyDispatched = true;
          for (const line of orderLines) {
            const pending = Math.max(0, Number(line.order_qty || 0) - Number(line.dispatched_qty || 0));
            const dispatchQty = Math.min(pending, requestedByItem.get(line.item_code) ?? pending);
            if (dispatchQty <= 0) continue;

            const newDispatchedQty = Number(line.dispatched_qty || 0) + dispatchQty;
            if (newDispatchedQty < Number(line.order_qty || 0)) fullyDispatched = false;

            await this.db
              .from('order_line_items')
              .update({ dispatched_qty: newDispatchedQty })
              .eq('id', line.id);

            const { data: fgRows } = await this.db
              .from('finished_goods')
              .select('id, dispatched_qty')
              .eq('order_po', order?.po_no || validated.orderPo)
              .or(`part_code.eq.${line.item_code},item_code.eq.${line.item_code}`);
            const fg = (fgRows || [])[0];
            if (fg) {
              await this.db
                .from('finished_goods')
                .update({ dispatched_qty: Number(fg.dispatched_qty || 0) + dispatchQty })
                .eq('id', fg.id);
            }

            await inventoryMovementsService.recordMovement({
              itemCode: line.item_code,
              quantityChange: -dispatchQty,
              movementType: 'DISPATCH',
              referenceId: challanNo,
              referenceType: 'dispatch',
              actorEmail,
              notes: `Dispatch via ${validated.transporter} (PO #${validated.orderPo}, Challan #${challanNo})`
            }).catch(() => {});
          }

          const orderStatus = fullyDispatched ? 'DISPATCHED' : 'PARTIALLY_DISPATCHED';
          await this.db
            .from('customer_orders')
            .update({
              status: orderStatus,
              stage: orderStatus,
              delivery_challan_no: challanNo,
              transporter_name: validated.transporter,
              progress_step: 8,
              updated_at: new Date().toISOString()
            })
            .or(`id.eq.${validated.orderPo},po_no.eq.${validated.orderPo}`);
        } else {
          // In Draft / Ready status, set parent order to READY_TO_DISPATCH
          await this.db
            .from('customer_orders')
            .update({
              status: 'READY_TO_DISPATCH',
              stage: 'READY_TO_DISPATCH',
              delivery_challan_no: challanNo,
              transporter_name: validated.transporter,
              progress_step: 7,
              updated_at: new Date().toISOString()
            })
            .or(`id.eq.${validated.orderPo},po_no.eq.${validated.orderPo}`);
        }
      } catch (err) {
        console.warn('Database createDispatch fallback:', err);
      }

      const created = { 
        id: challanId, 
        ...validated, 
        challanNo,
        lines: requestedLines,
        items: requestedLines
      };
      SEED_DISPATCHES.unshift(created as any);

      // Save into idempotency cache
      if (validated.idempotencyKey) {
        this.idempotencyCache.set(validated.idempotencyKey, { result: created, timestamp: Date.now() });
      }

      // Synchronize in-memory order status
      if (!isDraftOrReady) {
        ordersService.updateOrderStageDirectly(validated.orderPo, fullyDispatched ? 'DISPATCHED' : 'PARTIALLY_DISPATCHED', 8);
      } else {
        ordersService.updateOrderStageDirectly(validated.orderPo, 'READY_TO_DISPATCH', 7);
      }

      await logAudit({
        actorEmail,
        action: isDraftOrReady ? 'DISPATCH_DRAFT_CREATED' : 'DISPATCH_CREATED',
        entityType: 'dispatch_challans',
        entityId: String(challanNo),
        afterState: { orderPo: validated.orderPo, transporter: validated.transporter, vehicleNo: validated.vehicleNo, linesCount: validated.linesCount, challanNo, status: validated.status },
        metadata: { details: `Challan ${challanNo} (${validated.status}) created for PO ${validated.orderPo} via ${validated.transporter}` }
      }).catch(() => {});

      notificationsService.broadcastEvent('dispatch_created', created);
      notificationsService.broadcastEvent('order_updated', {
        id: validated.orderPo,
        poNo: validated.orderPo,
        status: isDraftOrReady ? 'READY_TO_DISPATCH' : (fullyDispatched ? 'DISPATCHED' : 'PARTIALLY_DISPATCHED'),
        stage: isDraftOrReady ? 'READY_TO_DISPATCH' : (fullyDispatched ? 'DISPATCHED' : 'PARTIALLY_DISPATCHED'),
        deliveryChallanNo: challanNo,
        progressStep: isDraftOrReady ? 7 : 8
      });

      return created;
    } finally {
      this.orderCreationLocks.delete(lockKey);
      releaseLock();
    }
  }

  /**
   * Edit a Delivery Challan while in DRAFT status.
   * Dispatched/Delivered challans are permanently locked.
   */
  async updateDispatch(challanNo: string, data: z.infer<typeof UpdateDispatchSchema>, actorEmail = 'dispatch@guruom.in') {
    const updates = UpdateDispatchSchema.parse(data);
    const existing = await this.getDispatchByNo(challanNo);
    if (!existing) {
      throw new Error(`Delivery Challan ${challanNo} not found.`);
    }

    // IMMUTABILITY GATE: Only DRAFT, GENERATED, or DISPATCH_READY challans can be edited
    const isDraft = ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(existing.status);
    if (!isDraft) {
      throw new Error(
        `Immutability Gate Blocked: Challan "${challanNo}" has status "${existing.status}" and is permanently locked. Dispatched/Delivered challans cannot be edited. Please cancel and re-issue if corrections are required.`
      );
    }

    // If updating line quantities, validate against available dispatchable pool (excluding this challan)
    if (updates.lines || updates.items) {
      const newLines = updates.lines || updates.items || [];
      const orderDispatches = await this.getDispatchesForOrder(existing.orderPo);
      const otherDrafts = orderDispatches.filter(
        d => ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(d.status) && d.challanNo !== challanNo
      );

      const memoryOrder = await ordersService.getOrderById(existing.orderPo);
      if (memoryOrder?.lines) {
        for (const reqLine of newLines) {
          const matchingLine = memoryOrder.lines.find(l => l.itemCode === reqLine.itemCode);
          if (matchingLine) {
            const pending = Math.max(0, (matchingLine.orderQty || 0) - (matchingLine.dispatchedQty || 0));
            let reservedInOtherDrafts = 0;
            for (const d of otherDrafts) {
              const dl = (d.lines || []).find((line: any) => line.itemCode === reqLine.itemCode);
              if (dl) reservedInOtherDrafts += Number(dl.qty || 0);
            }
            const available = Math.max(0, pending - reservedInOtherDrafts);
            if (reqLine.qty > available) {
              throw new Error(
                `Dispatchable Quantity Exceeded: Item "${reqLine.itemCode}" has only ${available} available for dispatch. Cannot set quantity to ${reqLine.qty}.`
              );
            }
          }
        }
      }
    }

    const dbUpdate: any = {};
    if (updates.transporter) dbUpdate.transporter = updates.transporter;
    if (updates.vehicleNo) dbUpdate.vehicle_no = updates.vehicleNo;
    if (updates.lrNo !== undefined) dbUpdate.lr_no = updates.lrNo;
    if (updates.eWayBillNo !== undefined) dbUpdate.e_way_bill_no = updates.eWayBillNo;
    if (updates.driverContact !== undefined) dbUpdate.driver_contact = updates.driverContact;
    if (updates.remarks !== undefined) dbUpdate.remarks = updates.remarks;
    if (updates.date) dbUpdate.date = updates.date;
    if (updates.linesCount) dbUpdate.lines_count = updates.linesCount;
    if (updates.status) dbUpdate.status = updates.status;

    try {
      await this.db
        .from('dispatch_challans')
        .update(dbUpdate)
        .or(`id.eq.${challanNo},challan_no.eq.${challanNo}`);
    } catch (err) {
      console.warn('Database updateDispatch fallback:', err);
    }

    // Update in-memory seed
    const local = SEED_DISPATCHES.find(d => d.id === challanNo || d.challanNo === challanNo);
    if (local) {
      Object.assign(local, updates);
    }

    const updated = {
      ...existing,
      ...updates,
      challanNo: existing.challanNo
    };

    // If status transitioned to DISPATCHED in updateDispatch, sync order lines and status
    if (updates.status === 'DISPATCHED' && existing.orderPo) {
      try {
        const { data: orderRows } = await this.db
          .from('customer_orders')
          .select('id, po_no')
          .or(`id.eq.${existing.orderPo},po_no.eq.${existing.orderPo}`);
        const order = (orderRows || [])[0];

        if (order) {
          const { data: lines } = await this.db
            .from('order_line_items')
            .select('*')
            .eq('order_id', order.id);

          for (const l of lines || []) {
            const qtyToDispatch = Number(l.order_qty || 1);
            await this.db
              .from('order_line_items')
              .update({ dispatched_qty: qtyToDispatch })
              .eq('id', l.id);
          }

          await this.db
            .from('customer_orders')
            .update({
              status: 'DISPATCHED',
              stage: 'DISPATCHED',
              delivery_challan_no: challanNo,
              progress_step: 8,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);
        }

        ordersService.updateOrderStageDirectly(existing.orderPo, 'DISPATCHED', 8);
      } catch (e) {
        console.warn('Syncing order on dispatch update error:', e);
      }
    }

    await logAudit({
      actorEmail,
      action: 'DISPATCH_EDITED',
      entityType: 'dispatch_challans',
      entityId: String(challanNo),
      beforeState: existing,
      afterState: updated,
      metadata: { details: `Challan ${challanNo} updated in DRAFT state` }
    }).catch(() => {});

    notificationsService.broadcastEvent('dispatch_updated', updated);
    return updated;
  }

  async getDispatchesForOrder(orderPo: string): Promise<any[]> {
    try {
      const { data, error } = await this.db
        .from('dispatch_challans')
        .select('*')
        .eq('order_po', orderPo)
        .not('status', 'eq', 'CANCELLED');

      if (!error && data && data.length > 0) {
        return data.map(d => {
          const memory = SEED_DISPATCHES.find(m => m.challanNo === d.challan_no || m.id === d.id);
          return {
            id: d.id,
            challanNo: d.challan_no,
            orderPo: d.order_po,
            status: d.status,
            date: d.date,
            transporter: d.transporter,
            vehicleNo: d.vehicle_no,
            linesCount: Number(d.lines_count || 1),
            lines: memory?.lines || memory?.items || []
          };
        });
      }
    } catch (_) {}

    return SEED_DISPATCHES.filter(
      d => (d.orderPo === orderPo || d.orderId === orderPo) && d.status !== 'CANCELLED'
    );
  }

  /**
   * Calculates pending and available dispatchable quantities,
   * strictly subtracting quantities already reserved in open DRAFT / GENERATED / READY challans.
   */
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

      // Query order lines
      let order: any = null;
      let lines: any[] = [];

      try {
        const { data: ord } = await this.db
          .from('customer_orders')
          .select('*')
          .or(`id.eq.${orderPo},po_no.eq.${orderPo}`)
          .maybeSingle();
        order = ord;

        if (order?.id) {
          const { data: lns } = await this.db
            .from('order_line_items')
            .select('*')
            .eq('order_id', order.id);
          lines = lns || [];
        }
      } catch (_) {}

      if (!lines || lines.length === 0) {
        const memoryOrder = await ordersService.getOrderById(orderPo);
        if (memoryOrder?.lines) {
          lines = memoryOrder.lines.map(l => ({
            id: l.id,
            item_code: l.itemCode,
            item_description: l.itemDescription || l.description,
            order_qty: l.orderQty,
            dispatched_qty: l.dispatchedQty || 0
          }));
        }
      }

      // Fetch active draft challans for this order
      const existingChallans = await this.getDispatchesForOrder(orderPo);
      const openDrafts = existingChallans.filter(c => ['DRAFT', 'GENERATED', 'DISPATCH_READY'].includes(c.status));

      let hasAvailableQty = false;
      const dispatchableLines = (lines || []).map(l => {
        const orderQty = Number(l.order_qty || 0);
        const dispatchedQty = Number(l.dispatched_qty || 0);
        const pendingQty = Math.max(0, orderQty - dispatchedQty);

        let reservedInDrafts = 0;
        for (const draft of openDrafts) {
          const dl = (draft.lines || []).find((line: any) => line.itemCode === l.item_code);
          if (dl) {
            reservedInDrafts += Number(dl.qty || 0);
          }
        }

        const dispatchableQty = Math.max(0, pendingQty - reservedInDrafts);
        if (dispatchableQty > 0) hasAvailableQty = true;

        return {
          itemId: l.id,
          itemCode: l.item_code,
          itemDescription: l.item_description,
          orderQty,
          dispatchedQty,
          pendingQty,
          reservedInDrafts,
          dispatchableQty
        };
      });

      return {
        orderPo,
        eligible: hasAvailableQty,
        reasons: hasAvailableQty ? [] : ['All order quantities are already dispatched or reserved in active draft challans.'],
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

  async updateDispatchStatus(challanNo: string, data: z.infer<typeof UpdateDispatchStatusSchema>, actorEmail = 'dispatch@guruom.in') {
    const { status, reason } = UpdateDispatchStatusSchema.parse(data);

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

    if (status === 'DISPATCHED') {
      const challan = await this.getDispatchByNo(challanNo);
      if (challan && challan.orderPo) {
        try {
          const { data: orderRows } = await this.db
            .from('customer_orders')
            .select('id, po_no')
            .or(`id.eq.${challan.orderPo},po_no.eq.${challan.orderPo}`);
          const order = (orderRows || [])[0];

          if (order) {
            const { data: lines } = await this.db
              .from('order_line_items')
              .select('*')
              .eq('order_id', order.id);

            for (const l of lines || []) {
              const qtyToDispatch = Number(l.order_qty || 1);
              await this.db
                .from('order_line_items')
                .update({ dispatched_qty: qtyToDispatch })
                .eq('id', l.id);
            }

            await this.db
              .from('customer_orders')
              .update({
                status: 'DISPATCHED',
                stage: 'DISPATCHED',
                delivery_challan_no: challan.challanNo,
                progress_step: 8,
                updated_at: new Date().toISOString()
              })
              .eq('id', order.id);
          }

          ordersService.updateOrderStageDirectly(challan.orderPo, 'DISPATCHED', 8);
        } catch (e) {
          console.warn('Syncing order on updateDispatchStatus to DISPATCHED error:', e);
        }
      }
    }

    if (status === 'DELIVERED') {
      const challan = await this.getDispatchByNo(challanNo);
      if (challan && challan.orderPo) {
        try {
          const { data: orderRows } = await this.db
            .from('customer_orders')
            .select('id, po_no')
            .or(`id.eq.${challan.orderPo},po_no.eq.${challan.orderPo}`);
          const order = (orderRows || [])[0];

          if (order) {
            await this.db
              .from('customer_orders')
              .update({
                status: 'DELIVERED',
                stage: 'DELIVERED',
                pod_received_date: new Date().toISOString().split('T')[0],
                pod_document_url: challan.podDocumentUrl || 'POD-VERIFIED-PHYSICAL',
                progress_step: 9,
                updated_at: new Date().toISOString()
              })
              .eq('id', order.id);
          }

          ordersService.updateOrderStageDirectly(challan.orderPo, 'DELIVERED', 9);
        } catch (e) {
          console.warn('Syncing order on updateDispatchStatus to DELIVERED error:', e);
        }
      }
    }

    await logAudit({
      actorEmail,
      action: status === 'CANCELLED' ? 'DISPATCH_CANCELLED' : 'DISPATCH_STATUS_UPDATED',
      entityType: 'dispatch_challans',
      entityId: String(challanNo),
      afterState: { challanNo, status, reason },
      metadata: { details: `Challan ${challanNo} transitioned to status ${status}${reason ? ` (${reason})` : ''}` }
    }).catch(() => {});

    notificationsService.broadcastEvent('dispatch_updated', { challanNo, status });
    return { challanNo, status };
  }

  async dispatchChallan(challanNo: string, actorEmail = 'dispatch@guruom.in') {
    return this.updateDispatchStatus(challanNo, { status: 'DISPATCHED' }, actorEmail);
  }

  async deliverChallan(challanNo: string, actorEmail = 'dispatch@guruom.in') {
    return this.updateDispatchStatus(challanNo, { status: 'DELIVERED' }, actorEmail);
  }

  async cancelChallan(challanNo: string, reason = 'Cancelled by user', actorEmail = 'dispatch@guruom.in') {
    return this.updateDispatchStatus(challanNo, { status: 'CANCELLED', reason }, actorEmail);
  }

  /**
   * Cleans redundant duplicate challans for the same order without hard-deleting records.
   */
  async cleanDuplicateChallans() {
    const dispatches = await this.getDispatches();
    const seenMap = new Map<string, any>();
    const duplicatesCancelled: string[] = [];

    for (const d of dispatches) {
      if (d.status === 'CANCELLED') continue;
      const key = `${d.orderPo}_${d.vehicleNo}_${d.transporter}_${d.date}`;
      if (seenMap.has(key)) {
        // Redundant duplicate found - mark as CANCELLED with reason
        await this.cancelChallan(d.challanNo, 'Auto-cancelled redundant duplicate delivery challan');
        duplicatesCancelled.push(d.challanNo);
      } else {
        seenMap.set(key, d);
      }
    }

    return { success: true, duplicatesCancelled };
  }

  async printChallan(challanNo: string) {
    const challan = await this.getDispatchByNo(challanNo);
    if (!challan) throw new Error(`Challan ${challanNo} not found`);

    let orderInfo: any = null;
    try {
      orderInfo = await ordersService.getOrderById(challan.orderPo);
    } catch (_) {}

    return {
      ...challan,
      template: 'STANDARD_DELIVERY_CHALLAN_GST_V1',
      companyHeader: {
        legalName: 'GURU OM PRECISION ENGINEERING PVT. LTD.',
        factoryAddress: 'Plot No. W-45, MIDC Industrial Area, Waluj, Chhatrapati Sambhaji Nagar, Maharashtra 431136',
        gstin: '27AABCG1234F1Z5',
        state: 'Maharashtra (Code 27)',
        email: 'dispatch@guruom.in',
        phone: '+91 240 255 4321'
      },
      consignee: {
        customerName: orderInfo?.customerName || 'Consignee Entity Ltd',
        shippingAddress: orderInfo?.shippingAddress || 'Plot 12, Industrial Area, Pune 411018, Maharashtra',
        gstin: orderInfo?.customerGstin || '27AABCT1234F1Z8',
        state: 'Maharashtra (27)'
      },
      orderReference: {
        poNo: challan.orderPo,
        orderDate: orderInfo?.orderDate || challan.date
      },
      transport: {
        transporter: challan.transporter,
        vehicleNo: challan.vehicleNo,
        lrNo: challan.lrNo || '—',
        eWayBillNo: challan.eWayBillNo || '—',
        driverContact: challan.driverContact || '—'
      },
      items: orderInfo?.lines?.map((l: any, idx: number) => ({
        srNo: idx + 1,
        itemCode: l.itemCode,
        itemDescription: l.itemDescription || l.description || 'Precision Machined Component',
        hsnCode: l.hsnCode || '84834000',
        qty: l.dispatchedQty || l.orderQty || 1,
        unit: l.unit || 'NOS'
      })) || [
        {
          srNo: 1,
          itemCode: 'PART-001',
          itemDescription: 'Machined Components',
          hsnCode: '84834000',
          qty: 100,
          unit: 'NOS'
        }
      ],
      statutoryDeclaration: 'Goods dispatched for industrial manufacturing / delivery under GST Rule 55. Not a Tax Invoice.',
      terms: [
        '1. Consignment must be verified upon delivery against the attached inspection report.',
        '2. Any transit damage or discrepancy must be reported within 24 hours of delivery.'
      ]
    };
  }
}

export const dispatchService = new DispatchService();

