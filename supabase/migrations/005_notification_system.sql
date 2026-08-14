-- ============================================================================
-- MIGRATION 005: PRODUCTION SUPABASE + RESEND EMAIL NOTIFICATION SYSTEM
-- ============================================================================

-- 1. NOTIFICATION RULES TABLE
CREATE TABLE IF NOT EXISTS public.notification_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT true NOT NULL,
    severity TEXT DEFAULT 'INFO' NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. NOTIFICATION RECIPIENTS TABLE
CREATE TABLE IF NOT EXISTS public.notification_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_rule_id TEXT NOT NULL REFERENCES public.notification_rules(id) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('EMAIL', 'USER', 'ROLE')),
    recipient_value TEXT NOT NULL,
    email TEXT,
    name TEXT,
    enabled BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. NOTIFICATION LOGS TABLE (AUDIT & RESEND STATUS)
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
    resend_email_id TEXT,
    error_message TEXT,
    entity_type TEXT,
    entity_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    sent_at TIMESTAMPTZ
);

-- 4. IN-APP NOTIFICATIONS TABLE (REALTIME BELL UPDATES)
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'INFO' NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add severity column if missing on pre-existing notifications table
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'severity'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN severity TEXT DEFAULT 'INFO' NOT NULL;
    END IF;
END $$;

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES FOR PUBLIC & SERVICE ACCESS
DROP POLICY IF EXISTS "Public notification rules read" ON public.notification_rules;
CREATE POLICY "Public notification rules read" ON public.notification_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public notification rules update" ON public.notification_rules;
CREATE POLICY "Public notification rules update" ON public.notification_rules FOR ALL USING (true);

DROP POLICY IF EXISTS "Public notification recipients read" ON public.notification_recipients;
CREATE POLICY "Public notification recipients read" ON public.notification_recipients FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public notification recipients modify" ON public.notification_recipients;
CREATE POLICY "Public notification recipients modify" ON public.notification_recipients FOR ALL USING (true);

DROP POLICY IF EXISTS "Public notification logs read" ON public.notification_logs;
CREATE POLICY "Public notification logs read" ON public.notification_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public notification logs insert" ON public.notification_logs;
CREATE POLICY "Public notification logs insert" ON public.notification_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Public notifications read" ON public.notifications;
CREATE POLICY "Public notifications read" ON public.notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public notifications modify" ON public.notifications;
CREATE POLICY "Public notifications modify" ON public.notifications FOR ALL USING (true);

-- Enable Realtime publication on notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 7. SEED DEFAULT GURUOM NOTIFICATION RULES
INSERT INTO public.notification_rules (id, name, description, enabled, severity) VALUES
('critical_error', 'Critical System & Infrastructure Errors', 'Automated alerts for uncaught exceptions or database outages', true, 'CRITICAL'),
('production_failure', 'Shopfloor Production Job Failure', 'Machine breakdowns, tool damage or operator job rejections', true, 'CRITICAL'),
('pdi_failure', 'PDI & Quality Inspection Failure', 'Pre-Delivery Inspection non-conformance defects', true, 'HIGH'),
('order_delayed', 'Customer Order Schedule Delay', 'PO delivery date overdue or dispatch hold', true, 'HIGH'),
('inventory_shortage', 'Raw Material / SKU Shortage Alert', 'Stock level dropping below reorder point or negative available', true, 'HIGH'),
('invoice_generated', 'Customer Invoice Issued', 'Commercial invoice generated for customer dispatch', true, 'INFO'),
('payment_received', 'Customer Payment Received', 'Payment receipt logged against outstanding invoice', true, 'INFO'),
('dispatch_failed', 'Outward Dispatch Transport Exception', 'Challan transit delay or delivery vehicle breakdown', true, 'HIGH'),
('approval_required', 'Pending Management Approval', 'Purchase order or credit limit requiring sign-off', true, 'MEDIUM')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    severity = EXCLUDED.severity;

-- 8. SEED DEFAULT ROLE & EMAIL RECIPIENTS
INSERT INTO public.notification_recipients (notification_rule_id, recipient_type, recipient_value, email, name, enabled) VALUES
-- Critical Error -> Super Admin + Email
('critical_error', 'ROLE', 'SUPER ADMIN', 'admin@guruom.in', 'System Super Admin', true),
('critical_error', 'EMAIL', 'owner@guruom.in', 'owner@guruom.in', 'Managing Director', true),

-- Production Failure -> Production Manager + Super Admin
('production_failure', 'ROLE', 'OPERATOR', 'production@guruom.in', 'Production Supervisor', true),
('production_failure', 'ROLE', 'SUPER ADMIN', 'admin@guruom.in', 'Super Admin', true),

-- PDI Failure -> QC Manager + Production Manager
('pdi_failure', 'ROLE', 'QC_MANAGER', 'qc@guruom.in', 'QC Lead Auditor', true),
('pdi_failure', 'ROLE', 'SUPER ADMIN', 'admin@guruom.in', 'Super Admin', true),

-- Order Delayed -> Dispatch Clerk + Super Admin
('order_delayed', 'ROLE', 'DISPATCH_CLERK', 'sales@guruom.in', 'Logistics Coordinator', true),
('order_delayed', 'ROLE', 'SUPER ADMIN', 'admin@guruom.in', 'Super Admin', true),

-- Inventory Shortage -> Operator + Super Admin
('inventory_shortage', 'ROLE', 'OPERATOR', 'stores@guruom.in', 'Store Keeper', true),
('inventory_shortage', 'ROLE', 'SUPER ADMIN', 'admin@guruom.in', 'Super Admin', true),

-- Invoice Generated -> Finance Manager
('invoice_generated', 'ROLE', 'FINANCE_MANAGER', 'finance@guruom.in', 'Finance Manager', true),

-- Payment Received -> Finance Manager + Super Admin
('payment_received', 'ROLE', 'FINANCE_MANAGER', 'finance@guruom.in', 'Finance Manager', true),
('payment_received', 'ROLE', 'SUPER ADMIN', 'admin@guruom.in', 'Super Admin', true),

-- Dispatch Failed -> Dispatch Clerk
('dispatch_failed', 'ROLE', 'DISPATCH_CLERK', 'dispatch@guruom.in', 'Dispatch In-charge', true),

-- Approval Required -> Super Admin
('approval_required', 'ROLE', 'SUPER ADMIN', 'admin@guruom.in', 'Super Admin', true)
ON CONFLICT DO NOTHING;
