'use client';
import { useState } from 'react';
import Shell from '@/components/explore-v2/Shell';
import TripCard from '@/components/explore-v2/TripCard';
import { MORE_TRIPS } from '@/lib/explore-v2-data';

const TABS = [
  { id: 'hosting', label: 'Hosting' },
  { id: 'joined', label: 'Joined' },
  { id: 'saved', label: 'Saved' },
  { id: 'completed', label: 'Completed' },
  { id: 'drafts', label: 'Drafts' },
];

export default function MyTrips() {
  const [tab, setTab] = useState('hosting');
  const list = tab === 'hosting' ? MORE_TRIPS.slice(0, 2)
    : tab === 'joined' ? MORE_TRIPS.slice(2, 4)
    : tab === 'saved' ? MORE_TRIPS.slice(1, 3)
    : [];
  return (
    <Shell>
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-slate-100 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="max-w-6xl mx-auto px-4 md:px-8 pb-3">
          <h1 className="font-display font-bold text-[22px] md:text-[26px] tracking-tight">My Trips</h1>
          <p className="text-[12.5px] text-slate-500">Trips you host, join or save</p>
          <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ${tab === t.id ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t.label}</button>
            ))}
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-5">
        {list.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {list.map(t => <TripCard key={t.id} trip={t} />)}
          </div>
        ) : (
          <div className="py-14 text-center rounded-3xl bg-white border border-slate-100">
            <div className="font-display font-bold text-slate-900">Nothing here yet</div>
            <p className="text-[13px] text-slate-500 mt-1">Your {TABS.find(t => t.id === tab)?.label.toLowerCase()} trips will appear here.</p>
          </div>
        )}
      </main>
    </Shell>
  );
}
