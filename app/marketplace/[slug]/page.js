'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  Search, Filter, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight,
  Heart, Star, MapPin, Calendar, Users, X,
  Wifi, Coffee, ParkingCircle, BedDouble, Bath, Snowflake, Tv, Sun, Wind, Waves,
  Sparkles, ShieldCheck, BadgeCheck, CircleDollarSign, Headset, Bot,
  Hotel, Home, Ship, DoorOpen, Palmtree, Building, Building2, Tent,
  Car, Bike, CarTaxiFront, PlaneLanding, PlaneTakeoff,
  UserCheck, MapPinned, Church, Compass, Activity, CableCar, Footprints, Camera, Utensils,
  ShoppingBag,
} from 'lucide-react';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import {
  MARKETPLACE_CATEGORIES,
  findCategoryBySlug,
  COLOR_MAP,
} from '@/lib/marketplace-categories';

// -----------------------------------------------------------------------------
// Marketplace category listing page (Hotels example redesigned exactly per the
// approved reference mockup). Reusable for every marketplace category slug.
//
// * Only this file was modified.
// * Backend/APIs unchanged — we still fetch /api/listings?category=X&subcategory=Y
//   via the existing endpoint.
// * Clicking a listing opens /property/[id] (existing detail page) — never
//   /explore.
// -----------------------------------------------------------------------------

// Per-category hero background image (falls back to Kashmir houseboats).
const HERO_BY_CATEGORY = {
  stay:       'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=2200&q=85',
  transport:  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=2200&q=85',
  tour:       'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=2200&q=85',
  experience: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=2200&q=85',
  shopping:   'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=2200&q=85',
};
const HERO_FALLBACK = 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=2200&q=85';

// Preloaded stock imagery so cards look premium even when the connected DB has
// listings without images. Purely visual — never a data source.
const CARD_FALLBACKS = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=80',
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200&q=80',
  'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&q=80',
  'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=1200&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80',
];

// Icon map shared with the marketplace hub — used for category chips.
const ICONS = {
  Hotel, Home, Ship, DoorOpen, Palmtree, Building, Building2, Tent,
  Car, Bike, CarTaxiFront, PlaneLanding, PlaneTakeoff,
  UserCheck, MapPinned, Church,
  Compass, Activity, Waves, CableCar, Footprints, Camera, Utensils,
  ShoppingBag,
};

const AMENITY_ICONS = {
  wifi:      { icon: Wifi,           label: 'Free WiFi' },
  breakfast: { icon: Coffee,         label: 'Breakfast' },
  parking:   { icon: ParkingCircle,  label: 'Parking' },
  ac:        { icon: Snowflake,      label: 'AC' },
  tv:        { icon: Tv,             label: 'TV' },
  pool:      { icon: Waves,          label: 'Pool' },
  bath:      { icon: Bath,           label: 'Private Bath' },
  bed:       { icon: BedDouble,      label: 'King Bed' },
  view:      { icon: Sun,            label: 'Lake View' },
  fan:       { icon: Wind,           label: 'Fan' },
};

const AMENITY_KEYS = ['wifi', 'breakfast', 'parking', 'ac', 'tv', 'pool', 'view'];

// Sample listings shown only when the API returns nothing/errors so the
// category page still renders the approved design for review. These are pure
// UI placeholders — they never touch the backend.
function buildDemoListings(category) {
  const isStay = category.filter?.category === 'stay';
  const isTransport = category.filter?.category === 'transport';
  const currency = '₹';
  const base = isStay ? 3500 : isTransport ? 1200 : 1800;

  const badges = ['Popular', 'Best Seller', 'Popular', 'New', 'Popular', 'Best Seller'];
  const names = isStay
    ? ['The Kabo Luxe', 'Grand Kashmir Resort', 'Vintage Inn', 'Mount View Retreat', 'Lakeside Paradise', 'Snow Land Hotel']
    : isTransport
      ? ['Kashmir Wheels', 'Valley Voyager', 'Alpine Riders', 'Zabarwan Rentals', 'Dal Drives', 'Chinar Mobility']
      : ['Curated Kashmir Journey', 'Golden Valley Experience', 'Chinar Trails', 'Silk Route Odyssey', 'Meadow Wanderer', 'Himalayan Sojourn'];
  const locations = ['Dal Lake, Srinagar', 'Gulmarg, Kashmir', 'Nigeen Lake, Srinagar', 'Pahalgam, Kashmir', 'Dal Lake, Srinagar', 'Gulmarg, Kashmir'];
  const ratings = [4.7, 4.6, 4.5, 4.8, 4.6, 4.7];
  const prices = [4500, 6200, 3200, 4900, 5800, 4200].map((p) => Math.round((p * base) / 4500));

  return names.map((title, i) => ({
    id: `demo-${category.slug}-${i}`,
    title,
    location: locations[i],
    city: locations[i].split(',').pop().trim(),
    rating: ratings[i],
    price: prices[i],
    badge: badges[i],
    currency,
    amenities: ['wifi', 'breakfast', 'parking'],
    images: [CARD_FALLBACKS[i % CARD_FALLBACKS.length]],
    _demo: true,
  }));
}

