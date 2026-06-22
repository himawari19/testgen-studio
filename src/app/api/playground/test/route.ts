import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

export async function POST(request: Request) {
  try {
    const { url, selector } = await request.json();
    if (!url || !selector) {
      return NextResponse.json({ detail: 'URL and Selector are required' }, { status: 400 });
    }

    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle').catch(() => {});

      const elements = await page.$$(selector);
      const results: any[] = [];
      const limit = Math.min(elements.length, 20);

      for (let i = 0; i < limit; i++) {
        const el = elements[i];
        const tag = (await el.evaluate(node => node.tagName.toLowerCase())) || '';
        let text = (await el.evaluate(node => node.textContent || '')) || '';
        text = text.trim();
        if (text.length > 100) {
          text = text.substring(0, 100);
        }
        const id = (await el.evaluate(node => node.id || null)) || null;

        results.push({ tag, text, id });
      }

      return NextResponse.json({
        selector,
        matchCount: elements.length,
        elements: results,
        isUnique: elements.length === 1
      });
    } finally {
      await browser.close();
    }
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
