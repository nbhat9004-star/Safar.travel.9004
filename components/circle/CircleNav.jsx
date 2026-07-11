'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sparkles,
  Compass,
  Layers,
  IdCard,
  Store,
  Settings,
  LogOut,
  X,
  BadgeCheck,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { signInHref } from '@/lib/circle-api';
import { useEffect, useState } from 'react';
import SafarCompassIcon from '@/components/circle/CompassIcon';

export default function CircleNav({ variant = 'default' }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (p) => {
    if (!pathname) return false;
    if (p === '/') return pathname === '/';
    if (p === '/circle') return pathname === '/circle';
    return pathname === p || pathname.startsWith(p + '/');
  };

  // Bottom-nav (mobile) tabs — keeps existing look
  const tabs = [
    { href: '/circle/discover', label: 'Discover', icon: Compass },
    { href: '/circle/create', label: 'Create', icon: Sparkles },
    { href: '/circle/studio', label: 'Studio', icon: Layers },
    { href: '/circle/passport', label: 'Passport', icon: IdCard },
  ];

  // Unified drawer nav — primary destinations
  const drawerNav = [
    { href: '/circle/discover', label: 'Discover', icon: Compass, hint: 'Journeys curated for you' },
    { href: '/circle/studio', label: 'Journey Studio', icon: Layers, hint: 'Build your itineraries' },
    { href: '/circle/passport', label: 'Traveler Passport', icon: IdCard, hint: 'Your circle identity' },
    { href: '/', label: 'Safar Marketplace', icon: Store, hint: 'Verified stays & services' },
  ];

  const desktopNav = drawerNav.slice(0, 3); // top-nav on desktop

  // Body scroll lock while drawer is open — JS-driven so it beats any
  // conflicting Tailwind reset / global overflow rules that make `:has()` unreliable.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    if (menuOpen) {
      const scrollY = window.scrollY;
      body.dataset.circleScrollY = String(scrollY);
      body.classList.add('circle-drawer-open');
      body.style.overflow = 'hidden';
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
    } else {
      const scrollY = Number(body.dataset.circleScrollY || 0);
      body.classList.remove('circle-drawer-open');
      body.style.overflow = '';
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      delete body.dataset.circleScrollY;
      if (scrollY) window.scrollTo(0, scrollY);
    }
    return () => {
      body.classList.remove('circle-drawer-open');
      body.style.overflow = '';
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
    };
  }, [menuOpen]);

  // Auto-close drawer on route change.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close on Escape key.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const closeDrawer = () => setMenuOpen(false);
  const openDrawer = () => setMenuOpen(true);

  const handleSignOut = async () => {
    closeDrawer();
    await logout();
    router.push('/circle');
  };

  const initials = (user?.name || user?.email || '?').charAt(0).toUpperCase();
  const verifiedTraveler = !!(user?.emailVerified || user?.phoneVerified || user?.verifiedTraveler);

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-40 w-full max-w-full ${
          variant === 'transparent' ? '' : 'circle-glass-dark border-b'
        } `}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-2 w-full max-w-full">
          <Link href="/circle" className="flex items-center gap-2 group shrink-0" onClick={closeDrawer}>
            <div className="size-9 rounded-2xl grid place-items-center circle-btn-primary shrink-0">
              <span className="text-sm font-bold">S</span>
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold tracking-wide">Safar</div>
              <div className="text-[10px] uppercase tracking-[0.22em] circle-grad-text font-semibold">Circle</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {desktopNav.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive(l.href) ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/circle/create"
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold circle-btn-primary"
            >
              <Sparkles className="size-4" /> Create a Journey
            </Link>

            {/* Unified trigger — opens the same drawer on all breakpoints */}
            {user ? (
              <button
                onClick={openDrawer}
                className="circle-nav-trigger group"
                aria-label="Open navigation menu"
                aria-expanded={menuOpen}
                aria-controls="circle-drawer"
              >
                <span className="circle-nav-trigger-avatar">
                  {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar} alt={user.name || 'You'} className="size-full object-cover" />
                  ) : (
                    <span className="text-xs font-semibold">{initials}</span>
                  )}
                </span>
                <span className="md:hidden text-white/85 flex items-center pr-1" aria-hidden="true">
                  <SafarCompassIcon open={menuOpen} size={18} />
                </span>
              </button>
            ) : (
              <>
                <Link
                  href={signInHref(pathname)}
                  className="hidden md:inline-flex circle-btn-ghost px-4 py-2 rounded-full text-sm font-semibold"
                >
                  Sign in
                </Link>
                <button
                  onClick={openDrawer}
                  className="md:hidden size-9 rounded-full circle-glass grid place-items-center shrink-0 text-white/90"
                  aria-label="Open navigation menu"
                  aria-expanded={menuOpen}
                  aria-controls="circle-drawer"
                >
                  <SafarCompassIcon open={menuOpen} size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Unified slide-out drawer (mobile + desktop) */}
      <div
        className={`circle-drawer-backdrop-v2 ${menuOpen ? 'is-open' : ''}`}
        onClick={closeDrawer}
        aria-hidden="true"
      />
      <aside
        id="circle-drawer"
        className={`circle-drawer-v2 ${menuOpen ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Safar Circle navigation"
        aria-hidden={!menuOpen}
      >
        {/* Header */}
        <div className="circle-drawer-header">
          <div className="flex items-center justify-between mb-5">
            <div className="text-[10px] uppercase tracking-[0.24em] text-white/50 font-semibold">Menu</div>
            <button
              onClick={closeDrawer}
              className="size-9 rounded-full circle-glass grid place-items-center hover:bg-white/10 transition"
              aria-label="Close menu"
            >
              <X className="size-4" />
            </button>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="circle-drawer-avatar">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt={user.name || 'You'} className="size-full object-cover" />
                ) : (
                  <span className="text-lg font-semibold">{initials}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="text-[15px] font-semibold text-white truncate max-w-full">
                    {user.name || 'Traveler'}
                  </div>
                  {verifiedTraveler && (
                    <span className="circle-verified-chip" title="Verified Traveler">
                      <BadgeCheck className="size-3" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-white/55 truncate mt-0.5">{user.email || user.phone || ''}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="circle-drawer-avatar circle-drawer-avatar-empty">
                <IdCard className="size-5 text-white/60" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-white">Welcome to Safar Circle</div>
                <div className="text-[12px] text-white/55 mt-0.5">Sign in to unlock your circle</div>
              </div>
            </div>
          )}
        </div>

        <div className="circle-drawer-divider" />

        {/* Primary nav */}
        <nav className="circle-drawer-nav" aria-label="Primary">
          {drawerNav.map((l) => {
            const Icon = l.icon;
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={closeDrawer}
                className={`circle-drawer-item ${active ? 'is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="circle-drawer-item-icon">
                  <Icon className="size-[18px]" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-semibold leading-tight truncate">{l.label}</span>
                  <span className="block text-[11px] text-white/45 leading-tight mt-0.5 truncate">{l.hint}</span>
                </span>
                <ChevronRight className="size-4 text-white/30 shrink-0" aria-hidden="true" />
              </Link>
            );
          })}
        </nav>

        {/* Featured CTA — Create a Journey */}
        <Link
          href="/circle/create"
          onClick={closeDrawer}
          className="circle-drawer-cta"
        >
          <Sparkles className="size-4" />
          <span>Create a Journey</span>
        </Link>

        {/* Spacer pushes footer to bottom */}
        <div className="flex-1" />

        <div className="circle-drawer-divider" />

        {/* Footer: Settings + Sign Out (or Sign In) */}
        <div className="circle-drawer-footer">
          {user ? (
            <>
              <Link
                href="/dashboard/traveler"
                onClick={closeDrawer}
                className={`circle-drawer-foot-item ${isActive('/dashboard/traveler') ? 'is-active' : ''}`}
              >
                <Settings className="size-[17px]" />
                <span>Settings</span>
              </Link>
              <button onClick={handleSignOut} className="circle-drawer-foot-item circle-drawer-signout">
                <LogOut className="size-[17px]" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <Link
              href={signInHref(pathname)}
              onClick={closeDrawer}
              className="circle-drawer-foot-item circle-drawer-signin"
            >
              <span>Sign In</span>
              <ChevronRight className="size-4" />
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile bottom nav — constant width, only active icon animates */}
      <nav className="circle-bottomnav md:hidden" aria-label="Primary">
        {tabs.map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              data-active={isActive(l.href) ? 'true' : 'false'}
              aria-label={l.label}
              aria-current={isActive(l.href) ? 'page' : undefined}
            >
              <Icon className="size-[18px]" />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
