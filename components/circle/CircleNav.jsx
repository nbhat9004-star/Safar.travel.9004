'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, Compass, Layers, User2, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { signInHref } from '@/lib/circle-api';
import { useEffect, useState } from 'react';

export default function CircleNav({ variant = 'default' }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const isActive = (p) => pathname === p || (p !== '/circle' && pathname?.startsWith(p));

  const links = [
    { href: '/circle/discover', label: 'Discover', icon: Compass },
    { href: '/circle/create', label: 'Create', icon: Sparkles },
    { href: '/circle/studio', label: 'Studio', icon: Layers },
    { href: '/circle/passport', label: 'Passport', icon: User2 },
  ];

  // Body scroll lock while mobile drawer is open — JS-driven so it beats any
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
      // Safety on unmount: always restore.
      body.classList.remove('circle-drawer-open');
      body.style.overflow = '';
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
    };
  }, [menuOpen]);

  // Auto-close drawer + avatar menu on route change.
  useEffect(() => {
    setMenuOpen(false);
    setAvatarOpen(false);
  }, [pathname]);

  const closeDrawer = () => setMenuOpen(false);

  return (
    <>
      <header className={`fixed top-0 inset-x-0 z-40 w-full max-w-full ${variant === 'transparent' ? '' : 'circle-glass-dark border-b'} `}>
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
            {links.map(l => (
              <Link key={l.href} href={l.href}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive(l.href) ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/circle/create" className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold circle-btn-primary">
              <Sparkles className="size-4" /> Create a Journey
            </Link>
            {user ? (
              <div className="relative">
                <button onClick={() => setAvatarOpen(v => !v)}
                  className="size-9 rounded-full circle-glass overflow-hidden grid place-items-center text-xs font-semibold">
                  {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar} alt={user.name} className="size-full object-cover" />
                  ) : (user.name || '?').charAt(0).toUpperCase()}
                </button>
                {avatarOpen && (
                  <div className="absolute right-0 mt-2 w-56 circle-glass-dark circle-card p-2 border">
                    <div className="px-3 py-2 text-xs text-white/60 truncate">{user.email}</div>
                    <Link href="/circle/passport" onClick={() => setAvatarOpen(false)} className="block px-3 py-2 rounded-xl hover:bg-white/10 text-sm">Traveler Passport</Link>
                    <Link href="/circle/studio" onClick={() => setAvatarOpen(false)} className="block px-3 py-2 rounded-xl hover:bg-white/10 text-sm">Journey Studio</Link>
                    <Link href="/" onClick={() => setAvatarOpen(false)} className="block px-3 py-2 rounded-xl hover:bg-white/10 text-sm">Safar Marketplace</Link>
                    <button onClick={async () => { setAvatarOpen(false); await logout(); router.push('/circle'); }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-sm text-white/80 flex items-center gap-2">
                      <LogOut className="size-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href={signInHref(pathname)} className="hidden md:inline-flex circle-btn-ghost px-4 py-2 rounded-full text-sm font-semibold">Sign in</Link>
            )}
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="md:hidden size-9 rounded-full circle-glass grid place-items-center shrink-0"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}>
              {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer — full-screen backdrop + floating panel */}
      {menuOpen && (
        <>
          <div className="circle-drawer-backdrop md:hidden" onClick={closeDrawer} aria-hidden="true" />
          <div className="circle-drawer md:hidden" role="dialog" aria-modal="true" aria-label="Circle navigation">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-[0.22em] text-white/60 font-semibold">Menu</div>
              <button onClick={closeDrawer} className="size-8 rounded-full circle-glass grid place-items-center" aria-label="Close menu">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-1">
              {links.map(l => {
                const Icon = l.icon;
                const active = isActive(l.href);
                return (
                  <Link key={l.href} href={l.href} onClick={closeDrawer}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition ${active ? 'bg-white/10 text-white' : 'text-white/85 hover:bg-white/5'}`}>
                    <Icon className="size-4 opacity-80" /> {l.label}
                  </Link>
                );
              })}
            </div>
            <Link href="/circle/create" onClick={closeDrawer}
              className="mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-full circle-btn-primary text-sm font-semibold">
              <Sparkles className="size-4" /> Create a Journey
            </Link>
            {user ? (
              <button
                onClick={async () => { closeDrawer(); await logout(); router.push('/circle'); }}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full circle-btn-ghost text-sm font-medium">
                <LogOut className="size-4" /> Sign out
              </button>
            ) : (
              <Link href={signInHref(pathname)} onClick={closeDrawer}
                className="mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full circle-btn-ghost text-sm font-medium">
                Sign in
              </Link>
            )}
          </div>
        </>
      )}

      {/* Mobile bottom nav — constant width, only active icon animates */}
      <nav className="circle-bottomnav md:hidden" aria-label="Primary">
        {links.map(l => {
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              data-active={isActive(l.href) ? 'true' : 'false'}
              aria-label={l.label}
              aria-current={isActive(l.href) ? 'page' : undefined}>
              <Icon className="size-[18px]" />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
