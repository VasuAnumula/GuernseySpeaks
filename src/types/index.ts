
import type { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string; // Firebase UID
  name?: string | null; // Real name or full name
  displayName?: string | null; // Public display name, can be different from name
  email?: string | null;
  avatarUrl?: string | null;
  role?: 'user' | 'moderator' | 'superuser';
  createdAt?: Timestamp | Date;
}

export interface AuthorInfo {
  uid: string;
  name?: string | null; // Real name or full name
  displayName?: string | null; // Public display name
  avatarUrl?: string | null;
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
  // Optional: for tracking clicks or impressions if needed later
  // clicks?: number;
  // impressions?: number;
}
