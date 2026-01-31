
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, Megaphone, Shield, Settings2 } from 'lucide-react';
import { getPlatformSettings, updatePlatformSettings } from '@/services/settingsService';
import { useToast } from '@/hooks/use-toast';
import type { PlatformSettings } from '@/types';

interface PlatformSettingsFormProps {
  adminUid: string;
}

export function PlatformSettingsForm({ adminUid }: PlatformSettingsFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const fetchedSettings = await getPlatformSettings();
        setSettings(fetchedSettings);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        toast({ title: 'Error', description: 'Could not load settings.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [toast]);

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      await updatePlatformSettings(settings, adminUid);
      toast({ title: 'Settings Saved', description: 'Platform settings have been updated.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Could not save settings.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  if (!settings) {
    return <p className="text-muted-foreground">Could not load settings.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Announcement Banner Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Announcement Banner</CardTitle>
          </div>
          <CardDescription>Display a banner message to all users at the top of the page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="banner-enabled">Enable Banner</Label>
            <Switch
              id="banner-enabled"
              checked={settings.announcementBanner.enabled}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  announcementBanner: { ...settings.announcementBanner, enabled: checked },
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner-text">Banner Message</Label>
            <Textarea
              id="banner-text"
              value={settings.announcementBanner.text}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  announcementBanner: { ...settings.announcementBanner, text: e.target.value },
                })
              }
              placeholder="Enter your announcement message..."
              rows={2}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">
              {settings.announcementBanner.text.length}/200
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner-type">Banner Type</Label>
            <Select
              value={settings.announcementBanner.type}
              onValueChange={(value: 'info' | 'warning' | 'success' | 'error') =>
                setSettings({
                  ...settings,
                  announcementBanner: { ...settings.announcementBanner, type: value },
                })
              }
            >
              <SelectTrigger id="banner-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info (Blue)</SelectItem>
                <SelectItem value="success">Success (Green)</SelectItem>
                <SelectItem value="warning">Warning (Yellow)</SelectItem>
                <SelectItem value="error">Error (Red)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner-link">Link URL (optional)</Label>
            <Input
              id="banner-link"
              type="url"
              value={settings.announcementBanner.link || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  announcementBanner: { ...settings.announcementBanner, link: e.target.value || undefined },
                })
              }
              placeholder="https://example.com/more-info"
            />
          </div>

          {settings.announcementBanner.enabled && settings.announcementBanner.text && (
            <div className="mt-4">
              <Label className="text-sm font-medium">Preview:</Label>
              <div
                className={`mt-2 p-3 rounded-md text-sm ${
                  settings.announcementBanner.type === 'info'
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : settings.announcementBanner.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : settings.announcementBanner.type === 'warning'
                    ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {settings.announcementBanner.text}
                {settings.announcementBanner.link && (
                  <span className="ml-2 underline">Learn more</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Moderation Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Content Moderation</CardTitle>
          </div>
          <CardDescription>Configure automatic content moderation rules.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-hide">Auto-hide Reported Posts</Label>
              <p className="text-xs text-muted-foreground">
                Automatically hide posts that receive multiple reports.
              </p>
            </div>
            <Switch
              id="auto-hide"
              checked={settings.contentModeration.autoHideReportedPosts}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  contentModeration: { ...settings.contentModeration, autoHideReportedPosts: checked },
                })
              }
            />
          </div>

          {settings.contentModeration.autoHideReportedPosts && (
            <div className="space-y-2">
              <Label htmlFor="auto-hide-threshold">Report Threshold</Label>
              <Input
                id="auto-hide-threshold"
                type="number"
                min={1}
                max={10}
                value={settings.contentModeration.autoHideThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contentModeration: {
                      ...settings.contentModeration,
                      autoHideThreshold: parseInt(e.target.value) || 3,
                    },
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Number of reports before a post is automatically hidden.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Feature Toggles</CardTitle>
          </div>
          <CardDescription>Enable or disable platform features.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="posts-enabled">Posts Enabled</Label>
              <p className="text-xs text-muted-foreground">Allow users to create new posts.</p>
            </div>
            <Switch
              id="posts-enabled"
              checked={settings.features.postsEnabled}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  features: { ...settings.features, postsEnabled: checked },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="comments-enabled">Comments Enabled</Label>
              <p className="text-xs text-muted-foreground">Allow users to comment on posts.</p>
            </div>
            <Switch
              id="comments-enabled"
              checked={settings.features.commentsEnabled}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  features: { ...settings.features, commentsEnabled: checked },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
