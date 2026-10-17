-- ============================================================================
-- 007_finance_and_invoicing.sql
-- Customer invoices (GST), invoice items and vendor bills (TDS).
-- Part of the consolidated GuruOm Owner OS schema. Idempotent: safe to re-run.
-- ============================================================================

-- ----- customer_invoices -----
CREATE TABLE IF NOT EXISTS public.customer_invoices (
  id text NOT NULL,
  invoice_no text NOT NULL,
  customer_name text NOT NULL,
  order_po text NOT NULL,
  challan_no text NOT NULL,
  status text DEFAULT 'DRAFT'::text NOT NULL,
  date text NOT NULL,
  due_date text NOT NULL,
  total_amount numeric DEFAULT 0 NOT NULL,
  paid_amount numeric DEFAULT 0 NOT NULL,
  balance_amount numeric DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  pdf_status text DEFAULT 'pending_pdf'::text,
  attachment_id uuid,
  idempotency_key text,
  customer_id text,
  customer_gstin text,
  taxable_amount numeric(14,2) DEFAULT 0,
  cgst_amount numeric(14,2) DEFAULT 0,
  sgst_amount numeric(14,2) DEFAULT 0,
  is_einvoice_applicable boolean DEFAULT false,
  irn_number text,
  payment_received_date text,
  updated_at timestamp with time zone DEFAULT now(),
  igst_amount numeric(14,2) DEFAULT 0 NOT NULL,
  CONSTRAINT customer_invoices_pkey PRIMARY KEY (id),
  CONSTRAINT customer_invoices_invoice_no_key UNIQUE (invoice_no),
  CONSTRAINT customer_invoices_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_idempotency_key ON public.customer_invoices USING btree (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_order_po ON public.customer_invoices USING btree (order_po);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_invoices_active_order ON public.customer_invoices USING btree (order_po) WHERE (status <> 'CANCELLED'::text);
ALTER TABLE public.customer_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customer invoices access" ON public.customer_invoices;
CREATE POLICY "Customer invoices access" ON public.customer_invoices FOR ALL
  USING (true);

-- ----- customer_invoice_items -----
CREATE TABLE IF NOT EXISTS public.customer_invoice_items (
  id character varying(100) NOT NULL,
  invoice_id character varying(100) NOT NULL,
  invoice_no character varying(50) NOT NULL,
  item_code character varying(100) NOT NULL,
  item_description text NOT NULL,
  hsn_code character varying(20) NOT NULL,
  qty numeric(12,2) NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  taxable_value numeric(12,2) NOT NULL,
  gst_rate numeric(5,2) NOT NULL,
  cgst_rate numeric(5,2) DEFAULT 0,
  sgst_rate numeric(5,2) DEFAULT 0,
  igst_rate numeric(5,2) DEFAULT 0,
  cgst_amount numeric(12,2) DEFAULT 0,
  sgst_amount numeric(12,2) DEFAULT 0,
  igst_amount numeric(12,2) DEFAULT 0,
  total_item_amount numeric(12,2) NOT NULL,
  gst_override_reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT customer_invoice_items_pkey PRIMARY KEY (id)
);
ALTER TABLE public.customer_invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access on customer_invoice_items" ON public.customer_invoice_items;
CREATE POLICY "Open access on customer_invoice_items" ON public.customer_invoice_items FOR ALL
  USING (true);

-- ----- vendor_bills -----
CREATE TABLE IF NOT EXISTS public.vendor_bills (
  id text NOT NULL,
  bill_no text NOT NULL,
  vendor_name text NOT NULL,
  po_no text NOT NULL,
  status text DEFAULT 'OPEN'::text NOT NULL,
  date text NOT NULL,
  due_date text NOT NULL,
  amount numeric DEFAULT 0 NOT NULL,
  paid_amount numeric DEFAULT 0 NOT NULL,
  balance_amount numeric DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  vendor_type character varying(100),
  vendor_pan character varying(20),
  tds_section character varying(20) DEFAULT 'NONE'::character varying,
  tds_rate numeric(5,2) DEFAULT 0.0,
  tds_amount numeric(12,2) DEFAULT 0.0,
  net_payable_amount numeric(12,2) DEFAULT 0.0,
  grn_no character varying(50),
  CONSTRAINT vendor_bills_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_bills_bill_no_key UNIQUE (bill_no)
);
ALTER TABLE public.vendor_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vendor bills access" ON public.vendor_bills;
CREATE POLICY "Vendor bills access" ON public.vendor_bills FOR ALL
  USING (true);

-- ----- views -----
CREATE OR REPLACE VIEW public.customer_overdue_summary WITH (security_invoker = true) AS
 SELECT c.id AS customer_id,
    c.name AS customer_name,
    c.legal_name,
    c.customer_type,
    COALESCE(c.credit_days, 30::numeric) AS credit_days,
    COALESCE(c.credit_limit, 0::numeric) AS credit_limit,
    count(i.id) AS total_unpaid_invoices,
    COALESCE(sum(
        CASE
            WHEN (CURRENT_DATE - i.date::date) > 90 AND i.status <> 'PAID'::text THEN i.total_amount
            ELSE 0::numeric
        END), 0::numeric) AS overdue_90_days_amount,
    COALESCE(sum(
        CASE
            WHEN i.status <> 'PAID'::text THEN i.total_amount
            ELSE 0::numeric
        END), 0::numeric) AS total_outstanding_amount,
        CASE
            WHEN COALESCE(sum(
            CASE
                WHEN (CURRENT_DATE - i.date::date) > 90 AND i.status <> 'PAID'::text THEN i.total_amount
                ELSE 0::numeric
            END), 0::numeric) > 0::numeric THEN true
            ELSE false
        END AS is_credit_hold_triggered
   FROM customer_masters c
     LEFT JOIN customer_invoices i ON i.customer_name = c.name AND i.status <> 'PAID'::text
  GROUP BY c.id, c.name, c.legal_name, c.customer_type, c.credit_days, c.credit_limit;