// Get sibling categories (chips) — everything under the same parent category.
function getSiblingChips(category) {
  const parent = category.filter?.category;
  if (!parent) return [];
  return MARKETPLACE_CATEGORIES.filter((c) => c.filter?.category === parent);
}

// Parent group label used in the breadcrumb, e.g. "Stays" for hotels.
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

// Format currency helper
function inr(n) {
  if (!n && n !== 0) return '';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

// =====================================================================
// PAGE
// =====================================================================
export default function MarketplaceCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug || '';
  const category = findCategoryBySlug(slug);

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiFailed, setApiFailed] = useState(false);

  // Toolbar / filter state
  const [query, setQuery] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [sort, setSort] = useState('recommended');
  const [page, setPage] = useState(1);
  const perPage = 6;

  // Sidebar filters
  const [priceMin, setPriceMin] = useState(1000);
  const [priceMax, setPriceMax] = useState(25000);
  const [selectedRating, setSelectedRating] = useState(0);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [locationFilter, setLocationFilter] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (!category) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    setApiFailed(false);
    const sp = new URLSearchParams();
    if (category.filter?.category) sp.set('category', category.filter.category);
    if (category.filter?.subcategory) sp.set('subcategory', category.filter.subcategory);
    sp.set('limit', '60');
    fetch(`/api/listings?${sp.toString()}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        if (data?.ok && Array.isArray(data.listings)) setListings(data.listings);
        else setApiFailed(true);
      })
      .catch(() => { if (alive) setApiFailed(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [category]);

  // Compose actual + demo (when API returns nothing so the design is visible).
  const compositeListings = useMemo(() => {
    if (!category) return [];
    if (loading) return [];
    if (listings.length > 0) return listings;
    // Fallback demo listings (UI only) so the design still renders.
    return buildDemoListings(category);
  }, [listings, loading, category]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (locationFilter) n += 1;
    if (priceMin !== 1000 || priceMax !== 25000) n += 1;
    if (selectedRating) n += 1;
    n += selectedAmenities.length;
    n += selectedTypes.length;
    return n;
  }, [locationFilter, priceMin, priceMax, selectedRating, selectedAmenities, selectedTypes]);

  const filteredSorted = useMemo(() => {
    let items = compositeListings.slice();

    const q = query.trim().toLowerCase();
    if (q) {
      items = items.filter((l) =>
        (l.title || '').toLowerCase().includes(q) ||
        (l.location || '').toLowerCase().includes(q) ||
        (l.city || '').toLowerCase().includes(q));
    }
    if (locationFilter) {
      const lf = locationFilter.toLowerCase();
      items = items.filter((l) => (l.location || l.city || '').toLowerCase().includes(lf));
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
  }, [compositeListings, query, locationFilter, priceMin, priceMax, selectedRating, selectedAmenities, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / perPage));
  const pageSafe = Math.min(page, totalPages);
  const paged = filteredSorted.slice((pageSafe - 1) * perPage, pageSafe * perPage);

  const resetFilters = () => {
    setLocationFilter('');
    setPriceMin(1000);
    setPriceMax(25000);
    setSelectedRating(0);
    setSelectedAmenities([]);
    setSelectedTypes([]);
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

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-50 pt-16 lg:pt-20 pb-24 md:pb-16">
        {/* ============================== HERO ============================= */}
        <section className="relative overflow-hidden isolate bg-emerald-950">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url('${hero}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/85 via-emerald-950/55 to-emerald-950/25" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-emerald-950/25" />

          <div className="container relative z-10 pt-6 md:pt-10 pb-24 md:pb-32">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12.5px] md:text-[13px] text-white/85">
              <Link href="/" className="hover:text-white">Home</Link>
              <ChevronRight className="size-3.5 opacity-60" />
              <Link href="/marketplace" className="hover:text-white">Marketplace</Link>
              <ChevronRight className="size-3.5 opacity-60" />
              <span className="hover:text-white opacity-90">{parentLabel}</span>
              <ChevronRight className="size-3.5 opacity-60" />
              <span className="text-white font-semibold">{category.title}</span>
            </nav>

            {/* Title */}
            <h1 className="mt-4 md:mt-6 font-display font-extrabold text-white tracking-tight leading-[1.05] text-[30px] sm:text-[38px] md:text-[46px] lg:text-[52px] drop-shadow-sm">
              {category.title} in Kashmir
            </h1>
            <p className="mt-2 md:mt-3 text-white/85 text-[14px] md:text-[16px] max-w-2xl">
              Discover and book verified {category.title.toLowerCase()} for a comfortable stay in Kashmir.
            </p>
          </div>

          {/* Floating search card */}
          <div className="container relative -mt-16 md:-mt-20 z-10">
            <div className="bg-white rounded-2xl md:rounded-[20px] shadow-[0_20px_50px_-20px_rgba(15,25,20,0.35)] ring-1 ring-slate-100 p-3 md:p-3.5">
              <div className="flex flex-col md:flex-row md:items-stretch gap-2 md:gap-0">
                {/* Search */}
                <label className="flex-1 flex items-center gap-3 rounded-xl md:rounded-none px-3 md:px-5 py-3 md:py-2 md:border-r md:border-slate-100">
                  <Search className="size-5 text-slate-500 shrink-0" strokeWidth={2.2} />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                    placeholder={`Search by location, ${category.title.toLowerCase().replace(/s$/, '')} name or keyword`}
                    className="flex-1 min-w-0 bg-transparent outline-none text-[13.5px] md:text-[14.5px] text-slate-900 placeholder:text-slate-400"
                    aria-label={`Search ${category.title}`}
                  />
                </label>

                {/* Check-in / Check-out / Guests row */}
                <div className="grid grid-cols-3 md:grid-cols-3 md:contents gap-2 md:gap-0">
                  <FieldBlock label="Check-in" value={checkIn ? checkIn : 'Add dates'} icon={Calendar}>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      aria-label="Check-in date"
                    />
                  </FieldBlock>
                  <FieldBlock label="Check-out" value={checkOut ? checkOut : 'Add dates'} icon={Calendar}>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      aria-label="Check-out date"
                    />
                  </FieldBlock>
                  <FieldBlock label="Guests" value={`${guests} ${guests === 1 ? 'Guest' : 'Guests'}`} icon={ChevronDown} iconRight>
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
                </div>

                {/* Search button */}
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  className="mt-1 md:mt-0 md:ml-2 inline-flex items-center justify-center gap-2 rounded-xl md:rounded-2xl bg-emerald-800 hover:bg-emerald-900 active:scale-[0.98] text-white font-bold text-[14px] md:text-[15px] px-6 md:px-7 py-3 md:py-4 shadow-md shadow-emerald-900/25 transition"
                >
                  <Search className="size-4 md:size-5" strokeWidth={2.4} /> Search
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ============================ CATEGORY CHIPS ==================== */}
        {chips.length > 1 && (
          <section className="container mt-4 md:mt-6">
            <div className="flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar-mp -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
              {chips.map((c) => {
                const isActive = c.slug === category.slug;
                const Icon = ICONS[c.iconKey] || Hotel;
                return (
                  <Link
                    key={c.slug}
                    href={`/marketplace/${c.slug}`}
                    className={`shrink-0 inline-flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 rounded-2xl md:rounded-[14px] border transition text-[13px] md:text-[14px] font-semibold ${
                      isActive
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-200 hover:text-emerald-800'
                    }`}
                  >
                    <Icon className="size-4 md:size-[18px]" strokeWidth={2.2} />
                    {c.title}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ================== TOOLBAR + FILTERS + GRID ==================== */}
        <section className="container mt-5 md:mt-8">
          <div className="grid grid-cols-1 md:grid-cols-[260px,1fr] lg:grid-cols-[288px,1fr] gap-6 md:gap-8">
            {/* --- Sidebar filters (desktop) --- */}
            <aside className="hidden md:block">
              <FilterSidebar
                category={category}
                locationFilter={locationFilter} setLocationFilter={setLocationFilter}
                priceMin={priceMin} setPriceMin={setPriceMin}
                priceMax={priceMax} setPriceMax={setPriceMax}
                selectedTypes={selectedTypes} setSelectedTypes={setSelectedTypes}
                selectedRating={selectedRating} setSelectedRating={setSelectedRating}
                selectedAmenities={selectedAmenities} setSelectedAmenities={setSelectedAmenities}
                onReset={resetFilters}
                onApply={() => setPage(1)}
              />
            </aside>

            {/* --- Main column --- */}
            <div className="min-w-0">
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-3 mb-4 md:mb-5">
                {/* Mobile Filters + Sort */}
                <div className="flex-1 md:hidden grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMobileFiltersOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-white ring-1 ring-slate-200 px-4 py-3 text-[13.5px] font-bold text-slate-800"
                  >
                    <SlidersHorizontal className="size-4" strokeWidth={2.2} /> Filters
                    {activeFilterCount > 0 && (
                      <span className="ml-1 inline-grid place-items-center min-w-5 h-5 px-1.5 rounded-full bg-emerald-700 text-white text-[11px] font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                  <div className="relative">
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="w-full appearance-none bg-white ring-1 ring-slate-200 rounded-2xl pl-4 pr-9 py-3 text-[13.5px] font-bold text-slate-800 cursor-pointer"
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

                {/* Desktop count + sort */}
                <div className="hidden md:flex items-center justify-between w-full">
                  <div className="text-[15px] md:text-[16px] text-slate-800">
                    <span className="font-bold">{filteredSorted.length}</span>{' '}
                    <span className="text-slate-500">{category.title} found</span>
                  </div>
                  <div className="relative">
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="appearance-none bg-white ring-1 ring-slate-200 rounded-full pl-4 pr-9 py-2.5 text-[13.5px] font-semibold text-slate-800 cursor-pointer hover:ring-slate-300"
                      aria-label="Sort listings"
                    >
                      <option value="recommended">Sort by: Recommended</option>
                      <option value="newest">Sort by: Newest</option>
                      <option value="price_asc">Sort by: Price ↑</option>
                      <option value="price_desc">Sort by: Price ↓</option>
                      <option value="rating_desc">Sort by: Highest Rated</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                  </div>
                </div>
              </div>

              {/* Mobile count */}
              <div className="md:hidden text-[14px] text-slate-800 -mt-1 mb-3">
                <span className="font-bold">{filteredSorted.length}</span>{' '}
                <span className="text-slate-500">{category.title} found</span>
              </div>

              {/* Loading skeleton */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden animate-pulse">
                      <div className="aspect-[4/3] bg-slate-100" />
                      <div className="p-4 space-y-2.5">
                        <div className="h-4 bg-slate-100 rounded w-2/3" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                        <div className="h-3 bg-slate-100 rounded w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : paged.length === 0 ? (
                <EmptyState
                  category={category}
                  hasQuery={Boolean(query.trim() || activeFilterCount)}
                  onClear={() => { setQuery(''); resetFilters(); }}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {paged.map((l, i) => (
                    <ListingCard key={l.id || i} listing={l} fallbackIndex={i} category={category} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {!loading && filteredSorted.length > perPage && (
                <Pagination
                  page={pageSafe}
                  totalPages={totalPages}
                  onChange={(p) => {
                    setPage(p);
                    if (typeof window !== 'undefined') window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                />
              )}
            </div>
          </div>
        </section>

        {/* ============================ TRUST STRIP ======================= */}
        <section className="container mt-10 md:mt-14">
          <div className="bg-emerald-50/60 rounded-2xl ring-1 ring-emerald-100/70 p-4 md:p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <TrustCell icon={CircleDollarSign} iconBg="bg-emerald-100" iconColor="text-emerald-700"
                title="Best Price Guarantee" hint="Get the best prices or we'll match it." />
              <TrustCell icon={ShieldCheck} iconBg="bg-amber-100" iconColor="text-amber-700"
                title="Secure Booking" hint="Your payments are safe with us." />
              <TrustCell icon={Headset} iconBg="bg-violet-100" iconColor="text-violet-700"
                title="24/7 Support" hint="We're here to help you anytime." />
              <TrustCell icon={BadgeCheck} iconBg="bg-teal-100" iconColor="text-teal-700"
                title="Verified Properties" hint="All listings are verified by our team." />
            </div>
          </div>
        </section>

        {/* ============================ AI CTA BAND ======================= */}
        <section className="container mt-8 md:mt-10">
          <div className="relative overflow-hidden rounded-3xl bg-emerald-950 p-5 md:p-8 lg:p-10">
            <div className="absolute inset-0 opacity-25 pointer-events-none" aria-hidden>
              <div className="absolute -right-10 -bottom-16 size-52 rounded-full bg-emerald-400/25 blur-3xl" />
              <div className="absolute top-6 left-1/2 size-1.5 rounded-full bg-emerald-300" />
              <div className="absolute bottom-10 left-1/3 size-1 rounded-full bg-emerald-300/70" />
            </div>
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
              <div className="flex items-start md:items-center gap-4">
                <div className="hidden md:grid shrink-0 size-14 rounded-2xl bg-white/10 border border-white/20 place-items-center">
                  <Bot className="size-7 text-emerald-200" strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-white text-[18px] md:text-[24px] leading-tight tracking-tight">
                    Not sure where to stay?
                  </h3>
                  <p className="mt-1 text-white/70 text-[13px] md:text-[14.5px] leading-relaxed max-w-xl">
                    Let our AI planner help you find the perfect {category.title.toLowerCase()} based on your preferences.
                  </p>
                </div>
              </div>
              <Link
                href="/ai-planner"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 md:px-7 py-3 md:py-3.5 text-emerald-950 text-[14px] md:text-[15px] font-bold shadow-lg hover:shadow-xl active:scale-95 transition self-start md:self-auto"
              >
                Plan My Trip with AI
                <Sparkles className="size-4 text-amber-500" strokeWidth={2.4} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Mobile filters drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 top-14 bg-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="font-display font-extrabold text-slate-900 text-lg">Filters</div>
              <button onClick={() => setMobileFiltersOpen(false)} className="rounded-full p-2 hover:bg-slate-50" aria-label="Close filters">
                <X className="size-5 text-slate-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <FilterSidebar
                category={category} inDrawer
                locationFilter={locationFilter} setLocationFilter={setLocationFilter}
                priceMin={priceMin} setPriceMin={setPriceMin}
                priceMax={priceMax} setPriceMax={setPriceMax}
                selectedTypes={selectedTypes} setSelectedTypes={setSelectedTypes}
                selectedRating={selectedRating} setSelectedRating={setSelectedRating}
                selectedAmenities={selectedAmenities} setSelectedAmenities={setSelectedAmenities}
                onReset={resetFilters}
                onApply={() => { setPage(1); setMobileFiltersOpen(false); }}
              />
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
        input[type="range"].mp-range {
          -webkit-appearance: none;
          background: transparent;
        }
        input[type="range"].mp-range::-webkit-slider-runnable-track {
          height: 4px; background: #e2e8f0; border-radius: 999px;
        }
        input[type="range"].mp-range::-moz-range-track {
          height: 4px; background: #e2e8f0; border-radius: 999px;
        }
        input[type="range"].mp-range::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          height: 18px; width: 18px; border-radius: 9999px;
          background: #047857; border: 3px solid white;
          box-shadow: 0 2px 8px rgba(4,120,87,0.35);
          margin-top: -7px; cursor: pointer;
        }
        input[type="range"].mp-range::-moz-range-thumb {
          height: 18px; width: 18px; border-radius: 9999px;
          background: #047857; border: 3px solid white;
          box-shadow: 0 2px 8px rgba(4,120,87,0.35);
          cursor: pointer;
        }
      `,
        }}
      />
    </>
  );
}

