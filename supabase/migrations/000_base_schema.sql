-- =====================================================
-- BASE SCHEMA MIGRATION
-- Creates foundational tables for the Strategist Agent Platform
-- =====================================================
-- This must run BEFORE 001_ai_provider_schema.sql
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
-- Note: Supabase Auth handles users in auth.users
-- This table extends user profiles with app-specific data

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  company TEXT,
  role TEXT DEFAULT 'strategist', -- strategist, admin, viewer
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- RLS Policies for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- PROJECTS TABLE
-- =====================================================
-- Stores rebrand projects (core entity)

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Project details
  title TEXT NOT NULL,
  brief TEXT NOT NULL, -- The rebrand brief
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'complete', 'error', 'cancelled')),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Budget tracking (optional)
  budget_limit DECIMAL(10, 2) DEFAULT 10.00, -- $10 default per project

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- RLS Policies for projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- INPUTS TABLE
-- =====================================================
-- Stores uploaded files for projects (PDFs, images, etc.)

CREATE TABLE IF NOT EXISTS inputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- File details
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'image', 'doc', etc.
  file_size INTEGER, -- bytes

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inputs_project_id ON inputs(project_id);
CREATE INDEX IF NOT EXISTS idx_inputs_created_at ON inputs(created_at DESC);

-- RLS Policies for inputs
ALTER TABLE inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inputs for own projects" ON inputs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = inputs.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create inputs for own projects" ON inputs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = inputs.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete inputs for own projects" ON inputs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = inputs.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- =====================================================
-- OUTPUTS TABLE
-- =====================================================
-- Stores AI-generated outputs (research, strategy, critique)

CREATE TABLE IF NOT EXISTS outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Output details
  section TEXT NOT NULL, -- 'research', 'strategy', 'critique'
  content TEXT NOT NULL, -- The generated content

  -- Version tracking (for edits)
  version INTEGER DEFAULT 1,
  parent_id UUID REFERENCES outputs(id) ON DELETE SET NULL, -- For edit history

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outputs_project_id ON outputs(project_id);
CREATE INDEX IF NOT EXISTS idx_outputs_section ON outputs(section);
CREATE INDEX IF NOT EXISTS idx_outputs_created_at ON outputs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outputs_parent_id ON outputs(parent_id);

-- RLS Policies for outputs
ALTER TABLE outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view outputs for own projects" ON outputs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = outputs.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create outputs for own projects" ON outputs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = outputs.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update outputs for own projects" ON outputs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = outputs.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete outputs for own projects" ON outputs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = outputs.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- =====================================================
-- AUTO-UPDATE TRIGGERS
-- =====================================================
-- Automatically update updated_at timestamps

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for projects
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for outputs
CREATE TRIGGER update_outputs_updated_at
  BEFORE UPDATE ON outputs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Projects with output counts
CREATE OR REPLACE VIEW project_summaries AS
SELECT
  p.id,
  p.user_id,
  p.title,
  p.brief,
  p.status,
  p.created_at,
  p.updated_at,
  p.budget_limit,
  COUNT(DISTINCT o.id) FILTER (WHERE o.section = 'research') AS research_count,
  COUNT(DISTINCT o.id) FILTER (WHERE o.section = 'strategy') AS strategy_count,
  COUNT(DISTINCT o.id) FILTER (WHERE o.section = 'critique') AS critique_count,
  COUNT(DISTINCT i.id) AS input_count
FROM projects p
LEFT JOIN outputs o ON o.project_id = p.id
LEFT JOIN inputs i ON i.project_id = p.id
GROUP BY p.id;

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================
-- Uncomment to insert sample data for development

/*
-- Insert sample user profile (replace with real user ID from auth.users)
INSERT INTO user_profiles (id, email, full_name, company, role)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid, -- Replace with real user ID
  'test@example.com',
  'Test Strategist',
  'Brand Agency Inc',
  'strategist'
) ON CONFLICT (id) DO NOTHING;

-- Insert sample project
INSERT INTO projects (id, user_id, title, brief, status)
VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid, -- Replace with real user ID
  'Denon Rebrand for Gen Z',
  'Rebrand Denon audio equipment for Gen Z audiophiles. Target age: 18-25. Budget: $500k. Timeline: 6 months.',
  'pending'
) ON CONFLICT (id) DO NOTHING;
*/

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE user_profiles IS 'Extended user profiles with app-specific data';
COMMENT ON TABLE projects IS 'Rebrand projects - core entity of the application';
COMMENT ON TABLE inputs IS 'Uploaded files for projects (PDFs, images, brand assets)';
COMMENT ON TABLE outputs IS 'AI-generated outputs (research, strategy, critique)';
COMMENT ON VIEW project_summaries IS 'Summary view of projects with output counts';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next: Run 001_ai_provider_schema.sql
-- Next: Run 002_auth_policies.sql
-- =====================================================
