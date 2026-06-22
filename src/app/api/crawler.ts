import * as cheerio from 'cheerio';
import axios, { AxiosRequestConfig } from 'axios';

export interface DOMElement {
  tag: string;
  id: string | null;
  name: string | null;
  type: string | null;
  placeholder: string | null;
  aria_label: string | null;
  label_text: string | null;
  text_content: string | null;
  css_selector: string;
}

export interface PageData {
  title: string;
  url: string;
  elements: DOMElement[];
}

export interface AuthConfig {
  auth_type?: string;
  username?: string;
  password?: string;
  token?: string;
  cookies?: Record<string, string>;
  login_url?: string;
  form_fields?: Record<string, string>;
}

const SOCIAL_RE = /facebook\.com|twitter\.com|x\.com|linkedin\.com|instagram\.com|youtube\.com|pinterest\.com|github\.com|tiktok\.com/i;

function buildCssSelector(tag: string, el: any, $: cheerio.CheerioAPI): string {
  const $el = $(el);
  const id = $el.attr('id');
  const name = $el.attr('name');
  const testid = $el.attr('data-testid');
  const placeholder = $el.attr('placeholder');
  const type = $el.attr('type');
  if (id) return `#${id}`;
  if (name) return `${tag}[name='${name}']`;
  if (testid) return `[data-testid='${testid}']`;
  if (placeholder) return `${tag}[placeholder='${placeholder}']`;
  if (type && tag === 'input') return `input[type='${type}']`;
  return tag;
}

function extractElements($: cheerio.CheerioAPI): DOMElement[] {
  const results: DOMElement[] = [];
  const seenKeys = new Set<string>();

  $('input, button, select, textarea, a[href], [role="button"], [type="submit"]').each((_i, el) => {
    const $el = $(el);

    // ponytail: skip explicitly hidden elements (can't compute styles without a browser)
    const style = $el.attr('style') || '';
    if (/display\s*:\s*none|visibility\s*:\s*hidden/.test(style)) return;
    if ($el.attr('hidden') !== undefined) return;

    const tag = (el as any).tagName?.toLowerCase() || '';

    // skip social links
    if (tag === 'a') {
      const href = $el.attr('href') || '';
      if (SOCIAL_RE.test(href)) return;
    }

    // label lookup
    let labelText = '';
    const id = $el.attr('id') || null;
    if (id) {
      const labelEl = $(`label[for='${id}']`);
      if (labelEl.length) labelText = labelEl.text().trim();
    }
    if (!labelText) {
      const parentLabel = $el.closest('label');
      if (parentLabel.length) labelText = parentLabel.text().trim();
    }

    const textContent = ($el.text() || '').trim().substring(0, 40);
    const name = $el.attr('name') || null;
    const type = $el.attr('type') || null;
    const placeholder = $el.attr('placeholder') || null;
    const aria_label = $el.attr('aria-label') || null;
    const testid = $el.attr('data-testid') || null;
    const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';

    // filter anonymous/unidentifiable elements
    if (!id && !name && !testid && !placeholder && !aria_label && !labelText && !textContent && !isInput) return;

    const cssSelector = buildCssSelector(tag, el, $);

    const dupKey = `${cssSelector}::${textContent}`;
    if (seenKeys.has(dupKey)) return;
    seenKeys.add(dupKey);

    results.push({
      tag,
      id,
      name,
      type,
      placeholder,
      aria_label,
      label_text: labelText || null,
      text_content: textContent || null,
      css_selector: cssSelector,
    });
  });

  return results;
}

export async function crawlPage(targetURL: string, auth?: AuthConfig): Promise<PageData> {
  console.log('Crawling URL:', targetURL);

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
  const config: AxiosRequestConfig = { headers, timeout: 30000, maxRedirects: 5 };

  if (auth?.auth_type === 'bearer' && auth.token) {
    headers['Authorization'] = `Bearer ${auth.token}`;
  }

  if (auth?.auth_type === 'cookie' && auth.cookies) {
    headers['Cookie'] = Object.entries(auth.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  }

  // ponytail: basic auth via axios config
  if (auth?.auth_type === 'basic' && auth.username) {
    config.auth = { username: auth.username, password: auth.password || '' };
  }

  // form auth: POST to login URL, carry session cookies forward
  if (auth?.auth_type === 'form' && auth.login_url && auth.form_fields) {
    try {
      const params = new URLSearchParams(auth.form_fields).toString();
      const loginRes = await axios.post(auth.login_url, params, {
        headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: () => true,
      });
      const rawCookies: string | string[] | undefined = loginRes.headers['set-cookie'];
      if (rawCookies) {
        const list: string[] = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
        const cookieStr = list.map(c => c.split(';')[0]).join('; ');
        headers['Cookie'] = cookieStr;
      }
    } catch (err) {
      console.warn('Form auth failed:', err);
    }
  }

  const res = await axios.get(targetURL, config);
  const html = typeof res.data === 'string' ? res.data : String(res.data);

  const $ = cheerio.load(html);
  const title = $('title').text().trim() || 'Untitled Page';
  const elements = extractElements($);

  return { title, url: targetURL, elements };
}
