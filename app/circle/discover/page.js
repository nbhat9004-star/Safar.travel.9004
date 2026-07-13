'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import CircleNav from '@/components/circle/CircleNav';
import { circleApi, THEMES, themeLabel, formatINR, INDIA_DESTINATIONS } from '@/lib/circle-api';
import { MapPin, Users, Filter, Search, ChevronDown, Sparkles } from 'lucide-react';

export default function DiscoverPage() {
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('');
  const [destination, setDestination] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [q, setQ] = useState('');

  const load = () => {
    setLoading(true);
    circleApi.discover({ theme, destination, maxBudget, limit: 24 })
      .then(r => setJourneys(r.journeys || []))
      .catch(() => setJourneys([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [theme, destination, maxBudget]);

  const filtered = q
    ? journeys.filter(j => (j.name + ' ' + (j.description || '') + ' ' + (j.destination?.name || '')).toLowerCase().includes(q.toLowerCase()))
    : journeys;

  return (
    <main className="min-h-screen relative text-white pt-20 md:pt-24 pb-32">
      <CircleNav />
      <div className="circle-aurora" style={{ opacity: 0.35 }} />
      <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div className="min-w-0">
            <div className="circle-chip">Journey Gallery</div>
            <h1 className="display text-3xl sm:text-4xl md:text-6xl font-bold mt-3 md:mt-4 leading-[1.05]">Discover <span className="circle-grad-text">Journeys</span></h1>
            <p className="text-white/70 mt-2 md:mt-3 text-sm md:text-base max-w-xl">Every journey is a cinematic poster. Hover to reveal the details. Tap to step into the story.</p>
          </div>
          <Link href="/circle/create" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full circle-btn-primary text-sm font-semibold w-full md:w-fit shrink-0">
            <Sparkles className="size-4" /> Create a Journey
          </Link>
        </div>

        {/* Filters */}
        <div className="mt-6 md:mt-8 circle-glass circle-card p-3 md:p-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2 px-3 flex-1 min-w-0 sm:min-w-[220px] rounded-full bg-white/5 sm:bg-transparent">
            <Search className="size-4 text-white/60 shrink-0" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, place, curator"
              className="bg-transparent outline-none w-full py-3 text-sm placeholder:text-white/40 min-w-0" />
          </div>
          <div className="grid grid-cols-3 sm:contents gap-2">
            <FilterSelect value={theme} onChange={setTheme} label="Theme" options={[{ v: '', l: 'All themes' }, ...THEMES.map(t => ({ v: t.key, l: `${t.emoji} ${t.label}` }))]} />
            <FilterSelect value={destination} onChange={setDestination} label="Place" options={[{ v: '', l: 'Anywhere in India' }, ...INDIA_DESTINATIONS.map(d => ({ v: d.name, l: d.name }))]} />
            <FilterSelect value={maxBudget} onChange={setMaxBudget} label="Budget" options={[
              { v: '', l: 'Any budget' },
              { v: '10000', l: 'Under ₹10k' },
              { v: '25000', l: 'Under ₹25k' },
              { v: '50000', l: 'Under ₹50k' },
              { v: '100000', l: 'Under ₹1L' },
            ]} />
          </div>
        </div>

        {/* Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-3xl circle-glass animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="circle-glass circle-card p-12 text-center">
              <div className="text-lg font-semibold">No journeys match yet</div>
              <div className="text-white/60 text-sm mt-1">Adjust filters, or become the first Journey Curator here.</div>
              <Link href="/circle/create" className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full circle-btn-primary text-sm font-semibold">
                <Sparkles className="size-4" /> Create a Journey
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(j => <JourneyPoster key={j.id} j={j} />)}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function FilterSelect({ value, onChange, label, options }) {
  return (
    <label className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-full circle-glass-strong text-sm cursor-pointer min-w-0 w-full sm:w-auto">
      <span className="text-white/60 text-[10px] sm:text-xs uppercase tracking-wider shrink-0">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="bg-transparent outline-none appearance-none text-white text-xs sm:text-sm pr-5 min-w-0 flex-1 truncate">
        {options.map(o => <option key={o.v} value={o.v} className="bg-[#10162a]">{o.l}</option>)}
      </select>
      <ChevronDown className="size-3 text-white/60 pointer-events-none absolute right-2.5" />
    </label>
  );
}

function JourneyPoster({ j }) {
  const th = themeLabel(j.theme);
  return (
    <Link href={`/circle/j/${j.slug}`} className="group relative aspect-[3/4] rounded-3xl overflow-hidden block border border-white/10 circle-magnetic">
      {j.cover ? (
        // PERF: explicit width/height (3:4 ratio) reserves the exact aspect
        // box before decode → zero CLS in the discover grid.
        // eslint-disable-next-line @next/next/no-img-element
        <img loading="lazy" decoding="async" width={600} height={800} src={j.cover} alt={j.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/40 via-violet-500/40 to-pink-400/40" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
      <div className="absolute top-4 left-4 circle-chip !text-[10px]">{th.emoji} {th.label}</div>

      {/* Hover reveal */}
      <div className="absolute inset-0 flex flex-col justify-end p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-black/95 via-black/40 to-transparent">
        <div className="text-xs text-white/70 mb-2 space-y-1">
          {j.startDate && <div>{new Date(j.startDate).toDateString()} → {j.endDate ? new Date(j.endDate).toDateString() : 'Flexible'}</div>}
          <div>{j.maxMembers} seats · {j.difficulty}</div>
          <div>Curated by {j.curatorName}</div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-5 space-y-2 group-hover:opacity-0 transition-opacity duration-300">
        <div className="display text-xl font-bold">{j.name}</div>
        <div className="flex items-center gap-3 text-[11px] text-white/80">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {j.destination?.name || 'Multi-city'}</span>
          <span className="inline-flex items-center gap-1"><Users className="size-3" /> {j.maxMembers} seats</span>
        </div>
        <div className="pt-2 flex items-end justify-between">
          <div className="text-xs text-white/70">from</div>
          <div className="display text-xl font-bold circle-grad-text">{formatINR(j.estimate?.perPerson || j.budget || 0)}<span className="text-xs text-white/60 font-normal"> /person</span></div>
        </div>
      </div>
    </Link>
  );
}
