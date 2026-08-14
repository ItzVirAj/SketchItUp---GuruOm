import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { PurchaseOrderSchema, ApprovalDecisionSchema } from './purchasing.schema';

const SEED_PURCHASE_ORDERS = [
  {
    id: 'po-pur-1',
    poNo: 'PO-PUR-2026-001',
    supplierCode: 'VEND-001',
    supplierName: 'Mahalaxmi Steel Traders',
    orderDate: '2026-08-01',
    expectedDeliveryDate: '2026-08-15',
    paymentTerms: 'Net 30',
    taxRate: 18.0,
    grossAmount: 140000,
    taxAmount: 25200,
    totalAmount: 165200,
    status: 'PARTIALLY_RECEIVED',
    approvalStatus: 'APPROVED',
    approvedBy: 'Pramod Parshi (Founder & CEO)',
    approvedAt: '2026-08-01T10:30:00Z',
    createdBy: 'Suresh Mehta (Finance)',
    notes: 'Urgent alloy steel raw material batch for Tata Motors PO.',
    items: [
      {
        id: 'po-item-1',
        itemCode: 'RAW-ALU-6061-ROD',
        itemDescription: 'Aluminium 6061 Round Bar Ø50mm',
        orderQty: 500,
        receivedQty: 500,
        unit: 'KG',
        unitPrice: 280,
        lineTotal: 140000
      }
    ]
  },
  {
    id: 'po-pur-2',
    poNo: 'PO-PUR-2026-002',
    supplierCode: 'VEND-002',
    supplierName: 'Apex Tools & Inserts',
    orderDate: '2026-08-05',
    expectedDeliveryDate: '2026-08-14',
    paymentTerms: 'Net 30',
    taxRate: 18.0,
    grossAmount: 22500,
    taxAmount: 4050,
    totalAmount: 26550,
    status: 'APPROVED',
    approvalStatus: 'APPROVED',
    approvedBy: 'Pramod Parshi (Founder & CEO)',
    approvedAt: '2026-08-05T14:15:00Z',
    createdBy: 'Rajesh Sharma (Operator)',
    notes: 'Monthly consumable carbide inserts replenishment.',
    items: [
      {
        id: 'po-item-2',
        itemCode: 'TOOL-CNMG-120408',
        itemDescription: 'CNMG 120408 Turning Carbide Inserts',
        orderQty: 50,
        receivedQty: 50,
        unit: 'NOS',
        unitPrice: 450,
        lineTotal: 22500
      }
    ]
  },
  {
    id: 'po-pur-3',
    poNo: 'PO-PUR-2026-003',
    supplierCode: 'VEND-001',
    supplierName: 'Mahalaxmi Steel Traders',
    orderDate: '2026-08-14',
    expectedDeliveryDate: '2026-08-25',
    paymentTerms: 'Net 30',
    taxRate: 18.0,
    grossAmount: 285000,
    taxAmount: 51300,
    totalAmount: 336300,
    status: 'PENDING_APPROVAL',
    approvalStatus: 'PENDING',
    createdBy: 'Suresh Mehta (Finance)',
    notes: 'High-value stainless steel bar order requiring Executive Super Admin approval.',
    items: [
      {
        id: 'po-item-3',
        itemCode: 'RAW-SS304-BAR-40MM',
        itemDescription: 'Stainless Steel 304 Round Bar Ø40mm',
        orderQty: 750,
        receivedQty: 0,
        unit: 'KG',
        unitPrice: 380,
        lineTotal: 285000
      }
    ]
  }
];

export class PurchasingService {
  private db = getDbClient();

