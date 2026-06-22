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
    const key = parsed?.key || api_key.trim();

    const data = loadKeys();
    data.keys[p] = key;
    if (parsed?.url) {
      data.urls = { ...(data.urls || {}), [p]: parsed.url };
      process.env.NINE_ROUTER_PUBLIC_URL = parsed.url;
    }
    if (!data.validated.includes(p)) {
      data.validated.push(p);
    }

    saveKeys(data);

    // Apply to process.env immediately
    const envMap: Record<string, string> = {
      openai:           'OPENAI_API_KEY',
      anthropic:        'ANTHROPIC_API_KEY',
      google:           'GOOGLE_API_KEY',
      groq:             'GROQ_API_KEY',
      deepseek:         'DEEPSEEK_API_KEY',
      moonshot:         'MOONSHOT_API_KEY',
      alibaba:          'ALIBABA_API_KEY',
      '9router-public': 'NINE_ROUTER_PUBLIC_API_KEY',
    };
    if (envMap[p]) {
      process.env[envMap[p]] = key;
    }

    return NextResponse.json({
      success: true,
      message: `API key for ${provider} saved successfully`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, detail: err.message }, { status: 500 });
  }
}
