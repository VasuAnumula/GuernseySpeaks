
"use client";

import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import type { Post, Comment as CommentType, AuthorInfo, User, CommentNode } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ThumbsUp, ThumbsDown, MessageCircle, Send, Edit, Trash2, MoreHorizontal, Loader2, Save, XCircle, MessageSquareReply, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
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
import { getPostById, getCommentsForPost, createComment, togglePostLike, togglePostDislike, deletePost, updateComment, deleteComment, toggleCommentLike, toggleCommentDislike, uploadCommentImage } from '@/services/postService';
import { capitalizeSentences } from '@/lib/utils';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { processDoc } from '@/lib/firestoreUtils';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';


interface PostPageParams {
  id: string;
  slug: string;
}

interface CommentCardProps {
  commentNode: CommentNode;
  postId: string;
  onCommentDeleted: (commentId: string) => void;
  onCommentEdited: (editedComment: CommentType) => void;
  onReplySubmitted: () => void;
  isLastChild: boolean; // To control bottom border for the last comment in a list
}

function CommentCard({ commentNode, postId, onCommentDeleted, onCommentEdited, onReplySubmitted, isLastChild }: CommentCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comment, setComment] = useState<CommentType>(commentNode);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isCommentLiked, setIsCommentLiked] = useState(false);
  const [isCommentDisliked, setIsCommentDisliked] = useState(false);
  const [isCommentLiking, setIsCommentLiking] = useState(false);
  const [isCommentDisliking, setIsCommentDisliking] = useState(false);

  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [replyPreview, setReplyPreview] = useState<string | null>(null);

  useEffect(() => {
    setComment(commentNode);
    setEditedContent(commentNode.content);
    if (user && commentNode.likedBy) {
      setIsCommentLiked(commentNode.likedBy.includes(user.uid));
    } else {
      setIsCommentLiked(false);
    }
    if (user && commentNode.dislikedBy) {
      setIsCommentDisliked(commentNode.dislikedBy.includes(user.uid));
    } else {
      setIsCommentDisliked(false);
    }
  }, [commentNode, user]);

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
    if (updatedAtDate.getTime() - createdAtDate.getTime() > 60000) { // Only show if updated more than a minute after creation
        lastUpdatedDate = ` (edited ${formatDistanceToNow(updatedAtDate, { addSuffix: true })})`;
    }
  }

  const authorDisplayName = comment.author?.displayName || 'Anonymous';
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
      const processedEdit = capitalizeSentences(editedContent.trim());
      await updateComment(postId, comment.id, processedEdit);
      const updatedCommentData = { ...comment, content: processedEdit, updatedAt: new Date() };
      setComment(updatedCommentData);
      onCommentEdited(updatedCommentData); // Propagate update to parent state
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
      onCommentDeleted(comment.id); // Propagate delete to parent state
      toast({ title: "Comment Deleted" });
      // The comment card will be removed from the DOM by the parent component re-rendering
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast({ title: "Error", description: "Could not delete comment.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReplyImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setReplyImage(file);
    setReplyPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !user) {
      toast({ title: "Error", description: "Reply cannot be empty and you must be logged in.", variant: "destructive" });
      return;
    }
    setIsSubmittingReply(true);
    try {
      const authorInfo: AuthorInfo = {
        uid: user.uid,
        displayName: user.displayName || user.name || 'User', // Ensure displayName has a fallback
        avatarUrl: user.avatarUrl,
      };
      let uploadedUrl: string | undefined;
      if (replyImage) {
        try {
          uploadedUrl = await uploadCommentImage(postId, replyImage);
        } catch (err) {
          console.error('reply image upload failed:', err);
          toast({ title: 'Image Upload Failed', variant: 'destructive' });
        }
      }
      const processedReply = capitalizeSentences(replyContent.trim());
      await createComment(postId, { author: authorInfo, content: processedReply, imageUrl: uploadedUrl || null }, comment.id);
      setReplyContent('');
      setReplyImage(null);
      setReplyPreview(null);
      setShowReplyForm(false);
      onReplySubmitted(); // This will trigger a re-fetch of all comments in the parent
      toast({ title: "Reply posted!" });
    } catch (err) {
      console.error("Failed to submit reply:", err);
      toast({ title: "Error", description: "Could not post reply. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleCommentLikeToggle = async () => {
    if (!user) {
      toast({ title: "Login Required", description: "You need to be logged in to like comments.", variant: "destructive" });
      return;
    }
    if (isCommentLiking) return;
    setIsCommentLiking(true);

    const originalLiked = isCommentLiked;
    const originalDisliked = isCommentDisliked;
    const originalData = { ...comment };

    setIsCommentLiked(!originalLiked);
    setIsCommentDisliked(false);
    setComment(c => ({
      ...c,
      likes: originalLiked ? c.likes - 1 : c.likes + 1,
      likedBy: originalLiked ? c.likedBy.filter(uid => uid !== user.uid) : [...c.likedBy, user.uid],
      dislikes: c.dislikedBy.includes(user.uid) && !originalLiked ? c.dislikes - 1 : c.dislikes,
      dislikedBy: c.dislikedBy.includes(user.uid) && !originalLiked ? c.dislikedBy.filter(uid => uid !== user.uid) : c.dislikedBy
    }));

    try {
      const updated = await toggleCommentLike(postId, comment.id, user.uid);
      setComment(updated);
      onCommentEdited(updated);
      setIsCommentLiked(updated.likedBy.includes(user.uid));
      setIsCommentDisliked(updated.dislikedBy.includes(user.uid));
    } catch (error) {
      console.error('Failed to toggle comment like:', error);
      toast({ title: 'Error', description: 'Could not update like.', variant: 'destructive' });
      setComment(originalData);
      setIsCommentLiked(originalLiked);
      setIsCommentDisliked(originalDisliked);
    } finally {
      setIsCommentLiking(false);
    }
  };

  const handleCommentDislikeToggle = async () => {
    if (!user) {
      toast({ title: "Login Required", description: "You need to be logged in to dislike comments.", variant: "destructive" });
      return;
    }
    if (isCommentDisliking) return;
    setIsCommentDisliking(true);

    const originalDisliked = isCommentDisliked;
    const originalLiked = isCommentLiked;
    const originalData = { ...comment };

    setIsCommentDisliked(!originalDisliked);
    setIsCommentLiked(false);
    setComment(c => ({
      ...c,
      dislikes: originalDisliked ? c.dislikes - 1 : c.dislikes + 1,
      dislikedBy: originalDisliked ? c.dislikedBy.filter(uid => uid !== user.uid) : [...c.dislikedBy, user.uid],
      likes: c.likedBy.includes(user.uid) && !originalDisliked ? c.likes - 1 : c.likes,
      likedBy: c.likedBy.includes(user.uid) && !originalDisliked ? c.likedBy.filter(uid => uid !== user.uid) : c.likedBy
    }));

    try {
      const updated = await toggleCommentDislike(postId, comment.id, user.uid);
      setComment(updated);
      onCommentEdited(updated);
      setIsCommentDisliked(updated.dislikedBy.includes(user.uid));
      setIsCommentLiked(updated.likedBy.includes(user.uid));
    } catch (error) {
      console.error('Failed to toggle comment dislike:', error);
      toast({ title: 'Error', description: 'Could not update dislike.', variant: 'destructive' });
      setComment(originalData);
      setIsCommentDisliked(originalDisliked);
      setIsCommentLiked(originalLiked);
    } finally {
      setIsCommentDisliking(false);
    }
  };

  return (
    <div
      className={`relative ${commentNode.depth > 0 ? 'border-l border-border pl-4' : ''} ${!isLastChild || (commentNode.replies && commentNode.replies.length > 0) ? 'mb-3 pb-3' : 'mb-3'}`}
      style={{ marginLeft: `${commentNode.depth * 20}px` }} // Indentation for replies
    >
      <div className="p-2">
        <div className="flex items-start justify-between mb-1">
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
                    onSelect={(e) => e.preventDefault()} // Prevents menu from closing
                    className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete this comment. Any replies to this comment will remain but may lose context.
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

      <div className="mt-1 px-1">
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={1}
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
          <div className="space-y-2">
            <p className="text-foreground/90 whitespace-pre-wrap text-sm">{comment.content}</p>
            {comment.imageUrl && (
              <Image src={comment.imageUrl} alt="comment image" width={500} height={300} className="rounded" />
            )}
          </div>
        )}
      </div>
      
      <div className="mt-2 px-1">
        <div className="flex items-center">
            <Button variant="ghost" size="sm" className={`group -ml-2 ${isCommentLiked ? 'text-primary' : 'text-muted-foreground hover:text-primary'} transition-transform duration-150 active:scale-95`} onClick={handleCommentLikeToggle} disabled={isCommentLiking}>
                {isCommentLiking ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ThumbsUp className="mr-1.5 h-4 w-4" />}
                {comment.likes}
            </Button>
            <Button variant="ghost" size="sm" className={`group ${isCommentDisliked ? 'text-primary' : 'text-muted-foreground hover:text-primary'} transition-transform duration-150 active:scale-95`} onClick={handleCommentDislikeToggle} disabled={isCommentDisliking}>
                {isCommentDisliking ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ThumbsDown className="mr-1.5 h-4 w-4" />}
                {comment.dislikes}
            </Button>
            {user && (
            <Button variant="ghost" size="sm" className="text-muted-foreground group" onClick={() => setShowReplyForm(!showReplyForm)}>
                <MessageSquareReply className="mr-1.5 h-4 w-4 group-hover:text-primary transition-colors" /> Reply
            </Button>
            )}
        </div>

        {showReplyForm && user && (
          <form onSubmit={handleReplySubmit} className="w-full mt-2 space-y-2">
            <div className="relative">
              <Textarea
                placeholder={`Replying to ${authorDisplayName}...`}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={1}
                className="pr-10 text-sm min-h-[40px]"
                disabled={isSubmittingReply}
              />
              <label htmlFor={`reply-image-${comment.id}`} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-primary">
                <ImageIcon className="h-4 w-4" />
              </label>
              <input id={`reply-image-${comment.id}`} type="file" accept="image/*" onChange={handleReplyImageChange} className="sr-only" />
            </div>
            {replyPreview && (
              <Image src={replyPreview} alt="preview" width={400} height={250} className="rounded" />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowReplyForm(false); setReplyContent(''); }} disabled={isSubmittingReply}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmittingReply || !replyContent.trim()}>
                {isSubmittingReply ? <Loader2 className="mr-1 h-4 w-4 animate-spin"/> : <Send className="mr-1 h-4 w-4"/>} Submit Reply
              </Button>
            </div>
          </form>
        )}
      </div>
      
      {commentNode.replies && commentNode.replies.length > 0 && (
        <div className="mt-3"> {/* Spacing before nested replies */}
          {commentNode.replies.map((replyNode, index, arr) => (
            <CommentCard
              key={replyNode.id}
              commentNode={replyNode}
              postId={postId}
              onCommentDeleted={onCommentDeleted}
              onCommentEdited={onCommentEdited}
              onReplySubmitted={onReplySubmitted}
              isLastChild={index === arr.length - 1}
            />
          ))}
        </div>
      )}
    </div>
    </div>
  );
}

