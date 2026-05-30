import Link from 'next/link';
import { Sparkles, Instagram, Twitter, Facebook, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative mt-24 bg-charcoal text-white/80 overflow-hidden">
      <div className="aurora opacity-40" />
      <div className="container relative py-16 grid md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
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
          {t:'Hosts',links:[['Become a Host','/add-listing'],['Host Dashboard','/dashboard/host'],['Listing Tips','/about'],['Admin','/admin']]},
          {t:'Support',links:[['Contact','/contact'],['Help Center','/contact'],['Cancellation Policy','/about'],['Trust & Safety','/about']]}].map((c) => (
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
