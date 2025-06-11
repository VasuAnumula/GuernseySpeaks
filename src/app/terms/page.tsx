"use client";

import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState, useCallback } from 'react';
import { getTermsAndConditions, updateTermsAndConditions } from '@/services/siteContentService';
import { Loader2, Edit3, Save, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function TermsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [termsContent, setTermsContent] = useState<string>('');
  const [editableTermsContent, setEditableTermsContent] = useState<string>('');
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTerms = useCallback(async () => {
    setIsLoadingContent(true);
    setError(null);
    try {
      const content = await getTermsAndConditions();
      setTermsContent(content);
      setEditableTermsContent(content);
    } catch (err) {
      console.error("Failed to fetch terms:", err);
      setError("Could not load the terms and conditions. Please try again later.");
      setTermsContent("Failed to load content.");
    } finally {
      setIsLoadingContent(false);
    }
  }, []);

  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditableTermsContent(termsContent);
    }
    setIsEditing(!isEditing);
  };

  const handleSaveChanges = async () => {
    if (!user || user.role !== 'superuser') {
      toast({ title: "Unauthorized", description: "You do not have permission to edit the terms.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await updateTermsAndConditions(editableTermsContent);
      setTermsContent(editableTermsContent);
      setIsEditing(false);
      toast({ title: "Success", description: "Terms and Conditions updated successfully." });
    } catch (err) {
      console.error("Failed to update terms:", err);
      toast({ title: "Error", description: "Could not update the terms. Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
      <Card className="w-full max-w-3xl mx-auto shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-3xl">Terms and Conditions</CardTitle>
            <CardDescription>Review our terms before using the service.</CardDescription>
          </div>
          {!authLoading && user && user.role === 'superuser' && !isEditing && (
            <Button onClick={handleEditToggle} variant="outline" size="icon">
              <Edit3 className="h-5 w-5" />
              <span className="sr-only">Edit Terms</span>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingContent ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading terms...</p>
            </div>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : isEditing ? (
            <div className="space-y-4">
              <Textarea
                value={editableTermsContent}
                onChange={(e) => setEditableTermsContent(e.target.value)}
                rows={20}
                className="text-base border-primary focus:ring-primary"
                disabled={isSaving}
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
            <div className="prose prose-sm sm:prose-base md:prose-lg max-w-none dark:prose-invert whitespace-pre-wrap">
              {termsContent}
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
