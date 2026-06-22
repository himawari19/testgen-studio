import fs from 'fs';
import path from 'path';

const IS_VERCEL = !!process.env.VERCEL;
const storePath = path.join(process.cwd(), '.runtime_keys.json');

interface KeyData {
  keys: Record<string, string>;
  urls?: Record<string, string>;
  validated: string[];
}

let memoryData: KeyData = { keys: {}, urls: {}, validated: [] };

const ENV_MAP: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  groq: 'GROQ_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  moonshot: 'MOONSHOT_API_KEY',
  alibaba: 'ALIBABA_API_KEY',
  '9router-public': 'NINE_ROUTER_PUBLIC_API_KEY',
};

export function parse9RouterPublicInput(input: string) {
  const raw = input.trim();
  const urlMatch = raw.match(/https?:\/\/\S+/);
  const url = urlMatch?.[0].replace(/\/v1\/?$/, '').replace(/\/$/, '') || '';
  const key = (urlMatch ? raw.replace(urlMatch[0], '') : raw).trim().split(/\s+/)[0] || '';
  return { url, key };
}

export function loadKeys(): KeyData {
  if (IS_VERCEL) {
    const keys: Record<string, string> = { ...memoryData.keys };
    const urls: Record<string, string> = { ...(memoryData.urls || {}) };
    const validated = [...memoryData.validated];

    for (const [provider, envVar] of Object.entries(ENV_MAP)) {
      const val = process.env[envVar];
      if (val) {
        keys[provider] = val;
        validated.push(provider);
      }
    }
    if (process.env.NINE_ROUTER_PUBLIC_URL) urls['9router-public'] = process.env.NINE_ROUTER_PUBLIC_URL;
    return { keys, urls, validated: Array.from(new Set(validated)) };
  }

  if (!fs.existsSync(storePath)) return { keys: {}, urls: {}, validated: [] };
  try {
    return JSON.parse(fs.readFileSync(storePath, 'utf8')) as KeyData;
  } catch {
    return { keys: {}, urls: {}, validated: [] };
  }
}

export function saveKeys(data: KeyData) {
  if (IS_VERCEL) {
    memoryData = data;
    return;
  }
  try {
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write keys to disk:', err);
  }
}

export function applyKeysToEnv() {
  const data = loadKeys();
  for (const [provider, key] of Object.entries(data.keys)) {
    const envVar = ENV_MAP[provider];
    if (envVar && key) process.env[envVar] = key;
  }
}
