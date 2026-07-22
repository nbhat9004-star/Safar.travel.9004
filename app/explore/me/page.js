'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BadgeCheck, Trophy, Loader2, Settings, Star, MapPin, Lock } from 'lucide-react';
import Shell from '@/components/explore-v2/Shell';
import TripCard from '@/components/explore-v2/TripCard';
import { MORE_TRIPS, REWARD_CARDS, BADGES } from '@/lib/explore-v2-data';

function MeInner() {
  const sp = useSearchParams();
  const initial = sp.get('tab') || 'trips';
  const [tab, setTab] = useState(initial);
  const unlocked = REWARD_CARDS.filter(r => r.unlocked).length;

  return (
    <Shell>
      {/* Cover */}
      <div className="relative h-40 md:h-56 overflow-hidden bg-gradient-to-br from-violet-500 to-fuchsia-500">
        <Image src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80" alt="" fill className="object-cover opacity-70" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
        <button className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 md:top-6 md:right-8 size-10 grid place-items-center rounded-full bg-white/15 backdrop-blur-xl border border-white/25 text-white active:scale-95"><Settings className="size-4" /></button>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-8">
        <div className="-mt-12 md:-mt-14 flex items-end gap-4">
          <div className="relative size-24 md:size-28 rounded-3xl overflow-hidden border-4 border-white bg-slate-200 shadow-xl shrink-0">
            <Image src="https://i.pravatar.cc/240?img=13" alt="you" fill className="object-cover" unoptimized />
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-[22px] md:text-[26px] tracking-tight text-slate-900">Shahnawaz</h1>
              <BadgeCheck className="size-5 text-violet-600" />
            </div>
            <div className="text-[12.5px] text-slate-500 flex items-center gap-1"><MapPin className="size-3.5" /> Srinagar, J&amp;K</div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-4 gap-2">
          {[
            { l: 'Hosted', v: 12 },
            { l: 'Joined', v: 8 },
            { l: 'Rewards', v: `${unlocked}/9` },
            { l: 'Rating', v: '4.9\u2605' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-100 p-3 text-center">
              <div className="font-display font-bold text-[19px] md:text-[22px] text-slate-900">{s.v}</div>
              <div className="text-[11px] text-slate-500">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2">
          {['trips','rewards','badges'].map(id => (
            <button key={id} onClick={() => setTab(id)} className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold capitalize transition ${tab === id ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{id}</button>
          ))}
        </div>

        <div className="mt-4 pb-8">
          {tab === 'trips' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MORE_TRIPS.slice(0, 2).map(t => <TripCard key={t.id} trip={t} />)}
            </div>
          )}
          {tab === 'rewards' && (
            <div>
              <div className="rounded-3xl bg-gradient-to-br from-violet-950 to-slate-950 text-white p-5">
                <div className="flex items-center gap-2 text-[11px] font-semibold"><Trophy className="size-3.5" /> {unlocked} / 9 unlocked</div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" style={{ width: `${(unlocked/9)*100}%` }} /></div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {REWARD_CARDS.map(r => (
                    <div key={r.id} className={`aspect-square rounded-2xl grid place-items-center relative border ${r.unlocked ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-300' : 'bg-white/[0.04] border-white/10'}`}>
                      {r.unlocked ? (
                        <div className="text-center p-1">
                          <div className="text-[26px]">{r.icon}</div>
                          <div className="text-[9px] font-bold leading-tight mt-0.5">{r.reward}</div>
                        </div>
                      ) : <Lock className="size-6 text-white/20" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {tab === 'badges' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(BADGES).map(([id, b]) => (
                <div key={id} className="rounded-2xl bg-white border border-slate-100 p-4 text-center">
                  <div className={`mx-auto size-14 rounded-2xl grid place-items-center bg-gradient-to-br ${b.color} text-white text-[26px] shadow-lg`}>{b.emoji}</div>
                  <div className="mt-2 font-semibold text-[13px] text-slate-900">{b.label}</div>
                  <div className="text-[11px] text-slate-500">Community</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

export default function App() {
  return <Suspense fallback={<div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin text-violet-600" /></div>}><MeInner /></Suspense>;
}
