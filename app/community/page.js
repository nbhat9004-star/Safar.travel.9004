'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { ArrowRight, CalendarDays, Compass, MapPin, Mountain, Plus, ShieldCheck, Sparkles, Users, Heart, MessageCircle, CheckCircle2 } from 'lucide-react';

const trips = [
  { id: 'dal-lake-sunset', title: 'Golden Hour on Dal Lake', place: 'Srinagar, Kashmir', date: 'Nov 2–3', days: '2 days', people: '4 spots left', type: 'Culture', cost: '₹2,500', image: 'https://images.pexels.com/photos/1271619/pexels-photo-1271619.jpeg?auto=compress&cs=tinysrgb&w=1000', host: 'Ayaan K.', initials: 'AK', verified: true, description: 'Shikara rides, old-city food stops and a slow sunset on the lake.' },
  { id: 'gulmarg-trails', title: 'Gulmarg Alpine Trails', place: 'Gulmarg, Kashmir', date: 'Nov 8–9', days: '2 days', people: '3 spots left', type: 'Adventure', cost: '₹4,800', image: 'https://images.pexels.com/photos/848612/pexels-photo-848612.jpeg?auto=compress&cs=tinysrgb&w=1000', host: 'Sara W.', initials: 'SW', verified: true, description: 'Mountain views, gentle hikes and a cosy local café stop.' },
  { id: 'pahalgam-autumn', title: 'Autumn in Pahalgam', place: 'Pahalgam, Kashmir', date: 'Nov 15–16', days: '2 days', people: '5 spots left', type: 'Nature', cost: '₹3,200', image: 'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&w=1000', host: 'Zoya B.', initials: 'ZB', verified: false, description: 'Pine forests, riverside walks and a picnic with valley views.' },
];

const categories = ['All trips', 'Adventure', 'Culture', 'Nature'];

