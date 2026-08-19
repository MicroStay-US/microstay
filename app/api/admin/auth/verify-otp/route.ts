import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@microstay.us';

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const body = await req.json().catch(() => ({}));
  const { code, password } = body ?? {};

  if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Invalid code format.' }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ error: 'Password required.' }, { status: 400 });
  }

  const svc = createClient(supabaseUrl, serviceKey);
  const codeHash = hashCode(code);
  const now = new Date().toISOString();

  // Look for a valid, unused, non-expired code
  const { data: otpRow, error: lookupErr } = await svc
    .from('admin_otp_codes')
    .select('id, expires_at, used')
    .eq('code_hash', codeHash)
    .eq('used', false)
    .gt('expires_at', now)
    .maybeSingle();

  if (lookupErr || !otpRow) {
    return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 401 });
  }

  // Sign in as admin using the provided password
  const client = createClient(supabaseUrl, anonKey);
  const { data, error: signInErr } = await client.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: password,
  });

  if (signInErr || !data.session) {
    console.error('Admin sign-in error:', signInErr?.message);
    // Do NOT mark code as used — let them retry after fixing the issue
    return NextResponse.json({ error: 'Authentication failed. Invalid password.' }, { status: 401 });
  }

  // Sign-in succeeded — now mark code as used (prevent replay)
  await svc.from('admin_otp_codes').update({ used: true }).eq('id', otpRow.id);

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}
