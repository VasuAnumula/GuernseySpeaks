"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Sparkles, MapPin } from 'lucide-react';
import Image from 'next/image';
import { getActiveAdvertisements, trackAdImpression, trackAdClick } from '@/services/advertisementService';
import type { Advertisement } from '@/types';

function PlaceholderAds() {
  return (
    <>
      <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in hover-lift">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardContent className="p-0">
          <div className="relative">
            <Image
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=200&fit=crop&crop=center"
              alt="Local Business Showcase"
              width={400}
              height={200}
              className="w-full h-40 object-cover rounded-t-lg"
              data-ai-hint="local business storefront"
            />
            <Badge className="absolute top-2 left-2 bg-primary/90 text-primary-foreground border-0">
              <Sparkles className="w-3 h-3 mr-1" />
              Featured
            </Badge>
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-sm mb-1">Discover Local Guernsey</h3>
            <p className="text-xs text-muted-foreground mb-2 flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              Support Island Businesses
            </p>
            <div className="flex justify-between items-center">
              <span className="text-xs text-primary font-medium">Your ad here</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="group border-dashed border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all duration-300 animate-fade-in hover-lift">
        <CardContent className="p-4 text-center">
          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <h4 className="font-medium text-sm mb-1">Promote Your Event</h4>
          <p className="text-xs text-muted-foreground mb-2">Reach the Guernsey community</p>
          <div className="text-xs text-primary font-medium">Get Started &rarr;</div>
        </CardContent>
      </Card>
    </>
  );
}

export function AdPlaceholder() {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const trackedImpressions = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    getActiveAdvertisements(3).then((activeAds) => {
      if (!cancelled) {
        setAds(activeAds);
        setLoading(false);
        // Track impressions for loaded ads
        activeAds.forEach((ad) => {
          if (!trackedImpressions.current.has(ad.id)) {
            trackedImpressions.current.add(ad.id);
            trackAdImpression(ad.id);
          }
        });
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleAdClick = (ad: Advertisement) => {
    trackAdClick(ad.id);
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <PlaceholderAds />
      ) : ads.length > 0 ? (
        ads.map((ad, index) => (
          <a
            key={ad.id}
            href={ad.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleAdClick(ad)}
            className="block"
          >
            <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 hover-lift opacity-0 animate-fade-in-up" style={{ animationDelay: `${index * 0.15}s`, animationFillMode: 'forwards' }}>
              <CardContent className="p-0">
                {ad.imageUrl && (
                  <div className="relative">
                    <Image
                      src={ad.imageUrl}
                      alt={ad.title}
                      width={400}
                      height={200}
                      className="w-full h-40 object-cover rounded-t-lg"
                    />
                    <Badge className="absolute top-2 left-2 bg-primary/90 text-primary-foreground border-0 text-xs">
                      Ad
                    </Badge>
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-1">{ad.title}</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Sponsored</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </a>
        ))
      ) : (
        <PlaceholderAds />
      )}

      <div className="pt-2 border-t border-border/50">
        <p className="text-xs text-center text-muted-foreground leading-relaxed">
          <span className="inline-flex items-center">
            <Sparkles className="w-3 h-3 mr-1" />
            Ads support our community platform
          </span>
        </p>
      </div>
    </div>
  );
}
