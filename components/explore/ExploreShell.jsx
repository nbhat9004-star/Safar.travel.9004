'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { LogIn, MapPin } from 'lucide-react';
import ExploreSubNav from './ExploreSubNav';
import ThemeToggle from './ThemeToggle';

export default function ExploreShell({ children }) {
  const { user } = useAuth();
  return (
    <div className="explore-root">
      <header className="sticky top-0 z-40 backdrop-blur-md border-b" style={{ backgroundColor: 'color-mix(in srgb, var(--e-ink) 55%, transparent)', borderColor: 'var(--e-line)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/explore/home" className="inline-flex items-center gap-2 shrink-0">
              <div className="size-7 rounded-lg bg-gradient-to-br from-emerald-300 via-violet-400 to-fuchsia-400 grid place-items-center shadow-lg shadow-violet-500/30">
                <MapPin className="size-3.5 text-[#06080f]" strokeWidth={2.6} />
              </div>
              <div className="leading-tight">
                <div className="font-semibold text-sm" style={{ color: 'var(--e-text)' }}>Explore</div>
                <div className="text-[9px] uppercase tracking-[0.22em] -mt-0.5" style={{ color: 'var(--e-text-dim)' }}>Living Travel World</div>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle compact />
            {user ? (
              <Link href="/explore/passport" className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition hover:opacity-90" style={{ background: 'var(--e-surface)', borderColor: 'var(--e-line-strong)' }}>
                <div className="size-6 rounded-full bg-gradient-to-br from-emerald-300 to-violet-400 grid place-items-center text-[10px] font-bold text-[#06080f]">
                  {(user.name || user.email || 'S').charAt(0).toUpperCase()}
                </div>
                <span className="text-xs max-w-[100px] truncate" style={{ color: 'var(--e-text-muted)' }}>{user.name || 'Traveler'}</span>
              </Link>
            ) : (
              <Link href="/?auth=1" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold e-btn-primary">
                <LogIn className="size-3.5" /> Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <div className="flex justify-center px-2">
        <ExploreSubNav />
      </div>
      <main className="relative">{children}</main>
    </div>
  );
}
