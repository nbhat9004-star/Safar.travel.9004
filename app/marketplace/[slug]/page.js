'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Search, Filter, SlidersHorizontal, MapPin } from 'lucide-react';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import PropertyCard from '@/components/safar/PropertyCard';
import {
  MARKETPLACE_CATEGORIES,
  findCategoryBySlug,
  COLOR_MAP,
} from '@/lib/marketplace-categories';

// -----------------------------------------------------------------------------
// Marketplace category listing page — dedicated route: /marketplace/<slug>.
//
//  * Automatically filters listings for the selected category via the existing
//    /api/listings endpoint (category + subcategory query params).
//  * Reuses the app-wide PropertyCard so cards look and behave exactly like
//    everywhere else — clicking one opens /property/[id] → normal booking flow.
//  * The Explore page is NOT touched or reused; this is an independent route.
// -----------------------------------------------------------------------------

export default function MarketplaceCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug || '';
  const category = findCategoryBySlug(slug);

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recommended'); // recommended | price_asc | price_desc | rating_desc

  // Fetch listings from the existing backend, filtered by the mapped
  // category/subcategory in marketplace-categories.js.
  useEffect(() => {
    if (!category) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    const sp = new URLSearchParams();
    if (category.filter?.category) sp.set('category', category.filter.category);
    if (category.filter?.subcategory) sp.set('subcategory', category.filter.subcategory);
    sp.set('limit', '60');
    fetch(`/api/listings?${sp.toString()}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        if (data?.ok) {
          setListings(Array.isArray(data.listings) ? data.listings : []);
        } else {
          setError(data?.error || 'Failed to load listings');
        }
      })
      .catch((e) => {
        if (alive) setError(e?.message || 'Network error');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [category]);

  const filteredSorted = useMemo(() => {
    let items = listings;
    const q = query.trim().toLowerCase();
    if (q) {
      items = items.filter((l) =>
        (l.title || '').toLowerCase().includes(q) ||
        (l.location || '').toLowerCase().includes(q) ||
        (l.city || '').toLowerCase().includes(q),
      );
    }
    const arr = [...items];
    if (sort === 'price_asc') arr.sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sort === 'price_desc') arr.sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (sort === 'rating_desc') arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return arr;
  }, [listings, query, sort]);

  // ---- 404-style guard for unknown slugs ----------------------------------
  if (!category) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-24 pb-24 md:pb-16">
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
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 text-sm font-semibold shadow"
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

  const colors = COLOR_MAP[category.color] || COLOR_MAP.slate;
  const otherCategories = MARKETPLACE_CATEGORIES.filter((c) => c.slug !== category.slug).slice(0, 12);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-white pt-16 lg:pt-20 pb-24 md:pb-16">
        {/* Breadcrumb + header */}
        <section className="container pt-4 md:pt-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12.5px] md:text-[13px] text-slate-500">
            <Link href="/marketplace" className="hover:text-emerald-700 font-medium">Marketplace</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-semibold">{category.title}</span>
          </nav>

          <div className="mt-3 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <button
                onClick={() => router.push('/marketplace')}
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-emerald-700 hover:text-emerald-900 mb-2"
              >
                <ChevronLeft className="size-4" /> Back
              </button>
              <div className="flex items-center gap-3">
                <div className={`hidden sm:grid size-12 md:size-14 rounded-2xl ${colors.bg} place-items-center`}>
                  <MapPin className={`size-6 md:size-7 ${colors.text}`} strokeWidth={2.2} />
                </div>
                <div>
                  <h1 className="font-display font-extrabold text-slate-900 tracking-tight text-[26px] md:text-[36px] leading-tight">
                    {category.title} Listings
                  </h1>
                  <p className="mt-1 text-slate-500 text-[13px] md:text-[15px]">
                    {loading
                      ? 'Loading listings…'
                      : `${filteredSorted.length} ${filteredSorted.length === 1 ? 'listing' : 'listings'} available`}
                  </p>
                </div>
              </div>
            </div>

            {/* Search + sort */}
            <div className="flex items-stretch gap-2 md:gap-3 md:min-w-[420px]">
              <label className="flex-1 flex items-center gap-2 bg-white ring-1 ring-slate-200 rounded-full px-4 py-2.5 focus-within:ring-emerald-500/60">
                <Search className="size-4 text-slate-400 shrink-0" strokeWidth={2.2} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  type="text"
                  placeholder={`Search ${category.title.toLowerCase()}…`}
                  className="flex-1 bg-transparent outline-none text-[13.5px] text-slate-800 placeholder:text-slate-400 min-w-0"
                  aria-label={`Search ${category.title} listings`}
                />
              </label>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label="Sort listings"
                  className="appearance-none bg-white ring-1 ring-slate-200 rounded-full pl-9 pr-8 py-2.5 text-[13px] font-semibold text-slate-700 focus:ring-emerald-500/60 focus:outline-none cursor-pointer"
                >
                  <option value="recommended">Recommended</option>
                  <option value="price_asc">Price: Low → High</option>
                  <option value="price_desc">Price: High → Low</option>
                  <option value="rating_desc">Top rated</option>
                </select>
                <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" strokeWidth={2.2} />
              </div>
            </div>
          </div>
        </section>

        {/* Listings grid */}
        <section className="container mt-6 md:mt-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/5] rounded-3xl bg-slate-100" />
                  <div className="mt-3 h-3.5 bg-slate-100 rounded w-3/4" />
                  <div className="mt-2 h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <ErrorState error={error} onRetry={() => window.location.reload()} />
          ) : filteredSorted.length === 0 ? (
            <EmptyState
              category={category}
              hasSearch={Boolean(query.trim())}
              onClearSearch={() => setQuery('')}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredSorted.map((l, i) => (
                <PropertyCard key={l.id} item={l} index={i} priority={i < 4} />
              ))}
            </div>
          )}
        </section>

        {/* Other categories nav — helps users pivot without going back */}
        <section className="container mt-12 md:mt-16">
          <div className="mb-4 md:mb-5 flex items-end justify-between">
            <h2 className="font-display font-extrabold text-slate-900 tracking-tight text-[18px] md:text-[22px]">
              Explore other categories
            </h2>
            <Link href="/marketplace" className="text-[13px] font-semibold text-emerald-700 hover:text-emerald-900">
              View all
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {otherCategories.map((c) => {
              const cx = COLOR_MAP[c.color] || COLOR_MAP.slate;
              return (
                <Link
                  key={c.slug}
                  href={`/marketplace/${c.slug}`}
                  className={`inline-flex items-center gap-2 rounded-full ${cx.chipBg} ${cx.chipText} px-3.5 py-2 text-[12.5px] font-semibold ring-1 ring-inset ring-slate-100 hover:ring-slate-200 active:scale-95 transition`}
                >
                  {c.title}
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function EmptyState({ category, hasSearch, onClearSearch }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-10 md:p-14 text-center">
      <div className="mx-auto size-14 rounded-2xl bg-white grid place-items-center shadow-sm ring-1 ring-slate-100">
        <Filter className="size-6 text-slate-400" strokeWidth={2.2} />
      </div>
      <h3 className="mt-4 font-display font-extrabold text-slate-900 text-xl">
        {hasSearch ? 'No listings match your search' : `No ${category.title.toLowerCase()} listings yet`}
      </h3>
      <p className="mt-2 text-slate-500 text-sm max-w-md mx-auto">
        {hasSearch
          ? 'Try a different keyword or clear the search to see all listings in this category.'
          : `We're onboarding new ${category.title.toLowerCase()} partners. Check back soon or explore other categories below.`}
      </p>
      <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
        {hasSearch && (
          <button
            onClick={onClearSearch}
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-sm font-semibold"
          >
            Clear search
          </button>
        )}
        <Link
          href="/marketplace"
          className="rounded-full bg-white ring-1 ring-slate-200 hover:ring-slate-300 text-slate-800 px-5 py-2.5 text-sm font-semibold"
        >
          Back to Marketplace
        </Link>
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-10 text-center">
      <h3 className="font-display font-extrabold text-rose-900 text-xl">Something went wrong</h3>
      <p className="mt-2 text-rose-700 text-sm max-w-md mx-auto">{String(error)}</p>
      <button
        onClick={onRetry}
        className="mt-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 text-sm font-semibold"
      >
        Try again
      </button>
    </div>
  );
}