  async getPurchaseOrders() {
    try {
      const { data: poData, error: poErr } = await this.db
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!poErr && poData && poData.length > 0) {
        const { data: itemsData } = await this.db.from('purchase_order_items').select('*');

        return poData.map(p => ({
          id: p.id,
          poNo: p.po_no,
          supplierCode: p.supplier_code,
          supplierName: p.supplier_name,
          orderDate: p.order_date,
          expectedDeliveryDate: p.expected_delivery_date,
          paymentTerms: p.payment_terms,
          taxRate: Number(p.tax_rate || 18.0),
          grossAmount: Number(p.gross_amount || 0),
          taxAmount: Number(p.tax_amount || 0),
          totalAmount: Number(p.total_amount || 0),
          status: p.status,
          approvalStatus: p.approval_status,
          approvedBy: p.approved_by,
          approvedAt: p.approved_at,
          rejectionReason: p.rejection_reason,
          createdBy: p.created_by,
          notes: p.notes,
          items: (itemsData || []).filter(i => i.purchase_order_id === p.id).map(i => ({
            id: i.id,
            itemCode: i.item_code,
            itemDescription: i.item_description,
            orderQty: Number(i.order_qty || 0),
            receivedQty: Number(i.received_qty || 0),
            unit: i.unit || 'NOS',
            unitPrice: Number(i.unit_price || 0),
            lineTotal: Number(i.line_total || 0)
          }))
        }));
      }
    } catch (err) {
      console.warn('Database getPurchaseOrders error:', err);
    }
    return SEED_PURCHASE_ORDERS;
  }

  async getPurchaseOrderById(id: string) {
    try {
      const { data: p, error: poErr } = await this.db
        .from('purchase_orders')
        .select('*')
        .or(`id.eq.${id},po_no.eq.${id}`)
        .maybeSingle();

      if (!poErr && p) {
        const { data: itemsData } = await this.db.from('purchase_order_items').select('*').eq('purchase_order_id', p.id);

        return {
          id: p.id,
          poNo: p.po_no,
          supplierCode: p.supplier_code,
          supplierName: p.supplier_name,
          orderDate: p.order_date,
          expectedDeliveryDate: p.expected_delivery_date,
          paymentTerms: p.payment_terms,
          taxRate: Number(p.tax_rate || 18.0),
          grossAmount: Number(p.gross_amount || 0),
          taxAmount: Number(p.tax_amount || 0),
          totalAmount: Number(p.total_amount || 0),
          status: p.status,
          approvalStatus: p.approval_status,
          approvedBy: p.approved_by,
          approvedAt: p.approved_at,
          rejectionReason: p.rejection_reason,
          createdBy: p.created_by,
          notes: p.notes,
          items: (itemsData || []).map(i => ({
            id: i.id,
            itemCode: i.item_code,
            itemDescription: i.item_description,
            orderQty: Number(i.order_qty || 0),
            receivedQty: Number(i.received_qty || 0),
            unit: i.unit || 'NOS',
            unitPrice: Number(i.unit_price || 0),
            lineTotal: Number(i.line_total || 0)
          }))
        };
      }
    } catch (err) {
      console.warn('Database getPurchaseOrderById error:', err);
    }
    return SEED_PURCHASE_ORDERS.find(p => p.id === id || p.poNo === id) || null;
  }

  async createPurchaseOrder(data: z.infer<typeof PurchaseOrderSchema>, userFullName = 'Owner OS User') {
    const validated = PurchaseOrderSchema.parse(data);
    const poId = validated.id || `po-pur-${Date.now()}`;

    // Auto-calculate financial totals if not explicitly provided
    let calculatedGross = 0;
    const computedItems = validated.items.map(it => {
      const lineTotal = it.lineTotal || it.orderQty * it.unitPrice;
      calculatedGross += lineTotal;
      return {
        ...it,
        lineTotal
      };
    });

    const grossAmount = validated.grossAmount || calculatedGross;
    const taxAmount = validated.taxAmount || (grossAmount * (validated.taxRate / 100));
    const totalAmount = validated.totalAmount || (grossAmount + taxAmount);

    const requiresApproval = totalAmount > 100000; // Business policy: > ₹100,000 requires Super Admin / Finance approval
    const status = requiresApproval ? 'PENDING_APPROVAL' : 'APPROVED';
    const approvalStatus = requiresApproval ? 'PENDING' : 'APPROVED';

    const poPayload = {
      id: poId,
      po_no: validated.poNo,
      supplier_code: validated.supplierCode,
      supplier_name: validated.supplierName,
      order_date: validated.orderDate,
      expected_delivery_date: validated.expectedDeliveryDate,
      payment_terms: validated.paymentTerms,
      tax_rate: validated.taxRate,
      gross_amount: grossAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      status,
      approval_status: approvalStatus,
      created_by: validated.createdBy || userFullName,
      notes: validated.notes,
      created_at: new Date().toISOString()
    };

    try {
      const { error: insertErr } = await this.db.from('purchase_orders').insert(poPayload);
      if (insertErr) throw insertErr;

      if (computedItems.length > 0) {
        const itemRows = computedItems.map(it => ({
          id: it.id || `po-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          purchase_order_id: poId,
          item_code: it.itemCode,
          item_description: it.itemDescription,
          order_qty: it.orderQty,
          received_qty: it.receivedQty || 0,
          unit: it.unit,
          unit_price: it.unitPrice,
          line_total: it.lineTotal
        }));

        await this.db.from('purchase_order_items').insert(itemRows);
      }
    } catch (err) {
      console.warn('Database createPurchaseOrder error:', err);
    }

    const createdPO = {
      id: poId,
      poNo: validated.poNo,
      supplierCode: validated.supplierCode,
      supplierName: validated.supplierName,
      orderDate: validated.orderDate,
      expectedDeliveryDate: validated.expectedDeliveryDate,
      paymentTerms: validated.paymentTerms,
      taxRate: validated.taxRate,
      grossAmount,
      taxAmount,
      totalAmount,
      status,
      approvalStatus,
      createdBy: validated.createdBy || userFullName,
      notes: validated.notes,
      items: computedItems
    };

    SEED_PURCHASE_ORDERS.unshift(createdPO as any);
    return createdPO;
  }

  async reviewPurchaseOrderApproval(id: string, decisionData: z.infer<typeof ApprovalDecisionSchema>, reviewerName: string) {
    const { decision, reason } = ApprovalDecisionSchema.parse(decisionData);

    const isApproved = decision === 'APPROVE';
    const status = isApproved ? 'APPROVED' : 'REJECTED';
    const approvalStatus = isApproved ? 'APPROVED' : 'REJECTED';
    const approvedAt = new Date().toISOString();

    const updatePayload: any = {
      status,
      approval_status: approvalStatus,
      updated_at: approvedAt
    };

    if (isApproved) {
      updatePayload.approved_by = reviewerName;
      updatePayload.approved_at = approvedAt;
    } else {
      updatePayload.rejection_reason = reason || 'Rejected during executive review';
    }

    try {
      await this.db
        .from('purchase_orders')
        .update(updatePayload)
        .or(`id.eq.${id},po_no.eq.${id}`);
    } catch (err) {
      console.warn('Database reviewPurchaseOrderApproval error:', err);
    }

    const local = SEED_PURCHASE_ORDERS.find(p => p.id === id || p.poNo === id);
    if (local) {
      local.status = status;
      local.approvalStatus = approvalStatus;
      if (isApproved) {
        local.approvedBy = reviewerName;
        local.approvedAt = approvedAt;
      } else {
        local.rejectionReason = reason;
      }
    }

    return { id, status, approvalStatus, ...updatePayload };
  }
}

export const purchasingService = new PurchasingService();
