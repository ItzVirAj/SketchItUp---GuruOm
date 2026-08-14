import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { CustomerOrderSchema, UpdateOrderStatusSchema } from './orders.schema';
import { auditService } from '../audit/audit.service';

export class OrdersService {
  private db = getDbClient();

  /**
   * Fetches all customer orders with line items, job cards, and dispatch records.
   */
  async getOrders() {
    try {
      const { data: ordersData, error: ordersErr } = await this.db
        .from('customer_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!ordersErr && ordersData && ordersData.length > 0) {
        const { data: linesData } = await this.db.from('order_line_items').select('*');
        const { data: jobsData } = await this.db.from('job_cards').select('*');
        const { data: dispatchesData } = await this.db.from('dispatch_challans').select('*');

        return ordersData.map(o => {
          const lines = (linesData || []).filter(l => l.order_id === o.id).map(l => ({
            id: l.id,
            itemCode: l.item_code,
            itemDescription: l.item_description,
            custPartNo: l.cust_part_no || '',
            orderQty: Number(l.order_qty || 0),
            unit: l.unit || 'NOS',
            dispatchedQty: Number(l.dispatched_qty || 0),
            pendingQty: Number(l.pending_qty ?? l.order_qty),
            rate: Number(l.rate || 0)
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

          return {
            id: o.id,
            poNo: o.po_no,
            customerName: o.customer_name,
            poDate: o.po_date,
            deliveryDate: o.delivery_date,
            status: o.status,
            progressStep: o.progress_step || 1,
            grossAmount: Number(o.gross_amount || 0),
            taxCategory: o.tax_category || 'GST 18%',
            remark: o.remark || '',
            clientPoFile: o.client_po_file || undefined,
            lines,
            jobCards,
            dispatches
          };
        });
      }
    } catch (err) {
      console.warn('Database getOrders error:', err);
    }
    return [];
  }

  /**
   * Fetches a single customer order by ID with line items and operational traces.
   */
  async getOrderById(orderId: string) {
    try {
      const { data: o, error: orderErr } = await this.db
        .from('customer_orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (orderErr || !o) return null;

      const { data: linesData } = await this.db.from('order_line_items').select('*').eq('order_id', o.id);
      const { data: jobsData } = await this.db.from('job_cards').select('*').eq('order_po', o.po_no);
      const { data: dispatchesData } = await this.db.from('dispatch_challans').select('*').eq('order_po', o.po_no);

      const lines = (linesData || []).map(l => ({
        id: l.id,
        itemCode: l.item_code,
        itemDescription: l.item_description,
        custPartNo: l.cust_part_no || '',
        orderQty: Number(l.order_qty || 0),
        unit: l.unit || 'NOS',
        dispatchedQty: Number(l.dispatched_qty || 0),
        pendingQty: Number(l.pending_qty ?? l.order_qty),
        rate: Number(l.rate || 0)
      }));

      const jobCards = (jobsData || []).map(j => ({
        jobNo: j.job_no,
        qty: Number(j.qty || 0),
        targetDate: j.target_date,
        status: j.status
      }));

      const dispatches = (dispatchesData || []).map(d => ({
        challanNo: d.challan_no,
        items: `Challan for PO ${d.order_po}`,
        date: d.date,
        status: d.status
      }));

      return {
        id: o.id,
        poNo: o.po_no,
        customerName: o.customer_name,
        poDate: o.po_date,
        deliveryDate: o.delivery_date,
        status: o.status,
        progressStep: o.progress_step || 1,
        grossAmount: Number(o.gross_amount || 0),
        taxCategory: o.tax_category || 'GST 18%',
        remark: o.remark || '',
        clientPoFile: o.client_po_file || undefined,
        lines,
        jobCards,
        dispatches
      };
    } catch (err) {
      console.warn('Database getOrderById error:', err);
      return null;
    }
  }

  /**
   * Creates a new customer order and associated line items.
   */
  async createOrder(data: z.infer<typeof CustomerOrderSchema>, actorName = 'System User') {
    const validated = CustomerOrderSchema.parse(data);

    try {
      const { error: orderErr } = await this.db.from('customer_orders').insert({
        id: validated.id,
        po_no: validated.poNo,
        customer_name: validated.customerName,
        po_date: validated.poDate,
        delivery_date: validated.deliveryDate,
        status: validated.status,
        progress_step: validated.progressStep,
        gross_amount: validated.grossAmount,
        tax_category: validated.taxCategory,
        remark: validated.remark,
        updated_at: new Date().toISOString()
      });

      if (orderErr) throw orderErr;

      if (validated.lines && validated.lines.length > 0) {
        const lineRecords = validated.lines.map(l => ({
          id: l.id || `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          order_id: validated.id,
          item_code: l.itemCode,
          item_description: l.itemDescription,
          cust_part_no: l.custPartNo || '',
          order_qty: l.orderQty,
          unit: l.unit,
          dispatched_qty: l.dispatchedQty || 0,
          pending_qty: l.pendingQty ?? l.orderQty,
          rate: l.rate
        }));

        await this.db.from('order_line_items').insert(lineRecords);
      }

      await auditService.recordAuditLog({
        userName: actorName,
        entity: `Customer Order`,
        entityId: validated.poNo,
        action: 'CREATE_ORDER',
        details: `Created new Customer Order PO #${validated.poNo} for ${validated.customerName} (₹${validated.grossAmount.toLocaleString()})`
      });
    } catch (err) {
      console.warn('Database createOrder error:', err);
    }

    return validated;
  }

  /**
   * Updates order status and workflow progression step.
   */
  async updateOrderStatus(orderId: string, data: z.infer<typeof UpdateOrderStatusSchema>, actorName = 'System User') {
    const validated = UpdateOrderStatusSchema.parse(data);

    const payload: any = {
      status: validated.status,
      updated_at: new Date().toISOString()
    };
    if (validated.progressStep !== undefined) {
      payload.progress_step = validated.progressStep;
    }

    try {
      const { error } = await this.db
        .from('customer_orders')
        .update(payload)
        .eq('id', orderId);

      if (error) throw error;

      await auditService.recordAuditLog({
        userName: actorName,
        entity: `Customer Order`,
        entityId: orderId,
        action: 'UPDATE_ORDER_STATUS',
        details: `Updated status of Order #${orderId} to ${validated.status}`
      });
    } catch (err) {
      console.warn('Database updateOrderStatus error:', err);
    }

    return { orderId, ...payload };
  }
}

export const ordersService = new OrdersService();