export default function CommunityWebAppPage() {
  const { user } = useAuth();
  const [category, setCategory] = useState('All trips');
  const [saved, setSaved] = useState([]);
  const [tab, setTab] = useState('Discover');
  const [search, setSearch] = useState('');
  const visibleTrips = useMemo(() => trips.filter((trip) =>
    (category === 'All trips' || trip.type === category) &&
    (trip.title + ' ' + trip.place + ' ' + trip.description).toLowerCase().includes(search.toLowerCase())
  ), [category, search]);

  return (
    <main className="min-h-screen bg-[#f6f8f6] text-[#14231d]">
      <Navbar />
      <section className="relative isolate overflow-hidden bg-[#0c211b] text-white">
        <Image
          src="https://images.pexels.com/photos/1485894/pexels-photo-1485894.jpeg?auto=compress&cs=tinysrgb&w=2000"
          alt="Himalayan mountain valley in Kashmir"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#071812]/95 via-[#0b211a]/70 to-[#0b211a]/15" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-5 pb-14 pt-16 sm:px-8 md:grid-cols-[1.2fr_.8fr] md:items-center md:pb-20 md:pt-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-lime-300" /> TRAVEL BETTER, TOGETHER
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.04] tracking-tight sm:text-5xl md:text-6xl">Explore hidden Kashmir.<br/><span className="text-lime-300">Together.</span></h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-white/80 sm:text-base">Meet thoughtful travellers, join locally-led journeys and discover the valley beyond the usual itinerary.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#discover" className="inline-flex h-11 items-center gap-2 rounded-full bg-lime-300 px-5 text-sm font-bold text-[#14231d] transition hover:bg-lime-200">Discover trips <ArrowRight className="h-4 w-4" /></a>
              <Link href={user ? '/trip/create' : '/?auth=signup&returnUrl=%2Fcommunity'} className="inline-flex h-11 items-center gap-2 rounded-full border border-white/35 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"><Plus className="h-4 w-4" /> Create a trip</Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/75">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-lime-300"/> Community-first travel</span>
              <span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-lime-300"/> Small-group journeys</span>
              <span className="inline-flex items-center gap-2"><Mountain className="h-4 w-4 text-lime-300"/> Local perspectives</span>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-auto max-w-sm rounded-[2rem] border border-white/20 bg-[#10271f]/75 p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between"><span className="text-sm font-semibold">The Safar community</span><span className="rounded-full bg-lime-300/15 px-2.5 py-1 text-xs text-lime-200">Growing together</span></div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[['Local hosts','Meet'],['Small groups','Join'],['Real stories','Share']].map(([label, sub]) => <div key={label} className="rounded-2xl bg-white/[0.07] p-3"><div className="text-lg font-bold">{sub}</div><div className="mt-1 text-[11px] text-white/65">{label}</div></div>)}
              </div>
              <p className="mt-4 text-sm leading-6 text-white/75">Find your people, plan a journey and make room for the unexpected.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="discover" className="mx-auto max-w-7xl px-4 py-9 sm:px-8 md:py-12">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-800">Your next story starts here</p><h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Find your kind of journey</h2><p className="mt-2 max-w-xl text-sm text-slate-600">Join a trip, meet new people or create a plan and invite others along.</p></div>
          <label className="flex h-11 w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-4 shadow-sm md:max-w-xs"><Compass className="h-4 w-4 text-slate-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search trips or places" className="w-full bg-transparent text-sm outline-none" /></label>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-2">
          {['Discover', 'My trips', 'Saved'].map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === item ? 'bg-[#173e30] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-800'}`}>{item}{item === 'Saved' && saved.length > 0 ? ` · ${saved.length}` : ''}</button>)}
          <div className="flex-1" />
          <Link href={user ? '/trip/create' : '/?auth=signup&returnUrl=%2Fcommunity'} className="inline-flex items-center gap-2 rounded-full bg-[#c9f17d] px-4 py-2 text-sm font-bold text-[#183326] hover:bg-[#b9e969]"><Plus className="h-4 w-4"/> Create trip</Link>
        </div>

        {tab === 'My trips' ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center sm:p-12"><CalendarDays className="mx-auto h-9 w-9 text-emerald-800"/><h3 className="mt-4 text-xl font-bold">Your journeys, all in one place</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{user ? 'Open your account dashboard to manage your bookings and upcoming journeys.' : 'Sign in to see trips you host or have joined.'}</p><Link href={user ? '/dashboard' : '/?auth=login&returnUrl=%2Fcommunity'} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#173e30] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#235743]">{user ? 'Open dashboard' : 'Sign in to continue'} <ArrowRight className="h-4 w-4"/></Link></div>
        ) : (
          <div className="mt-6 flex flex-wrap gap-2">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${category === item ? 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>{item}</button>)}</div>
        )}

        {tab !== 'My trips' && (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(tab === 'Saved' ? visibleTrips.filter((trip) => saved.includes(trip.id)) : visibleTrips).map((trip) => (
              <article key={trip.id} className="group overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="relative h-52 overflow-hidden">
                  <Image src={trip.image} alt={trip.title} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105"/>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10"/>
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-slate-800">{trip.type}</span>
                  <button aria-label={saved.includes(trip.id) ? 'Remove saved trip' : 'Save trip'} onClick={() => setSaved((items) => items.includes(trip.id) ? items.filter((id) => id !== trip.id) : [...items, trip.id])} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-700 transition hover:bg-white"><Heart className={`h-4 w-4 ${saved.includes(trip.id) ? 'fill-rose-500 text-rose-500' : ''}`}/></button>
                  <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 text-xs font-medium text-white"><MapPin className="h-3.5 w-3.5"/>{trip.place}</span>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-bold leading-snug">{trip.title}</h3><span className="shrink-0 text-sm font-bold text-emerald-900">{trip.cost}</span></div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{trip.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#e7eee7] text-xs font-bold text-[#234b37]">{trip.initials}</span><div><div className="flex items-center gap-1 text-xs font-semibold">{trip.host}{trip.verified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700"/>}</div><div className="mt-0.5 text-[11px] text-slate-500">{trip.date} · {trip.days}</div></div></div>
                    <span className="text-[11px] text-slate-500">{trip.people}</span>
                  </div>
                  <div className="mt-4 flex gap-2"><Link href={user ? `/trip/${trip.id}` : `/?auth=login&returnUrl=%2Fcommunity`} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-[#173e30] px-4 text-sm font-semibold text-white transition hover:bg-[#235743]">View trip <ArrowRight className="h-4 w-4"/></Link><button onClick={() => setSaved((items) => items.includes(trip.id) ? items.filter((id) => id !== trip.id) : [...items, trip.id])} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Save trip"><Heart className={`h-4 w-4 ${saved.includes(trip.id) ? 'fill-rose-500 text-rose-500' : ''}`}/></button></div>
                </div>
              </article>
            ))}
            {visibleTrips.length === 0 && <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No trips match those filters yet. Try another category or search.</div>}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-8">
        <div className="grid gap-4 rounded-[2rem] bg-[#e7efe7] p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
          <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-emerald-900"><MessageCircle className="h-4 w-4"/> More than a destination</div><h2 className="mt-2 text-2xl font-bold">Travel with people who make the place feel closer.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Create a plan, find a small group and share the kind of local moments that stay with you.</p></div>
          <Link href={user ? '/trip/create' : '/?auth=signup&returnUrl=%2Fcommunity'} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#173e30] px-5 text-sm font-semibold text-white hover:bg-[#235743]">Start a journey <ArrowRight className="h-4 w-4"/></Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
