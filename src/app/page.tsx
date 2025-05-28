
"use client";
import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { PostCard } from '@/components/posts/post-card';
import { PostListFilters } from '@/components/posts/post-list-filters';
import type { Post } from '@/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PenSquare, Loader2 } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { getPosts } from '@/services/postService';
import { useAuth } from '@/hooks/use-auth';

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  const fetchPosts = useCallback(async () => {
    try {
      setLoadingPosts(true);
      const fetchedPosts = await getPosts();
      setPosts(fetchedPosts);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
      setError("Could not load posts. Please try again later.");
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handlePostDeleted = (deletedPostId: string) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== deletedPostId));
  };

  return (
    <MainLayout
      weatherWidget={<WeatherWidget />}
      adsWidget={<AdPlaceholder />}
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Community Feed</h1>
        {!authLoading && user && (
          <Button asChild>
            <Link href="/submit">
              <PenSquare className="mr-2 h-5 w-5" /> Create Post
            </Link>
          </Button>
        )}
      </div>
      
      <PostListFilters />

      {loadingPosts && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading posts...</p>
        </div>
      )}
      {error && <p className="text-center text-destructive py-10">{error}</p>}
      
      {!loadingPosts && !error && (
        <div className="space-y-6">
          {posts.length > 0 ? (
            posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                onPostDeleted={handlePostDeleted} 
              />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-10">No posts yet. Be the first to share something!</p>
          )}
        </div>
      )}
    </MainLayout>
  );
}
