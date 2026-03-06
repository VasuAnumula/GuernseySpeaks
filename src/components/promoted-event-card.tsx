"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Clock, ExternalLink, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { getActivePromotedEvents, trackEventImpression, trackEventClick } from '@/services/promotedEventService';
import type { PromotedEvent } from '@/types';
import { format } from 'date-fns';

export function PromotedEventBanner() {
  const [events, setEvents] = useState<PromotedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const trackedImpressions = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    getActivePromotedEvents(2).then((activeEvents) => {
      if (!cancelled) {
        setEvents(activeEvents);
        setLoading(false);
        activeEvents.forEach((event) => {
          if (!trackedImpressions.current.has(event.id)) {
            trackedImpressions.current.add(event.id);
            trackEventImpression(event.id);
          }
        });
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading || events.length === 0) return null;

  return (
    <div className="space-y-2">
      {events.map((event) => {
        const eventDate = event.eventDate instanceof Date
          ? event.eventDate
          : (event.eventDate as any).toDate?.() || new Date();

        const handleClick = () => {
          trackEventClick(event.id);
          if (event.linkUrl) {
            window.open(event.linkUrl, '_blank', 'noopener,noreferrer');
          }
        };

        return (
          <div
            key={event.id}
            onClick={handleClick}
            className="cursor-pointer"
          >
            <Card className="group relative overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 via-background to-accent/5 hover:border-primary/40 hover:shadow-md transition-all duration-300">
              <CardContent className="p-0">
                <div className="flex gap-3 p-3">
                  {/* Event image thumbnail */}
                  {event.imageUrl && (
                    <div className="shrink-0">
                      <Image
                        src={event.imageUrl}
                        alt={event.title}
                        width={80}
                        height={80}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover"
                      />
                    </div>
                  )}

                  {/* Event details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge className="bg-primary/90 text-primary-foreground border-0 text-[10px] px-1.5 py-0">
                        <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                        Promoted
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>

                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {event.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {format(eventDate, 'MMM d, yyyy')}
                      </span>
                      {event.eventTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {event.eventTime}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{event.location}</span>
                      </span>
                    </div>
                  </div>

                  {/* External link indicator */}
                  {event.linkUrl && (
                    <div className="shrink-0 self-center">
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
