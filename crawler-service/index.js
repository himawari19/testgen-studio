const express = require('express');
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '1mb' }));

const SECRET = process.env.CRAWLER_SECRET || '';
const MAX_CONCURRENT = 2;
let activeCount = 0;

function authMiddleware(req, res, next) {
  if (!SECRET) return next(); // no secret set = open (dev mode)
  const token = req.headers['x-crawler-secret'];
  if (token !== SECRET) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

app.get('/health', (_, res) => res.json({ ok: true, active: activeCount, max: MAX_CONCURRENT }));

app.post('/screenshot', authMiddleware, async (req, res) => {
  const { url, auth } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  if (activeCount >= MAX_CONCURRENT) {
    return res.status(429).json({ queued: true, active: activeCount, max: MAX_CONCURRENT });
  }
  activeCount++;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

    if (auth?.auth_type === 'basic' && auth.username) {
      const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
      await context.setExtraHTTPHeaders({ Authorization: `Basic ${encoded}` });
    }
    if (auth?.auth_type === 'bearer' && auth.token) {
      await context.setExtraHTTPHeaders({ Authorization: `Bearer ${auth.token}` });
    }
    if (auth?.auth_type === 'cookie' && auth.cookies) {
      const parsed = new URL(url);
      await context.addCookies(Object.entries(auth.cookies).map(([name, value]) => ({
        name, value: String(value), domain: parsed.hostname, path: '/',
      })));
    }

    const page = await context.newPage();
    if (auth?.auth_type === 'form' && auth.login_url && auth.form_fields) {
      await page.goto(auth.login_url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      for (const [selector, value] of Object.entries(auth.form_fields)) {
        await page.fill(selector, String(value)).catch(() => {});
      }
      await Promise.all([page.waitForNavigation({ timeout: 15000 }).catch(() => {}), page.keyboard.press('Enter')]);
    }

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const title = await page.title();
    const screenshot = await page.screenshot({ type: 'png', fullPage: false });
    await browser.close();
    browser = null;

    res.json({ title, screenshot: screenshot.toString('base64'), url });
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    activeCount--;
  }
});

app.post('/crawl', authMiddleware, async (req, res) => {
  const { url, auth } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  if (activeCount >= MAX_CONCURRENT) {
    return res.status(429).json({ queued: true, active: activeCount, max: MAX_CONCURRENT });
  }

  activeCount++;
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
  } finally {
    activeCount--;
  }
});

app.post('/run-test', authMiddleware, async (req, res) => {
  const { script_content, file_name } = req.body;
  if (!script_content) return res.status(400).json({ error: 'script_content required' });
  if (activeCount >= MAX_CONCURRENT) {
    return res.status(429).json({ queued: true, active: activeCount, max: MAX_CONCURRENT });
  }
  activeCount++;

  const runId = crypto.randomBytes(8).toString('hex');
  const tmpDir = path.join(process.cwd(), 'tmp-tests', runId);
  const safeFileName = (file_name || 'test.spec.ts').replace(/[^a-zA-Z0-9._-]/g, '_');
  const scriptPath = path.join(tmpDir, safeFileName);

  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(scriptPath, script_content, 'utf8');

    const stdout = await new Promise((resolve, reject) => {
      execFile('npx', ['playwright', 'test', scriptPath, '--reporter=json'],
        { cwd: process.cwd(), timeout: 55000, maxBuffer: 4 * 1024 * 1024 },
        (err, out) => resolve(out || ''));  // playwright exits non-zero on failures; we parse output
    });

    let report = {};
    try { report = JSON.parse(stdout); } catch { /* no-op */ }

    const stats = report.stats || {};
    const firstErr = report.suites?.[0]?.specs?.[0]?.tests?.[0]?.results?.[0]?.error?.message || null;
    res.json({
      passed:   stats.expected ?? 0,
      failed:   stats.unexpected ?? 0,
      duration: Math.round((stats.duration || 0) / 1000),
      error:    firstErr,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    activeCount--;
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Crawler service on :${PORT}`));

