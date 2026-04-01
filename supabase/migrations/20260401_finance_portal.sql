-- ======================================================
-- FINANCE PORTAL: FULL SYSTEM DDL (SAFE MIGRATION)
-- This script adds new finance tables and safely extends
-- existing tables (like tuition_events and event_registrations)
-- without destroying any existing data.
-- ======================================================

-- 1. NEW SUPPORTING TABLES (Safe to run multiple times)
CREATE TABLE IF NOT EXISTS tuition_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6366F1',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. EXTEND EXISTING TABLES (Non-destructive ALTERS)
-- Extend tuition_events with billing fields
ALTER TABLE tuition_events 
    ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(10, 2) DEFAULT 500.00,
    ADD COLUMN IF NOT EXISTS active_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    ADD COLUMN IF NOT EXISTS attendance_threshold INTEGER DEFAULT 80;

-- Extend event_registrations to link to centers and status
ALTER TABLE event_registrations 
    ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'suspended'));


-- 3. NEW CORE FINANCE TABLES
-- Payments engine
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT NOT NULL UNIQUE,
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT DEFAULT 'KES',
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    method TEXT NOT NULL, -- 'Cash', 'M-Pesa', 'Bank Transfer', 'Cheque'
    paid_dates TEXT, -- CSV of ISO dates: "2026-04-01,2026-04-02"
    week_number INTEGER,
    reference TEXT, -- Transaction ID / Cheque #
    notes TEXT,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL, 
    student_name TEXT, 
    tuition_event_id UUID REFERENCES tuition_events(id) ON DELETE SET NULL,
    tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Expenses tracker
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT DEFAULT 'KES',
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    method TEXT DEFAULT 'Cash',
    reference TEXT,
    notes TEXT,
    category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- PDF Report Tracking
CREATE TABLE IF NOT EXISTS financial_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    report_type TEXT DEFAULT 'weekly', -- 'weekly', 'monthly', 'annual'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_revenue NUMERIC(15, 2) DEFAULT 0,
    total_expenses NUMERIC(15, 2) DEFAULT 0,
    net_profit NUMERIC(15, 2) DEFAULT 0,
    pdf_url TEXT,
    generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_payments_event ON payments(tuition_event_id, week_number);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_center ON payments(tuition_center_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_center ON expenses(tuition_center_id);


-- 5. REPORTING VIEWS
-- Drop view if exists to easily recreate its structure if needed
DROP VIEW IF EXISTS student_weekly_arrears;
CREATE VIEW student_weekly_arrears AS
SELECT 
    er.student_name,
    er.tuition_event_id,
    te.name AS event_name,
    te.daily_rate,
    COALESCE(SUM(p.amount), 0) AS amount_paid,
    COALESCE(SUM(array_length(string_to_array(p.paid_dates, ','), 1)), 0) AS days_settled
FROM event_registrations er
JOIN tuition_events te ON er.tuition_event_id = te.id
LEFT JOIN payments p ON er.tuition_event_id = p.tuition_event_id AND er.student_name = p.student_name
GROUP BY er.student_name, er.tuition_event_id, te.name, te.daily_rate;

DROP VIEW IF EXISTS finance_daily_summary;
CREATE VIEW finance_daily_summary AS
SELECT 
    payment_date AS summary_date,
    SUM(amount) AS total_revenue,
    (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE expense_date = payments.payment_date) AS total_expenses
FROM payments
GROUP BY payment_date;


-- 6. ROW LEVEL SECURITY (RLS) & POLICIES
-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Safe Policy Creation (Drop then Create)
DROP POLICY IF EXISTS "finance_all_payments" ON payments;
CREATE POLICY "finance_all_payments" ON payments
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'finance')));

DROP POLICY IF EXISTS "finance_all_expenses" ON expenses;
CREATE POLICY "finance_all_expenses" ON expenses
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'finance')));

DROP POLICY IF EXISTS "finance_all_reports" ON financial_reports;
CREATE POLICY "finance_all_reports" ON financial_reports
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'finance')));

DROP POLICY IF EXISTS "everyone_read_categories" ON expense_categories;
CREATE POLICY "everyone_read_categories" ON expense_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_write_categories" ON expense_categories;
CREATE POLICY "admin_write_categories" ON expense_categories
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));


-- 7. INITIAL DATA SEEDING
-- Seed categories safely
INSERT INTO expense_categories (name, color) VALUES 
('Teacher Salaries', '#10B981'), 
('Rent & Utilities', '#EF4444'), 
('Marketing', '#3B82F6'), 
('Stationery', '#F59E0B'),
('Maintenance', '#8B5CF6')
ON CONFLICT (name) DO NOTHING;
