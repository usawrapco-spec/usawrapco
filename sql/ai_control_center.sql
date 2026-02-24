-- ════════════════════════════════════════════════════════════════════════════
-- AI CONTROL CENTER — DATABASE TABLES
-- ════════════════════════════════════════════════════════════════════════════

-- AI Pipeline Configuration Table
CREATE TABLE IF NOT EXISTS ai_pipeline_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES orgs(id) ON DELETE CASCADE,
  pipeline_step text NOT NULL,
  step_label text NOT NULL,
  primary_model text NOT NULL,
  fallback_model text,
  api_provider text NOT NULL,
  api_key_ref text,
  model_params jsonb DEFAULT '{}',
  enabled boolean DEFAULT true,
  cost_per_call decimal(10,4) DEFAULT 0,
  avg_latency_ms int DEFAULT 0,
  success_rate decimal(5,2) DEFAULT 100,
  total_calls int DEFAULT 0,
  total_cost decimal(10,2) DEFAULT 0,
  last_used timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, pipeline_step)
);

ALTER TABLE ai_pipeline_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON ai_pipeline_config;
CREATE POLICY "org_access" ON ai_pipeline_config
  FOR ALL
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_pipeline_config_org_step ON ai_pipeline_config(org_id, pipeline_step);

-- AI Usage Log Table
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES orgs(id) ON DELETE CASCADE,
  pipeline_step text NOT NULL,
  model_used text NOT NULL,
  provider text NOT NULL,
  prompt_preview text,
  success boolean DEFAULT true,
  error_message text,
  latency_ms int,
  cost decimal(10,4) DEFAULT 0,
  input_tokens int,
  output_tokens int,
  result_urls jsonb DEFAULT '[]',
  project_id uuid,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON ai_usage_log;
CREATE POLICY "org_access" ON ai_usage_log
  FOR ALL
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_org_created ON ai_usage_log(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_step ON ai_usage_log(pipeline_step);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_project ON ai_usage_log(project_id);

-- Function to update pipeline stats
CREATE OR REPLACE FUNCTION update_pipeline_stats(
  p_org_id uuid,
  p_step text,
  p_cost decimal,
  p_latency int,
  p_success boolean
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_calls int;
  v_success_count int;
  v_total_latency bigint;
BEGIN
  -- Get current stats
  SELECT
    total_calls,
    ROUND((success_rate / 100) * total_calls) as success_count,
    avg_latency_ms * total_calls as total_latency
  INTO v_total_calls, v_success_count, v_total_latency
  FROM ai_pipeline_config
  WHERE org_id = p_org_id AND pipeline_step = p_step;

  -- Calculate new averages
  v_total_calls := COALESCE(v_total_calls, 0) + 1;
  v_success_count := COALESCE(v_success_count, 0) + CASE WHEN p_success THEN 1 ELSE 0 END;
  v_total_latency := COALESCE(v_total_latency, 0) + p_latency;

  -- Update stats
  UPDATE ai_pipeline_config
  SET
    total_calls = v_total_calls,
    total_cost = COALESCE(total_cost, 0) + p_cost,
    avg_latency_ms = v_total_latency / v_total_calls,
    success_rate = (v_success_count::decimal / v_total_calls) * 100,
    last_used = now(),
    updated_at = now()
  WHERE org_id = p_org_id AND pipeline_step = p_step;

  -- If no row exists, do nothing (will be created by seed data)
END;
$$;

COMMENT ON TABLE ai_pipeline_config IS 'Stores AI model configuration for each pipeline step per organization';
COMMENT ON TABLE ai_usage_log IS 'Logs every AI API call with cost, latency, and results';
COMMENT ON FUNCTION update_pipeline_stats IS 'Updates aggregate statistics for pipeline steps';