// =============================== SUB-COMPONENTS ==============================

function FieldBlock({ label, value, icon: Icon, iconRight, children }) {
  return (
    <label className="relative flex-1 flex flex-col rounded-xl md:rounded-none px-3 md:px-5 py-2 md:py-1 md:border-r md:border-slate-100 last:md:border-r-0 min-w-0">
      <span className="text-[10.5px] md:text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span className="mt-0.5 flex items-center justify-between gap-2 min-w-0">
        <span className="truncate text-[13px] md:text-[14px] font-semibold text-slate-900">{value}</span>
        {Icon && <Icon className={`size-4 md:size-[18px] ${iconRight ? 'text-slate-500' : 'text-slate-400'} shrink-0`} strokeWidth={2.2} />}
      </span>
      {children}
    </label>
  );
}

function FilterSidebar({
  category, inDrawer,
  locationFilter, setLocationFilter,
  priceMin, setPriceMin,
  priceMax, setPriceMax,
  selectedTypes, setSelectedTypes,
  selectedRating, setSelectedRating,
  selectedAmenities, setSelectedAmenities,
  onReset, onApply,
}) {
  const siblingTypes = getSiblingChips(category);

  const toggleAmenity = (a) => {
    setSelectedAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  };
  const toggleType = (slug) => {
    setSelectedTypes((prev) => prev.includes(slug) ? prev.filter((x) => x !== slug) : [...prev, slug]);
  };

  return (
    <div className={`bg-white rounded-2xl ${inDrawer ? '' : 'ring-1 ring-slate-100 shadow-sm p-5'}`}>
      <div className={`flex items-center justify-between ${inDrawer ? 'mb-4' : 'mb-4'}`}>
        <h3 className="font-display font-extrabold text-slate-900 text-[17px]">Filters</h3>
        <button onClick={onReset} className="text-[13px] text-emerald-700 hover:text-emerald-900 font-semibold">
          Reset
        </button>
      </div>

      {/* Location */}
      <div className="mb-5">
        <div className="text-[13px] font-bold text-slate-800 mb-2">Location</div>
        <div className="relative">
          <input
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            placeholder="Select location"
            className="w-full bg-white ring-1 ring-slate-200 rounded-xl pl-4 pr-9 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-400 focus:ring-emerald-500/60 outline-none"
          />
          <MapPin className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        </div>
      </div>

      {/* Price Range */}
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

      {/* Property Type (siblings) */}
      {siblingTypes.length > 1 && (
        <div className="mb-5">
          <div className="text-[13px] font-bold text-slate-800 mb-2">Property Type</div>
          <div className="space-y-1.5">
            {siblingTypes.map((t) => {
              const checked = t.slug === category.slug || selectedTypes.includes(t.slug);
              return (
                <label key={t.slug} className="flex items-center gap-2.5 text-[13.5px] text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleType(t.slug)}
                    className="size-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                  />
                  {t.title}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Guest Rating */}
      <div className="mb-5">
        <div className="text-[13px] font-bold text-slate-800 mb-2">Guest Rating</div>
        <div className="space-y-1.5">
          {[4.5, 4.0, 3.5, 3.0].map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRating(selectedRating === r ? 0 : r)}
              className={`w-full flex items-center gap-2 rounded-md px-1.5 py-1 text-left transition ${
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
      <div className="mb-6">
        <div className="text-[13px] font-bold text-slate-800 mb-2">Amenities</div>
        <div className="space-y-1.5">
          {AMENITY_KEYS.map((k) => (
            <label key={k} className="flex items-center gap-2.5 text-[13.5px] text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedAmenities.includes(k)}
                onChange={() => toggleAmenity(k)}
                className="size-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
              />
              {AMENITY_ICONS[k]?.label || k}
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={onApply}
        className="w-full rounded-full border-2 border-emerald-700 text-emerald-800 hover:bg-emerald-700 hover:text-white font-bold text-[13.5px] py-3 transition"
      >
        Apply Filters
      </button>
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
      ? 'bg-emerald-500 text-white'
      : 'bg-emerald-900 text-white';

  const amenities = (listing.amenities || ['wifi', 'breakfast', 'parking']).slice(0, 3);
  const rating = listing.rating || 4.6;
  const price = listing.price || listing.displayPrice || 0;
  const nightly = category.filter?.category === 'stay';
  const priceSuffix = nightly ? ' / night' : (category.filter?.category === 'transport' ? ' / day' : '');

  const detailsHref = listing._demo ? '#' : `/property/${listing.id}`;

  return (
    <div className="group bg-white rounded-2xl md:rounded-[20px] shadow-[0_6px_24px_-14px_rgba(15,20,25,0.18)] hover:shadow-[0_16px_40px_-16px_rgba(15,20,25,0.24)] ring-1 ring-slate-100 overflow-hidden transition hover:-translate-y-0.5">
      {/* Image */}
      <Link href={detailsHref} className="relative block overflow-hidden">
        <div className="relative aspect-[4/3] bg-slate-100">
          <Image
            src={img}
            alt={listing.title || 'Listing image'}
            fill
            sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized
          />
        </div>
        {/* Badge */}
        {badge && (
          <div className={`absolute top-3 left-3 rounded-md px-2.5 py-1 text-[11px] font-bold ${badgeStyle} shadow`}>
            {badge}
          </div>
        )}
        {/* Wishlist */}
        <button
          onClick={(e) => { e.preventDefault(); setLiked((v) => !v); }}
          aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute top-3 right-3 grid place-items-center size-9 rounded-full bg-white/95 shadow hover:scale-105 active:scale-95 transition"
        >
          <Heart className={`size-[18px] ${liked ? 'fill-rose-500 text-rose-500' : 'text-slate-700'}`} strokeWidth={2.2} />
        </button>
        {/* Rating chip */}
        <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-md bg-emerald-950/85 backdrop-blur px-2 py-1 text-white text-[12px] font-bold">
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          {rating.toFixed(1)}
        </div>
        {/* Dots indicator (visual only — 3 dots) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-white" />
          <span className="size-1.5 rounded-full bg-white/60" />
          <span className="size-1.5 rounded-full bg-white/60" />
        </div>
      </Link>

      {/* Body */}
      <div className="p-4 md:p-5">
        <h3 className="font-display font-extrabold text-slate-900 text-[17px] md:text-[18px] leading-tight tracking-tight line-clamp-1">
          {listing.title || 'Untitled listing'}
        </h3>
        {(listing.location || listing.city) && (
          <div className="mt-1.5 flex items-center gap-1 text-slate-500 text-[13px]">
            <MapPin className="size-[14px] shrink-0" strokeWidth={2.2} />
            <span className="truncate">{listing.location || listing.city}</span>
          </div>
        )}

        {/* Amenities */}
        <div className="mt-3 flex items-center gap-3 md:gap-4 flex-wrap text-slate-500 text-[12px]">
          {amenities.map((a) => {
            const A = AMENITY_ICONS[a] || AMENITY_ICONS.wifi;
            const Icon = A.icon;
            return (
              <span key={a} className="inline-flex items-center gap-1">
                <Icon className="size-[14px]" strokeWidth={2.2} />
                {A.label}
              </span>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Starting from</div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="font-display font-extrabold text-slate-900 text-[17px] md:text-[18px]">
                {inr(price)}
              </span>
              {priceSuffix && <span className="text-slate-500 text-[12px]">{priceSuffix}</span>}
            </div>
          </div>
          <Link
            href={detailsHref}
            className="shrink-0 inline-flex items-center justify-center rounded-lg border-2 border-emerald-700 text-emerald-800 hover:bg-emerald-700 hover:text-white font-bold text-[12.5px] px-3.5 py-2 transition"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}

function TrustCell({ icon: Icon, iconBg, iconColor, title, hint }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`shrink-0 size-10 md:size-11 rounded-xl ${iconBg} grid place-items-center`}>
        <Icon className={`size-5 md:size-[22px] ${iconColor}`} strokeWidth={2.2} />
      </div>
      <div>
        <div className="text-[13px] md:text-[14px] font-bold text-slate-900">{title}</div>
        <div className="text-[11.5px] md:text-[12.5px] text-slate-500 leading-snug">{hint}</div>
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
    <nav aria-label="Pagination" className="mt-8 md:mt-10 flex items-center justify-center gap-1.5">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="grid place-items-center size-9 rounded-full bg-white ring-1 ring-slate-200 text-slate-600 hover:ring-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
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
        className="grid place-items-center size-9 rounded-full bg-white ring-1 ring-slate-200 text-slate-600 hover:ring-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
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
