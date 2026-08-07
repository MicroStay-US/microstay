'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ThemeToggleProps {
  variant?: 'admin' | 'vendor';
}

export function ThemeToggle({ variant = 'admin' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-8 h-8" />;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`
        relative p-2 rounded-lg transition-all duration-200
        ${variant === 'admin'
          ? 'text-slate-500 hover:text-slate-800 hover:bg-[#f1f5f9] dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10'
          : 'text-slate-500 hover:text-slate-800 hover:bg-[#f1f5f9] dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10'
        }
      `}
    >
      {isDark
        ? <Sun className="w-4 h-4 text-[#c9a96e]" />
        : <Moon className="w-4 h-4" />
      }
    </button>
  );
}
