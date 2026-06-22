import { NextResponse } from 'next/server';
import { callLLM } from '../../ai/llm';
import { loadKeys } from '../store';

export async function POST(request: Request) {
  try {
    const { provider, api_key, model } = await request.json();
    if (!provider) {
      return NextResponse.json({ valid: false, message: 'Provider is required' });
    }

    const p = provider.toLowerCase().trim();
    let apiKey = api_key ? api_key.trim() : '';

    if (!apiKey) {
      if (p === '9router') {
        apiKey = '9router-local-key';
      } else {
        // ponytail: Fallback to loading existing key from store or environment
        const runtimeData = loadKeys();
        const envKeys: Record<string, string> = {
          openai: 'OPENAI_API_KEY',
          anthropic: 'ANTHROPIC_API_KEY',
          google: 'GOOGLE_API_KEY',
          groq: 'GROQ_API_KEY',
          deepseek: 'DEEPSEEK_API_KEY',
          moonshot: 'MOONSHOT_API_KEY',
          alibaba: 'ALIBABA_API_KEY',
        };
        apiKey = runtimeData.keys[p] || process.env[envKeys[p]] || '';
      }
    }

    if (!apiKey || apiKey.length < 10) {
      return NextResponse.json({ valid: false, message: 'API key is empty or too short' });
    }

    // Direct test call
    let testModel = model;
    if (!testModel && p === '9router') {
      // ponytail: dynamically fetch first available model from local 9Router config to avoid hardcoding fallback
      try {
        const res = await fetch('http://127.0.0.1:20128/v1/models');
        if (res.ok) {
          const data = await res.json();
          testModel = data?.data?.[0]?.id || '';
        }
      } catch (err) {
        console.warn('Failed to fetch dynamic 9Router models:', err);
      }
      if (!testModel) {
        throw new Error('No models/combos are currently configured or running on your local 9Router.');
      }
    } else if (!testModel) {
      testModel = '';
    }
    const usage = { totalTokens: 0 };
    await callLLM(p, testModel, apiKey, 'You are a test client. Answer "hi".', 'hi', false, 5, usage);

    return NextResponse.json({ 
      valid: true, 
      message: 'API key is valid and connected',
      tokens: usage.totalTokens 
    });
  } catch (err: any) {
    return NextResponse.json({ valid: false, message: `Validation failed: ${err.message}` });
  }
}
