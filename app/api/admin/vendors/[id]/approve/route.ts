import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth-server';
import { Resend } from 'resend';
import { ensureStripeCustomer } from '@/lib/stripe';

function escapeHtml(s: string) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { client, error } = await requireAdmin(req);
  if (error) return error;

  const vendorId = params.id;
  if (!vendorId) {
    return NextResponse.json({ error: 'Vendor ID required.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { action, reason } = body ?? {};

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be "approve" or "reject".' }, { status: 400 });
    }

    // Fetch vendor
    const { data: vendor, error: fetchErr } = await client
      .from('vendors')
      .select('id, email, status, auth_user_id, business_name, owner_name, phone, address, city, state, zip, stripe_customer_id, vendor_properties(*)')
      .eq('id', vendorId)
      .single();

    if (fetchErr || !vendor) {
      return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 });
    }

    const property = vendor.vendor_properties?.[0] ?? {};
    const contactName = escapeHtml(property.contact_name || vendor.email);
    const businessName = escapeHtml(property.legal_business_name || '');

    const resendKey = process.env.RESEND_API_KEY || process.env.Resend_API_KEY;

    if (action === 'approve') {
      if (['active', 'approved'].includes(vendor.status)) {
        return NextResponse.json({ error: 'Vendor is already active.' }, { status: 409 });
      }

      // Update vendor status
      await client
        .from('vendors')
        .update({ status: 'active' })
        .eq('id', vendorId);

      // Confirm the Supabase Auth user (in case not already confirmed)
      if (vendor.auth_user_id) {
        await client.auth.admin.updateUserById(vendor.auth_user_id, {
          email_confirm: true,
        });
      }

      // Create the Stripe Customer that will receive monthly commission
      // invoices. Non-fatal if Stripe is unavailable — the cron will retry.
      try {
        await ensureStripeCustomer(client, {
          id: vendor.id,
          email: vendor.email,
          business_name: vendor.business_name || property.legal_business_name || null,
          owner_name: vendor.owner_name,
          phone: vendor.phone || property.contact_phone,
          address: vendor.address || property.property_address,
          city: vendor.city || property.city,
          state: vendor.state || property.state,
          zip: vendor.zip || property.zip,
          stripe_customer_id: vendor.stripe_customer_id,
        });
      } catch (err: any) {
        console.error('[admin/vendors/approve] Stripe customer creation failed (non-fatal):', err.message);
      }

      // Send welcome email
      if (resendKey) {
        const resend = new Resend(resendKey);
        const siteUrl =
          process.env.NEXT_PUBLIC_SITE_URL ||
          process.env.NEXTAUTH_URL ||
          'https://www.microstay.us';

        await resend.emails
          .send({
            from: 'MicroStay Partners <no-reply@microstay.us>',
            to: [vendor.email],
            subject: 'Congratulations! Your MicroStay Partner Application is Approved',
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                <div style="background:#FF5E1A;padding:24px;border-radius:8px 8px 0 0">
                  <h1 style="color:white;margin:0;font-size:22px">You're Approved!</h1>
                </div>
                <div style="background:#fff;padding:32px;border:1px solid #F0997B;border-top:none;border-radius:0 0 8px 8px">
                  <p style="color:#2E1A16;font-size:16px">Hi ${contactName},</p>
                  <p style="color:#2E1A16;font-size:16px;line-height:1.6">
                    Congratulations! Your application for <strong>${businessName}</strong> has been approved.
                    You now have full access to the MicroStay Vendor Portal.
                  </p>
                  <div style="text-align:center;margin:28px 0">
                    <a href="https://microstay.us/vendor"
                       style="background:#FF5E1A;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block">
                      Go to Vendor Dashboard
                    </a>
                  </div>
                  <p style="color:#8A5A50;font-size:14px">
                    Questions? Contact us at <a href="mailto:info@microstay.us">info@microstay.us</a>
                  </p>
                  <hr style="border:none;border-top:1px solid #F0997B;margin:24px 0"/>
                  <p style="color:#8A5A50;font-size:12px;margin:0">MICROSTAY HOLDINGS LLC d/b/a MicroStay.us · EIN 41-4740422</p>
                </div>
              </div>
            `,
          })
          .catch((e: Error) => console.error('Approval email error:', e.message));
      }

      return NextResponse.json({ success: true, message: 'Vendor approved successfully.' });
    }

    // action === 'reject'
    if (vendor.status === 'rejected') {
      return NextResponse.json({ error: 'Vendor is already rejected.' }, { status: 409 });
    }

    await client
      .from('vendors')
      .update({ status: 'rejected' })
      .eq('id', vendorId);

    // Send rejection email
    if (resendKey) {
      const resend = new Resend(resendKey);
      const safeReason = escapeHtml(reason || 'Your application did not meet our current partner requirements.');

      await resend.emails
        .send({
          from: 'MicroStay Partners <no-reply@microstay.us>',
          to: [vendor.email],
          subject: 'Update on Your MicroStay Partner Application',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <div style="background:#2E1A16;padding:24px;border-radius:8px 8px 0 0">
                <h1 style="color:white;margin:0;font-size:20px">Application Decision</h1>
              </div>
              <div style="background:#fff;padding:32px;border:1px solid #F0997B;border-top:none;border-radius:0 0 8px 8px">
                <p style="color:#2E1A16;font-size:16px">Hi ${contactName},</p>
                <p style="color:#2E1A16;font-size:16px;line-height:1.6">
                  Thank you for your interest in becoming a MicroStay Partner.
                  After reviewing your application for <strong>${businessName}</strong>, we are unable to approve it at this time.
                </p>
                <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px;border-radius:4px;margin:20px 0">
                  <p style="color:#991b1b;margin:0;font-size:14px"><strong>Reason:</strong> ${safeReason}</p>
                </div>
                <p style="color:#8A5A50;font-size:14px">
                  If you believe this is in error or would like more information, please contact us at
                  <a href="mailto:info@microstay.us">info@microstay.us</a>.
                </p>
                <hr style="border:none;border-top:1px solid #F0997B;margin:24px 0"/>
                <p style="color:#8A5A50;font-size:12px;margin:0">MICROSTAY HOLDINGS LLC d/b/a MicroStay.us · EIN 41-4740422</p>
              </div>
            </div>
          `,
        })
        .catch((e: Error) => console.error('Rejection email error:', e.message));
    }

    return NextResponse.json({ success: true, message: 'Vendor rejected.' });
  } catch (err: any) {
    console.error('Admin approve/reject error:', err);
    return NextResponse.json({ error: 'Vendor approval/rejection failed' }, { status: 500 });
  }
}
