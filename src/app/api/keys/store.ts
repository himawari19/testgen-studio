import fs from 'fs';
import path from 'path';

const storePath = path.join(process.cwd(), '.runtime_keys.json');

interface KeyData {
  keys: Record<string, string>;
  validated: string[];
}

export function loadKeys(): KeyData {
  if (!fs.existsSync(storePath)) {
    return { keys: {}, validated: [] };
  }
  try {
    const content = fs.readFileSync(storePath, 'utf8');
    return JSON.parse(content) as KeyData;
  } catch {
    return { keys: {}, validated: [] };
  }
}

export function saveKeys(data: KeyData) {
  try {
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write keys to disk:', err);
  }
}

export function applyKeysToEnv() {
  const data = loadKeys();
  const envMap: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_API_KEY',
    groq: 'GROQ_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    moonshot: 'MOONSHOT_API_KEY',
    alibaba: 'ALIBABA_API_KEY',
  };
  for (const [provider, key] of Object.entries(data.keys)) {
    const envVar = envMap[provider];
    if (envVar && key) {
      process.env[envVar] = key;
    }
  }
}
