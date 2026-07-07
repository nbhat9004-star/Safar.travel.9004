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
  
  // Full public footer for customers
  return (
    <footer className="relative mt-24 bg-charcoal text-white/80 overflow-hidden">
      <div className="aurora opacity-40" />
      <div className="container relative py-16 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 md:gap-10">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-emerald grid place-items-center"><Sparkles className="size-5 text-white" /></div>
            <div>
              <div className="font-display font-bold text-xl text-white">Safar</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">Kashmir, Reimagined</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/65 leading-relaxed">Authentic Kashmir stays, experiences and AI-powered planning. Built with locals, for travelers.</p>
          <div className="mt-5 flex items-center gap-3 text-white/60">
            <a href="#" className="hover:text-white"><Instagram className="size-5" /></a>
            <a href="#" className="hover:text-white"><Twitter className="size-5" /></a>
            <a href="#" className="hover:text-white"><Facebook className="size-5" /></a>
          </div>
        </div>
        {[{t:'Discover',links:[['Explore Stays','/explore'],['AI Planner','/ai-planner'],['Wishlist','/wishlist'],['About','/about']]},
          {t:'Hosts',links:[['Become a Host','/add-listing'],['Host Dashboard','/dashboard/host'],['Listing Guide','/host-guide'],['Host Tips','/host-tips']]},
          {t:'Support',links:[['Contact','/contact'],['Help Center','/contact'],['Cancellation Policy','/cancellation-policy'],['Trust & Safety','/trust-safety']]}].map((c) => (
          <div key={c.t}>
            <div className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">{c.t}</div>
            <ul className="space-y-2.5 text-sm">
              {c.links.map(([l,h]) => <li key={l}><Link href={h} className="hover:text-white transition">{l}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="relative border-t border-white/10">
        <div className="container py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/55">
          <div className="flex items-center gap-2"><MapPin className="size-3.5" /><span>Srinagar, Jammu &amp; Kashmir, India</span></div>
          <div><span>© 2026 Safar Travel Pvt. Ltd. — Crafted in the Valley.</span></div>
          <div className="flex items-center gap-2"><Mail className="size-3.5" /><span>hello@safar.travel</span></div>
        </div>
      </div>
    </footer>
  );
}
