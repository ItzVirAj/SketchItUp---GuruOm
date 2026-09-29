-- Purchase Module PRD v1.0
-- Additive schema only. No seed/test/business records are inserted.

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS sent_to_vendor_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_to_vendor_by TEXT,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS approval_remarks TEXT;

ALTER TABLE public.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

ALTER TABLE public.purchase_orders
  ADD CONSTRAINT purchase_orders_status_check
  CHECK (status IN (
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'ISSUED',
    'PARTIALLY_RECEIVED',
    'RECEIVED',
    'CLOSED',
    'CANCELLED'
  ));

ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS uom TEXT,
  ADD COLUMN IF NOT EXISTS min_order_qty NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS qc_required BOOLEAN DEFAULT false;

ALTER TABLE public.goods_receipt_notes
  ADD COLUMN IF NOT EXISTS inventory_posting_status TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS vendor_bill_status TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS vendor_bill_no TEXT,
  ADD COLUMN IF NOT EXISTS qc_hold_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discrepancy_flag TEXT NOT NULL DEFAULT 'NONE';

ALTER TABLE public.grn_items
  ADD COLUMN IF NOT EXISTS usable_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qc_hold_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qc_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS qc_hold_reason TEXT,
  ADD COLUMN IF NOT EXISTS heat_lot_no TEXT,
  ADD COLUMN IF NOT EXISTS discrepancy_flag TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS discrepancy_qty NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.masters
  ADD COLUMN IF NOT EXISTS min_order_qty NUMERIC(12,2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS qc_required BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS qc_hold_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weighted_average_cost NUMERIC(14,4);

ALTER TABLE public.vendor_bills
  ADD COLUMN IF NOT EXISTS source_module TEXT,
  ADD COLUMN IF NOT EXISTS three_way_match_status TEXT,
  ADD COLUMN IF NOT EXISTS change_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_status_created
  ON public.purchase_orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_item
  ON public.purchase_order_items (po_id, item_code);

CREATE INDEX IF NOT EXISTS idx_grn_po_created
  ON public.goods_receipt_notes (po_no, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_grn_items_grn_item
  ON public.grn_items (grn_id, item_code);

CREATE INDEX IF NOT EXISTS idx_vendor_bills_po_grn
  ON public.vendor_bills (po_no, grn_no);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_created_type
  ON public.inventory_movements (item_code, created_at DESC, movement_type);
