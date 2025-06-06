
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, ExternalLink, Loader2, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Placeholder for articles fetched from custom websites
interface CustomNewsArticle {
  sourceName: string; // e.g., "Website A News"
  title: string;
  url: string;
  publishedDate?: string; // Optional: if available and parsable
  description?: string; // Optional summary
}

export function NewsHeadlinesWidget() {
  const [articles, setArticles] = useState<CustomNewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCustomNews() {
      setLoading(true);
      setError(null);
      setArticles([]); // Clear previous articles

      // --- Placeholder: Simulate fetching from two websites ---
      // In a real implementation, this would involve:
      // 1. Making HTTP requests to the target websites (server-side, e.g., in an API route or Server Action).
      // 2. Parsing the HTML response (e.g., using a library like 'cheerio' if RSS feeds are not available).
      // 3. Extracting headlines, links, and other relevant data.
      // 4. Handling errors for each website individually.
      // This process is complex and site-specific.

      // For now, we'll use mock data.
      try {
        // Simulate a delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mockArticles: CustomNewsArticle[] = [
          {
            sourceName: "Placeholder Site 1",
            title: "Important Update from Site 1",
            url: "#",
            publishedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
            description: "This is a placeholder article description from the first mock website."
          },
          {
            sourceName: "Placeholder Site 1",
            title: "Another Story from Site 1",
            url: "#",
            publishedDate: new Date(Date.now() - 86400000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), // Yesterday
          },
          {
            sourceName: "Placeholder Site 2",
            title: "Breaking News from Site 2",
            url: "#",
            publishedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
            description: "Details about the latest developments from the second mock website."
          },
          {
            sourceName: "Placeholder Site 2",
            title: "Featured Article on Site 2",
            url: "#",
          },
        ];
        
        // Simulate a potential error for one site (for demonstration)
        // if (Math.random() > 0.5) {
        //   throw new Error("Simulated error fetching from Placeholder Site 2");
        // }

        setArticles(mockArticles.slice(0, 5)); // Limit to 5 articles
        setError(null); // Clear any previous error

      } catch (e: any) {
        console.error("Error fetching custom news (simulated):", e);
        setError("Could not load news from custom sources. " + e.message);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    }
    fetchCustomNews();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    // This assumes dateString is already formatted or easily convertible.
    // For real scraped dates, parsing might be complex.
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
      });
    } catch (e) {
      return dateString; // Return original if parsing fails
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold flex items-center">
          <Newspaper className="mr-2 h-6 w-6 text-primary" />
          Island Headlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading headlines...</p>
          </div>
        )}
        {error && !loading && (
          <div className="flex flex-col items-center text-center py-4 text-destructive">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p className="font-semibold">Error loading headlines</p>
            <p className="text-xs">{error}</p>
            <p className="text-xs mt-2">Please provide the website URLs to fetch news from. Consider checking if they offer RSS feeds, which is a more reliable method.</p>
          </div>
        )}
        {!loading && !error && articles.length === 0 && (
          <div className="text-center py-4">
            <p className="text-muted-foreground">No headlines available at the moment.</p>
            <p className="text-xs text-muted-foreground mt-1">Ready to fetch from your chosen websites. Please provide their URLs.</p>
          </div>
        )}
        {!loading && !error && articles.length > 0 && (
          <ul className="space-y-3">
            {articles.map((article, index) => (
              <li key={`${article.url}-${index}`} className="border-b border-border pb-2 last:border-b-0 last:pb-0">
                <Link href={article.url} target="_blank" rel="noopener noreferrer" className="group hover:text-primary transition-colors">
                  <h4 className="font-medium text-sm group-hover:underline leading-tight">{article.title}</h4>
                  {article.description && <p className="text-xs text-muted-foreground mt-0.5">{article.description}</p>}
                  <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                    <span className="flex items-center">
                      <LinkIcon className="h-3 w-3 mr-1 text-primary/70" />
                      {article.sourceName}
                      {article.publishedDate && ` - ${formatDate(article.publishedDate)}`}
                    </span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!loading && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            {articles.length > 0 && !error ? `Headlines from custom sources.` : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
