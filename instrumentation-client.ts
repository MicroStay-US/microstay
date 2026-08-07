import * as Sentry from '@sentry/nextjs';

const rawDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Only initialise Sentry with a REAL DSN. A placeholder or missing DSN causes
// Sentry to send events to an unresolvable host, which in turn makes Sentry's
// global fetch instrumentation hang the promise chain of every outbound call
// (including supabase.auth.updateUser) — the 2026-04-10 investigation showed
// the admin password reset page stuck on "Updating…" indefinitely because of
// exactly this.
function isRealDsn(dsn: string | undefined): dsn is string {
  if (!dsn) return false;
  // Reject common placeholder patterns from env templates.
  if (/REPLACE|XXXXXX|your[-_]?dsn|example\.com/i.test(dsn)) return false;
  // Sanity-check the format: https://<key>@<host>/<project>
  return /^https:\/\/[^@]+@[^/]+\/\d+$/i.test(dsn);
}

if (isRealDsn(rawDsn)) {
  Sentry.init({
    dsn: rawDsn,

    // Replay 10% of sessions, 100% of sessions with errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: 0.1,

    // Ignore noisy browser errors that are not actionable
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      /^Network request failed/,
      /^ChunkLoadError/,
    ],

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}

// Required by @sentry/nextjs for router navigation instrumentation.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
