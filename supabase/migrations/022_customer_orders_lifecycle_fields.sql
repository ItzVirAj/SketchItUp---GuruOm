-- ===================================================
-- Migration 020: Customer Orders Lifecycle & Payment Fields
-- Adds all fields that the backend service writes but the
-- initial schema did not define. Run once in Supabase SQL Editor.
-- ===================================================

-- Core lifecycle / stage fields
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS stage TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS price_amendment_status TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS purchase_requisition_no TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS blanket_po_id VARCHAR(100);
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS blanket_po_balance_qty NUMERIC DEFAULT 0;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS drawing_revision VARCHAR(50);
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS master_drawing_revision VARCHAR(50);
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS sub_type VARCHAR(30) DEFAULT 'FRESH_PO';

-- Payment tracking
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(14,2) DEFAULT 0;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS payment_history JSONB DEFAULT '[]'::jsonb;

-- Delivery challan & invoice cross-reference
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS delivery_challan_no TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS invoice_no TEXT;

-- Proof of delivery (POD)
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS pod_document_url TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS pod_received_date TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS pod_received_by TEXT;

-- Delivery delay tracking
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS delayed_reason TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS delayed_follow_up_date TEXT;

-- Heat lot / material traceability
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS heat_lot_number TEXT;

-- Credit control
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS is_credit_held BOOLEAN DEFAULT FALSE;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS credit_override_by TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS credit_override_reason TEXT;

-- NCR / quality hold flag
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS has_open_ncr BOOLEAN DEFAULT FALSE;

-- Order close / completion fields
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS closed_by TEXT;

-- Transporter / dispatch tracking
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS transporter_name TEXT;
ALTER TABLE public.customer_orders ADD COLUMN IF NOT EXISTS dispatched_at TEXT;

-- Reload PostgREST schema cache so all new columns are immediately visible
NOTIFY pgrst, 'reload schema';
