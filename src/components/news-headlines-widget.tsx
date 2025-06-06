
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const NEWS_API_KEY = process.env.NEXT_PUBLIC_NEWS_API_KEY;
const NEWS_API_ENDPOINT_BASE = `https://newsapi.org/v2/everything`;

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
    if (!NEWS_API_KEY || NEWS_API_KEY === "YOUR_NEWS_API_KEY_PLACEHOLDER" || NEWS_API_KEY.length < 30) { // Basic check for a real key
      setError("News API key not configured or invalid. Please check NEXT_PUBLIC_NEWS_API_KEY in your environment variables.");
      setLoading(false);
      return;
    }

    async function fetchNews() {
      setLoading(true);
      setError(null);
      // Fetches news related to "Guernsey" and sorts by publication date, limited to 5 articles.
      // Sources parameter can be added if specific sources are preferred e.g. sources=bbc-news,the-guardian-uk
      // Using 'everything' endpoint; 'top-headlines' with country='gb' and category might also be an option.
      const newsApiUrl = `${NEWS_API_ENDPOINT_BASE}?q=Guernsey&sortBy=publishedAt&pageSize=5&apiKey=${NEWS_API_KEY}`;
      
      try {
        const response = await fetch(newsApiUrl);
        const data: NewsApiResponse = await response.json();

        if (data.status === "ok") {
          setHeadlines(data.articles);
        } else {
          // Handle API errors from NewsAPI
          console.error("NewsAPI Error Response:", data);
          let errorMessage = data.message || "Failed to fetch news headlines.";
          if (data.code) {
            errorMessage += ` (Code: ${data.code})`;
            // Specific handling for common NewsAPI error codes
            if (data.code === "apiKeyDisabled") {
              errorMessage = "Your NewsAPI key is disabled. Please check your NewsAPI account.";
            } else if (data.code === "apiKeyExhausted") {
              errorMessage = "Your NewsAPI key has no more requests available.";
            } else if (data.code === "apiKeyInvalid") {
              errorMessage = "Your NewsAPI key is invalid. Please ensure it's correct.";
            } else if (data.code === "rateLimited") {
              errorMessage = "You have been rate-limited by NewsAPI. Please try again later.";
            } else if (data.code === "sourceDoesNotExist") {
              errorMessage = "A specified news source does not exist in NewsAPI.";
            }
          }
          setError(errorMessage);
          setHeadlines([]);
        }
      } catch (e: any) {
        // Handle network errors or other unexpected issues
        console.error("Error fetching news:", e);
        setError("An error occurred while fetching news. Check browser console for details.");
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
             {error.toLowerCase().includes("key is disabled") && 
              <p className="text-xs mt-1">Note: NewsAPI developer keys are often disabled for use on deployed websites (they may only work on localhost). You might need a paid plan for deployed applications.</p>}
            {error.toLowerCase().includes("invalid") && error.toLowerCase().includes("key") &&
             <p className="text-xs mt-1">Please double-check that your `NEXT_PUBLIC_NEWS_API_KEY` is correctly set in your environment variables and matches the key from your NewsAPI dashboard.</p>}
             {error.toLowerCase().includes("rate-limited") && 
              <p className="text-xs mt-1">You may have hit the API request limit for your key. Check your NewsAPI dashboard for usage details.</p>}
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
             {headlines.length > 0 && !error ? `News provided by NewsAPI.org` : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
