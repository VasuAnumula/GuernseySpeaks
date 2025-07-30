
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { PREDEFINED_FLAIRS } from '@/constants/flairs';
import { X, Loader2, ImagePlus } from 'lucide-react';
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

// PREDEFINED_FLAIRS imported from '@/constants/flairs'
// Only one flair per post
const MAX_FLAIRS = 1;

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

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

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
    
    if (file) {
      console.log('Image selected:', { 
        name: file.name, 
        size: file.size, 
        type: file.type,
        lastModified: file.lastModified 
      });
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({ 
          title: 'File Too Large', 
          description: 'Please select an image under 5MB',
          variant: 'destructive' 
        });
        e.target.value = ''; // Clear the input
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({ 
          title: 'Invalid File Type', 
          description: 'Please select an image file',
          variant: 'destructive' 
        });
        e.target.value = ''; // Clear the input
        return;
      }
    }
    
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
    if (flairs.length !== 1) {
        toast({ title: "Flair Required", description: "Please select exactly one flair.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);

    const trimmedTitle = capitalizeSentences(title.trim());
    const processedContent = capitalizeSentences(content.trim());
    let uploadedUrl: string | undefined;
    if (imageFile) {
      try {
        console.log('=== STARTING IMAGE UPLOAD ===');
        console.log('File details:', { 
          fileName: imageFile.name, 
          fileSize: imageFile.size, 
          fileType: imageFile.type,
          lastModified: new Date(imageFile.lastModified).toISOString()
        });
        
        console.log('Current user auth status:', user ? { uid: user.uid, email: user.email } : 'Not authenticated');
        
        // Add timeout to prevent infinite hanging
        const uploadPromise = uploadPostImage(imageFile);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
        );
        
        console.log('Starting upload with 30s timeout...');
        uploadedUrl = await Promise.race([uploadPromise, timeoutPromise]) as string;
        console.log('=== IMAGE UPLOAD SUCCESSFUL ===');
        console.log('Upload URL:', uploadedUrl);
      } catch (err) {
        console.error('=== IMAGE UPLOAD FAILED ===');
        console.error('Error details:', err);
        console.error('Error type:', typeof err);
        console.error('Error constructor:', err?.constructor?.name);
        
        toast({
          title: 'Image Upload Failed',
          description: err instanceof Error ? err.message : 'Unknown error occurred',
          variant: 'destructive'
        });
        
        setIsSubmitting(false);
        return;
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
    <Card className="w-full max-w-3xl mx-auto border-0 shadow-lg shadow-primary/5 bg-gradient-to-br from-card to-card/95 rounded-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border/20">
        <CardTitle className="text-2xl font-semibold text-foreground">{isEditMode ? "Edit Post" : "Create a New Post"}</CardTitle>
        <CardDescription className="text-muted-foreground/80">
          {isEditMode ? "Modify your existing post." : "Share your thoughts, news, or questions with the Guernsey community."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-8 p-6">
          <div className="space-y-3">
            <Label htmlFor="title" className="text-sm font-medium text-foreground">Title</Label>
            <Input
              id="title"
              placeholder="Enter a descriptive title..."
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base h-11 bg-secondary/50 border-0 rounded-lg shadow-sm focus:shadow-md transition-all duration-200 placeholder:text-muted-foreground/60"
              maxLength={150}
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="content" className="text-sm font-medium text-foreground">Content</Label>
            <div className="relative">
              <Textarea
                id="content"
                placeholder="What's on your mind? Share your thoughts with the community..."
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="text-base pr-12 bg-secondary/50 border-0 rounded-lg shadow-sm focus:shadow-md transition-all duration-200 placeholder:text-muted-foreground/60 resize-none"
              />
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <label htmlFor="image-upload" className="absolute bottom-3 right-3 cursor-pointer p-2 rounded-lg hover:bg-primary/10 transition-colors group">
                <ImagePlus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </label>
            </div>
            {imagePreview && (
              <div className="relative mt-4 group">
                <div className="overflow-hidden rounded-lg border border-border/20">
                  <Image src={imagePreview} alt="preview" width={500} height={300} className="w-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-3 right-3 rounded-full bg-destructive/90 text-destructive-foreground p-2 hover:bg-destructive transition-colors shadow-sm"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-3 left-3 text-xs bg-black/70 text-white px-2 py-1 rounded">
                  {(imageFile?.size || 0) > 0 ? `${Math.round((imageFile?.size || 0) / 1024)}KB` : ''}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground/70 mt-2">💡 Tip: Markdown support is coming soon!</p>
          </div>
          <div className="space-y-3">
            <Label htmlFor="flairs-select" className="text-sm font-medium text-foreground">Topic <span className="text-destructive">*</span></Label>
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
                <SelectTrigger id="flairs-select" className="h-11 bg-secondary/50 border-0 rounded-lg shadow-sm focus:shadow-md transition-all duration-200">
                  <SelectValue placeholder="Choose a topic for your post..." />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-0 shadow-lg">
                  {PREDEFINED_FLAIRS.filter(f => f && f.trim() !== "").map(flair => (
                    <SelectItem
                      key={flair}
                      value={flair}
                      disabled={flairs.includes(flair)}
                      className="cursor-pointer"
                    >
                      {flair}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {flairs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {flairs.map(flair => (
                  <Badge key={flair} variant="secondary" className="text-sm py-2 px-4 bg-primary/10 text-primary hover:bg-primary/20 transition-colors rounded-full border-0">
                    {flair}
                    <button type="button" onClick={() => handleRemoveFlair(flair)} className="ml-2 appearance-none border-none bg-transparent cursor-pointer p-0.5 rounded-full hover:bg-destructive/20 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {flairs.length >= MAX_FLAIRS && (
                <p className="text-xs text-muted-foreground/70">Only one topic allowed per post.</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="bg-muted/20 border-t border-border/20 p-6">
          <Button 
            type="submit" 
            className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]" 
            disabled={isSubmitting || !title.trim() || !content.trim() || flairs.length !== 1}
          >
            {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {isEditMode ? "Update Post" : "Publish Post"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
