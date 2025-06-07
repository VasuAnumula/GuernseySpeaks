
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { X, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { createPost, updatePost, generateSlug, uploadPostImage } from '@/services/postService';
import { capitalizeSentences } from '@/lib/utils';
import Image from 'next/image';
import type { Post, AuthorInfo } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PostFormProps {
  postToEdit?: Post | null;
}

// Ensure this list is consistent and used as the single source of truth for predefined flairs.
// This list is now also used in src/app/page.tsx for PostListFilters.
const PREDEFINED_FLAIRS = ["Events", "News", "Discussion", "Casual", "Help", "Local Issue", "Question", "Recommendation", "Miscellaneous"];
const MAX_FLAIRS = 5;

export function PostForm({ postToEdit }: PostFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [flairs, setFlairs] = useState<string[]>([]);
  const [selectedFlairToAdd, setSelectedFlairToAdd] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const isEditMode = !!postToEdit;

  useEffect(() => {
    if (isEditMode && postToEdit) {
      setTitle(postToEdit.title);
      setContent(postToEdit.content);
      setFlairs(postToEdit.flairs || []);
      if (postToEdit.imageUrl) {
        setImagePreview(postToEdit.imageUrl);
      }
    }
  }, [isEditMode, postToEdit]);

  const handleAddFlair = (flairToAdd: string) => {
    if (!flairToAdd || !flairToAdd.trim()) return; // Ensure flair is not empty or just whitespace

    const trimmedFlair = flairToAdd.trim();

    if (flairs.length >= MAX_FLAIRS) {
      toast({ title: "Flair Limit Reached", description: `You can add up to ${MAX_FLAIRS} flairs.`, variant: "destructive" });
      return;
    }
    if (flairs.includes(trimmedFlair)) {
      toast({ title: "Flair Already Added", description: `"${trimmedFlair}" is already in your list.`, variant: "default" });
      return;
    }
    setFlairs([...flairs, trimmedFlair]);
    setSelectedFlairToAdd('');
  };

  const handleRemoveFlair = (flairToRemove: string) => {
    setFlairs(flairs.filter(flair => flair !== flairToRemove));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    if (!title.trim() || !content.trim()) {
        toast({ title: "Missing Fields", description: "Title and content are required.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);

    const trimmedTitle = capitalizeSentences(title.trim());
    const processedContent = capitalizeSentences(content.trim());
    let uploadedUrl: string | undefined;
    if (imageFile) {
      try {
        uploadedUrl = await uploadPostImage(imageFile);
      } catch (err) {
        console.error('Image upload failed:', err);
        toast({ title: 'Image Upload Failed', variant: 'destructive' });
      }
    }

    try {
      if (isEditMode && postToEdit) {
        const postUpdateData: Partial<Pick<Post, 'title' | 'content' | 'flairs' | 'imageUrl'>> = {
          title: trimmedTitle,
          content: processedContent,
          flairs,
          imageUrl: uploadedUrl ?? postToEdit.imageUrl,
        };
        await updatePost(postToEdit.id, postUpdateData);
        const updatedSlug = await generateSlug(trimmedTitle);
        toast({ title: "Post Updated", description: "Your post has been successfully updated!" });
        router.push(`/post/${postToEdit.id}/${updatedSlug}`);
      } else {
        const authorInfo: AuthorInfo = {
          uid: user.uid,
          displayName: user.displayName || user.name || 'Anonymous',
          avatarUrl: user.avatarUrl,
        };
        const newPostPayload = {
          title: trimmedTitle,
          content: processedContent,
          author: authorInfo,
          flairs,
          imageUrl: uploadedUrl || null,
        };
        const postId = await createPost(newPostPayload);
        const newSlug = await generateSlug(trimmedTitle);
        toast({ title: "Post Submitted", description: "Your post is now live!" });
        router.push(`/post/${postId}/${newSlug}`);
      }
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} post:`, error);
      toast({
        title: `${isEditMode ? 'Update' : 'Submission'} Failed`,
        description: `Could not ${isEditMode ? 'update' : 'create'} your post. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold">{isEditMode ? "Edit Post" : "Create a New Post"}</CardTitle>
        <CardDescription>
          {isEditMode ? "Modify your existing post." : "Share your thoughts, news, or questions with the Guernsey community."}
        </CardDescription>
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
            <Label htmlFor="image-upload" className="text-lg">Image (optional)</Label>
            <Input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} />
            {imagePreview && (
              <Image src={imagePreview} alt="preview" width={500} height={300} className="mt-2 rounded-md" />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="flairs-select" className="text-lg">Flairs/Tags (up to {MAX_FLAIRS})</Label>
            <div className="flex items-center gap-2">
              <Select
                value={selectedFlairToAdd}
                onValueChange={(value) => {
                  if (value && value.trim()) { // Ensure value is not empty/whitespace before adding
                    handleAddFlair(value);
                  }
                }}
                disabled={flairs.length >= MAX_FLAIRS}
              >
                <SelectTrigger id="flairs-select" className="flex-grow text-base">
                  <SelectValue placeholder="Select a flair to add" />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_FLAIRS.filter(f => f && f.trim() !== "").map(flair => (
                    <SelectItem
                      key={flair}
                      value={flair} // This value must not be an empty string
                      disabled={flairs.includes(flair)}
                    >
                      {flair}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            {flairs.length >= MAX_FLAIRS && (
                <p className="text-xs text-muted-foreground">Maximum {MAX_FLAIRS} flairs reached.</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full text-lg py-3" disabled={isSubmitting || !title.trim() || !content.trim()}>
            {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {isEditMode ? "Update Post" : "Submit Post"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
