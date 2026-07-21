'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Search, ArrowRight, MapPin, Users, Calendar, Wallet, Sparkles,
  Mountain, Camera, Car, Home as HomeIcon, Heart, Star, Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

// ------------------------------------------------------------------
// EXPLORE V2 — Community Trip Planning Home
// Sections: Hero → Featured → Recently Published → Popular Destinations
// → Weekend / Adventure / Family / Road Trips (theme-filtered).
// All data comes from the existing GET /api/circle/journeys endpoint
// which returns public, published journeys ordered by publishedAt desc.
// ------------------------------------------------------------------

const HERO_IMG = 'https://images.pexels.com/photos/27108526/pexels-photo-27108526.jpeg?auto=compress&cs=tinysrgb&w=1920';

const POPULAR_DESTINATIONS = [
  { name: 'Srinagar',   img: 'https://images.pexels.com/photos/18453079/pexels-photo-18453079.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { name: 'Gulmarg',    img: 'https://images.pexels.com/photos/29842101/pexels-photo-29842101.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { name: 'Pahalgam',   img: 'https://images.unsplash.com/photo-1708179070772-abf3a1d16b74?w=800&auto=format' },
  { name: 'Sonamarg',   img: 'https://images.pexels.com/photos/17078575/pexels-photo-17078575.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { name: 'Gurez',      img: 'https://images.pexels.com/photos/27540040/pexels-photo-27540040.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { name: 'Kupwara',    img: 'https://images.pexels.com/photos/25786565/pexels-photo-25786565.jpeg?auto=compress&cs=tinysrgb&w=800' },
];

// Theme keys map to the API's `theme` field on journeys.
const SHELVES = [
  { key: 'weekend_escape', title: 'Weekend Getaways',  icon: Sparkles },
  { key: 'adventure',      title: 'Adventure Trips',   icon: Mountain },
  { key: 'family',         title: 'Family Trips',      icon: Users    },
  { key: 'road_trip',      title: 'Road Trips',        icon: Car      },
];

export default function ExploreHomeV2() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/circle/journeys?limit=60', { cache: 'no-store' });
        const j = await r.json();
        if (j?.ok) setTrips(j.journeys || []);
      } catch { /* handled by empty state */ }
      finally { setLoading(false); }
    })();
  }, []);

  const featured  = useMemo(() => trips.slice(0, 6), [trips]);
  const recent    = useMemo(() => [...trips].sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt)).slice(0, 8), [trips]);
  const byTheme   = useMemo(() => {
    const g = {};
    for (const t of trips) {
      const k = t.theme || 'weekend_escape';
      (g[k] = g[k] || []).push(t);
    }
    return g;
  }, [trips]);

  const filtered = q ? trips.filter((t) =>
    (t.name || '').toLowerCase().includes(q.toLowerCase()) ||
    (t.destination?.name || '').toLowerCase().includes(q.toLowerCase()) ||
    (t.destination?.district || '').toLowerCase().includes(q.toLowerCase())
  ) : null;

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src={HERO_IMG} alt="Kashmir" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/50 via-emerald-950/25 to-white" />
        </div>
        <div className="relative container py-16 md:py-24 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur border border-white/60 text-emerald-900 text-[11px] uppercase tracking-[0.22em] font-bold shadow-md">
              <Sparkles className="size-3.5 text-amber-500" /> Community Trips
            </div>
            <h1 className="mt-5 font-display text-white text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight drop-shadow-[0_3px_20px_rgba(0,0,0,0.35)]">
              Travel Better. <span className="text-amber-300">Travel Together.</span>
            </h1>
            <p className="mt-5 text-white/95 text-base md:text-xl max-w-xl leading-relaxed drop-shadow">
              Plan your own adventure or join someone else’s journey.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/explore/journey" className="group inline-flex items-center gap-2 px-6 md:px-7 h-12 rounded-full bg-emerald2 hover:bg-emerald2-deep text-white font-semibold shadow-xl shadow-emerald2/30 hover:-translate-y-0.5 transition">
                <Plus className="size-4" /> Create a Trip
                <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
              </Link>
              <a href="#discover" className="inline-flex items-center gap-2 px-6 md:px-7 h-12 rounded-full bg-white/95 hover:bg-white text-emerald-900 font-semibold border border-white/60 backdrop-blur shadow-lg hover:-translate-y-0.5 transition">
                <Search className="size-4" /> Join a Trip
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-white/85 text-xs md:text-sm">
              <span className="inline-flex items-center gap-1.5"><Users className="size-4 text-amber-300" /> Meet like-minded travellers</span>
              <span className="inline-flex items-center gap-1.5"><Wallet className="size-4 text-amber-300" /> Split shared expenses</span>
              <span className="inline-flex items-center gap-1.5"><Sparkles className="size-4 text-amber-300" /> Book via Safar Curated</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SEARCH BAR ================= */}
      <div id="discover" className="container -mt-8 md:-mt-10 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl border p-2 md:p-3 flex items-center gap-2">
          <Search className="size-4 md:size-5 ml-2 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search trips by destination, name or district…"
            className="flex-1 h-10 md:h-11 bg-transparent outline-none text-sm text-charcoal placeholder:text-muted-foreground"
          />
          <Link href="/explore/journey" className="hidden sm:inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-emerald2 hover:bg-emerald2-deep text-white text-sm font-semibold transition">
            <Plus className="size-4" /> New Trip
          </Link>
        </div>
      </div>

      {/* ================= SEARCH RESULTS ================= */}
      {q && (
        <section className="container mt-8">
          <h2 className="font-display text-xl font-bold text-charcoal mb-4">Search results</h2>
          {filtered.length === 0 ? (
            <div className="text-muted-foreground text-sm">No trips match “{q}” yet. Try a different keyword or <Link href="/explore/journey" className="text-emerald2 font-semibold hover:underline">start a new one</Link>.</div>
          ) : (
            <TripGrid trips={filtered} />
          )}
        </section>
      )}

      {/* ================= FEATURED TRIPS ================= */}
      {!q && (
        <TripShelf title="Featured Trips" subtitle="Curated adventures picked by the community" trips={featured} loading={loading} icon={Star} viewAllHref="/explore/home?filter=featured" />
      )}

      {/* ================= RECENTLY PUBLISHED ================= */}
      {!q && (
        <TripShelf title="Recently Published" subtitle="Fresh journeys inviting new members" trips={recent} loading={loading} icon={Sparkles} />
      )}

      {/* ================= POPULAR DESTINATIONS ================= */}
      {!q && (
        <section className="container py-10 md:py-14">
          <SectionHeader icon={MapPin} title="Popular Destinations" subtitle="Where the community is heading" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mt-6">
            {POPULAR_DESTINATIONS.map((d) => (
              <Link key={d.name} href={`/explore/home?dest=${encodeURIComponent(d.name)}`}
                onClick={(e) => { e.preventDefault(); setQ(d.name); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="group relative aspect-[4/5] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition">
                <Image src={d.img} alt={d.name} fill sizes="(max-width:768px) 50vw, 16vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-emerald-950/10 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="text-white font-semibold text-sm md:text-base drop-shadow">{d.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ================= THEMED SHELVES ================= */}
      {!q && SHELVES.map(({ key, title, icon }) => {
        const list = byTheme[key] || [];
        if (list.length === 0 && !loading) return null;
        return <TripShelf key={key} title={title} trips={list.slice(0, 8)} loading={loading} icon={icon} />;
      })}

      {/* ================= EMPTY STATE ================= */}
      {!loading && trips.length === 0 && !q && (
        <section className="container py-16">
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-3xl p-10 text-center max-w-2xl mx-auto">
            <div className="mx-auto size-16 rounded-2xl bg-emerald2 grid place-items-center text-white shadow-lg"><Plus className="size-8" /></div>
            <h3 className="font-display text-2xl md:text-3xl font-bold text-charcoal mt-5">Be the first to plan a trip.</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">No community trips have been published yet. Create one and invite fellow travellers to join.</p>
            <Link href="/explore/journey" className="mt-6 inline-flex items-center gap-2 px-6 h-12 rounded-full bg-emerald2 hover:bg-emerald2-deep text-white font-semibold shadow-lg">
              <Plus className="size-4" /> Create a Trip
            </Link>
          </div>
        </section>
      )}

      <div className="pb-16" />
    </>
  );
}

// ---------- Reusable sub-components ----------
function SectionHeader({ icon: Icon, title, subtitle, viewAllHref }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-charcoal tracking-tight flex items-center gap-2">
          {Icon && <span className="inline-grid place-items-center size-8 rounded-xl bg-emerald-50 text-emerald2"><Icon className="size-4" /></span>}
          {title}
        </h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {viewAllHref && (
        <Link href={viewAllHref} className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-emerald2 hover:underline">
          View all <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

function TripShelf({ title, subtitle, trips, loading, icon, viewAllHref }) {
  return (
    <section className="container py-8 md:py-12">
      <SectionHeader icon={icon} title={title} subtitle={subtitle} viewAllHref={viewAllHref} />
      <div className="mt-5">
        {loading ? <TripGridSkeleton /> : (trips.length === 0 ? (
          <div className="text-sm text-muted-foreground bg-secondary/40 border border-emerald-100 rounded-2xl p-6 text-center">Nothing here yet — be the first to publish one.</div>
        ) : <TripGrid trips={trips} />)}
      </div>
    </section>
  );
}

function TripGrid({ trips }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
      {trips.map((t) => <TripCard key={t.id} trip={t} />)}
    </div>
  );
}

function TripCard({ trip }) {
  const seats = Math.max(0, (trip.maxMembers || 6) - (trip.membersCount || 0));
  const perPerson = trip.estimate?.perPerson || (trip.budget && trip.maxMembers ? Math.round(trip.budget / trip.maxMembers) : null);
  const cover = trip.cover || 'https://images.pexels.com/photos/27108526/pexels-photo-27108526.jpeg?auto=compress&cs=tinysrgb&w=800';
  const start = trip.startDate ? new Date(trip.startDate) : null;
  const end = trip.endDate ? new Date(trip.endDate) : null;
  const dateLabel = start ? `${start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}${end ? ' – ' + end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}` : 'Flexible dates';
  return (
    <Link href={`/explore/j/${trip.slug || trip.id}`} className="group block bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="relative aspect-[16/10] overflow-hidden bg-secondary/40">
        <Image src={cover} alt={trip.name} fill sizes="(max-width:768px) 100vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
        {(trip.services || []).length > 0 && (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider shadow">
            <Sparkles className="size-3" /> Safar Curated
          </div>
        )}
        {seats > 0 && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-white/95 text-emerald-900 text-[10px] font-bold uppercase tracking-wider shadow">
            {seats} seat{seats !== 1 ? 's' : ''} left
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="text-[10px] uppercase tracking-wider font-bold text-emerald2 truncate">
          {trip.destination?.name || '—'}{trip.destination?.district ? ` · ${trip.destination.district}` : ''}
        </div>
        <h3 className="font-display font-bold text-charcoal text-base md:text-[17px] mt-1 line-clamp-2 min-h-[46px]">{trip.name}</h3>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Calendar className="size-3.5" /> {dateLabel}</span>
          <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {trip.maxMembers || 6}</span>
        </div>
        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Per person</div>
            <div className="font-bold text-charcoal">{perPerson ? `₹${perPerson.toLocaleString('en-IN')}` : 'Free'}</div>
          </div>
          <div className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald2 border border-emerald-100 shrink-0">
            {(trip.theme || '').replace(/_/g,' ') || 'Trip'}
          </div>
        </div>
      </div>
    </Link>
  );
}

function TripGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
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
