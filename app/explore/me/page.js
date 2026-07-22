'use client';
import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, Star, MapPin, Award, Camera, Settings } from 'lucide-react';
import TripShell from '@/components/explore/TripShell';
import TripCard from '@/components/explore/TripCard';
import { TRIPS } from '@/lib/trips-data';

export default function App() {
  return (
    <TripShell>
      <div className="max-w-4xl mx-auto px-4 lg:px-8 pt-4 lg:pt-8">
        {/* Cover */}
        <div className="relative h-32 lg:h-40 rounded-3xl overflow-hidden bg-gradient-to-br from-violet-500 to-fuchsia-500">
          <Image src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80" alt="cover" fill className="object-cover opacity-60" unoptimized />
        </div>

        <div className="-mt-10 lg:-mt-12 px-2 flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="relative size-24 lg:size-28 rounded-3xl overflow-hidden border-4 border-white bg-slate-200 shrink-0">
            <Image src="https://i.pravatar.cc/240?img=13" alt="you" fill className="object-cover" unoptimized />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold">Shahnawaz</h1>
              <BadgeCheck className="size-5 text-violet-600" />
            </div>
            <div className="text-[13px] text-slate-500 mt-0.5 flex items-center gap-1"><MapPin className="size-3.5" /> Srinagar, J&amp;K</div>
            <p className="mt-2 text-[13px] text-slate-600 max-w-xl">Adventure lover, mountain wanderer. Hosting curated Kashmir trips for fellow travelers.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 h-10 text-[13px] font-semibold text-slate-700"><Settings className="size-4" /> Settings</button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-4 gap-2 lg:gap-4">
          {[
            { label: 'Trips Hosted', value: 12 },
            { label: 'Trips Joined', value: 8 },
            { label: 'Reviews', value: 47, sub: '4.9\u2605' },
            { label: 'Countries', value: 6 },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-100 p-3 lg:p-4 text-center">
              <div className="font-display text-xl lg:text-2xl font-bold text-slate-900">{s.value}</div>
              <div className="text-[11px] lg:text-[12px] text-slate-500">{s.label}{s.sub ? ` \u00b7 ${s.sub}` : ''}</div>
            </div>
          ))}
        </div>

        {/* Badges */}
        <section className="mt-6">
          <div className="flex items-center gap-2">
            <Award className="size-4 text-amber-500" />
            <h3 className="font-display font-bold text-lg">Badges</h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {['Verified Host','Top Rated','Trek Expert','Kashmir Local','Storyteller'].map(b => (
              <span key={b} className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-700">
                <Star className="size-3 fill-amber-400 text-amber-400" /> {b}
              </span>
            ))}
          </div>
        </section>

        {/* Verification */}
        <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-500 text-white grid place-items-center shrink-0"><BadgeCheck className="size-5" /></div>
          <div className="flex-1">
            <div className="font-semibold text-[14px] text-emerald-900">Verified Traveler</div>
            <div className="text-[12px] text-emerald-800/80">ID, phone and email verified with Safar Curated</div>
          </div>
        </section>

        {/* Hosted trips */}
        <section className="mt-6">
          <h3 className="font-display font-bold text-lg">Trips Hosted</h3>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TRIPS.slice(0, 2).map(t => <TripCard key={t.id} trip={t} />)}
          </div>
        </section>

        {/* Reviews */}
        <section className="mt-6 mb-8">
          <h3 className="font-display font-bold text-lg">Recent Reviews</h3>
          <div className="mt-3 space-y-2">
            {[
              { name: 'Aditi', text: 'Amazing host! Extremely well organized trip and always cheerful.', rating: 5 },
              { name: 'Rohan', text: 'Great itinerary and lots of care about details. Recommended.', rating: 5 },
            ].map((r, i) => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex items-center gap-2">
                  <Image src={`https://i.pravatar.cc/60?img=${i + 22}`} alt={r.name} width={28} height={28} className="rounded-full" unoptimized />
                  <div className="font-semibold text-[13px]">{r.name}</div>
                  <div className="ml-auto inline-flex items-center gap-0.5 text-[12px] font-semibold text-slate-700">
                    {[...Array(r.rating)].map((_, k) => <Star key={k} className="size-3 fill-amber-400 text-amber-400" />)}
                  </div>
                </div>
                <p className="mt-2 text-[13px] text-slate-600">{r.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </TripShell>
  );
}
