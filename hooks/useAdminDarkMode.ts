'use client';

import { useEffect, useState } from 'react';

// Default the admin portal to DARK mode
const STORAGE_KEY = 'admin-dark-mode';
const DEFAULT_DARK = true;

function applyTheme(dark: boolean) {
  if (typeof document === 'undefined') return;
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function useAdminDarkMode() {
  const [isDark, setIsDark] = useState(DEFAULT_DARK);

  useEffect(() => {
    // Read stored preference; fall back to DEFAULT_DARK if never set
    const stored = localStorage.getItem(STORAGE_KEY);
    const prefersDark = stored === null ? DEFAULT_DARK : stored === 'true';
    setIsDark(prefersDark);
    applyTheme(prefersDark);
  }, []);

  const toggle = () => {
    setIsDark(prev => {
      const next = !prev;
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return { isDark, toggle };
}
