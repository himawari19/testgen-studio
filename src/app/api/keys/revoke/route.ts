import { NextResponse } from 'next/server';
import { loadKeys, saveKeys } from '../store';

export async function POST(request: Request) {
  try {
    const { provider } = await request.json();
    if (!provider) {
      return NextResponse.json({ success: false, detail: 'Provider is required' }, { status: 400 });
    }

    const p = provider.toLowerCase().trim();

    const data = loadKeys();
    delete data.keys[p];
    data.validated = data.validated.filter(item => item !== p);

    saveKeys(data);

    // Revoke from process.env immediately
    const envMap: Record<string, string> = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      google: 'GOOGLE_API_KEY',
      groq: 'GROQ_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      moonshot: 'MOONSHOT_API_KEY',
      alibaba: 'ALIBABA_API_KEY',
    };
    if (envMap[p]) {
      process.env[envMap[p]] = '';
    }

    return NextResponse.json({
      success: true,
      message: `API key for ${provider} revoked`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, detail: err.message }, { status: 500 });
  }
}
