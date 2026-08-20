import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { CustomerOrderSchema, UpdateOrderStatusSchema, OrderAmendmentSchema } from './orders.schema';
import { auditService } from '../audit/audit.service';
import { 
  orderStateMachineService 
} from './orders.state-machine';
import { 
  OrderStage, 
  ORDER_STAGE_STEPS, 
  StateMachineContext,
  normalizeOrderState,
  ORDER_ERROR_CODES 
} from '../../../../src/utils/orderStateMachine';
import { notificationsService } from '../notifications/notifications.service';
import { bomService } from '../bom/bom.service';
import { inventoryService } from '../inventory/inventory.service';
import { LockService } from '../../lib/lock';
import { logAudit } from '../../services/auditLog';



export function isTestOrderPo(poNo?: string): boolean {
  if (!poNo) return false;
  return poNo.startsWith('PO-GOLDEN-') ||
         poNo.startsWith('PO-TEST-REG-') ||
         poNo.startsWith('PO-PERSIST-') ||
         poNo.startsWith('PO-TATA-') ||
         poNo.startsWith('PO-TEST-') ||
         poNo.startsWith('PO-PROC-') ||
         poNo.startsWith('__TEST__') ||
         poNo.includes('615144') ||
         poNo.includes('678480');
}

export class OrdersService {
  private db = getDbClient();

  /**
   * Fetches all customer orders with line items, job cards, dispatches, and gate statuses.
   */
  async getOrders(options?: { includeTest?: boolean }) {
    const shouldIncludeTest = options?.includeTest === true || process.env.NODE_ENV === 'test';
    try {
      let query = this.db
        .from('customer_orders')
        .select('*');

      if (!shouldIncludeTest) {
        query = query
          .not('po_no', 'like', 'PO-GOLDEN-%')
          .not('po_no', 'like', 'PO-TEST-REG-%')
          .not('po_no', 'like', 'PO-PERSIST-%')
          .not('po_no', 'like', 'PO-TATA-%')
          .not('po_no', 'like', 'PO-TEST-%')
          .not('po_no', 'like', 'PO-PROC-%')
          .not('po_no', 'like', '__TEST__%');
      }

      const { data: ordersData, error: ordersErr } = await query.order('created_at', { ascending: false });

      const finalOrdersData = shouldIncludeTest 
        ? (ordersData || []) 
        : (ordersData || []).filter(o => !isTestOrderPo(o.po_no));

      if (!ordersErr && finalOrdersData.length > 0) {
        const { data: linesData } = await this.db.from('order_line_items').select('*');
        const { data: jobsData } = await this.db.from('job_cards').select('*');
        const { data: dispatchesData } = await this.db.from('dispatch_challans').select('*');
        const { data: ncrsData } = await this.db.from('ncrs').select('*').in('status', ['OPEN', 'UNDER_REVIEW', 'REWORK_PLANNED']);

        const combined = finalOrdersData.map(o => {
          const lines = (linesData || []).filter(l => l.order_id === o.id).map(l => ({
            id: l.id,
            itemCode: l.item_code,
            itemDescription: l.item_description,
            custPartNo: l.cust_part_no || '',
            orderQty: Number(l.order_qty || 0),
            unit: l.unit || 'NOS',
            dispatchedQty: Number(l.dispatched_qty || 0),
            pendingQty: Number(l.pending_qty ?? l.order_qty),
            rate: Number(l.rate || 0),
            drawingRevision: l.drawing_revision || o.drawing_revision || 'REV-A'
          }));

          const jobCards = (jobsData || []).filter(j => j.order_po === o.po_no).map(j => ({
            jobNo: j.job_no,
            qty: Number(j.qty || 0),
            targetDate: j.target_date,
            status: j.status
          }));

          const dispatches = (dispatchesData || []).filter(d => d.order_po === o.po_no).map(d => ({
            challanNo: d.challan_no,
            items: `Challan for PO ${d.order_po}`,
            date: d.date,
            status: d.status
          }));

          const openNcrs = (ncrsData || []).filter(n => n.order_po === o.po_no || n.order_id === o.id);

          return {
            id: o.id,
            poNo: o.po_no,
            customerName: o.customer_name,
            poDate: o.po_date,
            deliveryDate: o.delivery_date,
            status: o.status,
            stage: (o.status as OrderStage) || 'PO_RECEIVED',
            progressStep: o.progress_step || ORDER_STAGE_STEPS[o.status as OrderStage] || 1,
            grossAmount: Number(o.gross_amount || 0),
            taxCategory: o.tax_category || 'GST 18%',
            remark: o.remark || '',
            clientPoFile: o.client_po_file || undefined,
            subType: o.sub_type || 'FRESH_PO',
            blanketPoId: o.blanket_po_id,
            blanketPoBalance: Number(o.blanket_po_balance_qty || 0),
            drawingRevision: o.drawing_revision || 'REV-A',
            masterDrawingRevision: o.master_drawing_revision || 'REV-A',
            isDrawingRevisionMatched: (o.drawing_revision || 'REV-A') === (o.master_drawing_revision || 'REV-A'),
            heatLotNumber: o.heat_lot_number,
            hasOpenNcr: openNcrs.length > 0 || o.has_open_ncr || false,
            openNcrNumbers: openNcrs.map(n => n.ncr_number),
            isCustomerOnCreditHold: o.is_credit_held || false,
            creditHoldOverrideBy: o.credit_override_by,
            creditHoldOverrideReason: o.credit_override_reason,
            priceAmendmentStatus: o.price_amendment_status,
            purchaseRequisitionNo: o.purchase_requisition_no,
            lines,
            jobCards,
            dispatches,
            createdAt: o.created_at
          };
        });

        // Default global sort: newest orders first (created_at / poDate DESC)
        combined.sort((a, b) => {
          const timeB = new Date(b.createdAt || b.poDate || 0).getTime();
          const timeA = new Date(a.createdAt || a.poDate || 0).getTime();
          if (timeB !== timeA) return timeB - timeA;
          return String(b.id || b.poNo).localeCompare(String(a.id || a.poNo));
        });

        return combined;
      }
    } catch (err) {
      console.warn('Database getOrders error:', err);
    }

    return [];
  }

