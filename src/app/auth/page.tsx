import { MainLayout } from '@/components/layout/main-layout';
import { AuthForm } from '@/components/auth/auth-form';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';

export default function AuthPage() {
  return (
    <MainLayout
      weatherWidget={<WeatherWidget />}
      adsWidget={<AdPlaceholder />}
    >
      <AuthForm />
    </MainLayout>
  );
}
