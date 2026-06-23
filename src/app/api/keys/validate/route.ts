import { NextResponse } from 'next/server';
import { callLLM } from '../../ai/llm';

// 9Router public input may be "https://host/v1 sk-key" - split URL and key.
function parse9RouterPublicInput(input: string) {
  const raw = input.trim();
  const urlMatch = raw.match(/https?:\/\/\S+/);
  const url = urlMatch?.[0].replace(/\/v1\/?$/, '').replace(/\/$/, '') || '';
  const key = (urlMatch ? raw.replace(urlMatch[0], '') : raw).trim().split(/\s+/)[0] || '';
  return { url, key };
}

export async function POST(request: Request) {
  try {
    const { provider, api_key, model } = await request.json();
    if (!provider) {
      return NextResponse.json({ valid: false, message: 'Provider is required' });
    }

    const p = provider.toLowerCase().trim();
    let apiKey = api_key ? api_key.trim() : '';
    const publicInput = p === '9router-public' ? parse9RouterPublicInput(apiKey) : null;
    if (publicInput) apiKey = publicInput.key;

    if (p === '9router' && !apiKey) {
      apiKey = '9router-local-key';
    }

    if (p !== '9router-public' && p !== '9router' && (!apiKey || apiKey.length < 10)) {
      return NextResponse.json({ valid: false, message: 'API key is empty or too short' });
    }

    // Direct test call
    let testModel = model;
    let models: string[] = [];
    if (!testModel && p === '9router') {
      // ponytail: dynamically fetch first available model from local 9Router
      try {
        const res = await fetch('http://127.0.0.1:20128/v1/models');
        if (res.ok) {
          const data = await res.json();
          models = Array.isArray(data?.data) ? data.data.map((m: any) => m.id).filter(Boolean) : [];
          testModel = models[0] || '';
        }
      } catch (err) {
        console.warn('Failed to fetch dynamic 9Router models:', err);
      }
      if (!testModel) {
        throw new Error('No models/combos are currently configured or running on your local 9Router.');
      }
    } else if (!testModel && p === '9router-public') {
      // apiKey IS the tunnel URL - normalize: strip trailing /v1 so we control the path
      const tunnelUrl = (publicInput?.url || '').replace(/\/v1\/?$/, '').replace(/\/$/, '');
      if (!tunnelUrl) throw new Error('Enter 9Router public URL and API key in the same field.');
      try {
        const res = await fetch(`${tunnelUrl}/v1/models`, {
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        models = Array.isArray(data?.data) ? data.data.map((m: any) => m.id).filter(Boolean) : [];
        testModel = models[0] || '';
      } catch (err: any) {
        throw new Error(`Cannot reach 9Router at ${tunnelUrl}: ${err.message}`);
      }
      if (!testModel) {
        throw new Error('No models found at this 9Router URL. Make sure 9Router is running and has models configured.');
      }
      return NextResponse.json({
        valid: true,
        message: '9Router public URL is reachable',
        model: testModel,
        models,
      });
    } else if (!testModel) {
      testModel = '';
    }
    const usage = { totalTokens: 0 };
    const publicBaseUrl = p === '9router-public' ? (publicInput?.url || '') : undefined;
    await callLLM(p, testModel, apiKey, 'You are a test client. Answer "hi".', 'hi', false, 5, usage, publicBaseUrl);

    return NextResponse.json({
      valid: true,
      message: 'API key is valid and connected',
      tokens: usage.totalTokens,
      model: testModel,
      models,
    });
  } catch (err: any) {
    return NextResponse.json({ valid: false, message: `Validation failed: ${err.message}` });
  }
}
