
"use client";

import { MainLayout } from '@/components/layout/main-layout';
import { AuthForm } from '@/components/auth/auth-form';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export default function AuthPage() {
  return (
    <div className="min-h-screen auth-gradient-bg">
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
    </div>
  );
}
