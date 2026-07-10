'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, Compass, Layers, BadgeCheck, User2, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';

export default function CircleNav({ variant = 'default' }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (p) => pathname === p || (p !== '/circle' && pathname?.startsWith(p));

  const links = [
    { href: '/circle/discover', label: 'Discover', icon: Compass },
    { href: '/circle/create', label: 'Create', icon: Sparkles },
    { href: '/circle/studio', label: 'Studio', icon: Layers },
    { href: '/circle/passport', label: 'Passport', icon: User2 },
  ];

  return (
    <>
      <header className={`fixed top-0 inset-x-0 z-40 ${variant === 'transparent' ? '' : 'circle-glass-dark border-b'} `}>
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <Link href="/circle" className="flex items-center gap-2 group">
            <div className="size-9 rounded-2xl grid place-items-center circle-btn-primary">
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

          <div className="flex items-center gap-2">
            <Link href="/circle/create" className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold circle-btn-primary">
              <Sparkles className="size-4" /> Create a Journey
            </Link>
            {user ? (
              <div className="relative">
                <button onClick={() => setMenuOpen(v => !v)}
                  className="size-9 rounded-full circle-glass overflow-hidden grid place-items-center text-xs font-semibold">
                  {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar} alt={user.name} className="size-full object-cover" />
                  ) : (user.name || '?').charAt(0).toUpperCase()}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 circle-glass-dark circle-card p-2 border">
                    <div className="px-3 py-2 text-xs text-white/60">{user.email}</div>
                    <Link href="/circle/passport" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-xl hover:bg-white/10 text-sm">Traveler Passport</Link>
                    <Link href="/circle/studio" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-xl hover:bg-white/10 text-sm">Journey Studio</Link>
                    <Link href="/" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-xl hover:bg-white/10 text-sm">Safar Marketplace</Link>
                    <button onClick={async () => { await logout(); router.push('/circle'); }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-sm text-white/80 flex items-center gap-2">
                      <LogOut className="size-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/?auth=1" className="hidden md:inline-flex circle-btn-ghost px-4 py-2 rounded-full text-sm font-semibold">Sign in</Link>
            )}
            <button onClick={() => setMenuOpen(v => !v)} className="md:hidden size-9 rounded-full circle-glass grid place-items-center">
              {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden circle-glass-dark border-t px-5 py-4 space-y-2">
            {links.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-xl hover:bg-white/10 text-sm">{l.label}</Link>
            ))}
            <Link href="/circle/create" onClick={() => setMenuOpen(false)} className="block px-3 py-3 rounded-xl circle-btn-primary text-center text-sm font-semibold mt-2">
              ✨ Create a Journey
            </Link>
          </div>
        )}
      </header>

      {/* Mobile bottom nav */}
      <div className="circle-bottomnav md:hidden">
        {links.map(l => {
          const Icon = l.icon;
          return (
            <Link key={l.href} href={l.href}
              className={`grid place-items-center px-4 py-2 rounded-full transition-all ${
                isActive(l.href) ? 'circle-btn-primary text-black' : 'text-white/70 hover:text-white'
              }`} aria-label={l.label}>
              <Icon className="size-4" />
            </Link>
          );
        })}
      </div>
    </>
  );
}
