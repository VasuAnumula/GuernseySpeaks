
import { Header } from '@/components/layout/header';
import { AnnouncementBanner } from '@/components/layout/announcement-banner';
import { Suspense } from 'react';
import { Footer } from '@/components/layout/footer';
import type { ReactNode } from 'react';
import { NewsHeadlinesWidget } from '@/components/news-headlines-widget'; // Import the new component

interface MainLayoutProps {
  weatherWidget: ReactNode;
  children: ReactNode; // Main content (posts)
  adsWidget: ReactNode;
}

export function MainLayout({ weatherWidget, children, adsWidget }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense>
        <Header />
      </Suspense>
      <AnnouncementBanner />

      {/* Reddit-style layout with left and right sidebars */}
      <div className="flex flex-1 w-full pb-14">
        {/* Left Sidebar - Weather and News */}
        <aside className="hidden md:block w-80 flex-shrink-0 sticky top-12 h-[calc(100vh-3rem-3.5rem)] overflow-y-auto border-r border-border/40 bg-card/20">
          <div className="p-4 space-y-4">
            {weatherWidget}
            <NewsHeadlinesWidget />
          </div>
        </aside>

        {/* Main Content Section - Reddit style with wider posts */}
        <main className="flex-1 min-w-0 max-w-none">
          <div className="px-2 py-4">
            {children}
          </div>
        </main>

        {/* Right Sidebar - Advertisements */}
        <aside className="hidden md:block w-72 flex-shrink-0 sticky top-12 h-[calc(100vh-3rem-3.5rem)] overflow-y-auto border-l border-border/40 bg-card/20">
          <div className="p-3">
            {adsWidget}
          </div>
        </aside>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <Footer />
      </div>
    </div>
  );
}
