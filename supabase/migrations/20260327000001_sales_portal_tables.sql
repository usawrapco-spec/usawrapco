-- ── Sales Agent CRM Portal Tables ────────────────────────────────────────────
-- Full CRM for sales agents: lead lists, power dialer, referrals,
-- messaging, call analysis, daily tasks.

-- ── 1. Sales Agent Call Lists ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_agent_lists (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  agent_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            text NOT NULL,
  source_filename text,
  total_count     int DEFAULT 0,
  called_count    int DEFAULT 0,
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','paused','completed','archived')),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE sales_agent_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read agent lists"
  ON sales_agent_lists FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE org_id = sales_agent_lists.org_id));

CREATE POLICY "agents can manage own lists"
  ON sales_agent_lists FOR ALL
  USING (auth.uid() = agent_id OR auth.uid() IN (
    SELECT id FROM profiles WHERE org_id = sales_agent_lists.org_id AND role IN ('admin','owner')
  ));

CREATE INDEX sales_agent_lists_agent_idx ON sales_agent_lists(agent_id);
CREATE INDEX sales_agent_lists_org_idx ON sales_agent_lists(org_id);

-- ── 2. Sales Agent List Leads ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_agent_list_leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id         uuid NOT NULL REFERENCES sales_agent_lists(id) ON DELETE CASCADE,
  customer_id     uuid REFERENCES customers(id) ON DELETE SET NULL,
  name            text NOT NULL DEFAULT '',
  company         text,
  phone           text,
  email           text,
  address         text,
  notes           text,
  tags            text[] DEFAULT '{}',
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','called','no_answer','callback','interested','not_interested','converted','skipped')),
  call_count      int DEFAULT 0,
  last_called_at  timestamptz,
  next_callback   timestamptz,
  sort_order      int DEFAULT 0,
  custom_fields   jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE sales_agent_list_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "list leads follow list access"
  ON sales_agent_list_leads FOR SELECT
  USING (list_id IN (SELECT id FROM sales_agent_lists));

CREATE POLICY "list leads manage"
  ON sales_agent_list_leads FOR ALL
  USING (list_id IN (SELECT id FROM sales_agent_lists));

CREATE INDEX sales_agent_list_leads_list_idx ON sales_agent_list_leads(list_id);
CREATE INDEX sales_agent_list_leads_status_idx ON sales_agent_list_leads(list_id, status);
CREATE INDEX sales_agent_list_leads_callback_idx ON sales_agent_list_leads(next_callback) WHERE next_callback IS NOT NULL;

-- ── 3. Sales Agent Referrals (submitted to shop) ────────────────────────────
CREATE TABLE IF NOT EXISTS sales_agent_referrals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  agent_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id        uuid REFERENCES projects(id) ON DELETE SET NULL,
  estimate_id       uuid REFERENCES estimates(id) ON DELETE SET NULL,
  customer_id       uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name     text,
  customer_phone    text,
  customer_email    text,
  vehicle_year      text,
  vehicle_make      text,
  vehicle_model     text,
  vehicle_desc      text,
  service_type      text DEFAULT 'wrap',
  notes             text,
  status            text NOT NULL DEFAULT 'submitted'
                    CHECK (status IN ('submitted','estimate','approved','deposit','production','install','complete','paid','cancelled')),
  commission_pct    numeric(5,2),
  commission_amount numeric(10,2),
  paid              boolean DEFAULT false,
  paid_at           timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE sales_agent_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read agent referrals"
  ON sales_agent_referrals FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE org_id = sales_agent_referrals.org_id));

CREATE POLICY "agents can manage own referrals"
  ON sales_agent_referrals FOR ALL
  USING (auth.uid() = agent_id OR auth.uid() IN (
    SELECT id FROM profiles WHERE org_id = sales_agent_referrals.org_id AND role IN ('admin','owner')
  ));

CREATE INDEX sales_agent_referrals_agent_idx ON sales_agent_referrals(agent_id);
CREATE INDEX sales_agent_referrals_org_idx ON sales_agent_referrals(org_id);
CREATE INDEX sales_agent_referrals_project_idx ON sales_agent_referrals(project_id);

