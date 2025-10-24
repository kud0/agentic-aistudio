-- AI Provider System Database Schema
-- This migration creates all tables needed for LLM provider abstraction, usage tracking, and analytics

-- ============================================================================
-- 1. LLM Usage Logs Table
-- ============================================================================
-- Tracks every LLM API call for cost monitoring and analytics
CREATE TABLE IF NOT EXISTS llm_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- References
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  output_id UUID REFERENCES outputs(id) ON DELETE SET NULL,

  -- Agent & Provider Info
  agent_type TEXT NOT NULL CHECK (agent_type IN ('research', 'strategy', 'critique', 'custom')),
  provider TEXT NOT NULL, -- 'grok', 'claude', 'openai'
  model TEXT NOT NULL, -- e.g., 'grok-2-latest', 'claude-3-5-sonnet-20241022'

  -- Token Usage
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,

  -- Cost & Performance
  cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0, -- Cost in USD (up to $9999.999999)
  latency_ms INTEGER, -- Response latency in milliseconds

  -- Request Details
  finish_reason TEXT CHECK (finish_reason IN ('stop', 'length', 'tool_call', 'error')),
  cached BOOLEAN DEFAULT FALSE, -- Was response served from cache?
  error_message TEXT, -- Error message if request failed

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb -- Provider-specific data
);

-- Indexes for fast queries
CREATE INDEX idx_llm_usage_logs_project_id ON llm_usage_logs(project_id);
CREATE INDEX idx_llm_usage_logs_user_id ON llm_usage_logs(user_id);
CREATE INDEX idx_llm_usage_logs_created_at ON llm_usage_logs(created_at DESC);
CREATE INDEX idx_llm_usage_logs_provider ON llm_usage_logs(provider);
CREATE INDEX idx_llm_usage_logs_agent_type ON llm_usage_logs(agent_type);
CREATE INDEX idx_llm_usage_logs_cost ON llm_usage_logs(cost_usd DESC);

-- Composite index for analytics queries
CREATE INDEX idx_llm_usage_analytics ON llm_usage_logs(user_id, created_at DESC, provider, agent_type);

-- ============================================================================
-- 2. Quality Scores Table
-- ============================================================================
-- Stores automated quality assessments for AI-generated outputs
CREATE TABLE IF NOT EXISTS quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- References
  output_id UUID NOT NULL UNIQUE REFERENCES outputs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Quality Metrics (0-100)
  completeness_score INTEGER NOT NULL CHECK (completeness_score >= 0 AND completeness_score <= 100),
  coherence_score INTEGER NOT NULL CHECK (coherence_score >= 0 AND coherence_score <= 100),
  actionability_score INTEGER NOT NULL CHECK (actionability_score >= 0 AND actionability_score <= 100),
  overall_score INTEGER NOT NULL GENERATED ALWAYS AS (
    (completeness_score + coherence_score + actionability_score) / 3
  ) STORED,

  -- Review Status
  flag_for_review BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,

  -- Scoring Details
  reasoning TEXT, -- Why this score?
  improvement_suggestions TEXT[], -- Array of suggestions

  -- Metadata
  scoring_model TEXT, -- Model used for scoring (e.g., 'claude-3-5-sonnet')
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_quality_scores_output_id ON quality_scores(output_id);
CREATE INDEX idx_quality_scores_project_id ON quality_scores(project_id);
CREATE INDEX idx_quality_scores_overall_score ON quality_scores(overall_score);
CREATE INDEX idx_quality_scores_flag_for_review ON quality_scores(flag_for_review) WHERE flag_for_review = TRUE;

-- ============================================================================
-- 3. Provider Health Table
-- ============================================================================
-- Monitors health status of LLM providers for circuit breaker logic
CREATE TABLE IF NOT EXISTS provider_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Provider Info
  provider TEXT NOT NULL UNIQUE, -- 'grok', 'claude', 'openai'
  status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'down')),

  -- Metrics (rolling 1-hour window)
  error_rate DECIMAL(5, 4) DEFAULT 0 CHECK (error_rate >= 0 AND error_rate <= 1), -- 0.0 to 1.0
  avg_latency_ms INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  total_requests INTEGER GENERATED ALWAYS AS (success_count + failure_count) STORED,

  -- Circuit Breaker State
  circuit_state TEXT NOT NULL DEFAULT 'closed' CHECK (circuit_state IN ('closed', 'open', 'half-open')),
  circuit_opened_at TIMESTAMPTZ,

  -- Last Error
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,

  -- Check Timestamp
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_provider_health_provider ON provider_health(provider);
CREATE INDEX idx_provider_health_status ON provider_health(status);
CREATE INDEX idx_provider_health_updated_at ON provider_health(updated_at DESC);

