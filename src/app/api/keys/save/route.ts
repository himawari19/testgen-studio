import { NextResponse } from 'next/server';
import { loadKeys, parse9RouterPublicInput, saveKeys } from '../store';

export async function POST(request: Request) {
  try {
    const { provider, api_key } = await request.json();
    if (!provider || !api_key) {
      return NextResponse.json({ success: false, detail: 'Provider and API Key are required' }, { status: 400 });
    }

    const p = provider.toLowerCase().trim();
    const parsed = p === '9router-public' ? parse9RouterPublicInput(api_key) : null;
    const key = p === '9router-public' ? (parsed?.key || '') : api_key.trim();

    const data = loadKeys();
    data.keys[p] = key;
    if (parsed?.url) {
      data.urls = { ...(data.urls || {}), [p]: parsed.url };
    }
    if (!data.validated.includes(p)) {
      data.validated.push(p);
    }

    saveKeys(data);

    return NextResponse.json({
      success: true,
      message: `API key for ${provider} saved successfully`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, detail: err.message }, { status: 500 });
  }
}
