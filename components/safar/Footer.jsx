'use client';
import Link from 'next/link';
import { Sparkles, Instagram, Twitter, Facebook, Mail, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function Footer() {
  const { user } = useAuth();
  
  // Minimal footer for admin users
  if (user?.role === 'admin' || user?.role === 'super_admin') {
    return (
      <footer className="relative mt-12 border-t bg-white">
        <div className="container relative py-6 text-center">
          <div className="text-sm text-muted-foreground font-medium">
            Safar Curated
          </div>
        </div>
      </footer>
    );
  }
  
  // Minimal public footer — Module 11A restructure. Informational links moved
  // into the Header "More" menu; host resources moved into the Host Dashboard.
  return (
    <footer className="relative mt-24 bg-charcoal text-white/80 overflow-hidden">
      <div className="aurora opacity-40" />
      <div className="container relative py-14 md:py-16">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="max-w-md flex flex-col items-center">
            <div className="flex items-center gap-2 justify-center">
              <div className="size-9 rounded-xl bg-gradient-emerald grid place-items-center"><Sparkles className="size-5 text-white" /></div>
              <div className="text-center">
                <div className="font-display font-bold text-xl text-white">Safar</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">Kashmir · Curated</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-white/65 leading-relaxed text-center">
              Discover authentic Kashmir through trusted local hosts.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 text-sm">
            <div className="flex items-center justify-center gap-4 text-white/70">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-white transition p-2 -m-2 touch-manipulation"><Instagram className="size-5" /></a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-white transition p-2 -m-2 touch-manipulation"><Facebook className="size-5" /></a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="hover:text-white transition p-2 -m-2 touch-manipulation"><Twitter className="size-5" /></a>
            </div>
            <div className="flex items-center justify-center gap-2 text-white/70"><MapPin className="size-3.5" /><span>Srinagar, Jammu &amp; Kashmir, India</span></div>
            <a href="mailto:hello@safarcurated.com" className="flex items-center justify-center gap-2 text-white/70 hover:text-white transition"><Mail className="size-3.5" /><span>hello@safarcurated.com</span></a>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="container py-5 flex flex-col items-center justify-center gap-3 text-xs text-white/55 text-center">
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/privacy-policy" className="hover:text-white transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms &amp; Conditions</Link>
            <Link href="/refund-policy" className="hover:text-white transition">Refund Policy</Link>
            <Link href="/cookies" className="hover:text-white transition">Cookies</Link>
          </nav>
          <div className="text-center">
            © 2026 Safar &mdash; Managed by Lafqa Ventures Pvt. Ltd.
          </div>
        </div>
      </div>
    </footer>
  );
}
