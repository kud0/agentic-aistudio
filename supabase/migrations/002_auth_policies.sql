-- ============================================================================
-- AUTH POLICIES MIGRATION (002)
-- ============================================================================
-- This migration adds RLS policies to tables created in previous migrations
-- Tables are already created in 000_base_schema.sql - we just add policies here
-- ============================================================================

-- ============================================================================
-- 1. Enable RLS on AI Provider Tables
-- ============================================================================

-- Enable RLS on llm_usage_logs (created in 001)
ALTER TABLE llm_usage_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on quality_scores (created in 001)
ALTER TABLE quality_scores ENABLE ROW LEVEL SECURITY;

-- Enable RLS on provider_health (created in 001)
ALTER TABLE provider_health ENABLE ROW LEVEL SECURITY;

-- Enable RLS on response_cache (created in 001)
ALTER TABLE response_cache ENABLE ROW LEVEL SECURITY;

-- NOTE: projects, outputs, inputs, user_profiles already have RLS from 000_base_schema.sql

-- ============================================================================
-- 2. LLM Usage Logs RLS Policies
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own usage logs" ON llm_usage_logs;
DROP POLICY IF EXISTS "System can insert usage logs" ON llm_usage_logs;

-- Users can only view their own usage logs
CREATE POLICY "Users can view their own usage logs" ON llm_usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- System/API can insert usage logs (must match authenticated user)
CREATE POLICY "System can insert usage logs" ON llm_usage_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can do anything (for automated processes)
CREATE POLICY "Service role has full access to usage logs" ON llm_usage_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 3. Quality Scores RLS Policies
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view quality scores for their projects" ON quality_scores;
DROP POLICY IF EXISTS "System can insert quality scores" ON quality_scores;
DROP POLICY IF EXISTS "Users can update quality scores for their projects" ON quality_scores;

-- Users can only view quality scores for outputs from their projects
CREATE POLICY "Users can view quality scores for their projects" ON quality_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = quality_scores.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- System can insert quality scores for user's projects
CREATE POLICY "System can insert quality scores" ON quality_scores
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = quality_scores.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- Users can update quality scores for their own projects (e.g., review status)
CREATE POLICY "Users can update quality scores for their projects" ON quality_scores
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = quality_scores.project_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = quality_scores.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- Service role can do anything
CREATE POLICY "Service role has full access to quality scores" ON quality_scores
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 4. Provider Health RLS Policies
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can view provider health" ON provider_health;
DROP POLICY IF EXISTS "Service role can manage provider health" ON provider_health;

-- Everyone can view provider health (public monitoring)
CREATE POLICY "Everyone can view provider health" ON provider_health
  FOR SELECT
  USING (true);

-- Only service role can update provider health (automated monitoring)
CREATE POLICY "Service role can manage provider health" ON provider_health
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 5. Response Cache RLS Policies
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can manage cache" ON response_cache;

-- Only service role can access cache (system-level)
CREATE POLICY "Service role can manage cache" ON response_cache
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 6. Additional Indexes for RLS Performance
-- ============================================================================

-- These complement indexes created in previous migrations
-- for faster RLS policy checks

-- User-based queries
CREATE INDEX IF NOT EXISTS idx_llm_usage_logs_user_id_created ON llm_usage_logs(user_id, created_at DESC);

-- Project-based queries
CREATE INDEX IF NOT EXISTS idx_quality_scores_project_user ON quality_scores(project_id);

-- ============================================================================
-- 7. Comments for Documentation
-- ============================================================================

COMMENT ON POLICY "Users can view their own usage logs" ON llm_usage_logs
  IS 'RLS: Users can only see their own LLM API usage';

COMMENT ON POLICY "Users can view quality scores for their projects" ON quality_scores
  IS 'RLS: Users can only see quality scores for outputs from projects they own';

COMMENT ON POLICY "Everyone can view provider health" ON provider_health
  IS 'RLS: Provider health is public information for transparency';

COMMENT ON POLICY "Service role can manage cache" ON response_cache
  IS 'RLS: Only system can manage response cache';

-- ============================================================================
-- END OF MIGRATION 002
-- ============================================================================
-- Summary:
-- - Added RLS policies to llm_usage_logs (user isolation)
-- - Added RLS policies to quality_scores (project-based access)
-- - Added RLS policies to provider_health (public read, system write)
-- - Added RLS policies to response_cache (system-only)
-- - All policies enforce user isolation via auth.uid()
-- - Service role has elevated access for automated operations
-- ============================================================================
