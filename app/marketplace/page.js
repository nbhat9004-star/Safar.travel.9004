'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Search, Sparkles, ChevronRight, Filter,
  Hotel, Home, Ship, DoorOpen, Palmtree, Building, Building2, Tent,
  Car, Bike, CarTaxiFront, PlaneLanding, PlaneTakeoff,
  UserCheck, MapPinned, Church,
  Compass, Activity, Waves, CableCar, Footprints, Camera, Utensils,
  ShoppingBag,
  ShieldCheck, BadgeDollarSign, Headset, Heart,
} from 'lucide-react';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import { MARKETPLACE_CATEGORIES, COLOR_MAP } from '@/lib/marketplace-categories';

// Icon lookup so <MARKETPLACE_CATEGORIES>.iconKey drives the actual component.
const ICONS = {
  Hotel, Home, Ship, DoorOpen, Palmtree, Building, Building2, Tent,
  Car, Bike, CarTaxiFront, PlaneLanding, PlaneTakeoff,
  UserCheck, MapPinned, Church,
  Compass, Activity, Waves, CableCar, Footprints, Camera, Utensils,
  ShoppingBag,
};

const TRUST_ITEMS = [
  { icon: ShieldCheck,     color: 'text-emerald-600', bg: 'bg-emerald-50',
    title: 'Verified',      label: 'Listings',    hint: '100% Trusted' },
  { icon: BadgeDollarSign, color: 'text-amber-600',   bg: 'bg-amber-50',
    title: 'Best Price',    label: 'Guarantee',   hint: 'No hidden charges' },
  { icon: Headset,         color: 'text-sky-600',     bg: 'bg-sky-50',
    title: '24/7 Support',  label: "We're here",  hint: 'to help' },
  { icon: Heart,           color: 'text-rose-500',    bg: 'bg-rose-50',
    title: 'Loved by',      label: 'Travelers',   hint: 'Top rated' },
];

