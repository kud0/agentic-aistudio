'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import ProfileSettings from '@/app/components/settings/ProfileSettings';
import BudgetSettings from '@/app/components/settings/BudgetSettings';
import APIKeySettings from '@/app/components/settings/APIKeySettings';
import NotificationSettings from '@/app/components/settings/NotificationSettings';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="budgets" className="mt-0">
          <BudgetSettings />
        </TabsContent>

        <TabsContent value="api-keys" className="mt-0">
          <APIKeySettings />
        </TabsContent>

        <TabsContent value="notifications" className="mt-0">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
