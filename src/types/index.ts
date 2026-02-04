
import type { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string; // Firebase UID
  name?: string | null; // Real name or full name
  displayName?: string | null; // Public display name, can be different from name
  email?: string | null;
  avatarUrl?: string | null;
  bio?: string | null; // User biography
  role?: 'user' | 'moderator' | 'superuser';
  createdAt?: Timestamp | Date;
  savedPosts?: string[]; // Array of saved post IDs
  // Moderation fields
  isBanned?: boolean; // Whether the user is banned
  bannedAt?: Timestamp | Date | null;
  bannedBy?: string | null; // UID of admin who banned
  banReason?: string | null;
}

export interface AuthorInfo {
  uid: string;
  name?: string | null; // Real name or full name
  displayName?: string | null; // Public display name
  avatarUrl?: string | null;
  bio?: string | null; // User biography
}

export interface Post {
  id: string; // Firestore document ID
  title: string;
  content: string;
  author: AuthorInfo; // Embedded author information
  createdAt: Timestamp | Date; // Firestore Timestamp or JS Date
  updatedAt?: Timestamp | Date; // Firestore Timestamp or JS Date for edits
  flairs: string[];
  likes: number;
  likedBy: string[]; // Array of UIDs who liked the post
  dislikes: number;
  dislikedBy: string[]; // Array of UIDs who disliked the post
  commentsCount: number;
  imageUrl?: string | null;
  slug: string;
  // Moderation fields
  isHidden?: boolean; // Auto-hidden due to reports
  reportCount?: number; // Number of pending reports
}

export interface Comment {
  id: string; // Firestore document ID
  postId: string;
  author: AuthorInfo; // Embedded author information
  content: string;
  parentId: string | null; // ID of the parent comment, null if top-level
  createdAt: Timestamp | Date; // Firestore Timestamp or JS Date
  updatedAt?: Timestamp | Date;
  likes: number;
  likedBy: string[];
  dislikes: number;
  dislikedBy: string[];
  imageUrl?: string | null;
  // Moderation fields
  isHidden?: boolean; // Auto-hidden due to reports
  reportCount?: number; // Number of pending reports
}

// For rendering threaded comments
export interface CommentNode extends Comment {
  replies: CommentNode[];
  depth: number;
}


export interface WeatherData {
  location: {
    name: string;
    region: string;
    country: string;
    localtime: string;
  };
  current: {
    temp_c: number;
    temp_f: number;
    condition: {
      text: string;
      icon: string; // URL
      code: number;
    };
    wind_kph: number;
    wind_dir: string;
    humidity: number;
    feelslike_c: number;
    uv: number;
  };
}

export interface Advertisement {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  uploaderUid: string;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  // Scheduling fields
  scheduledStart?: Timestamp | Date | null; // When the ad should start showing
  scheduledEnd?: Timestamp | Date | null; // When the ad should stop showing
  // Tracking fields
  clicks?: number;
  impressions?: number;
}

export interface AnnouncementBanner {
  enabled: boolean;
  text: string;
  type: 'info' | 'warning' | 'success' | 'error';
  link?: string;
}

export interface PlatformSettings {
  announcementBanner: AnnouncementBanner;
  contentModeration: {
    autoHideReportedPosts: boolean;
    autoHideThreshold: number;
  };
  features: {
    commentsEnabled: boolean;
    postsEnabled: boolean;
  };
  updatedAt?: Timestamp | Date;
  updatedBy?: string;
}

export type NotificationType = 'comment_reply' | 'post_like' | 'post_comment' | 'system' | 'moderation_warning';

export interface ParticipantInfo {
  displayName: string;
  avatarUrl?: string;
}

export interface Conversation {
  id: string;
  participants: string[]; // Array of 2 UIDs
  participantInfo: { [uid: string]: ParticipantInfo };
  lastMessage?: {
    content: string;
    senderId: string;
    sentAt: Timestamp | Date;
  };
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: Timestamp | Date;
}

export interface Notification {
  id: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: Timestamp | Date;
  data?: {
    postId?: string;
    commentId?: string;
    actorUid?: string;
    actorDisplayName?: string;
  };
}

export type ReportReason = 'spam' | 'harassment' | 'misinformation' | 'hate_speech' | 'other';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';
export type ReportAction = 'none' | 'content_removed' | 'user_warned';

export interface Report {
  id: string;
  contentType: 'post' | 'comment';
  contentId: string;
  contentPreview?: string; // Preview of the reported content
  contentAuthorUid?: string; // UID of the content author
  reporterUid: string;
  reporterDisplayName?: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  reviewedBy?: string | null;
  reviewedAt?: Timestamp | Date | null;
  action?: ReportAction | null;
  createdAt: Timestamp | Date;
}

// Admin Audit Log Types
export type AuditActionType =
  | 'user_role_changed'
  | 'user_banned'
  | 'user_unbanned'
  | 'content_hidden'
  | 'content_unhidden'
  | 'content_deleted'
  | 'report_resolved'
  | 'report_dismissed'
  | 'ad_created'
  | 'ad_deleted'
  | 'ad_status_changed'
  | 'settings_updated';

export interface AuditLog {
  id: string;
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
  createdAt: Timestamp | Date;
}

// Report Statistics
export interface ReportStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  dismissedReports: number;
  reportsByReason: Record<ReportReason, number>;
  reportsByDay: { date: string; count: number }[];
}
