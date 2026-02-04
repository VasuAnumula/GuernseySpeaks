
import { db } from '@/lib/firebase/config';
import type { Report, ReportReason, ReportStatus, ReportAction } from '@/types';
import { processDoc } from '@/lib/firestoreUtils';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  getCountFromServer,
  increment,
} from 'firebase/firestore';
import { getPlatformSettings } from './settingsService';
import { notifyModerationWarning, notifyContentHidden } from './notificationService';

interface CreateReportData {
  contentType: 'post' | 'comment';
  contentId: string;
  contentPreview?: string;
  contentAuthorUid?: string;
  reporterUid: string;
  reporterDisplayName?: string;
  reason: ReportReason;
  description?: string;
}

/**
 * Create a new report and check for auto-hide threshold
 */
export async function createReport(data: CreateReportData): Promise<string> {
  try {
    // Check if user already reported this content
    const existingQuery = query(
      collection(db, 'reports'),
      where('contentId', '==', data.contentId),
      where('reporterUid', '==', data.reporterUid),
      where('status', '==', 'pending')
    );
    const existingSnap = await getDocs(existingQuery);

    if (!existingSnap.empty) {
      throw new Error('You have already reported this content.');
    }

    // Create the report
    const docRef = await addDoc(collection(db, 'reports'), {
      ...data,
      status: 'pending' as ReportStatus,
      reviewedBy: null,
      reviewedAt: null,
      action: null,
      createdAt: serverTimestamp(),
    });

    // Update report count on the content and check for auto-hide
    await updateContentReportCount(data.contentType, data.contentId, 1, data.contentAuthorUid, data.contentPreview);

    return docRef.id;
  } catch (error: any) {
    console.error('Error creating report:', error);
    throw new Error(error.message || 'Failed to submit report.');
  }
}

/**
 * Update the report count on content and auto-hide if threshold reached
 */
async function updateContentReportCount(
  contentType: 'post' | 'comment',
  contentId: string,
  incrementBy: number,
  contentAuthorUid?: string,
  contentPreview?: string
): Promise<void> {
  try {
    // Get the content document reference
    let contentDocRef;
    if (contentType === 'post') {
      contentDocRef = doc(db, 'posts', contentId);
    } else {
      // For comments, we need to find the post ID first
      // Comments are stored as posts/{postId}/comments/{commentId}
      // We'll need to get this from the report data or query for it
      const reportsQuery = query(
        collection(db, 'reports'),
        where('contentId', '==', contentId),
        where('contentType', '==', 'comment')
      );
      const reportSnap = await getDocs(reportsQuery);

      if (reportSnap.empty) {
        // Try to find the comment in all posts
        console.warn('Could not find post ID for comment, skipping report count update');
        return;
      }

      // For now, we'll skip auto-hide for comments as they require knowing the post ID
      // This would require restructuring how comments are stored or adding postId to reports
      return;
    }

    // Get current content data
    const contentSnap = await getDoc(contentDocRef);
    if (!contentSnap.exists()) {
      console.warn('Content not found for report count update');
      return;
    }

    const contentData = contentSnap.data();
    const currentReportCount = contentData.reportCount || 0;
    const newReportCount = currentReportCount + incrementBy;
    const isAlreadyHidden = contentData.isHidden || false;

    // Update the report count
    await updateDoc(contentDocRef, {
      reportCount: increment(incrementBy),
    });

    // Check if we should auto-hide
    if (!isAlreadyHidden && incrementBy > 0) {
      const settings = await getPlatformSettings();

      if (settings.contentModeration.autoHideReportedPosts &&
          newReportCount >= settings.contentModeration.autoHideThreshold) {
        // Auto-hide the content
        await updateDoc(contentDocRef, {
          isHidden: true,
        });

        // Notify the content author
        if (contentAuthorUid) {
          try {
            await notifyContentHidden(contentAuthorUid, contentType, contentPreview);
          } catch (notifError) {
            console.error('Failed to send content hidden notification:', notifError);
          }
        }

        console.log(`Content ${contentType}:${contentId} auto-hidden due to ${newReportCount} reports`);
      }
    }
  } catch (error) {
    console.error('Error updating content report count:', error);
    // Don't throw - this is a secondary operation
  }
}

