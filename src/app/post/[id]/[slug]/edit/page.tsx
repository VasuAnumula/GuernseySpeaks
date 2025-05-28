
"use client";

import { MainLayout } from '@/components/layout/main-layout';
import { PostForm } from '@/components/posts/post-form';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getPostById } from '@/services/postService';
import type { Post } from '@/types';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function EditPostPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const postSlug = params.slug as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return; // Wait for auth state to be determined

    if (!user) {
      router.push(`/auth?redirect=/post/${postId}/${postSlug}/edit`);
      return;
    }

    const fetchPost = async () => {
      if (!postId) {
        setError("Post ID not found.");
        setLoadingPost(false);
        return;
      }
      try {
        const fetchedPost = await getPostById(postId);
        if (!fetchedPost) {
          setError("Post not found or you don't have permission to edit it.");
          setLoadingPost(false);
          return;
        }
        // Authorization check
        if (fetchedPost.author.uid !== user.uid && user.role !== 'superuser' && user.role !== 'moderator') {
          setError("You are not authorized to edit this post.");
          setPost(null); // Clear post if not authorized
        } else {
          setPost(fetchedPost);
        }
      } catch (err) {
        console.error("Error fetching post for edit:", err);
        setError("Failed to load post data.");
      } finally {
        setLoadingPost(false);
      }
    };

    fetchPost();
  }, [user, authLoading, router, postId, postSlug]);

  if (authLoading || loadingPost) {
    return (
      <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading editor...</p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
        <Card className="w-full max-w-md mx-auto mt-10">
          <CardHeader className="items-center">
             <AlertTriangle className="h-12 w-12 text-destructive mb-2" />
            <CardTitle>Error Loading Post</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href={postSlug && postId ? `/post/${postId}/${postSlug}` : "/"}>Return to Post or Home</Link>
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }
  
  if (!post) { // Should be covered by error state, but as a fallback
    return (
      <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
        <div className="flex justify-center items-center h-64">
          <p className="text-destructive">Could not load post for editing.</p>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
      <PostForm postToEdit={post} />
    </MainLayout>
  );
}
