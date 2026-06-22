import { NextResponse } from 'next/server';
import { loadKeys, saveKeys } from '../keys/store';
import { callLLM } from '../ai/llm';

export async function GET() {
  const currentProvider = process.env.AI_PROVIDER || 'groq';
  const currentModel = process.env.AI_MODEL || 'llama-3.3-70b-versatile';

  const availableModels: Record<string, string[]> = {
    openai: ['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'o3-mini', 'o1', 'o1-mini', 'gpt-4o', 'gpt-4o-mini'],
    anthropic: ['claude-fable-5', 'claude-opus-4.8', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
    google: ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite-preview', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'meta-llama/llama-4-scout-17b-16e-instruct', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'moonshotai/kimi-k2-instruct', 'qwen/qwen3-32b', 'deepseek-r1-distill-llama-70b', 'gemma2-9b-it'],
    deepseek: ['deepseek-chat', 'deepseek-reasoner'],
    moonshot: ['kimi-k2.6'],
    alibaba: ['qwen3.6-flash', 'qwen3.6-plus'],
    '9router': ['gpt-4o', 'claude-3-5-sonnet', 'deepseek-chat'],
    '9router-public': [],
  };

  const labels: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google Gemini',
    groq: 'Groq',
    deepseek: 'DeepSeek',
    moonshot: 'Moonshot (Kimi)',
    alibaba: 'Alibaba (Qwen)',
    '9router': '9Router (Local)',
    '9router-public': '9Router (Public)',
  };

  const envKeys: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_API_KEY',
    groq: 'GROQ_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    moonshot: 'MOONSHOT_API_KEY',
    alibaba: 'ALIBABA_API_KEY',
  };

  const runtimeData = loadKeys();
  const statusMap: Record<string, string> = {};
  let runtimeKeysUpdated = false;

  // ponytail: Helper to ping/verify credentials with a timeout
  const validateKeyPromise = async (provider: string, apiKey: string) => {
    const defaultModels: Record<string, string> = {
      openai: 'gpt-4o-mini',
      anthropic: 'claude-3-5-haiku-20241022',
      google: 'gemini-1.5-flash',
      groq: 'llama-3.1-8b-instant',
      deepseek: 'deepseek-chat',
      moonshot: 'kimi-k2.6',
      alibaba: 'qwen3.6-flash',
    };
    const model = defaultModels[provider] || '';
    
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Validation timeout')), 2500);
    });

    try {
      await Promise.race([
        callLLM(provider, model, apiKey, 'QA', 'hi', false, 2),
        timeoutPromise
      ]);
      clearTimeout(timer!);
      return true;
    } catch (e) {
      clearTimeout(timer!);
      console.warn(`Key verification failed for ${provider}:`, e);
      return false;
    }
  };

  const validationPromises = Object.entries(envKeys).map(async ([p, envVar]) => {
    const key = runtimeData.keys[p] || process.env[envVar] || '';
    if (key.length > 10) {
      const isValidated = runtimeData.validated.includes(p);
      if (isValidated) {
        statusMap[p] = 'connected';
      } else {
        const ok = await validateKeyPromise(p, key);
        if (ok) {
          statusMap[p] = 'connected';
          if (!runtimeData.validated.includes(p)) {
            runtimeData.validated.push(p);
            runtimeKeysUpdated = true;
          }
        } else {
          statusMap[p] = 'has_key';
        }
      }
    } else {
      statusMap[p] = 'disconnected';
    }
  });

  await Promise.all(validationPromises);

  if (runtimeKeysUpdated) {
    saveKeys(runtimeData);
  }

  // ponytail: Dynamically validate 9Router (local + public) and fetch models with a safe timeout
  const ping9Router = async (baseUrl: string, key: string, apiKey = '') => {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 3000);
    try {
      const res = await fetch(`${baseUrl}/v1/models`, {
        signal: ctrl.signal,
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      });
      clearTimeout(tid);
      if (!res.ok) return 'disconnected';
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        const fetched = data.data.map((m: any) => m.id);
        if (fetched.length > 0) availableModels[key] = fetched;
      }
      return 'connected';
    } catch {
      clearTimeout(tid);
      return 'disconnected';
    }
  };

  statusMap['9router'] = await ping9Router('http://127.0.0.1:20128', '9router');

  const publicUrl = (runtimeData.urls?.['9router-public'] || process.env.NINE_ROUTER_PUBLIC_URL || '')
    .replace(/\/v1\/?$/, '').replace(/\/$/, '');
  const publicKey = runtimeData.keys['9router-public'] || process.env.NINE_ROUTER_PUBLIC_API_KEY || '';
  statusMap['9router-public'] = publicUrl
    ? await ping9Router(publicUrl, '9router-public', publicKey)
    : 'disconnected';

  const configured: Record<string, boolean> = {};
  for (const [p, st] of Object.entries(statusMap)) {
    configured[p] = st === 'connected';
  }

  return NextResponse.json({
    providers: availableModels,
    configured,
    status: statusMap,
    labels,
    current_provider: currentProvider,
    current_model: currentModel,
  });
}
