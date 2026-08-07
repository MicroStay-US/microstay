import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth-server';
import { mintSignedAgreementUrl } from '@/lib/signed-pdf';

export async function GET(req: NextRequest) {
  const { client, error } = await requireAdmin(req);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
    const offset = (page - 1) * limit;

    let query = client
      .from('vendors')
      .select(
        `
        id, email, status, created_at, email_verified_at,
        vendor_properties (
          legal_business_name, dba_name, property_address,
          city, state, zip, contact_name, contact_email, contact_phone,
          rooms_available, hourly_rate_min, hourly_rate_max
        ),
        agreement_signatures (
          id, typed_signature, signed_at, agreement_version,
          signed_pdf_path, signed_pdf_url
        )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error: fetchErr, count } = await query;
    if (fetchErr) throw new Error(fetchErr.message);

    // Mint fresh short-lived signed URLs for every embedded agreement
    // signature. The bucket is private as of audit fix C5.
    const vendors = await Promise.all(
      (data ?? []).map(async (v: any) => ({
        ...v,
        agreement_signatures: await Promise.all(
          (v.agreement_signatures ?? []).map(async (sig: any) => ({
            ...sig,
            signed_pdf_url: await mintSignedAgreementUrl(client, sig),
          })),
        ),
      })),
    );

    return NextResponse.json({
      vendors,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err: any) {
    console.error('Admin vendors list error:', err);
    return NextResponse.json({ error: 'Failed to load vendors' }, { status: 500 });
  }
}
