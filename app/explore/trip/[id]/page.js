'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Share2, Bookmark, MapPin, Calendar, BadgeCheck, ShieldCheck, ChevronDown, MessageCircle, Users, Loader2 } from 'lucide-react';
import Shell from '@/components/explore-v2/Shell';
import { MORE_TRIPS, FEATURED_TRIPS } from '@/lib/explore-v2-data';
import { fetchTrip, requestToJoin } from '@/lib/explore-api';
import { toast } from 'sonner';

export default function TripDetail({ params }) {
  const { id } = params;
  const [trip, setTrip] = useState(() => [...MORE_TRIPS, ...FEATURED_TRIPS].find(t => t.id === id) || MORE_TRIPS[0]);
  const [openDay, setOpenDay] = useState(1);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchTrip(id).then(t => { if (alive && t) setTrip(t); }).catch(() => {});
    return () => { alive = false; };
  }, [id]);

  const handleJoin = async () => {
    if (!trip?.raw) { toast('Demo trip \u2014 sign in to enable Join'); return; }
    setJoining(true);
    try {
      await requestToJoin(trip.id, { seats: 1, message: 'I\u2019d love to join!' });
      setJoined(true);
      toast.success('Request sent! The host will review shortly.');
    } catch (e) {
      toast.error(e.message || 'Could not send request. Please sign in and try again.');
    } finally {
      setJoining(false);
    }
  };

  const days = [
    { day: 1, title: 'Arrival in Sonamarg, trek to Nichnai' },
    { day: 2, title: 'Nichnai to Vishansar Lake' },
    { day: 3, title: 'Vishansar to Krishansar Lake' },
  ];
  const highlights = [
    { emoji: '\u{1F550}', text: '7 Days / 6 Nights' },
    { emoji: '\u{1F3D4}\uFE0F', text: '3 Alpine Lakes' },
    { emoji: '\u26F0\uFE0F', text: 'Difficulty: Moderate' },
    { emoji: '\u{1F3E1}', text: 'Accommodation & Meals' },
  ];

  return (
    <Shell>
      {/* Hero */}
      <div className="relative aspect-[4/5] sm:aspect-[16/10] w-full max-w-4xl mx-auto overflow-hidden">
        <Image src={trip.cover} alt={trip.title || 'Trip'} fill className="object-cover" priority unoptimized />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-transparent" />
        <Link href="/explore" className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4 size-10 grid place-items-center rounded-full bg-white/15 backdrop-blur-xl border border-white/25 text-white active:scale-95"><ArrowLeft className="size-5" /></Link>
        <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 flex items-center gap-2">
          <button className="size-10 grid place-items-center rounded-full bg-white/15 backdrop-blur-xl border border-white/25 text-white active:scale-95"><Share2 className="size-4" /></button>
          <button className="size-10 grid place-items-center rounded-full bg-white/15 backdrop-blur-xl border border-white/25 text-white active:scale-95"><Bookmark className="size-4" /></button>
        </div>
        <div className="absolute top-4 left-16 md:left-20">
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500 text-white px-2.5 py-1 text-[10px] font-bold"><ShieldCheck className="size-3" /> Verified by Safar</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 md:px-8 pb-32 -mt-6 relative">
        <div className="bg-white rounded-3xl p-5 md:p-6 shadow-[0_-10px_30px_-10px_rgba(15,23,42,0.15)]">
          <h1 className="font-display font-bold text-[22px] md:text-[28px] tracking-tight text-slate-900 leading-tight">{trip.title || 'Kashmir Great Lakes'}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-500">
            <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {trip.location || 'Sonamarg, Kashmir'}</span>
            <span className="inline-flex items-center gap-1"><Calendar className="size-3.5" /> {trip.dates || 'May 25 \u2013 May 30'}</span>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-full bg-violet-100 grid place-items-center text-violet-700 font-bold text-[13px]">{trip.host?.[0] || 'A'}</div>
              <div>
                <div className="text-[13px] text-slate-500">Hosted by <span className="font-semibold text-slate-900">{trip.host || 'Amaan'}</span></div>
                <div className="text-[11px] text-violet-700 font-semibold inline-flex items-center gap-1"><BadgeCheck className="size-3" /> Verified Host</div>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
              <Users className="size-4 text-slate-500" /> {trip.joined || 8} / {trip.max || 12}
            </div>
          </div>
        </div>

        <section className="mt-5">
          <h3 className="font-display font-bold text-[17px] tracking-tight">About Trip</h3>
          <p className="mt-2 text-[13.5px] text-slate-600 leading-relaxed">A breathtaking trek through the pristine alpine lakes of Kashmir. Experience stunning landscapes, snow-capped peaks and crystal-clear lakes.</p>
        </section>

        <section className="mt-6">
          <h3 className="font-display font-bold text-[17px] tracking-tight">Highlights</h3>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-2 rounded-2xl bg-white border border-slate-100 px-3 py-3">
                <div className="text-[20px]">{h.emoji}</div>
                <span className="text-[13.5px] text-slate-700">{h.text}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="font-display font-bold text-[17px] tracking-tight">Itinerary</h3>
          <div className="mt-3 space-y-2">
            {days.map(d => (
              <button key={d.day} onClick={() => setOpenDay(openDay === d.day ? -1 : d.day)} className={`w-full text-left rounded-2xl border p-4 transition ${openDay === d.day ? 'border-violet-200 bg-violet-50/50' : 'border-slate-100 bg-white'}`}>
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
      </main>

      <div className="fixed bottom-24 md:bottom-8 inset-x-0 z-30 px-4 md:px-8">
        <div className="max-w-3xl mx-auto bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl px-3 py-3 shadow-2xl flex items-center gap-2">
          <Link href="/explore/chat/demo" className="size-11 grid place-items-center rounded-xl border border-slate-200 hover:bg-slate-50"><MessageCircle className="size-4" /></Link>
          {joined ? (
            <div className="flex-1 rounded-xl bg-emerald-50 text-emerald-700 font-semibold py-3 text-[14px] text-center inline-flex items-center justify-center gap-2"><BadgeCheck className="size-4" /> Request Sent</div>
          ) : (
            <button onClick={handleJoin} disabled={joining} className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-semibold py-3 text-[14px] transition inline-flex items-center justify-center gap-2 disabled:opacity-70">
              {joining && <Loader2 className="size-4 animate-spin" />} Request to Join
            </button>
          )}
        </div>
      </div>
    </Shell>
  );
}
