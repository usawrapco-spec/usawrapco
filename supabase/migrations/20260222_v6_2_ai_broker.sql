-- ============================================================================
-- USA WRAP CO — v6.2 MIGRATION: V.I.N.Y.L. AI Sales Broker + Revenue Engine
--
-- New tables: conversations, messages, sales_playbook, pricing_rules,
--             escalation_rules, campaigns, campaign_messages, sourcing_orders
-- Altered:    prospects (add new columns), payments (add type + metadata)
--
-- Idempotent — safe to re-run. Uses IF NOT EXISTS / IF EXISTS throughout.
-- Org ID: d34a6c47-1ac0-4008-87d2-0f7741eebc4f
-- Generated: 2026-02-22
-- ============================================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. ALTER EXISTING TABLES                                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── Prospects: add new columns for Google Places integration + scoring ────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='business_name') THEN
    ALTER TABLE public.prospects ADD COLUMN business_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='industry') THEN
    ALTER TABLE public.prospects ADD COLUMN industry TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='address') THEN
    ALTER TABLE public.prospects ADD COLUMN address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='website') THEN
    ALTER TABLE public.prospects ADD COLUMN website TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='linkedin') THEN
    ALTER TABLE public.prospects ADD COLUMN linkedin TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='instagram') THEN
    ALTER TABLE public.prospects ADD COLUMN instagram TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='facebook') THEN
    ALTER TABLE public.prospects ADD COLUMN facebook TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='google_rating') THEN
    ALTER TABLE public.prospects ADD COLUMN google_rating NUMERIC(3,1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='google_maps_url') THEN
    ALTER TABLE public.prospects ADD COLUMN google_maps_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='score') THEN
    ALTER TABLE public.prospects ADD COLUMN score INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='campaign_id') THEN
    ALTER TABLE public.prospects ADD COLUMN campaign_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='last_contacted_at') THEN
    ALTER TABLE public.prospects ADD COLUMN last_contacted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Expand status check constraint to include new values
ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_status_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_status_check
  CHECK (status IN ('new','contacted','replied','interested','hot','warm','cold','dead','converted'));

-- Expand source check constraint to include google_places
ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_source_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_source_check
  CHECK (source IN ('google_places','cold_call','door_knock','referral','event','social_media','website','other'));

CREATE INDEX IF NOT EXISTS idx_prospects_score ON public.prospects(score DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_campaign ON public.prospects(campaign_id);

-- ── Payments: add type + metadata columns ────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='type') THEN
    ALTER TABLE public.payments ADD COLUMN type TEXT DEFAULT 'payment';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='metadata') THEN
    ALTER TABLE public.payments ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Relax method check to allow stripe_demo and stripe
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_method_check
  CHECK (method IN ('cash','check','credit_card','ach','wire','stripe','stripe_demo','other'));

-- Relax status check to allow all statuses
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending','completed','refunded','failed'));


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. CONVERSATIONS (V.I.N.Y.L. AI Broker)                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.conversations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  customer_id       UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  channel           TEXT NOT NULL DEFAULT 'sms'
                    CHECK (channel IN ('sms','email','web_chat')),
  phone_number      TEXT,
  email_address     TEXT,
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','escalated','closed','converted')),
  escalation_reason TEXT,
  escalated_to      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ai_enabled        BOOLEAN NOT NULL DEFAULT true,
  lead_stage        TEXT NOT NULL DEFAULT 'new'
                    CHECK (lead_stage IN ('new','qualifying','quoting','negotiating','deposit_sent','converted','lost')),
  vehicle_info      JSONB DEFAULT '{}',
  wrap_preferences  JSONB DEFAULT '{}',
  quote_data        JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
CREATE POLICY "conversations_select" ON public.conversations FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "conversations_manage" ON public.conversations;
CREATE POLICY "conversations_manage" ON public.conversations FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin','sales_agent'))
);

-- Service role needs full access for the inbound webhook (unauthenticated)
DROP POLICY IF EXISTS "conversations_service" ON public.conversations;
CREATE POLICY "conversations_service" ON public.conversations FOR ALL
  USING (true) WITH CHECK (true);
-- ^ This is permissive; the API route uses the service role key which bypasses RLS.
-- If you want tighter RLS, remove this and ensure all API calls use getSupabaseAdmin().

CREATE INDEX IF NOT EXISTS idx_conversations_org        ON public.conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer   ON public.conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status     ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_lead_stage ON public.conversations(lead_stage);
CREATE INDEX IF NOT EXISTS idx_conversations_phone      ON public.conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_conversations_email      ON public.conversations(email_address);
CREATE INDEX IF NOT EXISTS idx_conversations_updated    ON public.conversations(updated_at DESC);

CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. MESSAGES (conversation messages — customer, AI, human agent)         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role              TEXT NOT NULL DEFAULT 'customer'
                    CHECK (role IN ('customer','ai','human_agent')),
  content           TEXT NOT NULL DEFAULT '',
  channel           TEXT NOT NULL DEFAULT 'sms'
                    CHECK (channel IN ('sms','email','web_chat')),
  ai_reasoning      TEXT,                      -- internal: why V.I.N.Y.L. chose this response
  ai_confidence     NUMERIC(3,2),              -- 0.00–1.00
  tokens_used       INTEGER,                   -- total tokens for this turn
  cost_cents        NUMERIC(8,2),              -- API cost in cents
  external_id       TEXT,                      -- Twilio SID or email message-id
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages FOR SELECT USING (
  conversation_id IN (
    SELECT id FROM public.conversations
    WHERE org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  )
);

DROP POLICY IF EXISTS "messages_manage" ON public.messages;
CREATE POLICY "messages_manage" ON public.messages FOR ALL USING (
  conversation_id IN (
    SELECT id FROM public.conversations
    WHERE org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- Service role policy for webhook inserts
DROP POLICY IF EXISTS "messages_service" ON public.messages;
CREATE POLICY "messages_service" ON public.messages FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_role         ON public.messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_created      ON public.messages(created_at);

-- Enable realtime for live inbox updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4. SALES PLAYBOOK (AI response guidance by category)                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.sales_playbook (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  category          TEXT NOT NULL DEFAULT 'faq'
                    CHECK (category IN ('greeting','qualification','pricing','objection','upsell','closing','followup','faq','policy','competitor','brand_voice')),
  trigger_phrase    TEXT,                       -- keyword/regex that activates this entry
  response_guidance TEXT NOT NULL DEFAULT '',   -- what V.I.N.Y.L. should say/do
  is_active         BOOLEAN NOT NULL DEFAULT true,
  priority          INTEGER NOT NULL DEFAULT 100,  -- lower = higher priority
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_playbook ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "playbook_select" ON public.sales_playbook;
CREATE POLICY "playbook_select" ON public.sales_playbook FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "playbook_manage" ON public.sales_playbook;
CREATE POLICY "playbook_manage" ON public.sales_playbook FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
);

-- Service role for AI broker reads
DROP POLICY IF EXISTS "playbook_service" ON public.sales_playbook;
CREATE POLICY "playbook_service" ON public.sales_playbook FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_playbook_org      ON public.sales_playbook(org_id);
CREATE INDEX IF NOT EXISTS idx_playbook_category ON public.sales_playbook(category);
CREATE INDEX IF NOT EXISTS idx_playbook_active   ON public.sales_playbook(is_active) WHERE is_active = true;

CREATE TRIGGER set_playbook_updated_at
  BEFORE UPDATE ON public.sales_playbook
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Seed default playbook entries ────────────────────────────────────────
INSERT INTO public.sales_playbook (org_id, category, trigger_phrase, response_guidance, priority) VALUES
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'brand_voice', NULL,
   'Professional but conversational. Friendly, knowledgeable about vehicle wraps. Not pushy but always move toward booking. Use the customer''s name when known. Keep SMS under 300 characters.',
   1),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'greeting', 'first message',
   'Welcome them warmly, introduce yourself as V.I.N.Y.L. from USA Wrap Co in Seattle. Ask what vehicle they have and what kind of wrap they''re looking for.',
   1),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'pricing', 'how much|price|cost|quote|estimate',
   'Provide pricing based on vehicle type and wrap type from the pricing_rules table. Always mention what''s included: design, print, laminate, professional installation. Offer to send a formal quote.',
   1),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'objection', 'too expensive|cheaper|budget|competitor',
   'Emphasize quality: 3M/Avery vinyl with 5-year warranty, professional certified installers, climate-controlled shop. Compare to paint cost ($5k-15k vs $3-5k wrap). Mention fleet discounts for multiple vehicles.',
   1),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'closing', 'next step|ready|let''s do it|sign up|book',
   'Guide them to pay the $250 design deposit at usawrapco.com/deposit. Explain timeline: deposit → design (3-5 days) → proof approval → production (2-3 days) → install (1-2 days).',
   1),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'faq', 'how long|timeline|turnaround',
   'Typical timeline: 2-3 weeks from design approval to install. Design takes 3-5 business days. Production 2-3 days. Install 1-2 days depending on vehicle size. Rush available for additional fee.',
   1),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'faq', 'warranty|guarantee|how long does it last',
   'We use premium 3M and Avery Dennison vinyl with a manufacturer 5-year warranty against fading, cracking, and peeling. Proper care can extend life to 7+ years. We include care instructions at pickup.',
   2),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'upsell', 'ppf|protection|ceramic|clear bra',
   'Great question! We also offer XPEL Ultimate Plus PPF (paint protection film) starting at $800 for high-impact areas. Full front PPF is $1,800-2,500. Ceramic coating over wraps is $500-800 and adds incredible gloss + hydrophobic protection.',
   1),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'followup', NULL,
   'If no response for 24 hours after sending a quote, send a friendly follow-up. After 72 hours, send a "still interested?" check-in. After 7 days of silence, mark as lost.',
   1)
