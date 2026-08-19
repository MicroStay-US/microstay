import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireVerifiedVendor, AnySupabaseClient } from '@/lib/vendor-auth-server';
import { mintSignedAgreementUrl, EMAIL_URL_TTL_SECONDS } from '@/lib/signed-pdf';

function escapeHtml(s: string) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(req: NextRequest) {
  const auth = await requireVerifiedVendor(req);
  if (auth.error) return auth.error;
  const { vendor, serviceClient: svc }: { vendor: any; serviceClient: AnySupabaseClient; error: null } = auth as any;

  try {
    // Verify the vendor has completed property info
    const { data: property } = await svc
      .from('vendor_properties')
      .select('legal_business_name, property_address, city, state, contact_name, contact_email')
      .eq('vendor_id', vendor.id)
      .maybeSingle();

    if (!property) {
      return NextResponse.json(
        { error: 'Property information must be submitted before completing signup.' },
        { status: 400 }
      );
    }

    // Verify the vendor has signed the agreement
    const { data: signature } = await svc
      .from('agreement_signatures')
      .select('id, signed_pdf_path, signed_pdf_url, typed_signature, signed_at')
      .eq('vendor_id', vendor.id)
      .maybeSingle();

    if (!signature) {
      return NextResponse.json(
        { error: 'The Partner Agreement must be signed before completing signup.' },
        { status: 400 }
      );
    }

    // Mint a 30-day signed URL for embedding in the transactional email,
    // and a 1-hour URL for the JSON response (fresh-loaded UI).
    const emailPdfUrl = await mintSignedAgreementUrl(svc, signature, EMAIL_URL_TTL_SECONDS);
    const responsePdfUrl = await mintSignedAgreementUrl(svc, signature);

    // Update vendor status to pending_review
    await svc
      .from('vendors')
      .update({ status: 'pending_review' })
      .eq('id', vendor.id);

    const resendKey = process.env.RESEND_API_KEY || process.env.Resend_API_KEY;
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXTAUTH_URL ||
      'https://www.microstay.us';

    if (resendKey) {
      const resend = new Resend(resendKey);
      const safeEmail = escapeHtml(vendor.email);
      const safeName = escapeHtml(property.contact_name || vendor.email);
      const safeBiz = escapeHtml(property.legal_business_name || '');
      const safeAddr = escapeHtml(
        `${property.property_address}, ${property.city}, ${property.state}`
      );
      const safeSig = escapeHtml(signature.typed_signature);
      const safeDate = new Date(signature.signed_at).toUTCString();
      const adminDashboardUrl = `${siteUrl}/admin/dashboard`;
      const pdfUrl = emailPdfUrl;

      // Email 1: Signed agreement copy to partner
      await resend.emails
        .send({
          from: 'MicroStay Partners <no-reply@microstay.us>',
          to: [vendor.email],
          subject: 'Your MicroStay Partner Application is Under Review',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <div style="background:#FF5E1A;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
                <h1 style="color:white;margin:0;font-size:22px">Application Received - Thank You!</h1>
              </div>
              <div style="background:#fff;padding:32px;border:1px solid #F0997B;border-top:none;border-radius:0 0 8px 8px">
                <p style="color:#2E1A16;font-size:16px;margin-top:0;">Hi ${safeName},</p>
                <p style="color:#2E1A16;font-size:16px;line-height:1.6">
                  Thank you for applying to join the MicroStay Partner Network! We have successfully received your property details and signed agreement.
                </p>
                <p style="color:#2E1A16;font-size:16px;line-height:1.6">
                  Our team is currently reviewing your application. <strong>We will notify you via email as soon as you are approved.</strong> This process typically takes about 1-2 business days. In the meantime, you can review your application summary below.
                </p>
                <div style="background:#FFF1EC;border:1px solid #F0997B;border-radius:8px;padding:16px;margin:24px 0">
                  <h3 style="margin:0 0 12px 0;color:#2E1A16;font-size:14px">Application Summary</h3>
                  <p style="margin:4px 0;color:#8A5A50;font-size:13px"><strong>Reference:</strong> ${escapeHtml(signature.id ?? '')}</p>
                  <p style="margin:4px 0;color:#8A5A50;font-size:13px"><strong>Business:</strong> ${safeBiz}</p>
                  <p style="margin:4px 0;color:#8A5A50;font-size:13px"><strong>Address:</strong> ${safeAddr}</p>
                  <p style="margin:4px 0;color:#8A5A50;font-size:13px"><strong>Agreement Signed:</strong> ${safeDate}</p>
                  <p style="margin:4px 0;color:#8A5A50;font-size:13px"><strong>Signed By:</strong> ${safeSig}</p>
                </div>
                ${pdfUrl ? `<p style="text-align:center"><a href="${pdfUrl}" style="background:#FF5E1A;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px">Download Signed Agreement</a></p>` : ''}
                <p style="color:#8A5A50;font-size:14px">
                  Questions? Contact us at <a href="mailto:info@microstay.us">info@microstay.us</a>
                </p>
                <hr style="border:none;border-top:1px solid #F0997B;margin:24px 0"/>
                <p style="color:#8A5A50;font-size:12px;margin:0">MICROSTAY HOLDINGS LLC d/b/a MicroStay.us · EIN 41-4740422 · info@microstay.us</p>
              </div>
            </div>
          `,
        })
        .catch((e: Error) => console.error('Partner confirmation email error:', e.message));

      // Email 2: Admin notification
      await resend.emails
        .send({
          from: 'MicroStay System <no-reply@microstay.us>',
          to: ['info@microstay.us'],
          subject: `New Partner Application: ${safeBiz || safeEmail}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <div style="background:#2E1A16;padding:24px;border-radius:8px 8px 0 0">
                <h1 style="color:white;margin:0;font-size:18px">New Partner Application Received</h1>
              </div>
              <div style="background:#fff;padding:32px;border:1px solid #F0997B;border-top:none;border-radius:0 0 8px 8px">
                <table style="width:100%;border-collapse:collapse">
                  <tr><td style="padding:6px 0;color:#8A5A50;width:140px">Business Name:</td><td style="padding:6px 0;color:#2E1A16;font-weight:600">${safeBiz}</td></tr>
                  <tr><td style="padding:6px 0;color:#8A5A50">Address:</td><td style="padding:6px 0;color:#2E1A16">${safeAddr}</td></tr>
                  <tr><td style="padding:6px 0;color:#8A5A50">Contact Email:</td><td style="padding:6px 0;color:#2E1A16">${safeEmail}</td></tr>
                  <tr><td style="padding:6px 0;color:#8A5A50">Contact Name:</td><td style="padding:6px 0;color:#2E1A16">${safeName}</td></tr>
                  <tr><td style="padding:6px 0;color:#8A5A50">Agreement Signed:</td><td style="padding:6px 0;color:#2E1A16">${safeDate}</td></tr>
                  <tr><td style="padding:6px 0;color:#8A5A50">Vendor ID:</td><td style="padding:6px 0;color:#2E1A16;font-family:monospace">${escapeHtml(vendor.id)}</td></tr>
                </table>
                <div style="text-align:center;margin:24px 0">
                  <a href="${adminDashboardUrl}" style="background:#FF5E1A;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold">
                    Review in Admin Dashboard
                  </a>
                </div>
              </div>
            </div>
          `,
        })
        .catch((e: Error) => console.error('Admin notification email error:', e.message));
    }

    return NextResponse.json({
      success: true,
      message: "Application submitted. You'll hear from us within 2 business days.",
      signatureId: signature.id,
      signedPdfUrl: responsePdfUrl,
    });
  } catch (err: any) {
    console.error('Complete-signup error:', err);
    return NextResponse.json({ error: 'Failed to complete signup' }, { status: 500 });
  }
}
