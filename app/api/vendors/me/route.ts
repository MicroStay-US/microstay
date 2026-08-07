import { NextRequest, NextResponse } from 'next/server';
import { requireVendor, AnySupabaseClient } from '@/lib/vendor-auth-server';
import { mintSignedAgreementUrl } from '@/lib/signed-pdf';

export async function GET(req: NextRequest) {
  const auth = await requireVendor(req);
  if (auth.error) return auth.error;
  const { vendor, serviceClient: svc }: { vendor: any; serviceClient: AnySupabaseClient; error: null } = auth as any;

  try {
    // Fetch full vendor + property + latest signature
    const [propResult, sigResult] = await Promise.all([
      svc
        .from('vendor_properties')
        .select('*')
        .eq('vendor_id', vendor.id)
        .maybeSingle(),
      svc
        .from('agreement_signatures')
        .select('id, agreement_version, signed_at, typed_signature, signed_pdf_path, signed_pdf_url')
        .eq('vendor_id', vendor.id)
        .order('signed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    // Mint a fresh signed URL — the bucket is private as of audit fix C5.
    let latestSignature = sigResult.data;
    if (latestSignature) {
      latestSignature = {
        ...latestSignature,
        signed_pdf_url: await mintSignedAgreementUrl(svc, latestSignature),
      };
    }

    return NextResponse.json({
      vendor: {
        id: vendor.id,
        email: vendor.email,
        status: vendor.status,
        email_verified_at: vendor.email_verified_at,
      },
      property: propResult.data ?? null,
      latestSignature: latestSignature ?? null,
    });
  } catch (err: any) {
    console.error('Vendor me error:', err);
    return NextResponse.json({ error: 'Failed to load vendor profile' }, { status: 500 });
  }
}
