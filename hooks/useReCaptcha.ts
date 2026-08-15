'use client';

import { useCallback, useEffect, useState } from 'react';

declare global {
  interface Window {
    grecaptcha: any;
  }
}

export function useReCaptcha() {
  const [ready, setReady] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    if (!siteKey) {
      return;
    }

    if (typeof window === 'undefined') return;

    // Check if script is already present on the page
    const existingScript = document.querySelector(
      `script[src*="recaptcha/api.js?render=${siteKey}"]`
    );

    if (existingScript) {
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => {
          setReady(true);
        });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => {
          setReady(true);
        });
      }
    };
    script.onerror = () => {
      console.error('Failed to load Google reCAPTCHA script.');
    };
    document.head.appendChild(script);
  }, [siteKey]);

  const execute = useCallback(
    async (action: string): Promise<string> => {
      if (!siteKey) {
        // Return empty token if siteKey is not configured (development bypass)
        return '';
      }

      return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
          reject(new Error('reCAPTCHA cannot be executed on the server'));
          return;
        }

        if (!window.grecaptcha) {
          reject(new Error('reCAPTCHA script is not loaded yet.'));
          return;
        }

        window.grecaptcha.ready(() => {
          window.grecaptcha
            .execute(siteKey, { action })
            .then((token: string) => resolve(token))
            .catch((err: any) => {
              console.error('reCAPTCHA execution error:', err);
              reject(err);
            });
        });
      });
    },
    [siteKey]
  );

  return { ready, execute };
}
