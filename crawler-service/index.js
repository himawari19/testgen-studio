const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json({ limit: '1mb' }));

const SECRET = process.env.CRAWLER_SECRET || '';

function authMiddleware(req, res, next) {
  if (!SECRET) return next(); // no secret set = open (dev mode)
  const token = req.headers['x-crawler-secret'];
  if (token !== SECRET) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

app.get('/health', (_, res) => res.json({ ok: true }));

app.post('/crawl', authMiddleware, async (req, res) => {
  const { url, auth } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const contextOptions = {};

    // Basic auth via HTTP header
    if (auth?.auth_type === 'basic' && auth.username && auth.password) {
      const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
      contextOptions.extraHTTPHeaders = { Authorization: `Basic ${encoded}` };
    }

    // Bearer token
    if (auth?.auth_type === 'bearer' && auth.token) {
      contextOptions.extraHTTPHeaders = { Authorization: `Bearer ${auth.token}` };
    }

    const context = await browser.newContext(contextOptions);

    // Cookie auth
    if (auth?.auth_type === 'cookie' && auth.cookies) {
      const parsed = new URL(url);
      const cookieList = Object.entries(auth.cookies).map(([name, value]) => ({
        name, value: String(value),
        domain: parsed.hostname,
        path: '/',
      }));
      await context.addCookies(cookieList);
    }

    const page = await context.newPage();

    // Form login: navigate to login page, fill and submit, then go to target URL
    if (auth?.auth_type === 'form' && auth.login_url && auth.form_fields) {
      await page.goto(auth.login_url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      for (const [selector, value] of Object.entries(auth.form_fields)) {
        await page.fill(selector, String(value)).catch(() => {});
      }
      await Promise.all([
        page.waitForNavigation({ timeout: 15000 }).catch(() => {}),
        page.keyboard.press('Enter'),
      ]);
    }

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait a bit for any lazy-loaded content
    await page.waitForTimeout(1000);

    const title = await page.title();

    // Extract ONLY visible interactive elements using real browser visibility
    const elements = await page.evaluate(() => {
      const SELECTORS = [
        'a[href]', 'button', 'input:not([type="hidden"])', 'select', 'textarea',
        '[role="button"]', '[role="link"]', '[role="checkbox"]', '[role="radio"]',
        '[role="tab"]', '[role="menuitem"]', '[onclick]',
      ];

      function isVisible(el) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          rect.width > 0 &&
          rect.height > 0 &&
          !el.hasAttribute('hidden') &&
          el.getAttribute('aria-hidden') !== 'true'
        );
      }

      const seen = new Set();
      const results = [];

      for (const selector of SELECTORS) {
        for (const el of document.querySelectorAll(selector)) {
          if (!isVisible(el)) continue;
          // deduplicate by text+tag+type
          const key = `${el.tagName}|${el.getAttribute('type')}|${el.textContent?.trim().slice(0, 50)}|${el.getAttribute('href')}`;
          if (seen.has(key)) continue;
          seen.add(key);

          results.push({
            tag: el.tagName.toLowerCase(),
            type: el.getAttribute('type') || '',
            text: el.textContent?.trim().substring(0, 120) || '',
            placeholder: el.getAttribute('placeholder') || '',
            name: el.getAttribute('name') || '',
            id: el.getAttribute('id') || '',
            href: el.getAttribute('href') || '',
            'aria-label': el.getAttribute('aria-label') || '',
            role: el.getAttribute('role') || '',
            class: el.className?.toString().substring(0, 60) || '',
          });
        }
      }
      return results;
    });

    await browser.close();
    browser = null;

    res.json({ title, elements, url, source: 'playwright' });
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Crawler service on :${PORT}`));
