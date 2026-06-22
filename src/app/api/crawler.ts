import { chromium } from 'playwright';
import url from 'url';

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

function extractElements() {
    const selectors = 'input, button, select, textarea, a[href], [role="button"], [type="submit"]';
    const nodes = Array.from(document.querySelectorAll(selectors));
    const results = [];
    const seenKeys = new Set();

    for (const el of nodes) {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        // ponytail: skip social media links to cut prompt noise
        const tag = el.tagName.toLowerCase();
        if (tag === 'a') {
            const href = el.getAttribute('href');
            if (href && /facebook\.com|twitter\.com|x\.com|linkedin\.com|instagram\.com|youtube\.com|pinterest\.com|github\.com|tiktok\.com/i.test(href)) {
                continue;
            }
        }

        let labelText = '';
        if (el.id) {
            const label = document.querySelector("label[for='" + el.id + "']");
            if (label) labelText = label.textContent ? label.textContent.trim() : '';
        }
        if (!labelText) {
            const parentLabel = el.closest('label');
            if (parentLabel) labelText = parentLabel.textContent ? parentLabel.textContent.trim() : '';
        }

        const textContent = el.textContent ? el.textContent.trim().substring(0, 40) : '';

        // ponytail: filter out completely anonymous/unidentifiable elements
        const hasId = !!el.id;
        const hasName = !!el.getAttribute('name');
        const hasTestId = !!el.getAttribute('data-testid');
        const hasPlaceholder = !!el.getAttribute('placeholder');
        const hasAria = !!el.getAttribute('aria-label');
        const hasLabel = !!labelText;
        const hasText = !!textContent;
        const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';

        if (!hasId && !hasName && !hasTestId && !hasPlaceholder && !hasAria && !hasLabel && !hasText && !isInput) {
            continue;
        }

        let cssSelector = '';
        if (el.id) {
            cssSelector = "#" + el.id;
        } else if (el.getAttribute('name')) {
            cssSelector = tag + "[name='" + el.getAttribute('name') + "']";
        } else if (el.getAttribute('data-testid')) {
            cssSelector = "[data-testid='" + el.getAttribute('data-testid') + "']";
        } else if (el.getAttribute('placeholder')) {
            cssSelector = tag + "[placeholder='" + el.getAttribute('placeholder') + "']";
        } else if (el.getAttribute('type') && tag === 'input') {
            cssSelector = "input[type='" + el.getAttribute('type') + "']";
        } else {
            cssSelector = tag;
        }

        // ponytail: deduplicate exact duplicate selectors with the same text to avoid token waste
        const dupKey = cssSelector + '::' + textContent;
        if (seenKeys.has(dupKey)) continue;
        seenKeys.add(dupKey);

        results.push({
            tag,
            id: el.id || null,
            name: el.getAttribute('name') || null,
            type: el.getAttribute('type') || null,
            placeholder: el.getAttribute('placeholder') || null,
            aria_label: el.getAttribute('aria-label') || null,
            label_text: labelText || null,
            text_content: textContent || null,
            css_selector: cssSelector
        });
    }

    return results;
}

export async function crawlPage(targetURL: string, auth?: AuthConfig): Promise<PageData> {
  console.log('Crawling URL:', targetURL);

  const browser = await chromium.launch({ headless: true });
  try {
    const contextOptions: any = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    // Basic Auth
    if (auth?.auth_type === 'basic') {
      contextOptions.httpCredentials = {
        username: auth.username || '',
        password: auth.password || ''
      };
    }

    const context = await browser.newContext(contextOptions);

    // Bearer Token
    if (auth?.auth_type === 'bearer' && auth.token) {
      await context.setExtraHTTPHeaders({
        Authorization: `Bearer ${auth.token}`
      });
    }

    // Cookies
    if (auth?.auth_type === 'cookie' && auth.cookies) {
      const parsedURL = url.parse(targetURL);
      const cookiesList = Object.entries(auth.cookies).map(([name, value]) => ({
        name,
        value,
        domain: parsedURL.hostname || '',
        path: '/'
      }));
      await context.addCookies(cookiesList);
    }

    const page = await context.newPage();

    // Form Auth
    if (auth?.auth_type === 'form' && auth.login_url) {
      try {
        console.log('Executing Form Login at:', auth.login_url);
        await page.goto(auth.login_url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        if (auth.form_fields) {
          for (const [selector, value] of Object.entries(auth.form_fields)) {
            await page.fill(selector, value);
          }
        }
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle').catch(() => {});
      } catch (err) {
        console.warn('Form auth failed:', err);
      }
    }

    // Go to target
    await page.goto(targetURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});

    const title = (await page.title()) || 'Untitled Page';
    const elements = await page.evaluate(extractElements) as DOMElement[];

    return {
      title,
      url: targetURL,
      elements
    };
  } finally {
    await browser.close();
  }
}
