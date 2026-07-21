'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, ArrowRight, MapPin, Users, Calendar, Wallet, Sparkles,
  Star, ChevronRight, X,
} from 'lucide-react';

// -------------------------------------------------------------------
// EXPLORE V3 — Home
//   Hero (top 60%, dynamic image + title + subtitle + overlay)
//   Search bar (Publish + Join CTAs)
//   Published trips grid
//   Floating promotional cards (admin-controlled)
// -------------------------------------------------------------------

const DEFAULT_HERO = {
  image: 'https://images.pexels.com/photos/27108526/pexels-photo-27108526.jpeg?auto=compress&cs=tinysrgb&w=1920',
  title: 'Kashmir, Together.',
  subtitle: 'Discover, publish and join community trips across the valley.',
  overlayEnabled: true,
};

export default function ExploreHome() {
  const [hero, setHero] = useState(DEFAULT_HERO);
  const [promotions, setPromotions] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [dismissed, setDismissed] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const [rs, rt] = await Promise.all([
          fetch('/api/explore/settings', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/circle/journeys?limit=60', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        ]);
        if (rs?.ok && rs.settings?.hero) setHero({ ...DEFAULT_HERO, ...rs.settings.hero });
        if (rs?.ok && Array.isArray(rs.settings?.promotions)) setPromotions(rs.settings.promotions);
        if (rt?.ok) setTrips(rt.journeys || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = q
    ? trips.filter((t) =>
        (t.name || '').toLowerCase().includes(q.toLowerCase()) ||
        (t.destination?.name || '').toLowerCase().includes(q.toLowerCase()) ||
        (t.destination?.district || '').toLowerCase().includes(q.toLowerCase()))
    : trips;

  return (
    <>
      {/* HERO — top 60% of viewport */}
      <section className="relative h-[60vh] min-h-[440px] w-full overflow-hidden">
        <Image src={hero.image} alt="Kashmir" fill priority sizes="100vw" className="object-cover" />
        {hero.overlayEnabled !== false && (
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/45 via-emerald-950/25 to-emerald-950/70" />
        )}
        <div className="absolute inset-0 flex items-center">
          <div className="container max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur border border-white/60 text-emerald-900 text-[11px] uppercase tracking-[0.22em] font-bold shadow-md">
              <Sparkles className="size-3.5 text-amber-500" /> Safar Community
            </div>
            <h1 className="mt-5 font-display text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-tight drop-shadow-[0_3px_24px_rgba(0,0,0,0.45)] max-w-3xl">
              {hero.title}
            </h1>
            <p className="mt-5 text-white/95 text-base md:text-xl max-w-xl leading-relaxed drop-shadow">{hero.subtitle}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/explore/journey" className="inline-flex items-center gap-2 px-7 h-12 rounded-full bg-emerald2 hover:bg-emerald2-deep text-white font-semibold shadow-xl shadow-emerald2/30 hover:-translate-y-0.5 transition">
                <Plus className="size-4" /> Publish a Trip
              </Link>
              <Link href="/explore/join" className="inline-flex items-center gap-2 px-7 h-12 rounded-full bg-white/95 hover:bg-white text-emerald-900 font-semibold border border-white/60 backdrop-blur shadow-lg hover:-translate-y-0.5 transition">
                <Search className="size-4" /> Join a Trip
              </Link>
            </div>

            {/* Search bar (in hero) */}
            <div className="mt-6 max-w-2xl bg-white rounded-2xl shadow-2xl border p-2 flex items-center gap-2">
              <Search className="size-5 ml-2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search destinations, trip names, districts…"
                className="flex-1 h-11 bg-transparent outline-none text-sm text-charcoal placeholder:text-muted-foreground" />
              {q && <button onClick={() => setQ('')} className="text-xs text-muted-foreground hover:text-charcoal px-2">Clear</button>}
            </div>
          </div>
        </div>
      </section>

      {/* PUBLISHED TRIPS GRID */}
      <section className="container py-12 md:py-16">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-charcoal tracking-tight">Published trips</h2>
            <p className="text-sm text-muted-foreground mt-1">Fresh journeys from the community — tap any card to view details.</p>
          </div>
          <Link href="/explore/join" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-emerald2 hover:underline">All trips <ArrowRight className="size-4" /></Link>
        </div>

        {loading ? (
          <TripSkeleton />
        ) : filtered.length === 0 ? (
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-3xl p-10 text-center">
            <div className="mx-auto size-16 rounded-2xl bg-emerald2 grid place-items-center text-white shadow-lg"><Plus className="size-7" /></div>
            <h3 className="font-display text-2xl font-bold text-charcoal mt-5">{q ? `No trips match “${q}”` : 'Be the first to publish a trip.'}</h3>
            <p className="text-muted-foreground mt-2">{q ? 'Try a different keyword.' : 'It\u2019s free — pick DIY or plan with Safar Curated.'}</p>
            <Link href="/explore/journey" className="mt-6 inline-flex items-center gap-2 px-6 h-11 rounded-full bg-emerald2 text-white font-semibold shadow-md"><Plus className="size-4" /> Publish a Trip</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((t) => <TripCard key={t.id} trip={t} />)}
          </div>
        )}
      </section>

      {/* FLOATING PROMOTIONS (admin-controlled) */}
      {promotions.filter((p) => !dismissed[p.id]).slice(0, 2).map((p, idx) => (
        <div key={p.id} className={`fixed z-30 ${idx === 0 ? 'bottom-20 md:bottom-6' : 'top-20 md:top-24'} right-4 md:right-6 max-w-xs bg-white rounded-2xl shadow-2xl border border-amber-200 overflow-hidden animate-[fadeIn_400ms_ease-out]`}>
          <button onClick={() => setDismissed((d) => ({ ...d, [p.id]: true }))} className="absolute top-1.5 right-1.5 size-6 rounded-full bg-white/95 backdrop-blur grid place-items-center hover:bg-white text-charcoal z-10"><X className="size-3" /></button>
          {p.image && (
            <div className="relative aspect-[2/1] bg-secondary">
              <Image src={p.image} alt={p.title} fill sizes="320px" className="object-cover" />
            </div>
          )}
          <div className="p-3">
            <div className="text-[10px] uppercase tracking-wider font-bold text-amber-600">Promotion</div>
            <div className="font-semibold text-charcoal text-sm mt-0.5 line-clamp-2">{p.title}</div>
            {p.body && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.body}</div>}
            {p.href && (
              <Link href={p.href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald2 hover:underline">
                {p.cta || 'Learn more'} <ArrowRight className="size-3" />
              </Link>
            )}
          </div>
        </div>
      ))}

      <style dangerouslySetInnerHTML={{ __html: `@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }` }} />
    </>
  );
}

export function TripCard({ trip }) {
  const seats = Math.max(0, (trip.maxMembers || 6) - (trip.membersCount || 0));
  const perPerson = trip.estimate?.perPerson || (trip.budget && trip.maxMembers ? Math.round(trip.budget / trip.maxMembers) : null);
  const cover = trip.cover || (trip.photos && trip.photos[0]) || 'https://images.pexels.com/photos/27108526/pexels-photo-27108526.jpeg?auto=compress&cs=tinysrgb&w=800';
  const start = trip.startDate ? new Date(trip.startDate) : null;
  const end = trip.endDate ? new Date(trip.endDate) : null;
  const dateLabel = start ? `${start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}${end ? ' – ' + end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}` : 'Flexible';
  return (
    <Link href={`/explore/j/${trip.slug || trip.id}`} className="group block bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
        <Image src={cover} alt={trip.name} fill sizes="(max-width:768px) 100vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
        {(trip.services || []).length > 0 && (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider shadow">
            <Sparkles className="size-3" /> Curated
          </div>
        )}
        {seats > 0 && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-white/95 text-emerald-900 text-[10px] font-bold uppercase tracking-wider shadow">{seats} seat{seats !== 1 ? 's' : ''}</div>
        )}
      </div>
      <div className="p-4">
        <div className="text-[10px] uppercase tracking-wider font-bold text-emerald2 truncate">
          {trip.destination?.name || '—'}{trip.destination?.district ? ` · ${trip.destination.district}` : ''}
        </div>
        <h3 className="font-display font-bold text-charcoal text-base mt-1 line-clamp-2 min-h-[46px]">{trip.name}</h3>
        <div className="mt-2 text-xs text-muted-foreground truncate">by {trip.curatorName || 'A traveller'}</div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Calendar className="size-3.5" /> {dateLabel}</span>
          <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {trip.maxMembers || 6}</span>
        </div>
        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Estimated</div>
            <div className="font-bold text-charcoal">{perPerson ? `₹${perPerson.toLocaleString('en-IN')}/person` : 'Free'}</div>
          </div>
          <button className="text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald2 border border-emerald-200 hover:bg-emerald2 hover:text-white transition">Join</button>
        </div>
      </div>
    </Link>
  );
}

function TripSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border overflow-hidden animate-pulse">
          <div className="aspect-[16/10] bg-secondary" />
          <div className="p-4 space-y-2">
            <div className="h-3 w-24 bg-secondary rounded" />
            <div className="h-4 w-full bg-secondary rounded" />
            <div className="h-4 w-2/3 bg-secondary rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
