"use client"; // Required for useAuth and other client hooks in PostForm

import { MainLayout } from '@/components/layout/main-layout';
import { PostForm } from '@/components/posts/post-form';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { useAuth } from '@/hooks/use-auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Corrected import for App Router
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function SubmitPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth?redirect=/submit');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <MainLayout
        weatherWidget={<WeatherWidget />}
        adsWidget={<AdPlaceholder />}
      >
        <div className="flex justify-center items-center h-64">
          <p>Loading...</p> {/* Or a skeleton loader */}
        </div>
      </MainLayout>
    );
  }

  if (!user) {
     return (
      <MainLayout
        weatherWidget={<WeatherWidget />}
        adsWidget={<AdPlaceholder />}
      >
        <Card className="w-full max-w-md mx-auto mt-10">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need to be logged in to create a post.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/auth?redirect=/submit">Login to Continue</Link>
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout
      weatherWidget={<WeatherWidget />}
      adsWidget={<AdPlaceholder />}
    >
      <PostForm />
    </MainLayout>
  );
}
