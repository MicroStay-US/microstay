import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { cookies } from 'next/headers';

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const body = await req.json().catch(() => ({}));
  const { code, password, email } = body ?? {};

  if (!email) {
    return NextResponse.json({ error: 'Email required.' }, { status: 400 });
  }

  if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Invalid code format.' }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ error: 'Password required.' }, { status: 400 });
  }

  const svc = createClient(supabaseUrl, serviceKey);
  const codeHash = hashCode(code);
  const now = new Date().toISOString();

  // Look for a valid, non-expired code for this email
  const { data: otpRow, error: lookupErr } = await svc
    .from('user_otp_codes')
    .select('id, expires_at')
    .eq('email', email.toLowerCase())
    .eq('code_hash', codeHash)
    .gt('expires_at', now)
    .maybeSingle();

  if (lookupErr || !otpRow) {
    return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 401 });
  }

  // Sign in as user using the provided credentials
  const client = createClient(supabaseUrl, anonKey);
  const { data, error: signInErr } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (signInErr || !data.session) {
    console.error('User sign-in error:', signInErr?.message);
    // Do NOT delete the code — let them retry after fixing the issue if needed (though password should be correct)
    return NextResponse.json({ error: 'Authentication failed. Invalid password.' }, { status: 401 });
  }

  // Sign-in succeeded — now delete the code (prevent replay)
  await svc.from('user_otp_codes').delete().eq('id', otpRow.id);

  // Set HttpOnly, Secure, SameSite=Strict cookies
  const cookieStore = cookies();
  const maxAge = 7 * 24 * 60 * 60; // 7 days as requested by prompt
  
  cookieStore.set('sb-access-token', data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
    path: '/'
  });
  
  cookieStore.set('sb-refresh-token', data.session.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
    path: '/'
  });

  return NextResponse.json({
    user: data.session.user,
    success: true,
  });
}
