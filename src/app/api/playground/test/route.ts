import { NextResponse } from 'next/server';
import axios from 'axios';
import { attr, parseHTML, selectAll, tagName, text } from '../../html';

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
    const root = parseHTML(html);

    const matched = selectAll(root, selector);
    const results: any[] = [];
    const limit = Math.min(matched.length, 20);

    for (const el of matched.slice(0, limit)) {
      results.push({
        tag: tagName(el),
        text: text(el).substring(0, 100),
        id: attr(el, 'id') || null,
      });
    }

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
