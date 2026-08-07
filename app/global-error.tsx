'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: '#FFF1EC',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            maxWidth: 520,
            margin: '0 16px',
            padding: '40px 36px',
            background: '#ffffff',
            borderRadius: 16,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 3,
              color: '#94a3b8',
              textTransform: 'uppercase',
            }}
          >
            MicroStay
          </p>
          <h1
            style={{
              margin: '12px 0 8px',
              fontSize: 24,
              fontWeight: 900,
              color: '#0f172a',
              lineHeight: 1.2,
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              margin: '0 0 24px',
              fontSize: 14,
              color: '#64748b',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            We hit an unexpected error. Our team has been notified. Please try
            again in a moment.
          </p>
          <button
            onClick={() => reset()}
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #FF5E1A, #F0997B)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 14,
              border: 'none',
              padding: '12px 28px',
              borderRadius: 10,
              letterSpacing: 0.5,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
