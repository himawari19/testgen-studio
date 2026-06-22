import { NextResponse } from 'next/server';
import { getDB } from '../db';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const sql = getDB();
    let records;

    if (search) {
      const searchParam = '%' + search + '%';
      records = await sql`
        SELECT id, url, user_context, page_title, elements_found,
               ai_provider, ai_model, scripts_count,
               CASE
                 WHEN jsonb_array_length(COALESCE(test_cases_json,'[]')::jsonb) > 0
                 THEN jsonb_array_length(test_cases_json::jsonb)
                 ELSE GREATEST(0, array_length(string_to_array(test_case_table, E'\\n'), 1) - 2)
               END AS test_cases_count,
               created_at
        FROM history
        WHERE url ILIKE ${searchParam} OR user_context ILIKE ${searchParam} OR page_title ILIKE ${searchParam}
        ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else {
      records = await sql`
        SELECT id, url, user_context, page_title, elements_found,
               ai_provider, ai_model, scripts_count,
               CASE
                 WHEN jsonb_array_length(COALESCE(test_cases_json,'[]')::jsonb) > 0
                 THEN jsonb_array_length(test_cases_json::jsonb)
                 ELSE GREATEST(0, array_length(string_to_array(test_case_table, E'\\n'), 1) - 2)
               END AS test_cases_count,
               created_at
        FROM history
        ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    }

    return NextResponse.json({
      items: records || [],
      count: records?.length || 0
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const sql = getDB();
    // Nuke entire results folder - all generated files live there
    const resultsDir = path.resolve(process.cwd(), 'tests/results');
    try { await fs.promises.rm(resultsDir, { recursive: true, force: true }); } catch {}
    await sql`DELETE FROM history`;
    return NextResponse.json({
      success: true,
      message: 'Deleted all records'
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
