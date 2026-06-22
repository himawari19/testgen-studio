import { NextResponse } from 'next/server';
import { getDB } from '../../db';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDB();
    const result = await db.run('DELETE FROM monitored_urls WHERE id = ?', params.id);

    if ((result.changes || 0) === 0) {
      return NextResponse.json({ detail: 'Monitor record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Monitor deleted' });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
