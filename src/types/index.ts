
import type { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string; // Firebase UID
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  role?: 'user' | 'moderator' | 'superuser';
  createdAt?: Timestamp | Date; 
}

export interface AuthorInfo {
  uid: string;
  name?: string | null;
  avatarUrl?: string | null;
}

export interface Post {
  id: string; // Firestore document ID
  title: string;
  content: string;
  author: AuthorInfo; // Embedded author information
  createdAt: Timestamp | Date; // Firestore Timestamp or JS Date
  flairs: string[];
  likes: number;
  commentsCount: number;
  slug: string;
}

export interface Comment {
  id: string; // Firestore document ID
  postId: string;
  author: AuthorInfo; // Embedded author information
  content: string;
  createdAt: Timestamp | Date; // Firestore Timestamp or JS Date
  likes: number;
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
