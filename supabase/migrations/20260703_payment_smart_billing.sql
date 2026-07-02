-- Migration: Smart billing fields for per-day payment allocation
-- Run: 2026-07-03

-- Add new columns to payments table
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS expected_amount   NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS balance_amount    NUMERIC(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS class_charge_per_day NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS allocated_days    JSONB,
  ADD COLUMN IF NOT EXISTS follow_up_date    DATE,
  ADD COLUMN IF NOT EXISTS follow_up_note    TEXT,
  ADD COLUMN IF NOT EXISTS is_published      BOOLEAN DEFAULT FALSE;

-- Index for fast follow-up reminder lookups
CREATE INDEX IF NOT EXISTS idx_payments_follow_up ON payments(follow_up_date, balance_amount)
  WHERE follow_up_date IS NOT NULL AND balance_amount > 0;

-- Index for student balance lookups
CREATE INDEX IF NOT EXISTS idx_payments_balance ON payments(student_name, tuition_event_id, balance_amount)
  WHERE balance_amount > 0;
