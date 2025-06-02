
"use client";

import type { Post } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ThumbsUp, MessageCircle, Bookmark, MoreHorizontal, Edit, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
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
} from "@/components/ui/alert-dialog"; // AlertDialogTrigger removed as it's used with asChild
import { useAuth } from '@/hooks/use-auth';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import { deletePost, togglePostLike } from '@/services/postService';
import { useToast } from '@/hooks/use-toast';

interface PostCardProps {
  post: Post;
  onPostDeleted?: (postId: string) => void;
  className?: string;
  staggerIndex?: number;
}

export function PostCard({ post: initialPost, onPostDeleted, className, staggerIndex = 0 }: PostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [post, setPost] = useState<Post>(initialPost);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, staggerIndex * 100);
    return () => clearTimeout(timer);
  }, [staggerIndex]);

  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  useEffect(() => {
    if (user && post.likedBy) {
      setIsLiked(post.likedBy.includes(user.uid));
    } else {
      setIsLiked(false);
    }
  }, [user, post.likedBy]);

  let formattedDate = "Unknown date";
  if (post.createdAt) {
    try {
      const date = post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt);
      formattedDate = formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      console.error("Error formatting date:", e, post.createdAt);
    }
  }

  const postSlug = post.slug || post.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  const authorDisplayName = post.author?.displayName || post.author?.name || 'Anonymous';
  const authorAvatar = post.author?.avatarUrl;
  const authorAvatarFallback = authorDisplayName.substring(0,1).toUpperCase();

  const canModify = user && (user.uid === post.author?.uid || user.role === 'superuser' || user.role === 'moderator');

  const handleLikeToggle = async () => {
    if (!user) {
      toast({ title: "Login Required", description: "You need to be logged in to like posts.", variant: "destructive" });
      return;
    }
    if (isLiking) return;
    setIsLiking(true);

    const originalLikedState = isLiked;
    const originalLikesCount = post.likes;

    setIsLiked(!originalLikedState);
    setPost(prevPost => ({
      ...prevPost,
      likes: originalLikedState ? prevPost.likes -1 : prevPost.likes + 1,
      likedBy: originalLikedState
        ? prevPost.likedBy.filter(uid => uid !== user.uid)
        : [...prevPost.likedBy, user.uid]
    }));

    try {
      const updatedPostData = await togglePostLike(post.id, user.uid);
      setPost(prevPost => ({ ...prevPost, ...updatedPostData }));
      setIsLiked(updatedPostData.likedBy.includes(user.uid));
    } catch (error) {
      console.error("Failed to toggle like:", error);
      toast({ title: "Error", description: "Could not update like. Please try again.", variant: "destructive" });
      setIsLiked(originalLikedState);
      setPost(prevPost => ({ ...prevPost, likes: originalLikesCount, likedBy: originalLikedState ? [...prevPost.likedBy, user.uid] : prevPost.likedBy.filter(uid => uid !== user.uid) }));
    } finally {
      setIsLiking(false);
    }
  };

  const handleDeletePost = async () => {
    if (!canModify) return;
    setIsDeleting(true);
    try {
      await deletePost(post.id);
      toast({ title: "Post Deleted", description: "The post has been successfully deleted." });
      if (onPostDeleted) {
        onPostDeleted(post.id);
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
      toast({ title: "Error", description: "Could not delete post. Please try again.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card
      className={`
        mb-6 shadow-lg
        transition-all duration-500 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}
        hover:shadow-xl hover:-translate-y-1.5 hover:scale-[1.01]
        ${className}
      `}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <Link href={`/post/${post.id}/${postSlug}`} className="group">
            <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors duration-200">
              {post.title}
            </CardTitle>
          </Link>
          {canModify && (
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <MoreHorizontal className="h-5 w-5" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/post/${post.id}/${postSlug}/edit`}>
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
                        This action cannot be undone. This will permanently delete the post and all its comments.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeletePost} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <CardDescription className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
          {post.author?.uid ? (
             <Link href={`/profile/${post.author.uid}`} className="flex items-center gap-2 hover:underline hover:text-primary/90 transition-colors duration-200">
              <Avatar className="h-6 w-6">
                <AvatarImage src={authorAvatar || undefined} alt={authorDisplayName} data-ai-hint="author avatar"/>
                <AvatarFallback>{authorAvatarFallback}</AvatarFallback>
              </Avatar>
              <span>{authorDisplayName}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                 <AvatarFallback>{authorAvatarFallback}</AvatarFallback>
              </Avatar>
              <span>{authorDisplayName}</span>
            </div>
          )}
          <span>•</span>
          <span>{formattedDate}</span>
        </CardDescription>
        {post.flairs && post.flairs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {post.flairs.map((flair) => (
              <Badge key={flair} variant="secondary" className="bg-accent/20 text-accent-foreground hover:bg-accent/30 cursor-pointer transition-colors duration-200">
                {flair}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-foreground/90 line-clamp-3 whitespace-pre-wrap">{post.content}</p>
        <Link href={`/post/${post.id}/${postSlug}`} className="text-sm text-primary hover:underline hover:text-primary/80 transition-colors duration-200 mt-2 inline-block">
            Read more
        </Link>
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-4 border-t">
        <div className="flex gap-1 sm:gap-4 text-muted-foreground">
          <Button variant="ghost" size="sm" className={`group ${isLiked ? 'text-primary hover:text-primary/90' : 'hover:text-primary'}`} onClick={handleLikeToggle} disabled={isLiking || !user}>
            {isLiking ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ThumbsUp className={`mr-1.5 h-4 w-4 transition-colors ${isLiked ? 'fill-current' : ''}`} />}
            {post.likes}
          </Button>
          <Link href={`/post/${post.id}/${postSlug}#comments`} passHref>
            <Button variant="ghost" size="sm" className="group hover:text-primary">
              <MessageCircle className="mr-1.5 h-4 w-4 group-hover:text-primary transition-colors" /> {post.commentsCount}
            </Button>
          </Link>
        </div>
        <Button variant="ghost" size="sm" className="group hover:text-primary" disabled> {/* TODO: Implement Save/Bookmark */}
          <Bookmark className="mr-1.5 h-4 w-4 group-hover:text-primary transition-colors" /> Save
        </Button>
      </CardFooter>
    </Card>
  );
}
