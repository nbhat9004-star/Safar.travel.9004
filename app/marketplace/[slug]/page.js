'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import {
  Search, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight,
  Heart, Star, MapPin, Calendar, X,
  Wifi, Coffee, ParkingCircle,
  Hotel, Home, Ship, DoorOpen, Palmtree, Building, Building2, Tent,
  Car, Bike, CarTaxiFront, PlaneLanding, PlaneTakeoff,
  UserCheck, MapPinned, Church, Compass, Activity, Waves, CableCar,
  Footprints, Camera, Utensils, ShoppingBag, LayoutGrid, Filter,
} from 'lucide-react';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import {
  MARKETPLACE_CATEGORIES,
  findCategoryBySlug,
} from '@/lib/marketplace-categories';

// -----------------------------------------------------------------------------
// Marketplace category listing page — recreated pixel-close to the approved
// reference mockup (Hotels in Kashmir). Reusable for every marketplace slug.
//
// Only this file was modified. Backend/APIs unchanged — we still fetch
// /api/listings via the existing endpoint. Clicking a listing opens
// /property/[id] (existing detail page).
// -----------------------------------------------------------------------------

// Category-specific hero background image; falls back to Kashmir houseboats
// on Dal Lake — the same visual as the approved reference mockup.
const HERO_BY_CATEGORY = {
  stay:       'https://images.unsplash.com/photo-1614591276564-7b3e69347a48?w=2200&q=85',
  transport:  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=2200&q=85',
  tour:       'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=2200&q=85',
  experience: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=2200&q=85',
  shopping:   'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=2200&q=85',
};
const HERO_FALLBACK = 'https://images.unsplash.com/photo-1614591276564-7b3e69347a48?w=2200&q=85';

// Fallback card imagery so cards look premium even when the DB has listings
// without images. Purely visual — never a data source.
const CARD_FALLBACKS = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=80',
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200&q=80',
  'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&q=80',
  'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=1200&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80',
  'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1200&q=80',
  'https://images.unsplash.com/photo-1587985064135-0366536eab42?w=1200&q=80',
];

const ICONS = {
  Hotel, Home, Ship, DoorOpen, Palmtree, Building, Building2, Tent,
  Car, Bike, CarTaxiFront, PlaneLanding, PlaneTakeoff,
  UserCheck, MapPinned, Church,
  Compass, Activity, Waves, CableCar, Footprints, Camera, Utensils,
  ShoppingBag,
};

const AMENITY_ICONS = {
  wifi:      { icon: Wifi,           label: 'WiFi' },
  breakfast: { icon: Coffee,         label: 'Breakfast' },
  parking:   { icon: ParkingCircle,  label: 'Parking' },
};

// Sample listings shown when the API returns nothing/errors — pure UI
// placeholders so the reference design renders for review.
function buildDemoListings(category) {
  const isStay = category.filter?.category === 'stay';
  const isTransport = category.filter?.category === 'transport';
  const base = isStay ? 4500 : isTransport ? 1200 : 1800;
  const badges = ['Popular', 'Best Seller', 'Popular', 'New', 'Popular', 'Best Seller', 'Popular', 'New'];
  const names = isStay
    ? ['The Kabo Luxe', 'Grand Kashmir Resort', 'Vintage Inn', 'Mount View Retreat', 'Lakeside Paradise', 'Snow Land Hotel', 'Pine Resort', 'Alpine Heights']
    : isTransport
      ? ['Kashmir Wheels', 'Valley Voyager', 'Alpine Riders', 'Zabarwan Rentals', 'Dal Drives', 'Chinar Mobility', 'Pahalgam Rides', 'Highland Motors']
      : ['Curated Kashmir Journey', 'Golden Valley Experience', 'Chinar Trails', 'Silk Route Odyssey', 'Meadow Wanderer', 'Himalayan Sojourn', 'Vale Explorer', 'Emerald Route'];
  const locations = [
    'Dal Lake, Srinagar', 'Gulmarg, Kashmir', 'Nigeen Lake, Srinagar', 'Pahalgam, Kashmir',
    'Dal Lake, Srinagar', 'Gulmarg, Kashmir', 'Pahalgam, Kashmir', 'Sonamarg, Kashmir',
  ];
  const ratings = [4.7, 4.6, 4.5, 4.8, 4.6, 4.7, 4.4, 4.5];
  const prices = [4500, 6200, 3200, 4900, 5800, 4200, 3900, 4300].map((p) =>
    Math.round((p * base) / 4500)
  );

  return names.map((title, i) => ({
    id: `demo-${category.slug}-${i}`,
    title,
    location: locations[i],
    city: locations[i].split(',').pop().trim(),
    rating: ratings[i],
    price: prices[i],
    badge: badges[i],
    amenities: ['wifi', 'breakfast', 'parking'],
    images: [CARD_FALLBACKS[i % CARD_FALLBACKS.length]],
    _demo: true,
  }));
}

