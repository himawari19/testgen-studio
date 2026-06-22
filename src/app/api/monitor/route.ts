import { NextResponse } from 'next/server';
import { getDB } from '../db';
import { crawlPage } from '../crawler';
import crypto from 'crypto';

export async function GET() {
  try {
    const sql = getDB();
    const items = await sql`
      SELECT id, url, last_checked, selectors_total, selectors_broken, status, created_at
      FROM monitored_urls ORDER BY created_at DESC`;
    return NextResponse.json({ items: items || [] });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ detail: 'URL is required' }, { status: 400 });
    }

    const pageData = await crawlPage(url);
    const selectors = pageData.elements.map(el => ({
      css_selector: el.css_selector,
      tag: el.tag,
      id: el.id,
      name: el.name
    }));

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const selectorsJSON = JSON.stringify(selectors);

    const sql = getDB();
    await sql`
      INSERT INTO monitored_urls
       (id, url, last_checked, selectors_json, selectors_total, selectors_broken, status, created_at, updated_at)
       VALUES (${id}, ${url}, ${now}, ${selectorsJSON}, ${selectors.length}, ${0}, ${'healthy'}, ${now}, ${now})
       ON CONFLICT (url) DO UPDATE
         SET last_checked = EXCLUDED.last_checked,
             selectors_json = EXCLUDED.selectors_json,
             selectors_total = EXCLUDED.selectors_total,
             selectors_broken = EXCLUDED.selectors_broken,
             status = EXCLUDED.status,
             updated_at = EXCLUDED.updated_at`;

    return NextResponse.json({
      success: true,
      id,
      title: pageData.title,
      selectors_total: selectors.length
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
