'use client';
import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, SlidersHorizontal, Plus, X, Compass, Home as HomeIcon, Mountain, Car, Backpack, MapPin as MapPinIcon, Filter, Loader2, ChevronDown } from 'lucide-react';
import TripShell from '@/components/explore/TripShell';
import TripCard from '@/components/explore/TripCard';
import { TRIPS } from '@/lib/trips-data';
import { fetchTrips } from '@/lib/circle-explore';

const CAT_TABS = [
  { id: 'all', label: 'All Trips', icon: Compass },
  { id: 'upcoming', label: 'Upcoming', icon: MapPinIcon },
  { id: 'weekend', label: 'Weekend Trips', icon: HomeIcon },
  { id: 'treks', label: 'Treks & Adventures', icon: Mountain },
  { id: 'road', label: 'Road Trips', icon: Car },
  { id: 'backpacking', label: 'Backpacking', icon: Backpack },
];

const TYPE_ICONS = [
  { id: 'all', label: 'All', icon: HomeIcon },
  { id: 'treks', label: 'Trek', icon: Mountain },
  { id: 'road', label: 'Road Trip', icon: Car },
  { id: 'backpacking', label: 'Backpacking', icon: Backpack },
];

function ExplorePageInner() {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [sort, setSort] = useState('Latest');
  const [showFilters, setShowFilters] = useState(false);
  const [tripType, setTripType] = useState('all');
  const [duration, setDuration] = useState('any');
  const [groupSize, setGroupSize] = useState('any');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [remoteTrips, setRemoteTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchTrips({ typeSlug: tab === 'all' || tab === 'upcoming' ? null : tab })
      .then(list => { if (alive) setRemoteTrips(list); })
      .catch(() => { if (alive) setRemoteTrips([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tab]);

  // Merge remote + demo trips so the discovery feed is never empty on a fresh DB.
  const merged = useMemo(() => {
    const remoteIds = new Set(remoteTrips.map(t => t.id));
    const demos = TRIPS.filter(t => !remoteIds.has(t.id));
    return [...remoteTrips, ...demos];
  }, [remoteTrips]);

  const filtered = useMemo(() => {
    let arr = [...merged];
    if (q) arr = arr.filter(t => (t.title + ' ' + t.destination).toLowerCase().includes(q.toLowerCase()));
    if (tab !== 'all' && tab !== 'upcoming') arr = arr.filter(t => t.typeSlug === tab);
    if (tripType !== 'all') arr = arr.filter(t => t.typeSlug === tripType);
    if (verifiedOnly) arr = arr.filter(t => t.mode === 'safar' || t.mode === 'local');
    if (freeOnly) arr = arr.filter(t => t.free);
    if (sort === 'Popular') arr.sort((a,b) => b.joined - a.joined);
    return arr;
  }, [merged, q, tab, tripType, verifiedOnly, freeOnly, sort]);

  const filterPanel = (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-[15px]">Filter Trips</h3>
        <button onClick={() => { setTripType('all'); setDuration('any'); setGroupSize('any'); setVerifiedOnly(false); setFreeOnly(false); }} className="text-[12px] font-semibold text-violet-600 hover:underline">Reset</button>
      </div>

      <div className="mt-5">
        <label className="text-[12px] font-semibold text-slate-700">Destination</label>
        <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 h-10">
          <Search className="size-3.5 text-slate-400" />
          <input placeholder="Search destination..." className="flex-1 bg-transparent outline-none text-[13px]" />
        </div>
      </div>

      <div className="mt-5">
        <label className="text-[12px] font-semibold text-slate-700">Trip Type</label>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {TYPE_ICONS.map(t => {
            const Icon = t.icon;
            const active = tripType === t.id;
            return (
              <button key={t.id} onClick={() => setTripType(t.id)} className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-[10px] font-semibold transition ${active ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Icon className="size-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        <label className="text-[12px] font-semibold text-slate-700">Duration</label>
        <div className="relative mt-1.5">
          <select value={duration} onChange={e => setDuration(e.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 h-10 text-[13px]">
            <option value="any">Any Duration</option>
            <option value="1-3">1–3 days</option>
            <option value="4-7">4–7 days</option>
            <option value="8+">8+ days</option>
          </select>
          <ChevronDown className="size-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
        </div>
      </div>

      <div className="mt-5">
        <label className="text-[12px] font-semibold text-slate-700">Date</label>
        <input type="date" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 h-10 text-[13px]" />
      </div>

      <div className="mt-5">
        <label className="text-[12px] font-semibold text-slate-700">Group Size</label>
        <select value={groupSize} onChange={e => setGroupSize(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 h-10 text-[13px]">
          <option value="any">Any</option>
          <option value="small">Small (2–5)</option>
          <option value="medium">Medium (6–10)</option>
          <option value="large">Large (10+)</option>
        </select>
      </div>

      <div className="mt-5">
        <label className="text-[12px] font-semibold text-slate-700">Sort By</label>
        <select value={sort} onChange={e => setSort(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 h-10 text-[13px]">
          <option>Latest</option>
          <option>Popular</option>
        </select>
      </div>

      <div className="mt-5 space-y-2">
        <label className="flex items-center gap-2 text-[13px] cursor-pointer">
          <input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} className="accent-violet-600" />
          Verified Hosts only
        </label>
        <label className="flex items-center gap-2 text-[13px] cursor-pointer">
          <input type="checkbox" checked={freeOnly} onChange={e => setFreeOnly(e.target.checked)} className="accent-violet-600" />
          Free Trips only
        </label>
      </div>

      <button className="mt-6 w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2.5 transition">Apply Filters</button>

      <div className="mt-6">
        <h4 className="font-semibold text-[13px] text-slate-800">Quick Actions</h4>
        <div className="mt-2 space-y-2">
          <Link href="/explore/create" className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
            <div className="size-8 rounded-lg bg-violet-100 text-violet-700 grid place-items-center"><Plus className="size-4" /></div>
            <div>
              <div className="text-[13px] font-semibold">Create a Trip</div>
              <div className="text-[11px] text-slate-500">Plan a trip and invite others</div>
            </div>
          </Link>
          <Link href="/explore/my-trips" className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
            <div className="size-8 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center"><MapPinIcon className="size-4" /></div>
            <div>
              <div className="text-[13px] font-semibold">My Trips</div>
              <div className="text-[11px] text-slate-500">{"View trips you\u2019ve created"}</div>
            </div>
          </Link>
          <Link href="/explore/requests" className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition relative">
            <div className="size-8 rounded-lg bg-rose-100 text-rose-700 grid place-items-center"><Filter className="size-4" /></div>
            <div>
              <div className="text-[13px] font-semibold">Join Requests</div>
              <div className="text-[11px] text-slate-500">View and respond to requests</div>
            </div>
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="font-semibold text-[13px] text-slate-800">How it Works</h4>
        <ol className="mt-2 space-y-2">
          {['Create a Trip','Others Request to Join','Connect & Travel Together'].map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="size-6 rounded-full border border-violet-200 text-violet-700 grid place-items-center text-[11px] font-bold shrink-0">{i+1}</div>
              <div>
                <div className="text-[12px] font-semibold text-slate-800">{s}</div>
                <div className="text-[11px] text-slate-500">{['Share your travel plan with details','Interested travelers send you a request','Chat, plan and make memories'][i]}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );

  return (
    <TripShell right={filterPanel}>
      {/* Mobile search + header */}
      <div className="lg:hidden px-4 pt-4">
        <h1 className="font-display text-2xl font-bold">Explore Trips <span className="inline-block ml-1">{'\u2708\uFE0F'}</span></h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Discover amazing trips and join fellow travelers</p>
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 h-11">
            <Search className="size-4 text-slate-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search destinations, trips..." className="flex-1 bg-transparent outline-none text-[13px]" />
          </div>
          <button onClick={() => setShowFilters(true)} className="size-11 grid place-items-center rounded-xl border border-slate-200 bg-white"><SlidersHorizontal className="size-4 text-slate-600" /></button>
        </div>
      </div>

      {/* Desktop top bar */}
      <div className="hidden lg:flex sticky top-0 z-10 bg-slate-50/80 backdrop-blur px-8 py-4 items-center gap-4 border-b border-slate-100">
        <div className="flex-1 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 h-11 max-w-2xl">
          <Search className="size-4 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search destinations, trips or people..." className="flex-1 bg-transparent outline-none text-[13px]" />
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 h-11 text-[13px] text-slate-700 font-medium">
          <MapPinIcon className="size-4 text-violet-600" /> Srinagar, J&amp;K
        </div>
      </div>

      <div className="px-4 lg:px-8 pt-4 lg:pt-6">
        {/* Header (desktop) */}
        <div className="hidden lg:block">
          <h1 className="font-display text-3xl font-bold">Explore Trips <span className="inline-block ml-1">{'\u2708\uFE0F'}</span></h1>
          <p className="text-[14px] text-slate-500 mt-1">Discover amazing trips and join fellow travelers</p>
        </div>

        {/* Featured banner */}
        <div className="mt-4 lg:mt-6 relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 h-[180px] lg:h-[220px]">
          <Image src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80" alt="banner" fill className="object-cover mix-blend-overlay opacity-60" unoptimized />
          <div className="relative z-10 h-full p-6 lg:p-8 flex flex-col justify-center max-w-md text-white">
            <h2 className="font-display text-[22px] lg:text-[26px] font-bold leading-tight">Travel Together<br/>Create Memories</h2>
            <p className="text-[12px] lg:text-[13px] text-white/85 mt-2">Create your trip, invite others and explore beautiful places together.</p>
            <Link href="/explore/create" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white text-violet-700 px-4 py-2 text-[13px] font-semibold w-fit shadow hover:shadow-lg transition">
              <Plus className="size-4" /> Create a Trip
            </Link>
          </div>
        </div>

        {/* Category pills */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
          {CAT_TABS.map(c => {
            const Icon = c.icon;
            const active = tab === c.id;
            return (
              <button key={c.id} onClick={() => setTab(c.id)} className={`shrink-0 inline-flex items-center gap-2 rounded-xl border px-3.5 h-10 text-[13px] font-semibold transition ${active ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                <Icon className="size-4" />
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Popular trips */}
        <div className="mt-6 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-slate-900">Popular Trips</h3>
          <div className="hidden lg:flex items-center gap-2 text-[13px] text-slate-500">
            {loading ? <span className="inline-flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> loading</span> : <>Sort by: <select value={sort} onChange={e => setSort(e.target.value)} className="font-semibold text-slate-800 bg-transparent outline-none cursor-pointer"><option>Latest</option><option>Popular</option></select></>}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
          {filtered.map(t => <TripCard key={t.id} trip={t} />)}
        </div>

        {filtered.length === 0 && (
          <div className="mt-10 text-center py-12 bg-white rounded-2xl border border-slate-100">
            <div className="font-display font-bold text-slate-900">No trips found</div>
            <p className="text-[13px] text-slate-500 mt-1">Try clearing filters or browsing a different category.</p>
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <button className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-5 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
            Load More Trips <ChevronDown className="size-4" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setShowFilters(false)}>
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto bg-white rounded-t-3xl p-5" onClick={e => e.stopPropagation()}>
            <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-200" />
            <div className="mt-4">{filterPanel}</div>
          </div>
        </div>
      )}
    </TripShell>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin text-violet-600" /></div>}>
      <ExplorePageInner />
    </Suspense>
  );
}
