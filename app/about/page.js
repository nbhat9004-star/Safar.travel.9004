import Link from 'next/link';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import { Button } from '@/components/ui/button';
import { Mountain, Heart, ShieldCheck, Sparkles } from 'lucide-react';
import { IMG, STATS } from '@/lib/data';

export const metadata = { title: 'About — Safar', description: 'Authentic Kashmir tourism, built with locals.' };

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <section className="relative h-[60vh] min-h-[420px] overflow-hidden">
        <img src={IMG.mtn1} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="relative h-full container flex flex-col justify-end pb-14 text-white">
          <div className="text-gold text-xs uppercase tracking-[0.18em] font-semibold">About Safar</div>
          <h1 className="font-display text-5xl md:text-7xl font-bold mt-3 leading-[0.95] max-w-3xl">Built in the valley. Made for travelers.</h1>
          <p className="mt-4 text-white/80 text-lg max-w-2xl">Safar is a marketplace for authentic Kashmir stays, transport and experiences — powered by AI and curated by locals.</p>
        </div>
      </section>
      <section className="container py-20 grid md:grid-cols-3 gap-6">
        {[{i:Mountain,t:'Local-first',d:'Every listing is owned and run by Kashmiris — ensuring authenticity and direct income for hosts.'},{i:Sparkles,t:'AI-powered',d:'From itinerary planning to stay comparisons, Safar AI saves hours of research.'},{i:ShieldCheck,t:'Trust & safety',d:'Verified hosts, secure payments and 24/7 support — wherever the road takes you.'}].map((c)=>{const I=c.i;return(
          <div key={c.t} className="p-7 rounded-3xl border bg-white"><I className="size-6 text-emerald2" /><div className="font-display text-xl font-bold mt-3">{c.t}</div><p className="text-sm text-muted-foreground mt-2">{c.d}</p></div>
        );})}
      </section>
      <section className="bg-secondary/50 py-16"><div className="container grid grid-cols-2 md:grid-cols-4 gap-6">
        {STATS.map((s)=>(<div key={s.label} className="text-center md:text-left"><div className="font-display text-3xl md:text-4xl font-bold gradient-text-emerald">{s.value}</div><div className="text-sm text-muted-foreground mt-1">{s.label}</div></div>))}
      </div></section>
      <section className="container py-20 text-center">
        <Heart className="size-7 text-rose-500 fill-rose-500 mx-auto" />
        <h2 className="font-display text-3xl md:text-5xl font-bold mt-3 max-w-3xl mx-auto">Travel that gives back to the valley.</h2>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">A part of every booking funds local skills training and youth tourism programs in Kashmir.</p>
        <div className="mt-7 flex justify-center gap-3">
          <Button asChild className="rounded-full bg-gradient-emerald font-semibold"><Link href="/explore">Explore stays</Link></Button>
          <Button asChild variant="outline" className="rounded-full font-semibold"><Link href="/contact">Contact us</Link></Button>
        </div>
      </section>
      <Footer />
    </main>
  );
}
