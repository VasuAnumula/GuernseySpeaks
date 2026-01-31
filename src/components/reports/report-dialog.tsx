
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Flag, AlertTriangle } from 'lucide-react';
import { createReport, REPORT_REASONS } from '@/services/reportService';
import { useToast } from '@/hooks/use-toast';
import type { ReportReason } from '@/types';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: 'post' | 'comment';
  contentId: string;
  contentPreview?: string;
  contentAuthorUid?: string;
  reporterUid: string;
  reporterDisplayName?: string;
}

export function ReportDialog({
  open,
  onOpenChange,
  contentType,
  contentId,
  contentPreview,
  contentAuthorUid,
  reporterUid,
  reporterDisplayName,
}: ReportDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      setError('Please select a reason for your report.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createReport({
        contentType,
        contentId,
        contentPreview: contentPreview?.substring(0, 200),
        contentAuthorUid,
        reporterUid,
        reporterDisplayName,
        reason,
        description: description.trim() || undefined,
      });

      toast({
        title: 'Report Submitted',
        description: 'Thank you for helping keep our community safe. Our moderators will review this report.',
      });

      // Reset and close
      setReason('');
      setDescription('');
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setDescription('');
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Report {contentType === 'post' ? 'Post' : 'Comment'}
          </DialogTitle>
          <DialogDescription>
            Help us understand what's wrong with this content. Your report will be reviewed by our moderation team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {contentPreview && (
              <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground line-clamp-2">
                "{contentPreview}"
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-base font-medium">Why are you reporting this?</Label>
              <RadioGroup value={reason} onValueChange={(v) => setReason(v as ReportReason)}>
                {REPORT_REASONS.map((r) => (
                  <div key={r.value} className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={r.value} id={r.value} className="mt-1" />
                    <Label htmlFor={r.value} className="cursor-pointer flex-1">
                      <span className="font-medium">{r.label}</span>
                      <p className="text-sm text-muted-foreground">{r.description}</p>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Additional details (optional)</Label>
              <Textarea
                id="description"
                placeholder="Provide any additional context that might help our moderators..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/500
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting || !reason}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
