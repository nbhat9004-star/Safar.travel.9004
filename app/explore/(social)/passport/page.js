'use client';
import Link from 'next/link';
import Image from 'next/image';
import { IdCard, MapPin, Award, Globe, Compass, Sparkles, TrendingUp, Camera, Route, LogIn } from 'lucide-react';
import AuroraBg from '@/components/explore/AuroraBg';
import BadgeChip from '@/components/explore/BadgeChip';
import { useAuth } from '@/lib/auth-context';

const BADGES = [
  { icon: '🏔️', name: 'Peak Chaser', desc: 'Visited 3+ mountain viewpoints' },
  { icon: '❄️', name: 'Snow Rookie', desc: 'First Gulmarg trip' },
  { icon: '🚣', name: 'Shikara Sailor', desc: '5+ lake rides' },
  { icon: '🍂', name: 'Chinar Watcher', desc: 'Autumn photo streak' },
  { icon: '🍛', name: 'Wazwan Warrior', desc: 'Full Wazwan feast completed' },
  { icon: '🌅', name: 'Golden Hour Pro', desc: '10+ sunrise photos shared' },
];

const COUNTRIES = [
  { code: 'IN', name: 'India', visits: 12 },
  { code: 'NP', name: 'Nepal', visits: 2 },
  { code: 'BT', name: 'Bhutan', visits: 1 },
];

const STATES_KASHMIR = [
  { name: 'Srinagar', visited: true },
  { name: 'Gulmarg', visited: true },
  { name: 'Pahalgam', visited: true },
  { name: 'Sonamarg', visited: false },
  { name: 'Yusmarg', visited: false },
  { name: 'Doodhpathri', visited: false },
];

export default function ExplorePassport() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="relative">
        <section className="relative overflow-hidden pt-14 md:pt-20 pb-24">
          <AuroraBg />
          <div className="relative max-w-3xl mx-auto px-4 md:px-8 text-center e-fade-in">
            <div className="e-chip mx-auto"><IdCard className="size-3 text-emerald-300" /> Your Passport</div>
            <h1 className="display font-bold mt-6 text-[clamp(2rem,5.6vw,4rem)] leading-tight">Sign in to unlock your <span className="e-grad-text">travel identity.</span></h1>
            <p className="mt-5 text-white/75">Your trips, badges, countries and states — all in one beautiful place.</p>
            <Link href="/?auth=1" className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 rounded-full e-btn-primary text-[15px]"><LogIn className="size-4" /> Sign in / Create account</Link>
          </div>
        </section>
      </div>
    );
  }

  const initial = (user.name || user.email || 'S').charAt(0).toUpperCase();
  const stats = [
    { label: 'Trips', value: '7', icon: Route },
    { label: 'Cities', value: '12', icon: MapPin },
    { label: 'Km travelled', value: '4,820', icon: Compass },
    { label: 'Stories shared', value: '18', icon: Camera },
  ];

  return (
    <div className="relative">
      <section className="relative overflow-hidden pt-14 md:pt-20 pb-10">
        <AuroraBg />
        <div className="relative e-container">
          <div className="e-glass rounded-3xl p-6 md:p-10 e-fade-in">
            <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
              <div className="size-24 md:size-28 rounded-3xl bg-gradient-to-br from-emerald-300 via-violet-400 to-fuchsia-400 grid place-items-center text-[#06080f] text-4xl font-bold shadow-2xl shadow-violet-500/40">
                {initial}
              </div>
              <div className="min-w-0">
                <div className="e-chip"><IdCard className="size-3" /> Safar Passport</div>
                <h1 className="display font-bold text-3xl md:text-5xl mt-3 truncate">{user.name || 'Traveler'}</h1>
                <div className="text-white/60 text-sm mt-1 truncate">{user.email}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <BadgeChip type="ai">Level 3 explorer</BadgeChip>
                  <BadgeChip type="new">7 trips</BadgeChip>
                  <BadgeChip>Kashmir specialist</BadgeChip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative e-container mb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="e-glass rounded-3xl p-5">
              <s.icon className="size-5 text-emerald-300" />
              <div className="display text-2xl md:text-3xl font-bold mt-3">{s.value}</div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/55 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Badges */}
      <section className="relative e-container mb-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="e-chip"><Award className="size-3 text-emerald-300" /> Badges</div>
            <h2 className="display text-xl md:text-2xl font-bold mt-3">Achievements unlocked</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {BADGES.map(b => (
            <div key={b.name} className="e-glass rounded-2xl p-4 text-center">
              <div className="text-3xl">{b.icon}</div>
              <div className="font-semibold text-sm mt-2">{b.name}</div>
              <div className="text-[10px] text-white/55 mt-1 leading-relaxed">{b.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Countries + States */}
      <section className="relative e-container pb-24 grid md:grid-cols-2 gap-5">
        <div className="e-glass rounded-3xl p-6">
          <div className="e-chip"><Globe className="size-3" /> Countries</div>
          <h3 className="display text-xl font-bold mt-3">{COUNTRIES.length} visited</h3>
          <div className="mt-4 space-y-2">
            {COUNTRIES.map(c => (
              <div key={c.code} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-gradient-to-br from-emerald-300 to-violet-400 grid place-items-center text-[#06080f] font-bold text-xs">{c.code}</div>
                  <div><div className="text-sm font-semibold">{c.name}</div><div className="text-[11px] text-white/55">{c.visits} trip{c.visits>1?'s':''}</div></div>
                </div>
                <TrendingUp className="size-4 text-white/40" />
              </div>
            ))}
          </div>
        </div>
        <div className="e-glass rounded-3xl p-6">
          <div className="e-chip"><MapPin className="size-3" /> Kashmir map</div>
          <h3 className="display text-xl font-bold mt-3">{STATES_KASHMIR.filter(s => s.visited).length} of {STATES_KASHMIR.length} regions</h3>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {STATES_KASHMIR.map(s => (
              <div key={s.name} className={`flex items-center justify-between p-3 rounded-xl border ${s.visited ? 'bg-emerald-400/10 border-emerald-400/30' : 'bg-white/[0.02] border-white/10'}`}>
                <div className="text-sm font-medium truncate">{s.name}</div>
                {s.visited ? <span className="text-[10px] text-emerald-300 font-semibold">✓ Visited</span> : <span className="text-[10px] text-white/40">—</span>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
