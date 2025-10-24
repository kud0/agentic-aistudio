'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { useSettings } from '@/lib/hooks/useSettings';
import { Loader2, Eye, EyeOff, ExternalLink, Key, Copy, Check } from 'lucide-react';

export default function APIKeySettings() {
  const { profile, loading, error } = useSettings();
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const maskApiKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return `${key.substring(0, 4)}••••••••${key.substring(key.length - 4)}`;
  };

  const handleCopyKey = async () => {
    if (profile?.grok_api_key) {
      try {
        await navigator.clipboard.writeText(profile.grok_api_key);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleOpenSupabase = () => {
    window.open('https://supabase.com/dashboard', '_blank', 'noopener,noreferrer');
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

  const apiKey = profile?.grok_api_key || '';
  const displayKey = showKey ? apiKey : maskApiKey(apiKey);

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Key Management</CardTitle>
        <CardDescription>
          View your Grok API key. To update it, visit the Supabase dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="grok_api_key">Grok API Key</Label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="grok_api_key"
                  type="text"
                  value={displayKey}
                  disabled
                  className="pl-9 pr-10 bg-gray-50 cursor-not-allowed font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={!apiKey}
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyKey}
                disabled={!apiKey}
                title="Copy API key"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {!apiKey && (
              <p className="text-sm text-amber-600">
                No API key configured. Add one in the Supabase dashboard.
              </p>
            )}
          </div>

          <Alert>
            <AlertDescription className="flex items-start space-x-2">
              <Key className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium mb-1">Keep your API key secure</p>
                <p className="text-sm text-gray-600">
                  Your API key is stored securely in Supabase. Never share it publicly or commit it to version control.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Update API Key</h3>
          <p className="text-sm text-gray-600 mb-4">
            To update your Grok API key, you need to access the Supabase dashboard and modify your user profile directly.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenSupabase}
            className="w-full sm:w-auto"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Supabase Dashboard
          </Button>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Getting a Grok API Key</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Visit the xAI developer portal</li>
            <li>Sign up or log in to your account</li>
            <li>Navigate to the API keys section</li>
            <li>Generate a new API key</li>
            <li>Copy the key and add it to your profile in Supabase</li>
          </ol>
          <Button
            type="button"
            variant="link"
            className="mt-4 p-0 h-auto"
            onClick={() => window.open('https://x.ai', '_blank', 'noopener,noreferrer')}
          >
            Visit xAI Developer Portal
            <ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