// Helper to build the comment tree structure
function buildCommentTree(comments: CommentType[], parentId: string | null = null, depth = 0): CommentNode[] {
  return comments
    .filter(comment => (comment.parentId || null) === parentId)
    .map(comment => ({
      ...comment,
      depth: depth,
      replies: buildCommentTree(comments, comment.id, depth + 1)
    }))
    .sort((a, b) => { // Sort direct children by creation date (ascending for typical thread flow)
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as Timestamp)?.toMillis() || 0;
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as Timestamp)?.toMillis() || 0;
        return dateA - dateB;
    });
}


export default function PostPage({ params }: { params: PostPageParams }) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isDisliking, setIsDisliking] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  const [allComments, setAllComments] = useState<CommentType[]>([]); // Flat list from Firestore
  const [commentTree, setCommentTree] = useState<CommentNode[]>([]); // Nested structure for rendering

  const [newComment, setNewComment] = useState('');
  const [newCommentImage, setNewCommentImage] = useState<File | null>(null);
  const [newCommentPreview, setNewCommentPreview] = useState<string | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetches the post and all its comments, then rebuilds the comment tree
  const fetchPostAndComments = useCallback(async () => {
    if (!params.id) {
      setError("Post ID is missing.");
      setIsLoadingPost(false);
      setIsLoadingComments(false);
      return;
    }
    // Set loading states at the beginning of the fetch operation
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
        if(user && fetchedPost.dislikedBy) {
          setIsDisliked(fetchedPost.dislikedBy.includes(user.uid));
        }
        // Fetch comments after post is confirmed to exist
        const fetchedCommentsRaw = await getCommentsForPost(params.id);
         // Ensure parentId is explicitly null if undefined from Firestore (important for tree building)
        const processedComments = fetchedCommentsRaw.map(c => ({...c, parentId: c.parentId === undefined ? null : c.parentId }));
        setAllComments(processedComments);
      } else {
        setError("Post not found.");
        setPost(null); // Ensure post is null if not found
        setAllComments([]); // Clear comments if post not found
      }
    } catch (err) {
      console.error("Error fetching post details:", err);
      setError("Failed to load post details. Please try again.");
      setPost(null);
      setAllComments([]);
    } finally {
      setIsLoadingPost(false);
      setIsLoadingComments(false);
    }
  }, [params.id, user]); // user dependency for isLiked state

  useEffect(() => {
    fetchPostAndComments();
  }, [fetchPostAndComments]);

  // Rebuild comment tree whenever allComments changes
  useEffect(() => {
    // Ensure parentId is explicitly null if it's undefined from Firestore
    const processedComments = allComments.map(c => ({...c, parentId: c.parentId === undefined ? null : c.parentId }));
    // Build tree and sort top-level comments newest first for display
    const tree = buildCommentTree(processedComments, null, 0).sort((a,b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as Timestamp)?.toMillis() || 0;
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as Timestamp)?.toMillis() || 0;
        return dateB - dateA; // Newest top-level comments first
    });
    setCommentTree(tree);
  }, [allComments]);


  const handleCommentDeleted = (deletedCommentId: string) => {
    // Remove the comment from the flat list, which will trigger tree rebuild
    setAllComments(prevComments => prevComments.filter(c => c.id !== deletedCommentId));
    // Decrement post's comment count
    setPost(prevPost => prevPost ? { ...prevPost, commentsCount: Math.max(0, prevPost.commentsCount - 1) } : null);
  };

  const handleCommentEdited = (editedComment: CommentType) => {
    // Update the comment in the flat list, triggering tree rebuild
    setAllComments(prevComments => prevComments.map(c => c.id === editedComment.id ? editedComment : c));
  };

  const handleReplySubmitted = () => {
    // Re-fetch all comments to get the new reply and update counts, then rebuild tree
    fetchPostAndComments(); 
  };


  const handleLikeToggle = async () => {
    if (!user || !post) {
      toast({ title: "Login Required", description: "You need to be logged in to like posts.", variant: "destructive" });
      return;
    }
    if (isLiking) return;
    setIsLiking(true);

    // Optimistic UI update
    const originalLikedState = isLiked;
    const originalLikesCount = post.likes;
    const originalLikedBy = [...post.likedBy]; // Shallow copy
    const originalDislikedState = isDisliked;
    const originalDislikesCount = post.dislikes;
    const originalDislikedBy = [...post.dislikedBy];

    setIsLiked(!originalLikedState);
    setIsDisliked(false);
    setPost(p => p ? ({
      ...p,
      likes: originalLikedState ? p.likes - 1 : p.likes + 1,
      likedBy: originalLikedState ? p.likedBy.filter(uid => uid !== user.uid) : [...p.likedBy, user.uid],
      dislikes: p.dislikedBy.includes(user.uid) && !originalLikedState ? p.dislikes - 1 : p.dislikes,
      dislikedBy: p.dislikedBy.includes(user.uid) && !originalLikedState ? p.dislikedBy.filter(uid => uid !== user.uid) : p.dislikedBy
    }) : null);

    try {
      const updatedPostData = await togglePostLike(post.id, user.uid);
      // Sync with server response
      setPost(p => p ? ({ ...p, ...updatedPostData }) : null);
      setIsLiked(updatedPostData.likedBy.includes(user.uid));
      setIsDisliked(updatedPostData.dislikedBy.includes(user.uid));
    } catch (error) {
      console.error("Failed to toggle like:", error);
      toast({ title: "Error", description: "Could not update like. Please try again.", variant: "destructive" });
      // Revert optimistic update on error
      setIsLiked(originalLikedState);
      setIsDisliked(originalDislikedState);
      setPost(p => p ? ({ ...p, likes: originalLikesCount, likedBy: originalLikedBy, dislikes: originalDislikesCount, dislikedBy: originalDislikedBy }) : null);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDislikeToggle = async () => {
    if (!user || !post) {
      toast({ title: "Login Required", description: "You need to be logged in to dislike posts.", variant: "destructive" });
      return;
    }
    if (isDisliking) return;
    setIsDisliking(true);

    const originalDislikedState = isDisliked;
    const originalDislikesCount = post.dislikes;
    const originalDislikedBy = [...post.dislikedBy];
    const originalLikedState = isLiked;
    const originalLikesCount = post.likes;
    const originalLikedBy = [...post.likedBy];

    setIsDisliked(!originalDislikedState);
    setIsLiked(false);
    setPost(p => p ? ({
      ...p,
      dislikes: originalDislikedState ? p.dislikes - 1 : p.dislikes + 1,
      dislikedBy: originalDislikedState ? p.dislikedBy.filter(uid => uid !== user.uid) : [...p.dislikedBy, user.uid],
      likes: p.likedBy.includes(user.uid) && !originalDislikedState ? p.likes - 1 : p.likes,
      likedBy: p.likedBy.includes(user.uid) && !originalDislikedState ? p.likedBy.filter(uid => uid !== user.uid) : p.likedBy
    }) : null);

    try {
      const updatedPostData = await togglePostDislike(post.id, user.uid);
      setPost(p => p ? ({ ...p, ...updatedPostData }) : null);
      setIsDisliked(updatedPostData.dislikedBy.includes(user.uid));
      setIsLiked(updatedPostData.likedBy.includes(user.uid));
    } catch (error) {
      console.error("Failed to toggle dislike:", error);
      toast({ title: "Error", description: "Could not update dislike. Please try again.", variant: "destructive" });
      setIsDisliked(originalDislikedState);
      setIsLiked(originalLikedState);
      setPost(p => p ? ({ ...p, dislikes: originalDislikesCount, dislikedBy: originalDislikedBy, likes: originalLikesCount, likedBy: originalLikedBy }) : null);
    } finally {
      setIsDisliking(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post || !canModifyPost) return;
    setIsDeletingPost(true);
    try {
      await deletePost(post.id);
      toast({ title: "Post Deleted", description: "The post has been successfully deleted." });
      router.push('/'); // Navigate away after deletion
    } catch (error) {
      console.error("Failed to delete post:", error);
      toast({ title: "Error", description: "Could not delete post. Please try again.", variant: "destructive" });
    } finally {
      setIsDeletingPost(false);
    }
  };

  const handleNewCommentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setNewCommentImage(file);
    setNewCommentPreview(file ? URL.createObjectURL(file) : null);
  };


  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !post) {
        toast({title: "Cannot Submit", description: "Comment cannot be empty and you must be logged in to an existing post.", variant: "destructive"});
        return;
    }

    setIsSubmittingComment(true);
    try {
        const authorInfo: AuthorInfo = {
          uid: user.uid,
          displayName: user.displayName || user.name || 'User', // Ensure fallback for displayName
          avatarUrl: user.avatarUrl,
        };
      let uploadedUrl: string | undefined;
      if (newCommentImage) {
        try {
          uploadedUrl = await uploadCommentImage(post.id, newCommentImage);
        } catch (err) {
          console.error('comment image upload failed:', err);
          toast({ title: 'Image Upload Failed', variant: 'destructive' });
        }
      }
      const processed = capitalizeSentences(newComment.trim());
      await createComment(post.id, { author: authorInfo, content: processed, imageUrl: uploadedUrl || null }, null); // parentId is null for top-level comments

      setNewComment(''); // Clear input
      setNewCommentImage(null);
      setNewCommentPreview(null);
      toast({ title: "Comment posted!" });
      fetchPostAndComments(); // Re-fetch to update comment list and count
    } catch (err) {
      console.error("Failed to submit comment:", err);
      toast({ title: "Error", description: "Could not post comment. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Loading state for the entire post page (primarily for the post itself)
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

  // Error state if post fetching failed
  if (error && !post) { // Check !post too, in case error is set but post data somehow exists (shouldn't happen with current logic)
    return (
       <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
        <div className="text-center py-10">
          <h1 className="text-xl md:text-2xl font-semibold text-destructive">{error}</h1>
          <Button asChild className="mt-4"><Link href="/">Go to Homepage</Link></Button>
        </div>
      </MainLayout>
    );
  }

  // If post is definitively not found (and not loading, no error related to fetching it)
  if (!post && !isLoadingPost && !error) {
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
  
  // This should not be reached if !post, but as a safeguard.
  if (!post) return null; 


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
    // Only show "edited" if it was updated significantly after creation (e.g., > 1 minute)
    if (updatedAtDate.getTime() - createdAtDate.getTime() > 60000) { 
        postLastUpdatedDate = ` (edited ${formatDistanceToNow(updatedAtDate, { addSuffix: true })})`;
    }
  }

  const authorDisplayName = post.author?.displayName || 'Anonymous';
  const authorAvatar = post.author?.avatarUrl;
  const authorAvatarFallback = authorDisplayName.substring(0,1).toUpperCase();
  const canModifyPost = user && (user.uid === post.author?.uid || user.role === 'superuser' || user.role === 'moderator');


  return (
    <MainLayout
      weatherWidget={<WeatherWidget />}
      adsWidget={<AdPlaceholder />}
    >
      <article className="w-full max-w-3xl mx-auto">
        <Card className="mb-6 md:mb-8 border-none shadow-none">
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
                          onSelect={(e) => e.preventDefault()} // Prevents menu from closing
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
                    <AvatarImage src={authorAvatar || undefined} alt={authorDisplayName} data-ai-hint="author avatar"/>
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
            {post.imageUrl && (
              <div className="mt-4">
                <Image src={post.imageUrl} alt="post image" width={800} height={450} className="rounded-md" />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 md:p-6 border-t">
            <div className="flex gap-1 sm:gap-2 text-muted-foreground">
              <Button
                variant="outline"
                size="sm"
                className={`group ${isLiked ? 'text-primary border-primary hover:bg-primary/10' : 'hover:text-primary hover:border-primary/50'} transition-transform duration-150 active:scale-95`}
                onClick={handleLikeToggle}
                disabled={isLiking || !user || authLoading}
              >
                {isLiking ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ThumbsUp className={`mr-1.5 h-4 w-4 transition-colors ${isLiked ? 'fill-current' : ''}`} />}
                 {post.likes} Like{post.likes !== 1 && 's'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`group ${isDisliked ? 'text-primary border-primary hover:bg-primary/10' : 'hover:text-primary hover:border-primary/50'} transition-transform duration-150 active:scale-95`}
                onClick={handleDislikeToggle}
                disabled={isDisliking || !user || authLoading}
              >
                {isDisliking ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ThumbsDown className={`mr-1.5 h-4 w-4 transition-colors ${isDisliked ? 'fill-current' : ''}`} />}
                 {post.dislikes} Dislike{post.dislikes !== 1 && 's'}
              </Button>
              <Button variant="outline" size="sm" className="group hover:text-primary hover:border-primary/50">
                <MessageCircle className="mr-1.5 h-4 w-4 group-hover:text-primary transition-colors" /> {post.commentsCount} Comment{post.commentsCount !== 1 && 's'}
              </Button>
            </div>
            {/* Future: Save/Bookmark button can go here */}
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
              <Card className="border-none shadow-none">
                <CardContent className="p-4">
                  <Label htmlFor="new-comment" className="sr-only">Add a comment</Label>
                  <div className="mb-3 relative">
                    <Textarea
                      id="new-comment"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Share your thoughts..."
                      rows={1}
                      className="pr-10 text-sm sm:text-base min-h-[40px]"
                    />
                    <label htmlFor="new-comment-image" className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-primary">
                      <ImageIcon className="h-5 w-5" />
                    </label>
                    <input id="new-comment-image" type="file" accept="image/*" onChange={handleNewCommentImageChange} className="sr-only" />
                  </div>
                  {newCommentPreview && (
                    <Image src={newCommentPreview} alt="preview" width={500} height={300} className="mb-3 rounded" />
                  )}
                  <Button type="submit" disabled={!newComment.trim() || isSubmittingComment} className="w-full sm:w-auto">
                    {isSubmittingComment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Post Comment
                  </Button>
                </CardContent>
              </Card>
            </form>
          ) : (
            <p className="mb-6 text-center text-muted-foreground">
              <Link href={`/auth?redirect=/post/${params.id}/${params.slug}#comments`} className="text-primary hover:underline">Log in</Link> to post a comment.
            </p>
          )}

          {isLoadingComments ? (
            <div className="flex justify-center items-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
               <p className="ml-2 text-muted-foreground">Loading comments...</p>
            </div>
          ) : (
            <div className="space-y-0"> {/* Ensure no extra space between comment cards naturally */}
              {commentTree.length > 0 ? (
                commentTree.map((commentNode, index, arr) => (
                  <CommentCard
                    key={commentNode.id}
                    commentNode={commentNode}
                    postId={post.id}
                    onCommentDeleted={handleCommentDeleted}
                    onCommentEdited={handleCommentEdited}
                    onReplySubmitted={handleReplySubmitted}
                    isLastChild={index === arr.length - 1} // Correctly pass isLastChild
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
    