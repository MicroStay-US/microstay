import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth-server';

/**
 * GET /api/admin/documents/signed-url?path=...&bucket=vendor-private-docs
 *
 * Issues a short-lived (5 minute) signed URL for a file in the private
 * vendor documents bucket. Admin-only. Used by admin UIs to view vendor
 * business licenses and agreements without exposing the bucket publicly.
 *
 * Safe paths: "business-licenses/{timestamp}_{random}.{ext}"
 *             "agreements/{timestamp}_{random}.{ext}"
 * Rejects any path containing ".." or leading "/" to prevent traversal.
 */
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const url = new URL(req.url);
  const path = url.searchParams.get('path');
  const bucket = url.searchParams.get('bucket') || 'vendor-private-docs';

  if (!path) {
    return NextResponse.json({ error: 'path query param required' }, { status: 400 });
  }
  if (path.includes('..') || path.startsWith('/')) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 });
  }
  const ALLOWED_BUCKETS = new Set(['vendor-private-docs', 'vendor-documents']);
  if (!ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json({ error: 'invalid bucket' }, { status: 400 });
  }

  const { data, error } = await auth.client.storage
    .from(bucket)
    .createSignedUrl(path, 300); // 5 minutes

  if (error || !data) {
    console.error('[admin/documents/signed-url] createSignedUrl failed:', error?.message);
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
  }

  return NextResponse.json({
    url: data.signedUrl,
    expiresIn: 300,
  });
}