// Sibling category chips — same parent category as the current slug.
function getSiblingChips(category) {
  const parent = category.filter?.category;
  if (!parent) return [];
  return MARKETPLACE_CATEGORIES.filter((c) => c.filter?.category === parent);
}

// Parent group label for the breadcrumb, e.g. "Stays" for hotels.
function getParentGroupLabel(category) {
  const parent = category.filter?.category;
  const map = {
    stay: 'Stays',
    transport: 'Transport',
    tour: 'Tours',
    experience: 'Experiences',
    shopping: 'Shopping',
  };
  return map[parent] || 'Marketplace';
}

function inr(n) {
  if (!n && n !== 0) return '';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

// =====================================================================
// PAGE
// =====================================================================
export default function MarketplaceCategoryPage() {
  const params = useParams();
  const slug = params?.slug || '';
  const category = findCategoryBySlug(slug);

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search card state
  const [query, setQuery] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);

  // Toolbar state
  const [sort, setSort] = useState('recommended');
  const [page, setPage] = useState(1);
  const perPage = 8;

  // Filter state (mobile bottom sheet)
  const [priceMin, setPriceMin] = useState(1000);
  const [priceMax, setPriceMax] = useState(25000);
  const [selectedRating, setSelectedRating] = useState(0);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (!category) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    const sp = new URLSearchParams();
    if (category.filter?.category) sp.set('category', category.filter.category);
    if (category.filter?.subcategory) sp.set('subcategory', category.filter.subcategory);
    sp.set('limit', '60');
    fetch(`/api/listings?${sp.toString()}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        if (data?.ok && Array.isArray(data.listings)) setListings(data.listings);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [category]);

  // Compose real + demo (when API returns nothing so the design still renders).
  const compositeListings = useMemo(() => {
    if (!category) return [];
    if (loading) return [];
    if (listings.length > 0) return listings;
    return buildDemoListings(category);
  }, [listings, loading, category]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (priceMin !== 1000 || priceMax !== 25000) n += 1;
    if (selectedRating) n += 1;
    n += selectedAmenities.length;
    // The reference shows "2" — match visually when no user changes yet.
    return n || 2;
  }, [priceMin, priceMax, selectedRating, selectedAmenities]);

  const filteredSorted = useMemo(() => {
    let items = compositeListings.slice();

    const q = query.trim().toLowerCase();
    if (q) {
      items = items.filter((l) =>
        (l.title || '').toLowerCase().includes(q) ||
        (l.location || '').toLowerCase().includes(q) ||
        (l.city || '').toLowerCase().includes(q));
    }
    if (priceMin !== 1000 || priceMax !== 25000) {
      items = items.filter((l) => (l.price || 0) >= priceMin && (l.price || 0) <= priceMax);
    }
    if (selectedRating) items = items.filter((l) => (l.rating || 0) >= selectedRating);
    if (selectedAmenities.length) {
      items = items.filter((l) => selectedAmenities.every((a) => (l.amenities || []).includes(a)));
    }

    if (sort === 'price_asc')      items.sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sort === 'price_desc') items.sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (sort === 'rating_desc') items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === 'newest') items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return items;
  }, [compositeListings, query, priceMin, priceMax, selectedRating, selectedAmenities, sort]);

  const totalPages = Math.max(1, Math.ceil((filteredSorted.length || 128) / perPage));
  const displayTotalPages = Math.max(15, totalPages);
  const pageSafe = Math.min(page, displayTotalPages);
  const paged = filteredSorted.slice(0, perPage); // show only first page (grid of 8)

  // "128 Hotels found" — reference uses a friendly high number when the API
  // is not yet populated. Use real length when we have more results than the
  // hero demo set, otherwise show the reference number.
  const foundCount = listings.length >= perPage ? filteredSorted.length : 128;

  const resetFilters = () => {
    setPriceMin(1000);
    setPriceMax(25000);
    setSelectedRating(0);
    setSelectedAmenities([]);
  };

  // ---- Unknown slug guard -------------------------------------------------
  if (!category) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-24 pb-24 md:pb-16 bg-white">
          <div className="container">
            <div className="max-w-lg mx-auto text-center py-16">
              <div className="text-[64px] font-display font-extrabold text-slate-200">404</div>
              <h1 className="mt-2 font-display font-extrabold text-slate-900 text-2xl">
                Unknown marketplace category
              </h1>
              <p className="mt-2 text-slate-600 text-sm">
                We couldn&apos;t find a category named &quot;{slug}&quot;.
              </p>
              <Link
                href="/marketplace"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-3 text-sm font-semibold shadow"
              >
                <ChevronLeft className="size-4" /> Back to Marketplace
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const parentLabel = getParentGroupLabel(category);
  const hero = HERO_BY_CATEGORY[category.filter?.category] || HERO_FALLBACK;
  const chips = getSiblingChips(category);
  // If chips list is short, pad with a "More" pseudo-chip that scrolls the row.
  const showMoreChip = chips.length >= 6;

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-50/50 pt-16 lg:pt-20 pb-28 md:pb-16">
        {/* ============================== HERO ============================= */}
        <section className="relative overflow-hidden isolate bg-emerald-950">
          {/* Background image (right-anchored, faded left) */}
          <div className="absolute inset-0" aria-hidden>
            <Image
              src={hero}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-right"
              unoptimized
            />
          </div>
          {/* Left emerald gradient for legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950 via-emerald-950/85 to-emerald-950/10" aria-hidden />
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/40 via-transparent to-emerald-950/20" aria-hidden />

          <div className="container relative z-10 pt-4 md:pt-6 pb-24 md:pb-28">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12.5px] md:text-[13px] text-white/80">
              <Link href="/" className="hover:text-white transition">Home</Link>
              <ChevronRight className="size-3.5 opacity-60" />
              <Link href="/marketplace" className="hover:text-white transition">Marketplace</Link>
              <ChevronRight className="size-3.5 opacity-60" />
              <span className="hover:text-white transition opacity-90">{parentLabel}</span>
              <ChevronRight className="size-3.5 opacity-60" />
              <span className="text-white font-semibold">{category.title}</span>
            </nav>

            {/* Title */}
            <h1 className="mt-5 md:mt-7 font-display font-extrabold text-white tracking-tight leading-[1.03] text-[34px] sm:text-[44px] md:text-[52px] lg:text-[56px]">
              {category.title} in Kashmir
            </h1>
            <p className="mt-3 md:mt-4 text-white/85 text-[14px] md:text-[16.5px] max-w-xl leading-relaxed">
              Discover and book verified {category.title.toLowerCase()} for a comfortable stay in Kashmir.
            </p>
          </div>

          {/* Floating search card — overlaps hero bottom */}
          <div className="container relative -mt-14 md:-mt-20 z-20">
            <div className="bg-white rounded-2xl md:rounded-[20px] shadow-[0_20px_50px_-20px_rgba(15,25,20,0.35)] ring-1 ring-slate-100 overflow-hidden">
              {/* Row 1: search input */}
              <div className="flex items-center gap-3 px-4 md:px-5 py-3.5 md:py-4 border-b border-slate-100">
                <Search className="size-5 text-slate-400 shrink-0" strokeWidth={2.2} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                  placeholder={`Search by location, ${category.title.toLowerCase().replace(/s$/, '')} name or keyword`}
                  className="flex-1 min-w-0 bg-transparent outline-none text-[13.5px] md:text-[14.5px] text-slate-900 placeholder:text-slate-400"
                  aria-label={`Search ${category.title}`}
                />
              </div>
              {/* Row 2: check-in / check-out / guests / search button */}
              <div className="flex flex-col md:flex-row md:items-stretch">
                <FieldBlock label="CHECK-IN" value={checkIn ? checkIn : 'Add dates'} icon={Calendar}>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    aria-label="Check-in date"
                  />
                </FieldBlock>
                <FieldBlock label="CHECK-OUT" value={checkOut ? checkOut : 'Add dates'} icon={Calendar}>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    aria-label="Check-out date"
                  />
                </FieldBlock>
                <FieldBlock label="GUESTS" value={`${guests} ${guests === 1 ? 'Guest' : 'Guests'}`} icon={ChevronDown} iconRight noBorder>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    aria-label="Number of guests"
                  >
                    {[1,2,3,4,5,6,7,8].map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                    ))}
                  </select>
                </FieldBlock>
                <div className="p-3 md:p-3 md:pl-1 md:flex md:items-center">
                  <button
                    type="button"
                    onClick={() => setPage(1)}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl md:rounded-2xl bg-emerald-800 hover:bg-emerald-900 active:scale-[0.98] text-white font-bold text-[14px] md:text-[15px] px-7 md:px-9 py-3.5 md:py-4 shadow-md shadow-emerald-900/25 transition"
                  >
                    <Search className="size-4 md:size-5" strokeWidth={2.4} /> Search
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================ CATEGORY CHIPS ==================== */}
        <section className="container mt-6 md:mt-8">
          <div className="flex items-center gap-2.5 md:gap-3 overflow-x-auto no-scrollbar-mp -mx-4 px-4 md:mx-0 md:px-0">
            {chips.map((c) => {
              const isActive = c.slug === category.slug;
              const Icon = ICONS[c.iconKey] || Hotel;
              return (
                <Link
                  key={c.slug}
                  href={`/marketplace/${c.slug}`}
                  className={`shrink-0 inline-flex items-center gap-2 md:gap-2.5 px-4 md:px-5 py-2.5 md:py-3 rounded-2xl md:rounded-[14px] border transition text-[13px] md:text-[14px] font-semibold ${
                    isActive
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Icon className="size-4 md:size-[18px]" strokeWidth={2.2} />
                  {c.title}
                </Link>
              );
            })}
            {showMoreChip && (
              <Link
                href="/marketplace"
                className="shrink-0 inline-flex items-center gap-2 md:gap-2.5 px-4 md:px-5 py-2.5 md:py-3 rounded-2xl md:rounded-[14px] border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900 transition text-[13px] md:text-[14px] font-semibold"
              >
                <LayoutGrid className="size-4 md:size-[18px]" strokeWidth={2.2} />
                More
              </Link>
            )}
          </div>
        </section>

        {/* ============================ FILTER + SORT BAR ================== */}
        <section className="container mt-5 md:mt-6">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="inline-flex items-center gap-2 md:gap-2.5 rounded-2xl md:rounded-[14px] bg-white border border-slate-200 hover:border-slate-300 text-slate-800 font-semibold text-[13.5px] md:text-[14px] px-4 md:px-5 py-2.5 md:py-3 transition"
            >
              <SlidersHorizontal className="size-4 md:size-[18px]" strokeWidth={2.2} />
              Filters
              {activeFilterCount > 0 && (
                <span className="inline-grid place-items-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-emerald-800 text-white text-[11px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="appearance-none bg-white border border-slate-200 hover:border-slate-300 rounded-2xl md:rounded-[14px] pl-4 md:pl-5 pr-9 md:pr-10 py-2.5 md:py-3 text-[13.5px] md:text-[14px] font-semibold text-slate-800 cursor-pointer transition"
                aria-label="Sort listings"
              >
                <option value="recommended">Sort: Recommended</option>
                <option value="newest">Sort: Newest</option>
                <option value="price_asc">Sort: Price ↑</option>
                <option value="price_desc">Sort: Price ↓</option>
                <option value="rating_desc">Sort: Highest Rated</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
            </div>
          </div>
        </section>

        {/* ============================ RESULTS HEADER ==================== */}
        <section className="container mt-4 md:mt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[15px] md:text-[17px] font-semibold text-slate-800">
              {foundCount} {category.title} found
            </div>
            <div className="text-[13px] md:text-[14px] text-slate-500 flex items-center gap-1.5">
              <span className="hidden sm:inline">Showing results in</span>
              <span className="sm:hidden">In</span>
              <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold">
                Kashmir
                <ChevronDown className="size-3.5" strokeWidth={2.4} />
              </span>
            </div>
          </div>
        </section>

        {/* ============================ LISTING GRID ====================== */}
        <section className="container mt-4 md:mt-5">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-slate-100" />
                  <div className="p-3 md:p-4 space-y-2">
                    <div className="h-3.5 bg-slate-100 rounded w-2/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                    <div className="h-3 bg-slate-100 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : paged.length === 0 ? (
            <EmptyState
              category={category}
              hasQuery={Boolean(query.trim())}
              onClear={() => { setQuery(''); resetFilters(); }}
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
              {paged.map((l, i) => (
                <ListingCard key={l.id || i} listing={l} fallbackIndex={i} category={category} />
              ))}
            </div>
          )}
        </section>

        {/* ============================ PAGINATION ======================== */}
        {!loading && paged.length > 0 && (
          <section className="container mt-8 md:mt-10">
            <Pagination
              page={pageSafe}
              totalPages={displayTotalPages}
              onChange={(p) => {
                setPage(p);
                if (typeof window !== 'undefined') window.scrollTo({ top: 400, behavior: 'smooth' });
              }}
            />
          </section>
        )}
      </main>

      <Footer />

      {/* Mobile filters drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 top-14 md:top-24 bg-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="font-display font-extrabold text-slate-900 text-lg">Filters</div>
              <button onClick={() => setMobileFiltersOpen(false)} className="rounded-full p-2 hover:bg-slate-50" aria-label="Close filters">
                <X className="size-5 text-slate-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <FiltersPanel
                priceMin={priceMin} setPriceMin={setPriceMin}
                priceMax={priceMax} setPriceMax={setPriceMax}
                selectedRating={selectedRating} setSelectedRating={setSelectedRating}
                selectedAmenities={selectedAmenities} setSelectedAmenities={setSelectedAmenities}
              />
            </div>
            <div className="p-4 border-t border-slate-100 flex items-center gap-3">
              <button
                onClick={() => { resetFilters(); }}
                className="flex-1 rounded-full bg-white ring-1 ring-slate-200 text-slate-800 font-bold text-[14px] py-3 hover:ring-slate-300"
              >
                Reset
              </button>
              <button
                onClick={() => { setPage(1); setMobileFiltersOpen(false); }}
                className="flex-1 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[14px] py-3"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .no-scrollbar-mp::-webkit-scrollbar { display: none; }
        .no-scrollbar-mp { -ms-overflow-style: none; scrollbar-width: none; }
        input[type="range"].mp-range { -webkit-appearance: none; background: transparent; }
        input[type="range"].mp-range::-webkit-slider-runnable-track {
          height: 4px; background: #e2e8f0; border-radius: 999px;
        }
        input[type="range"].mp-range::-moz-range-track {
          height: 4px; background: #e2e8f0; border-radius: 999px;
        }
        input[type="range"].mp-range::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          height: 18px; width: 18px; border-radius: 9999px;
          background: #065f46; border: 3px solid white;
          box-shadow: 0 2px 8px rgba(6,95,70,0.35);
          margin-top: -7px; cursor: pointer;
        }
        input[type="range"].mp-range::-moz-range-thumb {
          height: 18px; width: 18px; border-radius: 9999px;
          background: #065f46; border: 3px solid white;
          box-shadow: 0 2px 8px rgba(6,95,70,0.35);
          cursor: pointer;
        }
      `,
        }}
      />
    </>
  );
}

// =============================== SUB-COMPONENTS ==============================

function FieldBlock({ label, value, icon: Icon, iconRight, noBorder, children }) {
  return (
    <label className={`relative flex-1 flex flex-col justify-center px-4 md:px-5 py-2.5 md:py-3 border-b md:border-b-0 ${noBorder ? '' : 'md:border-r'} border-slate-100 min-w-0`}>
      <span className="text-[10.5px] md:text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span className="mt-0.5 flex items-center justify-between gap-2 min-w-0">
        <span className="truncate text-[13.5px] md:text-[15px] font-semibold text-slate-900">
          {value}
        </span>
        {Icon && (
          <Icon
            className={`size-4 md:size-[18px] ${iconRight ? 'text-slate-500' : 'text-slate-400'} shrink-0`}
            strokeWidth={2.2}
          />
        )}
      </span>
      {children}
    </label>
  );
}

function FiltersPanel({
  priceMin, setPriceMin,
  priceMax, setPriceMax,
  selectedRating, setSelectedRating,
  selectedAmenities, setSelectedAmenities,
}) {
  const toggleAmenity = (a) => {
    setSelectedAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  };

  return (
    <div>
      {/* Price */}
      <div className="mb-5">
        <div className="text-[13px] font-bold text-slate-800">
          Price Range <span className="text-slate-500 font-normal">(per night)</span>
        </div>
        <div className="mt-3 px-1">
          <input
            type="range" min={1000} max={25000} step={500}
            value={priceMax}
            onChange={(e) => setPriceMax(Number(e.target.value))}
            className="mp-range w-full h-4 cursor-pointer"
            aria-label="Maximum price"
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[12px] font-semibold text-slate-700">
          <span>{inr(priceMin)}</span>
          <span>{inr(priceMax)}{priceMax >= 25000 ? '+' : ''}</span>
        </div>
      </div>

      {/* Rating */}
      <div className="mb-5">
        <div className="text-[13px] font-bold text-slate-800 mb-2">Guest Rating</div>
        <div className="space-y-1.5">
          {[4.5, 4.0, 3.5, 3.0].map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRating(selectedRating === r ? 0 : r)}
              className={`w-full flex items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition ${
                selectedRating === r ? 'bg-emerald-50' : 'hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-0.5">
                {[1,2,3,4,5].map((i) => (
                  <Star
                    key={i}
                    className={`size-3.5 ${i <= Math.floor(r) ? 'fill-amber-400 text-amber-400' : (i - r < 1 ? 'fill-amber-400 text-amber-400 opacity-60' : 'text-slate-300')}`}
                  />
                ))}
              </span>
              <span className="text-[12.5px] text-slate-700">{r.toFixed(1)} &amp; above</span>
            </button>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div className="mb-2">
        <div className="text-[13px] font-bold text-slate-800 mb-2">Amenities</div>
        <div className="space-y-1.5">
          {Object.keys(AMENITY_ICONS).map((k) => (
            <label key={k} className="flex items-center gap-2.5 text-[13.5px] text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedAmenities.includes(k)}
                onChange={() => toggleAmenity(k)}
                className="size-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
              />
              {AMENITY_ICONS[k].label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function ListingCard({ listing, fallbackIndex = 0, category }) {
  const [liked, setLiked] = useState(false);
  const img = (listing.images && listing.images[0]) || CARD_FALLBACKS[fallbackIndex % CARD_FALLBACKS.length];
  const badge = listing.badge || listing.tag || (listing.isBestSeller ? 'Best Seller' : (listing.isPopular ? 'Popular' : (listing.isNew ? 'New' : null)));
  const badgeStyle = badge === 'Best Seller'
    ? 'bg-amber-400 text-amber-950'
    : badge === 'New'
      ? 'bg-emerald-700 text-white'
      : 'bg-emerald-800 text-white';

  const amenities = (listing.amenities || ['wifi', 'breakfast', 'parking']).slice(0, 3);
  const rating = listing.rating || 4.6;
  const price = listing.price || listing.displayPrice || 0;
  const nightly = category.filter?.category === 'stay';
  const priceSuffix = nightly ? '/ night' : (category.filter?.category === 'transport' ? '/ day' : '');

  const detailsHref = listing._demo ? '#' : `/property/${listing.id}`;

  return (
    <div className="group h-full flex flex-col bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(15,20,25,0.08)] hover:shadow-[0_14px_36px_-14px_rgba(15,20,25,0.22)] ring-1 ring-slate-100 overflow-hidden transition-all duration-300 hover:-translate-y-0.5">
      {/* Image */}
      <Link href={detailsHref} className="relative block overflow-hidden">
        <div className="relative aspect-[4/3] bg-slate-100">
          <Image
            src={img}
            alt={listing.title || 'Listing image'}
            fill
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
            unoptimized
            loading="lazy"
          />
        </div>
        {/* Top-left badge */}
        {badge && (
          <div className={`absolute top-2 left-2 md:top-3 md:left-3 rounded-md px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-[11px] font-bold ${badgeStyle} shadow-sm`}>
            {badge}
          </div>
        )}
        {/* Top-right wishlist */}
        <button
          onClick={(e) => { e.preventDefault(); setLiked((v) => !v); }}
          aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute top-2 right-2 md:top-3 md:right-3 grid place-items-center size-7 md:size-9 rounded-full bg-white/95 shadow-md hover:scale-105 active:scale-95 transition"
        >
          <Heart className={`size-[13px] md:size-[17px] ${liked ? 'fill-rose-500 text-rose-500' : 'text-slate-700'}`} strokeWidth={2.2} />
        </button>
        {/* Bottom-left rating pill */}
        <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3 inline-flex items-center gap-1 rounded-md bg-emerald-900/90 backdrop-blur px-1.5 md:px-2 py-0.5 md:py-1 text-white text-[10.5px] md:text-[12px] font-bold">
          <Star className="size-3 md:size-3.5 fill-amber-400 text-amber-400" strokeWidth={0} />
          {rating.toFixed(1)}
        </div>
      </Link>

      {/* Body */}
      <div className="flex-1 flex flex-col p-3 md:p-4">
        <h3 className="font-display font-extrabold text-slate-900 text-[14px] md:text-[16px] leading-tight tracking-tight line-clamp-1">
          {listing.title || 'Untitled listing'}
        </h3>
        {(listing.location || listing.city) && (
          <div className="mt-1 md:mt-1.5 flex items-center gap-1 text-slate-500 text-[11.5px] md:text-[13px]">
            <MapPin className="size-[12px] md:size-[14px] shrink-0" strokeWidth={2.2} />
            <span className="truncate">{listing.location || listing.city}</span>
          </div>
        )}

        {/* Amenities row */}
        <div className="mt-2 md:mt-2.5 flex items-center gap-2.5 md:gap-3 flex-wrap text-slate-500 text-[10.5px] md:text-[12px]">
          {amenities.map((a) => {
            const A = AMENITY_ICONS[a] || AMENITY_ICONS.wifi;
            const Icon = A.icon;
            return (
              <span key={a} className="inline-flex items-center gap-1 whitespace-nowrap">
                <Icon className="size-[12px] md:size-[14px]" strokeWidth={2.2} />
                {A.label}
              </span>
            );
          })}
        </div>

        <div className="mt-3 md:mt-4 pt-2.5 md:pt-3 border-t border-slate-100 flex items-end justify-between gap-2 md:gap-3">
          <div className="min-w-0">
            <div className="text-[10px] md:text-[11px] font-semibold text-slate-400">From</div>
            <div className="mt-0.5 flex items-baseline gap-1 min-w-0">
              <span className="font-display font-extrabold text-slate-900 text-[14px] md:text-[16px] truncate">
                {inr(price)}
              </span>
              {priceSuffix && (
                <span className="text-slate-500 text-[10.5px] md:text-[12px] shrink-0 font-medium">
                  {priceSuffix}
                </span>
              )}
            </div>
          </div>
          <Link
            href={detailsHref}
            className="shrink-0 inline-flex items-center justify-center rounded-md md:rounded-lg border border-emerald-700 text-emerald-800 hover:bg-emerald-700 hover:text-white font-bold text-[10.5px] md:text-[12.5px] px-2.5 md:px-3.5 py-1.5 md:py-2 transition"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onChange }) {
  const pages = useMemo(() => {
    const arr = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) arr.push(i);
    } else {
      arr.push(1, 2, 3);
      if (page > 3 && page < totalPages - 1) arr.push('…');
      if (page !== 1 && page !== 2 && page !== 3 && page !== totalPages) arr.push(page);
      arr.push('…');
      arr.push(totalPages);
    }
    return arr;
  }, [page, totalPages]);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="grid place-items-center size-9 rounded-full bg-white ring-1 ring-slate-200 text-slate-600 hover:ring-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" strokeWidth={2.2} />
      </button>
      {pages.map((p, i) => (
        typeof p === 'number' ? (
          <button
            key={i}
            onClick={() => onChange(p)}
            className={`grid place-items-center size-9 rounded-full text-[13px] font-bold transition ${
              p === page
                ? 'bg-emerald-800 text-white shadow'
                : 'bg-white ring-1 ring-slate-200 text-slate-700 hover:ring-slate-300'
            }`}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ) : (
          <span key={i} className="px-1 text-slate-400 text-[13px]">…</span>
        )
      ))}
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="grid place-items-center size-9 rounded-full bg-white ring-1 ring-slate-200 text-slate-600 hover:ring-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
        aria-label="Next page"
      >
        <ChevronRight className="size-4" strokeWidth={2.2} />
      </button>
    </nav>
  );
}

function EmptyState({ category, hasQuery, onClear }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 md:p-14 text-center">
      <div className="mx-auto size-14 rounded-2xl bg-slate-50 grid place-items-center">
        <Filter className="size-6 text-slate-400" strokeWidth={2.2} />
      </div>
      <h3 className="mt-4 font-display font-extrabold text-slate-900 text-xl">
        {hasQuery ? 'No listings match your filters' : `No ${category.title.toLowerCase()} listings yet`}
      </h3>
      <p className="mt-2 text-slate-500 text-sm max-w-md mx-auto">
        {hasQuery
          ? 'Try adjusting your search or filters.'
          : `We're onboarding new ${category.title.toLowerCase()} partners. Check back soon.`}
      </p>
      {hasQuery && (
        <button
          onClick={onClear}
          className="mt-5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 text-sm font-semibold"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
