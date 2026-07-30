'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Search, ArrowRight, Sparkles, ChevronRight, Filter,
  Building2, UserCheck, Car, Mountain, Plane, Camera, Ticket, Store, LayoutGrid,
  ShieldCheck, BadgeDollarSign, Headset, Heart,
  Hotel, Home, Ship, DoorOpen, Palmtree, Building, Tent,
  MapPinned, Compass, Activity, Bike, CarTaxiFront,
  PlaneLanding, PlaneTakeoff, Waves, Footprints, Rocket,
  Utensils, PartyPopper, ShoppingBag, CableCar,
} from 'lucide-react';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';

// -----------------------------------------------------------------------------
// Marketplace hub — redesigned to match the approved reference mockup while
// preserving Safar Curated branding and full responsiveness.
//
// Rules (per user directive):
//   * Every existing marketplace category MUST appear on this page.
//   * Nothing gets renamed, merged, or hidden.
//   * Only redesigns the Marketplace page. No other page touched.
//   * No new deps, no new routes, booking flow untouched.
// -----------------------------------------------------------------------------

// --- 9 primary groups (match reference image exactly) -----------------------
const GROUPS = [
  {
    id: 'stays',
    title: 'Stays',
    desc: 'Hotels, Homestays,\nHouseboats & more',
    icon: Building2,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
    href: '/explore?cat=stay',
    anchor: 'group-stays',
  },
  {
    id: 'guides-tours',
    title: 'Guides & Tours',
    desc: 'Tour Guides, Packages\n& Experiences',
    icon: UserCheck,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-700',
    href: '/explore?cat=tour',
    anchor: 'group-guides-tours',
  },
  {
    id: 'transport',
    title: 'Transport',
    desc: 'Cars, Bikes, Taxis &\nAirport Transfers',
    icon: Car,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    href: '/explore?cat=transport',
    anchor: 'group-transport',
  },
  {
    id: 'activities',
    title: 'Activities',
    desc: 'Adventure, Trekking,\nShikara & more',
    icon: Mountain,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-700',
    href: '/explore?cat=experience&sub=adventure',
    anchor: 'group-activities',
  },
  {
    id: 'airport',
    title: 'Airport Services',
    desc: 'Airport Pickup\n& Drop',
    icon: Plane,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-700',
    href: '/explore?cat=transport&sub=airport_pickup',
    anchor: 'group-airport',
  },
  {
    id: 'experiences',
    title: 'Experiences',
    desc: 'Local Food, Culture\n& more',
    icon: Camera,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    href: '/explore?cat=experience',
    anchor: 'group-experiences',
  },
  {
    id: 'tickets',
    title: 'Tickets & Passes',
    desc: 'Gondola, Attractions\n& Activities',
    icon: CableCar || Ticket,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    href: '/explore?cat=experience&sub=gondola',
    anchor: 'group-tickets',
  },
  {
    id: 'essentials',
    title: 'Essentials',
    desc: 'Everything you need\nfor your trip',
    icon: Store,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-700',
    href: '/explore?cat=shopping',
    anchor: 'group-essentials',
  },
  {
    id: 'all',
    title: 'All Categories',
    desc: 'View all services\non Safar',
    icon: LayoutGrid,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-700',
    href: '#all-services',
    anchor: 'all-services',
  },
];

