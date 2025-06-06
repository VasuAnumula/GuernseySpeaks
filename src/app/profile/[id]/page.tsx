
"use client";

import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getUserById } from '@/services/userService';
import type { User } from '@/types';
import { Loader2, Mail, User as UserIconLucide, ShieldCheck, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.id as string;

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formattedJoinedDate, setFormattedJoinedDate] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async () => {
    if (!userId) {
      setError("User ID not found in URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fetchedUser = await getUserById(userId);
      if (fetchedUser) {
        setProfileUser(fetchedUser);
      } else {
        setError("User profile not found.");
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setError("Failed to load user profile.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  useEffect(() => {
    if (profileUser?.createdAt) {
      try {
        const date = profileUser.createdAt instanceof Date ? profileUser.createdAt : (profileUser.createdAt as any).toDate();
        setFormattedJoinedDate(format(date, "MMMM d, yyyy"));
      } catch (e) {
        console.error("Error formatting joined date for profile user:", e);
        setFormattedJoinedDate("Invalid Date");
      }
    } else if (profileUser && !profileUser.createdAt) {
        setFormattedJoinedDate("Not available");
    }
  }, [profileUser]);


  if (loading) {
    return (
      <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading profile...</p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
        <Card className="w-full max-w-md mx-auto mt-10">
          <CardHeader className="items-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-2" />
            <CardTitle>Error Loading Profile</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href="/">Return to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  if (!profileUser) {
    return (
      <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
        <div className="text-center py-10">
          <h1 className="text-xl md:text-2xl font-semibold">Profile not found</h1>
          <p className="text-muted-foreground mt-2">The user profile you are looking for does not exist.</p>
          <Button asChild className="mt-4"><Link href="/">Go to Homepage</Link></Button>
        </div>
      </MainLayout>
    );
  }

  const displayName = profileUser.displayName || profileUser.name || 'User';
  const avatarFallback = displayName.substring(0, 1).toUpperCase() || <UserIconLucide />;

  return (
    <MainLayout weatherWidget={<WeatherWidget />} adsWidget={<AdPlaceholder />}>
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader className="text-center">
          <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-primary shadow-md">
            <AvatarImage src={profileUser.avatarUrl || undefined} alt={displayName} data-ai-hint="user large_avatar"/>
            <AvatarFallback className="text-5xl">{avatarFallback}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl">{displayName}</CardTitle>
          {profileUser.email && (
            <CardDescription className="flex items-center justify-center gap-1">
              <Mail className="h-4 w-4 text-muted-foreground" /> {profileUser.email} (Privacy Note: Email might be hidden based on settings)
            </CardDescription>
          )}
          {profileUser.role && (
            <div className="mt-2 flex items-center justify-center gap-1 text-sm text-accent-foreground font-medium">
              <ShieldCheck className="h-5 w-5 text-accent" /> Role: <span className="capitalize">{profileUser.role}</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-1">About {displayName}</h3>
            <p className="text-muted-foreground">Member since: {formattedJoinedDate || 'Loading...'}</p>
            {/* Add more public profile information here, e.g., bio if you add it to User type */}
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Activity</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Posts created: (Coming soon)</li>
              <li>Comments made: (Coming soon)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
