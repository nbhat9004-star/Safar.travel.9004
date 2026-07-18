'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';
import {
  Sparkles, ArrowRight, MapPin, Compass, Route, Users, Calendar, Bookmark,
  Clock, Camera, Mountain, Trophy, Award, Heart, Flag, Plus, ChevronRight,
  Snowflake, Waves, Leaf, Tent, Star, Loader2,
} from 'lucide-react';
import AuroraBg from '@/components/explore/AuroraBg';
import { useAuth } from '@/lib/auth-context';

// Cinematic Kashmir hero image (Dal Lake · houseboats)
const HERO_IMAGE = 'https://images.unsplash.com/photo-1577500588651-5603d971f338?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwxfHxrYXNobWlyJTIwbGFuZHNjYXBlfGVufDB8fHxibHVlfDE3ODQzNjY0MTV8MA&ixlib=rb-4.1.0&q=85';

// Fallback experience presets — only used when the user hasn't unlocked any yet
const EXPERIENCE_PRESETS = [
  { key: 'shikara',  emoji: '🚣', label: 'Shikara Ride' },
  { key: 'trek',     emoji: '🥾', label: 'Trek' },
  { key: 'gondola',  emoji: '🚠', label: 'Gondola' },
  { key: 'camp',     emoji: '🏕️', label: 'Camping' },
  { key: 'village',  emoji: '🏘️', label: 'Village Tour' },
  { key: 'photo',    emoji: '📸', label: 'Photo Walk' },
  { key: 'food',     emoji: '🍲', label: 'Wazwan' },
  { key: 'tulip',    emoji: '🌸', label: 'Tulip Festival' },
];

// Achievements — derived + fallback library
const ACHIEVEMENT_LIBRARY = [
  { id: 'first-journey',  icon: Flag,      emoji: '🚩', title: 'First Journey',        gate: (s) => s.journeys >= 1 },
  { id: 'trek',           icon: Mountain,  emoji: '🏔', title: 'First Mountain Trek',   gate: (s) => s.experiences >= 1 },
  { id: 'shikara',        icon: Waves,     emoji: '🚣', title: 'Shikara Ride',          gate: (s) => s.experiences >= 2 },
  { id: 'gondola',        icon: Snowflake, emoji: '🚠', title: 'Gondola Explorer',      gate: (s) => s.experiences >= 3 },
  { id: 'camper',         icon: Tent,      emoji: '🏕', title: 'Camper',                gate: (s) => s.experiences >= 4 },
  { id: 'photographer',   icon: Camera,    emoji: '📸', title: 'Photographer',          gate: (s) => s.journeys >= 2 },
  { id: 'places',         icon: MapPin,    emoji: '📍', title: '10+ Places',            gate: (s) => s.places >= 10 },
  { id: 'multi-journey',  icon: Route,     emoji: '🧭', title: 'Trail Blazer',          gate: (s) => s.journeys >= 5 },
];

function journeyStatus(j) {
  const now = Date.now();
  const start = j.startDate ? new Date(j.startDate).getTime() : null;
  const end   = j.endDate   ? new Date(j.endDate).getTime()   : null;
  if (start && end && now >= start && now <= end) return 'live';
  if (start && start > now) return 'upcoming';
  if (end && end < now) return 'completed';
  return 'draft';
}
function statusChip(s) {
  if (s === 'live')      return { label: 'Live now', dot: 'bg-emerald-400', text: 'text-emerald-300' };
  if (s === 'upcoming')  return { label: 'Upcoming', dot: 'bg-sky-400',     text: 'text-sky-300' };
  if (s === 'completed') return { label: 'Completed', dot: 'bg-white/50',   text: 'text-white/70' };
  return { label: 'Draft', dot: 'bg-amber-400', text: 'text-amber-300' };
}
function fmtDateRange(a, b) {
  const opts = { day: 'numeric', month: 'short' };
  const A = a ? new Date(a).toLocaleDateString('en-IN', opts) : null;
  const B = b ? new Date(b).toLocaleDateString('en-IN', opts) : null;
  if (A && B) return `${A} — ${B}`;
  return A || B || 'Dates TBD';
}

