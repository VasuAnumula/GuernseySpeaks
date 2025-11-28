
"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { PREDEFINED_FLAIRS } from '@/constants/flairs';
import { X, Loader2, ImagePlus, Tag, ArrowLeft, Bold, Italic, Link as LinkIcon, List, ListOrdered, Quote, Code, Heading1, Heading2, ImageIcon, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { createPost, updatePost, generateSlug, uploadPostImage } from '@/services/postService';
import { capitalizeSentences } from '@/lib/utils';
import Image from 'next/image';
import type { Post, AuthorInfo } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface PostFormProps {
  postToEdit?: Post | null;
}

const MAX_FLAIRS = 1;

export function PostForm({ postToEdit }: PostFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [flairs, setFlairs] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("post");

  const isEditMode = !!postToEdit;

  useEffect(() => {
    if (isEditMode && postToEdit) {
      setTitle(postToEdit.title);
      setContent(postToEdit.content);
      setFlairs(postToEdit.flairs || []);
      if (postToEdit.imageUrl) {
        setImagePreview(postToEdit.imageUrl);
        setActiveTab("image");
      }
    }
  }, [isEditMode, postToEdit]);

  const handleAddFlair = (flairToAdd: string) => {
    if (!flairToAdd?.trim()) return;
    const trimmedFlair = flairToAdd.trim();

    if (flairs.length >= MAX_FLAIRS) {
      toast({ title: "Limit Reached", description: `Only ${MAX_FLAIRS} topic allowed.`, variant: "destructive" });
      return;
    }
    if (flairs.includes(trimmedFlair)) return;

    setFlairs([...flairs, trimmedFlair]);
  };

  const handleRemoveFlair = (flairToRemove: string) => {
    setFlairs(flairs.filter(flair => flair !== flairToRemove));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Max 5MB allowed', variant: 'destructive' });
      e.target.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid File', description: 'Images only', variant: 'destructive' });
      e.target.value = '';
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Login Required", description: "Please login to post.", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Missing Title", description: "Please enter a title for your post.", variant: "destructive" });
      return;
    }
    if (activeTab === 'post' && !content.trim()) {
      toast({ title: "Missing Content", description: "Please enter some text content.", variant: "destructive" });
      return;
    }
    if (activeTab === 'image' && !imageFile && !imagePreview) {
      toast({ title: "Missing Image", description: "Please upload an image.", variant: "destructive" });
      return;
    }
    if (flairs.length !== 1) {
      toast({ title: "Topic Required", description: "Please select a topic.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const trimmedTitle = capitalizeSentences(title.trim());
    const processedContent = capitalizeSentences(content.trim());

    try {
      let uploadedUrl = postToEdit?.imageUrl;
      if (imageFile) {
        uploadedUrl = await uploadPostImage(imageFile);
      }

      const postData = {
        title: trimmedTitle,
        content: activeTab === 'image' ? (processedContent || 'Image Post') : processedContent,
        flairs,
        imageUrl: activeTab === 'image' ? uploadedUrl : null,
      };

      if (isEditMode && postToEdit) {
        await updatePost(postToEdit.id, postData);
        const updatedSlug = await generateSlug(trimmedTitle);
        toast({ title: "Updated!", description: "Post updated successfully." });
        router.push(`/post/${postToEdit.id}/${updatedSlug}`);
      } else {
        const authorInfo: AuthorInfo = {
          uid: user.uid,
          displayName: user.displayName || user.name || 'Anonymous',
          avatarUrl: user.avatarUrl,
        };
        const postId = await createPost({
          ...postData,
          author: authorInfo,
          imageUrl: postData.imageUrl || null,
        });
        const newSlug = await generateSlug(trimmedTitle);
        toast({ title: "Published!", description: "Your post is live." });
        router.push(`/post/${postId}/${newSlug}`);
      }
    } catch (error: any) {
      console.error("Submission error:", error);
      toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold border-b pb-2 flex-grow mr-4">Create a post</h1>
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground">
          Drafts <Badge variant="secondary" className="ml-2">0</Badge>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="post" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start h-12 bg-background border rounded-t-lg p-0">
              <TabsTrigger
                value="post"
                className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-background transition-all"
              >
                <FileText className="h-4 w-4 mr-2" /> Post
              </TabsTrigger>
              <TabsTrigger
                value="image"
                className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-background transition-all"
              >
                <ImageIcon className="h-4 w-4 mr-2" /> Images & Video
              </TabsTrigger>
            </TabsList>

            <div className="bg-background border border-t-0 rounded-b-lg p-4 space-y-4">
              <Input
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-medium h-12"
                maxLength={300}
              />

              <TabsContent value="post" className="mt-0">
                <div className="border rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-ring">
                  {/* Toolbar */}
                  <div className="bg-muted/30 border-b p-2 flex items-center gap-1 overflow-x-auto">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Bold"><Bold className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Italic"><Italic className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Link"><LinkIcon className="h-4 w-4" /></Button>
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="List"><List className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Ordered List"><ListOrdered className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Quote"><Quote className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Code Block"><Code className="h-4 w-4" /></Button>
                  </div>
                  <Textarea
                    placeholder="Text (optional)"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[200px] border-none shadow-none focus-visible:ring-0 resize-y p-4"
                  />
                </div>
              </TabsContent>

              <TabsContent value="image" className="mt-0">
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/20 transition-colors relative min-h-[280px] flex flex-col items-center justify-center">
                  {imagePreview ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        width={600}
                        height={400}
                        className="max-h-[400px] w-auto mx-auto object-contain rounded-md"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-md"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                          Upload
                        </Button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">Drag and drop images or <span className="text-primary cursor-pointer" onClick={() => fileInputRef.current?.click()}>upload</span></p>
                    </>
                  )}
                </div>
              </TabsContent>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Tag className="h-4 w-4 mr-2" />
                      {flairs.length > 0 ? 'Change Topic' : 'Add Topic'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 max-h-64 overflow-y-auto">
                    {PREDEFINED_FLAIRS.map((flair) => (
                      <DropdownMenuItem
                        key={flair}
                        onClick={() => handleAddFlair(flair)}
                        disabled={flairs.includes(flair)}
                      >
                        {flair}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {flairs.map(flair => (
                  <Badge key={flair} variant="secondary" className="h-7 px-3 rounded-full bg-primary/10 text-primary hover:bg-primary/20">
                    {flair}
                    <button onClick={() => handleRemoveFlair(flair)} className="ml-2 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !title.trim() || (activeTab === 'post' && !content.trim() && !imageFile) || flairs.length === 0}
                  className="px-8"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Post
                </Button>
              </div>
            </div>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Image src="/icon.svg" alt="Logo" width={40} height={40} className="rounded-full" />
              <CardTitle className="text-base">Posting to GuernseySpeaks</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li className="pl-1">Remember the human</li>
                <li className="pl-1">Behave like you would in real life</li>
                <li className="pl-1">Look for the original source of content</li>
                <li className="pl-1">Search for duplicates before posting</li>
                <li className="pl-1">Read the community's rules</li>
              </ol>
              <Separator className="my-4" />
              <p className="text-xs text-muted-foreground">
                Please be mindful of Guernsey's defamation laws. Keep discussions civil and constructive.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
