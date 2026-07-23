'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Bell, MapPin, Compass, Lock, Sparkles, Heart, Trophy } from 'lucide-react';
import Shell from '@/components/explore-v2/Shell';
import { HERO_IMAGES, FEATURED_TRIPS, CATEGORIES, REWARD_CARDS, HIGHLIGHTS, BADGES } from '@/lib/explore-v2-data';
import { fetchTrips } from '@/lib/explore-api';

export default function ExploreHome() {
  const [heroIdx] = useState(0);
  const [featured, setFeatured] = useState(FEATURED_TRIPS);
  const unlockedCount = REWARD_CARDS.filter(r => r.unlocked).length;
  const progress = Math.round((unlockedCount / 9) * 100);

  useEffect(() => {
    let alive = true;
    fetchTrips({ limit: 4 })
      .then(list => { if (alive && list.length > 0) setFeatured(list.slice(0, 4)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <Shell>
      {/* Hero \u2014 full-bleed immersive */}
      <section className="relative w-full h-[70vh] min-h-[500px] md:h-[80vh] md:min-h-[600px] overflow-hidden">
        <Image src={HERO_IMAGES[heroIdx]} alt="Kashmir" fill priority className="object-cover" unoptimized />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-transparent to-slate-950/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-transparent" />

        {/* Top-left branding */}
        <div className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4 md:top-6 md:left-8 z-10 flex items-center gap-2.5">
          <div className="size-10 md:size-11 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/25 grid place-items-center text-white shadow-lg">
            <Compass className="size-5" strokeWidth={2.2} />
          </div>
          <div className="leading-tight text-white">
            <div className="font-display font-bold text-[18px] md:text-[20px] tracking-tight drop-shadow">Safar</div>
            <div className="text-[11px] md:text-[12px] text-white/80 -mt-0.5 tracking-wide">Curated</div>
          </div>
        </div>

        {/* Right notification bell */}
        <button className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 md:top-6 md:right-8 z-10 size-10 md:size-11 grid place-items-center rounded-full bg-white/15 backdrop-blur-xl border border-white/25 text-white active:scale-95 transition" aria-label="Notifications">
          <Bell className="size-5" strokeWidth={2} />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-rose-500 ring-2 ring-slate-950/20" />
        </button>

        {/* Hero content */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-5 md:px-10 pb-10 md:pb-16 max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-xl border border-white/25 px-3 py-1.5 text-white text-[11px] md:text-[12px] font-semibold">
            <Sparkles className="size-3.5" /> Community Travel
          </div>
          <h1 className="mt-3 font-display font-bold text-white text-[38px] leading-[1.05] md:text-[68px] md:leading-[1.02] tracking-tight max-w-3xl drop-shadow-lg">
            Explore Hidden<br/>Kashmir. Together.
          </h1>
          <p className="mt-3 md:mt-4 text-white/85 text-[14px] md:text-[17px] max-w-lg leading-relaxed">{'Alpine lakes, glaciers, forests and hidden treks \u2014 curated by fellow travelers.'}</p>
          <div className="mt-6 md:mt-8 flex items-center gap-3">
            <Link href="/explore/feed" className="inline-flex items-center gap-2 rounded-full bg-white text-slate-900 px-5 md:px-6 py-3 md:py-3.5 text-[13px] md:text-[14px] font-semibold shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition">
              Discover Trips <ArrowRight className="size-4" />
            </Link>
            <Link href="/explore/create" className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-xl border border-white/25 text-white px-5 md:px-6 py-3 md:py-3.5 text-[13px] md:text-[14px] font-semibold active:scale-95 transition">
              Create Trip
            </Link>
          </div>
        </div>
      </section>

      {/* Featured trips */}
      <section className="relative -mt-8 md:-mt-12 rounded-t-[32px] md:rounded-t-[48px] bg-slate-50 pt-8 md:pt-14 pb-6 md:pb-12 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display font-bold text-[22px] md:text-[28px] tracking-tight text-slate-900">Featured Trips</h2>
              <p className="text-[12.5px] md:text-[14px] text-slate-500 mt-0.5">Curated community journeys</p>
            </div>
            <Link href="/explore/feed" className="hidden sm:inline-flex items-center gap-1 text-[13px] font-semibold text-violet-700 hover:gap-2 transition-all">See More <ArrowRight className="size-4" /></Link>
          </div>

          <div className="mt-5 md:mt-8 grid grid-cols-2 gap-3 md:gap-5">
            {featured.map((t) => (
              <Link key={t.id} href={`/explore/trip/${t.id}`} className="group relative rounded-2xl md:rounded-3xl overflow-hidden aspect-[3/4] md:aspect-[4/5] bg-slate-200 active:scale-[0.98] transition">
                <Image src={t.cover} alt={t.title} fill className="object-cover group-hover:scale-[1.05] transition-transform duration-500" sizes="(max-width: 768px) 50vw, 300px" unoptimized />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />
                {t.verified && (
                  <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 text-white px-2 py-1 text-[10px] font-bold shadow">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    Verified
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 text-white">
                  <h3 className="font-display font-bold text-[14px] md:text-[17px] leading-tight drop-shadow line-clamp-2">{t.title}</h3>
                  <div className="mt-1 flex items-center gap-1 text-[11px] md:text-[12px] text-white/85">
                    <MapPin className="size-3" /> <span className="truncate">{t.location}</span>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 px-2 py-0.5 text-[10px] font-semibold">
                    <div className="size-3.5 rounded-full bg-white/25 grid place-items-center text-[8px]">{t.host?.[0]}</div>
                    {t.host}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-4 flex justify-center sm:hidden">
            <Link href="/explore/feed" className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-5 py-2.5 text-[13px] font-semibold active:scale-95">See More <ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-6 md:py-10 px-0 md:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="px-4 md:px-0 font-display font-bold text-[20px] md:text-[24px] tracking-tight text-slate-900">Categories</h2>
          <div className="mt-4 md:mt-5 flex gap-2.5 md:gap-3 overflow-x-auto scrollbar-none px-4 md:px-0 md:flex-wrap snap-x">
            {CATEGORIES.map((c) => (
              <Link key={c.id} href={`/explore/feed?cat=${c.id}`} className="shrink-0 snap-start inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 active:scale-95 transition">
                <span className="text-[15px]">{c.emoji}</span> {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Reward Discovery 3x3 */}
      <section className="px-4 md:px-8 py-6 md:py-10">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 text-white overflow-hidden p-5 md:p-8">
            <div className="absolute -top-16 -right-16 size-64 rounded-full bg-fuchsia-500/25 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 size-64 rounded-full bg-violet-500/25 blur-3xl" />

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-2.5 py-1 text-[10.5px] font-semibold"><Trophy className="size-3" /> Reward Discovery</div>
                <h2 className="mt-3 font-display font-bold text-[22px] md:text-[28px] tracking-tight leading-tight max-w-xs">Complete trips.<br/>Unlock rewards.</h2>
                <p className="mt-1.5 text-white/70 text-[12.5px] md:text-[14px] max-w-sm leading-relaxed">Reveal a card for every verified trip you complete. Unlock all 9 to win a grand prize.</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[10.5px] uppercase tracking-widest text-white/60">Progress</div>
                <div className="mt-0.5 font-display font-bold text-[24px] md:text-[28px]">{unlockedCount}<span className="text-white/40 text-[16px]">/9</span></div>
              </div>
            </div>

            <div className="relative mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>

            <div className="relative mt-6 grid grid-cols-3 gap-2.5 md:gap-4">
              {REWARD_CARDS.map((r) => (
                <div key={r.id} className={`relative aspect-square rounded-2xl overflow-hidden border transition ${r.unlocked ? 'bg-gradient-to-br from-amber-400/90 to-orange-500/90 border-amber-300/60 shadow-lg shadow-amber-500/20' : 'bg-white/[0.04] border-white/10 backdrop-blur-sm'}`}>
                  {r.unlocked ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                      <div className="text-[26px] md:text-[34px]">{r.icon}</div>
                      <div className="mt-1 font-display font-bold text-[10px] md:text-[12px] text-white leading-tight line-clamp-2">{r.reward}</div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Lock className="size-6 md:size-7 text-white/25" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="relative mt-5 flex items-center justify-between">
              <div className="text-[11.5px] text-white/60">Next reward: <span className="text-white font-semibold">Adventure Kit</span></div>
              <Link href="/explore/me?tab=rewards" className="inline-flex items-center gap-1 text-[12px] font-semibold text-white/90 hover:text-white transition">View rewards <ArrowRight className="size-3.5" /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights preview */}
      <section className="px-4 md:px-8 pb-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display font-bold text-[22px] md:text-[28px] tracking-tight text-slate-900">Highlights</h2>
              <p className="text-[12.5px] md:text-[14px] text-slate-500 mt-0.5">Photos from the community</p>
            </div>
            <Link href="/explore/highlights" className="inline-flex items-center gap-1 text-[13px] font-semibold text-violet-700 hover:gap-2 transition-all">View all <ArrowRight className="size-4" /></Link>
          </div>
          <div className="mt-5 grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
            {HIGHLIGHTS.slice(0, 6).map((h) => (
              <Link key={h.id} href={`/explore/highlights#${h.id}`} className="relative aspect-square rounded-2xl overflow-hidden bg-slate-200 group active:scale-[0.98] transition">
                <Image src={h.img} alt={h.trip} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="200px" unoptimized />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                <div className={`absolute top-1.5 right-1.5 size-6 rounded-full bg-gradient-to-br ${BADGES[h.badge].color} grid place-items-center text-[11px] shadow`}>{BADGES[h.badge].emoji}</div>
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-white text-[10px] font-semibold">
                  <Heart className="size-3 fill-white" /> {h.likes}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      {/* ============================================================ */}
      {/* Inspirational Footer — cinematic closing scene (Kashmir)     */}
      {/* ============================================================ */}
      <section className="relative w-full min-h-[80vh] md:min-h-[90vh] overflow-hidden mt-8 md:mt-14 rounded-t-[32px] md:rounded-t-[48px]">
        <Image
          src={HERO_IMAGES[1]}
          alt="Kashmir panorama"
          fill
          className="object-cover object-center"
          sizes="100vw"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-transparent to-transparent" />

        {/* Top-left branding */}
        <div className="absolute top-6 left-4 md:top-8 md:left-10 z-10 flex items-center gap-2.5">
          <div className="size-10 md:size-11 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/25 grid place-items-center text-white shadow-lg">
            <Compass className="size-5" strokeWidth={2.2} />
          </div>
          <div className="leading-tight text-white">
            <div className="font-display font-bold text-[16px] md:text-[18px] tracking-tight drop-shadow">Safar Curated</div>
            <div className="text-[10.5px] md:text-[11px] text-white/70 -mt-0.5 tracking-widest uppercase">Explore Together</div>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 h-full min-h-[80vh] md:min-h-[90vh] flex items-center">
          <div className="w-full max-w-6xl mx-auto px-5 md:px-10 py-20 md:py-28">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/12 backdrop-blur-xl border border-white/20 px-3 py-1.5 text-white text-[11px] md:text-[12px] font-semibold">
                <Sparkles className="size-3.5" /> Your next adventure awaits
              </div>
              <h2 className="mt-5 md:mt-6 font-display font-bold text-white tracking-tight leading-[1.05] text-[36px] sm:text-[44px] md:text-[64px] lg:text-[76px] drop-shadow-2xl">
                Every Journey<br/>Begins With<br/><span className="bg-gradient-to-r from-violet-300 to-fuchsia-200 bg-clip-text text-transparent">One Step.</span>
              </h2>
              <p className="mt-5 md:mt-7 text-white/85 text-[14.5px] md:text-[18px] leading-relaxed max-w-2xl">
                Discover hidden valleys, pristine lakes, breathtaking glaciers, and unforgettable adventures with the Safar Curated community.
              </p>
              <p className="mt-2 text-white/60 text-[13px] md:text-[15px] italic">Travel together. Create memories. Explore responsibly.</p>

              {/* CTAs */}
              <div className="mt-7 md:mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link href="/explore/feed" className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white px-7 md:px-8 py-4 md:py-4 text-[14px] md:text-[15px] font-semibold shadow-2xl shadow-violet-500/40 hover:scale-[1.02] active:scale-95 transition">
                  Explore Trips <ArrowRight className="size-4" />
                </Link>
                <Link href="/explore/create" className="inline-flex items-center justify-center gap-2 rounded-full bg-white/12 backdrop-blur-xl border border-white/25 hover:bg-white/20 text-white px-7 md:px-8 py-4 text-[14px] md:text-[15px] font-semibold active:scale-95 transition">
                  Create a Trip
                </Link>
              </div>

              {/* Trust stats */}
              <div className="mt-8 md:mt-12 grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3 max-w-3xl">
                {[
                  { icon: '\u{1F465}', v: '5,000+', l: 'Travelers' },
                  { icon: '\u{1F3D4}\uFE0F', v: '1,200+', l: 'Trips Created' },
                  { icon: '\u2B50', v: '4.9', l: 'Community Rating' },
                  { icon: '\u2714\uFE0F', v: 'Verified', l: 'Local Hosts' },
                ].map((s, i) => (
                  <div key={i} className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 p-3 md:p-4 hover:bg-white/15 transition">
                    <div className="text-[18px] md:text-[22px]">{s.icon}</div>
                    <div className="mt-1 font-display font-bold text-white text-[16px] md:text-[19px] tracking-tight">{s.v}</div>
                    <div className="text-[10.5px] md:text-[11.5px] text-white/70">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom fade for bottom-nav clearance */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
      </section>
    </Shell>
  );
}
