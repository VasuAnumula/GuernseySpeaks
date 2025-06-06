import { NextResponse } from 'next/server';

const GP_URL = 'https://guernseypress.com';
const BE_URL = 'https://www.bailiwickexpress.com/bailiwickexpress-guernsey-edition/';

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url);
  return await res.text();
}

function extractLinks(html: string, base: string, limit = 5) {
  const results: { title: string; url: string }[] = [];
  const anchorRegex = /<a[^>]+href="(\/[^"#]+)"[^>]*>([^<]{5,120})<\/a>/gi;
  const seen = new Set();
  let match: RegExpExecArray | null;
  while ((match = anchorRegex.exec(html)) && results.length < limit) {
    const href = match[1];
    const text = match[2].replace(/\s+/g, ' ').trim();
    if (seen.has(text)) continue;
    seen.add(text);
    results.push({ title: text, url: new URL(href, base).href });
  }
  return results;
}

export async function GET() {
  try {
    const [gpHtml, beHtml] = await Promise.all([fetchHtml(GP_URL), fetchHtml(BE_URL)]);
    const gpNews = extractLinks(gpHtml, GP_URL).map(n => ({ ...n, source: 'Guernsey Press' }));
    const beNews = extractLinks(beHtml, BE_URL).map(n => ({ ...n, source: 'Bailiwick Express' }));
    return NextResponse.json([...gpNews, ...beNews]);
  } catch (e: any) {
    console.error('Failed to scrape news:', e);
    return new NextResponse('Failed to fetch news', { status: 500 });
  }
}
