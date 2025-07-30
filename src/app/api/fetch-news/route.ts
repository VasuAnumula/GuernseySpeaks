export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { parseStringPromise } from 'xml2js';

interface CustomNewsArticle {
  sourceName: string;
  title: string;
  url: string;
  publishedDate?: string;
  description?: string;
}

const FEEDS = [
  {
    sourceName: 'Island FM - Guernsey News',
    url: 'https://www.islandfm.com/news/guernsey/feed.xml',
  },
  {
    sourceName: 'Island FM - Jersey News',
    url: 'https://www.islandfm.com/news/jersey/feed.xml',
  },
];

async function parseRss(xml: string, sourceName: string, limit: number = 5): Promise<CustomNewsArticle[]> {
  const parsed = await parseStringPromise(xml, { explicitArray: false, trim: true });
  const channel = parsed?.rss?.channel;
  const items = channel?.item ? (Array.isArray(channel.item) ? channel.item : [channel.item]) : [];

  return items.slice(0, limit).reduce((acc: CustomNewsArticle[], item: any) => {
    if (item.title && item.link) {
      acc.push({
        sourceName,
        title: item.title,
        url: item.link,
        publishedDate: item.pubDate,
        description: item.description,
      });
    }
    return acc;
  }, []);
}

export async function GET() {
  const articles: CustomNewsArticle[] = [];

  for (const feed of FEEDS) {
    try {
      const res = await fetch(feed.url, {
        cache: 'no-store',
        headers: { 
          'User-Agent': 'GuernseySpeaks/1.0',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        },
      });
      
      if (!res.ok) {
        console.error(`Failed to fetch ${feed.sourceName}: ${res.status} - ${res.statusText}`);
        continue;
      }
      
      const xml = await res.text();
      const parsed = await parseRss(xml, feed.sourceName);
      articles.push(...parsed);
    } catch (err) {
      console.error(`Error fetching ${feed.sourceName}:`, err);
    }
  }

  return NextResponse.json({ articles });
}
