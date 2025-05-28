
"use client"; 

import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import type { Post, Comment as CommentType, AuthorInfo } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ThumbsUp, MessageCircle, Send, Edit, Trash2, MoreHorizontal, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from 'next/link';
import { getPostById, getCommentsForPost, createComment } from '@/services/postService';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';


interface PostPageParams {
  id: string;
  slug: string;
}

interface CommentCardProps {
  comment: CommentType;
}

function CommentCard({ comment }: CommentCardProps) {
  const { user } = useAuth();
  
  let formattedDate = "Unknown date";
  if (comment.createdAt) {
     try {
      const date = comment.createdAt instanceof Date ? comment.createdAt : (comment.createdAt as any).toDate();
      formattedDate = format(date, "d MMM yyyy 'at' HH:mm");
    } catch (e) { console.error("Error formatting comment date:", e); }
  }

  const authorName = comment.author?.name || 'Anonymous';
  const authorAvatar = comment.author?.avatarUrl;
  const authorAvatarFallback = authorName.substring(0,1).toUpperCase();


  return (
    <Card className="mb-4 bg-secondary/50 shadow-sm">
      <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={authorAvatar || undefined} alt={authorName} data-ai-hint="commenter avatar"/>
              <AvatarFallback>{authorAvatarFallback}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{authorName}</p>
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
            </div>
          </div>
           {user && (user.uid === comment.author?.uid || user.role === 'moderator' || user.role === 'superuser') && (
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled> {/* TODO: Implement edit */}
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground"> {/* TODO: Implement delete */}
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3 px-4 sm:px-6">
        <p className="text-foreground/90 whitespace-pre-wrap text-sm">{comment.content}</p>
      </CardContent>
      <CardFooter className="pt-2 pb-3 px-4 sm:px-6 border-t">
        <Button variant="ghost" size="sm" className="text-muted-foreground group" disabled> {/* TODO: Implement likes */}
          <ThumbsUp className="mr-1.5 h-4 w-4 group-hover:text-primary transition-colors" /> {comment.likes}
        </Button>
      </CardFooter>
    </Card>
  );
}


export default function PostPage({ params }: { params: PostPageParams }) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPostAndComments = async () => {
      setIsLoadingPost(true);
      setIsLoadingComments(true);
      setError(null);
      try {
        const fetchedPost = await getPostById(params.id);
        if (fetchedPost) {
          setPost(fetchedPost);
          const fetchedComments = await getCommentsForPost(params.id);
          setComments(fetchedComments);
        } else {
          setError("Post not found.");
        }
      } catch (err) {
        console.error("Error fetching post details:", err);
        setError("Failed to load post details. Please try again.");
      } finally {
        setIsLoadingPost(false);
        setIsLoadingComments(false);
      }
    };

    if (params.id) {
      fetchPostAndComments();
    }
  }, [params.id]); 

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !post) return;

    setIsSubmittingComment(true);
    try {
      const authorInfo: AuthorInfo = {
        uid: user.uid,
        name: user.name,
        avatarUrl: user.avatarUrl,
      };
      const commentToCreate: Omit<CommentType, 'id' | 'createdAt' | 'likes'> = {
        postId: post.id,
        author: authorInfo,
        content: newComment.trim(),
      };
      
      const newCommentId = await createComment(post.id, commentToCreate);
      // Optimistically add comment or refetch
      const createdComment: CommentType = {
        ...commentToCreate,
        id: newCommentId,
        createdAt: new Date(), // This will be replaced by server timestamp on refetch
        likes: 0,
      };
      setComments([createdComment, ...comments]); 
      setPost(prevPost => prevPost ? ({ ...prevPost, commentsCount: prevPost.commentsCount + 1 }) : null);
      setNewComment('');
      toast({ title: "Comment posted!" });
    } catch (err) {
      console.error("Failed to submit comment:", err);
      toast({ title: "Error", description: "Could not post comment. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmittingComment(false);
    }
  };
  
  if (isLoadingPost) {
    return (
       <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading post...</p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
       <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
        <div className="text-center py-10">
          <h1 className="text-xl md:text-2xl font-semibold text-destructive">{error}</h1>
          <Button asChild className="mt-4"><Link href="/">Go to Homepage</Link></Button>
        </div>
      </MainLayout>
    );
  }
  
  if (!post) {
     return (
       <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
        <div className="text-center py-10">
          <h1 className="text-xl md:text-2xl font-semibold">Post not found</h1>
          <p className="text-muted-foreground mt-2">The post you are looking for does not exist or has been removed.</p>
          <Button asChild className="mt-4"><Link href="/">Go to Homepage</Link></Button>
        </div>
      </MainLayout>
    );
  }

  let formattedDate = "Unknown date";
  if (post.createdAt) {
     try {
      const date = post.createdAt instanceof Date ? post.createdAt : (post.createdAt as any).toDate();
      formattedDate = format(date, "MMMM d, yyyy 'at' HH:mm");
    } catch (e) { console.error("Error formatting post date:", e); }
  }
  
  const authorName = post.author?.name || 'Anonymous';
  const authorAvatar = post.author?.avatarUrl;
  const authorAvatarFallback = authorName.substring(0,1).toUpperCase();


  return (
    <MainLayout
      weatherWidget={<WeatherWidget />}
      adsWidget={<AdPlaceholder />}
    >
      <article className="w-full max-w-4xl mx-auto">
        <Card className="mb-6 md:mb-8 shadow-lg">
          <CardHeader className="p-4 sm:p-5 md:p-6">
            <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">{post.title}</CardTitle>
            <div className="flex flex-col sm:flex-row sm:items-center gap-x-2 gap-y-1 text-sm text-muted-foreground mt-2">
              {post.author?.uid ? (
                <Link href={`/profile/${post.author.uid}`} className="flex items-center gap-2 hover:underline">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={authorAvatar || undefined} alt={authorName} data-ai-hint="author avatar" />
                    <AvatarFallback>{authorAvatarFallback}</AvatarFallback>
                  </Avatar>
                  <span>{authorName}</span>
                </Link>
              ) : (
                 <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8"><AvatarFallback>{authorAvatarFallback}</AvatarFallback></Avatar>
                    <span>{authorName}</span>
                  </div>
              )}
              <span className="hidden sm:inline">•</span>
              <span>{formattedDate}</span>
            </div>
            {post.flairs && post.flairs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {post.flairs.map((flair) => (
                  <Badge key={flair} variant="secondary" className="bg-accent/20 text-accent-foreground hover:bg-accent/30">
                    {flair}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="px-4 sm:px-5 md:px-6 pt-0 pb-4 md:pb-6 prose prose-sm sm:prose-base md:prose-lg max-w-none dark:prose-invert whitespace-pre-wrap">
            {post.content}
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 md:p-6 border-t">
            <div className="flex gap-2 sm:gap-4 text-muted-foreground">
              <Button variant="outline" size="sm" className="group" disabled> {/* TODO: Implement likes */}
                <ThumbsUp className="mr-1.5 h-4 w-4 group-hover:text-primary transition-colors" /> {post.likes} Likes
              </Button>
              <Button variant="outline" size="sm" className="group">
                <MessageCircle className="mr-1.5 h-4 w-4 group-hover:text-primary transition-colors" /> {post.commentsCount} Comments
              </Button>
            </div>
            {/* Future: Share, Save buttons */}
          </CardFooter>
        </Card>

        <Separator className="my-6 md:my-8" />

        {/* Comments Section */}
        <section id="comments" className="mb-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6">Comments ({post.commentsCount})</h2>
          {(authLoading) ? (
             <div className="flex justify-center items-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
             </div>
          ) : user ? (
            <form onSubmit={handleCommentSubmit} className="mb-6 md:mb-8">
              <Card className="shadow">
                <CardContent className="p-4">
                  <Label htmlFor="new-comment" className="sr-only">Add a comment</Label>
                  <Textarea
                    id="new-comment"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts..."
                    rows={3}
                    className="mb-3 text-sm sm:text-base"
                  />
                  <Button type="submit" disabled={!newComment.trim() || isSubmittingComment} className="w-full sm:w-auto">
                    {isSubmittingComment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} 
                    Post Comment
                  </Button>
                </CardContent>
              </Card>
            </form>
          ) : (
            <p className="mb-6 text-center text-muted-foreground">
              <Link href={`/auth?redirect=/post/${params.id}/${params.slug}`} className="text-primary hover:underline">Log in</Link> to post a comment.
            </p>
          )}
          
          {isLoadingComments ? (
            <div className="flex justify-center items-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
               <p className="ml-2 text-muted-foreground">Loading comments...</p>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {comments.length > 0 ? (
                comments.map(comment => <CommentCard key={comment.id} comment={comment} />)
              ) : (
                <p className="text-muted-foreground text-center py-4">No comments yet. Be the first to share your thoughts!</p>
              )}
            </div>
          )}
        </section>
      </article>
    </MainLayout>
  );
}

