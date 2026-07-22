'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Bookmark, Share2, MapPin, BadgeCheck, ShieldCheck, Users, Calendar, ChevronDown, Route } from 'lucide-react';
import TripShell from '@/components/explore/TripShell';
import { TRIPS } from '@/lib/trips-data';

export default function App({ params }) {
  const { id } = params;
  const trip = TRIPS.find(t => t.id === id) || TRIPS[0];
  const [openDay, setOpenDay] = useState(1);

  return (
    <TripShell>
      <div className="max-w-4xl mx-auto px-4 lg:px-8 pt-4 lg:pt-8 pb-24">
        {/* Top bar (mobile) */}
        <div className="lg:hidden flex items-center justify-between">
          <Link href="/explore" className="size-10 grid place-items-center rounded-full bg-white border border-slate-200"><ArrowLeft className="size-4" /></Link>
          <div className="flex items-center gap-2">
            <button className="size-10 grid place-items-center rounded-full bg-white border border-slate-200"><Share2 className="size-4" /></button>
            <button className="size-10 grid place-items-center rounded-full bg-white border border-slate-200">{'\u22EF'}</button>
          </div>
        </div>

        {/* Hero */}
        <div className="mt-4 relative aspect-[16/10] rounded-3xl overflow-hidden bg-slate-100">
          <Image src={trip.cover} alt={trip.title} fill className="object-cover" unoptimized />
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide bg-emerald-500 text-white">{trip.type}</span>
          </div>
          <button className="absolute top-4 right-4 size-10 grid place-items-center rounded-full bg-white/95 backdrop-blur"><Bookmark className="size-4" /></button>
        </div>

        {/* Gallery */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {(trip.gallery.length ? trip.gallery : [trip.cover, trip.cover, trip.cover, trip.cover]).slice(0, 4).map((g, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
              <Image src={g} alt={`g-${i}`} fill className="object-cover" unoptimized />
              {i === 3 && <div className="absolute inset-0 bg-slate-900/40 grid place-items-center text-white font-bold text-sm">+12</div>}
            </div>
          ))}
        </div>

        {/* Title block */}
        <div className="mt-5">
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-900">{trip.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-500">
            <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {trip.destination}</span>
            <span className="inline-flex items-center gap-1"><Calendar className="size-3.5" /> {trip.dateRange}</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full overflow-hidden bg-slate-200">
                <Image src={trip.hostAvatar} alt={trip.hostName} width={32} height={32} className="object-cover" unoptimized />
              </div>
              <span className="text-[13px] text-slate-500">Hosted by <span className="font-semibold text-slate-800">{trip.hostName}</span></span>
            </div>
            {trip.hostVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-violet-50 text-violet-700">
                <BadgeCheck className="size-3" /> Verified
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {[0,1,2].map(i => (
                  <div key={i} className="size-7 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                    <Image src={`https://i.pravatar.cc/48?img=${i+7}`} alt="m" width={28} height={28} unoptimized />
                  </div>
                ))}
              </div>
              <span className="ml-1.5 text-[11px] font-semibold text-slate-500">+{Math.max(trip.joined - 3, 0)}</span>
            </div>
            <div className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-800">
              <Users className="size-4 text-slate-500" /> {trip.joined} / {trip.capacity} joined
            </div>
          </div>
        </div>

        {/* About */}
        <section className="mt-6">
          <h3 className="font-display font-bold text-lg">About Trip</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">{trip.description}</p>
          <button className="mt-1 text-[13px] font-semibold text-violet-700 inline-flex items-center gap-1">Read more <ChevronDown className="size-3.5" /></button>
        </section>

        {/* Verified services included */}
        {trip.mode === 'safar' && trip.verifiedServices?.length > 0 && (
          <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600" />
              <h4 className="font-display font-bold text-[15px] text-emerald-800">Verified Services Included</h4>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {trip.verifiedServices.map(s => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-white border border-emerald-200 px-3 py-1 text-[12px] font-semibold text-emerald-800">
                  <BadgeCheck className="size-3.5 text-emerald-600" /> {s}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Highlights */}
        <section className="mt-6">
          <h3 className="font-display font-bold text-lg">Highlights</h3>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {trip.highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl bg-white border border-slate-100 px-3 py-2.5">
                <div className="size-7 rounded-lg bg-violet-100 text-violet-700 grid place-items-center text-[13px]">{'\u2713'}</div>
                <span className="text-[13px] text-slate-700">{h}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Itinerary */}
        <section className="mt-6">
          <div className="flex items-center gap-2">
            <Route className="size-4 text-slate-500" />
            <h3 className="font-display font-bold text-lg">Itinerary Overview</h3>
          </div>
          <div className="mt-3 space-y-2">
            {trip.itinerary.map(d => (
              <button key={d.day} onClick={() => setOpenDay(openDay === d.day ? -1 : d.day)} className={`w-full text-left rounded-2xl border p-4 transition ${openDay === d.day ? 'border-violet-200 bg-violet-50/40' : 'border-slate-100 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-semibold text-slate-800">Day {d.day}</div>
                    <div className="text-[13px] text-slate-500 mt-0.5">{d.title}</div>
                  </div>
                  <ChevronDown className={`size-4 text-slate-400 transition ${openDay === d.day ? 'rotate-180' : ''}`} />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Spacer for sticky CTA */}
        <div className="h-24" />
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-16 lg:bottom-6 inset-x-0 z-20 px-4 lg:pl-72 lg:pr-8">
        <div className="max-w-3xl mx-auto bg-white/90 backdrop-blur border border-slate-200 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3">
          <button className="size-10 grid place-items-center rounded-xl border border-slate-200"><Share2 className="size-4" /></button>
          <button className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 text-[14px] transition">Request to Join</button>
        </div>
      </div>
    </TripShell>
  );
}
