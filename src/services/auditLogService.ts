import { db } from '@/lib/firebase/config';
import type { AuditLog, AuditActionType } from '@/types';
import { processDoc } from '@/lib/firestoreUtils';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  limit,
  where,
  Timestamp,
} from 'firebase/firestore';

interface CreateAuditLogData {
  actionType: AuditActionType;
  adminUid: string;
  adminDisplayName?: string;
  targetType: 'user' | 'post' | 'comment' | 'report' | 'advertisement' | 'settings';
  targetId: string;
  details: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    reason?: string;
    [key: string]: unknown;
  };
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: CreateAuditLogData): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'auditLogs'), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw - audit logging should not break main operations
    return '';
  }
}

/**
 * Get audit logs with optional filtering
 */
export async function getAuditLogs(options?: {
  actionType?: AuditActionType;
  adminUid?: string;
  targetType?: string;
  limitCount?: number;
}): Promise<AuditLog[]> {
  try {
    const auditLogsCollection = collection(db, 'auditLogs');
    const constraints: any[] = [];

    if (options?.actionType) {
      constraints.push(where('actionType', '==', options.actionType));
    }
    if (options?.adminUid) {
      constraints.push(where('adminUid', '==', options.adminUid));
    }
    if (options?.targetType) {
      constraints.push(where('targetType', '==', options.targetType));
    }

    constraints.push(orderBy('createdAt', 'desc'));
    constraints.push(limit(options?.limitCount || 100));

    const q = query(auditLogsCollection, ...constraints);
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((docSnap) => processDoc(docSnap) as AuditLog);
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    if (error.code === 'failed-precondition' && error.message.toLowerCase().includes('index')) {
      console.error('A Firestore index is required for audit logs.');
    }
    return [];
  }
}

/**
 * Get recent admin activity summary
 */
export async function getRecentAdminActivity(limitCount: number = 20): Promise<AuditLog[]> {
  return getAuditLogs({ limitCount });
}

// Helper functions for common audit log entries

export async function logUserRoleChange(
  adminUid: string,
  adminDisplayName: string,
  targetUserId: string,
  oldRole: string,
  newRole: string
): Promise<void> {
  await createAuditLog({
    actionType: 'user_role_changed',
    adminUid,
    adminDisplayName,
    targetType: 'user',
    targetId: targetUserId,
    details: {
      before: { role: oldRole },
      after: { role: newRole },
    },
  });
}

export async function logUserBan(
  adminUid: string,
  adminDisplayName: string,
  targetUserId: string,
  reason: string
): Promise<void> {
  await createAuditLog({
    actionType: 'user_banned',
    adminUid,
    adminDisplayName,
    targetType: 'user',
    targetId: targetUserId,
    details: { reason },
  });
}

export async function logUserUnban(
  adminUid: string,
  adminDisplayName: string,
  targetUserId: string
): Promise<void> {
  await createAuditLog({
    actionType: 'user_unbanned',
    adminUid,
    adminDisplayName,
    targetType: 'user',
    targetId: targetUserId,
    details: {},
  });
}

export async function logContentModeration(
  adminUid: string,
  adminDisplayName: string,
  actionType: 'content_hidden' | 'content_unhidden' | 'content_deleted',
  contentType: 'post' | 'comment',
  contentId: string,
  reason?: string
): Promise<void> {
  await createAuditLog({
    actionType,
    adminUid,
    adminDisplayName,
    targetType: contentType,
    targetId: contentId,
    details: { contentType, reason },
  });
}

export async function logReportAction(
  adminUid: string,
  adminDisplayName: string,
  reportId: string,
  action: 'report_resolved' | 'report_dismissed',
  reportAction?: string
): Promise<void> {
  await createAuditLog({
    actionType: action,
    adminUid,
    adminDisplayName,
    targetType: 'report',
    targetId: reportId,
    details: { reportAction },
  });
}

export async function logAdAction(
  adminUid: string,
  adminDisplayName: string,
  adId: string,
  actionType: 'ad_created' | 'ad_deleted' | 'ad_status_changed',
  details?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    actionType,
    adminUid,
    adminDisplayName,
    targetType: 'advertisement',
    targetId: adId,
    details: details || {},
  });
}

export async function logSettingsUpdate(
  adminUid: string,
  adminDisplayName: string,
  changedFields: string[]
): Promise<void> {
  await createAuditLog({
    actionType: 'settings_updated',
    adminUid,
    adminDisplayName,
    targetType: 'settings',
    targetId: 'platform',
    details: { changedFields },
  });
}
