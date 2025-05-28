
"use client";

import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Mail, User as UserIcon, ShieldCheck, Edit3, Loader2 } from 'lucide-react'; // Renamed User to UserIcon
import { format } from 'date-fns';


export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=/profile');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <MainLayout
        weatherWidget={<WeatherWidget />}
        adsWidget={<AdPlaceholder />}
      >
        <div className="flex justify-center items-center h-64">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading profile...</p>
        </div>
      </MainLayout>
    );
  }
  
  const userName = user.name || 'User Profile';
  const userAvatarFallback = user.name ? user.name.substring(0, 1).toUpperCase() : <UserIcon />;
  let joinedDate = "Not available";
  if (user.createdAt) {
    try {
      const date = user.createdAt instanceof Date ? user.createdAt : (user.createdAt as any).toDate();
      joinedDate = format(date, "MMMM d, yyyy");
    } catch (e) { console.error("Error formatting joined date:", e); }
  }


  return (
    <MainLayout
      weatherWidget={<WeatherWidget />}
      adsWidget={<AdPlaceholder />}
    >
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader className="text-center">
          <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-primary shadow-md">
            <AvatarImage src={user.avatarUrl || undefined} alt={userName} data-ai-hint="user large_avatar" />
            <AvatarFallback className="text-5xl">{userAvatarFallback}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl">{userName}</CardTitle>
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
            <h3 className="text-lg font-semibold mb-2">About</h3>
            <p className="text-muted-foreground">
              This is your public profile. Profile editing is coming soon!
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Activity</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              {/* TODO: Fetch actual user activity stats */}
              <li>Posts created: (Coming soon)</li>
              <li>Comments made: (Coming soon)</li>
              <li>Joined: {joinedDate}</li>
            </ul>
          </div>
          <Button className="w-full" disabled> {/* TODO: Implement Edit Profile */}
            <Edit3 className="mr-2 h-4 w-4" /> Edit Profile (Coming Soon)
          </Button>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
