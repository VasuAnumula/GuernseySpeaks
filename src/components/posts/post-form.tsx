
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { X, Plus, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { createPost, generateSlug } from '@/services/postService';
import type { Post, AuthorInfo } from '@/types';

export function PostForm() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [flairs, setFlairs] = useState<string[]>([]);
  const [currentFlair, setCurrentFlair] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleAddFlair = () => {
    if (currentFlair.trim() && !flairs.includes(currentFlair.trim()) && flairs.length < 5) {
      setFlairs([...flairs, currentFlair.trim()]);
      setCurrentFlair('');
    } else if (flairs.length >= 5) {
      toast({ title: "Flair Limit Reached", description: "You can add up to 5 flairs.", variant: "destructive" });
    }
  };

  const handleRemoveFlair = (flairToRemove: string) => {
    setFlairs(flairs.filter(flair => flair !== flairToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a post.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    
    const authorInfo: AuthorInfo = {
      uid: user.uid,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };

    const postData: Omit<Post, 'id' | 'createdAt' | 'commentsCount' | 'likes'> = {
      title: title.trim(),
      content: content.trim(),
      author: authorInfo,
      flairs,
      slug: generateSlug(title.trim()), // Generate slug from title
    };

    try {
      const postId = await createPost(postData);
      toast({ title: "Post Submitted", description: "Your post is now live!" });
      router.push(`/post/${postId}/${postData.slug}`); 
    } catch (error) {
      console.error("Failed to create post:", error);
      toast({ title: "Submission Failed", description: "Could not create your post. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold">Create a New Post</CardTitle>
        <CardDescription>Share your thoughts, news, or questions with the Guernsey community.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-lg">Title</Label>
            <Input 
              id="title" 
              placeholder="Enter a descriptive title" 
              required 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="text-base"
              maxLength={150}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content" className="text-lg">Content</Label>
            <Textarea 
              id="content" 
              placeholder="What's on your mind?" 
              required 
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              rows={10}
              className="text-base"
            />
             <p className="text-xs text-muted-foreground">Markdown is not currently supported, but will be in a future update!</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="flairs" className="text-lg">Flairs/Tags (up to 5)</Label>
            <div className="flex items-center gap-2">
              <Input 
                id="flairs" 
                placeholder="Add a flair (e.g., News, Events)" 
                value={currentFlair} 
                onChange={(e) => setCurrentFlair(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFlair();}}}
                className="flex-grow text-base"
                maxLength={20}
              />
              <Button type="button" onClick={handleAddFlair} variant="outline" size="icon" aria-label="Add flair">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {flairs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {flairs.map(flair => (
                  <Badge key={flair} variant="secondary" className="text-sm py-1 px-2 bg-accent/20 text-accent-foreground">
                    {flair}
                    <button type="button" onClick={() => handleRemoveFlair(flair)} className="ml-1.5 appearance-none border-none bg-transparent cursor-pointer p-0.5 rounded-full hover:bg-destructive/50">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full text-lg py-3" disabled={isSubmitting || !title.trim() || !content.trim()}>
            {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            Submit Post
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
