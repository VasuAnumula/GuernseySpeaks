
"use client";

import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getUserById } from '@/services/userService';
import { getPostsByAuthor, getCommentsByUser } from '@/services/postService';
import type { User, Post, Comment } from '@/types';
import { Loader2, Mail, User as UserIconLucide, ShieldCheck, AlertTriangle, MessageSquare, FileText, Calendar, ThumbsUp } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const { user: currentUser } = useAuth();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userComments, setUserComments] = useState<(Comment & { postId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formattedJoinedDate, setFormattedJoinedDate] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async () => {
    if (!userId) {
      setError("User ID not found in URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fetchedUser = await getUserById(userId);
      if (fetchedUser) {
        setProfileUser(fetchedUser);
      } else {
        setError("User profile not found.");
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setError("Failed to load user profile.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchUserPosts = useCallback(async () => {
    if (!userId) return;
    setLoadingPosts(true);
    try {
      const posts = await getPostsByAuthor(userId);
      setUserPosts(posts);
    } catch (err) {
      console.error("Error fetching user posts:", err);
    } finally {
      setLoadingPosts(false);
    }
  }, [userId]);

  const fetchUserComments = useCallback(async () => {
    if (!userId) return;
    setLoadingComments(true);
    try {
      const comments = await getCommentsByUser(userId);
      setUserComments(comments);
    } catch (err) {
      console.error("Error fetching user comments:", err);
    } finally {
      setLoadingComments(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserProfile();
    fetchUserPosts();
    fetchUserComments();
  }, [fetchUserProfile, fetchUserPosts, fetchUserComments]);

  useEffect(() => {
    if (profileUser?.createdAt) {
      try {
        const date = profileUser.createdAt instanceof Date ? profileUser.createdAt : (profileUser.createdAt as any).toDate();
        setFormattedJoinedDate(format(date, "MMMM d, yyyy"));
      } catch (e) {
        console.error("Error formatting joined date for profile user:", e);
        setFormattedJoinedDate("Invalid Date");
      }
    } else if (profileUser && !profileUser.createdAt) {
      setFormattedJoinedDate("Not available");
    }
  }, [profileUser]);

  // Check if current user can see email
  const canSeeEmail = currentUser && profileUser && (
    currentUser.uid === profileUser.uid || // Own profile
    currentUser.role === 'superuser' ||    // Superuser
    currentUser.role === 'moderator'       // Moderator
  );

  if (loading) {
    return (
      <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading profile...</p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    const isIndexError = error.includes("index");
    return (
      <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
        <Card className="w-full max-w-md mx-auto mt-10 border-destructive/50">
          <CardHeader className="items-center text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-2" />
            <CardTitle>Error Loading Profile</CardTitle>
            <CardDescription className="text-destructive font-medium">{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 items-center">
            {isIndexError && (
              <div className="text-sm text-muted-foreground text-center bg-muted p-3 rounded-md">
                <p className="mb-2">This is likely due to a missing database index.</p>
                <p><strong>Developer Action:</strong> Check the browser console (F12) for a Firebase link to create the required index.</p>
              </div>
            )}
            <Button asChild variant="outline">
              <Link href="/">Return to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  if (!profileUser) {
    return (
      <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
        <div className="text-center py-10">
          <h1 className="text-xl md:text-2xl font-semibold">Profile not found</h1>
          <p className="text-muted-foreground mt-2">The user profile you are looking for does not exist.</p>
          <Button asChild className="mt-4"><Link href="/">Go to Homepage</Link></Button>
        </div>
      </MainLayout>
    );
  }

  const displayName = profileUser.displayName || profileUser.name || 'User';
  const avatarFallback = displayName.substring(0, 1).toUpperCase() || <UserIconLucide />;

  return (
    <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
      <div className="space-y-6">
        {/* Profile Header Card */}
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader className="text-center">
            <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-primary shadow-md">
              <AvatarImage src={profileUser.avatarUrl || undefined} alt={displayName} data-ai-hint="user large_avatar" />
              <AvatarFallback className="text-5xl">{avatarFallback}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-3xl">{displayName}</CardTitle>
            {canSeeEmail && profileUser.email && (
              <CardDescription className="flex items-center justify-center gap-1">
                <Mail className="h-4 w-4 text-muted-foreground" /> {profileUser.email}
              </CardDescription>
            )}
            {profileUser.role && (
              <div className="mt-2 flex items-center justify-center gap-1 text-sm text-accent-foreground font-medium">
                <ShieldCheck className="h-5 w-5 text-accent" /> Role: <span className="capitalize">{profileUser.role}</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-1">About {displayName}</h3>
              {profileUser.bio && (
                <p className="text-base mb-4 whitespace-pre-wrap">{profileUser.bio}</p>
              )}
              <p className="text-muted-foreground text-sm flex items-center justify-center gap-1">
                <Calendar className="h-4 w-4" /> Member since: {formattedJoinedDate || 'Loading...'}
              </p>
              {/* Add more public profile information here, e.g., bio if you add it to User type */}
            </div>
          </CardContent>
        </Card>

        {/* Posts Section */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Posts ({userPosts.length})</CardTitle>
            </div>
            <CardDescription>All posts created by {displayName}</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPosts ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading posts...</p>
              </div>
            ) : userPosts.length > 0 ? (
              <div className="space-y-4">
                {userPosts.slice(0, 10).map((post) => (
                  <Card key={post.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <Link href={`/post/${post.id}/${post.slug}`} className="hover:underline">
                        <CardTitle className="text-lg">{post.title}</CardTitle>
                      </Link>
                      <CardDescription className="line-clamp-2">{post.content}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" /> {post.likes || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> {post.commentsCount || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {post.createdAt && format(post.createdAt instanceof Date ? post.createdAt : new Date(), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {userPosts.length > 10 && (
                  <p className="text-center text-sm text-muted-foreground">
                    Showing 10 of {userPosts.length} posts
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No posts yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle>Comments ({userComments.length})</CardTitle>
            </div>
            <CardDescription>All comments made by {displayName}</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingComments ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading comments...</p>
              </div>
            ) : userComments.length > 0 ? (
              <div className="space-y-4">
                {userComments.slice(0, 10).map((comment) => (
                  <Card key={comment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <p className="text-sm line-clamp-3 mb-3">{comment.content}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <Link href={`/post/${comment.postId}`} className="hover:underline flex items-center gap-1">
                          <FileText className="h-3 w-3" /> View post
                        </Link>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" /> {comment.likes || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {comment.createdAt && format(comment.createdAt instanceof Date ? comment.createdAt : new Date(), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {userComments.length > 10 && (
                  <p className="text-center text-sm text-muted-foreground">
                    Showing 10 of {userComments.length} comments
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No comments yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
