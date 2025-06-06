
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';


interface NewsArticle {
  title: string;
  url: string;
  source: string;
}

export function NewsHeadlinesWidget() {
  const [headlines, setHeadlines] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNews() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/news');
        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        }
        const data: NewsArticle[] = await response.json();
        setHeadlines(data);
      } catch (e: any) {
        console.error('Error fetching news:', e);
        setError('Failed to fetch news headlines.');
        setHeadlines([]);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);


  // Headlines fetched from the API do not include publication dates.

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold flex items-center">
          <Newspaper className="mr-2 h-6 w-6 text-primary" />
          Guernsey News
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading news...</p>
          </div>
        )}
        {error && !loading && (
          <div className="flex flex-col items-center text-center py-4 text-destructive">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p className="font-semibold">Error loading news</p>
            <p className="text-xs">{error}</p>
          </div>
        )}
        {!loading && !error && headlines.length === 0 && (
          <p className="text-muted-foreground text-center py-4">No news headlines available at the moment.</p>
        )}
        {!loading && !error && headlines.length > 0 && (
          <ul className="space-y-3">
            {headlines.map((headline, index) => (
              <li key={headline.url || index} className="border-b border-border pb-2 last:border-b-0 last:pb-0">
                <Link href={headline.url} target="_blank" rel="noopener noreferrer" className="group hover:text-primary transition-colors">
                  <h4 className="font-medium text-sm group-hover:underline leading-tight">{headline.title}</h4>
                  <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                    <span>{headline.source}</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!loading && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            {headlines.length > 0 && !error ? 'Latest headlines from local news sources' : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
