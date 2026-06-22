import { NextResponse } from 'next/server';
import { getDB } from '../../../db';
import { crawlPage } from '../../../crawler';
import crypto from 'crypto';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDB();
    const record = await db.get('SELECT * FROM monitored_urls WHERE id = ?', params.id);

    if (!record) {
      return NextResponse.json({ detail: 'Monitor record not found' }, { status: 404 });
    }

    const pageData = await crawlPage(record.url);
    const currentSelectors = new Set(pageData.elements.map(el => el.css_selector));

    const storedSelectors = JSON.parse(record.selectors_json || '[]');
    const updatedSelectors: any[] = [];
    let brokenCount = 0;

    for (const sel of storedSelectors) {
      const isValid = currentSelectors.has(sel.css_selector);
      if (!isValid) {
        brokenCount++;
      }
      updatedSelectors.push({ ...sel, is_valid: isValid });
    }

    let status = 'healthy';
    if (brokenCount > 0) {
      if (brokenCount < storedSelectors.length * 0.3) {
        status = 'warning';
      } else {
        status = 'broken';
      }
    }

    const now = new Date().toISOString();
    const updatedSelectorsJSON = JSON.stringify(updatedSelectors);

    // Update in transaction
    await db.run('BEGIN TRANSACTION');
    try {
      await db.run(
        `UPDATE monitored_urls
         SET last_checked = ?, selectors_json = ?, selectors_total = ?, selectors_broken = ?, status = ?, updated_at = ?
         WHERE id = ?`,
        [now, updatedSelectorsJSON, storedSelectors.length, brokenCount, status, now, params.id]
      );

      const snapshotID = crypto.randomUUID();
      await db.run(
        `INSERT INTO monitor_snapshots
         (id, monitor_id, selectors_json, selectors_total, selectors_broken, status, checked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [snapshotID, params.id, updatedSelectorsJSON, storedSelectors.length, brokenCount, status, now]
      );
      await db.run('COMMIT');
    } catch (txErr) {
      await db.run('ROLLBACK');
      throw txErr;
    }

    return NextResponse.json({
      success: true,
      status,
      selectors_total: storedSelectors.length,
      selectors_broken: brokenCount
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