// --- Full 25-category catalog (no category hidden) --------------------------
const ALL_CATEGORIES = [
  { id: 'hotels',        title: 'Hotels',                group: 'Stays',           icon: Hotel,          color: 'text-emerald-700', bg: 'bg-emerald-50',  href: '/explore?cat=stay&sub=hotel' },
  { id: 'homestays',     title: 'Homestays',             group: 'Stays',           icon: Home,           color: 'text-emerald-700', bg: 'bg-emerald-50',  href: '/explore?cat=stay&sub=homestay' },
  { id: 'houseboats',    title: 'Houseboats',            group: 'Stays',           icon: Ship,           color: 'text-emerald-700', bg: 'bg-emerald-50',  href: '/explore?cat=stay&sub=houseboat' },
  { id: 'villas',        title: 'Villas',                group: 'Stays',           icon: Building2,      color: 'text-emerald-700', bg: 'bg-emerald-50',  href: '/explore?cat=stay&sub=villa' },
  { id: 'guesthouses',   title: 'Guest Houses',          group: 'Stays',           icon: DoorOpen,       color: 'text-emerald-700', bg: 'bg-emerald-50',  href: '/explore?cat=stay&sub=guesthouse' },
  { id: 'resorts',       title: 'Resorts',               group: 'Stays',           icon: Palmtree,       color: 'text-emerald-700', bg: 'bg-emerald-50',  href: '/explore?cat=stay&sub=resort' },
  { id: 'apartments',    title: 'Apartments',            group: 'Stays',           icon: Building,       color: 'text-emerald-700', bg: 'bg-emerald-50',  href: '/explore?cat=stay&sub=apartment' },
  { id: 'camping',       title: 'Camping',               group: 'Stays',           icon: Tent,           color: 'text-emerald-700', bg: 'bg-emerald-50',  href: '/explore?cat=stay&sub=camp' },

  { id: 'tour-packages', title: 'Tour Packages',         group: 'Guides & Tours',  icon: MapPinned,      color: 'text-violet-700',  bg: 'bg-violet-50',   href: '/explore?cat=tour' },
  { id: 'tour-guides',   title: 'Tour Guides',           group: 'Guides & Tours',  icon: UserCheck,      color: 'text-violet-700',  bg: 'bg-violet-50',   href: '/explore?cat=tour&sub=guide' },

  { id: 'experiences',   title: 'Experiences',           group: 'Experiences',     icon: Compass,        color: 'text-rose-600',    bg: 'bg-rose-50',     href: '/explore?cat=experience' },
  { id: 'activities',    title: 'Activities',            group: 'Activities',      icon: Activity,       color: 'text-sky-700',     bg: 'bg-sky-50',      href: '/explore?cat=experience&sub=activity' },
  { id: 'shikara',       title: 'Shikara Rides',         group: 'Activities',      icon: Waves,          color: 'text-sky-700',     bg: 'bg-sky-50',      href: '/explore?cat=experience&sub=shikara' },
  { id: 'gondola',       title: 'Gondola Tickets',       group: 'Tickets & Passes',icon: CableCar,       color: 'text-amber-600',   bg: 'bg-amber-50',    href: '/explore?cat=experience&sub=gondola' },
  { id: 'trekking',      title: 'Trekking',              group: 'Activities',      icon: Footprints,     color: 'text-sky-700',     bg: 'bg-sky-50',      href: '/explore?cat=experience&sub=trekking' },
  { id: 'adventure',     title: 'Adventure Sports',      group: 'Activities',      icon: Rocket,         color: 'text-sky-700',     bg: 'bg-sky-50',      href: '/explore?cat=experience&sub=adventure' },
  { id: 'photography',   title: 'Photography Tours',     group: 'Experiences',     icon: Camera,         color: 'text-rose-600',    bg: 'bg-rose-50',     href: '/explore?cat=experience&sub=photography' },
  { id: 'food',          title: 'Local Food Experiences',group: 'Experiences',     icon: Utensils,       color: 'text-rose-600',    bg: 'bg-rose-50',     href: '/explore?cat=experience&sub=food' },
  { id: 'events',        title: 'Event Spaces',          group: 'Experiences',     icon: PartyPopper,    color: 'text-rose-600',    bg: 'bg-rose-50',     href: '/explore?cat=experience&sub=events' },

  { id: 'car-rental',    title: 'Car Rental',            group: 'Transport',       icon: Car,            color: 'text-orange-600',  bg: 'bg-orange-50',   href: '/explore?cat=transport&sub=car' },
  { id: 'bike-rental',   title: 'Bike Rental',           group: 'Transport',       icon: Bike,           color: 'text-orange-600',  bg: 'bg-orange-50',   href: '/explore?cat=transport&sub=bike' },
  { id: 'taxi',          title: 'Taxi Services',         group: 'Transport',       icon: CarTaxiFront,   color: 'text-orange-600',  bg: 'bg-orange-50',   href: '/explore?cat=transport&sub=taxi' },
  { id: 'airport-pickup',title: 'Airport Pickup',        group: 'Airport Services',icon: PlaneLanding,   color: 'text-teal-700',    bg: 'bg-teal-50',     href: '/explore?cat=transport&sub=airport_pickup' },
  { id: 'airport-drop',  title: 'Airport Drop',          group: 'Airport Services',icon: PlaneTakeoff,   color: 'text-teal-700',    bg: 'bg-teal-50',     href: '/explore?cat=transport&sub=airport_drop' },

  { id: 'essentials',    title: 'Travel Essentials',     group: 'Essentials',      icon: ShoppingBag,    color: 'text-purple-700',  bg: 'bg-purple-50',   href: '/explore?cat=shopping' },
];

