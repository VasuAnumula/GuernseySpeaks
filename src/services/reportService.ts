
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
} from 'firebase/firestore';

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
 * Create a new report
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

    const docRef = await addDoc(collection(db, 'reports'), {
      ...data,
      status: 'pending' as ReportStatus,
      reviewedBy: null,
      reviewedAt: null,
      action: null,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error: any) {
    console.error('Error creating report:', error);
    throw new Error(error.message || 'Failed to submit report.');
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
 */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  action: ReportAction,
  reviewerUid: string
): Promise<void> {
  try {
    const reportDocRef = doc(db, 'reports', reportId);
    await updateDoc(reportDocRef, {
      status,
      action,
      reviewedBy: reviewerUid,
      reviewedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating report:', error);
    throw new Error('Failed to update report.');
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
