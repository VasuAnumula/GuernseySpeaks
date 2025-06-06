
"use client"; // Marking the page as a client component for simplicity with Suspense, or keep as server and wrap AuthForm

import { MainLayout } from '@/components/layout/main-layout';
import { AuthForm } from '@/components/auth/auth-form';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { Suspense } from 'react'; // Import Suspense
import { Loader2 } from 'lucide-react'; // For a loading fallback

export default function AuthPage() {
  return (
    <MainLayout
      weatherWidget={<WeatherWidget />}
      adsWidget={<AdPlaceholder />}
    >
      <Suspense fallback={
        <div className="flex justify-center items-center py-12 h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading authentication...</p>
        </div>
      }>
        <AuthForm />
      </Suspense>
    </MainLayout>
  );
}
