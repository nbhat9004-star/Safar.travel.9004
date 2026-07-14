'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, MapPin, Flame, Sun, Cloud, Snowflake, Leaf, TrendingUp, Compass, Heart, MessageCircle, Users, Camera, Wand2, Globe } from 'lucide-react';
import AuroraBg from '@/components/explore/AuroraBg';
import AIPanel from '@/components/explore/AIPanel';
import BadgeChip from '@/components/explore/BadgeChip';
import { LISTINGS, IMG } from '@/lib/data';

const TRENDING = [
  { name: 'Gulmarg', tag: 'Fresh powder • 20cm', img: IMG.mtn1, growth: '+142%' },
  { name: 'Pahalgam', tag: 'Golden autumn peak', img: IMG.cot1, growth: '+87%' },
  { name: 'Sonamarg', tag: 'Glacier treks open', img: IMG.mtn2, growth: '+64%' },
  { name: 'Srinagar', tag: 'Shikara sunsets', img: IMG.dal2, growth: '+53%' },
];

const SEASONAL = [
  { season: 'Winter', icon: Snowflake, tint: 'from-sky-300 to-blue-400', tip: 'Ski Gulmarg • Frozen Dal walks' },
  { season: 'Spring', icon: Leaf, tint: 'from-pink-300 to-rose-400', tip: 'Tulip garden • Almond blossoms' },
  { season: 'Summer', icon: Sun, tint: 'from-amber-300 to-orange-400', tip: 'Shikara nights • Meadow picnics' },
  { season: 'Autumn', icon: Leaf, tint: 'from-orange-400 to-red-400', tip: 'Chinar canopies • Apple orchards' },
];

const MOCK_FEED = [
  { id: 'p1', user: 'Aanya S.', avatar: 'https://i.pravatar.cc/64?img=45', location: 'Dal Lake, Srinagar', text: 'Kahwa at sunrise on a shikara. Currently unshakable.', img: IMG.shi1, likes: 231, comments: 18, time: '2h' },
  { id: 'p2', user: 'Rohan I.', avatar: 'https://i.pravatar.cc/64?img=13', location: 'Gulmarg Gondola', text: 'Phase 2 today — above the clouds. Kashmir winters hit different.', img: IMG.mtn1, likes: 512, comments: 43, time: '5h' },
  { id: 'p3', user: 'Saira K.', avatar: 'https://i.pravatar.cc/64?img=32', location: 'Pahalgam Valley', text: 'Betaab Valley in October. This is the postcard.', img: IMG.cot2, likes: 178, comments: 22, time: '1d' },
];

