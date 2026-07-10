'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import CircleNav from '@/components/circle/CircleNav';
import { useAuth } from '@/lib/auth-context';
import { circleApi, themeLabel } from '@/lib/circle-api';
import { BadgeCheck, MapPin, Sparkles, ArrowRight, Compass, ShieldCheck } from 'lucide-react';

export default function Passport() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    circleApi.passport()
      .then(r => setData(r))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [user]);

  if (!authLoading && !user) {
    return (
      <main className="min-h-screen text-white pt-24">
        <CircleNav />
        <div className="max-w-lg mx-auto px-5 pt-20 text-center circle-glass circle-card p-10">
          <div className="circle-chip mx-auto">Sign in required</div>
          <h1 className="display text-3xl font-bold mt-4">Meet your Traveler Passport.</h1>
          <p className="text-white/70 mt-3">A living record of everywhere you’ve curated, joined, and dreamt about.</p>
          <Link href="/?auth=1" className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full circle-btn-primary text-sm font-semibold">
            Continue to sign in <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>
    );
  }

  const p = data?.passport;
  const recent = data?.recentJourneys || [];

  return (
    <main className="min-h-screen text-white pt-24 pb-24">
      <CircleNav />
      <div className="circle-aurora" style={{ opacity: 0.35 }} />

      <div className="max-w-6xl mx-auto px-5 md:px-8 relative">
        {loading || !p ? (
          <div className="circle-glass circle-card p-16 animate-pulse h-96" />
        ) : (
          <>
            {/* Passport Card */}
            <div className="relative circle-glass-strong circle-card p-8 md:p-12 overflow-hidden">
              <div className="circle-aurora" style={{ opacity: 0.7 }} />
              <div className="relative flex flex-col md:flex-row items-start md:items-center gap-8">
                <div className="relative">
                  <div className="size-28 md:size-32 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl">
                    {p.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-violet-500 grid place-items-center display text-3xl font-bold">{p.name?.charAt(0)}</div>}
                  </div>
                  {p.verified && (
                    <div className="absolute -bottom-1 -right-1 size-9 rounded-full bg-emerald-400 grid place-items-center border-4 border-[#0a0e1a]">
                      <BadgeCheck className="size-4 text-black" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="circle-chip">Traveler Passport</div>
                  <h1 className="display text-4xl md:text-5xl font-bold mt-3">{p.name}</h1>
                  <div className="text-white/70 text-sm mt-1">{p.email} · since {new Date(p.memberSince).toLocaleDateString()}</div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {p.badges.map(b => (
                      <span key={b.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-medium">
                        <span>{b.emoji}</span> {b.name}
                      </span>
                    ))}
                    {p.badges.length === 0 && <span className="text-white/50 text-xs">Publish your first journey to earn badges.</span>}
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="relative mt-8 grid grid-cols-2 md:grid-cols-5 gap-3">
                <PassStat label="Journeys curated" value={p.journeysCurated} />
                <PassStat label="Published" value={p.journeysPublished} />
                <PassStat label="Cities" value={p.cities} />
                <PassStat label="Districts" value={p.districts} />
                <PassStat label="Reputation" value={p.reputation} />
              </div>
            </div>

            {/* Recent journeys */}
            <div className="mt-8">
              <div className="flex items-end justify-between">
                <div>
                  <div className="circle-chip">Your recent journeys</div>
                  <h2 className="display text-2xl font-bold mt-2">Where you’ve been leading</h2>
                </div>
                <Link href="/circle/studio" className="text-sm text-white/70 hover:text-white inline-flex items-center gap-1">
                  All in Studio <ArrowRight className="size-4" />
                </Link>
              </div>
              {recent.length === 0 ? (
                <div className="mt-4 circle-glass circle-card p-10 text-center">
                  <div className="text-white/70">No journeys yet. Curate your first — the world is watching.</div>
                  <Link href="/circle/create" className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full circle-btn-primary text-sm font-semibold">
                    <Sparkles className="size-4" /> Create a Journey
                  </Link>
                </div>
              ) : (
                <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recent.map(j => {
                    const th = themeLabel(j.theme);
                    return (
                      <Link key={j.id} href={`/circle/j/${j.slug}`} className="relative rounded-3xl overflow-hidden aspect-[16/10] block border border-white/10 circle-magnetic">
                        {j.cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={j.cover} alt={j.name} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/40 via-violet-500/40 to-pink-400/40" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                        <div className="absolute top-3 left-3 circle-chip !text-[10px]">{th.emoji} {th.label}</div>
                        <div className="absolute inset-x-0 bottom-0 p-4">
                          <div className="font-semibold">{j.name}</div>
                          <div className="text-[11px] text-white/70 mt-1"><MapPin className="inline size-3 mr-1" />{j.destination?.name || 'Multi-city'} · {j.visibility}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Future badges */}
            <div className="mt-8 circle-glass circle-card p-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-300" />
                <div className="text-sm font-semibold">Coming soon</div>
              </div>
              <div className="mt-3 text-white/70 text-sm">
                Countries visited, verified traveler status, reviews received and journey reputation from members will populate here as Modules 2 & 3 roll out.
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function PassStat({ label, value }) {
  return (
    <div className="circle-glass circle-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-white/60">{label}</div>
      <div className="display text-2xl font-bold mt-1 circle-grad-text">{value}</div>
    </div>
  );
}
