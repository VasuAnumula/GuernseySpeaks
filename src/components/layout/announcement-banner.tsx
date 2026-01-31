
"use client";

import { useState, useEffect } from 'react';
import { X, ExternalLink, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { getPlatformSettings } from '@/services/settingsService';
import type { AnnouncementBanner as AnnouncementBannerType } from '@/types';
import Link from 'next/link';

export function AnnouncementBanner() {
  const [banner, setBanner] = useState<AnnouncementBannerType | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const settings = await getPlatformSettings();
        if (settings.announcementBanner.enabled && settings.announcementBanner.text) {
          setBanner(settings.announcementBanner);
        }
      } catch (error) {
        console.error('Failed to fetch announcement banner:', error);
      } finally {
        setLoading(false);
      }
    };

    // Check if user has dismissed this banner in session storage
    const dismissedKey = 'announcement_dismissed';
    const isDismissed = sessionStorage.getItem(dismissedKey);
    if (isDismissed) {
      setDismissed(true);
      setLoading(false);
    } else {
      fetchBanner();
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('announcement_dismissed', 'true');
  };

  if (loading || dismissed || !banner) {
    return null;
  }

  const getStyles = () => {
    switch (banner.type) {
      case 'info':
        return {
          bg: 'bg-blue-500',
          text: 'text-white',
          icon: <Info className="h-4 w-4 flex-shrink-0" />,
        };
      case 'success':
        return {
          bg: 'bg-green-500',
          text: 'text-white',
          icon: <CheckCircle className="h-4 w-4 flex-shrink-0" />,
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500',
          text: 'text-black',
          icon: <AlertTriangle className="h-4 w-4 flex-shrink-0" />,
        };
      case 'error':
        return {
          bg: 'bg-red-500',
          text: 'text-white',
          icon: <AlertCircle className="h-4 w-4 flex-shrink-0" />,
        };
      default:
        return {
          bg: 'bg-blue-500',
          text: 'text-white',
          icon: <Info className="h-4 w-4 flex-shrink-0" />,
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`${styles.bg} ${styles.text} py-2 px-4`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {styles.icon}
          <p className="text-sm font-medium truncate">{banner.text}</p>
          {banner.link && (
            <Link
              href={banner.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm underline hover:no-underline flex-shrink-0"
            >
              Learn more
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className={`p-1 rounded-full hover:bg-black/10 transition-colors flex-shrink-0`}
          aria-label="Dismiss announcement"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
