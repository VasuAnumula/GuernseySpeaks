
import { Header } from '@/components/layout/header';
import { AnnouncementBanner } from '@/components/layout/announcement-banner';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Suspense } from 'react';
import { Footer } from '@/components/layout/footer';
import type { ReactNode } from 'react';
import { NewsHeadlinesWidget } from '@/components/news-headlines-widget';

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
        <aside className="hidden md:block w-[22rem] flex-shrink-0 sticky top-12 h-[calc(100vh-3rem-3.5rem)] overflow-y-auto border-r border-border/40 bg-card/20 animate-slide-in-left">
          <div className="p-4 space-y-4">
            {weatherWidget}
            <NewsHeadlinesWidget />
          </div>
        </aside>

        {/* Main Content Section - fits content naturally */}
        <main className="flex-1 min-w-0 animate-fade-in">
          <div className="px-3 py-4">
            {children}
          </div>
        </main>

        {/* Right Sidebar - Advertisements */}
        <aside className="hidden md:block w-[20rem] flex-shrink-0 sticky top-12 h-[calc(100vh-3rem-3.5rem)] overflow-y-auto border-l border-border/40 bg-card/20 animate-slide-in-right">
          <div className="p-4">
            {adsWidget}
          </div>
        </aside>
      </div>

      {/* Desktop Footer */}
      <div className="hidden md:block fixed bottom-0 left-0 right-0 z-40">
        <Footer />
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
