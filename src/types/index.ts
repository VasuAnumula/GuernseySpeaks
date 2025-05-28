export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  role?: 'user' | 'moderator' | 'superuser';
}

export interface Post {
  id: string;
  title: string;
  content: string;
  author: User;
  createdAt: string; // ISO date string
  flairs: string[];
  likes: number;
  commentsCount: number;
  slug: string;
}

export interface Comment {
  id:string;
  postId: string;
  author: User;
  content: string;
  createdAt: string; // ISO date string
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
