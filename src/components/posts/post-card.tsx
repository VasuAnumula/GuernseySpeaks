"use client";

import type { Post } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, MessageCircle, MoreHorizontal, Edit, Trash2, Loader2, Share, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
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
import { useAuth } from '@/hooks/use-auth';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import { deletePost, togglePostLike, togglePostDislike } from '@/services/postService';
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
  const [isDisliked, setIsDisliked] = useState(false);
  const [isDisliking, setIsDisliking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, staggerIndex * 50);
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
    if (user && post.dislikedBy) {
      setIsDisliked(post.dislikedBy.includes(user.uid));
    } else {
      setIsDisliked(false);
    }
  }, [user, post.likedBy, post.dislikedBy]);

  let formattedDate = "Unknown date";
  if (post.createdAt) {
    try {
      const date = post.createdAt instanceof Date 
        ? post.createdAt 
        : 'toDate' in post.createdAt 
          ? post.createdAt.toDate() 
          : new Date(post.createdAt);
      formattedDate = formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      console.error("Error formatting date:", e, post.createdAt);
    }
  }

  const postSlug = post.slug || post.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  const authorDisplayName = post.author?.displayName || 'Anonymous';
  const authorAvatar = post.author?.avatarUrl;
  const authorAvatarFallback = authorDisplayName.substring(0,1).toUpperCase();

  const canModify = user && (user.uid === post.author?.uid || user.role === 'superuser' || user.role === 'moderator');

  const handleLikeToggle = async () => {
    if (!user) return;
    setIsLiking(true);

    try {
      const updatedPostData = await togglePostLike(post.id, user.uid);
      setPost(prevPost => ({ ...prevPost, ...updatedPostData }));
      setIsLiked(updatedPostData.likedBy.includes(user.uid));
      setIsDisliked(updatedPostData.dislikedBy.includes(user.uid));
    } catch (error) {
      console.error("Failed to toggle like:", error);
      toast({ title: "Error", description: "Could not update like. Please try again.", variant: "destructive" });
    } finally {
      setIsLiking(false);
    }
  };

  const handleDislikeToggle = async () => {
    if (!user) return;
    setIsDisliking(true);

    try {
      const updatedPostData = await togglePostDislike(post.id, user.uid);
      setPost(prevPost => ({ ...prevPost, ...updatedPostData }));
      setIsDisliked(updatedPostData.dislikedBy.includes(user.uid));
      setIsLiked(updatedPostData.likedBy.includes(user.uid));
    } catch (error) {
      console.error("Failed to toggle dislike:", error);
      toast({ title: "Error", description: "Could not update dislike. Please try again.", variant: "destructive" });
    } finally {
      setIsDisliking(false);
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

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/post/${post.id}/${postSlug}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.content.substring(0, 100) + '...',
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled sharing or error occurred
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: "Link Copied", description: "Post link copied to clipboard!" });
      } catch (error) {
        console.error('Failed to copy link:', error);
        toast({ title: "Share Failed", description: "Could not copy link to clipboard", variant: "destructive" });
      }
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({ title: "Login Required", description: "You need to be logged in to save posts.", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    try {
      // In a real app, you'd have a save/unsave API endpoint
      // For now, we'll just simulate the functionality
      const newSavedState = !isSaved;
      setIsSaved(newSavedState);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast({ 
        title: newSavedState ? "Post Saved" : "Post Unsaved", 
        description: newSavedState ? "Post saved for later viewing" : "Post removed from saved items"
      });
    } catch (error) {
      console.error('Failed to save post:', error);
      toast({ title: "Error", description: "Could not save post. Please try again.", variant: "destructive" });
      setIsSaved(!isSaved); // Revert on error
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`
        mb-2
        transition-all duration-200 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        bg-card border border-border/40
        hover:border-border
        group
        ${className}
      `}
    >
      {/* Main content area */}
      <div className="p-3 cursor-pointer" onClick={() => window.location.href = `/post/${post.id}/${postSlug}`}>
          {/* Post metadata - Reddit style */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            {post.flairs && post.flairs.length > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary px-2 py-0.5 text-xs rounded-full border-0">
                {post.flairs[0]}
              </Badge>
            )}
            <span>Posted by</span>
            {post.author?.uid ? (
              <Link href={`/profile/${post.author.uid}`} className="hover:underline font-medium text-primary" onClick={(e) => e.stopPropagation()}>
                u/{authorDisplayName}
              </Link>
            ) : (
              <span className="font-medium">u/{authorDisplayName}</span>
            )}
            <span>•</span>
            <span>{formattedDate}</span>
            {canModify && (
              <div className="ml-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={isDeleting} onClick={(e) => e.stopPropagation()}>
                      {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <MoreHorizontal className="h-3 w-3" />}
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
                          className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground cursor-pointer"
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
              </div>
            )}
          </div>

          {/* Post title */}
          <h2 className="text-lg font-medium leading-tight text-foreground hover:text-primary transition-colors duration-200 mb-2">
            {post.title}
          </h2>

          {/* Post content preview */}
          <div className="text-sm text-foreground/80 line-clamp-3 whitespace-pre-wrap mb-3">
            {post.content}
          </div>

          {/* Post image */}
          {post.imageUrl && (
            <div className="mb-3 rounded-lg overflow-hidden border border-border/40 bg-muted/20">
              <Image 
                src={post.imageUrl} 
                alt="post image" 
                width={600} 
                height={350} 
                className="w-full h-auto object-contain max-h-96" 
                style={{ aspectRatio: 'auto' }}
              />
            </div>
          )}

          {/* Bottom actions - Reddit style */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              className={`p-1 h-auto text-xs rounded transition-colors ${isLiked ? 'text-orange-500 hover:text-orange-600' : 'hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950'}`}
              onClick={(e) => { e.stopPropagation(); handleLikeToggle(); }}
              disabled={isLiking || !user}
            >
              {isLiking ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <ThumbsUp className={`mr-1 h-3 w-3 ${isLiked ? 'fill-current' : ''}`} />
              )}
              {post.likes}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`p-1 h-auto text-xs rounded transition-colors ${isDisliked ? 'text-blue-600 hover:text-blue-700' : 'hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950'}`}
              onClick={(e) => { e.stopPropagation(); handleDislikeToggle(); }}
              disabled={isDisliking || !user}
            >
              {isDisliking ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <ThumbsDown className={`mr-1 h-3 w-3 ${isDisliked ? 'fill-current' : ''}`} />
              )}
              {post.dislikes}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-auto text-xs hover:bg-muted/50 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `/post/${post.id}/${postSlug}`;
              }}
            >
              <MessageCircle className="mr-1 h-3 w-3" />
              {post.commentsCount || 0}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-auto text-xs hover:bg-muted/50 rounded transition-colors"
              onClick={handleShare}
            >
              <Share className="mr-1 h-3 w-3" />
              Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`p-1 h-auto text-xs rounded transition-colors ${isSaved ? 'text-yellow-600 hover:text-yellow-700' : 'hover:bg-muted/50'}`}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Bookmark className={`mr-1 h-3 w-3 ${isSaved ? 'fill-current' : ''}`} />
              )}
              {isSaved ? 'Saved' : 'Save'}
            </Button>
          </div>
        </div>
    </div>
  );
}