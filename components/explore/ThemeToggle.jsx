'use client';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const KEY = 'safar-explore-theme';

export function applyTheme(t) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-explore-theme', t);
  try { localStorage.setItem(KEY, t); } catch {}
}

export function getInitialTheme() {
  if (typeof window === 'undefined') return 'aurora';
  try { return localStorage.getItem(KEY) || 'aurora'; } catch { return 'aurora'; }
}

export default function ThemeToggle({ compact = false }) {
  const [theme, setTheme] = useState('aurora');
  useEffect(() => {
    const t = getInitialTheme();
    setTheme(t);
    applyTheme(t);
  }, []);
  const toggle = () => {
    const next = theme === 'aurora' ? 'premium' : 'aurora';
    setTheme(next);
    applyTheme(next);
  };
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === 'aurora' ? 'Safar Premium' : 'Aurora'} theme`}
      title={theme === 'aurora' ? 'Safar Premium theme' : 'Aurora theme'}
      className={`inline-flex items-center gap-1.5 rounded-full border transition ${compact ? 'px-2.5 py-1' : 'px-3 py-1.5'} text-xs font-medium e-theme-toggle`}
    >
      {theme === 'aurora' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
      {!compact && <span>{theme === 'aurora' ? 'Premium' : 'Aurora'}</span>}
    </button>
  );
}
