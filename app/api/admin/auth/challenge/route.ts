import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 500 });
  }

  // Sign in server-side — password never exposed to browser
  const client = createClient(supabaseUrl, anonKey);
  const { data, error: signInErr } = await client.auth.signInWithPassword({
    email: 'adminmotel@gmail.com',
    password: adminPassword,
  });

  if (signInErr || !data.session) {
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
  }

  // Return session only — challenge will be created client-side in browser context
  return NextResponse.json({
    session: data.session,
  });
}
