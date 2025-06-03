
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
import { useEffect, useState } } from 'react';
import { Mail, User as UserIcon, ShieldCheck, Loader2, UploadCloud } from 'lucide-react';
import { format } from 'date-fns';
// import { updateUserProfile } from '@/services/userService'; // Upload logic not implemented here
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [formattedJoinedDate, setFormattedJoinedDate] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=/profile');
    }
    if (user && user.createdAt) {
      try {
        const date = user.createdAt instanceof Date ? user.createdAt : (user.createdAt as any).toDate();
        setFormattedJoinedDate(format(date, "MMMM d, yyyy"));
      } catch (e) {
        console.error("Error formatting joined date:", e);
        setFormattedJoinedDate("Invalid Date");
      }
    } else if (user && !user.createdAt) {
        setFormattedJoinedDate("Not available");
    }
  }, [user, authLoading, router]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleAvatarUpload = async () => {
    if (!selectedFile || !user) {
      toast({ title: "No File Selected", description: "Please select an image file to upload.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    toast({ title: "Upload Started (Placeholder)", description: "Actual upload logic to Firebase Storage needs to be implemented." });
    // Placeholder for actual upload logic:
    // try {
    //   // 1. Upload selectedFile to Firebase Storage (requires a service function)
    //   // const avatarUrl = await uploadProfilePicture(user.uid, selectedFile);
    //   // 2. Update user profile in Firestore with the new avatarUrl
    //   // await updateUserProfile(user.uid, { avatarUrl });
    //   // 3. Update user context
    //   // updateUserInContext({ avatarUrl });
    //   // toast({ title: "Avatar Updated", description: "Your new avatar has been set." });
    //   setSelectedFile(null); // Clear selection
    // } catch (error) {
    //   console.error("Failed to upload avatar:", error);
    //   toast({ title: "Upload Failed", description: "Could not upload your new avatar. Please try again.", variant: "destructive" });
    // } finally {
    //   setIsUploading(false);
    // }
    
    // Simulate upload for now
    setTimeout(() => {
      setIsUploading(false);
       toast({ title: "Note", description: "Avatar upload functionality is a placeholder. Backend integration needed." });
    }, 2000);
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
          <div>
            <h3 className="text-lg font-semibold mb-1">Full Name</h3>
            <p className="text-muted-foreground">{user.name || 'Not set'}</p>
          </div>
           <div>
            <h3 className="text-lg font-semibold mb-1">Display Name (Public)</h3>
            <p className="text-muted-foreground">{user.displayName || user.name || 'Not set'}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Change Profile Picture</h3>
            <div className="flex flex-col sm:flex-row items-center gap-2 mt-1">
              <Label htmlFor="avatar-upload" className="sr-only">Choose profile picture</Label>
              <Input 
                id="avatar-upload" 
                type="file" 
                accept="image/png, image/jpeg, image/gif"
                onChange={handleFileChange}
                className="flex-grow file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                disabled={isUploading}
              />
              <Button onClick={handleAvatarUpload} disabled={isUploading || !selectedFile} className="w-full sm:w-auto">
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                Upload Avatar
              </Button>
            </div>
            {selectedFile && <p className="text-xs text-muted-foreground mt-1">Selected: {selectedFile.name}</p>}
             <p className="text-xs text-muted-foreground mt-2">
              Note: Actual image upload to Firebase Storage and profile update is not yet implemented. This is a UI placeholder.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Activity</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Posts created: (Coming soon)</li>
              <li>Comments made: (Coming soon)</li>
              <li>Joined: {formattedJoinedDate || 'Loading...'}</li>
            </ul>
          </div>
           <p className="text-sm text-muted-foreground border-t pt-4 mt-4">
            Profile editing is currently disabled. Your display name and full name are set during registration.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end">
            {/* Footer can be used for other actions if needed in the future */}
        </CardFooter>
      </Card>
    </MainLayout>
  );
}

    