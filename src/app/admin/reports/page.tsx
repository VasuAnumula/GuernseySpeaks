
"use client";

import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, ArrowLeft, Flag, CheckCircle, XCircle, Eye, AlertTriangle, Trash2, MessageSquare } from 'lucide-react';
import { getReports, updateReportStatus, REPORT_REASONS } from '@/services/reportService';
import { deletePost } from '@/services/postService';
import type { Report, ReportStatus, ReportAction } from '@/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('pending');
  const [processingReportId, setProcessingReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'superuser' && user.role !== 'moderator'))) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const filter = statusFilter === 'all' ? undefined : statusFilter;
      const fetchedReports = await getReports(filter);
      setReports(fetchedReports);
    } catch (error: any) {
      console.error('Failed to fetch reports:', error);
      toast({ title: 'Error', description: error.message || 'Could not fetch reports.', variant: 'destructive' });
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'superuser' || user.role === 'moderator')) {
      fetchReports();
    }
  }, [user, statusFilter]);

  const handleResolveReport = async (report: Report, action: ReportAction) => {
    if (!user) return;
    setProcessingReportId(report.id);
    try {
      await updateReportStatus(report.id, 'resolved', action, user.uid);

      // If action is content_removed, delete the post
      if (action === 'content_removed' && report.contentType === 'post') {
        try {
          await deletePost(report.contentId);
          toast({ title: 'Content Removed', description: 'The reported post has been deleted.' });
        } catch (deleteError) {
          console.error('Failed to delete post:', deleteError);
          toast({ title: 'Warning', description: 'Report resolved but failed to delete content.', variant: 'destructive' });
        }
      }

      setReports(prev => prev.map(r =>
        r.id === report.id
          ? { ...r, status: 'resolved' as ReportStatus, action, reviewedBy: user.uid, reviewedAt: new Date() }
          : r
      ));
      toast({ title: 'Report Resolved', description: `Action taken: ${action.replace('_', ' ')}` });
      setActionDialogOpen(false);
      setSelectedReport(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Could not update report.', variant: 'destructive' });
    } finally {
      setProcessingReportId(null);
    }
  };

  const handleDismissReport = async (report: Report) => {
    if (!user) return;
    setProcessingReportId(report.id);
    try {
      await updateReportStatus(report.id, 'dismissed', 'none', user.uid);
      setReports(prev => prev.map(r =>
        r.id === report.id
          ? { ...r, status: 'dismissed' as ReportStatus, action: 'none' as ReportAction, reviewedBy: user.uid, reviewedAt: new Date() }
          : r
      ));
      toast({ title: 'Report Dismissed', description: 'The report has been dismissed.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Could not dismiss report.', variant: 'destructive' });
    } finally {
      setProcessingReportId(null);
    }
  };

  const getReasonLabel = (reason: string) => {
    const found = REPORT_REASONS.find(r => r.value === reason);
    return found ? found.label : reason;
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Resolved</Badge>;
      case 'dismissed':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (authLoading || !user || (user.role !== 'superuser' && user.role !== 'moderator')) {
    return (
      <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
        <div className="flex justify-center items-center h-64">
          {authLoading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading...</p>
            </>
          ) : (
            <p className="text-destructive">Access Denied. Admin or Moderator role required.</p>
          )}
        </div>
      </MainLayout>
    );
  }

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Flag className="h-6 w-6 text-destructive" />
                <div>
                  <CardTitle className="text-2xl">Content Reports</CardTitle>
                  <CardDescription>Review and manage reported content</CardDescription>
                </div>
              </div>
              {pendingCount > 0 && (
                <Badge variant="destructive" className="text-lg px-3 py-1">
                  {pendingCount} Pending
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as ReportStatus | 'all')} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
                <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>

              <TabsContent value={statusFilter} className="mt-0">
                {loadingReports ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Loading reports...</p>
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-10">
                    <Flag className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No {statusFilter !== 'all' ? statusFilter : ''} reports found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <Card key={report.id} className="border-l-4 border-l-destructive/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {getStatusBadge(report.status)}
                                <Badge variant="secondary">{report.contentType}</Badge>
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  {getReasonLabel(report.reason)}
                                </Badge>
                              </div>

                              {report.contentPreview && (
                                <div className="bg-muted/50 p-2 rounded text-sm text-muted-foreground line-clamp-2">
                                  "{report.contentPreview}"
                                </div>
                              )}

                              {report.description && (
                                <p className="text-sm">
                                  <span className="font-medium">Details:</span> {report.description}
                                </p>
                              )}

                              <div className="text-xs text-muted-foreground space-y-1">
                                <p>Reported by: {report.reporterDisplayName || report.reporterUid}</p>
                                <p>
                                  Date: {report.createdAt && format(
                                    report.createdAt instanceof Date ? report.createdAt : (report.createdAt as any).toDate(),
                                    'MMM d, yyyy h:mm a'
                                  )}
                                </p>
                                {report.reviewedBy && (
                                  <p className="text-green-600">
                                    Reviewed by: {report.reviewedBy} | Action: {report.action?.replace('_', ' ')}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <Link href={report.contentType === 'post' ? `/post/${report.contentId}` : '#'}>
                                  <Eye className="h-4 w-4 mr-1" /> View
                                </Link>
                              </Button>

                              {report.status === 'pending' && (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedReport(report);
                                      setActionDialogOpen(true);
                                    }}
                                    disabled={processingReportId === report.id}
                                  >
                                    {processingReportId === report.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-1" /> Resolve
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDismissReport(report)}
                                    disabled={processingReportId === report.id}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" /> Dismiss
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Report</DialogTitle>
            <DialogDescription>
              Choose an action to take on this reported content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => selectedReport && handleResolveReport(selectedReport, 'none')}
              disabled={processingReportId !== null}
            >
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              No Action Needed
              <span className="ml-auto text-xs text-muted-foreground">Content is fine</span>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => selectedReport && handleResolveReport(selectedReport, 'user_warned')}
              disabled={processingReportId !== null}
            >
              <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
              Warn User
              <span className="ml-auto text-xs text-muted-foreground">Send warning to author</span>
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => selectedReport && handleResolveReport(selectedReport, 'content_removed')}
              disabled={processingReportId !== null}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Content
              <span className="ml-auto text-xs">Delete the {selectedReport?.contentType}</span>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
