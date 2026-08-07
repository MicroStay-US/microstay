/**
 * Simple sliding-window rate limiter.
 * Uses a module-level Map so it persists within a serverless function instance.
 * Works well for moderate traffic. For high-scale production, swap the store
 * for Upstash Redis: https://upstash.com  (set UPSTASH_REDIS_REST_URL + TOKEN).
 */

interface Window {
  timestamps: number[];
}

const store = new Map<string, Window>();
const MAX_STORE_SIZE = 20_000;

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  const entry = store.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter(t => t > windowStart);
  entry.timestamps.push(now);
  store.set(key, entry);

  // Evict oldest entry if store grows too large
  if (store.size > MAX_STORE_SIZE) {
    store.delete(store.keys().next().value as string);
  }

  const allowed = entry.timestamps.length <= maxRequests;
  const remaining = Math.max(0, maxRequests - entry.timestamps.length);
  const oldest = entry.timestamps[0] ?? now;
  const retryAfterMs = allowed ? 0 : windowMs - (now - oldest);

  return { allowed, remaining, retryAfterMs };
}

/** Valid IPv4 or IPv6 pattern (loose check — enough to prevent cache-key abuse) */
const IP_PATTERN = /^[\da-fA-F.:]+$/;

/**
 * Extracts the real client IP from Vercel/proxy headers.
 * Vercel always sets x-forwarded-for with the real client IP as the first entry.
 * We validate the format to prevent attackers from using arbitrary strings as
 * rate-limit keys (which could let them bypass per-IP limits).
 */
export function getIP(req: Request | any): string {
  let ip = 'unknown';

  if (req && 'ip' in req && typeof req.ip === 'string' && IP_PATTERN.test(req.ip)) {
    ip = req.ip;
  } else {
    const h = req.headers;
    const cfIp = h.get('cf-connecting-ip')?.trim();
    const vercelIp = h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
    const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim();
    const realIp = h.get('x-real-ip')?.trim();

    if (cfIp && IP_PATTERN.test(cfIp)) {
      ip = cfIp;
    } else if (vercelIp && IP_PATTERN.test(vercelIp)) {
      ip = vercelIp;
    } else if (forwarded && IP_PATTERN.test(forwarded)) {
      ip = forwarded;
    } else if (realIp && IP_PATTERN.test(realIp)) {
      ip = realIp;
    } else if (process.env.NODE_ENV === 'development') {
      ip = '127.0.0.1';
    }
  }

  // Normalize localhost IPs exactly to prevent overriding valid public IPv6 addresses
  if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
    return '127.0.0.1';
  }

  return ip;
}

/** Returns a 429 response with Retry-After header */
export function rateLimitResponse(retryAfterMs: number) {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(retryAfterMs / 1000)),
      },
    },
  );
}
