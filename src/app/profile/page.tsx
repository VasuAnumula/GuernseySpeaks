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
import { Mail, User, ShieldCheck, Edit3 } from 'lucide-react';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth?redirect=/profile');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <MainLayout
        weatherWidget={<WeatherWidget />}
        adsWidget={<AdPlaceholder />}
      >
        <div className="flex justify-center items-center h-64">
          <p>Loading profile...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      weatherWidget={<WeatherWidget />}
      adsWidget={<AdPlaceholder />}
    >
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader className="text-center">
          <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-primary shadow-md">
            <AvatarImage src={user.avatarUrl || undefined} alt={user.name || 'User'} data-ai-hint="user large_avatar" />
            <AvatarFallback className="text-5xl">{user.name ? user.name.substring(0, 1).toUpperCase() : <User />}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl">{user.name || 'User Profile'}</CardTitle>
          <CardDescription className="flex items-center justify-center gap-1">
             <Mail className="h-4 w-4 text-muted-foreground" /> {user.email || 'No email provided'}
          </CardDescription>
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
              This is a placeholder for user bio and other profile information. Users will be able to edit this section.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Activity</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Posts created: 5 (Placeholder)</li>
              <li>Comments made: 23 (Placeholder)</li>
              <li>Joined: January 1, 2024 (Placeholder)</li>
            </ul>
          </div>
          <Button className="w-full">
            <Edit3 className="mr-2 h-4 w-4" /> Edit Profile (Coming Soon)
          </Button>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
