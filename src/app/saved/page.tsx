"use client";

import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, Bookmark } from 'lucide-react';
import { getSavedPosts } from '@/services/bookmarkService';
import type { Post } from '@/types';
import { PostCard } from '@/components/posts/post-card';

export default function SavedPostsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=/saved');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchSavedPosts = async () => {
      setLoading(true);
      try {
        const posts = await getSavedPosts(user.uid);
        setSavedPosts(posts);
      } catch (error) {
        console.error('Error fetching saved posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedPosts();
  }, [user]);

  const handlePostDeleted = (postId: string) => {
    setSavedPosts(prev => prev.filter(p => p.id !== postId));
  };

  if (authLoading || !user) {
    return (
      <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bookmark className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-2xl">Saved Posts</CardTitle>
                <CardDescription>Posts you've bookmarked for later</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : savedPosts.length === 0 ? (
              <div className="text-center py-10">
                <Bookmark className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No saved posts yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click the bookmark icon on any post to save it for later.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedPosts.map((post, index) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onPostDeleted={handlePostDeleted}
                    staggerIndex={index}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
