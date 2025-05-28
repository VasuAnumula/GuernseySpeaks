"use client";

import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Users, ShieldAlert, ListChecks } from 'lucide-react';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'superuser')) {
      // Redirect non-superusers or unauthenticated users
      router.push('/'); 
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'superuser') {
    return (
      <MainLayout
        weatherWidget={<WeatherWidget />}
        adsWidget={<AdPlaceholder />}
      >
        <div className="flex justify-center items-center h-64">
          <p>{loading ? 'Loading...' : 'Access Denied. Superuser role required.'}</p>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout
      weatherWidget={<WeatherWidget />}
      adsWidget={<AdPlaceholder />}
    >
      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl">Admin Dashboard</CardTitle>
          <CardDescription>Manage users, moderate content, and oversee the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Manage Users</CardTitle>
                <Users className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">125</div>
                <p className="text-xs text-muted-foreground">Total registered users</p>
                <Button variant="outline" size="sm" className="mt-2 w-full">View Users</Button>
              </CardContent>
            </Card>
             <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reported Content</CardTitle>
                <ShieldAlert className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5</div>
                <p className="text-xs text-muted-foreground">Pending reports</p>
                 <Button variant="outline" size="sm" className="mt-2 w-full">Review Reports</Button>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Moderator Roles</CardTitle>
                <ListChecks className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">Active moderators</p>
                <Button variant="outline" size="sm" className="mt-2 w-full">Assign Roles</Button>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>Configure global settings for GuernseySpeaks (Coming Soon).</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Content filtering levels, announcement banners, etc.</p>
            </CardContent>
          </Card>

        </CardContent>
      </Card>
    </MainLayout>
  );
}
