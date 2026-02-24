
"use client";

import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState, useCallback } from 'react';
import { getDataDeletionPolicy, updateDataDeletionPolicy } from '@/services/siteContentService';
import { Loader2, Edit3, Save, XCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DataDeletionPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [policyContent, setPolicyContent] = useState<string>('');
  const [editablePolicyContent, setEditablePolicyContent] = useState<string>('');
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicy = useCallback(async () => {
    setIsLoadingContent(true);
    setError(null);
    try {
      const content = await getDataDeletionPolicy();
      setPolicyContent(content);
      setEditablePolicyContent(content);
    } catch (err) {
      console.error("Failed to fetch data deletion policy:", err);
      setError("Could not load the data deletion policy. Please try again later.");
      setPolicyContent("<p>Failed to load content.</p>"); // Fallback content
    } finally {
      setIsLoadingContent(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditablePolicyContent(policyContent);
    }
    setIsEditing(!isEditing);
  };

  const handleSaveChanges = async () => {
    if (!user || user.role !== 'superuser') {
      toast({ title: "Unauthorized", description: "You do not have permission to edit this page.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await updateDataDeletionPolicy(editablePolicyContent);
      setPolicyContent(editablePolicyContent);
      setIsEditing(false);
      toast({ title: "Success", description: "Data Deletion Policy updated successfully." });
    } catch (err) {
      console.error("Failed to update data deletion policy:", err);
      toast({ title: "Error", description: "Could not update the policy. Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MainLayout
      weatherWidget={<WeatherWidget />}
      adsWidget={<AdPlaceholder />}
    >
      <Card className="w-full max-w-3xl mx-auto shadow-lg animate-fade-in overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary to-primary/60" />
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Trash2 className="h-7 w-7 text-primary" />
            <div>
              <CardTitle className="text-3xl">Data Deletion Policy</CardTitle>
              <CardDescription>How to request deletion of your data.</CardDescription>
            </div>
          </div>
          {!authLoading && user && user.role === 'superuser' && !isEditing && (
            <Button onClick={handleEditToggle} variant="outline" size="icon">
              <Edit3 className="h-5 w-5" />
              <span className="sr-only">Edit Policy</span>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingContent ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading policy...</p>
            </div>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : isEditing ? (
            <div className="space-y-4">
              <Textarea
                value={editablePolicyContent}
                onChange={(e) => setEditablePolicyContent(e.target.value)}
                rows={20}
                className="text-base border-primary focus:ring-primary"
                disabled={isSaving}
                placeholder="Enter policy content here. You can use basic HTML."
              />
              <div className="flex justify-end gap-2">
                <Button onClick={handleEditToggle} variant="outline" disabled={isSaving}>
                  <XCircle className="mr-2 h-4 w-4" /> Cancel
                </Button>
                <Button onClick={handleSaveChanges} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="prose prose-sm sm:prose-base md:prose-lg max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: policyContent }}
            />
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
