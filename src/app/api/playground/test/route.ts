import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const { url, selector } = await request.json();
    if (!url || !selector) {
      return NextResponse.json({ detail: 'URL and Selector are required' }, { status: 400 });
    }

    const res = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 30000,
      maxRedirects: 5,
    });
    const html = typeof res.data === 'string' ? res.data : String(res.data);
    const $ = cheerio.load(html);

    const matched = $(selector);
    const results: any[] = [];
    const limit = Math.min(matched.length, 20);

    matched.slice(0, limit).each((_i, el) => {
      const $el = $(el);
      const tag = (el as any).tagName?.toLowerCase() || '';
      const text = $el.text().trim().substring(0, 100);
      const id = $el.attr('id') || null;
      results.push({ tag, text, id });
    });

    return NextResponse.json({
      selector,
      matchCount: matched.length,
      elements: results,
      isUnique: matched.length === 1,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