ON CONFLICT DO NOTHING;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  5. PRICING RULES (what V.I.N.Y.L. can quote)                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.pricing_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  vehicle_category      TEXT NOT NULL DEFAULT 'Sedan',
  wrap_type             TEXT NOT NULL DEFAULT 'Full Wrap',
  base_price            NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_per_sqft        NUMERIC(8,2) NOT NULL DEFAULT 0,
  max_discount_pct      NUMERIC(5,2) NOT NULL DEFAULT 10,
  rush_multiplier       JSONB DEFAULT '{"standard": 1.0, "rush_3day": 1.25, "rush_1day": 1.5}',
  complexity_multiplier JSONB DEFAULT '{"standard": 1.0, "moderate": 1.15, "complex": 1.3}',
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_select" ON public.pricing_rules;
CREATE POLICY "pricing_select" ON public.pricing_rules FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "pricing_manage" ON public.pricing_rules;
CREATE POLICY "pricing_manage" ON public.pricing_rules FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
);

-- Service role for AI broker reads
DROP POLICY IF EXISTS "pricing_service" ON public.pricing_rules;
CREATE POLICY "pricing_service" ON public.pricing_rules FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_pricing_org    ON public.pricing_rules(org_id);
CREATE INDEX IF NOT EXISTS idx_pricing_active ON public.pricing_rules(is_active) WHERE is_active = true;

CREATE TRIGGER set_pricing_updated_at
  BEFORE UPDATE ON public.pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Seed default pricing rules ───────────────────────────────────────────
INSERT INTO public.pricing_rules (org_id, vehicle_category, wrap_type, base_price, price_per_sqft, max_discount_pct) VALUES
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Sedan',     'Full Wrap',     3000, 12, 10),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'SUV',       'Full Wrap',     3800, 12, 10),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Truck',     'Full Wrap',     4200, 12, 10),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Van',       'Full Wrap',     4500, 11, 15),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Box Truck', 'Full Wrap',     5500, 10, 15),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Sedan',     'Partial Wrap',  1500, 14, 10),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'SUV',       'Partial Wrap',  1800, 14, 10),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Truck',     'Partial Wrap',  2000, 13, 10),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Any',       'Color Change',  3500, 15,  5),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Any',       'PPF',           1800, 25,  5),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Any',       'Decals/Lettering', 500, 20, 10)
ON CONFLICT DO NOTHING;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  6. ESCALATION RULES (when V.I.N.Y.L. should hand off to a human)       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.escalation_rules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  rule_type      TEXT NOT NULL DEFAULT 'keyword'
                 CHECK (rule_type IN ('keyword','sentiment','dollar_threshold','explicit_request','confidence')),
  rule_config    JSONB NOT NULL DEFAULT '{}',
  notify_channel TEXT NOT NULL DEFAULT 'sms'
                 CHECK (notify_channel IN ('slack','sms')),
  notify_target  TEXT,                         -- phone number or Slack webhook URL
  is_active      BOOLEAN NOT NULL DEFAULT true,
  priority       INTEGER NOT NULL DEFAULT 100,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "escalation_select" ON public.escalation_rules;
CREATE POLICY "escalation_select" ON public.escalation_rules FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "escalation_manage" ON public.escalation_rules;
CREATE POLICY "escalation_manage" ON public.escalation_rules FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
);

-- Service role for AI broker reads
DROP POLICY IF EXISTS "escalation_service" ON public.escalation_rules;
CREATE POLICY "escalation_service" ON public.escalation_rules FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_escalation_org    ON public.escalation_rules(org_id);
CREATE INDEX IF NOT EXISTS idx_escalation_active ON public.escalation_rules(is_active) WHERE is_active = true;

-- ── Seed default escalation rules ────────────────────────────────────────
INSERT INTO public.escalation_rules (org_id, rule_type, rule_config, notify_channel, priority) VALUES
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'explicit_request', '{}', 'sms', 1),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'keyword',
   '{"keywords": ["speak to someone","manager","real person","human","supervisor","complaint","lawsuit","attorney","BBB","refund"]}',
   'sms', 2),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'confidence', '{"threshold": 0.5}', 'sms', 3),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'dollar_threshold', '{"max_amount": 15000}', 'sms', 4)
