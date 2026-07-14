'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import CircleNav from '@/components/circle/CircleNav';
import { ArrowRight, Sparkles, Compass, MapPin, Users, Shield, Wand2, Zap } from 'lucide-react';
import { circleApi, themeLabel, formatINR } from '@/lib/circle-api';

// PERF: Poster URLs kept only for the desktop floating deco (hidden lg:block).
// On mobile these images are never rendered, so we skip preloading them.
const POSTER_1 = 'https://images.pexels.com/photos/14262339/pexels-photo-14262339.jpeg?auto=compress&cs=tinysrgb&w=1200';
const POSTER_2 = 'https://images.pexels.com/photos/25786776/pexels-photo-25786776.jpeg?auto=compress&cs=tinysrgb&w=1200';
const POSTER_3 = 'https://images.pexels.com/photos/32620987/pexels-photo-32620987.jpeg?auto=compress&cs=tinysrgb&w=1200';

export default function CircleLanding() {
  const [featured, setFeatured] = useState([]);
  useEffect(() => {
    circleApi.discover({ limit: 6 }).then(r => setFeatured(r.journeys || [])).catch(() => {});
  }, []);

  return (
    <main className="relative min-h-screen text-white overflow-x-hidden">
      <CircleNav variant="transparent" />

      {/* HERO */}
      <section className="relative min-h-[100svh] flex items-center pt-24 pb-16">
        <div className="circle-aurora" />
        <div className="circle-orb" style={{ width: 380, height: 380, background: 'radial-gradient(circle, rgba(110,231,183,0.55), transparent 60%)', top: '10%', right: '-6%' }} />
        <div className="circle-orb" style={{ width: 320, height: 320, background: 'radial-gradient(circle, rgba(167,139,250,0.6), transparent 60%)', bottom: '-8%', left: '-6%', animationDelay: '-6s' }} />

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-2 gap-10 items-center w-full">
          <div className="circle-fade-in">
            <div className="circle-chip">
              <Sparkles className="size-3 text-emerald-300" /> World's first Collaborative Travel OS
            </div>
            <h1 className="display font-bold mt-5 md:mt-6 text-[clamp(2rem,7vw,5.6rem)] leading-[1.05]">
              Create Journeys<br/>
              <span className="circle-grad-text">Worth Joining.</span>
            </h1>
            <p className="mt-5 md:mt-6 text-base md:text-xl text-white/80 max-w-xl leading-relaxed">
              Plan incredible trips. Invite amazing people. Book everything through trusted Safar hosts. Travel together.
            </p>
            <div className="mt-7 md:mt-9 flex flex-col sm:flex-row flex-wrap gap-3">
              <Link href="/create" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 md:py-4 rounded-full circle-btn-primary text-[15px]">
                <Sparkles className="size-4" /> Create a Journey
              </Link>
              <Link href="/discover" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 md:py-4 rounded-full circle-btn-ghost text-[15px]">
                <Compass className="size-4" /> Discover Journeys <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="mt-10 md:mt-12 grid grid-cols-3 gap-3 md:gap-4 max-w-md">
              <Stat n="10" label="Themes" />
              <Stat n="1000+" label="Marketplace services" />
              <Stat n="∞" label="Journeys possible" />
            </div>
          </div>

          {/* Right side: floating posters */}
          <div className="relative h-[520px] hidden lg:block">
            <FloatingPoster img={POSTER_1} title="Golden Chinar" tag="Photography" price="per person from ₹12,400" style={{ top: 0, right: 20, transform: 'rotate(-4deg)' }} />
            <FloatingPoster img={POSTER_2} title="Tulip Odyssey" tag="Luxury" price="per person from ₹18,900" style={{ top: 160, right: 180, transform: 'rotate(3deg)' }} big />
            <FloatingPoster img={POSTER_3} title="Gulmarg Snow Line" tag="Adventure" price="per person from ₹15,600" style={{ bottom: 0, right: 40, transform: 'rotate(-2deg)' }} />
          </div>
        </div>
      </section>

      {/* HOW IT FEELS */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="max-w-2xl">
            <div className="circle-chip">The Feeling</div>
            <h2 className="display text-4xl md:text-6xl font-bold mt-4">Not a booking. <span className="circle-grad-text">An experience.</span></h2>
            <p className="text-white/70 text-lg mt-4">A journey is more than dates and hotels. It's a story with people you'll never forget — curated end-to-end from Safar's trusted marketplace.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mt-12">
            <FeelCard icon={Wand2} title="Curate every touchpoint" body="Stays, transport, food, guides, activities — pick from live Safar marketplace inventory. No duplicates. No middlemen." />
            <FeelCard icon={Users} title="Invite worthy travelers" body="Public, private, invite-only, or scheduled. Bring the group. Set the tone." />
            <FeelCard icon={Shield} title="Every service verified" body="Ratings, verification badges, instant book. Journey Curators only choose what they'd take their family to." />
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="circle-chip">Now Live</div>
              <h2 className="display text-3xl md:text-5xl font-bold mt-3">Journeys the Circle is talking about</h2>
            </div>
            <Link href="/discover" className="hidden md:inline-flex items-center gap-2 text-sm text-white/80 hover:text-white">
              Explore all <ArrowRight className="size-4" />
            </Link>
          </div>
          {featured.length === 0 ? (
            <div className="circle-glass circle-card p-12 text-center">
              <div className="text-white/70">No public journeys yet. Be the first Journey Curator.</div>
              <Link href="/create" className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full circle-btn-primary text-sm font-semibold">
                <Sparkles className="size-4" /> Create a Journey
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map(j => <JourneyPoster key={j.id} j={j} />)}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <div className="relative circle-glass-strong circle-card p-10 md:p-16 overflow-hidden">
            <div className="circle-aurora" />
            <div className="relative text-center max-w-2xl mx-auto">
              <div className="circle-chip mx-auto">Journey Curator</div>
              <h2 className="display text-4xl md:text-6xl font-bold mt-4">Your first Journey is one click away.</h2>
              <p className="text-white/75 text-lg mt-4">You bring the vision. Safar Circle brings the tools, the trusted marketplace, and the world.</p>
              <div className="mt-8 flex justify-center gap-3 flex-wrap">
                <Link href="/create" className="inline-flex items-center gap-2 px-7 py-4 rounded-full circle-btn-primary text-[15px]">
                  <Sparkles className="size-4" /> Create a Journey <ArrowRight className="size-4" />
                </Link>
                <Link href="/discover" className="inline-flex items-center gap-2 px-7 py-4 rounded-full circle-btn-ghost text-[15px]">
                  Discover Journeys
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative py-14 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-white/60">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg circle-btn-primary grid place-items-center text-[10px] font-bold text-black">S</div>
            Safar Circle · A different kind of travel operating system
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-white">Safar Marketplace</Link>
            <Link href="/discover" className="hover:text-white">Discover</Link>
            <Link href="/create" className="hover:text-white">Create</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Stat({ n, label }) {
  return (
    <div>
      <div className="display text-2xl md:text-3xl font-bold circle-grad-text">{n}</div>
      <div className="text-xs text-white/60 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function FeelCard({ icon: Icon, title, body }) {
  return (
    <div className="circle-glass circle-card p-7 circle-magnetic">
      <div className="size-11 rounded-2xl circle-glass-strong grid place-items-center">
        <Icon className="size-5 text-emerald-300" />
      </div>
      <div className="display text-xl font-semibold mt-5">{title}</div>
      <div className="text-white/70 text-sm mt-2 leading-relaxed">{body}</div>
    </div>
  );
}

function FloatingPoster({ img, title, tag, price, style, big }) {
  return (
    <div className={`absolute ${big ? 'w-64 h-80' : 'w-52 h-72'} rounded-3xl overflow-hidden circle-magnetic border border-white/20 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]`} style={style}>
      {/* PERF: explicit width/height matches Tailwind container ratio to
          eliminate CLS. Hidden on mobile via `hidden lg:block` on parent —
          so no mobile bytes wasted regardless. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img loading="lazy" decoding="async" width={big ? 256 : 208} height={big ? 320 : 288} src={img} alt={title} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="circle-chip !text-[9px] !py-1 !px-2">{tag}</div>
        <div className="display font-semibold mt-2 text-lg leading-tight">{title}</div>
        <div className="text-[11px] text-white/75 mt-1">{price}</div>
      </div>
    </div>
  );
}

function JourneyPoster({ j }) {
  const th = themeLabel(j.theme);
  return (
    <Link href={`/j/${j.slug}`} className="group relative aspect-[3/4] rounded-3xl overflow-hidden block border border-white/10 circle-magnetic">
      {j.cover ? (
        // PERF: explicit width/height (3:4 ratio) so the browser reserves
        // the exact aspect box before the image decodes → zero CLS on the
        // featured grid below the fold.
        // eslint-disable-next-line @next/next/no-img-element
        <img loading="lazy" decoding="async" width={600} height={800} src={j.cover} alt={j.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/40 via-violet-500/40 to-pink-400/40" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
      <div className="absolute top-4 left-4 circle-chip !text-[10px]">{th.emoji} {th.label}</div>
      <div className="absolute inset-x-0 bottom-0 p-5 space-y-2">
        <div className="display text-xl font-bold">{j.name}</div>
        <div className="flex items-center gap-3 text-[11px] text-white/80">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {j.destination?.name || 'Multi-city'}</span>
          <span className="inline-flex items-center gap-1"><Users className="size-3" /> {j.maxMembers} seats</span>
        </div>
        <div className="pt-2 flex items-end justify-between">
          <div className="text-xs text-white/70">from</div>
          <div className="display text-xl font-bold circle-grad-text">{formatINR(j.estimate?.perPerson || j.budget || 0)}<span className="text-xs text-white/60 font-normal"> /person</span></div>
        </div>
      </div>
    </Link>
  );
}
