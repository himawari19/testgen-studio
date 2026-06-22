import { NextResponse } from 'next/server';
import { loadKeys, saveKeys } from '../store';

export async function POST(request: Request) {
  try {
    const { provider } = await request.json();
    if (!provider) {
      return NextResponse.json({ success: false, detail: 'Provider is required' }, { status: 400 });
    }

    const p = provider.toLowerCase().trim();

    const data = loadKeys();
    delete data.keys[p];
    data.validated = data.validated.filter(item => item !== p);

    saveKeys(data);

    return NextResponse.json({
      success: true,
      message: `API key for ${provider} revoked`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, detail: err.message }, { status: 500 });
  }
}
