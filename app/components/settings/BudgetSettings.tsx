'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Switch } from '@/app/components/ui/switch';
import { useSettings } from '@/lib/hooks/useSettings';
import { Loader2, DollarSign, AlertTriangle } from 'lucide-react';

export default function BudgetSettings() {
  const { budgetSettings, loading, error, updateBudgetSettings } = useSettings();
  const [formData, setFormData] = useState({
    default_project_budget: 0,
    monthly_budget_limit: 0,
    budget_alert_threshold: 80,
    enable_budget_alerts: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (budgetSettings) {
      setFormData({
        default_project_budget: budgetSettings.default_project_budget || 0,
        monthly_budget_limit: budgetSettings.monthly_budget_limit || 0,
        budget_alert_threshold: budgetSettings.budget_alert_threshold || 80,
        enable_budget_alerts: budgetSettings.enable_budget_alerts ?? true,
      });
    }
  }, [budgetSettings]);

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSaveMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.default_project_budget < 0 || formData.monthly_budget_limit < 0) {
      setSaveMessage({ type: 'error', text: 'Budget values cannot be negative' });
      return;
    }

    if (formData.budget_alert_threshold < 0 || formData.budget_alert_threshold > 100) {
      setSaveMessage({ type: 'error', text: 'Alert threshold must be between 0 and 100' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await updateBudgetSettings(formData);
      setSaveMessage({ type: 'success', text: 'Budget settings updated successfully!' });
      setHasChanges(false);
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update budget settings'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (budgetSettings) {
      setFormData({
        default_project_budget: budgetSettings.default_project_budget || 0,
        monthly_budget_limit: budgetSettings.monthly_budget_limit || 0,
        budget_alert_threshold: budgetSettings.budget_alert_threshold || 80,
        enable_budget_alerts: budgetSettings.enable_budget_alerts ?? true,
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
        <CardTitle>Budget Settings</CardTitle>
        <CardDescription>
          Configure default budgets and spending alerts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="default_project_budget">Default Project Budget ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="default_project_budget"
                type="number"
                min="0"
                step="0.01"
                value={formData.default_project_budget}
                onChange={(e) => handleChange('default_project_budget', parseFloat(e.target.value) || 0)}
                className="pl-9"
                placeholder="0.00"
              />
            </div>
            <p className="text-sm text-gray-500">
              Default budget applied to new projects
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthly_budget_limit">Monthly Budget Limit ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="monthly_budget_limit"
                type="number"
                min="0"
                step="0.01"
                value={formData.monthly_budget_limit}
                onChange={(e) => handleChange('monthly_budget_limit', parseFloat(e.target.value) || 0)}
                className="pl-9"
                placeholder="0.00"
              />
            </div>
            <p className="text-sm text-gray-500">
              Maximum spending allowed per month across all projects
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget_alert_threshold">Budget Alert Threshold (%)</Label>
            <div className="relative">
              <AlertTriangle className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="budget_alert_threshold"
                type="number"
                min="0"
                max="100"
                step="1"
                value={formData.budget_alert_threshold}
                onChange={(e) => handleChange('budget_alert_threshold', parseInt(e.target.value) || 0)}
                className="pl-9"
                placeholder="80"
              />
            </div>
            <p className="text-sm text-gray-500">
              Receive alerts when spending reaches this percentage of your budget
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="enable_budget_alerts" className="text-base cursor-pointer">
                Enable Budget Alerts
              </Label>
              <p className="text-sm text-gray-500">
                Receive email notifications when budgets are exceeded
              </p>
            </div>
            <Switch
              id="enable_budget_alerts"
              checked={formData.enable_budget_alerts}
              onCheckedChange={(checked) => handleChange('enable_budget_alerts', checked)}
            />
          </div>

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
