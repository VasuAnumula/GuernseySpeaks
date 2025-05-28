
"use client"; // Needed for client-side data fetching/state for comments etc.

import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import type { Post, User, Comment as CommentType } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ThumbsUp, MessageCircle, Send, Edit, Trash2, MoreHorizontal } from 'lucide-react';
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

// Mock Data - In a real app, this would be fetched based on params.id
const mockUser: User = { id: '1', name: 'Guernsey Gache', avatarUrl: 'https://placehold.co/40x40.png?text=GG' };
const mockPost: Post = {
  id: '1',
  slug: 'beautiful-sunset-over-cobo-bay',
  title: 'Beautiful Sunset over Cobo Bay',
  content: 'Captured this stunning sunset yesterday evening at Cobo. The colors were absolutely breathtaking. Guernsey really knows how to put on a show! Share your favorite sunset spots. \n\nThis is some more example content to make the post longer. We can talk about the different hues of orange, pink, and purple that painted the sky. The reflection on the water was also magnificent. It was a truly peaceful moment, and a reminder of the natural beauty Guernsey has to offer. Many people were out walking their dogs and enjoying the spectacle. The gentle sound of the waves added to the serene atmosphere. I used my phone camera, but I think it did a decent job capturing the essence. I\'d love to see photos from others who were there too!',
  author: mockUser,
  createdAt: new Date(Date.now() - 86400000).toISOString(),
  flairs: ['Photography', 'Scenery', 'Cobo'],
  likes: 152,
  commentsCount: 2,
};

const mockComments: CommentType[] = [
  { id: 'c1', postId: '1', author: { id: '2', name: 'Sarnia Sue', avatarUrl: 'https://placehold.co/40x40.png?text=SS' }, content: 'Wow, amazing shot! Cobo sunsets are the best.', createdAt: new Date(Date.now() - 72000000).toISOString(), likes: 15 },
  { id: 'c2', postId: '1', author: { id: '3', name: 'Peter Port', avatarUrl: 'https://placehold.co/40x40.png?text=PP' }, content: 'I was there too! It was indeed spectacular.', createdAt: new Date(Date.now() - 36000000).toISOString(), likes: 8 },
];


interface PostPageParams {
  id: string;
  slug: string;
}

interface CommentCardProps {
  comment: CommentType;
}

function CommentCard({ comment }: CommentCardProps) {
  const { user } = useAuth();
  const formattedDate = new Date(comment.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <Card className="mb-4 bg-secondary/50 shadow-sm">
      <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={comment.author.avatarUrl || undefined} alt={comment.author.name || 'User'} data-ai-hint="commenter avatar"/>
              <AvatarFallback>{comment.author.name ? comment.author.name.substring(0,1).toUpperCase() : 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{comment.author.name || 'Anonymous'}</p>
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
            </div>
          </div>
           {user && (user.id === comment.author.id || user.role === 'moderator' || user.role === 'superuser') && (
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground">
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
        <Button variant="ghost" size="sm" className="text-muted-foreground group">
          <ThumbsUp className="mr-1.5 h-4 w-4 group-hover:text-primary transition-colors" /> {comment.likes}
        </Button>
      </CardFooter>
    </Card>
  );
}


export default function PostPage({ params }: { params: PostPageParams }) {
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (params.id === mockPost.id) {
      setPost(mockPost);
      setComments(mockComments);
    } else {
      setPost(null);
    }
  }, [params.id]); 

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    const submittedComment: CommentType = {
      id: `c${comments.length + 1}`,
      postId: post!.id,
      author: user,
      content: newComment.trim(),
      createdAt: new Date().toISOString(),
      likes: 0,
    };
    setComments([submittedComment, ...comments]); 
    setNewComment('');
  };
  
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

  const formattedDate = new Date(post.createdAt).toLocaleDateString('en-GB', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <MainLayout
      weatherWidget={<WeatherWidget />}
      adsWidget={<AdPlaceholder />}
    >
      <article className="w-full max-w-4xl mx-auto">
        <Card className="mb-6 md:mb-8 shadow-lg">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">{post.title}</CardTitle>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground mt-2">
              <Link href={`/profile/${post.author.id}`} className="flex items-center gap-2 hover:underline">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={post.author.avatarUrl || undefined} alt={post.author.name || 'Author'} data-ai-hint="author avatar" />
                  <AvatarFallback>{post.author.name ? post.author.name.substring(0,1).toUpperCase() : 'A'}</AvatarFallback>
                </Avatar>
                <span>{post.author.name || 'Anonymous'}</span>
              </Link>
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
          <CardContent className="px-4 md:px-6 pt-0 pb-4 md:pb-6 prose prose-sm sm:prose-base md:prose-lg max-w-none dark:prose-invert whitespace-pre-wrap">
            {post.content}
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 md:p-6 border-t">
            <div className="flex gap-2 sm:gap-4 text-muted-foreground">
              <Button variant="outline" size="sm" className="group">
                <ThumbsUp className="mr-1.5 h-4 w-4 group-hover:text-primary transition-colors" /> {post.likes} Likes
              </Button>
              <Button variant="outline" size="sm" className="group">
                <MessageCircle className="mr-1.5 h-4 w-4 group-hover:text-primary transition-colors" /> {comments.length} Comments
              </Button>
            </div>
            {/* Future: Share, Save buttons */}
          </CardFooter>
        </Card>

        <Separator className="my-6 md:my-8" />

        {/* Comments Section */}
        <section id="comments" className="mb-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6">Comments ({comments.length})</h2>
          {user ? (
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
                  <Button type="submit" disabled={!newComment.trim()} className="w-full sm:w-auto">
                    <Send className="mr-2 h-4 w-4" /> Post Comment
                  </Button>
                </CardContent>
              </Card>
            </form>
          ) : (
            <p className="mb-6 text-center text-muted-foreground">
              <Link href={`/auth?redirect=/post/${params.id}/${params.slug}`} className="text-primary hover:underline">Log in</Link> to post a comment.
            </p>
          )}
          
          <div className="space-y-4 md:space-y-6">
            {comments.length > 0 ? (
              comments.map(comment => <CommentCard key={comment.id} comment={comment} />)
            ) : (
              <p className="text-muted-foreground text-center py-4">No comments yet. Be the first to share your thoughts!</p>
            )}
          </div>
        </section>
      </article>
    </MainLayout>
  );
}
