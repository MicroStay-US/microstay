/**
 * Helper for minting short-lived signed URLs to PDFs stored in the
 * (now private) signed-agreements bucket.
 *
 * The bucket was previously public; a security audit (2026-04-09, finding
 * C5) required privatizing it. Rather than changing every client UI that
 * expects a URL, every API route that returns an agreement signature now
 * uses this helper to mint a fresh 1-hour signed URL on the fly — the
 * wire-level contract (`signed_pdf_url` field in the response) is
 * unchanged.
 */

const SIGNED_AGREEMENTS_BUCKET = 'signed-agreements';
const URL_TTL_SECONDS = 60 * 60; // 1 hour — default for API responses
// Longer TTL for links embedded in transactional emails. Recipients may
// not click immediately; 30 days balances convenience and revocability.
export const EMAIL_URL_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface AgreementSignatureLike {
  signed_pdf_path?: string | null;
  // Legacy column, may still carry the old public URL for rows written
  // before migration 20260409000002. We fall back to parsing it.
  signed_pdf_url?: string | null;
}

function extractLegacyPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = '/storage/v1/object/public/signed-agreements/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

/**
 * Returns a fresh signed URL for an agreement signature row, or an empty
 * string if the row has no associated PDF (e.g., upload failed during
 * signing). Never throws — the caller can still respond with the rest of
 * the record.
 */
export async function mintSignedAgreementUrl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
  row: AgreementSignatureLike,
  ttlSeconds: number = URL_TTL_SECONDS,
): Promise<string> {
  const path = row.signed_pdf_path ?? extractLegacyPath(row.signed_pdf_url);
  if (!path) return '';

  const { data, error } = await serviceClient.storage
    .from(SIGNED_AGREEMENTS_BUCKET)
    .createSignedUrl(path, ttlSeconds);

  if (error || !data?.signedUrl) {
    console.error('[mintSignedAgreementUrl] failed for path', path, error?.message);
    return '';
  }
  return data.signedUrl;
}

/**
 * Batch variant: mints URLs for a list of rows in parallel. Returns a new
 * array where each row has `signed_pdf_url` replaced with a fresh signed URL.
 */
export async function mintSignedAgreementUrlsForList<T extends AgreementSignatureLike>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
  rows: T[],
): Promise<(T & { signed_pdf_url: string })[]> {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      signed_pdf_url: await mintSignedAgreementUrl(serviceClient, row),
    })),
  );
}
