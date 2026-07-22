'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Compass, MapPin, Bell, Plus, Inbox, User, Bookmark, MessageCircle, Settings, Gift, X, UserPlus, Sparkles } from 'lucide-react';
const NAV_ITEMS = [
  { id: 'explore', label: 'Explore', icon: Compass, href: '/explore' },
  { id: 'my-trips', label: 'My Trips', icon: MapPin, href: '/explore/my-trips' },
  { id: 'requests', label: 'Requests', icon: Inbox, href: '/explore/requests', badge: 3 },
  { id: 'saved', label: 'Saved Trips', icon: Bookmark, href: '/explore/my-trips?tab=saved' },
  { id: 'chats', label: 'Chats', icon: MessageCircle, href: '/explore/requests?tab=chats' },
  { id: 'notifications', label: 'Notifications', icon: Bell, href: '/explore/requests?tab=notifications' },
  { id: 'profile', label: 'Profile', icon: User, href: '/explore/me' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/explore/me?tab=settings' },
];

const MOBILE_NAV = [
  { id: 'explore', label: 'Explore', icon: Compass, href: '/explore' },
  { id: 'my-trips', label: 'My Trips', icon: MapPin, href: '/explore/my-trips' },
  { id: 'requests', label: 'Requests', icon: Inbox, href: '/explore/requests', badge: 3 },
  { id: 'profile', label: 'Profile', icon: User, href: '/explore/me' },
];

export default function TripShell({ children, right = null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [fabOpen, setFabOpen] = useState(false);
  const touchStartY = useRef(null);

  const isActive = (href) => {
    const clean = href.split('?')[0];
    if (clean === '/explore') return pathname === '/explore';
    return pathname.startsWith(clean);
  };

  // Close FAB on route change
  useEffect(() => { setFabOpen(false); }, [pathname]);

  // Lock body scroll while FAB sheet open + esc to close
  useEffect(() => {
    if (!fabOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setFabOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [fabOpen]);

  const openFab = () => setFabOpen(true);
  const closeFab = () => setFabOpen(false);

  const onTouchStart = (e) => { touchStartY.current = e.touches?.[0]?.clientY ?? null; };
  const onTouchMove = (e) => {
    if (touchStartY.current == null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 60) { closeFab(); touchStartY.current = null; }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-100 px-4 h-14 flex items-center justify-between pt-[env(safe-area-inset-top)]">
        <Link href="/explore" className="flex items-center gap-2 active:opacity-70 transition">
          <div className="size-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center text-white shadow-md shadow-violet-200"><Compass className="size-4" /></div>
          <div className="leading-tight">
            <div className="font-display font-bold text-[15px] tracking-tight">Safar</div>
            <div className="text-[10px] text-slate-500 -mt-0.5">Curated</div>
          </div>
        </Link>
        <button onClick={() => router.push('/explore/requests?tab=notifications')} className="size-9 grid place-items-center rounded-full hover:bg-slate-100 active:bg-slate-200 transition relative" aria-label="Notifications">
          <Bell className="size-5 text-slate-700" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-violet-600 ring-2 ring-white" />
        </button>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-100 flex-col justify-between py-6 px-4 z-20">
          <div>
            <Link href="/explore" className="flex items-center gap-2.5 px-2 mb-8">
              <div className="size-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center text-white shadow-lg shadow-violet-200"><Compass className="size-5" /></div>
              <div className="leading-tight">
                <div className="font-display font-bold text-[17px] tracking-tight">Safar</div>
                <div className="text-[11px] text-slate-500 -mt-0.5">Curated</div>
              </div>
            </Link>
            <nav className="space-y-0.5">
              {NAV_ITEMS.map((it) => {
                const active = isActive(it.href);
                const Icon = it.icon;
                return (
                  <Link key={it.id} href={it.href} className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${active ? 'bg-violet-50 text-violet-700 shadow-sm shadow-violet-100/50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                    <Icon className={`size-[18px] transition ${active ? 'text-violet-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
                    <span className="flex-1">{it.label}</span>
                    {it.badge && <span className="text-[10px] font-bold size-5 grid place-items-center rounded-full bg-violet-100 text-violet-700">{it.badge}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="space-y-3">
            <Link href="/explore/create" className="flex items-center justify-center gap-2 w-full rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white text-sm font-semibold py-2.5 shadow-lg shadow-violet-200 transition">
              <Plus className="size-4" /> Create a Trip
            </Link>
            <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 p-3 relative overflow-hidden">
              <Gift className="absolute -right-1 -bottom-1 size-14 text-fuchsia-200" />
              <div className="font-semibold text-[13px] text-slate-800">Share Safar</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Invite friends and get rewards</div>
              <button className="mt-2 text-[11px] font-semibold text-violet-700 hover:underline">Invite Now</button>
            </div>
          </div>
        </aside>

        {/* Main content column */}
        <div className="flex-1 lg:ml-64 lg:mr-0 xl:mr-80">
          <div className="pb-28 lg:pb-8">{children}</div>
        </div>

        {/* Right rail (desktop) */}
        {right && (
          <aside className="hidden xl:block fixed inset-y-0 right-0 w-80 bg-white border-l border-slate-100 overflow-y-auto z-10">
            <div className="p-5">{right}</div>
          </aside>
        )}
      </div>

      {/* ========== FAB Backdrop + Sheet (mobile) ========== */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-all duration-300 ${fabOpen ? 'pointer-events-auto bg-slate-900/50 backdrop-blur-md opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={closeFab}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        aria-hidden={!fabOpen}
      >
        <div
          className={`absolute left-0 right-0 bottom-0 pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+6.5rem))] px-4 transition-all duration-[280ms] ${fabOpen ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.3, 0.64, 1)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto max-w-md">
            {/* Grabber */}
            <div className="flex justify-center pb-2">
              <div className="h-1 w-10 rounded-full bg-white/70" />
            </div>

            <Link
              href="/explore/create"
              onClick={closeFab}
              className={`group flex items-center gap-4 rounded-3xl bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl shadow-slate-900/25 p-4 active:scale-[0.98] transition-all duration-300 ${fabOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
              style={{ transitionDelay: fabOpen ? '60ms' : '0ms', transitionTimingFunction: 'cubic-bezier(0.34, 1.3, 0.64, 1)' }}
            >
              <div className="size-14 rounded-2xl bg-violet-100 grid place-items-center text-violet-600 shrink-0">
                <PlaneIcon />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-[16px] text-slate-900">Create a Trip</div>
                <div className="text-[12.5px] text-slate-500 mt-0.5 leading-snug">Plan your own adventure and invite others to join.</div>
              </div>
              <ChevronRightIcon />
            </Link>

            <Link
              href="/explore"
              onClick={closeFab}
              className={`group mt-3 flex items-center gap-4 rounded-3xl bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl shadow-slate-900/25 p-4 active:scale-[0.98] transition-all duration-300 ${fabOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
              style={{ transitionDelay: fabOpen ? '120ms' : '0ms', transitionTimingFunction: 'cubic-bezier(0.34, 1.3, 0.64, 1)' }}
            >
              <div className="size-14 rounded-2xl bg-emerald-100 grid place-items-center text-emerald-600 shrink-0">
                <UserPlus className="size-6" strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-[16px] text-slate-900">Join a Trip</div>
                <div className="text-[12.5px] text-slate-500 mt-0.5 leading-snug">Discover trips by fellow travelers and request to join.</div>
              </div>
              <ChevronRightIcon />
            </Link>

            <div className={`mt-4 flex justify-center transition-all duration-300 ${fabOpen ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: fabOpen ? '180ms' : '0ms' }}>
              <button onClick={closeFab} aria-label="Close" className="size-11 grid place-items-center rounded-full bg-white/95 backdrop-blur-xl border border-white/60 shadow-lg active:scale-95 transition">
                <X className="size-5 text-slate-700" strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========== Mobile bottom nav ========== */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="bg-white/95 backdrop-blur-xl border-t border-slate-100 shadow-[0_-4px_20px_-4px_rgba(15,23,42,0.08)] px-2 pt-2 pb-1.5">
          <div className="grid grid-cols-5 items-center max-w-md mx-auto">
            {MOBILE_NAV.slice(0, 2).map((it) => {
              const active = isActive(it.href);
              const Icon = it.icon;
              return (
                <Link key={it.id} href={it.href} className="flex flex-col items-center gap-0.5 py-1.5 touch-manipulation active:opacity-60 transition">
                  <Icon className={`size-[22px] transition-all duration-300 ${active ? 'text-violet-600 scale-110' : 'text-slate-400'}`} strokeWidth={active ? 2.4 : 2} />
                  <span className={`text-[10.5px] font-semibold tracking-tight transition-colors ${active ? 'text-violet-600' : 'text-slate-500'}`}>{it.label}</span>
                </Link>
              );
            })}

            {/* Center action button */}
            <div className="flex justify-center">
              <button
                onClick={fabOpen ? closeFab : openFab}
                aria-expanded={fabOpen}
                aria-label={fabOpen ? 'Close menu' : 'Create or join trip'}
                className={`size-14 rounded-full grid place-items-center text-white shadow-xl shadow-violet-400/40 active:scale-90 transition-all duration-[280ms] ${fabOpen ? 'bg-slate-900 rotate-[135deg]' : 'bg-gradient-to-br from-violet-500 to-fuchsia-600'}`}
                style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.3, 0.64, 1)' }}
              >
                <Plus className="size-7" strokeWidth={2.6} />
              </button>
            </div>

            {MOBILE_NAV.slice(2).map((it) => {
              const active = isActive(it.href);
              const Icon = it.icon;
              return (
                <Link key={it.id} href={it.href} className="flex flex-col items-center gap-0.5 py-1.5 touch-manipulation active:opacity-60 transition relative">
                  <div className="relative">
                    <Icon className={`size-[22px] transition-all duration-300 ${active ? 'text-violet-600 scale-110' : 'text-slate-400'}`} strokeWidth={active ? 2.4 : 2} />
                    {it.badge && <span className="absolute -top-1 -right-2 text-[9px] font-bold px-1 min-w-[16px] h-4 grid place-items-center rounded-full bg-rose-500 text-white ring-2 ring-white">{it.badge}</span>}
                  </div>
                  <span className={`text-[10.5px] font-semibold tracking-tight transition-colors ${active ? 'text-violet-600' : 'text-slate-500'}`}>{it.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}

function PlaneIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 shrink-0">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}
