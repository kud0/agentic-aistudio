'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Switch } from '@/app/components/ui/switch';
import { useSettings } from '@/lib/hooks/useSettings';
import { Loader2, Bell, Mail, AlertTriangle, Info } from 'lucide-react';

export default function NotificationSettings() {
  const { notificationSettings, loading, error, updateNotificationSettings } = useSettings();
  const [formData, setFormData] = useState({
    email_budget_alerts: true,
    email_project_updates: true,
    email_weekly_summary: true,
    email_marketing: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (notificationSettings) {
      setFormData({
        email_budget_alerts: notificationSettings.email_budget_alerts ?? true,
        email_project_updates: notificationSettings.email_project_updates ?? true,
        email_weekly_summary: notificationSettings.email_weekly_summary ?? true,
        email_marketing: notificationSettings.email_marketing ?? false,
      });
    }
  }, [notificationSettings]);

  const handleChange = (field: string, value: boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSaveMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await updateNotificationSettings(formData);
      setSaveMessage({ type: 'success', text: 'Notification preferences updated successfully!' });
      setHasChanges(false);
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update notification settings'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (notificationSettings) {
      setFormData({
        email_budget_alerts: notificationSettings.email_budget_alerts ?? true,
        email_project_updates: notificationSettings.email_project_updates ?? true,
        email_weekly_summary: notificationSettings.email_weekly_summary ?? true,
        email_marketing: notificationSettings.email_marketing ?? false,
      });
      setHasChanges(false);
      setSaveMessage(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>
          Manage your email notification preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between rounded-lg border p-4 space-x-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-0.5">
                  <Label htmlFor="email_budget_alerts" className="text-base cursor-pointer">
                    Budget Alerts
                  </Label>
                  <p className="text-sm text-gray-500">
                    Receive emails when your spending reaches budget thresholds
                  </p>
                </div>
              </div>
              <Switch
                id="email_budget_alerts"
                checked={formData.email_budget_alerts}
                onCheckedChange={(checked) => handleChange('email_budget_alerts', checked)}
              />
            </div>

            <div className="flex items-start justify-between rounded-lg border p-4 space-x-4">
              <div className="flex items-start space-x-3">
                <Bell className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-0.5">
                  <Label htmlFor="email_project_updates" className="text-base cursor-pointer">
                    Project Updates
                  </Label>
                  <p className="text-sm text-gray-500">
                    Get notified about project status changes and completions
                  </p>
                </div>
              </div>
              <Switch
                id="email_project_updates"
                checked={formData.email_project_updates}
                onCheckedChange={(checked) => handleChange('email_project_updates', checked)}
              />
            </div>

            <div className="flex items-start justify-between rounded-lg border p-4 space-x-4">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-0.5">
                  <Label htmlFor="email_weekly_summary" className="text-base cursor-pointer">
                    Weekly Summary
                  </Label>
                  <p className="text-sm text-gray-500">
                    Receive a weekly summary of your projects and spending
                  </p>
                </div>
              </div>
              <Switch
                id="email_weekly_summary"
                checked={formData.email_weekly_summary}
                onCheckedChange={(checked) => handleChange('email_weekly_summary', checked)}
              />
            </div>

            <div className="flex items-start justify-between rounded-lg border p-4 space-x-4">
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-0.5">
                  <Label htmlFor="email_marketing" className="text-base cursor-pointer">
                    Marketing & Updates
                  </Label>
                  <p className="text-sm text-gray-500">
                    Receive news, tips, and product updates
                  </p>
                </div>
              </div>
              <Switch
                id="email_marketing"
                checked={formData.email_marketing}
                onCheckedChange={(checked) => handleChange('email_marketing', checked)}
              />
            </div>
          </div>

          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">Email Delivery</p>
              <p className="text-sm text-gray-600">
                Notifications will be sent to your registered email address. Make sure to check your spam folder if you don't receive expected emails.
              </p>
            </AlertDescription>
          </Alert>

          {saveMessage && (
            <Alert variant={saveMessage.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{saveMessage.text}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={!hasChanges || isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
