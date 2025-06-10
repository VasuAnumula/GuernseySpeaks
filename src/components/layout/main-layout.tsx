
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { NewsHeadlinesWidget } from '@/components/news-headlines-widget'; // Import the new component

interface MainLayoutProps {
  weatherWidget: ReactNode;
  children: ReactNode; // Main content (posts)
  adsWidget: ReactNode;
}

export function MainLayout({ weatherWidget, children, adsWidget }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<div className="h-16" />}> 
        <Header />
      </Suspense>
      <div className="container mx-auto flex flex-1 flex-col px-4 sm:px-6 py-6 md:flex-row md:gap-6">
        {/* Left Sidebar Section - Weather and News */}
        <aside className="mb-6 w-full md:mb-0 md:w-64 lg:w-72 xl:w-80 flex-shrink-0 rounded-lg p-4 md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto space-y-6">
          {weatherWidget}
          <NewsHeadlinesWidget /> {/* Add NewsHeadlinesWidget here */}
        </aside>

        {/* Main Content Section - Posts */}
        <main className="flex-1 rounded-lg p-4">
          {children}
        </main>

        {/* Advertisement Slots Section - Right Sidebar */}
        <aside className="mt-6 w-full md:mt-0 md:w-64 lg:w-72 xl:w-80 flex-shrink-0 rounded-lg p-4 md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto">
          {adsWidget}
        </aside>
      </div>
      <Footer />
    </div>
  );
}
