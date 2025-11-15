import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useKYCStore } from '@/store/kycStore';
import { getCurrentUser } from '@/lib/auth';
import { toast } from 'sonner';

export const SettingsPage = () => {
  const user = getCurrentUser();
  const settings = useKYCStore((state) => state.settings);
  const setDarkMode = useKYCStore((state) => state.setDarkMode);
  const updateNotificationSettings = useKYCStore((state) => state.updateNotificationSettings);
  const updateProfile = useKYCStore((state) => state.updateProfile);

  const [profile, setProfile] = useState({
    name: settings.profile.name,
    email: settings.profile.email,
    password: '',
  });

  useEffect(() => {
    // Apply dark mode to document
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const handleDarkModeToggle = (enabled: boolean) => {
    setDarkMode(enabled);
    toast.success(enabled ? 'Dark mode enabled' : 'Dark mode disabled');
  };

  const handleNotificationChange = (key: keyof typeof settings.notifications, value: boolean) => {
    updateNotificationSettings({ [key]: value });
    toast.success('Notification settings updated');
  };

  const handleProfileSave = () => {
    updateProfile({
      name: profile.name,
      email: profile.email,
    });
    toast.success('Profile updated successfully');
  };

  return (
    <div className="min-h-screen bg-white p-4 lg:pl-8 lg:pr-8">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Dark Mode */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize the appearance of the application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <p className="text-sm text-gray-500">Switch between light and dark theme</p>
              </div>
              <Switch
                id="dark-mode"
                checked={settings.darkMode}
                onCheckedChange={handleDarkModeToggle}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="fraud-alerts">Fraud Alerts</Label>
                <p className="text-sm text-gray-500">Get notified about potential fraud cases</p>
              </div>
              <Switch
                id="fraud-alerts"
                checked={settings.notifications.fraudAlerts}
                onCheckedChange={(checked) => handleNotificationChange('fraudAlerts', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-approval">Auto-Approval Alerts</Label>
                <p className="text-sm text-gray-500">Get notified when applications are auto-approved</p>
              </div>
              <Switch
                id="auto-approval"
                checked={settings.notifications.autoApprovalAlerts}
                onCheckedChange={(checked) => handleNotificationChange('autoApprovalAlerts', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="review-queue">Review Queue Alerts</Label>
                <p className="text-sm text-gray-500">Get notified about new items in review queue</p>
              </div>
              <Switch
                id="review-queue"
                checked={settings.notifications.reviewQueueAlerts}
                onCheckedChange={(checked) => handleNotificationChange('reviewQueueAlerts', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={profile.password}
                onChange={(e) => setProfile({ ...profile, password: e.target.value })}
                placeholder="Enter new password"
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">Leave blank to keep current password</p>
            </div>
            <Button onClick={handleProfileSave}>Save Changes</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
