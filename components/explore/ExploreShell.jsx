'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { LogIn, MapPin, Bell, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import ExploreSubNav from './ExploreSubNav';
import ThemeToggle from './ThemeToggle';

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unreadCount: 0 });
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/notifications');
      const j = await r.json();
      if (j.ok) setData({ notifications: j.notifications || [], unreadCount: j.unreadCount || 0 });
    } catch {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);
  const markAll = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    setData(d => ({ ...d, unreadCount: 0, notifications: d.notifications.map(n => ({ ...n, read: true })) }));
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="relative size-8 rounded-full border grid place-items-center transition hover:opacity-90" style={{ background: 'var(--e-surface)', borderColor: 'var(--e-line-strong)' }} aria-label="Notifications">
        <Bell className="size-4" style={{ color: 'var(--e-text)' }} />
        {data.unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center">{data.unreadCount > 9 ? '9+' : data.unreadCount}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto e-glass rounded-2xl border border-white/15 shadow-xl z-40 p-2" style={{ background: 'rgba(15,20,32,0.95)' }}>
            <div className="flex items-center justify-between px-2 py-1">
              <div className="text-xs font-semibold" style={{ color: 'var(--e-text)' }}>Notifications</div>
              {data.unreadCount > 0 && <button onClick={markAll} className="text-[10px] e-grad-text font-semibold">Mark all read</button>}
            </div>
            {loading && <div className="p-4 text-center"><Loader2 className="size-4 animate-spin mx-auto text-white/50" /></div>}
            {!loading && data.notifications.length === 0 && <div className="p-4 text-center text-xs" style={{ color: 'var(--e-text-muted)' }}>No notifications yet.</div>}
            <div className="space-y-1">
              {data.notifications.slice(0, 20).map(n => (
                <Link key={n.id} href={n.link || '/explore/home'} onClick={() => setOpen(false)} className={`block p-2 rounded-lg transition hover:bg-white/[0.05] ${!n.read ? 'bg-emerald-400/[0.06]' : ''}`}>
                  <div className="text-xs font-semibold" style={{ color: 'var(--e-text)' }}>{n.title}</div>
                  {n.body && <div className="text-[11px] line-clamp-2" style={{ color: 'var(--e-text-muted)' }}>{n.body}</div>}
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--e-text-dim)' }}>{new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ExploreShell({ children }) {
  const { user } = useAuth();
  return (
    <div className="explore-root">
      {/* Pre-hydration theme init — reads localStorage & falls back to Safar Curated (premium).
          Runs during SSR HTML parse so there's no theme flash on first paint. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('safar-explore-theme')||'premium';document.documentElement.setAttribute('data-explore-theme',t);}catch(e){document.documentElement.setAttribute('data-explore-theme','premium');}})();`,
        }}
      />
      <header className="sticky top-0 z-40 backdrop-blur-md border-b" style={{ backgroundColor: 'color-mix(in srgb, var(--e-ink) 55%, transparent)', borderColor: 'var(--e-line)' }}>
        <div className="e-container h-14 flex items-center justify-between">
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
            {user && <NotificationBell />}
            {user ? (
              <Link href={`/explore/u/${user.username || user.id}`} className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition hover:opacity-90" style={{ background: 'var(--e-surface)', borderColor: 'var(--e-line-strong)' }}>
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
      <div className="e-container flex justify-center">
        <ExploreSubNav />
      </div>
      <main className="relative">{children}</main>
    </div>
  );
}
