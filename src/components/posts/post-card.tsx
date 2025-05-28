"use client";

import type { Post } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ThumbsUp, MessageCircle, Bookmark, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/hooks/use-auth';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const formattedDate = new Date(post.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  // Basic slug function, replace with a robust one if needed
  const createSlug = (title: string) => title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  const postSlug = post.slug || createSlug(post.title);

  return (
    <Card className="mb-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-start justify-between">
          <Link href={`/post/${post.id}/${postSlug}`} className="group">
            <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors">
              {post.title}
            </CardTitle>
          </Link>
          {user && (user.id === post.author.id || user.role === 'moderator' || user.role === 'superuser') && (
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
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
        <CardDescription className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
          <Link href={`/profile/${post.author.id}`} className="flex items-center gap-2 hover:underline">
            <Avatar className="h-6 w-6">
              <AvatarImage src={post.author.avatarUrl || undefined} alt={post.author.name || 'Author'} data-ai-hint="author avatar" />
              <AvatarFallback>{post.author.name ? post.author.name.substring(0,1).toUpperCase() : 'A'}</AvatarFallback>
            </Avatar>
            <span>{post.author.name || 'Anonymous'}</span>
          </Link>
          <span>•</span>
          <span>{formattedDate}</span>
        </CardDescription>
        {post.flairs && post.flairs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {post.flairs.map((flair) => (
              <Badge key={flair} variant="secondary" className="bg-accent/20 text-accent-foreground hover:bg-accent/30 cursor-pointer">
                {flair}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-foreground/90 line-clamp-3">{post.content}</p>
        <Link href={`/post/${post.id}/${postSlug}`} className="text-sm text-primary hover:underline mt-2 inline-block">
            Read more
        </Link>
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-4 border-t">
        <div className="flex gap-4 text-muted-foreground">
          <Button variant="ghost" size="sm" className="group">
            <ThumbsUp className="mr-1.5 h-4 w-4 group-hover:text-primary transition-colors" /> {post.likes}
          </Button>
          <Link href={`/post/${post.id}/${postSlug}#comments`} passHref>
            <Button variant="ghost" size="sm" className="group">
              <MessageCircle className="mr-1.5 h-4 w-4 group-hover:text-primary transition-colors" /> {post.commentsCount}
            </Button>
          </Link>
        </div>
        <Button variant="ghost" size="sm" className="group">
          <Bookmark className="mr-1.5 h-4 w-4 group-hover:text-primary transition-colors" /> Save
        </Button>
      </CardFooter>
    </Card>
  );
}
