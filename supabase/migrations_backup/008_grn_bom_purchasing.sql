-- ============================================================================
-- Migration 008: GRN, BOM, and Purchasing Data Schema & Seed Records
-- Owner OS Precision Operations System
-- ============================================================================

-- 1. GOODS RECEIPT NOTES (GRN) TABLE
CREATE TABLE IF NOT EXISTS public.goods_receipt_notes (
    id TEXT PRIMARY KEY,
    grn_no TEXT NOT NULL UNIQUE,
    po_no TEXT NOT NULL,
    vendor_code TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    challan_no TEXT NOT NULL,
    challan_date TEXT,
    received_date TEXT NOT NULL,
    received_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('PENDING_INSPECTION', 'RECEIVED', 'QC_VERIFIED', 'REJECTED')),
    vehicle_no TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grn_items (
    id TEXT PRIMARY KEY,
    grn_id TEXT NOT NULL REFERENCES public.goods_receipt_notes(id) ON DELETE CASCADE,
    item_code TEXT NOT NULL,
    item_description TEXT NOT NULL,
    ordered_qty NUMERIC NOT NULL DEFAULT 0,
    received_qty NUMERIC NOT NULL DEFAULT 0,
    accepted_qty NUMERIC NOT NULL DEFAULT 0,
    rejected_qty NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'NOS',
    unit_rate NUMERIC NOT NULL DEFAULT 0,
    rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_grn_po_no ON public.goods_receipt_notes(po_no);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn_id ON public.grn_items(grn_id);

-- 2. BILL OF MATERIALS (BOM) TABLES
CREATE TABLE IF NOT EXISTS public.bill_of_materials (
    id TEXT PRIMARY KEY,
    bom_code TEXT NOT NULL UNIQUE,
    parent_part_code TEXT NOT NULL,
    parent_part_name TEXT NOT NULL,
    revision TEXT NOT NULL DEFAULT 'v1.0',
    yield_percentage NUMERIC NOT NULL DEFAULT 98.5,
    batch_size NUMERIC NOT NULL DEFAULT 100,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DRAFT', 'OBSOLETE')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bom_items (
    id TEXT PRIMARY KEY,
    bom_id TEXT NOT NULL REFERENCES public.bill_of_materials(id) ON DELETE CASCADE,
    component_code TEXT NOT NULL,
    component_name TEXT NOT NULL,
    component_type TEXT NOT NULL DEFAULT 'RAW_MATERIAL' CHECK (component_type IN ('RAW_MATERIAL', 'HARDWARE', 'PACKING', 'SUB_ASSEMBLY')),
    qty_per_unit NUMERIC NOT NULL DEFAULT 1.0,
    unit TEXT NOT NULL DEFAULT 'NOS',
    scrap_allowance_pct NUMERIC NOT NULL DEFAULT 2.0,
    stage TEXT NOT NULL DEFAULT 'CNC_MACHINING',
    unit_cost NUMERIC NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_bom_parent_part ON public.bill_of_materials(parent_part_code);
CREATE INDEX IF NOT EXISTS idx_bom_items_bom_id ON public.bom_items(bom_id);

-- 3. PURCHASING / PURCHASE ORDERS TABLES
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id TEXT PRIMARY KEY,
    po_no TEXT NOT NULL UNIQUE,
    supplier_code TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    order_date TEXT NOT NULL,
    expected_delivery_date TEXT NOT NULL,
    payment_terms TEXT NOT NULL DEFAULT 'Net 30',
    tax_rate NUMERIC NOT NULL DEFAULT 18.0,
    gross_amount NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')),
    approval_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_by TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id TEXT PRIMARY KEY,
    purchase_order_id TEXT NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    item_code TEXT NOT NULL,
    item_description TEXT NOT NULL,
    order_qty NUMERIC NOT NULL DEFAULT 0,
    received_qty NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'NOS',
    unit_price NUMERIC NOT NULL DEFAULT 0,
    line_total NUMERIC NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_po_supplier_code ON public.purchase_orders(supplier_code);
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON public.purchase_order_items(purchase_order_id);

-- 4. ENABLE ROW LEVEL SECURITY & SERVICE ROLE POLICIES
ALTER TABLE public.goods_receipt_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_of_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on goods_receipt_notes" ON public.goods_receipt_notes FOR ALL USING (true);
CREATE POLICY "Service role full access on grn_items" ON public.grn_items FOR ALL USING (true);
CREATE POLICY "Service role full access on bill_of_materials" ON public.bill_of_materials FOR ALL USING (true);
CREATE POLICY "Service role full access on bom_items" ON public.bom_items FOR ALL USING (true);
CREATE POLICY "Service role full access on purchase_orders" ON public.purchase_orders FOR ALL USING (true);
CREATE POLICY "Service role full access on purchase_order_items" ON public.purchase_order_items FOR ALL USING (true);
