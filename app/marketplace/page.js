'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import {
  Search, ArrowRight, Sparkles, Store,
  Hotel, Home, Ship, Building2, DoorOpen, Palmtree, Building, Tent,
  MapPinned, UserCheck, Compass, Activity,
  Car, Bike, CarTaxiFront, PlaneLanding, PlaneTakeoff,
  Waves, Mountain, Footprints, Rocket, Camera, Utensils, PartyPopper, ShoppingBag,
  ChevronRight,
} from 'lucide-react';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';

// -----------------------------------------------------------------------------
// Marketplace hub — dedicated page for every service Safar Curated offers.
// This page ONLY navigates to the correct category-filtered listing URL on the
// existing /explore route. It does not alter Explore, Build Trip, AI Planner,
// or any backend behaviour. Booking flow remains unchanged.
// -----------------------------------------------------------------------------

// Icon fallbacks — lucide sometimes does not export Taxi in older versions.
// If missing, fall back to Car so the page never fails to import.
const TaxiIcon = CarTaxiFront || Car;

const CATEGORIES = [
  // STAYS
  {
    id: 'hotels',
    title: 'Hotels',
    description: 'Curated boutique & luxury hotels across the valley.',
    href: '/explore?cat=stay&sub=hotel',
    icon: Hotel,
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    group: 'Stays',
    listings: 128,
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'homestays',
    title: 'Homestays',
    description: 'Live with locals in authentic Kashmiri homes.',
    href: '/explore?cat=stay&sub=homestay',
    icon: Home,
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    group: 'Stays',
    listings: 94,
    accent: 'from-amber-500 to-orange-500',
  },
  {
    id: 'houseboats',
    title: 'Houseboats',
    description: 'Iconic Dal & Nigeen Lake floating stays.',
    href: '/explore?cat=stay&sub=houseboat',
    icon: Ship,
    image: 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800&q=80',
    group: 'Stays',
    listings: 62,
    accent: 'from-sky-500 to-blue-500',
  },
  {
    id: 'villas',
    title: 'Villas',
    description: 'Private villas with mountain & garden views.',
    href: '/explore?cat=stay&sub=villa',
    icon: Building2,
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
    group: 'Stays',
    listings: 41,
    accent: 'from-violet-500 to-fuchsia-500',
  },
  {
    id: 'guesthouses',
    title: 'Guest Houses',
    description: 'Comfortable, budget-friendly guest houses.',
    href: '/explore?cat=stay&sub=guesthouse',
    icon: DoorOpen,
    image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80',
    group: 'Stays',
    listings: 76,
    accent: 'from-rose-500 to-pink-500',
  },
  {
    id: 'resorts',
    title: 'Resorts',
    description: 'Full-service alpine and lakeside resorts.',
    href: '/explore?cat=stay&sub=resort',
    icon: Palmtree,
    image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',
    group: 'Stays',
    listings: 38,
    accent: 'from-lime-500 to-green-500',
  },
  {
    id: 'apartments',
    title: 'Apartments',
    description: 'Self-service apartments in prime locations.',
    href: '/explore?cat=stay&sub=apartment',
    icon: Building,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    group: 'Stays',
    listings: 53,
    accent: 'from-indigo-500 to-blue-500',
  },
  {
    id: 'camping',
    title: 'Camping',
    description: 'Alpine campsites and starlit meadow escapes.',
    href: '/explore?cat=stay&sub=camp',
    icon: Tent,
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80',
    group: 'Stays',
    listings: 47,
    accent: 'from-orange-500 to-red-500',
  },

  // TOURS
  {
    id: 'tour-packages',
    title: 'Tour Packages',
    description: 'Multi-day curated Kashmir itineraries.',
    href: '/explore?cat=tour',
    icon: MapPinned,
    image: 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=800&q=80',
    group: 'Tours & Guides',
    listings: 84,
    accent: 'from-emerald-600 to-cyan-600',
  },
  {
    id: 'tour-guides',
    title: 'Tour Guides',
    description: 'Verified local guides for every destination.',
    href: '/explore?cat=tour&sub=guide',
    icon: UserCheck,
    image: 'https://images.unsplash.com/photo-1522199755839-a2bacb67c546?w=800&q=80',
    group: 'Tours & Guides',
    listings: 69,
    accent: 'from-yellow-500 to-amber-500',
  },

  // EXPERIENCES
  {
    id: 'experiences',
    title: 'Experiences',
    description: 'Hand-picked cultural and scenic experiences.',
    href: '/explore?cat=experience',
    icon: Compass,
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
    group: 'Experiences',
    listings: 112,
    accent: 'from-teal-500 to-emerald-500',
  },
  {
    id: 'activities',
    title: 'Activities',
    description: 'Day activities — from skiing to river rafting.',
    href: '/explore?cat=experience&sub=activity',
    icon: Activity,
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
    group: 'Experiences',
    listings: 58,
    accent: 'from-fuchsia-500 to-purple-500',
  },
  {
    id: 'shikara',
    title: 'Shikara Rides',
    description: 'Sunset shikara rides on Dal Lake.',
    href: '/explore?cat=experience&sub=shikara',
    icon: Waves,
    image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&q=80',
    group: 'Experiences',
    listings: 34,
    accent: 'from-cyan-500 to-sky-500',
  },
  {
    id: 'gondola',
    title: 'Gondola Tickets',
    description: 'Gulmarg gondola phase 1 & 2 tickets.',
    href: '/explore?cat=experience&sub=gondola',
    icon: Mountain,
    image: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=800&q=80',
    group: 'Experiences',
    listings: 12,
    accent: 'from-slate-500 to-zinc-500',
  },
  {
    id: 'trekking',
    title: 'Trekking',
    description: 'Great Lakes, Tarsar Marsar and beyond.',
    href: '/explore?cat=experience&sub=trekking',
    icon: Footprints,
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80',
    group: 'Experiences',
    listings: 45,
    accent: 'from-green-600 to-emerald-600',
  },
  {
    id: 'adventure',
    title: 'Adventure Sports',
    description: 'Paragliding, skiing, rafting & more.',
    href: '/explore?cat=experience&sub=adventure',
    icon: Rocket,
    image: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=800&q=80',
    group: 'Experiences',
    listings: 29,
    accent: 'from-red-500 to-rose-500',
  },
  {
    id: 'photography',
    title: 'Photography Tours',
    description: 'Guided photo walks across Kashmir.',
    href: '/explore?cat=experience&sub=photography',
    icon: Camera,
    image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80',
    group: 'Experiences',
    listings: 22,
    accent: 'from-purple-500 to-indigo-500',
  },
  {
    id: 'food',
    title: 'Local Food Experiences',
    description: 'Wazwan tastings & Kashmiri cooking classes.',
    href: '/explore?cat=experience&sub=food',
    icon: Utensils,
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    group: 'Experiences',
    listings: 37,
    accent: 'from-orange-500 to-amber-500',
  },
  {
    id: 'events',
    title: 'Event Spaces',
    description: 'Venues for weddings, retreats & offsites.',
    href: '/explore?cat=experience&sub=events',
    icon: PartyPopper,
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
    group: 'Experiences',
    listings: 18,
    accent: 'from-pink-500 to-rose-500',
  },

  // TRANSPORT
  {
    id: 'car-rental',
    title: 'Car Rental',
    description: 'Self-drive & chauffeured cars, all classes.',
    href: '/explore?cat=transport&sub=car',
    icon: Car,
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
    group: 'Transport',
    listings: 65,
    accent: 'from-blue-500 to-indigo-500',
  },
  {
    id: 'bike-rental',
    title: 'Bike Rental',
    description: 'Bullets, scooters & touring motorcycles.',
    href: '/explore?cat=transport&sub=bike',
    icon: Bike,
    image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80',
    group: 'Transport',
    listings: 48,
    accent: 'from-orange-500 to-red-500',
  },
  {
    id: 'taxi',
    title: 'Taxi Services',
    description: 'Local, outstation & long-distance taxis.',
    href: '/explore?cat=transport&sub=taxi',
    icon: TaxiIcon,
    image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80',
    group: 'Transport',
    listings: 31,
    accent: 'from-yellow-500 to-orange-500',
  },
  {
    id: 'airport-pickup',
    title: 'Airport Pickup',
    description: 'Meet & greet pickups from SXR airport.',
    href: '/explore?cat=transport&sub=airport_pickup',
    icon: PlaneLanding,
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80',
    group: 'Transport',
    listings: 24,
    accent: 'from-sky-500 to-cyan-500',
  },
  {
    id: 'airport-drop',
    title: 'Airport Drop',
    description: 'Reliable drop transfers to SXR airport.',
    href: '/explore?cat=transport&sub=airport_drop',
    icon: PlaneTakeoff,
    image: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=800&q=80',
    group: 'Transport',
    listings: 24,
    accent: 'from-indigo-500 to-violet-500',
  },

  // SHOPPING
  {
    id: 'essentials',
    title: 'Travel Essentials',
    description: 'Gear, souvenirs & Pashmina from local artisans.',
    href: '/explore?cat=shopping',
    icon: ShoppingBag,
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80',
    group: 'Shopping',
    listings: 56,
    accent: 'from-amber-500 to-yellow-500',
  },
];

