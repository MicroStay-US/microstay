import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Server-side upload proxy for business license files submitted during the
 * anonymous partner-signup flow. Previously the client uploaded directly to
 * the vendor-documents Supabase bucket under an anonymous RLS policy — see
 * security audit finding C6. That policy has been removed; anonymous
 * clients now POST file bytes to this handler instead, which:
 *   - rate-limits per-IP to 5 uploads / 10 minutes
 *   - validates MIME type and size before writing
 *   - writes via the service role to a random-path under business-licenses/
 *   - returns the public URL (the bucket is still public-read pending a
 *     follow-up privatization + signed-URL proxy)
 */

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);

/**
 * Magic-byte (file signature) detection. The client-supplied Content-Type
 * header is trivially spoofable, so we additionally sniff the first few bytes
 * of the upload and reject anything that doesn't match a known safe format.
 * Ref: https://en.wikipedia.org/wiki/List_of_file_signatures
 */
function detectFileType(bytes: Uint8Array): 'pdf' | 'jpeg' | 'png' | null {
  if (bytes.length < 8) return null;
  // PDF: %PDF-
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) {
    return 'pdf';
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'png';
  }
  return null;
}

export async function POST(req: Request) {
  // const ip = getIP(req);
  // const rl = rateLimit(`upload-license:${ip}`, 5, 10 * 60 * 1000);
  // if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const ip = getIP(req);

  if (process.env.NODE_ENV === "production") {
    const rl = rateLimit(`upload-license:${ip}`, 5, 10 * 60 * 1000);

    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterMs);
    }
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const candidate = form.get('file');
    if (candidate instanceof File) {
      file = candidate;
    }
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: 'file field required' }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File must be between 1 byte and 10 MB' }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: 'File type must be PDF, JPEG, or PNG' },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Magic-byte check: reject files whose content doesn't match a supported format
  // regardless of what the client's Content-Type header claims.
  const detected = detectFileType(bytes);
  if (!detected) {
    return NextResponse.json(
      { error: 'File content does not match a supported format (PDF, JPEG, or PNG).' },
      { status: 400 },
    );
  }

  // Cross-check: if client-claimed MIME and detected format disagree, reject.
  const mimeToDetected: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpeg',
    'image/png': 'png',
  };
  if (mimeToDetected[file.type] !== detected) {
    return NextResponse.json(
      { error: 'Declared file type does not match file contents.' },
      { status: 400 },
    );
  }

  // Use the server-detected extension, not the client's filename.
  const extByType: Record<string, string> = { pdf: 'pdf', jpeg: 'jpg', png: 'png' };
  const safeExt = extByType[detected];
  const random = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const path = `business-licenses/${Date.now()}_${random}.${safeExt}`;

  const svc = createClient(supabaseUrl, serviceKey);

  // 2026-04-12: uploads go to the PRIVATE vendor-private-docs bucket.
  // Admins view the file via /api/admin/documents/signed-url which issues
  // short-lived signed URLs. No anon access. Supersedes the old public
  // vendor-documents bucket for license uploads.
  const { error: upErr } = await svc.storage
    .from('vendor-private-docs')
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (upErr) {
    console.error('[signup/upload-license] upload failed', upErr.message);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  // Return the storage path only — admins will exchange it for a signed URL
  // via /api/admin/documents/signed-url. Do NOT return a public URL.
  return NextResponse.json({ path, bucket: 'vendor-private-docs' });
}
