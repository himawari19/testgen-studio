import { NextResponse } from 'next/server';
import { crawlPage, PageData } from '../../crawler';
import { generateTestCases, generateScriptForTestCase, getFastModel, getFileExtension } from '../../ai/analyzer';
import { getDB, ensureSchema } from '../../db';
import { auth as getSession } from '@/auth';
import crypto from 'crypto';

// ponytail: in-memory DOM cache keyed by URL, TTL 10 menit
const domCache = new Map<string, { data: PageData; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function getCachedPage(url: string): PageData | null {
  const entry = domCache.get(url);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { domCache.delete(url); return null; }
  return entry.data;
}

function setCachedPage(url: string, data: PageData) {
  domCache.set(url, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

function deriveFields(tc: any, url: string, caseSlug: string, framework: string, language: string) {
  const s = (tc.scenario || '').toLowerCase();

  let type = 'POSITIVE';
  if (/invalid|wrong|incorrect|fail|error|empty|blank|missing|404|forbidden|unauthorized|reject/.test(s)) type = 'NEGATIVE';
  else if (/security|sql.inject|xss|csrf|privilege|bypass/.test(s)) type = 'SECURITY';
  else if (/boundary|limit|max|min|overflow|exact/.test(s)) type = 'BOUNDARY';
  else if (/edge|unusual|unexpected|corner/.test(s)) type = 'EDGE';

  let priority = 'MEDIUM';
  if (/login|auth|payment|checkout|password|register/.test(s)) priority = 'CRITICAL';
  else if (/submit|save|create|delete|update|search|upload/.test(s)) priority = 'HIGH';
  else if (/display|style|layout|hover|tooltip|visual/.test(s)) priority = 'LOW';

  const name = (tc.scenario || `Test Case ${tc.number}`)
    .replace(/\b(\w)/g, (c: string) => c.toUpperCase())
    .substring(0, 80);

  const pre_condition = type === 'SECURITY'
    ? 'Browser is open, developer tools available, application is accessible'
    : 'Browser is open, application URL is accessible';

  const test_steps = [
    `Open ${url}`,
    tc.scenario || 'Perform the test action',
    `Verify: ${tc.expected_result || 'Expected behavior occurs'}`,
  ];

  const slug = (tc.scenario || `test-${tc.number}`)
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 40);
  const ext = getFileExtension(framework, language);
  const file_name = `${caseSlug}-${slug}${ext}`;
  const script_location = `tests/${caseSlug}/${file_name}`;

  return { ...tc, type, priority, name, pre_condition, test_steps, file_name, script_location };
}

function getCaseId(tc: any, index: number): string {
  const prefix = (tc.file_name || 'TST').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'TST';
  return `${prefix}-${String(index + 1).padStart(3, '0')}`;
}

function formatTestCaseTable(testCases: any[]): string {
  const header = "| # | Test Case ID | Test Case Name | Type | Pre Condition | Test Steps | Expected Result | Actual Result | Status | Priority | Evidence |";
  const separator = "|---|---|---|---|---|---|---|---|---|---|---|";
  const rows = testCases.map((tc, i) => {
    const steps = Array.isArray(tc.test_steps) ? tc.test_steps.map((s: string, n: number) => `${n + 1}. ${s}`).join('<br>') : (tc.input || '');
    return `| ${tc.number || i + 1} | ${getCaseId(tc, i)} | ${tc.name || tc.scenario || ''} | ${tc.type || ''} | ${tc.pre_condition || ''} | ${steps} | ${tc.expected_result || ''} | - | - | ${tc.priority || ''} | - |`;
  });
  return [header, separator, ...rows].join('\n');
}

export async function POST(request: Request) {
  try {
    const { url, user_context, ai_provider, ai_model, api_key, auth, framework, language, fast_mode, generation_mode, output_mode, nine_router_public_url, nine_router_public_key } = await request.json();
    const session = await getSession();
    const userId = session?.user?.email || null;
    const modeMinTC: Record<string, number> = { quick: 10, standard: 30, thorough: 50 };
    const minTestCases = modeMinTC[generation_mode] ?? 10;
    const now = new Date();
    const runTs = `${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}${now.getFullYear()}`;
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, '').split('.').slice(0, -1).join('-');
    const pathPart = parsed.pathname.replace(/\//g, '-').replace(/^-|-$/g, '');
    const runSlug = [domain, pathPart].filter(Boolean).join('-');
    const runFolder = `tests/results/${runSlug}-${runTs}`;
    const encoder = new TextEncoder();

    const customStream = new ReadableStream({
      async start(controller) {
        const sendEvent = (step: string, message: string, extra: Record<string, any> = {}) => {
          const payload = JSON.stringify({ step, message, ...extra });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        };

        try {
          const p = (ai_provider || 'openai').toLowerCase().trim();
          const publicBaseUrl = p === '9router-public'
            ? String(nine_router_public_url || '').replace(/\/v1\/?$/, '').replace(/\/$/, '')
            : '';
          // ponytail: keys are client-side only - sent per request, never stored server-side
          const apiKey = p === '9router' ? '9router-local-key'
            : p === '9router-public' ? (nine_router_public_key || '')
            : (api_key || '');

          // cases-only = planning only, fast model is sufficient; fast_mode also forces fast model
          const stage1Model = (fast_mode || output_mode === 'cases') ? getFastModel(p, ai_model || '') : (ai_model || '');

          // Step 1: Crawl (use cache if available)
          const cached = getCachedPage(url);
          let pageData: PageData;
          if (cached) {
            sendEvent('crawling', 'Loading page data from cache...');
            pageData = cached;
            sendEvent('crawled', `Cache hit: ${pageData.elements.length} elements found`, {
              elements_found: pageData.elements.length,
              page_title: pageData.title,
              from_cache: true
            });
          } else {
            sendEvent('crawling', 'Crawling page and extracting elements...');
            pageData = await crawlPage(url, auth);
            if (!pageData.elements || pageData.elements.length === 0) {
              sendEvent('error', 'No interactive elements found. This page may render its content with JavaScript (SPA), which static crawling cannot read - try a server-rendered page or the page that holds the actual form.');
              controller.close();
              return;
            }
            setCachedPage(url, pageData);
            sendEvent('crawled', `Found ${pageData.elements.length} interactive elements`, {
              elements_found: pageData.elements.length,
              page_title: pageData.title,
              from_cache: false
            });
          }

          // Default context from page title/URL if user left it blank
          const effectiveContext = (user_context || '').trim() ||
            `Test all interactive elements and key user flows on this page: ${pageData.title || url}`;

          // Step 2: AI Generate Test Cases (Stage 1)
          sendEvent('analyzing', 'AI is generating test cases...');
          const { testCases: rawTestCases, tokens: tcTokens } = await generateTestCases(
            pageData,
            effectiveContext,
            p,
            stage1Model,
            apiKey,
            '',
            minTestCases,
            publicBaseUrl
          );
          const testCases = rawTestCases.map((tc: any) => deriveFields(tc, url, runSlug, framework || 'playwright', language || 'typescript'));

          sendEvent('analyzed', `${testCases.length} test cases generated.`);

          const table = formatTestCaseTable(testCases);
          // 'scripts' mode: skip showing TC table to user
          if (output_mode !== 'scripts') {
            sendEvent('table', 'Test cases ready!', {
              test_cases: testCases,
              test_case_table: table,
              page_title: pageData.title,
              elements_found: pageData.elements.length
            });
          }

          // 'cases' mode: stop here, no script generation
          let totalTokens = tcTokens;
          const scripts: any[] = [];

          if (output_mode !== 'cases') {
            // Step 3: AI Generate Scripts (Stage 2 - Parallel)
            let completedCount = 0;

            const runWithConcurrencyLimit = async (limit: number, items: any[], fn: (item: any) => Promise<any>) => {
              const executing = new Set<Promise<any>>();
              const results: Promise<any>[] = [];
              for (const item of items) {
                const pr = Promise.resolve().then(() => fn(item));
                results.push(pr);
                executing.add(pr);
                const clean = () => executing.delete(pr);
                pr.then(clean, clean);
                if (executing.size >= limit) await Promise.race(executing);
              }
              return Promise.all(results);
            };

            const processTestCase = async (tc: any) => {
              sendEvent('formatting', `Generating script ${tc.number}/${testCases.length}...`);
              const script = await generateScriptForTestCase(
                pageData, effectiveContext, p, ai_model || '', apiKey,
                tc, framework || 'playwright', language || 'typescript',
                publicBaseUrl
              );
              if (script.file_name) script.script_location = `${runFolder}/${script.file_name}`;
              totalTokens += script.tokens_used || 0;
              completedCount++;
              sendEvent('script_complete', `Script ${completedCount}/${testCases.length} done`, {
                script, completed: completedCount, total: testCases.length
              });
              scripts.push(script);
            };

            await runWithConcurrencyLimit(8, testCases, processTestCase);
          }

          const id = crypto.randomUUID();
          const now = new Date().toISOString();

          // Only persist history for signed-in users (guests can generate but nothing is saved)
          if (userId) {
            await ensureSchema();
            const sql = getDB();
            await sql`INSERT INTO history
               (id, url, user_context, page_title, elements_found, ai_provider, ai_model,
                test_case_table, test_cases_json, scripts_json, scripts_count, created_at, updated_at, user_id)
               VALUES (${id}, ${url}, ${effectiveContext}, ${pageData.title}, ${pageData.elements.length}, ${p}, ${ai_model || ''},
                ${table}, ${JSON.stringify(testCases)}, ${JSON.stringify(scripts)}, ${scripts.length}, ${now}, ${now}, ${userId})`;
          }

          sendEvent('complete', 'Generation complete!', {
            result: {
              url,
              history_id: userId ? id : undefined,
              test_case_table: table,
              scripts,
              test_cases: testCases,
              page_title: pageData.title,
              elements_found: pageData.elements.length,
              tokens_used: totalTokens
            }
          });
          controller.close();
        } catch (err: any) {
          sendEvent('error', err.message);
          controller.close();
        }
      }
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
