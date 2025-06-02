
"use client";

import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import type { Post, Comment as CommentType, AuthorInfo, User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ThumbsUp, MessageCircle, Send, Edit, Trash2, MoreHorizontal, Loader2, Save, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect, useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPostById, getCommentsForPost, createComment, togglePostLike, deletePost, updateComment, deleteComment } from '@/services/postService';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { processDoc } from '@/lib/firestoreUtils';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';


interface PostPageParams {
  id: string;
  slug: string;
}

interface CommentCardProps {
  comment: CommentType;
  postId: string;
  onCommentDeleted: (commentId: string) => void;
  onCommentEdited: (editedComment: CommentType) => void;
}

function CommentCard({ comment: initialComment, postId, onCommentDeleted, onCommentEdited }: CommentCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comment, setComment] = useState<CommentType>(initialComment);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setComment(initialComment);
    setEditedContent(initialComment.content);
  }, [initialComment]);

  let formattedDate = "Unknown date";
  if (comment.createdAt) {
     try {
      const date = comment.createdAt instanceof Date ? comment.createdAt : (comment.createdAt as any).toDate();
      formattedDate = format(date, "d MMM yyyy 'at' HH:mm");
    } catch (e) { console.error("Error formatting comment date:", e); }
  }
  let lastUpdatedDate = "";
  if (comment.updatedAt && comment.createdAt) {
    const createdAtDate = comment.createdAt instanceof Date ? comment.createdAt : (comment.createdAt as any).toDate();
    const updatedAtDate = comment.updatedAt instanceof Date ? comment.updatedAt : (comment.updatedAt as any).toDate();
    if (updatedAtDate.getTime() - createdAtDate.getTime() > 60000) { // More than 1 minute difference
        lastUpdatedDate = ` (edited ${formatDistanceToNow(updatedAtDate, { addSuffix: true })})`;
    }
  }


  const authorDisplayName = comment.author?.displayName || comment.author?.name || 'Anonymous';
  const authorAvatar = comment.author?.avatarUrl;
  const authorAvatarFallback = authorDisplayName.substring(0,1).toUpperCase();

  const canModifyComment = user && (user.uid === comment.author?.uid || user.role === 'moderator' || user.role === 'superuser');

  const handleEditSave = async () => {
    if (!editedContent.trim()) {
      toast({ title: "Error", description: "Comment cannot be empty.", variant: "destructive" });
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateComment(postId, comment.id, editedContent.trim());
      const updatedCommentData = { ...comment, content: editedContent.trim(), updatedAt: new Date() };
      setComment(updatedCommentData); // Update local comment state
      onCommentEdited(updatedCommentData); // Notify parent
      setIsEditing(false);
      toast({ title: "Comment Updated" });
    } catch (error) {
      console.error("Failed to update comment:", error);
      toast({ title: "Error", description: "Could not update comment.", variant: "destructive" });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteComment(postId, comment.id);
      onCommentDeleted(comment.id); // Notify parent to remove from list
      toast({ title: "Comment Deleted" });
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast({ title: "Error", description: "Could not delete comment.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="mb-4 bg-secondary/50 shadow-sm">
      <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={authorAvatar || undefined} alt={authorDisplayName} data-ai-hint="commenter avatar"/>
              <AvatarFallback>{authorAvatarFallback}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{authorDisplayName}</p>
              <p className="text-xs text-muted-foreground">
                {formattedDate}
                {lastUpdatedDate && <i className="text-xs">{lastUpdatedDate}</i>}
              </p>
            </div>
          </div>
           {canModifyComment && !isEditing && (
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this comment.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3 px-4 sm:px-6">
        {isEditing ? (
          <div className="space-y-2 mt-2">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={3}
              className="text-sm"
              disabled={isSavingEdit}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setEditedContent(comment.content); }} disabled={isSavingEdit}>
                <XCircle className="mr-1 h-4 w-4"/> Cancel
              </Button>
              <Button size="sm" onClick={handleEditSave} disabled={isSavingEdit || !editedContent.trim()}>
                {isSavingEdit ? <Loader2 className="mr-1 h-4 w-4 animate-spin"/> : <Save className="mr-1 h-4 w-4"/>} Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-foreground/90 whitespace-pre-wrap text-sm">{comment.content}</p>
        )}
      </CardContent>
      <CardFooter className="pt-2 pb-3 px-4 sm:px-6 border-t">
        <Button variant="ghost" size="sm" className="text-muted-foreground group" disabled>
          <ThumbsUp className="mr-1.5 h-4 w-4 group-hover:text-primary transition-colors" /> {comment.likes}
        </Button>
      </CardFooter>
    </Card>
  );
}


export default function PostPage({ params }: { params: PostPageParams }) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPostAndComments = useCallback(async () => {
    if (!params.id) {
      setError("Post ID is missing.");
      setIsLoadingPost(false);
      setIsLoadingComments(false);
      return;
    }
    setIsLoadingPost(true);
    setIsLoadingComments(true);
    setError(null);
    try {
      const fetchedPost = await getPostById(params.id);
      if (fetchedPost) {
        setPost(fetchedPost);
        if(user && fetchedPost.likedBy) {
          setIsLiked(fetchedPost.likedBy.includes(user.uid));
        }
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
  }, [params.id, user]); // Add user to dependency array

  useEffect(() => {
    fetchPostAndComments();
  }, [fetchPostAndComments]);

  const handleCommentDeleted = (deletedCommentId: string) => {
    setComments(prevComments => prevComments.filter(c => c.id !== deletedCommentId));
    setPost(prevPost => prevPost ? { ...prevPost, commentsCount: Math.max(0, prevPost.commentsCount - 1) } : null);
  };

  const handleCommentEdited = (editedComment: CommentType) => {
    setComments(prevComments => prevComments.map(c => c.id === editedComment.id ? editedComment : c));
  };

  const handleLikeToggle = async () => {
    if (!user || !post) {
      toast({ title: "Login Required", description: "You need to be logged in to like posts.", variant: "destructive" });
      return;
    }
    if (isLiking) return;
    setIsLiking(true);

    const originalLikedState = isLiked;
    const originalLikesCount = post.likes;
    const originalLikedBy = [...post.likedBy];

    setIsLiked(!originalLikedState);
    setPost(p => p ? ({ ...p, likes: originalLikedState ? p.likes - 1 : p.likes + 1, likedBy: originalLikedState ? p.likedBy.filter(uid => uid !== user.uid) : [...p.likedBy, user.uid] }) : null);

    try {
      const updatedPostData = await togglePostLike(post.id, user.uid);
      setPost(p => p ? ({ ...p, ...updatedPostData }) : null);
      setIsLiked(updatedPostData.likedBy.includes(user.uid));
    } catch (error) {
      console.error("Failed to toggle like:", error);
      toast({ title: "Error", description: "Could not update like. Please try again.", variant: "destructive" });
      setIsLiked(originalLikedState);
      setPost(p => p ? ({ ...p, likes: originalLikesCount, likedBy: originalLikedBy }) : null);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post || !canModifyPost) return;
    setIsDeletingPost(true);
    try {
      await deletePost(post.id);
      toast({ title: "Post Deleted", description: "The post has been successfully deleted." });
      router.push('/');
    } catch (error) {
      console.error("Failed to delete post:", error);
      toast({ title: "Error", description: "Could not delete post. Please try again.", variant: "destructive" });
    } finally {
      setIsDeletingPost(false);
    }
  };


  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !post) return;

    setIsSubmittingComment(true);
    try {
      const authorInfo: AuthorInfo = { // Ensure AuthorInfo matches the type, including displayName
        uid: user.uid,
        name: user.name,
        displayName: user.displayName || user.name, // Use displayName or fallback to name
        avatarUrl: user.avatarUrl,
      };
      const commentToCreate: Omit<CommentType, 'id' | 'createdAt' | 'updatedAt' | 'likes'> = {
        postId: post.id,
        author: authorInfo,
        content: newComment.trim(),
      };

      const newCommentId = await createComment(post.id, commentToCreate);

      const commentDocRef = doc(db, 'posts', post.id, 'comments', newCommentId);
      const createdCommentData = await getDoc(commentDocRef);
      if (createdCommentData.exists()){
         const createdComment = processDoc(createdCommentData) as CommentType;
         setComments(prevComments => [createdComment, ...prevComments]);
         setPost(prevPost => prevPost ? ({ ...prevPost, commentsCount: prevPost.commentsCount + 1 }) : null);
      }
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
        <div className="flex justify-center items-center py-10 h-64">
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

  let formattedPostDate = "Unknown date";
  if (post.createdAt) {
     try {
      const date = post.createdAt instanceof Date ? post.createdAt : (post.createdAt as any).toDate();
      formattedPostDate = format(date, "MMMM d, yyyy 'at' HH:mm");
    } catch (e) { console.error("Error formatting post date:", e); }
  }

  let postLastUpdatedDate = "";
  if (post.updatedAt && post.createdAt) {
    const createdAtDate = post.createdAt instanceof Date ? post.createdAt : (post.createdAt as any).toDate();
    const updatedAtDate = post.updatedAt instanceof Date ? post.updatedAt : (post.updatedAt as any).toDate();
    if (updatedAtDate.getTime() - createdAtDate.getTime() > 60000) {
        postLastUpdatedDate = ` (edited ${formatDistanceToNow(updatedAtDate, { addSuffix: true })})`;
    }
  }

  const authorDisplayName = post.author?.displayName || post.author?.name || 'Anonymous';
  const authorAvatar = post.author?.avatarUrl;
  const authorAvatarFallback = authorDisplayName.substring(0,1).toUpperCase();
  const canModifyPost = user && (user.uid === post.author?.uid || user.role === 'superuser' || user.role === 'moderator');


  return (
    <MainLayout
      weatherWidget={<WeatherWidget />}
      adsWidget={<AdPlaceholder />}
    >
      <article className="w-full max-w-3xl mx-auto">
        <Card className="mb-6 md:mb-8 shadow-lg">
          <CardHeader className="p-4 sm:p-5 md:p-6">
            <div className="flex items-start justify-between">
              <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary break-words">
                {post.title}
              </CardTitle>
              {canModifyPost && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="ml-2 flex-shrink-0" disabled={isDeletingPost}>
                       {isDeletingPost ? <Loader2 className="h-5 w-5 animate-spin" /> : <MoreHorizontal className="h-5 w-5" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/post/${post.id}/${post.slug}/edit`}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this post and all its comments.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeletePost} className="bg-destructive hover:bg-destructive/90">
                             {isDeletingPost ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-x-2 gap-y-1 text-sm text-muted-foreground mt-2">
              {post.author?.uid ? (
                <Link href={`/profile/${post.author.uid}`} className="flex items-center gap-2 hover:underline">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={authorAvatar || undefined} alt={authorDisplayName} data-ai-hint="author avatar" />
                    <AvatarFallback>{authorAvatarFallback}</AvatarFallback>
                  </Avatar>
                  <span>{authorDisplayName}</span>
                </Link>
              ) : (
                 <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8"><AvatarFallback>{authorAvatarFallback}</AvatarFallback></Avatar>
                    <span>{authorDisplayName}</span>
                  </div>
              )}
              <span className="hidden sm:inline">•</span>
              <span>{formattedPostDate}{postLastUpdatedDate && <i className="text-xs">{postLastUpdatedDate}</i>}</span>
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
            <div className="flex gap-1 sm:gap-2 text-muted-foreground">
              <Button
                variant="outline"
                size="sm"
                className={`group ${isLiked ? 'text-primary border-primary hover:bg-primary/10' : 'hover:text-primary hover:border-primary/50'}`}
                onClick={handleLikeToggle}
                disabled={isLiking || !user}
              >
                {isLiking ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ThumbsUp className={`mr-1.5 h-4 w-4 transition-colors ${isLiked ? 'fill-current' : ''}`} />}
                 {post.likes} Like{post.likes !== 1 && 's'}
              </Button>
              <Button variant="outline" size="sm" className="group hover:text-primary hover:border-primary/50">
                <MessageCircle className="mr-1.5 h-4 w-4 group-hover:text-primary transition-colors" /> {post.commentsCount} Comment{post.commentsCount !== 1 && 's'}
              </Button>
            </div>
          </CardFooter>
        </Card>

        <Separator className="my-6 md:my-8" />

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
                comments.map(comment => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    postId={post.id}
                    onCommentDeleted={handleCommentDeleted}
                    onCommentEdited={handleCommentEdited}
                  />
                ))
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
