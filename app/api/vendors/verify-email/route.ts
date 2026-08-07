import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TOKEN_EXPIRY_HOURS = 24;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  // Use a trusted site URL — never derive from request headers (prevents open redirect via X-Forwarded-Host)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://www.microstay.us';

  if (!token || !email) {
    return NextResponse.redirect(`${siteUrl}/partner-signup?error=invalid_link`);
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.redirect(`${siteUrl}/partner-signup?error=server_error`);
    }

    const svc = createClient(supabaseUrl, serviceKey);

    // Fetch vendor by token
    const { data: vendor, error: fetchErr } = await svc
      .from('vendors')
      .select('id, email, status, email_verification_token, email_verification_sent_at, email_verified_at, auth_user_id')
      .eq('email_verification_token', token)
      .ilike('email', email.trim())
      .single();

    if (fetchErr || !vendor) {
      return NextResponse.redirect(`${siteUrl}/partner-signup?error=invalid_token`);
    }

    // Already verified
    if (vendor.email_verified_at) {
      // Issue magic link so they can sign in and continue
      const { data: linkData } = await svc.auth.admin.generateLink({
        type: 'magiclink',
        email: vendor.email,
        options: { redirectTo: `${siteUrl}/partner-signup?step=2` },
      });
      if (linkData?.properties?.action_link) {
        return NextResponse.redirect(linkData.properties.action_link);
      }
      return NextResponse.redirect(`${siteUrl}/partner-signup?step=2&already_verified=true`);
    }

    // Check token expiry
    if (vendor.email_verification_sent_at) {
      const sentAt = new Date(vendor.email_verification_sent_at).getTime();
      const expiryMs = TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
      if (Date.now() - sentAt > expiryMs) {
        return NextResponse.redirect(`${siteUrl}/partner-signup?error=token_expired&email=${encodeURIComponent(email)}`);
      }
    }

    // Mark email as verified
    const now = new Date().toISOString();
    await svc
      .from('vendors')
      .update({
        email_verified_at: now,
        status: 'pending_agreement',
        email_verification_token: null,
      })
      .eq('id', vendor.id);

    // Confirm the Supabase Auth user's email
    if (vendor.auth_user_id) {
      await svc.auth.admin.updateUserById(vendor.auth_user_id, {
        email_confirm: true,
      });
    }

    // Issue a magic link so the user is auto-signed-in after verification
    const { data: linkData } = await svc.auth.admin.generateLink({
      type: 'magiclink',
      email: vendor.email,
      options: { redirectTo: `${siteUrl}/partner-signup?step=2` },
    });

    if (linkData?.properties?.action_link) {
      return NextResponse.redirect(linkData.properties.action_link);
    }

    // Fallback: redirect to signup with success
    return NextResponse.redirect(`${siteUrl}/partner-signup?step=2&verified=true`);
  } catch (err: any) {
    console.error('Verify-email error:', err);
    return NextResponse.redirect(`${siteUrl}/partner-signup?error=server_error`);
  }
}