const GROUPS = ['All', 'Stays', 'Tours & Guides', 'Experiences', 'Transport', 'Shopping'];

export default function MarketplacePage() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATEGORIES.filter((c) => {
      if (group !== 'All' && c.group !== group) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q)
      );
    });
  }, [query, group]);

  const totalListings = CATEGORIES.reduce((s, c) => s + (c.listings || 0), 0);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/30 pb-24 md:pb-16 pt-16 lg:pt-20">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600" />
            <div
              className="absolute inset-0 opacity-25 mix-blend-overlay"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4), transparent 40%), radial-gradient(circle at 80% 60%, rgba(255,215,0,0.3), transparent 40%)',
              }}
            />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519681393784-d120267933ba?w=2000&q=80')] bg-cover bg-center opacity-20" />
          </div>

          <div className="container relative py-14 md:py-20">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/25 px-3.5 py-1.5 text-white text-[12px] font-semibold tracking-wide">
                <Store className="size-3.5 text-amber-300" />
                Safar Curated Marketplace
              </div>
              <h1 className="mt-4 font-display font-bold text-white text-[34px] md:text-[52px] leading-tight tracking-tight drop-shadow-sm">
                Everything Kashmir,<br className="hidden md:block" />{' '}
                <span className="text-amber-300">one curated marketplace.</span>
              </h1>
              <p className="mt-4 text-white/85 text-[15px] md:text-[17px] leading-relaxed max-w-2xl">
                Discover verified stays, guides, rentals and unforgettable experiences —
                all thoughtfully curated by locals.
              </p>

              {/* Search bar */}
              <div className="mt-7 max-w-xl">
                <label className="flex items-center gap-3 bg-white rounded-full shadow-xl shadow-emerald-900/10 px-5 py-3.5 border border-white/50">
                  <Search className="size-5 text-slate-400 shrink-0" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    type="text"
                    placeholder="Search categories — hotels, shikara, guides…"
                    className="flex-1 bg-transparent outline-none text-[15px] text-slate-800 placeholder:text-slate-400"
                    aria-label="Search marketplace categories"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Clear
                    </button>
                  )}
                </label>
              </div>

              {/* Stats strip */}
              <div className="mt-8 flex flex-wrap items-center gap-3 text-white/90">
                <StatChip label="Categories" value={CATEGORIES.length} />
                <StatChip label="Listings" value={`${totalListings}+`} />
                <StatChip label="Verified locals" value="200+" />
              </div>
            </div>
          </div>
        </section>

        {/* Group filter pills */}
        <section className="container -mt-6 md:-mt-8 relative z-10">
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-900/5 border border-slate-100 p-3 md:p-4 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 min-w-max">
              {GROUPS.map((g) => {
                const active = group === g;
                return (
                  <button
                    key={g}
                    onClick={() => setGroup(g)}
                    className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold tracking-tight transition-all active:scale-95 ${
                      active
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                    aria-pressed={active}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Category grid */}
        <section className="container mt-8 md:mt-12">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Browse all services
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {filtered.length} {filtered.length === 1 ? 'category' : 'categories'} available
              </p>
            </div>
            <Link
              href="/explore"
              className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900 hover:gap-2 transition-all"
            >
              Browse everything <ChevronRight className="size-4" />
            </Link>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <Search className="mx-auto size-8 text-slate-300" />
              <p className="mt-3 text-slate-700 font-semibold">No categories match your search</p>
              <p className="mt-1 text-sm text-slate-500">Try a different keyword or clear filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
              {filtered.map((c) => (
                <CategoryCard key={c.id} category={c} />
              ))}
            </div>
          )}
        </section>

        {/* Bottom CTA band */}
        <section className="container mt-14 md:mt-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 p-8 md:p-12">
            <div className="absolute -right-16 -top-16 size-64 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="absolute -left-10 -bottom-16 size-64 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="relative grid md:grid-cols-[1fr,auto] items-center gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-white/90 text-[11px] font-semibold uppercase tracking-wider">
                  <Sparkles className="size-3.5 text-amber-300" /> Plan smarter
                </div>
                <h3 className="mt-3 font-display text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Can&apos;t decide? Let us plan your Kashmir trip.
                </h3>
                <p className="mt-2 text-white/70 text-sm md:text-base max-w-xl">
                  Tell us your dates and budget — we&apos;ll bundle the perfect stay, guide,
                  transport and experiences into a single itinerary.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <Link
                  href="/build-trip"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/50 transition-shadow active:scale-95"
                >
                  <Sparkles className="size-4" /> Build My Trip
                </Link>
                <Link
                  href="/ai-planner"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 backdrop-blur border border-white/25 text-white font-semibold text-sm hover:bg-white/20 transition-colors active:scale-95"
                >
                  Ask AI Planner <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Local animations & hide scrollbar for pill row */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes mp-card-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .mp-card { animation: mp-card-in 0.35s ease-out both; }
      `,
        }}
      />
    </>
  );
}

// ---- Sub-components -------------------------------------------------------

function StatChip({ label, value }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/25 px-3.5 py-1.5">
      <span className="text-white font-bold text-sm">{value}</span>
      <span className="text-white/80 text-xs uppercase tracking-wider">{label}</span>
    </div>
  );
}

function CategoryCard({ category }) {
  const Icon = category.icon || Store;
  return (
    <Link
      href={category.href}
      className="mp-card group relative flex flex-col overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-900/10 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      aria-label={`Browse ${category.title} listings`}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <Image
          src={category.image}
          alt={category.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          unoptimized
        />
        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-tr ${category.accent} opacity-0 group-hover:opacity-30 mix-blend-multiply transition-opacity duration-300`} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />

        {/* Premium icon badge */}
        <div className="absolute top-3 left-3">
          <div className={`size-11 rounded-2xl bg-gradient-to-br ${category.accent} shadow-lg text-white grid place-items-center ring-2 ring-white/60`}>
            <Icon className="size-5" strokeWidth={2.2} />
          </div>
        </div>

        {/* Listings pill */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-slate-800 shadow-sm">
            {category.listings}+ listings
          </span>
        </div>

        {/* Group tag */}
        <div className="absolute bottom-3 left-3">
          <span className="inline-flex items-center rounded-full bg-black/50 backdrop-blur px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
            {category.group}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col p-4">
        <h3 className="font-display font-bold text-slate-900 text-[17px] tracking-tight">
          {category.title}
        </h3>
        <p className="mt-1 text-[13px] leading-snug text-slate-600 line-clamp-2">
          {category.description}
        </p>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[12px] font-semibold text-emerald-700">Explore</span>
          <div className="size-8 rounded-full bg-emerald-50 text-emerald-700 grid place-items-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}
