import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import type { ReactNode } from 'react';

interface MainLayoutProps {
  weatherWidget: ReactNode;
  children: ReactNode; // Main content (posts)
  adsWidget: ReactNode;
}

export function MainLayout({ weatherWidget, children, adsWidget }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="container mx-auto flex flex-1 flex-col px-4 py-6 md:flex-row md:gap-6">
        {/* Weather Widget Section - Left Sidebar */}
        <aside className="mb-6 w-full md:mb-0 md:w-64 lg:w-72 xl:w-80 flex-shrink-0 rounded-lg border bg-card p-4 shadow-sm md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto">
          {weatherWidget}
        </aside>

        {/* Main Content Section - Posts */}
        <main className="flex-1">
          {children}
        </main>

        {/* Advertisement Slots Section - Right Sidebar */}
        <aside className="mt-6 w-full md:mt-0 md:w-64 lg:w-72 xl:w-80 flex-shrink-0 rounded-lg border bg-card p-4 shadow-sm md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto">
          {adsWidget}
        </aside>
      </div>
      <Footer />
    </div>
  );
}
