'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Menu, User, UserPlus, Sparkles, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AuthButtons, MobileAuthButtons } from '@/components/safar/AuthButtons';

const NAV = [
  { href: '/explore?cat=all',         label: 'Stays' },
  { href: '/explore?cat=experience',  label: 'Experiences' },
  { href: '/explore?cat=transport',   label: 'Bikes & Cars' },
  { href: '/explore?cat=tour',        label: 'Tour Guides' },
  { href: '/ai-planner',              label: 'AI Planner' },
  { href: '/add-listing',             label: 'Become a Host' },
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
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${solid ? 'glass-nav border-b border-border/60 shadow-[0_4px_30px_-12px_rgba(15,20,25,0.18)]' : 'bg-transparent'}`}
    >
      <div className="container flex h-16 lg:h-20 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="size-10 rounded-2xl bg-gradient-emerald grid place-items-center shadow-lg shadow-emerald2/25 ring-1 ring-white/20">
            <MapPin className="size-5 text-gold" strokeWidth={2.4} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className={`font-display font-bold text-xl tracking-tight ${solid ? 'text-charcoal' : 'text-white'}`}>Safar</span>
            <span className={`text-[10px] uppercase tracking-[0.22em] -mt-0.5 ${solid ? 'text-muted-foreground' : 'text-white/70'}`}>Kashmir · Curated</span>
          </div>
        </Link>

        <nav className="hidden xl:flex items-center gap-0.5">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={`px-3.5 py-2 rounded-full text-[13.5px] font-medium tracking-tight transition-colors ${solid ? 'text-charcoal/80 hover:text-charcoal hover:bg-secondary' : 'text-white/85 hover:text-white hover:bg-white/10'}`}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <AuthButtons solid={solid} />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className={`xl:hidden rounded-full ${solid ? '' : 'text-white hover:bg-white/10'}`}>
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[90vw] sm:w-[420px] p-0 bg-background">
              <div className="p-6 border-b">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-2xl bg-gradient-emerald grid place-items-center shadow-md"><MapPin className="size-5 text-gold" /></div>
                  <div>
                    <div className="font-display font-bold text-lg">Safar</div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Kashmir · Curated</div>
                  </div>
                </div>
              </div>
              <div className="p-3 max-h-[calc(100vh-180px)] overflow-y-auto">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-secondary text-[15px] font-medium transition">
                    {n.label}
                  </Link>
                ))}
                <div className="my-3 h-px bg-border" />
                <Link href="/dashboard/host" onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-secondary text-sm">Host Dashboard</Link>
                <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-secondary text-sm">Admin</Link>
              </div>
              <div className="p-4 border-t flex flex-col gap-2 safe-bottom">
                <MobileAuthButtons onClose={()=>setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.header>
  );
}
