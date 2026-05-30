'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Menu, Search, Globe, User, Heart, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const NAV = [
  { href: '/explore', label: 'Explore' },
  { href: '/ai-planner', label: 'AI Planner' },
  { href: '/wishlist', label: 'Wishlist' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar({ transparent = false }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const solid = !transparent || scrolled;
  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${solid ? 'bg-white/85 backdrop-blur-xl border-b border-border/60 shadow-[0_4px_30px_-12px_rgba(15,20,25,0.18)]' : 'bg-transparent'}`}
    >
      <div className="container flex h-16 lg:h-20 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="size-9 rounded-xl bg-gradient-emerald grid place-items-center shadow-lg shadow-emerald-900/20">
            <Sparkles className="size-5 text-white" strokeWidth={2.4} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className={`font-display font-bold text-xl ${solid ? 'text-charcoal' : 'text-white'}`}>Safar</span>
            <span className={`text-[10px] uppercase tracking-[0.18em] -mt-0.5 ${solid ? 'text-muted-foreground' : 'text-white/70'}`}>Kashmir, Reimagined</span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${solid ? 'text-charcoal/80 hover:text-charcoal hover:bg-secondary' : 'text-white/85 hover:text-white hover:bg-white/10'}`}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/add-listing" className={`hidden md:inline-flex text-sm font-medium px-4 py-2 rounded-full transition ${solid ? 'text-charcoal hover:bg-secondary' : 'text-white hover:bg-white/10'}`}>Become a Host</Link>
          <Button asChild size="sm" className="hidden md:inline-flex rounded-full bg-gradient-emerald hover:opacity-95 shadow-lg shadow-emerald-900/20 px-4">
            <Link href="/dashboard/traveler"><User className="size-4 mr-1.5" /> Account</Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className={`lg:hidden rounded-full ${solid ? '' : 'text-white hover:bg-white/10'}`}>
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] sm:w-96 p-0">
              <div className="p-6 border-b">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-xl bg-gradient-emerald grid place-items-center"><Sparkles className="size-5 text-white" /></div>
                  <div>
                    <div className="font-display font-bold text-lg">Safar</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Kashmir, Reimagined</div>
                  </div>
                </div>
              </div>
              <div className="p-3">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-secondary text-sm font-medium">
                    {n.label}
                  </Link>
                ))}
                <div className="my-3 h-px bg-border" />
                <Link href="/add-listing" onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-secondary text-sm font-medium">Become a Host</Link>
                <Link href="/dashboard/host" onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-secondary text-sm font-medium">Host Dashboard</Link>
                <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-secondary text-sm font-medium">Admin</Link>
                <Button asChild className="w-full mt-3 rounded-full bg-gradient-emerald">
                  <Link href="/dashboard/traveler" onClick={() => setOpen(false)}><User className="size-4 mr-2" /> Sign in</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.header>
  );
}
