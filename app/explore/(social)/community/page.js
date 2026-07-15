'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Users, UserPlus, MessageCircle, MapPin, Sparkles, Filter, Heart, Backpack, Plane, Baby, Baseline as User, Search, Loader2 } from 'lucide-react';
import AuroraBg from '@/components/explore/AuroraBg';
import BadgeChip from '@/components/explore/BadgeChip';
import AIPanel from '@/components/explore/AIPanel';
import { IMG } from '@/lib/data';
import { useAuth } from '@/lib/auth-context';

const TYPES = [
  { id: 'all', label: 'All travelers', icon: Users },
  { id: 'solo', label: 'Solo', icon: User },
  { id: 'backpackers', label: 'Backpackers', icon: Backpack },
  { id: 'couples', label: 'Couples', icon: Heart },
  { id: 'families', label: 'Families', icon: Baby },
  { id: 'groups', label: 'Groups', icon: Plane },
];

const MOCK_BUDDIES = [
  { id: 'b1', name: 'Aanya Sharma', avatar: 'https://i.pravatar.cc/128?img=45', city: 'Mumbai', dates: 'Dec 12–19', type: 'solo', style: 'Slow travel • Cafes • Photos', badge: '4.9 host rating' },
  { id: 'b2', name: 'Rohan & Meera', avatar: 'https://i.pravatar.cc/128?img=13', city: 'Bengaluru', dates: 'Jan 3–10', type: 'couples', style: 'Ski + honeymoon vibes', badge: 'Verified traveler' },
  { id: 'b3', name: 'Trail Crew', avatar: 'https://i.pravatar.cc/128?img=52', city: 'Delhi', dates: 'Nov 22–28', type: 'groups', style: 'Trekking • Camping', badge: '6 members' },
  { id: 'b4', name: 'Saira K.', avatar: 'https://i.pravatar.cc/128?img=32', city: 'Pune', dates: 'Feb 8–14', type: 'backpackers', style: 'Cheap, deep, real', badge: 'Repeat traveler' },
  { id: 'b5', name: 'The Iyers', avatar: 'https://i.pravatar.cc/128?img=68', city: 'Chennai', dates: 'Dec 24–30', type: 'families', style: '2 kids, gentle pace', badge: 'Family-friendly' },
  { id: 'b6', name: 'Kabir M.', avatar: 'https://i.pravatar.cc/128?img=7', city: 'Kolkata', dates: 'Mar 5–12', type: 'solo', style: 'Local food + old town', badge: 'Photographer' },
];

const DISCUSSIONS = [
  { title: 'Best month to see snow in Gulmarg?', by: 'Priya N.', replies: 34, tag: 'Timing' },
  { title: 'Solo female tips for old Srinagar', by: 'Anjali R.', replies: 58, tag: 'Solo' },
  { title: 'Kashmir with toddlers — realistic itinerary', by: 'Rohit K.', replies: 22, tag: 'Family' },
  { title: 'Best photography spots at sunrise', by: 'Kabir M.', replies: 41, tag: 'Photography' },
];

