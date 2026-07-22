'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import TripShell from '@/components/explore/TripShell';
import TripCard from '@/components/explore/TripCard';
import { TRIPS } from '@/lib/trips-data';

const TABS = [
  { id: 'hosting', label: 'Hosting' },
  { id: 'joined', label: 'Joined' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'saved', label: 'Saved Trips' },
];

function MyTripsInner() {
  const sp = useSearchParams();
  const initial = sp.get('tab') || 'hosting';
  const [tab, setTab] = useState(initial);

  const list = tab === 'hosting' ? TRIPS.slice(0, 2)
    : tab === 'joined' ? TRIPS.slice(2, 4)
    : tab === 'saved' ? TRIPS.slice(4, 6)
    : [];

  return (
    <TripShell>
      <div className="px-4 lg:px-8 pt-4 lg:pt-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold">My Trips</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">{"Trips you\u2019re hosting, joined or saved"}</p>

        <div className="mt-5 flex items-center gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`shrink-0 rounded-xl border px-4 h-10 text-[13px] font-semibold transition ${tab === t.id ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {list.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
            {list.map(t => <TripCard key={t.id} trip={t} />)}
          </div>
        ) : (
          <div className="mt-8 text-center py-14 bg-white rounded-2xl border border-slate-100">
            <div className="font-display font-bold text-slate-900">Nothing here yet</div>
            <p className="text-[13px] text-slate-500 mt-1">Your {TABS.find(t => t.id === tab)?.label.toLowerCase()} trips will appear here.</p>
          </div>
        )}
      </div>
    </TripShell>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin text-violet-600" /></div>}>
      <MyTripsInner />
    </Suspense>
  );
}