-- ============================================================================
-- 4. Response Cache Table (Optional)
-- ============================================================================
-- Caches LLM responses to reduce costs for similar requests
CREATE TABLE IF NOT EXISTS response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Cache Key (hash of prompt + system prompt + params)
  cache_key TEXT NOT NULL UNIQUE,

  -- Request Parameters
  prompt_hash TEXT NOT NULL, -- SHA-256 hash of prompt
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  temperature DECIMAL(3, 2),

  -- Response Data
  content TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost_usd DECIMAL(10, 6) NOT NULL,

  -- Usage Stats
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_response_cache_cache_key ON response_cache(cache_key);
CREATE INDEX idx_response_cache_expires_at ON response_cache(expires_at);
CREATE INDEX idx_response_cache_prompt_hash ON response_cache(prompt_hash);

-- Note: No partial index with NOW() - it's not IMMUTABLE
-- The cleanup function will use idx_response_cache_expires_at for efficient cleanup

-- ============================================================================
-- 5. Budget Views
-- ============================================================================
-- View for tracking project budgets
CREATE OR REPLACE VIEW project_budgets AS
SELECT
  p.id AS project_id,
  p.title AS project_name,  -- Fixed: projects table has 'title', not 'name'
  p.user_id,
  COUNT(l.id) AS total_requests,
  SUM(l.cost_usd) AS total_cost,
  SUM(l.total_tokens) AS total_tokens,
  MAX(l.created_at) AS last_request_at,
  -- Cost breakdown by provider
  SUM(CASE WHEN l.provider = 'grok' THEN l.cost_usd ELSE 0 END) AS grok_cost,
  SUM(CASE WHEN l.provider = 'claude' THEN l.cost_usd ELSE 0 END) AS claude_cost,
  SUM(CASE WHEN l.provider = 'openai' THEN l.cost_usd ELSE 0 END) AS openai_cost,
  -- Cost breakdown by agent type
  SUM(CASE WHEN l.agent_type = 'research' THEN l.cost_usd ELSE 0 END) AS research_cost,
  SUM(CASE WHEN l.agent_type = 'strategy' THEN l.cost_usd ELSE 0 END) AS strategy_cost,
  SUM(CASE WHEN l.agent_type = 'critique' THEN l.cost_usd ELSE 0 END) AS critique_cost
FROM projects p
LEFT JOIN llm_usage_logs l ON l.project_id = p.id
GROUP BY p.id, p.title, p.user_id;  -- Fixed: projects table has 'title', not 'name'

-- View for tracking user budgets (30-day rolling)
CREATE OR REPLACE VIEW user_budgets AS
SELECT
  u.id AS user_id,
  u.email,
  COUNT(l.id) AS total_requests,
  SUM(l.cost_usd) AS total_cost_30d,
  SUM(l.total_tokens) AS total_tokens_30d,
  MAX(l.created_at) AS last_request_at,
  -- Daily average
  SUM(l.cost_usd) / NULLIF(EXTRACT(DAY FROM (NOW() - MIN(l.created_at))), 0) AS avg_daily_cost
FROM auth.users u
LEFT JOIN llm_usage_logs l ON l.user_id = u.id
  AND l.created_at >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.email;

-- View for expensive prompts (top 10 most costly requests)
CREATE OR REPLACE VIEW expensive_prompts AS
SELECT
  l.id,
  l.created_at,
  l.project_id,
  p.title AS project_name,  -- Fixed: projects table has 'title', not 'name'
  l.agent_type,
  l.provider,
  l.model,
  l.cost_usd,
  l.total_tokens,
  l.latency_ms,
  l.cached
FROM llm_usage_logs l
JOIN projects p ON p.id = l.project_id
ORDER BY l.cost_usd DESC
LIMIT 100;

-- ============================================================================
-- 6. Row-Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE llm_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_cache ENABLE ROW LEVEL SECURITY;

-- LLM Usage Logs Policies
CREATE POLICY "Users can view their own usage logs"
  ON llm_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage logs"
  ON llm_usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Quality Scores Policies
CREATE POLICY "Users can view quality scores for their projects"
  ON quality_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = quality_scores.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert quality scores"
  ON quality_scores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = quality_scores.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- Provider Health Policies (public read, system write)