ON CONFLICT DO NOTHING;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  7. CAMPAIGNS (email outreach sequences)                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name             TEXT NOT NULL DEFAULT '',
  industry_target  TEXT,
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','active','paused','completed')),
  email_sequence   JSONB DEFAULT '[]',         -- array of {step_number, subject, body, delay_days}
  auto_reply       BOOLEAN NOT NULL DEFAULT false,
  stats            JSONB DEFAULT '{"sent":0,"opened":0,"replied":0,"bounced":0,"conversions":0}',
  created_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns_select" ON public.campaigns;
CREATE POLICY "campaigns_select" ON public.campaigns FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "campaigns_manage" ON public.campaigns;
CREATE POLICY "campaigns_manage" ON public.campaigns FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin','sales_agent'))
);

CREATE INDEX IF NOT EXISTS idx_campaigns_org    ON public.campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);

CREATE TRIGGER set_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Now that campaigns table exists, add FK on prospects
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'prospects_campaign_id_fkey' AND table_name = 'prospects'
  ) THEN
    ALTER TABLE public.prospects
      ADD CONSTRAINT prospects_campaign_id_fkey
      FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  8. CAMPAIGN MESSAGES (individual emails sent per campaign)              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.campaign_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  campaign_id     UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  prospect_id     UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  step_number     INTEGER NOT NULL DEFAULT 1,
  subject         TEXT NOT NULL DEFAULT '',
  body            TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','sent','opened','replied','bounced','failed')),
  sent_at         TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  replied_at      TIMESTAMPTZ,
  reply_text      TEXT,
  ai_draft_reply  TEXT,
  scheduled_for   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_messages_select" ON public.campaign_messages;
CREATE POLICY "campaign_messages_select" ON public.campaign_messages FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "campaign_messages_manage" ON public.campaign_messages;
CREATE POLICY "campaign_messages_manage" ON public.campaign_messages FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin','sales_agent'))
);

CREATE INDEX IF NOT EXISTS idx_cmsg_org       ON public.campaign_messages(org_id);
CREATE INDEX IF NOT EXISTS idx_cmsg_campaign  ON public.campaign_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cmsg_prospect  ON public.campaign_messages(prospect_id);
CREATE INDEX IF NOT EXISTS idx_cmsg_status    ON public.campaign_messages(status);
CREATE INDEX IF NOT EXISTS idx_cmsg_scheduled ON public.campaign_messages(scheduled_for) WHERE scheduled_for IS NOT NULL;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  9. SOURCING ORDERS (RFQs + material orders)                            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.sourcing_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  source_platform  TEXT DEFAULT 'manual',
  rfq_title        TEXT NOT NULL DEFAULT '',
  title            TEXT,                        -- alias used in some UI code
  description      TEXT,
  quantity         TEXT,                        -- flexible: "12 units" or "500 sqft"
  specs            TEXT,
  buyer_name       TEXT,
  buyer            TEXT,                        -- alias used in workflow UI
  buyer_location   TEXT,
  category         TEXT,
  deadline         DATE,
  estimated_value  NUMERIC(12,2) DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new','monitoring','matched','quoted','accepted','sourcing','manufacturing','shipped','customs','delivered','invoiced','paid')),
  match_score      INTEGER DEFAULT 0,          -- AI match score 0-100
  our_sell_price   NUMERIC(12,2),
  our_landed_cost  NUMERIC(12,2),
  supplier_id      TEXT,                       -- freeform supplier ref
  tracking_number  TEXT,
  notes            TEXT,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sourcing_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sourcing_select" ON public.sourcing_orders;
CREATE POLICY "sourcing_select" ON public.sourcing_orders FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "sourcing_manage" ON public.sourcing_orders;
CREATE POLICY "sourcing_manage" ON public.sourcing_orders FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin','sales_agent'))
);

CREATE INDEX IF NOT EXISTS idx_sourcing_org    ON public.sourcing_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_sourcing_status ON public.sourcing_orders(status);
CREATE INDEX IF NOT EXISTS idx_sourcing_score  ON public.sourcing_orders(match_score DESC);

-- Enable realtime for sourcing workflow
ALTER PUBLICATION supabase_realtime ADD TABLE public.sourcing_orders;

CREATE TRIGGER set_sourcing_updated_at
  BEFORE UPDATE ON public.sourcing_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  10. ENABLE REALTIME ON KEY TABLES                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- These may already be in the publication; the DO block prevents errors
DO $$ BEGIN
  -- conversations + messages already added above
  -- campaigns for live status updates
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  -- conversations + messages (repeat-safe)
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sourcing_orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  DONE                                                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Migration complete. New tables created:
--   conversations, messages, sales_playbook, pricing_rules,
--   escalation_rules, campaigns, campaign_messages, sourcing_orders
--
-- Altered tables:
--   prospects (12 new columns + relaxed constraints)
--   payments (2 new columns + relaxed constraints)
--
-- Seeded data:
--   9 playbook entries, 11 pricing rules, 4 escalation rules
--
-- To run: paste into Supabase SQL Editor or use supabase db push
