import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { PostCard } from '@/components/posts/post-card';
import { PostListFilters } from '@/components/posts/post-list-filters';
import type { Post, User } from '@/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PenSquare } from 'lucide-react';

// Mock Data
const mockUser: User = {
  id: '1',
  name: 'Guernsey Gache',
  email: 'gache@example.com',
  avatarUrl: 'https://placehold.co/40x40.png?text=GG',
  role: 'user',
};

const mockUser2: User = {
  id: '2',
  name: 'Sarnia Sue',
  email: 'sue@example.com',
  avatarUrl: 'https://placehold.co/40x40.png?text=SS',
  role: 'user',
};

const mockPosts: Post[] = [
  {
    id: '1',
    title: 'Beautiful Sunset over Cobo Bay',
    content: 'Captured this stunning sunset yesterday evening at Cobo. The colors were absolutely breathtaking. Guernsey really knows how to put on a show! Share your favorite sunset spots.',
    author: mockUser,
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    flairs: ['Photography', 'Scenery', 'Cobo'],
    likes: 152,
    commentsCount: 18,
    slug: 'beautiful-sunset-over-cobo-bay'
  },
  {
    id: '2',
    title: 'Upcoming Liberation Day Events?',
    content: 'Does anyone have the schedule for Liberation Day events this year? Looking particularly for family-friendly activities. Thanks in advance!',
    author: mockUser2,
    createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    flairs: ['Events', 'Liberation Day', 'Family'],
    likes: 78,
    commentsCount: 25,
    slug: 'upcoming-liberation-day-events'
  },
  {
    id: '3',
    title: 'Best Fish and Chips on the Island?',
    content: 'New to Guernsey and on a quest for the best fish and chips. I\'ve heard a few names thrown around, but want to hear from the locals! Where should I go?',
    author: mockUser,
    createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    flairs: ['Food', 'Local Tips', 'Discussion'],
    likes: 110,
    commentsCount: 42,
    slug: 'best-fish-and-chips-on-the-island'
  },
];


export default function HomePage() {
  return (
    <MainLayout
      weatherWidget={<WeatherWidget />}
      adsWidget={<AdPlaceholder />}
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Community Feed</h1>
        <Button asChild>
          <Link href="/submit">
            <PenSquare className="mr-2 h-5 w-5" /> Create Post
          </Link>
        </Button>
      </div>
      
      <PostListFilters />

      <div className="space-y-6">
        {mockPosts.length > 0 ? (
          mockPosts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <p className="text-center text-muted-foreground py-10">No posts yet. Be the first to share something!</p>
        )}
      </div>
    </MainLayout>
  );
}