CREATE POLICY "Anyone can view provider health"
  ON provider_health FOR SELECT
  USING (TRUE);

CREATE POLICY "Only service role can update provider health"
  ON provider_health FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Response Cache Policies (system only)
CREATE POLICY "Only service role can access cache"
  ON response_cache FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- 7. Functions & Triggers
-- ============================================================================

-- Function to update provider health based on recent logs
CREATE OR REPLACE FUNCTION update_provider_health()
RETURNS TRIGGER AS $$
DECLARE
  v_provider TEXT := NEW.provider;
  v_error_rate DECIMAL;
  v_avg_latency INTEGER;
  v_success_count INTEGER;
  v_failure_count INTEGER;
BEGIN
  -- Calculate metrics for last hour
  SELECT
    AVG(CASE WHEN finish_reason = 'error' THEN 1.0 ELSE 0.0 END),
    AVG(latency_ms)::INTEGER,
    COUNT(*) FILTER (WHERE finish_reason != 'error'),
    COUNT(*) FILTER (WHERE finish_reason = 'error')
  INTO v_error_rate, v_avg_latency, v_success_count, v_failure_count
  FROM llm_usage_logs
  WHERE provider = v_provider
    AND created_at >= NOW() - INTERVAL '1 hour';

  -- Upsert provider health
  INSERT INTO provider_health (
    provider,
    error_rate,
    avg_latency_ms,
    success_count,
    failure_count,
    status,
    circuit_state,
    last_checked_at,
    last_error,
    last_error_at,
    last_success_at
  )
  VALUES (
    v_provider,
    COALESCE(v_error_rate, 0),
    COALESCE(v_avg_latency, 0),
    COALESCE(v_success_count, 0),
    COALESCE(v_failure_count, 0),
    CASE
      WHEN v_error_rate > 0.5 THEN 'down'
      WHEN v_error_rate > 0.2 THEN 'degraded'
      ELSE 'healthy'
    END,
    CASE
      WHEN v_error_rate > 0.5 THEN 'open'
      WHEN v_error_rate > 0.2 THEN 'half-open'
      ELSE 'closed'
    END,
    NOW(),
    CASE WHEN NEW.finish_reason = 'error' THEN NEW.error_message END,
    CASE WHEN NEW.finish_reason = 'error' THEN NEW.created_at END,
    CASE WHEN NEW.finish_reason != 'error' THEN NEW.created_at END
  )
  ON CONFLICT (provider)
  DO UPDATE SET
    error_rate = EXCLUDED.error_rate,
    avg_latency_ms = EXCLUDED.avg_latency_ms,
    success_count = EXCLUDED.success_count,
    failure_count = EXCLUDED.failure_count,
    status = EXCLUDED.status,
    circuit_state = EXCLUDED.circuit_state,
    last_checked_at = EXCLUDED.last_checked_at,
    last_error = COALESCE(EXCLUDED.last_error, provider_health.last_error),
    last_error_at = COALESCE(EXCLUDED.last_error_at, provider_health.last_error_at),
    last_success_at = COALESCE(EXCLUDED.last_success_at, provider_health.last_success_at),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update provider health after each log insert
CREATE TRIGGER trigger_update_provider_health
  AFTER INSERT ON llm_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_health();

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM response_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. Initial Data
-- ============================================================================

-- Initialize provider health records
INSERT INTO provider_health (provider, status, circuit_state)
VALUES
  ('grok', 'healthy', 'closed'),
  ('claude', 'healthy', 'closed'),
  ('openai', 'healthy', 'closed')
ON CONFLICT (provider) DO NOTHING;

-- ============================================================================
-- 9. Comments
-- ============================================================================

COMMENT ON TABLE llm_usage_logs IS 'Tracks every LLM API call for cost monitoring and analytics';
COMMENT ON TABLE quality_scores IS 'Stores automated quality assessments for AI-generated outputs';
COMMENT ON TABLE provider_health IS 'Monitors health status of LLM providers for circuit breaker logic';
COMMENT ON TABLE response_cache IS 'Caches LLM responses to reduce costs for similar requests';

COMMENT ON COLUMN llm_usage_logs.cached IS 'Whether the response was served from cache (no API call made)';
COMMENT ON COLUMN llm_usage_logs.cost_usd IS 'Actual cost in USD charged by the provider';
COMMENT ON COLUMN quality_scores.flag_for_review IS 'Auto-flagged if overall_score < 60';
COMMENT ON COLUMN provider_health.circuit_state IS 'Circuit breaker state: closed (working), open (failing), half-open (testing)';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
