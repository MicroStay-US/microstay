import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'This API route has been deprecated in favor of native Supabase auth.' }, { status: 410 });
}
