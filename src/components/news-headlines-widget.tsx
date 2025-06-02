
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const NEWS_API_KEY = process.env.NEXT_PUBLIC_NEWS_API_KEY;
const NEWS_API_ENDPOINT = `https://newsapi.org/v2/everything?q=Guernsey&sortBy=publishedAt&pageSize=5&apiKey=${NEWS_API_KEY}`;

interface NewsArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
  code?: string; // For error responses
  message?: string; // For error responses
}

export function NewsHeadlinesWidget() {
  const [headlines, setHeadlines] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!NEWS_API_KEY || NEWS_API_KEY === "YOUR_NEWS_API_KEY") {
      setError("News API key not configured. Add NEXT_PUBLIC_NEWS_API_KEY.");
      setLoading(false);
      return;
    }

    async function fetchNews() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(NEWS_API_ENDPOINT);
        const data: NewsApiResponse = await response.json();

        if (data.status === "ok") {
          setHeadlines(data.articles);
        } else {
          console.error("NewsAPI Error:", data);
          setError(data.message || "Failed to fetch news headlines.");
          setHeadlines([]);
        }
      } catch (e: any) {
        console.error("Error fetching news:", e);
        setError("An error occurred while fetching news.");
        setHeadlines([]);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);


  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

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
             {error.includes("apiKeyDisabled") && <p className="text-xs mt-1">The API key may be disabled (e.g. for developer accounts on production).</p>}
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
                    <span>{headline.source.name} - {formatDate(headline.publishedAt)}</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!loading && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
             {headlines.length > 0 ? `News provided by NewsAPI.org` : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
