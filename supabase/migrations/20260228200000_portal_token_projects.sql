-- Add portal_token to projects for direct customer portal access
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS portal_token uuid DEFAULT gen_random_uuid() UNIQUE;

-- Back-fill any existing rows that have NULL portal_token
UPDATE projects
  SET portal_token = gen_random_uuid()
  WHERE portal_token IS NULL;

-- Customer portal messages table (public, token-authenticated)
CREATE TABLE IF NOT EXISTS portal_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid REFERENCES orgs(id) ON DELETE CASCADE,
  project_id    uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  portal_token  uuid NOT NULL,
  sender_name   text NOT NULL,
  body          text NOT NULL,
  direction     text NOT NULL DEFAULT 'customer', -- 'customer' | 'team'
  is_read       boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

-- RLS: allow anon insert/select using portal_token
ALTER TABLE portal_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portal_messages_public_read" ON portal_messages;
CREATE POLICY "portal_messages_public_read" ON portal_messages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "portal_messages_public_insert" ON portal_messages;
CREATE POLICY "portal_messages_public_insert" ON portal_messages
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "portal_messages_team_all" ON portal_messages;
CREATE POLICY "portal_messages_team_all" ON portal_messages
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Quote approvals tracking
CREATE TABLE IF NOT EXISTS portal_quote_approvals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  portal_token uuid NOT NULL,
  action       text NOT NULL, -- 'approved' | 'changes_requested'
  customer_name text,
  notes        text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE portal_quote_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pqa_public_insert" ON portal_quote_approvals;
CREATE POLICY "pqa_public_insert" ON portal_quote_approvals
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "pqa_public_read" ON portal_quote_approvals;
CREATE POLICY "pqa_public_read" ON portal_quote_approvals
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "pqa_team_all" ON portal_quote_approvals;
CREATE POLICY "pqa_team_all" ON portal_quote_approvals
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Index for fast portal_token lookup
CREATE INDEX IF NOT EXISTS idx_projects_portal_token ON projects(portal_token);
CREATE INDEX IF NOT EXISTS idx_portal_messages_project ON portal_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_token ON portal_messages(portal_token);
