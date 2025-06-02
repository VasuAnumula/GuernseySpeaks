
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, ExternalLink } from 'lucide-react';
import Link from 'next/link';

// Placeholder data - replace with actual news fetching logic
const dummyHeadlines = [
  { id: '1', title: 'Guernsey States Announce New Recycling Initiative', url: '#', source: 'Gov.gg', date: '2024-05-29' },
  { id: '2', title: 'Record Number of Puffins Spotted on Herm Island', url: '#', source: 'Guernsey Press', date: '2024-05-28' },
  { id: '3', title: 'Local Chef Wins Prestigious Culinary Award', url: '#', source: 'BBC Guernsey', date: '2024-05-27' },
  { id: '4', title: 'Aurigny Adds Extra Flights for Summer Season', url: '#', source: 'Channel Islands News', date: '2024-05-26' },
  { id: '5', title: 'Public Consultation on New Seafront Development Opens', url: '#', source: 'Bailiwick Express', date: '2024-05-25' },
];

export function NewsHeadlinesWidget() {
  // In a real application, you would fetch news from an API here
  // For example:
  // const [headlines, setHeadlines] = useState([]);
  // const [loading, setLoading] = useState(true);
  // useEffect(() => {
  //   async function fetchNews() {
  //     // const response = await fetch('YOUR_NEWS_API_ENDPOINT_FOR_GUERNSEY');
  //     // const data = await response.json();
  //     // setHeadlines(data.articles);
  //     setLoading(false);
  //   }
  //   fetchNews();
  // }, []);

  // if (loading) return <p>Loading news...</p>;

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold flex items-center">
          <Newspaper className="mr-2 h-6 w-6 text-primary" />
          Guernsey News
        </CardTitle>
      </CardHeader>
      <CardContent>
        {dummyHeadlines.length === 0 ? (
          <p className="text-muted-foreground">No news headlines available at the moment.</p>
        ) : (
          <ul className="space-y-3">
            {dummyHeadlines.map((headline) => (
              <li key={headline.id} className="border-b border-border pb-2 last:border-b-0 last:pb-0">
                <Link href={headline.url} target="_blank" rel="noopener noreferrer" className="group hover:text-primary transition-colors">
                  <h4 className="font-medium text-sm group-hover:underline">{headline.title}</h4>
                  <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                    <span>{headline.source} - {new Date(headline.date).toLocaleDateString()}</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground mt-4 text-center">
          News headlines are placeholders.
        </p>
      </CardContent>
    </Card>
  );
}