export default function ExploreHome() {
  const { user } = useAuth();
  const [passport, setPassport] = useState(null);
  const [myJourneys, setMyJourneys] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        const reqs = [
          fetch('/api/circle/passport').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/circle/journeys/mine').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/circle/bookmarks/mine?type=journey').then(r => r.ok ? r.json() : null).catch(() => null),
        ];
        const [p, m, b] = await Promise.all(reqs);
        if (cancel) return;
        if (p?.passport) setPassport(p);
        if (m?.journeys) setMyJourneys(m.journeys);
        if (b?.journeys) setSaved(b.journeys);
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    if (user) load(); else setLoading(false);
    return () => { cancel = true; };
  }, [user]);

  // Derived stats
  const stats = useMemo(() => {
    const p = passport?.passport;
    const places = p ? (p.cities || 0) : 0;
    const journeys = p ? (p.journeysCurated || 0) : 0;
    // Experiences: unique themes across curated journeys + earned badges (proxy for completed activities)
    const themeSet = new Set(myJourneys.map(j => j.theme).filter(Boolean));
    const badgeCount = (p?.badges || []).length;
    const experiences = Math.max(themeSet.size, badgeCount);
    return { places, journeys, experiences };
  }, [passport, myJourneys]);

  // Active journey (Live > Upcoming (soonest) > else null)
  const activeJourney = useMemo(() => {
    if (!myJourneys.length) return null;
    const live = myJourneys.find(j => journeyStatus(j) === 'live');
    if (live) return { ...live, _status: 'live' };
    const upcoming = myJourneys
      .filter(j => journeyStatus(j) === 'upcoming' && j.startDate)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
    if (upcoming) return { ...upcoming, _status: 'upcoming' };
    return null;
  }, [myJourneys]);

  // Recent Journeys (max 6, exclude the active one to avoid dupe)
  const recentJourneys = useMemo(() => {
    const list = (passport?.recentJourneys?.length ? passport.recentJourneys : myJourneys)
      .filter(j => !activeJourney || j.id !== activeJourney.id);
    return list.slice(0, 6);
  }, [passport, myJourneys, activeJourney]);

  // Past journeys (Travel Memories)
  const memories = useMemo(() => {
    return myJourneys
      .filter(j => journeyStatus(j) === 'completed')
      .sort((a, b) => new Date(b.endDate || b.updatedAt || 0) - new Date(a.endDate || a.updatedAt || 0))
      .slice(0, 5);
  }, [myJourneys]);

  // Achievements — earned + a couple of "next up" locked ones for aspirational feel
  const achievements = useMemo(() => {
    const earned = ACHIEVEMENT_LIBRARY.filter(a => a.gate(stats)).map(a => ({ ...a, earned: true }));
    const locked = ACHIEVEMENT_LIBRARY.filter(a => !a.gate(stats)).slice(0, Math.max(0, 6 - earned.length))
      .map(a => ({ ...a, earned: false }));
    return [...earned, ...locked].slice(0, 8);
  }, [stats]);

  const firstName = user?.name?.split(' ')[0] || 'Traveler';
  const heroName = user?.name || 'Fellow traveler';
  const bio = user?.bio || (user ? 'Chasing valleys, chinar & new stories.' : 'Sign in to start your Kashmir story.');
  const avatar = user?.avatar;

  return (
    <div className="relative">
      {/* ─────────────────────────── HERO ─────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="relative w-full h-[62vh] min-h-[420px] max-h-[640px]">
          <Image
            src={HERO_IMAGE}
            alt="Kashmir landscape"
            fill
            priority
            sizes="100vw"
            className="object-cover"
            unoptimized
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(6,8,15,0.35) 0%, rgba(6,8,15,0.15) 35%, rgba(6,8,15,0.85) 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 60% at 50% 0%, rgba(6,8,15,0.55), transparent 60%)' }} />
          <AuroraBg />

          {/* Hero content */}
          <div className="relative z-10 h-full e-container flex flex-col justify-end pb-24 md:pb-32">
            <div className="e-chip inline-flex w-max backdrop-blur-md" style={{ background: 'rgba(6,8,15,0.35)', borderColor: 'rgba(255,255,255,0.18)', color: '#fff' }}>
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" /> Your Kashmir · Live
            </div>
            <h1 className="display font-bold mt-4 text-[clamp(2rem,5.6vw,4.4rem)] leading-[1.05] tracking-tight text-white drop-shadow-2xl max-w-3xl">
              {user ? <>Welcome back, <span className="e-grad-text">{firstName}</span>.</> : <>Your <span className="e-grad-text">travel world</span>, alive.</>}
            </h1>
            <p className="mt-3 text-base md:text-lg max-w-xl leading-relaxed text-white/85 drop-shadow-md">
              {user ? 'Continue where you left off, plan the next chapter, and relive every valley you\'ve walked.' : 'Sign in to unlock your personal travel dashboard for Kashmir.'}
            </p>
          </div>
        </div>

        {/* ─────────────── Profile Card (overlaps hero) ─────────────── */}
        <div className="relative -mt-16 md:-mt-20 e-container z-20">
          <div className="e-glass rounded-3xl p-5 md:p-7 border border-white/15">
            <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-7">
              {/* Avatar */}
              <div className="shrink-0">
                {avatar ? (
                  <Image
                    src={avatar}
                    alt={heroName}
                    width={96}
                    height={96}
                    className="rounded-full ring-4 ring-white/20 shadow-xl object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="size-24 rounded-full grid place-items-center text-3xl font-bold text-[#06080f] shadow-xl ring-4 ring-white/20" style={{ background: 'linear-gradient(135deg, #6ee7b7 0%, #a78bfa 60%, #f0abfc 100%)' }}>
                    {(heroName || '?')[0]}
                  </div>
                )}
              </div>

              {/* Name + bio + stats */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl md:text-2xl font-bold truncate" style={{ color: 'var(--e-text)' }}>{heroName}</h2>
                  {user?.emailVerified && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-300/25">Verified</span>}
                </div>
                <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--e-text-muted)' }}>{bio}</p>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-3 gap-2 md:gap-4 max-w-lg">
                  <StatTile value={stats.places}      label="Places Explored" icon={MapPin} loading={loading && !!user} />
                  <StatTile value={stats.journeys}    label="Journeys"        icon={Route}  loading={loading && !!user} />
                  <StatTile value={stats.experiences} label="Experiences"     icon={Sparkles} loading={loading && !!user} />
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={user ? '/explore/journey' : '/?auth=1'}
                className="inline-flex items-center justify-center gap-2 px-6 md:px-7 py-3.5 rounded-full text-sm md:text-[15px] font-semibold text-white shadow-lg hover:shadow-emerald-500/30 transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 60%, #047857 100%)' }}
              >
                <Plus className="size-4" /> Create a Journey
              </Link>
              <Link
                href="/explore/wander"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm md:text-[15px] font-semibold e-btn-ghost"
              >
                <Compass className="size-4" /> Explore Kashmir <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────── CONTINUE YOUR JOURNEY ────────────────── */}
      <section className="relative e-container mt-10 mb-10">
        <SectionHeader
          chip={<><Clock className="size-3 text-emerald-300" /> Continue your journey</>}
          title={activeJourney ? 'Resume where you left off' : 'Your next chapter starts here'}
        />
        {activeJourney ? (
          <ResumeCard journey={activeJourney} />
        ) : (
          <div className="e-glass rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-5">
            <div className="size-16 md:size-20 rounded-2xl grid place-items-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(167,139,250,0.15))' }}>
              <Route className="size-8 md:size-10 text-emerald-300" strokeWidth={1.6} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="font-semibold text-lg" style={{ color: 'var(--e-text)' }}>You haven&apos;t created your first journey yet.</div>
              <p className="text-sm mt-1" style={{ color: 'var(--e-text-muted)' }}>Plan a trek, a shikara weekend, or a photo trail — your future self will thank you.</p>
            </div>
            <Link href={user ? '/explore/journey' : '/?auth=1'} className="e-btn-primary rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2 shrink-0">
              <Plus className="size-4" /> Start your first journey
            </Link>
          </div>
        )}
      </section>

      {/* ────────────────────── RECENT JOURNEYS ─────────────────── */}
      {recentJourneys.length > 0 && (
        <section className="relative e-container mb-10">
          <SectionHeader
            chip={<><Route className="size-3 text-sky-300" /> Recent journeys</>}
            title="Your travel timeline"
            action={<Link href="/explore/journey" className="text-sm inline-flex items-center gap-1 transition hover:opacity-80" style={{ color: 'var(--e-text-muted)' }}>See all <ArrowRight className="size-3.5" /></Link>}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentJourneys.map(j => <JourneyCard key={j.id} j={j} />)}
          </div>
        </section>
      )}

      {/* ────────────────────── ACHIEVEMENTS ───────────────────── */}
      <section className="relative e-container mb-10">
        <SectionHeader
          chip={<><Trophy className="size-3 text-amber-300" /> Achievements</>}
          title="Badges you're building"
          action={<Link href="/explore/passport" className="text-sm inline-flex items-center gap-1 transition hover:opacity-80" style={{ color: 'var(--e-text-muted)' }}>View passport <ArrowRight className="size-3.5" /></Link>}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
          {achievements.map(a => (
            <div key={a.id} className={`e-glass rounded-2xl p-4 flex items-center gap-3 ${a.earned ? '' : 'opacity-55'}`}>
              <div className={`size-11 rounded-xl grid place-items-center text-lg shrink-0 ${a.earned ? '' : 'grayscale'}`} style={{ background: a.earned ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'rgba(255,255,255,0.06)' }}>
                <span>{a.emoji}</span>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: 'var(--e-text)' }}>{a.title}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] mt-0.5" style={{ color: a.earned ? 'var(--e-text-dim)' : 'var(--e-text-dim)' }}>{a.earned ? 'Unlocked' : 'Locked'}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ────────────────── TRAVEL MEMORIES (Timeline) ─────────────────── */}
      {memories.length > 0 && (
        <section className="relative e-container mb-10">
          <SectionHeader
            chip={<><Camera className="size-3 text-fuchsia-300" /> Travel memories</>}
            title="Relive your past journeys"
          />
          <div className="e-glass rounded-3xl p-5 md:p-6">
            <ol className="relative border-l border-white/15 ml-2 space-y-6">
              {memories.map((j) => (
                <li key={j.id} className="pl-6 relative">
                  <span className="absolute -left-[9px] top-1.5 size-4 rounded-full ring-4 ring-[rgba(6,8,15,0.75)]" style={{ background: 'linear-gradient(135deg, #6ee7b7, #a78bfa)' }} />
                  <Link href={`/explore/j/${j.slug || j.id}`} className="group flex flex-col md:flex-row md:items-center gap-3 md:gap-5">
                    {j.coverImage && (
                      <div className="relative w-full md:w-32 h-24 rounded-xl overflow-hidden shrink-0">
                        <Image src={j.coverImage} alt={j.name || j.title || 'Memory'} fill sizes="128px" className="object-cover group-hover:scale-105 transition" unoptimized />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--e-text-dim)' }}>
                        {fmtDateRange(j.startDate, j.endDate)} · {j.destination?.name || 'Kashmir'}
                      </div>
                      <div className="font-semibold mt-1 group-hover:e-grad-text transition" style={{ color: 'var(--e-text)' }}>{j.name || j.title}</div>
                      {j.description && <div className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--e-text-muted)' }}>{j.description}</div>}
                    </div>
                    <ChevronRight className="size-4 shrink-0" style={{ color: 'var(--e-text-dim)' }} />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* ────────────────────── SAVED PLACES ───────────────────── */}
      <section className="relative e-container mb-16">
        <SectionHeader
          chip={<><Bookmark className="size-3 text-rose-300" /> Saved places</>}
          title="Your wishlist"
          action={<Link href="/explore/journey?tab=saved" className="text-sm inline-flex items-center gap-1 transition hover:opacity-80" style={{ color: 'var(--e-text-muted)' }}>All saved <ArrowRight className="size-3.5" /></Link>}
        />
        {saved.length === 0 ? (
          <div className="e-glass rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-5">
            <div className="size-14 rounded-2xl grid place-items-center shrink-0" style={{ background: 'rgba(244,63,94,0.12)' }}>
              <Heart className="size-6 text-rose-300" strokeWidth={1.6} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="font-semibold" style={{ color: 'var(--e-text)' }}>No saved places yet</div>
              <p className="text-sm mt-1" style={{ color: 'var(--e-text-muted)' }}>Tap the bookmark on any journey or experience to save it for later.</p>
            </div>
            <Link href="/explore/wander" className="e-btn-ghost rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2 shrink-0">
              <Compass className="size-4" /> Discover places
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {saved.slice(0, 8).map(j => (
              <Link key={j.id} href={`/explore/j/${j.slug || j.id}`} className="e-glass rounded-2xl overflow-hidden hover:-translate-y-0.5 transition group">
                {j.coverImage ? (
                  <div className="relative w-full aspect-[4/3]">
                    <Image src={j.coverImage} alt={j.name || j.title} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover group-hover:scale-105 transition" unoptimized />
                  </div>
                ) : (
                  <div className="w-full aspect-[4/3] grid place-items-center" style={{ background: 'linear-gradient(135deg, rgba(110,231,183,0.15), rgba(240,171,252,0.15))' }}>
                    <MapPin className="size-8" style={{ color: 'var(--e-text-dim)' }} />
                  </div>
                )}
                <div className="p-3">
                  <div className="text-[10px] uppercase tracking-[0.22em] truncate" style={{ color: 'var(--e-text-dim)' }}>{j.destination?.name || 'Kashmir'}</div>
                  <div className="font-semibold text-sm mt-0.5 line-clamp-2" style={{ color: 'var(--e-text)' }}>{j.name || j.title}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─────────────────────────── Sub-components ───────────────────────────

function StatTile({ value, label, icon: Icon, loading }) {
  return (
    <div className="rounded-2xl px-3 py-3 md:px-4 md:py-3.5 text-center md:text-left" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--e-line)' }}>
      <div className="flex items-center gap-1.5 justify-center md:justify-start">
        <Icon className="size-3.5 opacity-70" style={{ color: 'var(--e-text-dim)' }} />
        <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: 'var(--e-text-dim)' }}>{label}</span>
      </div>
      <div className="font-bold text-2xl md:text-3xl mt-1 e-grad-text tabular-nums">
        {loading ? <Loader2 className="size-5 inline animate-spin" style={{ color: 'var(--e-text-dim)' }} /> : value}
      </div>
    </div>
  );
}

function SectionHeader({ chip, title, action }) {
  return (
    <div className="flex items-end justify-between mb-5 gap-3 flex-wrap">
      <div>
        <div className="e-chip">{chip}</div>
        <h2 className="display text-2xl md:text-3xl font-bold mt-3" style={{ color: 'var(--e-text)' }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function ResumeCard({ journey }) {
  const s = statusChip(journey._status || journeyStatus(journey));
  return (
    <Link href={`/explore/j/${journey.slug || journey.id}`} className="e-glass rounded-3xl overflow-hidden flex flex-col md:flex-row group hover:-translate-y-0.5 transition">
      {journey.coverImage ? (
        <div className="relative w-full md:w-64 lg:w-80 aspect-video md:aspect-auto md:h-auto shrink-0">
          <Image src={journey.coverImage} alt={journey.name || journey.title} fill sizes="(min-width:1024px) 320px, 100vw" className="object-cover group-hover:scale-105 transition" unoptimized />
          <div className="absolute inset-0 md:hidden" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(6,8,15,0.65))' }} />
        </div>
      ) : (
        <div className="w-full md:w-64 lg:w-80 aspect-video md:aspect-auto md:h-auto shrink-0 grid place-items-center" style={{ background: 'linear-gradient(135deg, rgba(110,231,183,0.15), rgba(240,171,252,0.15))' }}>
          <Route className="size-12" style={{ color: 'var(--e-text-dim)' }} />
        </div>
      )}
      <div className="flex-1 p-5 md:p-6 flex flex-col justify-center">
        <div className={`inline-flex w-max items-center gap-1.5 text-[11px] font-semibold ${s.text}`}>
          <span className={`size-1.5 rounded-full ${s.dot} animate-pulse`} /> {s.label}
        </div>
        <div className="font-bold text-xl md:text-2xl mt-2" style={{ color: 'var(--e-text)' }}>{journey.name || journey.title}</div>
        <div className="text-sm mt-1" style={{ color: 'var(--e-text-muted)' }}>
          <MapPin className="inline size-3.5 mr-1 opacity-70" />{journey.destination?.name || 'Kashmir'} · {fmtDateRange(journey.startDate, journey.endDate)}
        </div>
        <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold e-grad-text">
          Resume journey <ArrowRight className="size-4" />
        </div>
      </div>
    </Link>
  );
}

function JourneyCard({ j }) {
  const s = statusChip(journeyStatus(j));
  return (
    <Link href={`/explore/j/${j.slug || j.id}`} className="e-glass rounded-2xl overflow-hidden group hover:-translate-y-0.5 transition flex flex-col">
      {j.coverImage ? (
        <div className="relative w-full aspect-[16/10]">
          <Image src={j.coverImage} alt={j.name || j.title} fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover group-hover:scale-105 transition" unoptimized />
          <div className={`absolute top-3 left-3 inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full backdrop-blur-md ${s.text}`} style={{ background: 'rgba(6,8,15,0.55)' }}>
            <span className={`size-1.5 rounded-full ${s.dot}`} /> {s.label}
          </div>
        </div>
      ) : (
        <div className="w-full aspect-[16/10] grid place-items-center relative" style={{ background: 'linear-gradient(135deg, rgba(110,231,183,0.15), rgba(240,171,252,0.15))' }}>
          <Route className="size-10" style={{ color: 'var(--e-text-dim)' }} />
          <div className={`absolute top-3 left-3 inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full ${s.text}`} style={{ background: 'rgba(6,8,15,0.55)' }}>
            <span className={`size-1.5 rounded-full ${s.dot}`} /> {s.label}
          </div>
        </div>
      )}
      <div className="p-4">
        <div className="text-[10px] uppercase tracking-[0.22em] truncate" style={{ color: 'var(--e-text-dim)' }}>{j.destination?.name || 'Kashmir'} · {j.theme || 'Journey'}</div>
        <div className="font-semibold mt-1 line-clamp-2" style={{ color: 'var(--e-text)' }}>{j.name || j.title}</div>
        <div className="text-xs mt-2" style={{ color: 'var(--e-text-muted)' }}>{fmtDateRange(j.startDate, j.endDate)}</div>
      </div>
    </Link>
  );
}
