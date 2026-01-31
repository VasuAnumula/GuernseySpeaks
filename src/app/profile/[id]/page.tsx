"use client";

import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { User as UserIcon, ShieldCheck, Loader2, FileText, MessageSquare, Calendar, ThumbsUp, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { getUserById } from '@/services/userService';
import { getPostsByAuthor, getCommentsByUser } from '@/services/postService';
import type { User, Post, Comment } from '@/types';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewConversationDialog } from '@/components/messages/new-conversation-dialog';

export default function PublicProfilePage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const profileUserId = params.id as string;

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userComments, setUserComments] = useState<(Comment & { postId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  // Redirect to own profile page if viewing own profile
  useEffect(() => {
    if (!authLoading && currentUser && currentUser.uid === profileUserId) {
      router.push('/profile');
    }
  }, [currentUser, authLoading, profileUserId, router]);

  // Fetch profile user data
  useEffect(() => {
    const fetchUser = async () => {
      if (!profileUserId) return;
      setLoading(true);
      try {
        const userData = await getUserById(profileUserId);
        setProfileUser(userData);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [profileUserId]);

  // Fetch user activity
  const fetchUserActivity = useCallback(async () => {
    if (!profileUserId) return;

    setLoadingPosts(true);
    try {
      const posts = await getPostsByAuthor(profileUserId);
      setUserPosts(posts);
    } catch (err) {
      console.error("Error fetching user posts:", err);
    } finally {
      setLoadingPosts(false);
    }

    setLoadingComments(true);
    try {
      const comments = await getCommentsByUser(profileUserId);
      setUserComments(comments);
    } catch (err) {
      console.error("Error fetching user comments:", err);
    } finally {
      setLoadingComments(false);
    }
  }, [profileUserId]);

  useEffect(() => {
    fetchUserActivity();
  }, [fetchUserActivity]);

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

  if (!profileUser) {
    return (
      <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
        <div className="text-center py-10">
          <UserIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">User not found</p>
        </div>
      </MainLayout>
    );
  }

  const displayName = profileUser.displayName || profileUser.name || 'User';
  const userAvatarFallback = displayName.substring(0, 1).toUpperCase();
  let formattedJoinedDate = "Unknown";
  if (profileUser.createdAt) {
    try {
      const date = profileUser.createdAt instanceof Date
        ? profileUser.createdAt
        : (profileUser.createdAt as any).toDate();
      formattedJoinedDate = format(date, "MMMM d, yyyy");
    } catch (e) {
      console.error("Error formatting joined date:", e);
    }
  }

  return (
    <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
      <div className="space-y-6">
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader className="text-center">
            <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-primary shadow-md">
              <AvatarImage src={profileUser.avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="text-4xl">{userAvatarFallback}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-2xl">{displayName}</CardTitle>
            {profileUser.bio && (
              <CardDescription className="text-base mt-2">{profileUser.bio}</CardDescription>
            )}
            {profileUser.role && profileUser.role !== 'user' && (
              <div className="mt-2 flex items-center justify-center gap-1">
                <Badge variant="secondary" className="capitalize">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  {profileUser.role}
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Joined {formattedJoinedDate}
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {userPosts.length} posts
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                {userComments.length} comments
              </div>
            </div>

            {currentUser && currentUser.uid !== profileUserId && (
              <div className="flex justify-center pt-4">
                <Button onClick={() => setMessageDialogOpen(true)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Sections */}
        <Card className="max-w-4xl mx-auto">
          <Tabs defaultValue="posts" className="w-full">
            <CardHeader className="pb-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="posts" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Posts ({userPosts.length})
                </TabsTrigger>
                <TabsTrigger value="comments" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments ({userComments.length})
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-6">
              <TabsContent value="posts" className="mt-0">
                {loadingPosts ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : userPosts.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {userPosts.slice(0, 10).map((post) => (
                      <div key={post.id} className="border-b pb-3 last:border-0">
                        <Link href={`/post/${post.id}/${post.slug}`} className="font-medium hover:underline block truncate">
                          {post.title}
                        </Link>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {post.likes}</span>
                          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {post.commentsCount}</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {post.createdAt && format(post.createdAt instanceof Date ? post.createdAt : new Date(), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No posts yet.</p>
                )}
              </TabsContent>

              <TabsContent value="comments" className="mt-0">
                {loadingComments ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : userComments.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {userComments.slice(0, 10).map((comment) => (
                      <div key={comment.id} className="border-b pb-3 last:border-0">
                        <p className="text-sm line-clamp-2 mb-1">"{comment.content}"</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <Link href={`/post/${comment.postId}`} className="hover:underline text-primary">
                            View Post
                          </Link>
                          <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {comment.likes}</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {comment.createdAt && format(comment.createdAt instanceof Date ? comment.createdAt : new Date(), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No comments yet.</p>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Message Dialog */}
      {currentUser && (
        <NewConversationDialog
          open={messageDialogOpen}
          onOpenChange={setMessageDialogOpen}
          currentUser={currentUser}
          preselectedUserId={profileUserId}
          preselectedUserInfo={{
            displayName: displayName,
            avatarUrl: profileUser.avatarUrl || undefined,
          }}
        />
      )}
    </MainLayout>
  );
}
