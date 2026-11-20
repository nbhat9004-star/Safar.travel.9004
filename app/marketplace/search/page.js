'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MapPin, CalendarDays, Users, Search, SlidersHorizontal } from 'lucide-react';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import PropertyCard from '@/components/safar/PropertyCard';

function MarketplaceSearchResults() {
  const searchParams = useSearchParams();
  const location = searchParams.get('location') || '';
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const guests = Math.max(1, Number.parseInt(searchParams.get('guests') || '2', 10) || 2);
  const category = searchParams.get('category') || '';
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (location.trim()) params.set('location', location.trim());
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    params.set('guests', String(guests));
    if (category) params.set('category', category);
    params.set('limit', '60');
    return `/api/listings?${params.toString()}`;
  }, [location, checkIn, checkOut, guests, category]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetch(requestUrl, { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data?.ok) throw new Error(data?.error || 'Could not load listings.');
        if (!active) return;
        setListings(Array.isArray(data.listings) ? data.listings : []);
        setTotal(Number(data.total) || 0);
      })
      .catch((err) => {
        if (!active) return;
        setListings([]);
        setTotal(0);
        setError(err?.message || 'Something went wrong while searching.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestUrl]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-secondary/30 pt-24 pb-24">
        <div className="container max-w-6xl">
          <Link href="/marketplace" className="text-sm font-semibold text-emerald2 hover:underline">← Marketplace</Link>
          <div className="mt-4 rounded-3xl bg-white border p-5 md:p-7">
            <div className="flex items-center gap-2 text-emerald2 text-xs font-bold uppercase tracking-[0.16em]"><Search className="size-4" /> Marketplace search</div>
            <h1 className="mt-2 font-display text-2xl md:text-3xl font-bold">Find your stay or experience</h1>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {location && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{location}</span>}
              {(checkIn || checkOut) && <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />{checkIn || 'Any date'} – {checkOut || 'Any date'}</span>}
              <span className="inline-flex items-center gap-1.5"><Users className="size-4" />{guests} guests</span>
              {category && <span className="inline-flex items-center gap-1.5"><SlidersHorizontal className="size-4" />{category}</span>}
            </div>
          </div>

          <div className="mt-7 flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold">{loading ? 'Searching…' : `${total} ${total === 1 ? 'result' : 'results'} found`}</h2>
            <Link href="/marketplace" className="text-sm font-semibold text-emerald2 hover:underline">Browse categories</Link>
          </div>

          {loading && <div className="py-16 text-center text-muted-foreground">Finding available listings…</div>}
          {!loading && error && <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">{error}</div>}
          {!loading && !error && listings.length === 0 && (
            <div className="mt-5 rounded-3xl border bg-white p-10 text-center">
              <Search className="size-8 mx-auto text-muted-foreground" />
              <h3 className="mt-3 font-display text-lg font-bold">No matching listings yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try another location or change your dates and guest count.</p>
              <Link href="/marketplace" className="inline-flex mt-5 rounded-full bg-emerald2 px-5 py-2.5 text-white font-semibold">Explore all categories</Link>
            </div>
          )}
          {!loading && listings.length > 0 && (
            <div className="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {listings.map((item, index) => <PropertyCard key={item.id} item={item} index={index} priority={index < 4} />)}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function MarketplaceSearchPage() {
  return <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading search…</div>}><MarketplaceSearchResults /></Suspense>;
}
