// Only initialise Sentry with a REAL DSN. A placeholder or missing DSN causes
// Sentry's fetch instrumentation to block outbound calls indefinitely — see
// the 2026-04-10 investigation where admin password reset was stuck on
// "Updating…" because Sentry was hung retrying events to a non-existent host.
function isRealDsn(dsn: string | undefined): dsn is string {
  if (!dsn) return false;
  if (/REPLACE|XXXXXX|your[-_]?dsn|example\.com/i.test(dsn)) return false;
  return /^https:\/\/[^@]+@[^/]+\/\d+$/i.test(dsn);
}

export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!isRealDsn(dsn)) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { init } = await import('@sentry/nextjs');
    init({
      dsn,
      tracesSampleRate: 0.1,
      debug: process.env.NODE_ENV === 'development',
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const { init } = await import('@sentry/nextjs');
    init({
      dsn,
      tracesSampleRate: 0.1,
    });
  }
}
