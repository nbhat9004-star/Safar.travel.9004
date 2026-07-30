'use client';
import { Suspense, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Share2, MoreHorizontal, MapPin, BadgeCheck, ShieldCheck,
  Briefcase, Users, Gift, Star, Bookmark, Lock, Trophy, Award,
  Gift as GiftIcon, Shield as ShieldIcon, Loader2, Tent, Mountain, Bike,
  Backpack,
} from 'lucide-react';
import Shell from '@/components/explore-v2/Shell';
import { MORE_TRIPS, REWARD_CARDS, BADGES } from '@/lib/explore-v2-data';

// ---------------------------------------------------------------------------
// Explore Profile Page — pixel-close to the approved reference design.
// UI-only redesign. No backend/API/routing/state-shape changes.
// Preserved: /explore/me route, ?tab= query param, Shell (bottom nav),
// MORE_TRIPS / REWARD_CARDS / BADGES data sources.
// ---------------------------------------------------------------------------

const CATEGORY_META = {
  Camping:     { icon: Tent,      color: 'text-emerald-700 bg-emerald-50 ring-emerald-100' },
  Bike:        { icon: Bike,      color: 'text-emerald-700 bg-emerald-50 ring-emerald-100' },
  Backpacking: { icon: Backpack,  color: 'text-emerald-700 bg-emerald-50 ring-emerald-100' },
  Trek:        { icon: Mountain,  color: 'text-emerald-700 bg-emerald-50 ring-emerald-100' },
};

function MeInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const initial = sp.get('tab') || 'trips';
  const [tab, setTab] = useState(initial);
  const [bookmarked, setBookmarked] = useState({});
  const unlocked = REWARD_CARDS.filter((r) => r.unlocked).length;

  const toggleBookmark = (id) =>
    setBookmarked((prev) => ({ ...prev, [id]: !prev[id] }));

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/explore');
  };

  const stats = [
    { icon: Briefcase, tint: 'bg-emerald-50 text-emerald-700',   value: '12',  label: 'Hosted',  sub: 'Trips' },
    { icon: Users,     tint: 'bg-violet-50 text-violet-700',     value: '8',   label: 'Joined',  sub: 'Trips' },
    { icon: Gift,      tint: 'bg-amber-50 text-amber-600',       value: `${unlocked}/9`, label: 'Rewards', sub: 'Level' },
    { icon: Star,      tint: 'bg-sky-50 text-sky-600',           value: '4.9', label: 'Rating',  sub: '(128 Reviews)', trailing: true },
  ];

  return (
    <Shell>
      <main className="min-h-screen bg-white pb-28">
        {/* ============================ HERO COVER ============================ */}
        <section className="relative">
          <div className="relative w-full h-[240px] sm:h-[280px] md:h-[320px] lg:h-[340px] overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=2200&q=85"
              alt="Cover"
              fill
              priority
              sizes="100vw"
              className="object-cover"
              unoptimized
            />
            {/* Soft bottom fade so the floating avatar sits gracefully */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white/40" />
          </div>

          {/* Top-left back button */}
          <button
            onClick={goBack}
            aria-label="Back"
            className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4 md:top-6 md:left-6 grid place-items-center size-11 rounded-full bg-white shadow-md ring-1 ring-black/5 hover:scale-105 active:scale-95 transition"
          >
            <ArrowLeft className="size-5 text-slate-800" strokeWidth={2.2} />
          </button>

          {/* Top-right actions */}
          <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 md:top-6 md:right-6 flex items-center gap-2">
            <button
              aria-label="Share profile"
              className="grid place-items-center size-11 rounded-full bg-white shadow-md ring-1 ring-black/5 hover:scale-105 active:scale-95 transition"
            >
              <Share2 className="size-[19px] text-slate-800" strokeWidth={2.2} />
            </button>
            <button
              aria-label="More options"
              className="grid place-items-center size-11 rounded-full bg-white shadow-md ring-1 ring-black/5 hover:scale-105 active:scale-95 transition"
            >
              <MoreHorizontal className="size-5 text-slate-800" strokeWidth={2.2} />
            </button>
          </div>
        </section>

        {/* ============================ PROFILE INFO ========================== */}
        <section className="relative">
          <div className="max-w-3xl mx-auto px-6 md:px-8">
            {/* Avatar + name row */}
            <div className="-mt-16 md:-mt-20 flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
              {/* Floating circular avatar with verified check */}
              <div className="relative shrink-0 self-start">
                <div className="relative size-[128px] md:size-[140px] rounded-full overflow-hidden ring-[5px] ring-white shadow-[0_18px_40px_-16px_rgba(15,23,42,0.28)] bg-slate-200">
                  <Image
                    src="https://i.pravatar.cc/300?img=13"
                    alt="Profile"
                    fill
                    sizes="140px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                {/* Verified check pip */}
                <span
                  aria-label="Verified account"
                  className="absolute bottom-2 right-1.5 grid place-items-center size-7 rounded-full bg-emerald-600 ring-[3px] ring-white shadow-sm"
                >
                  <BadgeCheck className="size-4 text-white" strokeWidth={2.6} />
                </span>
              </div>

              {/* Name + location + bio */}
              <div className="flex-1 min-w-0 pt-1 md:pb-2">
                <div className="flex items-center gap-2">
                  <h1 className="font-display font-extrabold text-slate-900 tracking-tight text-[26px] md:text-[30px] leading-tight">
                    Shahnawaz
                  </h1>
                  <BadgeCheck className="size-6 text-violet-600 shrink-0" strokeWidth={2.4} />
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[13.5px] md:text-[14px] text-slate-500">
                  <MapPin className="size-[15px] text-slate-400" strokeWidth={2.2} />
                  <span>Srinagar, Jammu &amp; Kashmir</span>
                </div>
                <p className="mt-3 text-slate-600 text-[13.5px] md:text-[14.5px] leading-relaxed max-w-md">
                  Explorer at heart, host by choice.
                  <br className="hidden sm:inline" /> Sharing incredible places and experiences.
                </p>
              </div>
            </div>

            {/* ============================ STATS CARD ==================== */}
            <div className="mt-6 md:mt-7 rounded-[22px] bg-white ring-1 ring-slate-100 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]">
              <div className="grid grid-cols-4 divide-x divide-slate-100">
                {stats.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="px-1.5 py-4 md:py-5 flex flex-col items-center text-center">
                      <span className={`grid place-items-center size-9 md:size-10 rounded-full ${s.tint}`}>
                        <Icon className={`size-[18px] md:size-5 ${i === 3 ? '' : ''}`} strokeWidth={2.2} />
                      </span>
                      <div className="mt-2 font-display font-extrabold text-slate-900 text-[22px] md:text-[24px] tracking-tight leading-none tabular-nums">
                        {s.value}
                      </div>
                      <div className="mt-1.5 text-[12.5px] md:text-[13px] font-semibold text-slate-800 inline-flex items-center gap-1 leading-tight">
                        {s.label}
                        {s.trailing && (
                          <Star className="size-3 fill-emerald-600 text-emerald-600" strokeWidth={0} />
                        )}
                      </div>
                      <div className="text-[10.5px] md:text-[11px] text-slate-500 mt-0.5">
                        {s.sub}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ============================ TABS ========================== */}
            <div className="mt-6 md:mt-7 border-b border-slate-100">
              <div role="tablist" aria-label="Profile sections" className="grid grid-cols-3">
                <TabButton active={tab === 'trips'}   onClick={() => setTab('trips')}   label="Trips" />
                <TabButton active={tab === 'rewards'} onClick={() => setTab('rewards')} label="Rewards" icon={GiftIcon} />
                <TabButton active={tab === 'badges'}  onClick={() => setTab('badges')}  label="Badges"  icon={ShieldIcon} />
              </div>
            </div>

            {/* ============================ TAB CONTENT =================== */}
            <div className="mt-5 md:mt-6">
              {tab === 'trips' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                  {MORE_TRIPS.map((t) => (
                    <ProfileTripCard
                      key={t.id}
                      trip={t}
                      saved={!!bookmarked[t.id]}
                      onToggleBookmark={() => toggleBookmark(t.id)}
                    />
                  ))}
                </div>
              )}

              {tab === 'rewards' && (
                <div className="rounded-[22px] bg-white ring-1 ring-slate-100 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] p-5 md:p-6">
                  <div className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-800">
                    <Trophy className="size-4 text-amber-500" strokeWidth={2.2} />
                    {unlocked} / 9 unlocked
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-700 transition-[width] duration-500"
                      style={{ width: `${(unlocked / 9) * 100}%` }}
                    />
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {REWARD_CARDS.map((r) => (
                      <div
                        key={r.id}
                        className={`aspect-square rounded-2xl grid place-items-center text-center p-2 ring-1 transition ${
                          r.unlocked
                            ? 'bg-gradient-to-br from-amber-50 to-orange-50 ring-amber-200/70'
                            : 'bg-slate-50 ring-slate-100'
                        }`}
                      >
                        {r.unlocked ? (
                          <div>
                            <div className="text-[28px] leading-none">{r.icon}</div>
                            <div className="mt-1 text-[10px] font-bold text-slate-800 leading-tight">
                              {r.reward}
                            </div>
                          </div>
                        ) : (
                          <Lock className="size-6 text-slate-300" strokeWidth={2.2} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'badges' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-5">
                  {Object.entries(BADGES).map(([id, b]) => (
                    <div
                      key={id}
                      className="rounded-[22px] bg-white ring-1 ring-slate-100 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] p-5 text-center transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-14px_rgba(15,23,42,0.2)]"
                    >
                      <div
                        className={`mx-auto grid place-items-center size-14 rounded-2xl bg-gradient-to-br ${b.color} text-white text-[24px] shadow-md`}
                      >
                        {b.emoji}
                      </div>
                      <div className="mt-3 font-semibold text-[13.5px] text-slate-900">{b.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 inline-flex items-center gap-1">
                        <Award className="size-3" strokeWidth={2.2} /> Community
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </Shell>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function TabButton({ active, onClick, label, icon: Icon }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative flex items-center justify-center gap-2 py-3 md:py-3.5 text-[14px] md:text-[15px] font-semibold transition ${
        active ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {Icon && <Icon className="size-[17px]" strokeWidth={2.2} />}
      {label}
      {active && (
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 -bottom-px h-[3px] w-10 rounded-full bg-emerald-600"
        />
      )}
    </button>
  );
}

function ProfileTripCard({ trip, saved, onToggleBookmark }) {
  const Cat = CATEGORY_META[trip.type] || CATEGORY_META.Camping;
  const CatIcon = Cat.icon;

  return (
    <article className="group bg-white rounded-[22px] overflow-hidden ring-1 ring-slate-100 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] hover:shadow-[0_22px_44px_-18px_rgba(15,23,42,0.22)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
      {/* Image */}
      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
        <Image
          src={trip.cover}
          alt={trip.title}
          fill
          sizes="(max-width:768px) 100vw, 50vw"
          className="object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
          unoptimized
          loading="lazy"
        />
        {/* Top-left badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm ${
              trip.mode === 'safar'
                ? 'bg-emerald-700 text-white'
                : 'bg-violet-600 text-white'
            }`}
          >
            {trip.mode === 'safar' && <ShieldCheck className="size-3.5" strokeWidth={2.4} />}
            {trip.mode === 'safar' ? 'Verified by Safar' : 'Self Hosted'}
          </span>
        </div>
        {/* Top-right date pill */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11.5px] font-semibold bg-white text-slate-800 shadow-sm ring-1 ring-black/5">
            {trip.dates}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-5 flex flex-col flex-1">
        <h3 className="font-display font-extrabold text-slate-900 text-[17px] md:text-[18px] tracking-tight leading-tight line-clamp-1">
          {trip.title}
        </h3>
        <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-slate-500">
          <MapPin className="size-[14px] text-slate-400" strokeWidth={2.2} />
          <span className="truncate">{trip.location}</span>
        </div>

        {/* Host + Category row */}
        <div className="mt-3.5 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="grid place-items-center size-7 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold ring-1 ring-emerald-100 shrink-0">
              {trip.host?.[0]?.toUpperCase() || 'H'}
            </span>
            <span className="text-[12.5px] text-slate-500 truncate">
              Hosted by <span className="font-semibold text-slate-900">{trip.host}</span>
            </span>
            {trip.verified && (
              <BadgeCheck className="size-4 text-violet-600 shrink-0" strokeWidth={2.4} />
            )}
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold ring-1 ${Cat.color} shrink-0`}
          >
            <CatIcon className="size-3.5" strokeWidth={2.2} />
            {trip.type}
          </span>
        </div>

        {/* Joined */}
        <div className="mt-3 flex items-center gap-1.5 text-[12.5px] text-slate-500">
          <Users className="size-[14px] text-slate-400" strokeWidth={2.2} />
          <span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {trip.joined} / {trip.max}
            </span>{' '}
            joined
          </span>
        </div>

        {/* CTA row */}
        <div className="mt-4 flex items-center gap-2.5">
          <Link
            href={`/explore/trip/${trip.id}`}
            className="flex-1 inline-flex items-center justify-center rounded-xl bg-emerald-800 hover:bg-emerald-900 active:scale-[0.99] text-white font-bold text-[13.5px] md:text-[14px] py-3 shadow-sm shadow-emerald-900/25 transition"
          >
            Request to Join
          </Link>
          <button
            type="button"
            onClick={onToggleBookmark}
            aria-label={saved ? 'Remove bookmark' : 'Save trip'}
            className={`grid place-items-center size-11 rounded-xl ring-1 transition active:scale-95 ${
              saved
                ? 'bg-emerald-700 text-white ring-emerald-700'
                : 'bg-white text-slate-500 ring-slate-200 hover:text-slate-800 hover:ring-slate-300'
            }`}
          >
            <Bookmark className={`size-[17px] ${saved ? 'fill-white' : ''}`} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </article>
  );
}

// ============================================================================
export default function App() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center">
          <Loader2 className="size-6 animate-spin text-emerald-600" />
        </div>
      }
    >
      <MeInner />
    </Suspense>
  );
}
