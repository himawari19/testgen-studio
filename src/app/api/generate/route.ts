import { NextResponse } from 'next/server';
import { crawlPage } from '../crawler';
import { analyzePage } from '../ai/analyzer';
import { getDB } from '../db';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function formatTestCaseTable(testCases: any[]): string {
  const header = "| # | Scenario | Input | Expected Result | File Name | Script Location |";
  const separator = "|---|----------|-------|-----------------|-----------|-----------------|";
  const rows = testCases.map(tc => {
    return `| ${tc.number || ''} | ${tc.scenario || ''} | ${tc.input || ''} | ${tc.expected_result || ''} | ${tc.file_name || ''} | ${tc.script_location || ''} |`;
  });
  return [header, separator, ...rows].join('\n');
}

export async function POST(request: Request) {
  try {
    const { url, user_context, ai_provider, ai_model, auth } = await request.json();
    if (!url || !user_context) {
      return NextResponse.json({ detail: 'URL and user_context are required' }, { status: 400 });
    }

    const p = (ai_provider || process.env.AI_PROVIDER || 'openai').toLowerCase().trim();
    const envMap: Record<string, string> = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      google: 'GOOGLE_API_KEY',
      groq: 'GROQ_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      moonshot: 'MOONSHOT_API_KEY',
      alibaba: 'ALIBABA_API_KEY',
    };
    const envVar = envMap[p] || 'OPENAI_API_KEY';
    const apiKey = process.env[envVar] || '';

    // Step 1: Crawl
    const pageData = await crawlPage(url, auth);
    if (pageData.elements.length === 0) {
      return NextResponse.json({
        detail: 'No interactive elements found on the page. The page might require authentication or has no forms/buttons.'
      }, { status: 400 });
    }

    // Step 2: Analyze
    const { testCases, scripts } = await analyzePage(pageData, user_context, p, ai_model, apiKey);

    // Step 3: Format and Save
    const table = formatTestCaseTable(testCases);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // ponytail: Save generated scripts locally on disk
    for (const script of scripts) {
      if (script.script_location && script.content) {
        try {
          const absolutePath = path.resolve(process.cwd(), script.script_location);
          await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
          const cleanContent = script.content.replace(/\\n/g, '\n').replace(/\\"/g, '"');
          await fs.promises.writeFile(absolutePath, cleanContent, 'utf-8');
          console.log(`Saved script to disk: ${absolutePath}`);
        } catch (fsErr) {
          console.error(`Failed to save script to disk:`, fsErr);
        }
      }
    }

    const sql = getDB();
    await sql`INSERT INTO history
       (id, url, user_context, page_title, elements_found, ai_provider, ai_model,
        test_case_table, scripts_json, scripts_count, created_at, updated_at)
       VALUES (${id}, ${url}, ${user_context}, ${pageData.title}, ${pageData.elements.length}, ${p}, ${ai_model || ''},
        ${table}, ${JSON.stringify(scripts)}, ${scripts.length}, ${now}, ${now})`;

    return NextResponse.json({
      test_case_table: table,
      scripts,
      page_title: pageData.title,
      elements_found: pageData.elements.length
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
export type { AuthConfig } from '../crawler';
