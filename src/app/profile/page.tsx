
"use client";

import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Mail, User as UserIcon, ShieldCheck, Loader2, UploadCloud, Save, FileText, MessageSquare, Calendar, ThumbsUp, Bookmark } from 'lucide-react';
import { format } from 'date-fns';
import { updateUserDisplayNameAndPropagate, uploadProfilePicture, updateUserProfile } from '@/services/userService';
import { getPostsByAuthor, getCommentsByUser } from '@/services/postService';
import { getSavedPosts } from '@/services/bookmarkService';
import { useToast } from '@/hooks/use-toast';
import type { Post, Comment } from '@/types';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ProfilePage() {
  const { user, loading: authLoading, updateUserInContext } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [formattedJoinedDate, setFormattedJoinedDate] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [editableDisplayName, setEditableDisplayName] = useState('');
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);

  const [editableFullName, setEditableFullName] = useState('');
  const [isSavingFullName, setIsSavingFullName] = useState(false);

  const [editableBio, setEditableBio] = useState('');
  const [isSavingBio, setIsSavingBio] = useState(false);

  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userComments, setUserComments] = useState<(Comment & { postId: string })[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [loadingSavedPosts, setLoadingSavedPosts] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUserActivity = useCallback(async () => {
    if (!user) return;

    setLoadingPosts(true);
    try {
      const posts = await getPostsByAuthor(user.uid);
      setUserPosts(posts);
    } catch (err) {
      console.error("Error fetching user posts:", err);
    } finally {
      setLoadingPosts(false);
    }

    setLoadingComments(true);
    try {
      const comments = await getCommentsByUser(user.uid);
      setUserComments(comments);
    } catch (err) {
      console.error("Error fetching user comments:", err);
    } finally {
      setLoadingComments(false);
    }

    setLoadingSavedPosts(true);
    try {
      const saved = await getSavedPosts(user.uid);
      setSavedPosts(saved);
    } catch (err) {
      console.error("Error fetching saved posts:", err);
    } finally {
      setLoadingSavedPosts(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=/profile');
    }
    if (user) {
      setEditableDisplayName(user.displayName || user.name || '');
      setEditableFullName(user.name || '');
      setEditableBio(user.bio || '');

      if (user.createdAt) {
        try {
          const date = user.createdAt instanceof Date ? user.createdAt : (user.createdAt as any).toDate();
          setFormattedJoinedDate(format(date, "MMMM d, yyyy"));
        } catch (e) {
          console.error("Error formatting joined date:", e);
          setFormattedJoinedDate("Invalid Date");
        }
      } else {
        setFormattedJoinedDate("Not available");
      }

      fetchUserActivity();
    }
  }, [user, authLoading, router, fetchUserActivity]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File Too Large", description: "Please select an image smaller than 5MB.", variant: "destructive" });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        toast({ title: "Invalid File Type", description: "Please select a JPG, PNG, or GIF image.", variant: "destructive" });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleAvatarUpload = async () => {
    if (!selectedFile || !user) {
      toast({ title: "No File Selected", description: "Please select an image file to upload.", variant: "destructive" });
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const downloadURL = await uploadProfilePicture(user.uid, selectedFile);
      await updateUserProfile(user.uid, { avatarUrl: downloadURL });
      updateUserInContext({ avatarUrl: downloadURL });

      toast({ title: "Avatar Updated", description: "Your new profile picture has been uploaded." });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      console.error("Failed to upload avatar:", error);
      toast({ title: "Upload Failed", description: error.message || "Could not upload avatar. Please try again.", variant: "destructive" });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleDisplayNameChange = async () => {
    if (!user || !editableDisplayName.trim()) {
      toast({ title: "Invalid Input", description: "Display name cannot be empty.", variant: "destructive" });
      return;
    }
    if (editableDisplayName.trim() === (user.displayName || user.name)) {
      toast({ title: "No Changes", description: "Display name is the same.", variant: "default" });
      return;
    }

    setIsSavingDisplayName(true);
    try {
      await updateUserDisplayNameAndPropagate(user.uid, editableDisplayName.trim());
      updateUserInContext({ displayName: editableDisplayName.trim() });
      toast({ title: "Display Name Updated", description: "Your display name has been updated successfully." });
    } catch (error: any) {
      console.error("Failed to update display name:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update display name.", variant: "destructive" });
    } finally {
      setIsSavingDisplayName(false);
    }
  };

  const handleFullNameChange = async () => {
    if (!user) return;
    if (editableFullName.trim() === (user.name || '')) {
      toast({ title: "No Changes", description: "Full name is the same.", variant: "default" });
      return;
    }

    setIsSavingFullName(true);
    try {
      await updateUserProfile(user.uid, { name: editableFullName.trim() });
      updateUserInContext({ name: editableFullName.trim() });
      toast({ title: "Full Name Updated", description: "Your full name has been updated." });
    } catch (error: any) {
      console.error("Failed to update full name:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update full name.", variant: "destructive" });
    } finally {
      setIsSavingFullName(false);
    }
  };

  const handleBioChange = async () => {
    if (!user) return;
    if (editableBio.trim() === (user.bio || '')) {
      toast({ title: "No Changes", description: "Bio is the same.", variant: "default" });
      return;
    }

    setIsSavingBio(true);
    try {
      await updateUserProfile(user.uid, { bio: editableBio.trim() });
      updateUserInContext({ bio: editableBio.trim() });
      toast({ title: "Bio Updated", description: "Your bio has been updated." });
    } catch (error: any) {
      console.error("Failed to update bio:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update bio.", variant: "destructive" });
    } finally {
      setIsSavingBio(false);
    }
  };

  if (authLoading || !user) {
    return (
      <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading profile...</p>
        </div>
      </MainLayout>
    );
  }

  const currentDisplayName = user.displayName || user.name || 'User Profile';
  const userAvatarFallback = currentDisplayName.substring(0, 1).toUpperCase() || <UserIcon />;

  return (
    <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
      <div className="space-y-6">
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader className="text-center relative">
            <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-primary shadow-md">
              <AvatarImage src={user.avatarUrl || undefined} alt={currentDisplayName} data-ai-hint="user large_avatar" />
              <AvatarFallback className="text-5xl">{userAvatarFallback}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-3xl">{currentDisplayName}</CardTitle>
            {user.email && (
              <CardDescription className="flex items-center justify-center gap-1">
                <Mail className="h-4 w-4 text-muted-foreground" /> {user.email}
              </CardDescription>
            )}
            {user.role && (
              <div className="mt-2 flex items-center justify-center gap-1 text-sm text-accent-foreground font-medium">
                <ShieldCheck className="h-5 w-5 text-accent" /> Role: <span className="capitalize">{user.role}</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Display Name Section */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-lg font-semibold">Display Name (Public)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="displayName"
                  value={editableDisplayName}
                  onChange={(e) => setEditableDisplayName(e.target.value)}
                  className="text-base"
                  disabled={isSavingDisplayName}
                  maxLength={50}
                />
                <Button
                  onClick={handleDisplayNameChange}
                  disabled={isSavingDisplayName || editableDisplayName.trim() === (user.displayName || user.name || '') || !editableDisplayName.trim()}
                >
                  {isSavingDisplayName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save
                </Button>
              </div>
            </div>

            {/* Full Name Section */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-lg font-semibold">Full Name (Private)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="fullName"
                  value={editableFullName}
                  onChange={(e) => setEditableFullName(e.target.value)}
                  className="text-base"
                  disabled={isSavingFullName}
                  maxLength={100}
                />
                <Button
                  onClick={handleFullNameChange}
                  disabled={isSavingFullName || editableFullName.trim() === (user.name || '')}
                >
                  {isSavingFullName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save
                </Button>
              </div>
            </div>

            {/* Bio Section */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-lg font-semibold">Bio</Label>
              <div className="space-y-2">
                <Textarea
                  id="bio"
                  value={editableBio}
                  onChange={(e) => setEditableBio(e.target.value)}
                  className="text-base resize-none"
                  disabled={isSavingBio}
                  maxLength={500}
                  rows={4}
                  placeholder="Tell us a little about yourself..."
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleBioChange}
                    disabled={isSavingBio || editableBio.trim() === (user.bio || '')}
                  >
                    {isSavingBio ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Bio
                  </Button>
                </div>
              </div>
            </div>

            {/* Avatar Upload Section */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Change Profile Picture</h3>
              <div className="flex flex-col gap-4">
                {/* Hidden Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/png, image/jpeg, image/gif"
                  onChange={handleFileChange}
                />

                <div className="flex items-center gap-4">
                  {/* Select Button */}
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Select Image
                  </Button>

                  {/* Upload Button */}
                  {selectedFile && (
                    <Button
                      onClick={handleAvatarUpload}
                      disabled={isUploadingAvatar}
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Upload
                    </Button>
                  )}
                </div>

                {/* File Info / Preview */}
                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md w-fit">
                    <FileText className="h-4 w-4" />
                    <span>{selectedFile.name}</span>
                    <span className="text-xs">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Max file size: 5MB. Allowed types: JPG, PNG, GIF.
                </p>
              </div>
            </div>

            {/* Activity Summary */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Account Info</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Joined: {formattedJoinedDate || 'Loading...'}</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Activity Sections */}
        <Card className="max-w-6xl mx-auto">
          <Tabs defaultValue="posts" className="w-full">
            <CardHeader className="pb-0">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="posts" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Posts</span>
                  <span className="text-xs">({userPosts.length})</span>
                </TabsTrigger>
                <TabsTrigger value="comments" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Comments</span>
                  <span className="text-xs">({userComments.length})</span>
                </TabsTrigger>
                <TabsTrigger value="saved" className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4" />
                  <span className="hidden sm:inline">Saved</span>
                  <span className="text-xs">({savedPosts.length})</span>
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-6">
              <TabsContent value="posts" className="mt-0">
                {loadingPosts ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : userPosts.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {userPosts.slice(0, 10).map((post) => (
                      <div key={post.id} className="border-b pb-3 last:border-0">
                        <Link href={`/post/${post.id}/${post.slug}`} className="font-medium hover:underline block truncate">
                          {post.title}
                        </Link>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {post.likes}</span>
                          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {post.commentsCount}</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {post.createdAt && format(post.createdAt instanceof Date ? post.createdAt : new Date(), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No posts created yet.</p>
                )}
              </TabsContent>

              <TabsContent value="comments" className="mt-0">
                {loadingComments ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : userComments.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {userComments.slice(0, 10).map((comment) => (
                      <div key={comment.id} className="border-b pb-3 last:border-0">
                        <p className="text-sm line-clamp-2 mb-1">"{comment.content}"</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <Link href={`/post/${comment.postId}`} className="hover:underline text-primary">
                            View Post
                          </Link>
                          <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {comment.likes}</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {comment.createdAt && format(comment.createdAt instanceof Date ? comment.createdAt : new Date(), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No comments made yet.</p>
                )}
              </TabsContent>

              <TabsContent value="saved" className="mt-0">
                {loadingSavedPosts ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : savedPosts.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {savedPosts.slice(0, 10).map((post) => (
                      <div key={post.id} className="border-b pb-3 last:border-0">
                        <Link href={`/post/${post.id}/${post.slug}`} className="font-medium hover:underline block truncate">
                          {post.title}
                        </Link>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {post.likes}</span>
                          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {post.commentsCount}</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {post.createdAt && format(post.createdAt instanceof Date ? post.createdAt : new Date(), 'MMM d, yyyy')}</span>
                          <span className="text-primary">by u/{post.author?.displayName || 'Anonymous'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bookmark className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No saved posts yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">Click the bookmark icon on any post to save it for later.</p>
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </MainLayout>
  );
}