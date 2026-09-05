-- ===================================================
-- Migration 002: Row Level Security (RLS) & Policies
-- ===================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortage_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finished_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outwork_sendouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdi_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper Function to Get Current User's Role
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(role, 'OPERATOR')
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Standard Public/Authenticated Operational Policies (Allow Full Operations for Workspace Users)
CREATE POLICY "Allow select for authenticated and anon" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated and anon" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for authenticated and anon" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Allow delete for authenticated and anon" ON public.profiles FOR DELETE USING (true);

CREATE POLICY "Company profile access" ON public.company_profile FOR ALL USING (true);
CREATE POLICY "Masters access" ON public.masters FOR ALL USING (true);
CREATE POLICY "Orders access" ON public.customer_orders FOR ALL USING (true);
CREATE POLICY "Order line items access" ON public.order_line_items FOR ALL USING (true);
CREATE POLICY "Stock items access" ON public.stock_items FOR ALL USING (true);
CREATE POLICY "Shortage items access" ON public.shortage_items FOR ALL USING (true);
CREATE POLICY "Job cards access" ON public.job_cards FOR ALL USING (true);
CREATE POLICY "Finished goods access" ON public.finished_goods FOR ALL USING (true);
CREATE POLICY "Outwork sendouts access" ON public.outwork_sendouts FOR ALL USING (true);
CREATE POLICY "Production logs access" ON public.production_logs FOR ALL USING (true);
CREATE POLICY "QC inspections access" ON public.qc_inspections FOR ALL USING (true);
CREATE POLICY "PDI inspections access" ON public.pdi_inspections FOR ALL USING (true);
CREATE POLICY "Dispatch challans access" ON public.dispatch_challans FOR ALL USING (true);
CREATE POLICY "Pending approvals access" ON public.pending_approvals FOR ALL USING (true);
CREATE POLICY "Customer invoices access" ON public.customer_invoices FOR ALL USING (true);
CREATE POLICY "Vendor bills access" ON public.vendor_bills FOR ALL USING (true);
CREATE POLICY "Notifications access" ON public.notifications FOR ALL USING (true);
CREATE POLICY "Audit logs access" ON public.audit_logs FOR ALL USING (true);
