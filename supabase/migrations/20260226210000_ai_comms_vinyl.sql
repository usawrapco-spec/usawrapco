-- ── AI Communication Hub + V.I.N.Y.L. Companion ──────────────────────────────

-- Mark messages sent by AI
ALTER TABLE conversation_messages
  ADD COLUMN IF NOT EXISTS sent_by_ai boolean DEFAULT false;

-- ── AI Comm Rules ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_comm_rules (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid        REFERENCES orgs(id),
  name                    text        NOT NULL,
  trigger_type            text        NOT NULL,
  -- 'missed_call' | 'new_lead' | 'no_response_24h' | 'no_response_48h'
  -- 'new_sms_inbound' | 'estimate_viewed' | 'proposal_viewed'
  -- 'deposit_paid' | 'job_complete' | 'keyword_match'
  trigger_config          jsonb       DEFAULT '{}'::jsonb,
  enabled                 boolean     DEFAULT true,
  ai_enabled              boolean     DEFAULT true,
  ai_persona              text        DEFAULT 'professional',
  -- 'professional' | 'friendly' | 'hype' | 'brief'
  ai_goal                 text        DEFAULT 'qualify',
  -- 'qualify' | 'book' | 'send_proposal' | 'just_respond'
  ai_context              text,
  max_ai_turns            int         DEFAULT 5,
  escalate_on_keywords    jsonb       DEFAULT '["angry","refund","cancel","lawsuit","manager"]'::jsonb,
  response_delay_minutes  int         DEFAULT 0,
  send_channel            text        DEFAULT 'sms',
  created_by              uuid        REFERENCES profiles(id),
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

-- ── Per-conversation AI overrides ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_ai_config (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        REFERENCES conversations(id) UNIQUE,
  ai_enabled      boolean     DEFAULT true,
  ai_persona      text        DEFAULT 'professional',
  ai_goal         text        DEFAULT 'qualify',
  ai_context      text,
  max_turns       int         DEFAULT 5,
  turns_used      int         DEFAULT 0,
  paused_by       uuid        REFERENCES profiles(id),
  paused_at       timestamptz,
  updated_at      timestamptz DEFAULT now()
);

-- ── AI message audit log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_message_log (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid        REFERENCES orgs(id),
  conversation_id     uuid        REFERENCES conversations(id),
  message_id          uuid,
  rule_id             uuid        REFERENCES ai_comm_rules(id),
  trigger_type        text,
  model_used          text,
  prompt_tokens       int,
  completion_tokens   int,
  response_text       text,
  customer_replied    boolean     DEFAULT false,
  customer_reply_text text,
  outcome             text,
  -- 'booked' | 'qualified' | 'escalated' | 'no_reply' | 'human_override'
  created_at          timestamptz DEFAULT now()
);

-- ── V.I.N.Y.L. companion state per user ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS vinyl_companion_state (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        REFERENCES profiles(id) UNIQUE,
  position_x           int         DEFAULT 95,
  position_y           int         DEFAULT 85,
  is_minimized         boolean     DEFAULT false,
  personality          text        DEFAULT 'hype',
  mood                 text        DEFAULT 'ready',
  notification_count   int         DEFAULT 0,
  last_proactive_at    timestamptz,
  preferences          jsonb       DEFAULT '{
    "proactive_tips": true,
    "celebrate_wins": true,
    "alert_on_lead": true,
    "sound_enabled": false,
    "auto_expand_on_alert": true
  }'::jsonb,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- ── V.I.N.Y.L. context/action log ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vinyl_context_log (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        REFERENCES profiles(id),
  page_path      text,
  page_context   jsonb,
  action         text,
  vinyl_message  text,
  created_at     timestamptz DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE ai_comm_rules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_message_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE vinyl_companion_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE vinyl_context_log     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_comm_rules_org"   ON ai_comm_rules
  FOR ALL USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid);

CREATE POLICY "conv_ai_config_all"  ON conversation_ai_config
  FOR ALL USING (true);

CREATE POLICY "ai_message_log_org"  ON ai_message_log
  FOR ALL USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid);

CREATE POLICY "vinyl_state_own"     ON vinyl_companion_state
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "vinyl_context_own"   ON vinyl_context_log
  FOR ALL USING (user_id = auth.uid());

-- ── Seed default AI rules ─────────────────────────────────────────────────────
INSERT INTO ai_comm_rules
  (org_id, name, trigger_type, ai_enabled, ai_persona, ai_goal, ai_context, max_ai_turns, response_delay_minutes)
VALUES
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f',
   'Missed Call Auto-Text', 'missed_call',
   true, 'friendly', 'book',
   'We just missed their call. Be apologetic, say we will call back shortly, and ask if they want to text their vehicle info so we can be ready. We are USA Wrap Co in Gig Harbor — we do vehicle wraps, PPF, and marine decking.',
   3, 0),

  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f',
   'New Inbound Lead', 'new_lead',
   true, 'hype', 'qualify',
   'New lead just came in. Be energetic and welcoming. Ask about their vehicle (year/make/model), what service they are interested in, and their timeline. We are USA Wrap Co — wraps, PPF, DekWave marine decking. Based in Gig Harbor WA, serving the whole PNW.',
   5, 0),

  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f',
   '24hr No Response Follow-Up', 'no_response_24h',
   true, 'friendly', 'book',
   'We sent them a message 24 hours ago and they have not replied. Follow up casually — not salesy. Just check in, mention we have availability coming up, and make it easy to respond.',
   2, 1440),

  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f',
   'Proposal Viewed — Not Accepted', 'proposal_viewed',
   true, 'professional', 'book',
   'Customer just viewed their proposal but has not accepted yet. Send a friendly message asking if they have any questions about the packages. Mention the deposit is only $250 to lock in their spot.',
   3, 30),

  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f',
   'Job Complete — Review Request', 'job_complete',
   true, 'friendly', 'just_respond',
   'Job is done! Thank them, tell them their photos are ready in the portal, and ask them to leave a Google review. Keep it warm and personal. Do not be pushy.',
   1, 1440)

ON CONFLICT DO NOTHING;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_comm_rules_org_trigger
  ON ai_comm_rules (org_id, trigger_type) WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_ai_message_log_conv
  ON ai_message_log (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conv_ai_config_conv
  ON conversation_ai_config (conversation_id);
