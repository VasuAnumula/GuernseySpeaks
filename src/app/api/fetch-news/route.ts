'use server';

import { NextResponse } from 'next/server';
import type { CustomNewsArticle } from '@/types/news';

const FEEDS = [
  {
    sourceName: 'Bailiwick Express',
    url: 'https://www.bailiwickexpress.com/feeds/news/',
  },
  {
    sourceName: 'Guernsey Press',
    url: 'https://guernseypress.com/feed/',
  },
];

function extractFirst(item: string, regexes: RegExp[]): string | undefined {
  for (const regex of regexes) {
    const match = item.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

function parseRss(xml: string, sourceName: string, limit: number = 5): CustomNewsArticle[] {
  const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
  const articles: CustomNewsArticle[] = [];
  for (const itemRaw of items.slice(0, limit)) {
    const title = extractFirst(itemRaw, [
      /<title><!\[CDATA\[(.*?)\]\]><\/title>/i,
      /<title>(.*?)<\/title>/i,
    ]);
    const url = extractFirst(itemRaw, [
      /<link>(.*?)<\/link>/i,
    ]);
    const publishedDate = extractFirst(itemRaw, [
      /<pubDate>(.*?)<\/pubDate>/i,
    ]);
    const description = extractFirst(itemRaw, [
      /<description><!\[CDATA\[(.*?)\]\]><\/description>/i,
      /<description>(.*?)<\/description>/i,
    ]);

    if (title && url) {
      articles.push({
        sourceName,
        title,
        url,
        publishedDate,
        description,
      });
    }
  }
  return articles;
}

export async function GET() {
  const articles: CustomNewsArticle[] = [];

  for (const feed of FEEDS) {
    try {
      const res = await fetch(feed.url, { next: { revalidate: 3600 } });
      if (!res.ok) {
        console.error(`Failed to fetch ${feed.sourceName}: ${res.status}`);
        continue;
      }
      const xml = await res.text();
      articles.push(...parseRss(xml, feed.sourceName));
    } catch (err) {
      console.error(`Error fetching ${feed.sourceName}:`, err);
    }
  }

  return NextResponse.json({ articles });
}
