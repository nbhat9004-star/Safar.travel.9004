'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Instagram, Facebook, Twitter, Linkedin, MapPin, Mail, ArrowUpRight } from 'lucide-react';

const exploreLinks = [
  { label: 'Explore stays', href: '/explore' },
  { label: 'Experiences', href: '/explore?cat=experience' },
  { label: 'Bikes & cars', href: '/explore?cat=transport' },
  { label: 'Tour guides', href: '/explore?cat=tour' },
  { label: 'Become a host', href: '/add-listing' },
];

const supportLinks = [
  { label: 'About us', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Help centre', href: '/help' },
  { label: 'Privacy policy', href: '/privacy' },
  { label: 'Terms & conditions', href: '/terms' },
  { label: 'Cancellation policy', href: '/cancellation-policy' },
];

const socialLinks = [
  { label: 'Instagram', href: 'https://instagram.com/safarcurated', Icon: Instagram },
  { label: 'Facebook', href: 'https://facebook.com/safarcurated', Icon: Facebook },
  { label: 'X', href: 'https://twitter.com/safarcurated', Icon: Twitter },
  { label: 'LinkedIn', href: 'https://linkedin.com/company/safarcurated', Icon: Linkedin },
];

export default function Footer() {
  const pathname = usePathname() || '';

  // The shared Footer component is imported by many routes. Keep it off
  // private workspaces and admin screens; show it on public SafarCurated pages.
  const privatePrefixes = ['/admin', '/dashboard', '/auth', '/api', '/present'];
  if (privatePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))) {
    return null;
  }

  return (
    <footer className="relative overflow-hidden bg-[#0b2d24] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -top-32 right-[-5rem] size-[22rem] rounded-full bg-emerald-400/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 left-[-5rem] size-[24rem] rounded-full bg-amber-300/10 blur-3xl" />

      <div className="container relative py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1.1fr]">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-3" aria-label="Safar Curated home">
              <span className="grid size-11 place-items-center rounded-2xl border border-white/15 bg-white/10 text-xl font-bold text-amber-300 shadow-lg">S</span>
              <span>
                <span className="block font-display text-2xl font-bold tracking-tight">Safar Curated</span>
                <span className="block text-[10px] uppercase tracking-[0.25em] text-emerald-100/65">Kashmir · Curated</span>
              </span>
            </Link>
            <p className="mt-5 text-sm leading-7 text-emerald-50/75">
              Discover meaningful stays, local experiences and unforgettable journeys across Kashmir — thoughtfully brought together by people who know the valley.
            </p>
            <div className="mt-5 flex items-center gap-2 text-sm text-emerald-50/75">
              <MapPin className="size-4 shrink-0 text-amber-300" />
              <span>Srinagar, Kashmir, India</span>
            </div>
            <a href="mailto:hello@safarcurated.com" className="mt-2 inline-flex items-center gap-2 text-sm text-emerald-50/75 transition hover:text-amber-200">
              <Mail className="size-4 text-amber-300" />
              hello@safarcurated.com
            </a>
            <div className="mt-6 flex items-center gap-2">
              {socialLinks.map(({ label, href, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-emerald-50/80 transition hover:-translate-y-0.5 hover:border-amber-300/60 hover:bg-white/10 hover:text-amber-200">
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Discover</h2>
            <ul className="mt-5 space-y-3">
              {exploreLinks.map((item) => (
                <li key={item.label}><Link href={item.href} className="text-sm text-emerald-50/70 transition hover:text-white">{item.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Help & information</h2>
            <ul className="mt-5 space-y-3">
              {supportLinks.map((item) => (
                <li key={item.label}><Link href={item.href} className="text-sm text-emerald-50/70 transition hover:text-white">{item.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Our promise</h2>
            <p className="mt-5 text-sm leading-7 text-emerald-50/75">
              A more personal way to experience Kashmir, with local hosts and experiences at the heart of every journey.
            </p>
            <Link href="/about" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-200 transition hover:text-amber-100">
              Get to know us <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-5 md:px-6">
          <p className="text-sm leading-6 text-white/90">
            <span className="font-semibold text-amber-200">SafarCurated.com is owned and operated by Lafqa Ventures Private Limited, India.</span>
            {' '}Safar Curated is the company’s travel marketplace for discovering stays, experiences and local travel services across Kashmir.
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-emerald-50/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Lafqa Ventures Private Limited. All rights reserved.</p>
          <p>Safar Curated is a brand of Lafqa Ventures Private Limited.</p>
        </div>
      </div>
    </footer>
  );
}
