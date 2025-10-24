-- Migration: Settings Tables
-- Description: Creates tables for user settings (budget and notifications)
-- Created: 2025-10-25

-- Budget Settings Table
CREATE TABLE IF NOT EXISTS public.budget_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_project_budget DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
  monthly_budget_limit DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
  budget_alert_threshold INTEGER DEFAULT 80 NOT NULL CHECK (budget_alert_threshold >= 0 AND budget_alert_threshold <= 100),
  enable_budget_alerts BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Notification Settings Table
CREATE TABLE IF NOT EXISTS public.notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_budget_alerts BOOLEAN DEFAULT true NOT NULL,
  email_project_updates BOOLEAN DEFAULT true NOT NULL,
  email_weekly_summary BOOLEAN DEFAULT true NOT NULL,
  email_marketing BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budget_settings
CREATE POLICY "Users can view their own budget settings"
  ON public.budget_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget settings"
  ON public.budget_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget settings"
  ON public.budget_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget settings"
  ON public.budget_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for notification_settings
CREATE POLICY "Users can view their own notification settings"
  ON public.notification_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
  ON public.notification_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
  ON public.notification_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification settings"
  ON public.notification_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_budget_settings_user_id ON public.budget_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings(user_id);

-- Updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_budget_settings_updated_at ON public.budget_settings;
CREATE TRIGGER update_budget_settings_updated_at
  BEFORE UPDATE ON public.budget_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON public.notification_settings;
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE public.budget_settings IS 'User budget preferences and alert thresholds';
COMMENT ON TABLE public.notification_settings IS 'User email notification preferences';

COMMENT ON COLUMN public.budget_settings.default_project_budget IS 'Default budget for new projects in USD';
COMMENT ON COLUMN public.budget_settings.monthly_budget_limit IS 'Monthly spending limit across all projects in USD';
COMMENT ON COLUMN public.budget_settings.budget_alert_threshold IS 'Percentage of budget used before alerting (0-100)';
COMMENT ON COLUMN public.budget_settings.enable_budget_alerts IS 'Enable/disable budget alert emails';

COMMENT ON COLUMN public.notification_settings.email_budget_alerts IS 'Receive emails when budget thresholds are exceeded';
COMMENT ON COLUMN public.notification_settings.email_project_updates IS 'Receive emails about project status changes';
COMMENT ON COLUMN public.notification_settings.email_weekly_summary IS 'Receive weekly summary emails';
COMMENT ON COLUMN public.notification_settings.email_marketing IS 'Receive marketing and product update emails';
