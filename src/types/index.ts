
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
  commentsCount: number;
  slug: string;
}

export interface Comment {
  id: string; // Firestore document ID
  postId: string;
  author: AuthorInfo; // Embedded author information
  content: string;
  createdAt: Timestamp | Date; // Firestore Timestamp or JS Date
  updatedAt?: Timestamp | Date;
  likes: number;
  // likedBy: string[]; // Future: for comment liking
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
