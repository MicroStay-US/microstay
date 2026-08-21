import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth-server';
import { ensureStripeCustomer } from '@/lib/stripe';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export async function POST(req: Request) {
  // SECURITY: admin-only. Previously unauthenticated — any caller could
  // promote a pending vendor to active and trigger a password reset to an
  // attacker-controlled inbox. See 2026-04-09 security audit C1.
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const supabase = auth.client;

  const ip = getIP(req);
  const { allowed, retryAfterMs } = rateLimit('admin-approve-vendor:' + ip, 30, 5 * 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterMs);

  try {
    const { vendorId } = await req.json();

    // 1. Fetch the pending vendor
    const { data: vendor, error: fetchErr } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', vendorId)
      .single();

    if (fetchErr || !vendor) throw new Error('Vendor not found');
    if (vendor.status === 'active' || vendor.status === 'approved') throw new Error('Vendor already approved');

    let userId;
    // 2. Create or Link the Auth User in Supabase with a random temp password.
    // The vendor will set their own password via the reset email sent below.
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: vendor.email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authErr) {
      if (authErr.message.toLowerCase().includes('already')) {
        // Fallback: Recover existing user
        const { data: listData } = await supabase.auth.admin.listUsers();
        if (listData && listData.users) {
          const existingUser = listData.users.find((u: { email?: string }) => u.email === vendor.email);
          if (existingUser) {
            userId = existingUser.id;
          } else {
            throw new Error(`Auth Collision Unrecoverable: ${authErr.message}`);
          }
        } else {
          throw new Error(`Auth System Down: ${authErr.message}`);
        }
      } else {
        throw new Error(`Auth Creation Error: ${authErr.message}`);
      }
    } else {
      userId = authUser.user.id;
    }

    // 3. Create the Profile
    await supabase.from('profiles').upsert({
      id: userId,
      role: 'vendor',
      name: vendor.poc_name || vendor.owner_name,
      phone: vendor.phone
    });

    // 4. Update the vendor record to active and link auth_user_id
    const { error: updateErr } = await supabase.from('vendors').update({
      auth_user_id: userId,
      status: 'active',
      onboarded_at: new Date().toISOString(),
    }).eq('id', vendorId);

    if (updateErr) throw new Error(`Vendor Update Error: ${updateErr.message}`);

    // 4b. Create the Stripe Customer that will receive monthly commission
    //     invoices. Idempotent — safe to re-run if approval is retried.
    //     Non-fatal: if Stripe is down or misconfigured we still approve the
    //     vendor and the cron will retry customer creation next cycle.
    try {
      await ensureStripeCustomer(supabase, {
        id: vendorId,
        email: vendor.email,
        business_name: vendor.business_name || vendor.motel_name || null,
        owner_name: vendor.owner_name,
        phone: vendor.phone,
        address: vendor.address,
        city: vendor.city,
        state: vendor.state,
        zip: vendor.zip,
      });
    } catch (err: any) {
      console.error('[vendor/approve] Stripe customer creation failed (non-fatal):', err.message);
    }

    // Geocode address via Nominatim
    let lat = null;
    let lon = null;
    try {
      const q = encodeURIComponent(`${vendor.address}, ${vendor.city}, ${vendor.state}`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
        headers: { 'User-Agent': 'MicroStayApp/1.0 (contact@microstay.us)' }
      });
      const geoData = await res.json();
      if (geoData && geoData.length > 0) {
        lat = parseFloat(geoData[0].lat);
        lon = parseFloat(geoData[0].lon);
      }
    } catch (e) {
      console.error('Geocoding failed during approval:', e);
    }

    // PREVENT DUPLICATES: Check if this vendor already has a property
    const { data: existingProp } = await supabase.from('properties').select('id').eq('vendor_id', vendorId).maybeSingle();
    let property = existingProp;
    let propErr = null;

    if (!existingProp) {
      const res = await supabase.from('properties').insert({
        vendor_id: vendorId,
        name: vendor.motel_name || vendor.business_name || 'Pending Property Setup',
        address: vendor.address,
        city: vendor.city,
        state: vendor.state,
        phone: vendor.phone,
        description: vendor.description,
        amenities: vendor.amenities ? JSON.parse(vendor.amenities) : [],
        photos: vendor.photos && vendor.photos !== '[]' ? JSON.parse(vendor.photos) : [],
        latitude: lat,
        longitude: lon
      }).select().single();

      property = res.data;
      propErr = res.error;
    }

    if (propErr) {
      console.warn(`Property Creation Warn: ${propErr.message}`);
      // Don't throw here, sometimes properties are created separately or it fails due to duplicates, but vendor is approved.
    }

    // 6. Send password reset ONLY if the vendor didn't already have an account set up
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.microstay.us';
    if (!vendor.auth_user_id) {
      await supabase.auth.resetPasswordForEmail(vendor.email, {
        redirectTo: `${siteUrl}/vendor/login`,
      });
    }
    const resendKey = process.env.RESEND_API_KEY || process.env.Resend_API_KEY;
    if (resendKey) {
      const vendorName = escapeHtml(vendor.poc_name || vendor.owner_name || '');
      const businessName = escapeHtml(vendor.motel_name || vendor.business_name || '');
      const emailHtml = `
        <div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto'>
          <div style='background:#FF5E1A;padding:24px;border-radius:8px 8px 0 0'>
            <h1 style='color:white;margin:0;font-size:20px'>Application Approved!</h1>
          </div>
          <div style='background:#fff;padding:24px;border:1px solid #F0997B;border-top:none;border-radius:0 0 8px 8px'>
            <p style='color:#2E1A16;font-size:16px;line-height:1.5'>Hi ${vendorName},</p>
            <p style='color:#2E1A16;font-size:16px;line-height:1.5'>Congratulations! Your partnership application for <strong>${businessName}</strong> has been approved.</p>
            <p style='color:#2E1A16;font-size:16px;line-height:1.5'>A password setup email has been sent to you separately. Please check your inbox to set your password and then sign in.</p>
            <hr style='border:none;border-top:1px solid #F0997B;margin:24px 0'>
            <p style='color:#8A5A50;font-size:12px;margin:0'>MicroStay - Partnership Team</p>
          </div>
        </div>
      `;

      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'MicroStay <no-reply@microstay.us>',
            to: vendor.email,
            subject: 'Welcome to MicroStay! Your Application is Approved.',
            html: emailHtml,
          }),
        });
        console.log('Welcome email dispatched.');
      } catch (e) {
        console.error('Failed to send welcome email', e);
      }
    }

    revalidatePath('/admin/dashboard', 'layout');

    return NextResponse.json({ success: true, message: 'Vendor approved and provisioned successfully.' });
  } catch (error: any) {
    console.error('Approval Error:', error);
    return NextResponse.json({ error: 'Vendor approval failed' }, { status: 500 });
  }
}
