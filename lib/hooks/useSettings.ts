import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  grok_api_key: string | null;
  created_at: string;
  updated_at: string;
}

interface BudgetSettings {
  user_id: string;
  default_project_budget: number;
  monthly_budget_limit: number;
  budget_alert_threshold: number;
  enable_budget_alerts: boolean;
  created_at: string;
  updated_at: string;
}

interface NotificationSettings {
  user_id: string;
  email_budget_alerts: boolean;
  email_project_updates: boolean;
  email_weekly_summary: boolean;
  email_marketing: boolean;
  created_at: string;
  updated_at: string;
}

interface UseSettingsReturn {
  profile: Profile | null;
  budgetSettings: BudgetSettings | null;
  notificationSettings: NotificationSettings | null;
  loading: boolean;
  error: string | null;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  updateBudgetSettings: (data: Partial<BudgetSettings>) => Promise<void>;
  updateNotificationSettings: (data: Partial<NotificationSettings>) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch budget settings (create if doesn't exist)
      let { data: budgetData, error: budgetError } = await supabase
        .from('budget_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (budgetError && budgetError.code === 'PGRST116') {
        // Record doesn't exist, create default
        const { data: newBudget, error: createError } = await supabase
          .from('budget_settings')
          .insert({
            user_id: user.id,
            default_project_budget: 0,
            monthly_budget_limit: 0,
            budget_alert_threshold: 80,
            enable_budget_alerts: true,
          })
          .select()
          .single();

        if (createError) throw createError;
        budgetData = newBudget;
      } else if (budgetError) {
        throw budgetError;
      }

      setBudgetSettings(budgetData);

      // Fetch notification settings (create if doesn't exist)
      let { data: notifData, error: notifError } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (notifError && notifError.code === 'PGRST116') {
        // Record doesn't exist, create default
        const { data: newNotif, error: createError } = await supabase
          .from('notification_settings')
          .insert({
            user_id: user.id,
            email_budget_alerts: true,
            email_project_updates: true,
            email_weekly_summary: true,
            email_marketing: false,
          })
          .select()
          .single();

        if (createError) throw createError;
        notifData = newNotif;
      } else if (notifError) {
        throw notifError;
      }

      setNotificationSettings(notifData);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateProfile = async (data: Partial<Profile>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      setProfile(updated);
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    }
  };

  const updateBudgetSettings = async (data: Partial<BudgetSettings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: updated, error: updateError } = await supabase
        .from('budget_settings')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      setBudgetSettings(updated);
    } catch (err) {
      console.error('Error updating budget settings:', err);
      throw err;
    }
  };

  const updateNotificationSettings = async (data: Partial<NotificationSettings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: updated, error: updateError } = await supabase
        .from('notification_settings')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      setNotificationSettings(updated);
    } catch (err) {
      console.error('Error updating notification settings:', err);
      throw err;
    }
  };

  return {
    profile,
    budgetSettings,
    notificationSettings,
    loading,
    error,
    updateProfile,
    updateBudgetSettings,
    updateNotificationSettings,
    refresh: fetchSettings,
  };
}