const TRUST_ITEMS = [
  { icon: ShieldCheck,      color: 'text-emerald-600', bg: 'bg-emerald-50',
    title: 'Verified',       label: 'Listings',    hint: '100% Trusted' },
  { icon: BadgeDollarSign,  color: 'text-amber-600',   bg: 'bg-amber-50',
    title: 'Best Price',     label: 'Guarantee',   hint: 'No hidden charges' },
  { icon: Headset,          color: 'text-sky-600',     bg: 'bg-sky-50',
    title: '24/7 Support',   label: "We're here",  hint: 'to help' },
  { icon: Heart,            color: 'text-rose-500',    bg: 'bg-rose-50',
    title: 'Loved by',       label: 'Travelers',   hint: 'Top rated' },
];

export default function MarketplacePage() {
  const [query, setQuery] = useState('');

  const filteredAll = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_CATEGORIES;
    return ALL_CATEGORIES.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q),
    );
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
          {/* Landscape image on the right — houseboat + mountains */}
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

              {/* Search + filter */}
              <div className="mt-6 md:mt-8 flex items-stretch gap-2 md:gap-3 max-w-xl">
                <label className="flex-1 flex items-center gap-3 bg-white rounded-2xl md:rounded-full shadow-lg shadow-slate-900/[0.06] px-4 md:px-5 py-3 md:py-3.5 ring-1 ring-slate-200/70 focus-within:ring-emerald-500/60 transition">
                  <Search className="size-4 md:size-5 text-slate-400 shrink-0" strokeWidth={2.4} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    type="text"
                    placeholder="Search services, stays, guides…"
                    className="flex-1 bg-transparent outline-none text-[14px] md:text-[15px] text-slate-800 placeholder:text-slate-400 min-w-0"
                    aria-label="Search marketplace"
                  />
                </label>
                <button
                  type="button"
                  aria-label="Filters"
                  className="shrink-0 grid place-items-center rounded-2xl md:rounded-2xl px-3.5 md:px-4 bg-emerald-900 hover:bg-emerald-950 text-white shadow-lg shadow-emerald-900/25 active:scale-95 transition"
                  onClick={() => {
                    const el = document.getElementById('all-services');
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

        {/* ============================ BROWSE BY CATEGORY ================= */}
        <section className="container mt-10 md:mt-14">
          <div className="mb-5 md:mb-7">
            <h2 className="font-display font-extrabold text-slate-900 tracking-tight text-[24px] md:text-[30px]">
              Browse by Category
            </h2>
            <p className="mt-1 text-[13px] md:text-[15px] text-slate-500">
              Find the perfect service for your journey
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-5">
            {GROUPS.map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
          </div>
        </section>

        {/* ============================ ALL SERVICES ======================= */}
        <section id="all-services" className="container mt-10 md:mt-16 scroll-mt-24">
          <div className="mb-5 md:mb-7 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display font-extrabold text-slate-900 tracking-tight text-[22px] md:text-[28px]">
                All Services
              </h2>
              <p className="mt-1 text-[12.5px] md:text-[14px] text-slate-500">
                Every service available on Safar Curated
                {query ? ` — ${filteredAll.length} match${filteredAll.length === 1 ? '' : 'es'}` : ` — ${ALL_CATEGORIES.length} services`}
              </p>
            </div>
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-[12px] md:text-[13px] font-semibold text-emerald-700 hover:text-emerald-900"
              >
                Clear
              </button>
            )}
          </div>

          {filteredAll.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <Search className="mx-auto size-8 text-slate-300" />
              <p className="mt-3 text-slate-700 font-semibold">No services match your search</p>
              <p className="mt-1 text-sm text-slate-500">Try a different keyword.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {filteredAll.map((c) => (
                <ServiceChip key={c.id} c={c} />
              ))}
            </div>
          )}
        </section>

        {/* ============================ AI CTA BAND ======================== */}
        <section className="container mt-10 md:mt-16">
          <div className="relative overflow-hidden rounded-3xl bg-emerald-950 p-5 md:p-8 lg:p-10">
            {/* subtle sparkle bg */}
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

      {/* Local animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes mp-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .mp-in { animation: mp-in 0.35s ease-out both; }
      `,
        }}
      />
    </>
  );
}

// -------- Category tile — matches reference mockup exactly ------------------
function GroupCard({ group }) {
  const Icon = group.icon;
  const isAnchor = group.href.startsWith('#');

  const inner = (
    <div className="relative h-full flex flex-col items-center text-center bg-white rounded-2xl md:rounded-[20px] p-4 md:p-5 pt-5 md:pt-6 pb-3.5 md:pb-4 shadow-[0_6px_24px_-14px_rgba(15,20,25,0.18)] hover:shadow-[0_16px_40px_-16px_rgba(15,20,25,0.22)] ring-1 ring-slate-100 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 mp-in">
      <div className={`size-12 md:size-14 rounded-xl md:rounded-2xl ${group.iconBg} grid place-items-center`}>
        <Icon className={`size-6 md:size-7 ${group.iconColor}`} strokeWidth={2.1} />
      </div>
      <h3 className="mt-3 md:mt-4 font-display font-extrabold text-slate-900 text-[15px] md:text-[17px] tracking-tight leading-tight">
        {group.title}
      </h3>
      <p className="mt-1 text-[11.5px] md:text-[13px] text-slate-500 leading-snug whitespace-pre-line min-h-[32px] md:min-h-[36px]">
        {group.desc}
      </p>
      <div className="mt-3 md:mt-4">
        <span className="inline-grid place-items-center size-7 md:size-8 rounded-full bg-slate-50 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
          <ChevronRight className="size-4" strokeWidth={2.4} />
        </span>
      </div>
    </div>
  );

  const cls = 'group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl md:rounded-[20px]';

  if (isAnchor) {
    return (
      <a
        href={group.href}
        onClick={(e) => {
          e.preventDefault();
          const el = document.getElementById(group.href.slice(1));
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        aria-label={`View ${group.title}`}
        className={cls}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={group.href} aria-label={`Browse ${group.title}`} className={cls}>
      {inner}
    </Link>
  );
}

// -------- Compact service chip for the "All Services" grid ------------------
function ServiceChip({ c }) {
  const Icon = c.icon;
  return (
    <Link
      href={c.href}
      className="group flex items-center gap-2.5 md:gap-3 rounded-xl md:rounded-2xl bg-white p-2.5 md:p-3 ring-1 ring-slate-100 hover:ring-emerald-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all"
      aria-label={`Browse ${c.title}`}
    >
      <span className={`shrink-0 size-9 md:size-10 rounded-lg md:rounded-xl ${c.bg} grid place-items-center`}>
        <Icon className={`size-4 md:size-5 ${c.color}`} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-900 text-[12.5px] md:text-[13.5px] leading-tight truncate">
          {c.title}
        </span>
        <span className="block text-[10.5px] md:text-[11px] text-slate-500 leading-tight mt-0.5 truncate">
          {c.group}
        </span>
      </span>
      <ChevronRight className="size-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}
