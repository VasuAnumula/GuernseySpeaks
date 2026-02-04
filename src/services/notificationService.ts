
import { db } from '@/lib/firebase/config';
import type { Notification, NotificationType } from '@/types';
import { processDoc } from '@/lib/firestoreUtils';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  writeBatch,
  limit,
  Unsubscribe,
} from 'firebase/firestore';

interface CreateNotificationData {
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  data?: {
    postId?: string;
    commentId?: string;
    actorUid?: string;
    actorDisplayName?: string;
  };
}

/**
 * Create a new notification
 */
export async function createNotification(data: CreateNotificationData): Promise<string> {
  try {
    // Don't notify yourself
    if (data.data?.actorUid === data.recipientUid) {
      return '';
    }

    const docRef = await addDoc(collection(db, 'notifications'), {
      ...data,
      read: false,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw new Error('Failed to create notification.');
  }
}

/**
 * Get notifications for a user
 */
export async function getNotifications(
  userId: string,
  limitCount: number = 20
): Promise<Notification[]> {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((docSnap) => processDoc(docSnap) as Notification);
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    if (error.code === 'failed-precondition' && error.message.toLowerCase().includes('index')) {
      console.error('A Firestore index is required for notifications. Check console for link.');
    }
    return [];
  }
}

/**
 * Subscribe to real-time notifications for a user
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
  limitCount: number = 20
): Unsubscribe {
  const q = query(
    collection(db, 'notifications'),
    where('recipientUid', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((docSnap) => processDoc(docSnap) as Notification);
      callback(notifications);
    },
    (error) => {
      console.error('Error in notification subscription:', error);
      callback([]);
    }
  );
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error('Failed to mark notification as read.');
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', userId),
      where('read', '==', false)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return;

    const batch = writeBatch(db);
    querySnapshot.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, { read: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw new Error('Failed to mark notifications as read.');
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', userId),
      where('read', '==', false)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
}

// Helper functions to create specific notification types

/**
 * Notify post author when someone comments on their post
 */
export async function notifyPostComment(
  postAuthorUid: string,
  postId: string,
  postTitle: string,
  commenterUid: string,
  commenterDisplayName: string
): Promise<void> {
  await createNotification({
    recipientUid: postAuthorUid,
    type: 'post_comment',
    title: 'New Comment',
    message: `${commenterDisplayName} commented on your post "${postTitle.substring(0, 30)}${postTitle.length > 30 ? '...' : ''}"`,
    link: `/post/${postId}`,
    data: {
      postId,
      actorUid: commenterUid,
      actorDisplayName: commenterDisplayName,
    },
  });
}

/**
 * Notify comment author when someone replies to their comment
 */
export async function notifyCommentReply(
  commentAuthorUid: string,
  postId: string,
  commentId: string,
  replierUid: string,
  replierDisplayName: string
): Promise<void> {
  await createNotification({
    recipientUid: commentAuthorUid,
    type: 'comment_reply',
    title: 'New Reply',
    message: `${replierDisplayName} replied to your comment`,
    link: `/post/${postId}#comment-${commentId}`,
    data: {
      postId,
      commentId,
      actorUid: replierUid,
      actorDisplayName: replierDisplayName,
    },
  });
}

/**
 * Notify post author when someone likes their post
 */
export async function notifyPostLike(
  postAuthorUid: string,
  postId: string,
  postTitle: string,
  likerUid: string,
  likerDisplayName: string
): Promise<void> {
  await createNotification({
    recipientUid: postAuthorUid,
    type: 'post_like',
    title: 'New Like',
    message: `${likerDisplayName} liked your post "${postTitle.substring(0, 30)}${postTitle.length > 30 ? '...' : ''}"`,
    link: `/post/${postId}`,
    data: {
      postId,
      actorUid: likerUid,
      actorDisplayName: likerDisplayName,
    },
  });
}

/**
 * Notify user when they receive a moderation warning
 */
export async function notifyModerationWarning(
  userUid: string,
  contentType: 'post' | 'comment',
  reason: string,
  contentPreview?: string
): Promise<void> {
  const contentTypeLabel = contentType === 'post' ? 'post' : 'comment';
  const previewText = contentPreview
    ? `: "${contentPreview.substring(0, 50)}${contentPreview.length > 50 ? '...' : ''}"`
    : '';

  await createNotification({
    recipientUid: userUid,
    type: 'moderation_warning',
    title: 'Content Warning',
    message: `Your ${contentTypeLabel}${previewText} has been flagged for ${reason}. Please review our community guidelines.`,
    link: '/terms',
  });
}

/**
 * Notify user when their content is auto-hidden due to reports
 */
export async function notifyContentHidden(
  userUid: string,
  contentType: 'post' | 'comment',
  contentPreview?: string
): Promise<void> {
  const contentTypeLabel = contentType === 'post' ? 'post' : 'comment';
  const previewText = contentPreview
    ? `: "${contentPreview.substring(0, 50)}${contentPreview.length > 50 ? '...' : ''}"`
    : '';

  await createNotification({
    recipientUid: userUid,
    type: 'moderation_warning',
    title: 'Content Hidden',
    message: `Your ${contentTypeLabel}${previewText} has been temporarily hidden due to multiple reports. A moderator will review it shortly.`,
    link: '/terms',
  });
}
