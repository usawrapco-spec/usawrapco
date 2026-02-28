-- ── Job Detail Enhancements: connections, proofs, proof versions, proof messages ──

-- ── 1. job_connections ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES orgs(id) ON DELETE CASCADE,
  job_a uuid REFERENCES projects(id) ON DELETE CASCADE,
  job_b uuid REFERENCES projects(id) ON DELETE CASCADE,
  connection_type text DEFAULT 'fleet_package',
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_a, job_b)
);

CREATE INDEX IF NOT EXISTS idx_job_connections_job_a ON job_connections(job_a);
CREATE INDEX IF NOT EXISTS idx_job_connections_job_b ON job_connections(job_b);
CREATE INDEX IF NOT EXISTS idx_job_connections_org ON job_connections(org_id);

ALTER TABLE job_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_connections_select" ON job_connections
  FOR SELECT USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "job_connections_insert" ON job_connections
  FOR INSERT WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "job_connections_delete" ON job_connections
  FOR DELETE USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1));

-- ── 2. job_proofs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES orgs(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  proof_number int NOT NULL DEFAULT 1,
  title text NOT NULL DEFAULT 'Design Proof',
  status text DEFAULT 'draft' CHECK (status IN ('draft','sent','approved','rejected','revision_requested')),
  current_version int DEFAULT 1,
  sent_at timestamptz,
  approved_at timestamptz,
  approved_by text,
  customer_notes text,
  internal_notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_proofs_project ON job_proofs(project_id);
CREATE INDEX IF NOT EXISTS idx_job_proofs_org ON job_proofs(org_id);

ALTER TABLE job_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_proofs_select" ON job_proofs
  FOR SELECT USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "job_proofs_insert" ON job_proofs
  FOR INSERT WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "job_proofs_update" ON job_proofs
  FOR UPDATE USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "job_proofs_delete" ON job_proofs
  FOR DELETE USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1));

-- ── 3. job_proof_versions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_proof_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id uuid REFERENCES job_proofs(id) ON DELETE CASCADE,
  org_id uuid REFERENCES orgs(id) ON DELETE CASCADE,
  version_number int NOT NULL DEFAULT 1,
  file_url text,
  file_name text,
  file_type text,
  thumbnail_url text,
  notes text,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_proof_versions_proof ON job_proof_versions(proof_id);
CREATE INDEX IF NOT EXISTS idx_job_proof_versions_org ON job_proof_versions(org_id);

ALTER TABLE job_proof_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_proof_versions_select" ON job_proof_versions
  FOR SELECT USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "job_proof_versions_insert" ON job_proof_versions
  FOR INSERT WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "job_proof_versions_delete" ON job_proof_versions
  FOR DELETE USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1));

-- ── 4. job_proof_messages ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_proof_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id uuid REFERENCES job_proofs(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  org_id uuid REFERENCES orgs(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id),
  sender_type text DEFAULT 'internal' CHECK (sender_type IN ('internal','customer')),
  sender_name text,
  content text NOT NULL,
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_proof_messages_proof ON job_proof_messages(proof_id);
CREATE INDEX IF NOT EXISTS idx_job_proof_messages_project ON job_proof_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_job_proof_messages_org ON job_proof_messages(org_id);

ALTER TABLE job_proof_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_proof_messages_select" ON job_proof_messages
  FOR SELECT USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "job_proof_messages_insert" ON job_proof_messages
  FOR INSERT WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "job_proof_messages_delete" ON job_proof_messages
  FOR DELETE USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1));