  /**
   * Directly synchronizes order status across micro-services during real-time stage progression.
   */
  async updateOrderStageDirectly(orderPoOrId: string, stage: OrderStage, progressStep?: number) {
    const step = progressStep || ORDER_STAGE_STEPS[stage] || 1;
    try {
      const payload: any = { status: stage, progress_step: step, updated_at: new Date().toISOString() };
      await this.db.from('customer_orders').update(payload).or(`id.eq.${orderPoOrId},po_no.eq.${orderPoOrId}`);
    } catch (err) {
      console.warn('Database updateOrderStageDirectly error:', err);
    }

    // Real-Time Push: Broadcast stage transition across all dashboards
    notificationsService.broadcastEvent('order_transitioned', {
      orderId: orderPoOrId,
      poNo: orderPoOrId,
      status: stage,
      stage,
      progressStep: step,
      updatedAt: new Date().toISOString()
    });
    notificationsService.broadcastEvent('order_updated', {
      id: orderPoOrId,
      poNo: orderPoOrId,
      status: stage,
      stage,
      progressStep: step,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Fetches a single customer order by ID with full traceability.
   */
  async getOrderById(orderId: string) {
    const orders = await this.getOrders({ includeTest: true });
    return orders.find(o => o.id === orderId || o.poNo === orderId) || null;
  }


  /**
   * Updates an existing customer order.
   * Hard Gate: Rejects edits to commercial/technical fields (customer, poNo, part, revision, qty, rate, tax, delivery date)
   * if the order is in or past APPROVED/RELEASED stage. Only remarks and notes are editable directly.
   */
  async updateOrder(orderId: string, updateData: any, actorContext?: { role?: string; name?: string }) {
    const order = await this.getOrderById(orderId);
    if (!order) {
      const err: any = new Error(`Order ${orderId} not found`);
      err.statusCode = 404;
      throw err;
    }

    const currentStage = (order.stage || order.status || 'DRAFT') as string;
    const normalized = normalizeOrderState(currentStage);

    // Hard Gate: Rejects direct mutation of workflow-controlled fields outside transition endpoints
    const FORBIDDEN_DIRECT_MUTATIONS = [
      'status', 'stage', 'progressStep', 'progress_step', 
      'dispatchedQty', 'dispatched_qty', 'hasOpenNcr', 'has_open_ncr',
      'qcStatus', 'pdiStatus'
    ];
    for (const forbidden of FORBIDDEN_DIRECT_MUTATIONS) {
      if (updateData[forbidden] !== undefined && updateData[forbidden] !== (order as any)[forbidden]) {
        const err: any = new Error(`Direct mutation of workflow state field '${forbidden}' is prohibited. Stage transitions must be executed through designated transition endpoints.`);
        err.errorCode = 'ERR_DIRECT_WORKFLOW_MUTATION_PROHIBITED';
        err.statusCode = 400;
        throw err;
      }
    }

    const LOCKED_STAGES = [
      'APPROVED', 'RELEASED', 'MATERIAL_CHECK', 'MATERIAL_READY', 
      'PROCUREMENT_PENDING', 'GRN', 'JOB_RELEASED', 'IN_PRODUCTION', 
      'QC', 'QC_HOLD', 'PDI', 'PDI_HOLD', 'READY_FOR_DISPATCH', 
      'DISPATCHED', 'INVOICED', 'COMPLETED'
    ];

    if (LOCKED_STAGES.includes(normalized) || LOCKED_STAGES.includes(currentStage)) {
      const lockedKeys = [
        'customerName', 'poNo', 'drawingRevision', 'masterDrawingRevision', 
        'grossAmount', 'taxCategory', 'deliveryDate', 'subType', 'lines'
      ];

      for (const key of lockedKeys) {
        if (updateData[key] !== undefined && updateData[key] !== (order as any)[key]) {
          if (key === 'lines' && JSON.stringify(updateData.lines) === JSON.stringify(order.lines)) {
            continue;
          }
          const err: any = new Error(`Field '${key}' is locked after order approval (${currentStage}). Modifications to approved orders require the formal amendment and revision workflow.`);
          err.errorCode = ORDER_ERROR_CODES.ERR_FIELD_LOCKED_AFTER_APPROVAL;
          err.statusCode = 400;
          throw err;
        }
      }
    }

    const updatedOrder = {
      ...order,
      ...updateData,
      status: order.status,
      stage: order.stage,
      progressStep: order.progressStep,
      remark: updateData.remark !== undefined ? updateData.remark : order.remark
    };

    try {
      const updatePayload: any = {
        gross_amount: updateData.grossAmount !== undefined ? updateData.grossAmount : order.grossAmount,
        delivery_date: updateData.deliveryDate || order.deliveryDate,
        tax_category: updateData.taxCategory || order.taxCategory,
        remark: updateData.remark !== undefined ? updateData.remark : order.remark,
        updated_at: new Date().toISOString()
      };
      if (order.id) {
        const { error: uErr } = await this.db.from('customer_orders').update(updatePayload).eq('id', order.id);
        if (uErr) console.error('Database updateOrder error:', uErr);
      } else if (order.poNo) {
        const { error: uErr } = await this.db.from('customer_orders').update(updatePayload).eq('po_no', order.poNo);
        if (uErr) console.error('Database updateOrder error:', uErr);
      }
    } catch (dbErr) {
      console.warn('DB updateOrder fallback:', dbErr);
    }

    await auditService.recordAuditLog({
      actorEmail: actorContext?.name || 'System User',
      actorRole: actorContext?.role || 'Production Planner',
      action: 'ORDER_UPDATED',
      entityType: 'customer_orders',
      entityId: order.id,
      details: `Order ${order.poNo} details updated (Stage: ${currentStage})`
    }).catch(() => {});

    // Real-time Push: Broadcast updated order
    notificationsService.broadcastEvent('order_updated', updatedOrder);

    return updatedOrder;
  }

  /**
   * Automatically executes BOM explosion & material availability check for an order against live stock.
   */
  async checkAndReserveMaterialsForOrder(order: any, actorName = 'System Material Auto-Checker'): Promise<{ ready: boolean; shortages?: any[] }> {
    let hasShortage = false;
    const shortagesList: any[] = [];
    const requiredStockAllocations: { code: string; qty: number }[] = [];

    const lines = order.lines && order.lines.length > 0 ? order.lines : [
      { itemCode: order.partCode || 'PART-001', itemDescription: 'Manufactured Item', orderQty: 1 }
    ];

    for (const line of lines) {
      const itemCode = line.itemCode || line.code || 'PART-001';
      const orderQty = Number(line.orderQty || 1);
      const bom = await bomService.getBOMByCode(itemCode);

      if (bom && bom.components && bom.components.length > 0) {
        for (const comp of bom.components) {
          const requiredQty = Number(comp.qtyPerUnit || 1) * orderQty;
          const stockItem = await inventoryService.getStockItem(comp.componentCode);
          const available = Number(stockItem.available ?? stockItem.onHand ?? 0);

          if (available < requiredQty) {
            hasShortage = true;
            shortagesList.push({
              componentCode: comp.componentCode,
              componentName: comp.componentName,
              requiredQty,
              available,
              deficit: requiredQty - available
            });
          } else {
            requiredStockAllocations.push({ code: comp.componentCode, qty: requiredQty });
          }
        }
      } else {
        // Direct stock item check
        const stockItem = await inventoryService.getStockItem(itemCode);
        const available = Number(stockItem.available ?? stockItem.onHand ?? 0);

        if (available < orderQty) {
          hasShortage = true;
          shortagesList.push({
            componentCode: itemCode,
            componentName: line.itemDescription || itemCode,
            requiredQty: orderQty,
            available,
            deficit: orderQty - available
          });
        } else {
          requiredStockAllocations.push({ code: itemCode, qty: orderQty });
        }
      }
    }

    if (hasShortage) {
      for (const sh of shortagesList) {
        try {
          await this.db.from('purchase_requisitions').insert({
            id: `pr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            req_number: `PR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
            order_id: order.id,
            order_po: order.poNo,
            item_code: sh.componentCode,
            item_description: `Raw material for ${order.poNo}`,
            required_qty: sh.requiredQty,
            available_stock: sh.available,
            deficit_qty: sh.deficit,
            status: 'AUTO_GENERATED',
            created_by: actorName
          });
        } catch (_) {}
      }
      return { ready: false, shortages: shortagesList };
    } else {
      // Stock is available -> reserve stock for order
      for (const alloc of requiredStockAllocations) {
        await inventoryService.reserveStock(alloc.code, alloc.qty);
      }
      return { ready: true };
    }
  }

  /**
   * Re-evaluates material availability across all waiting orders (e.g. after a GRN is saved).
   * Automatically flips eligible orders from MATERIAL_SHORT / PROCUREMENT_PENDING to MATERIAL_READY.
   */
  async recheckMaterialAvailabilityForWaitingOrders(itemCode?: string): Promise<string[]> {
    const allOrders = await this.getOrders();
    const WAITING_STAGES = ['MATERIAL_SHORT', 'PROCUREMENT_PENDING', 'MATERIAL_CHECK', 'PENDING_VERIFICATION', 'CONFIRMED', 'APPROVED'];
    const waitingOrders = allOrders.filter(o => {
      const st = String(o.status || o.stage || '').toUpperCase();
      return WAITING_STAGES.includes(st);
    });

    const newlyReadyOrders: string[] = [];

    for (const order of waitingOrders) {
      const check = await this.checkAndReserveMaterialsForOrder(order);
      if (check.ready) {
        const orderId = order.id || order.poNo;
        try {
          await this.db
            .from('customer_orders')
            .update({
              status: 'MATERIAL_READY',
              progress_step: 4,
              updated_at: new Date().toISOString()
            })
            .or(`id.eq.${orderId},po_no.eq.${order.poNo}`);
        } catch (dbErr) {
          console.warn('DB recheckMaterial update fallback:', dbErr);
        }

        newlyReadyOrders.push(order.poNo);

        // Real-Time Push: Broadcast automatic advancement to MATERIAL_READY
        notificationsService.broadcastEvent('order_updated', {
          id: order.id,
          poNo: order.poNo,
          status: 'MATERIAL_READY',
          stage: 'MATERIAL_READY',
          progressStep: 4
        });
      }
    }

    return newlyReadyOrders;
  }

  /**
   * Creates a new customer order after validating drawing revision match and customer credit gates.
   */
  async createOrder(data: z.infer<typeof CustomerOrderSchema>, actorContext?: { role?: string; name?: string }) {
    const validated = CustomerOrderSchema.parse(data);
    const orderId = validated.id || `ord-${Date.now()}`;
    const primaryPartCode = validated.lines[0]?.itemCode || 'PART-001';
    const primaryDrawingRev = validated.drawingRevision || validated.lines[0]?.drawingRevision || 'REV-A';

    // 1. Run State Machine Gate Validation for Step 1 (PO_RECEIVED)
    const transitionContext: StateMachineContext = {
      orderId,
      poNo: validated.poNo,
      subType: validated.subType as any,
      currentStage: 'PO_RECEIVED',
      targetStage: 'PO_RECEIVED',
      actorRole: actorContext?.role || 'Sales/Order Desk',
      actorName: actorContext?.name || 'Sales Desk User',
      orderDrawingRevision: primaryDrawingRev,
      masterDrawingRevision: validated.masterDrawingRevision || '',
      partCode: primaryPartCode,
      customerName: validated.customerName,
      isCustomerOverdue90Days: undefined as any,
      creditHoldOverrideBy: validated.creditHoldOverrideBy,
      creditHoldOverrideReason: validated.creditHoldOverrideReason,
      blanketPoBalanceQty: validated.blanketPoBalance,
      orderQty: validated.lines.reduce((sum, l) => sum + (l.orderQty || 0), 0)
    };

    const validation = await orderStateMachineService.validateAndExecuteTransition(transitionContext);

    if (!validation.valid) {
      const err: any = new Error(validation.errorMessage);
      err.errorCode = validation.errorCode;
      err.statusCode = 400;
      throw err;
    }

    const newOrder = {
      id: orderId,
      poNo: validated.poNo,
      customerName: validated.customerName,
      poDate: validated.poDate,
      deliveryDate: validated.deliveryDate,
      status: validated.status || 'PO_RECEIVED',
      stage: (validated.status as OrderStage) || 'PO_RECEIVED',
      progressStep: 1,
      grossAmount: validated.grossAmount,
      taxCategory: validated.taxCategory || 'GST 18%',
      remark: validated.remark || '',
      clientPoFile: validated.clientPoFile,
      subType: validated.subType || 'FRESH_PO',
      blanketPoId: validated.blanketPoId,
      blanketPoBalance: Number(validated.blanketPoBalance || 0),
      drawingRevision: primaryDrawingRev,
      masterDrawingRevision: transitionContext.masterDrawingRevision || 'REV-A',
      isDrawingRevisionMatched: true,
      hasOpenNcr: false,
      openNcrNumbers: [],
      isCustomerOnCreditHold: false,
      lines: (validated.lines || []).map((l, idx) => ({
        id: l.id || `line-${Date.now()}-${idx}`,
        itemCode: l.itemCode,
        itemDescription: l.itemDescription,
        custPartNo: l.custPartNo || '',
        orderQty: l.orderQty,
        unit: l.unit || 'NOS',
        rate: l.rate,
        dispatchedQty: 0,
        pendingQty: l.orderQty,
        drawingRevision: l.drawingRevision || primaryDrawingRev
      })),
      jobCards: [],
      dispatches: []
    };

    const insertPayload = {
      id: orderId,
      po_no: validated.poNo,
      customer_name: validated.customerName,
      po_date: validated.poDate,
      delivery_date: validated.deliveryDate,
      status: validated.status || 'PO_RECEIVED',
      progress_step: 1,
      gross_amount: validated.grossAmount,
      tax_category: validated.taxCategory || 'GST 18%',
      remark: validated.remark || ''
    };

    try {
      const { error: insertErr } = await this.db.from('customer_orders').insert(insertPayload);
      if (insertErr) {
        console.error('Database createOrder error:', insertErr);
      }

      if (validated.lines && validated.lines.length > 0) {
        const linePayloads = validated.lines.map((l, idx) => ({
          id: l.id ? `${orderId}-${l.id}` : `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${idx}`,
          order_id: orderId,
          item_code: l.itemCode,
          item_description: l.itemDescription,
          cust_part_no: l.custPartNo || null,
          order_qty: l.orderQty,
          unit: l.unit || 'NOS',
          rate: l.rate,
          dispatched_qty: 0,
          pending_qty: l.orderQty
        }));
        const { error: linesErr } = await this.db.from('order_line_items').insert(linePayloads);
        if (linesErr) {
          console.error('Database order_line_items insert error:', linesErr);
        }
      }
    } catch (dbErr) {
      console.warn('Database createOrder exception:', dbErr);
    }

    // Real-Time Push: Broadcast order creation to all dashboards
    notificationsService.broadcastEvent('order_created', newOrder);

    await logAudit({
      actorEmail: typeof actorContext === 'string' ? actorContext : (actorContext?.name || 'sales@guruom.in'),
      action: 'CREATE_ORDER',
      entityType: 'order',
      entityId: validated.poNo,
      afterState: { grossAmount: validated.grossAmount, linesCount: validated.lines?.length || 0 }
    }).catch(() => {});

    return {
      ...newOrder,
      autoActions: validation.autoActionsTriggered
    };

  }

  /**
   * Transitions an order across state machine stages with strict gate enforcement,
   * optimistic concurrency checks, automated BOM material availability checks, and real-time SSE broadcasts.
   */
  async transitionOrderStage(
    orderId: string, 
    targetStage: OrderStage, 
    payload: {
      heatLotNumber?: string;
      creditHoldOverrideBy?: string;
      creditHoldOverrideReason?: string;
      invoiceOverrideReason?: string;
      invoicedQty?: number;
      dispatchedQty?: number;
      requiredMaterialQty?: number;
      availableStockQty?: number;
      expectedUpdatedAt?: string;
    } = {},
    actorContext?: { role?: string; name?: string }
  ) {
    const lockKey = LockService.buildKey('t_default', 'order', orderId);

    return await LockService.withLock(lockKey, 5000, async () => {
      const order = await this.getOrderById(orderId);
      if (!order) {
        const err: any = new Error(`Order ${orderId} not found`);
        err.statusCode = 404;
        throw err;
      }

      // Optimistic concurrency verification
      LockService.verifyOptimisticVersion(order.updatedAt || order.created_at, payload.expectedUpdatedAt, `Order ${order.poNo}`);

      let resolvedTargetStage: OrderStage = typeof targetStage === 'string' 
        ? targetStage 
        : ((targetStage as any)?.targetStage || (targetStage as any)?.stage || (targetStage as any)?.status || 'CONFIRMED');
      const effectivePayload = typeof targetStage === 'object' && targetStage !== null 
        ? { ...targetStage, ...payload } 
        : payload;

      const currentStage = (order.stage || order.status || 'PO_RECEIVED') as OrderStage;

      const transitionContext: StateMachineContext = {
        orderId: order.id,
        poNo: order.poNo,
        subType: (order.subType as any) || 'FRESH_PO',
        currentStage,
        targetStage: resolvedTargetStage,
        actorRole: actorContext?.role || 'Production Planner',
        actorName: actorContext?.name || 'Authorized User',
        orderDrawingRevision: order.drawingRevision,
        masterDrawingRevision: order.masterDrawingRevision || '',
        partCode: order.lines[0]?.itemCode || 'PART-001',
        customerName: order.customerName,
        isCustomerOverdue90Days: undefined as any,
        creditHoldOverrideBy: payload.creditHoldOverrideBy || order.creditHoldOverrideBy,
        creditHoldOverrideReason: payload.creditHoldOverrideReason || order.creditHoldOverrideReason,
        heatLotNumber: payload.heatLotNumber || order.heatLotNumber,
        dispatchedQty: payload.dispatchedQty ?? order.lines.reduce((s, l) => s + (l.dispatchedQty || 0), 0),
        invoicedQty: payload.invoicedQty ?? payload.dispatchedQty,
        invoiceOverrideReason: payload.invoiceOverrideReason,
        requiredMaterialQty: payload.requiredMaterialQty,
        availableStockQty: payload.availableStockQty
      };

      const validation = await orderStateMachineService.validateAndExecuteTransition(transitionContext);

      if (!validation.valid) {
        const err: any = new Error(validation.errorMessage);
        err.errorCode = validation.errorCode;
        err.statusCode = 400;
        throw err;
      }

      let nextStep = ORDER_STAGE_STEPS[resolvedTargetStage] || 1;

      // AUTOMATED SYSTEM TRIGGER: Order Confirmed -> Automatic BOM Check against live stock
      if (resolvedTargetStage === 'CONFIRMED' || resolvedTargetStage === 'APPROVED') {
        const matCheck = await this.checkAndReserveMaterialsForOrder(order, actorContext?.name);
        if (matCheck.ready) {
          notificationsService.broadcastEvent('stock_updated', { orderPo: order.poNo, status: 'RESERVED' });
        } else {
          notificationsService.broadcastEvent('shortage_updated', { orderPo: order.poNo, shortages: matCheck.shortages });
        }
      }

      const updatedAt = new Date().toISOString();

      try {
        const transitionPayload: any = {
          status: resolvedTargetStage,
          progress_step: nextStep,
          updated_at: updatedAt
        };
        if (order.id) {
          const { error: tErr } = await this.db.from('customer_orders').update(transitionPayload).eq('id', order.id);
          if (tErr) console.error('Database transitionOrderStage error:', tErr);
        } else if (order.poNo) {
          const { error: tErr } = await this.db.from('customer_orders').update(transitionPayload).eq('po_no', order.poNo);
          if (tErr) console.error('Database transitionOrderStage error:', tErr);
        }
      } catch (dbErr) {
        console.warn('Database transitionOrderStage fallback:', dbErr);
      }

      await auditService.recordAuditLog({
        actorEmail: actorContext?.name || 'System User',
        actorRole: actorContext?.role || 'Production Planner',
        action: 'ORDER_TRANSITION',
        entityType: 'customer_orders',
        entityId: order.id,
        details: `Order #${order.poNo} transitioned from ${currentStage} to ${resolvedTargetStage} (Step ${nextStep})`
      }).catch(() => {});

      const resultPayload = {
        orderId: order.id,
        poNo: order.poNo,
        previousStage: currentStage,
        newStage: resolvedTargetStage,
        status: resolvedTargetStage,
        stage: resolvedTargetStage,
        heatLotNumber: effectivePayload.heatLotNumber || order.heatLotNumber,
        progressStep: nextStep,
        autoActions: validation.autoActionsTriggered,
        updatedAt
      };

      // Real-Time Push: Broadcast stage transition across all dashboards
      notificationsService.broadcastEvent('order_transitioned', resultPayload);
      notificationsService.broadcastEvent('order_updated', { ...order, ...resultPayload });

      return resultPayload;
    });
  }

  /**
   * Explicitly evaluates BOM explosion & material availability for a specific order.
   * Updates order status to MATERIAL_READY or MATERIAL_SHORT in DB and returns verification details.
   */
  async runMaterialVerificationForOrder(orderIdOrPo: string, actorContext?: { role?: string; name?: string }) {
    const order = await this.getOrderById(orderIdOrPo);
    if (!order) {
      const err: any = new Error(`Order ${orderIdOrPo} not found`);
      err.statusCode = 404;
      throw err;
    }

    const check = await this.checkAndReserveMaterialsForOrder(order, actorContext?.name || 'Material Verification Engine');
    const newStatus: OrderStage = check.ready ? 'MATERIAL_READY' : 'MATERIAL_SHORT';
    const progressStep = check.ready ? 4 : 3;
    const updatedAt = new Date().toISOString();

    try {
      await this.db
        .from('customer_orders')
        .update({
          status: newStatus,
          progress_step: progressStep,
          updated_at: updatedAt
        })
        .or(`id.eq.${order.id},po_no.eq.${order.poNo}`);
    } catch (dbErr) {
      console.warn('DB runMaterialVerification update fallback:', dbErr);
    }

    await auditService.recordAuditLog({
      actorEmail: actorContext?.name || 'system@guruom.in',
      actorRole: actorContext?.role || 'Production Planner',
      action: 'MATERIAL_VERIFICATION_EXECUTED',
      entityType: 'customer_orders',
      entityId: order.id,
      details: `Material verification executed for Order #${order.poNo}: result is ${newStatus} (${check.ready ? 'All materials available and allocated' : `${check.shortages?.length || 0} component shortages detected`})`
    }).catch(() => {});

    const resultPayload = {
      orderId: order.id,
      poNo: order.poNo,
      status: newStatus,
      stage: newStatus,
      progressStep,
      ready: check.ready,
      shortages: check.shortages || [],
      updatedAt
    };

    notificationsService.broadcastEvent('order_updated', { ...order, ...resultPayload });
    if (check.ready) {
      notificationsService.broadcastEvent('stock_updated', { orderPo: order.poNo, status: 'RESERVED' });
    } else {
      notificationsService.broadcastEvent('shortage_updated', { orderPo: order.poNo, shortages: check.shortages });
    }

    return resultPayload;
  }

  /**
   * Owner/Ops Admin Override for Material Verification.
   * Requires mandatory reason and logs explicit OVERRIDE_MATERIAL_CHECK audit log.
   */
  async overrideMaterialCheck(
    orderIdOrPo: string, 
    payload: { reason: string }, 
    actorContext: { role: string; name: string }
  ) {
    if (!payload.reason || payload.reason.trim().length < 5) {
      const err: any = new Error('A detailed override reason (min 5 characters) is mandatory to bypass Material Verification.');
      err.statusCode = 400;
      throw err;
    }

    const order = await this.getOrderById(orderIdOrPo);
    if (!order) {
      const err: any = new Error(`Order ${orderIdOrPo} not found`);
      err.statusCode = 404;
      throw err;
    }

    const updatedAt = new Date().toISOString();
    try {
      await this.db
        .from('customer_orders')
        .update({
          status: 'MATERIAL_READY',
          progress_step: 4,
          updated_at: updatedAt
        })
        .or(`id.eq.${order.id},po_no.eq.${order.poNo}`);
    } catch (dbErr) {
      console.warn('DB overrideMaterialCheck fallback:', dbErr);
    }

    await auditService.recordAuditLog({
      actorEmail: actorContext.name || 'owner@guruom.in',
      actorRole: actorContext.role || 'Owner/Management',
      action: 'OVERRIDE_MATERIAL_CHECK',
      entityType: 'customer_orders',
      entityId: order.id,
      details: `[OWNER OVERRIDE] Material Check overridden for Order #${order.poNo}. Reason: ${payload.reason}`
    });

    const resultPayload = {
      orderId: order.id,
      poNo: order.poNo,
      status: 'MATERIAL_READY',
      stage: 'MATERIAL_READY',
      progressStep: 4,
      isOverridden: true,
      overrideReason: payload.reason,
      updatedAt
    };

    notificationsService.broadcastEvent('order_updated', { ...order, ...resultPayload });
    return resultPayload;
  }


  /**
   * Submits an order amendment (Quantity, Date, Price) with Owner approval enforcement for price changes.
   */
  async createAmendment(orderId: string, amendment: z.infer<typeof OrderAmendmentSchema>, actorContext?: { role?: string; name?: string }) {
    const order = await this.getOrderById(orderId);
    if (!order) {
      const err: any = new Error(`Order ${orderId} not found`);
      err.statusCode = 404;
      throw err;
    }

    // Price changes specifically require Owner-level approval
    if (amendment.amendmentType === 'PRICE') {
      const isOwner = actorContext?.role === 'Owner' || actorContext?.role === 'Admin (System)';
      if (!isOwner) {
        // Escalate price change request to Owner in pending_approvals
        const approvalId = `appr-amend-${Date.now()}`;
        try {
          await this.db.from('pending_approvals').insert({
            id: approvalId,
            title: `Order Price Amendment (${order.poNo})`,
            type: 'ORDER_PRICE_AMENDMENT',
            entity_type: 'ORDER',
            entity_id: order.id,
            amount: amendment.newUnitPrice || 0,
            requested_by: actorContext?.name || 'Sales Desk',
            requested_by_role: actorContext?.role || 'Sales/Order Desk',
            target_approver_role: 'Owner',
            status: 'PENDING_OWNER_APPROVAL',
            details: `Proposed price change for ${order.poNo}. Reason: ${amendment.reason}`
          });
        } catch (dbErr) {
          console.warn('DB pending_approvals fallback:', dbErr);
        }

        return {
          status: 'ESCALATED_TO_OWNER',
          escalated: true,
          approvalId,
          message: `Price amendment on order "${order.poNo}" requires Owner authorization. An approval ticket [${approvalId}] has been created.`
        };
      }
    }

    // Apply amendment directly if authorized
    try {
      if (amendment.amendmentType === 'DELIVERY_DATE' && amendment.newDeliveryDate) {
        await this.db.from('customer_orders').update({ delivery_date: amendment.newDeliveryDate }).eq('id', order.id);
      }
      if (amendment.amendmentType === 'PRICE' && amendment.newUnitPrice) {
        await this.db.from('order_line_items').update({ rate: amendment.newUnitPrice }).eq('order_id', order.id);
      }
    } catch (dbErr) {
      console.warn('DB update amendment fallback:', dbErr);
    }

    await auditService.recordAuditLog({
      actorEmail: actorContext?.name || 'Admin',
      actorRole: actorContext?.role || 'Owner',
      action: 'ORDER_AMENDMENT_APPLIED',
      entityType: 'customer_orders',
      entityId: order.id,
      details: `Amendment applied to ${order.poNo} (${amendment.amendmentType}): ${amendment.reason}`
    }).catch(() => {});

    return {
      status: 'AMENDMENT_APPLIED',
      orderId: order.id,
      amendment
    };
  }
}

export const ordersService = new OrdersService();