export default function ExploreHome() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  const nearby = LISTINGS.filter(l => l.category === 'experience' || l.category === 'tour').slice(0, 4);

  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative overflow-hidden pt-16 md:pt-24 pb-16">
        <AuroraBg />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8">
          <div className="max-w-3xl e-fade-in">
            <div className="e-chip"><Sparkles className="size-3 text-emerald-300" /> Your next chapter starts here</div>
            <h1 className="display font-bold mt-5 text-[clamp(2.2rem,6.4vw,4.8rem)] leading-[1.02] tracking-tight">
              Where curiosity meets <span className="e-grad-text">the valley.</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-white/75 max-w-2xl leading-relaxed">
              Live feed. Trending places. AI-curated ideas. Real travelers. Explore Kashmir the way locals do — and share the moments that matter.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link href="/explore/journey" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full e-btn-primary text-[15px]"><Wand2 className="size-4" /> Plan with AI</Link>
              <Link href="/explore/community" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full e-btn-ghost text-[15px]"><Users className="size-4" /> Find travel buddies <ArrowRight className="size-4" /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* AI INLINE */}
      <section className="relative max-w-7xl mx-auto px-4 md:px-8 -mt-4 md:-mt-6 mb-12">
        <AIPanel
          title="Safar AI — Ask anything"
          suggestions={['5-day itinerary in Kashmir under ₹40k', 'Hidden gems near Srinagar', 'Best time for a solo trip', 'Pack for a Gulmarg winter weekend']}
          defaultOpen={true}
          systemHint="You are the Safar Explore concierge. Reply with warm, concise, structured travel advice for Kashmir, using bullet points and ₹ estimates when helpful."
        />
      </section>

      {/* TRENDING DESTINATIONS */}
      <section className="relative max-w-7xl mx-auto px-4 md:px-8 mb-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="e-chip"><Flame className="size-3 text-orange-300" /> Trending now</div>
            <h2 className="display text-2xl md:text-4xl font-bold mt-3">The valley is talking about…</h2>
          </div>
          <Link href="/explore" className="text-sm text-white/70 hover:text-white inline-flex items-center gap-1 transition">See all <ArrowRight className="size-3.5" /></Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {TRENDING.map((d, i) => (
            <Link key={d.name} href={`/explore?location=${d.name}`} className="e-card group" style={{ animationDelay: `${i*60}ms` }}>
              <div className="e-card-media">
                <Image src={d.img} alt={d.name} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute top-3 left-3"><BadgeChip type="live"><TrendingUp className="size-3" /> {d.growth}</BadgeChip></div>
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-white/70">{d.tag}</div>
                  <div className="font-semibold text-lg mt-0.5">{d.name}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* LIVE FEED */}
      <section className="relative max-w-7xl mx-auto px-4 md:px-8 mb-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="e-chip"><span className="size-2 rounded-full bg-emerald-400 animate-pulse" /> Live from Kashmir</div>
            <h2 className="display text-2xl md:text-4xl font-bold mt-3">Real travelers. Right now.</h2>
          </div>
          <Link href="/explore/stories" className="text-sm text-white/70 hover:text-white inline-flex items-center gap-1 transition">All stories <ArrowRight className="size-3.5" /></Link>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {MOCK_FEED.map(p => (
            <article key={p.id} className="e-card e-lift-in">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image src={p.img} alt="" fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2.5">
                  <Image src={p.avatar} alt="" width={36} height={36} className="rounded-full ring-1 ring-white/20" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{p.user}</div>
                    <div className="text-[11px] text-white/55 truncate"><MapPin className="inline size-3 mr-0.5" />{p.location} · {p.time}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-white/85 leading-relaxed">{p.text}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-white/60">
                  <button className="inline-flex items-center gap-1 hover:text-rose-300 transition"><Heart className="size-3.5" /> {p.likes}</button>
                  <button className="inline-flex items-center gap-1 hover:text-emerald-300 transition"><MessageCircle className="size-3.5" /> {p.comments}</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* SEASONAL */}
      <section className="relative max-w-7xl mx-auto px-4 md:px-8 mb-16">
        <div className="e-chip"><Cloud className="size-3" /> This month in Kashmir</div>
        <h2 className="display text-2xl md:text-4xl font-bold mt-3 mb-6">Seasonal recommendations</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SEASONAL.map(({ season, icon: Icon, tint, tip }) => (
            <div key={season} className="e-glass rounded-3xl p-5">
              <div className={`size-11 rounded-2xl bg-gradient-to-br ${tint} grid place-items-center text-[#06080f]`}><Icon className="size-5" /></div>
              <div className="mt-3 font-semibold">{season}</div>
              <div className="text-xs text-white/60 mt-1 leading-relaxed">{tip}</div>
            </div>
          ))}
        </div>
      </section>

      {/* NEARBY */}
      <section className="relative max-w-7xl mx-auto px-4 md:px-8 mb-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="e-chip"><Compass className="size-3" /> Nearby experiences</div>
            <h2 className="display text-2xl md:text-4xl font-bold mt-3">Curated for the season</h2>
          </div>
          <Link href="/explore?cat=experience" className="text-sm text-white/70 hover:text-white inline-flex items-center gap-1 transition">All experiences <ArrowRight className="size-3.5" /></Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {nearby.map(l => (
            <Link key={l.id} href={`/property/${l.id}`} className="e-card">
              <div className="e-card-media"><Image src={l.image} alt={l.title} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" /></div>
              <div className="p-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">{l.location}</div>
                <div className="font-semibold text-sm mt-1 line-clamp-1">{l.title}</div>
                <div className="mt-2 text-xs text-white/60">from <span className="text-white font-semibold">₹{l.price.toLocaleString('en-IN')}</span></div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* COMMUNITY HIGHLIGHTS */}
      <section className="relative max-w-7xl mx-auto px-4 md:px-8 pb-24">
        <div className="e-glass rounded-3xl p-6 md:p-10 relative overflow-hidden">
          <div className="absolute -inset-1 bg-gradient-to-br from-emerald-300/10 via-violet-400/10 to-fuchsia-400/10 pointer-events-none" />
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="e-chip"><Users className="size-3" /> Community</div>
              <h3 className="display text-2xl md:text-3xl font-bold mt-3">You’re not exploring alone.</h3>
              <p className="text-white/70 mt-3 leading-relaxed">Join public trips, find your travel tribe, or start a group. 1,240+ travelers are planning right now.</p>
              <div className="mt-5 flex gap-3">
                <Link href="/explore/community" className="e-btn-primary rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2"><Users className="size-4" /> Meet travelers</Link>
                <Link href="/explore/stories" className="e-btn-ghost rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2"><Camera className="size-4" /> See stories</Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[IMG.hb1, IMG.mtn1, IMG.cot1, IMG.shi1, IMG.dal2, IMG.mtn2].map((src, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden">
                  <Image src={src} alt="" fill sizes="120px" className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
