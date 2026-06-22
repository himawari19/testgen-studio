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

export function parse9RouterPublicInput(input: string) {
  const raw = input.trim();
  const urlMatch = raw.match(/https?:\/\/\S+/);
  const url = urlMatch?.[0].replace(/\/v1\/?$/, '').replace(/\/$/, '') || '';
  const key = (urlMatch ? raw.replace(urlMatch[0], '') : raw).trim().split(/\s+/)[0] || '';
  return { url, key };
}

export function loadKeys(): KeyData {
  if (IS_VERCEL) {
    return memoryData;
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