export default function MarketplacePage() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MARKETPLACE_CATEGORIES;
    return MARKETPLACE_CATEGORIES.filter((c) => c.title.toLowerCase().includes(q));
  }, [query]);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-white pt-16 lg:pt-20 pb-24 md:pb-16">
        {/* ============================== HERO ============================= */}
        <section
          className="relative overflow-hidden isolate"
          style={{
            background:
              'linear-gradient(115deg, #fff2df 0%, #ffe3c2 38%, #fbcfa4 62%, #f2b98a 100%)',
          }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 w-3/5 sm:w-2/3 md:w-3/5 lg:w-[55%] pointer-events-none opacity-40 sm:opacity-90"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=1800&q=85')",
              backgroundSize: 'cover',
              backgroundPosition: 'center right',
              maskImage:
                'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.05) 10%, rgba(0,0,0,0.6) 45%, black 70%)',
              WebkitMaskImage:
                'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.05) 10%, rgba(0,0,0,0.6) 45%, black 70%)',
            }}
          />

          <div className="container relative z-10 py-10 md:py-16 lg:py-20">
            <div className="max-w-2xl lg:max-w-3xl">
              <div className="text-[11px] md:text-[12px] font-bold tracking-[0.18em] text-amber-600 uppercase">
                Safar Curated Marketplace
              </div>
              <h1 className="mt-3 font-display font-extrabold text-slate-900 tracking-tight leading-[1.08] text-[32px] sm:text-[38px] md:text-[46px] lg:text-[54px]">
                Everything Kashmir,
                <br />
                <span className="text-emerald-600 whitespace-nowrap">one curated</span>{' '}
                <span className="text-emerald-600">marketplace.</span>
              </h1>
              <p className="mt-4 text-slate-700/90 text-[14px] md:text-[16px] leading-relaxed max-w-lg">
                Discover verified stays, guides, transport, experiences and more.
                Curated by locals, trusted by travelers.
              </p>

              <div className="mt-6 md:mt-8 flex items-stretch gap-2 md:gap-3 max-w-xl">
                <label className="flex-1 flex items-center gap-3 bg-white rounded-2xl md:rounded-full shadow-lg shadow-slate-900/[0.06] px-4 md:px-5 py-3 md:py-3.5 ring-1 ring-slate-200/70 focus-within:ring-emerald-500/60 transition">
                  <Search className="size-4 md:size-5 text-slate-400 shrink-0" strokeWidth={2.4} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    type="text"
                    placeholder="Search categories…"
                    className="flex-1 bg-transparent outline-none text-[14px] md:text-[15px] text-slate-800 placeholder:text-slate-400 min-w-0"
                    aria-label="Search marketplace categories"
                  />
                </label>
                <button
                  type="button"
                  aria-label="Focus category grid"
                  className="shrink-0 grid place-items-center rounded-2xl md:rounded-2xl px-3.5 md:px-4 bg-emerald-900 hover:bg-emerald-950 text-white shadow-lg shadow-emerald-900/25 active:scale-95 transition"
                  onClick={() => {
                    const el = document.getElementById('browse-categories');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  <Filter className="size-5" strokeWidth={2.2} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ============================== TRUST STRIP ====================== */}
        <section className="container -mt-2 md:-mt-6 lg:-mt-8 relative z-10">
          <div className="bg-white rounded-2xl shadow-[0_10px_40px_-15px_rgba(15,20,25,0.15)] ring-1 ring-slate-100 p-3 sm:p-4 md:p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {TRUST_ITEMS.map((t) => {
                const Icon = t.icon;
                return (
                  <div key={t.title} className="flex items-center gap-3">
                    <div className={`shrink-0 size-10 md:size-11 rounded-xl ${t.bg} grid place-items-center`}>
                      <Icon className={`size-5 md:size-[22px] ${t.color}`} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] md:text-[14px] font-bold text-slate-900 leading-tight">{t.title}</div>
                      <div className="text-[12px] md:text-[13px] text-slate-700 leading-tight">{t.label}</div>
                      <div className="text-[10.5px] md:text-[11px] text-slate-500 leading-tight mt-0.5">{t.hint}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================ BROWSE CATEGORIES ================== */}
        <section id="browse-categories" className="container mt-10 md:mt-14 scroll-mt-24">
          <div className="mb-5 md:mb-7 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display font-extrabold text-slate-900 tracking-tight text-[24px] md:text-[30px]">
                Browse Categories
              </h2>
              <p className="mt-1 text-[13px] md:text-[15px] text-slate-500">
                {query
                  ? `${filtered.length} ${filtered.length === 1 ? 'category' : 'categories'} matching your search`
                  : `${MARKETPLACE_CATEGORIES.length} categories · every service on Safar Curated`}
              </p>
            </div>
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-[13px] font-semibold text-emerald-700 hover:text-emerald-900"
              >
                Clear
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <Search className="mx-auto size-8 text-slate-300" />
              <p className="mt-3 text-slate-700 font-semibold">No categories match your search</p>
              <p className="mt-1 text-sm text-slate-500">Try a different keyword.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-5">
              {filtered.map((c) => (
                <CategoryCard key={c.slug} c={c} />
              ))}
            </div>
          )}
        </section>

        {/* ============================ AI CTA BAND ======================== */}
        <section className="container mt-10 md:mt-16">
          <div className="relative overflow-hidden rounded-3xl bg-emerald-950 p-5 md:p-8 lg:p-10">
            <div className="absolute inset-0 opacity-30 pointer-events-none" aria-hidden>
              <div className="absolute top-6 left-8 size-1.5 rounded-full bg-amber-300" />
              <div className="absolute bottom-10 left-14 size-1 rounded-full bg-amber-300/70" />
              <div className="absolute top-14 left-20 size-1 rounded-full bg-amber-300/70" />
              <div className="absolute -right-10 -bottom-16 size-44 rounded-full bg-amber-400/10 blur-3xl" />
            </div>

            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5 md:gap-6">
              <div className="flex items-start md:items-center gap-4">
                <div className="shrink-0 size-11 md:size-12 rounded-2xl bg-amber-400/15 border border-amber-300/40 grid place-items-center">
                  <Sparkles className="size-6 md:size-7 text-amber-300" strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-white text-[18px] md:text-[22px] leading-tight tracking-tight">
                    Plan your perfect trip<br className="md:hidden" /> with AI
                  </h3>
                  <p className="mt-1 text-white/70 text-[12.5px] md:text-[14px] leading-relaxed max-w-md">
                    Get personalized recommendations, itineraries and more in seconds.
                  </p>
                </div>
              </div>

              <Link
                href="/ai-planner"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 md:px-7 py-3 md:py-3.5 text-emerald-950 text-[14px] md:text-[15px] font-bold shadow-lg hover:shadow-xl active:scale-95 transition self-start md:self-auto"
              >
                Plan My Trip
                <Sparkles className="size-4 text-amber-500" strokeWidth={2.4} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

// -------- Category tile — links to /marketplace/<slug> (NOT /explore) -------
function CategoryCard({ c }) {
  const Icon = ICONS[c.iconKey] || ShoppingBag;
  const colors = COLOR_MAP[c.color] || COLOR_MAP.slate;

  return (
    <Link
      href={`/marketplace/${c.slug}`}
      className="group relative flex flex-col items-center text-center bg-white rounded-2xl md:rounded-[20px] p-4 md:p-5 pt-5 md:pt-6 pb-3.5 md:pb-4 shadow-[0_6px_24px_-14px_rgba(15,20,25,0.18)] hover:shadow-[0_16px_40px_-16px_rgba(15,20,25,0.22)] ring-1 ring-slate-100 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      aria-label={`Browse ${c.title} listings`}
    >
      <div className={`size-12 md:size-14 rounded-xl md:rounded-2xl ${colors.bg} grid place-items-center`}>
        <Icon className={`size-6 md:size-7 ${colors.text}`} strokeWidth={2.1} />
      </div>
      <h3 className="mt-3 md:mt-4 font-display font-extrabold text-slate-900 text-[14px] md:text-[15.5px] tracking-tight leading-tight">
        {c.title}
      </h3>
      <div className="mt-2 md:mt-3">
        <span className="inline-grid place-items-center size-7 md:size-8 rounded-full bg-slate-50 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
          <ChevronRight className="size-4" strokeWidth={2.4} />
        </span>
      </div>
    </Link>
  );
}
