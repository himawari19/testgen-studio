// Client-side API key storage. Keys live in the browser only - never sent to
// our server for storage, only forwarded per-request to the AI provider.
const STORE = "testgen_api_keys";

type KeyMap = Record<string, string>;

function read(): KeyMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORE) || "{}");
  } catch {
    return {};
  }
}

export function getApiKey(provider: string): string {
  return read()[provider] || "";
}

export function getAllKeys(): KeyMap {
  return read();
}

export function setApiKey(provider: string, key: string) {
  const map = read();
  map[provider] = key;
  localStorage.setItem(STORE, JSON.stringify(map));
}

export function removeApiKey(provider: string) {
  const map = read();
  delete map[provider];
  localStorage.setItem(STORE, JSON.stringify(map));
}