/**
 * Get reports with optional status filter
 */
export async function getReports(status?: ReportStatus): Promise<Report[]> {
  try {
    const reportsCollection = collection(db, 'reports');
    let q;

    if (status) {
      q = query(
        reportsCollection,
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(reportsCollection, orderBy('createdAt', 'desc'));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((docSnap) => processDoc(docSnap) as Report);
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    if (error.code === 'failed-precondition' && error.message.toLowerCase().includes('index')) {
      throw new Error('A Firestore index is required. Please check the console for the index creation link.');
    }
    throw new Error('Failed to fetch reports.');
  }
}

/**
 * Get a single report by ID
 */
export async function getReportById(reportId: string): Promise<Report | null> {
  try {
    const reportDocRef = doc(db, 'reports', reportId);
    const docSnap = await getDoc(reportDocRef);

    if (docSnap.exists()) {
      return processDoc(docSnap) as Report;
    }
    return null;
  } catch (error) {
    console.error('Error fetching report:', error);
    throw new Error('Failed to fetch report.');
  }
}

/**
 * Update report status (admin action)
 * Sends warning notification if action is 'user_warned'
 * Decrements report count if report is dismissed
 */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  action: ReportAction,
  reviewerUid: string
): Promise<void> {
  try {
    const reportDocRef = doc(db, 'reports', reportId);

    // Get the report data first for notification purposes
    const reportSnap = await getDoc(reportDocRef);
    if (!reportSnap.exists()) {
      throw new Error('Report not found');
    }
    const reportData = reportSnap.data() as Report;

    // Update the report status
    await updateDoc(reportDocRef, {
      status,
      action,
      reviewedBy: reviewerUid,
      reviewedAt: serverTimestamp(),
    });

    // Send warning notification if action is 'user_warned'
    if (action === 'user_warned' && reportData.contentAuthorUid) {
      try {
        const reasonLabel = REPORT_REASONS.find(r => r.value === reportData.reason)?.label || reportData.reason;
        await notifyModerationWarning(
          reportData.contentAuthorUid,
          reportData.contentType,
          reasonLabel,
          reportData.contentPreview
        );
        console.log(`Warning notification sent to user ${reportData.contentAuthorUid}`);
      } catch (notifError) {
        console.error('Failed to send warning notification:', notifError);
        // Don't fail the operation if notification fails
      }
    }

    // If dismissed, decrement the report count and potentially unhide content
    if (status === 'dismissed') {
      await handleReportDismissal(reportData);
    }
  } catch (error) {
    console.error('Error updating report:', error);
    throw new Error('Failed to update report.');
  }
}

/**
 * Handle report dismissal - decrement report count and potentially unhide content
 */
async function handleReportDismissal(reportData: Report): Promise<void> {
  try {
    if (reportData.contentType !== 'post') {
      // Skip for comments for now
      return;
    }

    const contentDocRef = doc(db, 'posts', reportData.contentId);
    const contentSnap = await getDoc(contentDocRef);

    if (!contentSnap.exists()) {
      return;
    }

    const contentData = contentSnap.data();
    const currentReportCount = contentData.reportCount || 0;
    const newReportCount = Math.max(0, currentReportCount - 1);

    // Decrement report count
    await updateDoc(contentDocRef, {
      reportCount: newReportCount,
    });

    // Check if we should unhide the content
    if (contentData.isHidden && newReportCount === 0) {
      // Check if there are any other pending reports for this content
      const pendingReportsQuery = query(
        collection(db, 'reports'),
        where('contentId', '==', reportData.contentId),
        where('status', '==', 'pending')
      );
      const pendingSnap = await getDocs(pendingReportsQuery);

      if (pendingSnap.empty) {
        // No more pending reports, unhide the content
        await updateDoc(contentDocRef, {
          isHidden: false,
        });
        console.log(`Content ${reportData.contentType}:${reportData.contentId} unhidden after all reports dismissed`);
      }
    }
  } catch (error) {
    console.error('Error handling report dismissal:', error);
    // Don't throw - this is a secondary operation
  }
}

/**
 * Get pending report count (for admin dashboard badge)
 */
export async function getPendingReportCount(): Promise<number> {
  try {
    const q = query(
      collection(db, 'reports'),
      where('status', '==', 'pending')
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error('Error getting pending report count:', error);
    return 0;
  }
}

/**
 * Get reports for a specific content item
 */
export async function getReportsForContent(
  contentType: 'post' | 'comment',
  contentId: string
): Promise<Report[]> {
  try {
    const q = query(
      collection(db, 'reports'),
      where('contentType', '==', contentType),
      where('contentId', '==', contentId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((docSnap) => processDoc(docSnap) as Report);
  } catch (error) {
    console.error('Error fetching reports for content:', error);
    return [];
  }
}

export const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'spam', label: 'Spam', description: 'Unsolicited promotional content or repetitive posts' },
  { value: 'harassment', label: 'Harassment', description: 'Bullying, threats, or targeted attacks' },
  { value: 'misinformation', label: 'Misinformation', description: 'False or misleading information' },
  { value: 'hate_speech', label: 'Hate Speech', description: 'Content promoting hatred against groups' },
  { value: 'other', label: 'Other', description: 'Other violations not listed above' },
];

/**
 * Get report statistics for the admin dashboard
 */
export async function getReportStats(): Promise<{
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  dismissedReports: number;
  reportsByReason: Record<string, number>;
  recentTrend: 'up' | 'down' | 'stable';
}> {
  try {
    const reportsCollection = collection(db, 'reports');
    const allReportsSnap = await getDocs(reportsCollection);
    const reports = allReportsSnap.docs.map(docSnap => processDoc(docSnap) as Report);

    const totalReports = reports.length;
    const pendingReports = reports.filter(r => r.status === 'pending').length;
    const resolvedReports = reports.filter(r => r.status === 'resolved').length;
    const dismissedReports = reports.filter(r => r.status === 'dismissed').length;

    // Count by reason
    const reportsByReason: Record<string, number> = {
      spam: 0,
      harassment: 0,
      misinformation: 0,
      hate_speech: 0,
      other: 0,
    };
    reports.forEach(r => {
      if (r.reason && reportsByReason[r.reason] !== undefined) {
        reportsByReason[r.reason]++;
      }
    });

    // Calculate trend (compare last 7 days to previous 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentReports = reports.filter(r => {
      const date = r.createdAt instanceof Date ? r.createdAt : (r.createdAt as any).toDate?.() || new Date();
      return date >= sevenDaysAgo;
    }).length;

    const previousReports = reports.filter(r => {
      const date = r.createdAt instanceof Date ? r.createdAt : (r.createdAt as any).toDate?.() || new Date();
      return date >= fourteenDaysAgo && date < sevenDaysAgo;
    }).length;

    let recentTrend: 'up' | 'down' | 'stable' = 'stable';
    if (recentReports > previousReports * 1.2) {
      recentTrend = 'up';
    } else if (recentReports < previousReports * 0.8) {
      recentTrend = 'down';
    }

    return {
      totalReports,
      pendingReports,
      resolvedReports,
      dismissedReports,
      reportsByReason,
      recentTrend,
    };
  } catch (error) {
    console.error('Error getting report stats:', error);
    return {
      totalReports: 0,
      pendingReports: 0,
      resolvedReports: 0,
      dismissedReports: 0,
      reportsByReason: { spam: 0, harassment: 0, misinformation: 0, hate_speech: 0, other: 0 },
      recentTrend: 'stable',
    };
  }
}