export default function ExploreCommunity() {
  const [type, setType] = useState('all');
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Travel Buddy Finder filters
  const [flt, setFlt] = useState({ destination: '', dates: '', budget: '', language: '', style: '', age: '', interests: '' });
  const [showFlt, setShowFlt] = useState(false);

  useEffect(() => {
    let cancel = false;
    fetch('/api/circle/journeys?limit=8').then(r => r.json()).then(j => {
      if (!cancel) { setJourneys(j.journeys || []); setLoading(false); }
    }).catch(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);

  const filtered = type === 'all' ? MOCK_BUDDIES : MOCK_BUDDIES.filter(b => b.type === type);

  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative overflow-hidden pt-14 md:pt-20 pb-10">
        <AuroraBg />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 e-fade-in">
          <div className="e-chip"><Users className="size-3 text-emerald-300" /> Community</div>
          <h1 className="display font-bold mt-4 text-[clamp(2rem,5.6vw,4rem)] leading-tight max-w-3xl">
            Find your <span className="e-grad-text">travel tribe.</span>
          </h1>
          <p className="mt-4 text-white/75 max-w-2xl">Solo wanderers, backpackers, couples, families and squads — real people planning real Kashmir trips right now.</p>
        </div>
      </section>

      {/* AI Buddy Match */}
      <section className="relative max-w-7xl mx-auto px-4 md:px-8 mb-10">
        <AIPanel
          title="Safar AI — Buddy Match"
          suggestions={['I am solo, 26, want photography-focused trip in Nov', 'We are a couple, love adventure but no crowds', 'Family of 4, kids 6 & 9, week-long relaxed trip']}
          systemHint="You are a matchmaking travel concierge for Kashmir. Given the traveler's profile, suggest 3 compatible travel-buddy archetypes and 2 group trip ideas with rough budgets in ₹. Bullet points only."
        />
      </section>

      {/* Type filter */}
      <section className="relative max-w-7xl mx-auto px-4 md:px-8 mb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <div className="e-chip"><Users className="size-3 text-emerald-300" /> Travel Buddy Finder</div>
          <button onClick={() => setShowFlt(v => !v)} className="text-xs inline-flex items-center gap-1.5 e-btn-ghost rounded-full px-3 py-1.5"><Filter className="size-3.5" /> {showFlt ? 'Hide filters' : 'Show filters'}</button>
        </div>
        {showFlt && (
          <div className="e-glass rounded-2xl p-4 md:p-5 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className="text-xs"><span className="uppercase tracking-[0.22em] block mb-1" style={{ color: 'var(--e-text-dim)' }}>Destination</span><input value={flt.destination} onChange={e => setFlt({ ...flt, destination: e.target.value })} placeholder="Srinagar, Gulmarg…" className="e-input" /></label>
            <label className="text-xs"><span className="uppercase tracking-[0.22em] block mb-1" style={{ color: 'var(--e-text-dim)' }}>Dates</span><input type="text" value={flt.dates} onChange={e => setFlt({ ...flt, dates: e.target.value })} placeholder="Dec 12–19" className="e-input" /></label>
            <label className="text-xs"><span className="uppercase tracking-[0.22em] block mb-1" style={{ color: 'var(--e-text-dim)' }}>Budget (₹)</span><input type="text" value={flt.budget} onChange={e => setFlt({ ...flt, budget: e.target.value })} placeholder="₹20k – ₹60k" className="e-input" /></label>
            <label className="text-xs"><span className="uppercase tracking-[0.22em] block mb-1" style={{ color: 'var(--e-text-dim)' }}>Language</span><input value={flt.language} onChange={e => setFlt({ ...flt, language: e.target.value })} placeholder="English, Hindi, Urdu" className="e-input" /></label>
            <label className="text-xs"><span className="uppercase tracking-[0.22em] block mb-1" style={{ color: 'var(--e-text-dim)' }}>Travel style</span>
              <select value={flt.style} onChange={e => setFlt({ ...flt, style: e.target.value })} className="e-input"><option value="">Any</option><option>Backpacker</option><option>Balanced</option><option>Premium</option><option>Luxury</option></select>
            </label>
            <label className="text-xs"><span className="uppercase tracking-[0.22em] block mb-1" style={{ color: 'var(--e-text-dim)' }}>Age</span>
              <select value={flt.age} onChange={e => setFlt({ ...flt, age: e.target.value })} className="e-input"><option value="">Any</option><option>18–25</option><option>26–35</option><option>36–45</option><option>46+</option></select>
            </label>
            <label className="text-xs col-span-2"><span className="uppercase tracking-[0.22em] block mb-1" style={{ color: 'var(--e-text-dim)' }}>Interests</span><input value={flt.interests} onChange={e => setFlt({ ...flt, interests: e.target.value })} placeholder="Photography · Trekking · Food" className="e-input" /></label>
            <div className="col-span-2 md:col-span-4 flex gap-2 justify-end">
              <button onClick={() => setFlt({ destination: '', dates: '', budget: '', language: '', style: '', age: '', interests: '' })} className="text-xs e-btn-ghost rounded-full px-4 py-1.5">Clear</button>
              <button className="text-xs e-btn-primary rounded-full px-4 py-1.5 inline-flex items-center gap-1"><Sparkles className="size-3" /> Find matches</button>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 overflow-x-auto e-scroll-x pb-1">
          {TYPES.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setType(id)} className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition border ${type===id ? 'e-btn-primary border-transparent' : 'bg-white/[0.04] border-white/10 text-white/75 hover:bg-white/[0.08] hover:text-white'}`}>
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
      </section>

      {/* Buddies grid */}
      <section className="relative max-w-7xl mx-auto px-4 md:px-8 mb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(b => (
            <div key={b.id} className="e-glass rounded-3xl p-5 e-lift-in">
              <div className="flex items-start gap-4">
                <Image src={b.avatar} alt={b.name} width={56} height={56} className="rounded-2xl ring-1 ring-white/20" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold text-white truncate">{b.name}</div>
                    <BadgeChip type="new">{b.badge}</BadgeChip>
                  </div>
                  <div className="text-[11px] text-white/55 mt-0.5 truncate"><MapPin className="inline size-3 mr-0.5" />{b.city} • {b.dates}</div>
                  <div className="text-sm text-white/80 mt-2 leading-relaxed">{b.style}</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="e-btn-primary rounded-full px-4 py-2 text-xs inline-flex items-center gap-1.5"><UserPlus className="size-3.5" /> Connect</button>
                <button className="e-btn-ghost rounded-full px-4 py-2 text-xs inline-flex items-center gap-1.5"><MessageCircle className="size-3.5" /> Message</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Public trips (reused from /circle backend) */}
      <section className="relative max-w-7xl mx-auto px-4 md:px-8 mb-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="e-chip"><Plane className="size-3 text-violet-300" /> Public trips</div>
            <h2 className="display text-2xl md:text-3xl font-bold mt-3">Join a journey already in motion</h2>
          </div>
          <Link href="/explore/journey" className="e-btn-ghost rounded-full px-4 py-2 text-sm inline-flex items-center gap-1.5"><Sparkles className="size-4" /> Create a trip</Link>
        </div>
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map(i => <div key={i} className="e-glass rounded-3xl p-5 h-56 e-skeleton" />)}
          </div>
        ) : journeys.length === 0 ? (
          <div className="e-glass rounded-3xl p-8 text-center">
            <div className="e-chip mx-auto">✨ Fresh start</div>
            <p className="mt-4 text-white/70">No public trips yet. Be the first — <Link href="/explore/journey" className="e-grad-text font-semibold">create a journey</Link>.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {journeys.map(j => (
              <Link key={j.id} href={`/explore/journey?trip=${j.slug || j.id}`} className="e-card e-lift-in">
                {j.coverImage && (
                  <div className="e-card-media"><Image src={j.coverImage} alt={j.title} fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover" /></div>
                )}
                <div className="p-5">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">{j.destination?.name || 'Kashmir'} • {j.theme || 'Journey'}</div>
                  <div className="font-semibold mt-1 line-clamp-2">{j.title}</div>
                  {j.pricing?.pricePerPerson && <div className="mt-2 text-xs text-white/60">from <span className="text-white font-semibold">₹{Number(j.pricing.pricePerPerson).toLocaleString('en-IN')}</span> / person</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Discussions */}
      <section className="relative max-w-7xl mx-auto px-4 md:px-8 pb-24">
        <div className="e-chip"><MessageCircle className="size-3 text-emerald-300" /> Discussions</div>
        <h2 className="display text-2xl md:text-3xl font-bold mt-3 mb-6">The community is talking</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {DISCUSSIONS.map(d => (
            <div key={d.title} className="e-glass rounded-2xl p-5 hover:border-white/25 transition cursor-pointer">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">{d.tag}</div>
                  <div className="font-semibold mt-1 truncate">{d.title}</div>
                  <div className="text-xs text-white/55 mt-1">Started by {d.by} • {d.replies} replies</div>
                </div>
                <div className="size-9 rounded-full bg-white/5 border border-white/15 grid place-items-center shrink-0"><MessageCircle className="size-4 text-white/70" /></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