-- ── 4. Sales Agent Messages (3-way: agent ↔ shop ↔ customer) ────────────────
CREATE TABLE IF NOT EXISTS sales_agent_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  referral_id     uuid REFERENCES sales_agent_referrals(id) ON DELETE CASCADE,
  project_id      uuid REFERENCES projects(id) ON DELETE SET NULL,
  agent_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel         text NOT NULL DEFAULT 'agent_shop'
                  CHECK (channel IN ('agent_shop','group','customer_shop')),
  sender_type     text NOT NULL CHECK (sender_type IN ('agent','shop','customer')),
  sender_name     text NOT NULL,
  body            text NOT NULL,
  attachment_url  text,
  read_agent      boolean DEFAULT false,
  read_shop       boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE sales_agent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read agent messages"
  ON sales_agent_messages FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE org_id = sales_agent_messages.org_id));

CREATE POLICY "agents can manage messages"
  ON sales_agent_messages FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE org_id = sales_agent_messages.org_id));

CREATE INDEX sales_agent_messages_agent_channel_idx ON sales_agent_messages(agent_id, channel);
CREATE INDEX sales_agent_messages_referral_idx ON sales_agent_messages(referral_id);

-- ── 5. Call Analyses (AI feedback on recorded calls) ────────────────────────
CREATE TABLE IF NOT EXISTS call_analyses (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  call_log_id         uuid NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  agent_id            uuid REFERENCES profiles(id) ON DELETE SET NULL,
  transcription       text,
  summary             text,
  sentiment           text CHECK (sentiment IN ('positive','neutral','negative','mixed')),
  score               int CHECK (score >= 0 AND score <= 100),
  strengths           jsonb DEFAULT '[]',
  improvements        jsonb DEFAULT '[]',
  action_items        jsonb DEFAULT '[]',
  talk_ratio          numeric(5,2),
  keywords            text[] DEFAULT '{}',
  coaching_feedback   text,
  reviewed_by_agent   boolean DEFAULT false,
  reviewed_at         timestamptz,
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE call_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read analyses"
  ON call_analyses FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE org_id = call_analyses.org_id));

CREATE POLICY "org members can manage analyses"
  ON call_analyses FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE org_id = call_analyses.org_id));

CREATE INDEX call_analyses_call_idx ON call_analyses(call_log_id);
CREATE INDEX call_analyses_agent_idx ON call_analyses(agent_id);
CREATE INDEX call_analyses_unreviewed_idx ON call_analyses(agent_id) WHERE reviewed_by_agent = false;

-- ── 6. Agent Daily Tasks ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_daily_tasks (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  agent_id              uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_date             date NOT NULL DEFAULT CURRENT_DATE,
  type                  text NOT NULL CHECK (type IN (
    'review_call_feedback','follow_up','callback','check_job','send_quote',
    'send_text','send_email','custom'
  )),
  title                 text NOT NULL,
  description           text,
  related_lead_id       uuid REFERENCES sales_agent_list_leads(id) ON DELETE SET NULL,
  related_call_id       uuid REFERENCES call_logs(id) ON DELETE SET NULL,
  related_referral_id   uuid REFERENCES sales_agent_referrals(id) ON DELETE SET NULL,
  priority              text DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status                text DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','skipped')),
  completed_at          timestamptz,
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE agent_daily_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents can read own tasks"
  ON agent_daily_tasks FOR SELECT
  USING (auth.uid() = agent_id OR auth.uid() IN (
    SELECT id FROM profiles WHERE org_id = agent_daily_tasks.org_id AND role IN ('admin','owner')
  ));

CREATE POLICY "agents can manage own tasks"
  ON agent_daily_tasks FOR ALL
  USING (auth.uid() = agent_id OR auth.uid() IN (
    SELECT id FROM profiles WHERE org_id = agent_daily_tasks.org_id AND role IN ('admin','owner')
  ));

CREATE INDEX agent_daily_tasks_agent_date_idx ON agent_daily_tasks(agent_id, task_date);
CREATE INDEX agent_daily_tasks_pending_idx ON agent_daily_tasks(agent_id, task_date) WHERE status = 'pending';

-- ── 7. Alterations to call_logs ─────────────────────────────────────────────
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS transcription_text text;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS transcription_status text DEFAULT 'none';
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS analysis_status text DEFAULT 'none';
