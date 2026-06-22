import fs from 'fs';
import path from 'path';

const IS_VERCEL = !!process.env.VERCEL;
const storePath = path.join(process.cwd(), '.runtime_keys.json');

interface KeyData {
  keys: Record<string, string>;
  validated: string[];
}

const ENV_MAP: Record<string, string> = {
  openai:    'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google:    'GOOGLE_API_KEY',
  groq:      'GROQ_API_KEY',
  deepseek:  'DEEPSEEK_API_KEY',
  moonshot:  'MOONSHOT_API_KEY',
  alibaba:   'ALIBABA_API_KEY',
};

export function loadKeys(): KeyData {
  // On Vercel: read directly from environment variables
  if (IS_VERCEL) {
    const keys: Record<string, string> = {};
    const validated: string[] = [];
    for (const [provider, envVar] of Object.entries(ENV_MAP)) {
      const val = process.env[envVar];
      if (val) { keys[provider] = val; validated.push(provider); }
    }
    return { keys, validated };
  }
  // Local: read from file
  if (!fs.existsSync(storePath)) return { keys: {}, validated: [] };
  try {
    return JSON.parse(fs.readFileSync(storePath, 'utf8')) as KeyData;
  } catch {
    return { keys: {}, validated: [] };
  }
}

export function saveKeys(data: KeyData) {
  if (IS_VERCEL) return; // read-only filesystem on Vercel — keys come from env vars
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
