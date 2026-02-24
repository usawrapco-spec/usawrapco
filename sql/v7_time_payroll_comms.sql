-- ============================================================================
-- V7 MIGRATION: Time Clock, Payroll, Communications
-- Run in Supabase SQL Editor
-- ============================================================================

-- TIME & PAYROLL TABLES

CREATE TABLE IF NOT EXISTS time_clock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  duration_minutes INT,
  entry_type TEXT DEFAULT 'regular' CHECK (entry_type IN ('regular','overtime','pto','holiday','sick','drive_time','shop_time')),
  project_notes TEXT,
  ai_summary TEXT,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  location_name TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('active','pending','approved','rejected','paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pay_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  pay_date DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','processing','paid','cancelled')),
  total_gross DECIMAL(12,2) DEFAULT 0,
  total_tax DECIMAL(12,2) DEFAULT 0,
  total_net DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  pay_period_id UUID REFERENCES pay_periods(id),
  user_id UUID REFERENCES profiles(id),
  regular_hours DECIMAL(6,2) DEFAULT 0,
  overtime_hours DECIMAL(6,2) DEFAULT 0,
  pto_hours DECIMAL(6,2) DEFAULT 0,
  sick_hours DECIMAL(6,2) DEFAULT 0,
  holiday_hours DECIMAL(6,2) DEFAULT 0,
  hourly_rate DECIMAL(8,2),
  overtime_rate DECIMAL(8,2),
  gross_pay DECIMAL(10,2),
  commission_pay DECIMAL(10,2) DEFAULT 0,
  bonus_pay DECIMAL(10,2) DEFAULT 0,
  deductions JSONB DEFAULT '[]',
  taxes JSONB DEFAULT '[]',
  net_pay DECIMAL(10,2),
  payment_method TEXT DEFAULT 'direct_deposit' CHECK (payment_method IN ('direct_deposit','check','cash','venmo','zelle')),
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','approved','paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_pay_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  user_id UUID REFERENCES profiles(id) UNIQUE,
  pay_type TEXT DEFAULT 'hourly' CHECK (pay_type IN ('hourly','salary','commission_only','hourly_plus_commission')),
  hourly_rate DECIMAL(8,2),
  salary_annual DECIMAL(10,2),
  overtime_eligible BOOLEAN DEFAULT true,
  overtime_threshold_hours DECIMAL(4,1) DEFAULT 40,
  commission_rate DECIMAL(5,4) DEFAULT 0,
  commission_type TEXT DEFAULT 'gp' CHECK (commission_type IN ('gp','revenue','flat')),
  pto_accrual_rate DECIMAL(6,4) DEFAULT 0.0385,
  pto_balance DECIMAL(6,2) DEFAULT 0,
  sick_balance DECIMAL(6,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'direct_deposit',
  bank_account_last4 TEXT,
  routing_number_encrypted TEXT,
  account_number_encrypted TEXT,
  gusto_employee_id TEXT,
  tax_filing_status TEXT DEFAULT 'single',
  federal_allowances INT DEFAULT 0,
  state_allowances INT DEFAULT 0,
  additional_withholding DECIMAL(8,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  user_id UUID REFERENCES profiles(id),
  request_type TEXT CHECK (request_type IN ('pto','sick','holiday','unpaid')),
  start_date DATE,
  end_date DATE,
  hours_requested DECIMAL(5,2),
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  user_id UUID REFERENCES profiles(id),
  job_id UUID REFERENCES projects(id),
  summary_date DATE,
  raw_notes TEXT,
  ai_summary TEXT,
  hours_logged DECIMAL(5,2),
  tasks_completed JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMMUNICATIONS TABLES

CREATE TABLE IF NOT EXISTS phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  twilio_number TEXT NOT NULL,
  friendly_name TEXT,
  assigned_to UUID REFERENCES profiles(id),
  is_main_number BOOLEAN DEFAULT false,
  capabilities JSONB DEFAULT '{"voice":true,"sms":true,"mms":true}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  twilio_call_sid TEXT UNIQUE,
  direction TEXT CHECK (direction IN ('inbound','outbound')),
  from_number TEXT,
  to_number TEXT,
  customer_id UUID REFERENCES customers(id),
  assigned_to UUID REFERENCES profiles(id),
  status TEXT,
  duration_seconds INT,
  recording_url TEXT,
  transcription TEXT,
  ai_summary TEXT,
  voicemail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  email_address TEXT NOT NULL,
  display_name TEXT,
  provider TEXT DEFAULT 'gmail' CHECK (provider IN ('gmail','outlook','smtp')),
  assigned_to UUID REFERENCES profiles(id),
  is_shared BOOLEAN DEFAULT false,
  gmail_access_token TEXT,
  gmail_refresh_token TEXT,
  gmail_history_id TEXT,
  is_connected BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  email_account_id UUID REFERENCES email_accounts(id),
  gmail_message_id TEXT,
  gmail_thread_id TEXT,
  direction TEXT CHECK (direction IN ('inbound','outbound')),
  from_address TEXT,
  to_addresses TEXT[],
  cc_addresses TEXT[],
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  customer_id UUID REFERENCES customers(id),
  job_id UUID,
  is_read BOOLEAN DEFAULT false,
  starred BOOLEAN DEFAULT false,
  labels TEXT[],
  attachments JSONB DEFAULT '[]',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE time_clock_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_pay_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_time_clock') THEN
    CREATE POLICY "org_time_clock" ON time_clock_entries USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_pay_periods') THEN
    CREATE POLICY "org_pay_periods" ON pay_periods USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_payroll') THEN
    CREATE POLICY "org_payroll" ON payroll_records USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_pay_settings') THEN
    CREATE POLICY "org_pay_settings" ON employee_pay_settings USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_time_off') THEN
    CREATE POLICY "org_time_off" ON time_off_requests USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_work_summaries') THEN
    CREATE POLICY "org_work_summaries" ON work_summaries USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_phone_numbers') THEN
    CREATE POLICY "org_phone_numbers" ON phone_numbers USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_calls') THEN
    CREATE POLICY "org_calls" ON calls USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_email_accounts') THEN
    CREATE POLICY "org_email_accounts" ON email_accounts USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_emails') THEN
    CREATE POLICY "org_emails" ON emails USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_clock_user ON time_clock_entries(user_id, clock_in);
CREATE INDEX IF NOT EXISTS idx_time_clock_job ON time_clock_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_time_clock_org ON time_clock_entries(org_id, clock_in);
CREATE INDEX IF NOT EXISTS idx_payroll_records_period ON payroll_records(pay_period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_user ON payroll_records(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_customer ON calls(customer_id);
CREATE INDEX IF NOT EXISTS idx_emails_customer ON emails(customer_id);
CREATE INDEX IF NOT EXISTS idx_emails_thread ON emails(gmail_thread_id);
CREATE INDEX IF NOT EXISTS idx_work_summaries_user_date ON work_summaries(user_id, summary_date);
