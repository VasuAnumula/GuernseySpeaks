
"use client";

import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Mail, User as UserIcon, ShieldCheck, Edit3, Loader2, Save, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { updateUserProfile } from '@/services/userService';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user, loading: authLoading, updateUserInContext } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editDisplayName, setEditDisplayName] = useState(user?.displayName || '');
  // const [editAvatarUrl, setEditAvatarUrl] = useState(user?.avatarUrl || ''); // Avatar update deferred

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=/profile');
    }
    if (user) {
      setEditName(user.name || '');
      setEditDisplayName(user.displayName || user.name || ''); // Fallback for displayName
      // setEditAvatarUrl(user.avatarUrl || '');
    }
  }, [user, authLoading, router]);

  const handleEditToggle = () => {
    if (isEditing && user) { // Reset fields if canceling edit
      setEditName(user.name || '');
      setEditDisplayName(user.displayName || user.name || '');
      // setEditAvatarUrl(user.avatarUrl || '');
    }
    setIsEditing(!isEditing);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const profileDataToUpdate: Partial<{ name: string; displayName: string; avatarUrl: string }> = {};
      if (editName !== user.name) profileDataToUpdate.name = editName.trim();
      if (editDisplayName !== (user.displayName || user.name)) {
        // Allow setting display name to empty string, which service will convert to null
        profileDataToUpdate.displayName = editDisplayName.trim() === '' ? '' : editDisplayName.trim();
      }
      // if (editAvatarUrl !== user.avatarUrl) profileDataToUpdate.avatarUrl = editAvatarUrl; // Avatar update deferred

      if (Object.keys(profileDataToUpdate).length > 0) {
        await updateUserProfile(user.uid, profileDataToUpdate);
        updateUserInContext(profileDataToUpdate); // Update context immediately
        toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
      }
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast({ title: "Error", description: "Could not update your profile. Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
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
  let joinedDate = "Not available";
  if (user.createdAt) {
    try {
      const date = user.createdAt instanceof Date ? user.createdAt : (user.createdAt as any).toDate();
      joinedDate = format(date, "MMMM d, yyyy");
    } catch (e) { console.error("Error formatting joined date:", e); }
  }

  return (
    <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader className="text-center relative">
          <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-primary shadow-md">
            <AvatarImage src={user.avatarUrl || undefined} alt={currentDisplayName} data-ai-hint="user large_avatar" />
            <AvatarFallback className="text-5xl">{userAvatarFallback}</AvatarFallback>
          </Avatar>
          {/* Avatar upload button - deferred
          {isEditing && (
            <Button size="icon" variant="outline" className="absolute top-20 right-1/2 translate-x-[calc(50%_+_4rem)]  bg-background hover:bg-accent">
              <ImageIcon className="h-5 w-5" />
              <span className="sr-only">Change Avatar</span>
            </Button>
          )}
          */}
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
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="displayName" className="text-base">Display Name (Public)</Label>
                <Input
                  id="displayName"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Your public username"
                  className="mt-1"
                />
                 <p className="text-xs text-muted-foreground mt-1">This name will be shown on your posts and comments. Leave blank to use your full name.</p>
              </div>
              <div>
                <Label htmlFor="fullName" className="text-base">Full Name (Private)</Label>
                <Input
                  id="fullName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your full name"
                  className="mt-1"
                />
                 <p className="text-xs text-muted-foreground mt-1">This name is not typically shown publicly if a display name is set.</p>
              </div>
              {/* Avatar URL edit - deferred
              <div>
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input id="avatarUrl" value={editAvatarUrl} onChange={(e) => setEditAvatarUrl(e.target.value)} placeholder="https://example.com/avatar.png" />
              </div>
              */}
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-1">Full Name</h3>
                <p className="text-muted-foreground">{user.name || 'Not set'}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Activity</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Posts created: (Coming soon)</li>
                  <li>Comments made: (Coming soon)</li>
                  <li>Joined: {joinedDate}</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleEditToggle} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} disabled={isSaving || !editDisplayName.trim()}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={handleEditToggle}>
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          )}
        </CardFooter>
      </Card>
       {/* Prompt to set display name if not set and not editing */}
      {!isEditing && user && !user.displayName && (
        <Card className="max-w-2xl mx-auto shadow-lg mt-6 border-primary">
          <CardHeader>
            <CardTitle className="text-xl text-primary">Set Your Public Display Name!</CardTitle>
            <CardDescription>
              Your display name is how others will see you on GuernseySpeaks. Why not set one now?
            </CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-muted-foreground mb-3">
              Currently, your full name "{user.name}" is being used. You can set a different public display name.
            </p>
            <Button onClick={() => setIsEditing(true)} className="w-full">
              <Edit3 className="mr-2 h-4 w-4" /> Set Display Name
            </Button>
          </CardContent>
        </Card>
      )}
    </MainLayout>
  );
}
