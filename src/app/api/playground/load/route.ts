import { NextResponse } from 'next/server';
import { crawlPage } from '../../crawler';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ detail: 'URL is required' }, { status: 400 });
    }

    const pageData = await crawlPage(url);

    return NextResponse.json({
      title: pageData.title,
      url: pageData.url,
      elements_count: pageData.elements.length,
      elements: pageData.elements
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
