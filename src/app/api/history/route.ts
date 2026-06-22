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

    const db = await getDB();
    let records;

    if (search) {
      const searchParam = `%${search}%`;
      records = await db.all(
        `SELECT id, url, user_context, page_title, elements_found,
                ai_provider, ai_model, scripts_count,
                CASE
                  WHEN json_array_length(COALESCE(test_cases_json,'[]')) > 0
                  THEN json_array_length(test_cases_json)
                  ELSE MAX(0, length(test_case_table) - length(replace(test_case_table, char(10), '')) - 1)
                END AS test_cases_count,
                created_at
         FROM history
         WHERE url LIKE ? OR user_context LIKE ? OR page_title LIKE ?
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [searchParam, searchParam, searchParam, limit, offset]
      );
    } else {
      records = await db.all(
        `SELECT id, url, user_context, page_title, elements_found,
                ai_provider, ai_model, scripts_count,
                CASE
                  WHEN json_array_length(COALESCE(test_cases_json,'[]')) > 0
                  THEN json_array_length(test_cases_json)
                  ELSE MAX(0, length(test_case_table) - length(replace(test_case_table, char(10), '')) - 1)
                END AS test_cases_count,
                created_at
         FROM history
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [limit, offset]
      );
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
    const db = await getDB();
    // Nuke entire results folder - all generated files live there
    const resultsDir = path.resolve(process.cwd(), 'tests/results');
    try { await fs.promises.rm(resultsDir, { recursive: true, force: true }); } catch {}
    const result = await db.run('DELETE FROM history');
    return NextResponse.json({
      success: true,
      message: `Deleted ${result.changes || 0} records`
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
