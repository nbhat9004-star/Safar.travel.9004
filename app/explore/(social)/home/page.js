'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, MapPin, Flame, Snowflake, Cloud, CloudSun, Sun, Leaf, TrendingUp, Compass, Users, Camera, Wand2, Mountain, Bike, Car, Utensils, Calendar, MessageCircle, Lightbulb, Route, IdCard, Bookmark, Clock, Send } from 'lucide-react';
import AuroraBg from '@/components/explore/AuroraBg';
import AIPanel from '@/components/explore/AIPanel';
import BadgeChip from '@/components/explore/BadgeChip';
import { useAuth } from '@/lib/auth-context';
import { LISTINGS, IMG } from '@/lib/data';

// ─── LIVE KASHMIR widgets (admin-manageable in future; static seed for MVP) ───
const LIVE_WIDGETS = [
  { id: 'w-snow',    icon: Snowflake, label: 'Fresh Snow',        value: '20 cm',      sub: 'Gulmarg · last 24h',       tint: 'from-sky-300 to-blue-400',   dest: 'Gulmarg' },
  { id: 'w-tulip',   icon: Leaf,      label: 'Tulip Bloom',       value: 'Peak',       sub: 'Indira Gandhi Garden',     tint: 'from-pink-300 to-rose-400',  dest: 'Srinagar' },
  { id: 'w-chinar',  icon: Leaf,      label: 'Chinar Watch',      value: '68%',        sub: 'Autumn — Pahalgam',        tint: 'from-orange-400 to-red-400', dest: 'Pahalgam' },
  { id: 'w-weather', icon: CloudSun,  label: 'Weather',           value: '18°C',       sub: 'Srinagar · partly cloudy', tint: 'from-amber-300 to-orange-400', dest: 'Srinagar' },
  { id: 'w-road',    icon: Car,       label: 'Roads',             value: 'All open',   sub: 'NH-1A · Sonamarg pass',    tint: 'from-emerald-300 to-teal-400', dest: 'Sonamarg' },
  { id: 'w-advent',  icon: Mountain,  label: 'Adventure',         value: 'Excellent',  sub: 'Trekking · Rafting',       tint: 'from-lime-300 to-emerald-400', dest: 'Pahalgam' },
  { id: 'w-fest',    icon: Sparkles,  label: 'Festival',          value: 'Sufi Nights',sub: 'This weekend',             tint: 'from-fuchsia-300 to-violet-400', dest: 'Srinagar' },
  { id: 'w-wknd',    icon: Flame,     label: 'Weekend Pick',      value: 'Aru Valley', sub: '2 nights · from ₹6,400',   tint: 'from-rose-300 to-fuchsia-400', dest: 'Pahalgam' },
];

// Journey categories with icons
const JOURNEY_CATS = [
  { id: 'now',       label: 'Happening now',   icon: Flame,     hint: 'Live journeys' },
  { id: 'upcoming',  label: 'Upcoming',        icon: Calendar,  hint: 'Adventures next 7 days' },
  { id: 'photo',     label: 'Photography',     icon: Camera,    hint: 'Photo walks' },
  { id: 'road',      label: 'Road trips',      icon: Car,       hint: 'Wheels & horizons' },
  { id: 'bike',      label: 'Bike expeditions',icon: Bike,      hint: 'Two-wheel epics' },
  { id: 'camp',      label: 'Camping',         icon: Mountain,  hint: 'Under-the-stars' },
  { id: 'food',      label: 'Food trails',     icon: Utensils,  hint: 'Wazwan & more' },
  { id: 'wknd',      label: 'Weekend escapes', icon: Sparkles,  hint: '48-hour stories' },
  { id: 'trek',      label: 'Treks',           icon: Mountain,  hint: 'Higher, together' },
];

const COMMUNITY_TILES = [
  { icon: Users,        title: 'Meet travelers',       sub: 'Verified profiles',           href: '/explore/community' },
  { icon: MessageCircle,title: 'Travel discussions',  sub: '132 active threads',          href: '/explore/community#discussions' },
  { icon: Calendar,     title: 'Meetups',              sub: 'Local & pop-up gatherings',   href: '/explore/community#meetups' },
  { icon: Lightbulb,    title: 'Questions',            sub: 'Ask locals & pros',           href: '/explore/community#questions' },
  { icon: Sparkles,     title: 'Travel tips',          sub: 'Field-tested by travelers',   href: '/explore/community#tips' },
  { icon: MapPin,       title: 'Hidden gems',          sub: 'Off the beaten path',         href: '/explore/wander' },
  { icon: Send,         title: 'Recommendations',      sub: 'Community-curated picks',     href: '/explore/community#recs' },
];

const YOUR_JOURNEY_TILES = [
  { icon: Clock,     title: 'Upcoming trips',       sub: 'Your next chapters',          href: '/explore/journey' },
  { icon: Route,     title: 'Journey Studio',       sub: 'Plan, publish, invite',       href: '/explore/journey' },
  { icon: IdCard,    title: 'Travel Passport',      sub: 'Badges, countries, stats',    href: '/explore/passport' },
  { icon: Bookmark,  title: 'Saved places',         sub: 'Your Wander wishlist',        href: '/explore/journey?tab=saved' },
  { icon: Users,     title: 'Invitations',          sub: 'Group trips awaiting you',    href: '/explore/community' },
  { icon: MessageCircle, title: 'Pending requests',sub: 'Approvals & DMs',            href: '/dashboard/traveler/messages' },
  { icon: TrendingUp,title: 'Journey stats',        sub: 'Your travel year in numbers', href: '/explore/passport' },
];

export default function ExploreHome() {
  const { user } = useAuth();
  const [journeys, setJourneys] = useState([]);
  const [jLoading, setJLoading] = useState(true);
  const [cat, setCat] = useState('upcoming');

  useEffect(() => {
    let cancel = false;
    fetch('/api/circle/journeys?limit=6').then(r => r.json()).then(j => {
      if (!cancel) { setJourneys(j.journeys || []); setJLoading(false); }
    }).catch(() => { if (!cancel) setJLoading(false); });
    return () => { cancel = true; };
  }, []);

  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative overflow-hidden pt-14 md:pt-20 pb-10">
        <AuroraBg />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 e-fade-in">
          <div className="e-chip"><span className="size-2 rounded-full bg-emerald-400 animate-pulse" /> Live from Kashmir</div>
          <h1 className="display font-bold mt-5 text-[clamp(2.2rem,6.4vw,4.8rem)] leading-[1.02] tracking-tight max-w-4xl">
            Your <span className="e-grad-text">Living Travel World.</span>
          </h1>
          <p className="mt-4 text-base md:text-lg max-w-2xl leading-relaxed" style={{ color: 'var(--e-text-muted)' }}>
            Discover journeys happening right now, find companions, join experiences and stay engaged before, during and after every trip.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/explore/journey" className="inline-flex items-center gap-2 px-6 py-3 rounded-full e-btn-primary text-sm md:text-[15px]"><Route className="size-4" /> Create a journey</Link>
            <Link href="/explore/wander" className="inline-flex items-center gap-2 px-6 py-3 rounded-full e-btn-ghost text-sm md:text-[15px]"><Sparkles className="size-4" /> WanderMatch <ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </section>

      {/* SECTION 1 — LIVE KASHMIR */}
      <section className="relative max-w-7xl mx-auto px-4 md:px-8 mb-14">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="e-chip"><Sun className="size-3 text-amber-300" /> Live Kashmir</div>
            <h2 className="display text-2xl md:text-3xl font-bold mt-3">Real conditions. Right now.</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {LIVE_WIDGETS.map((w) => (
            <Link key={w.id} href={`/explore?location=${encodeURIComponent(w.dest)}`} className="e-glass rounded-2xl p-4 group hover:-translate-y-0.5 transition">
              <div className={`size-10 rounded-xl bg-gradient-to-br ${w.tint} grid place-items-center text-[#06080f]`}>
                <w.icon className="size-5" strokeWidth={2.4} />
              </div>
              <div className="mt-3 text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--e-text-dim)' }}>{w.label}</div>
              <div className="font-semibold text-lg mt-0.5" style={{ color: 'var(--e-text)' }}>{w.value}</div>
              <div className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--e-text-muted)' }}>{w.sub}</div>
            </Link>
          ))}
        </div>
        <div className="mt-4">
          <BadgeChip type="ai">AI recommendation</BadgeChip>
          <p className="text-sm mt-2 max-w-3xl leading-relaxed" style={{ color: 'var(--e-text-muted)' }}>
            Fresh snow in Gulmarg + open roads = perfect ski weekend. Pair with a Nigeen houseboat for the cultural half of your trip.
            <Link href="/explore?cat=all&location=Gulmarg" className="e-grad-text font-semibold ml-1">Build this trip →</Link>
          </p>
        </div>
      </section>

      {/* SECTION 2 — LIVE JOURNEYS */}
      <section className="relative max-w-7xl mx-auto px-4 md:px-8 mb-14">
        <div className="flex items-end justify-between mb-5 gap-3 flex-wrap">
          <div>
            <div className="e-chip"><Route className="size-3 text-emerald-300" /> Live Journeys</div>
            <h2 className="display text-2xl md:text-3xl font-bold mt-3">Adventures in motion</h2>
          </div>
          <Link href="/explore/community" className="text-sm inline-flex items-center gap-1 transition hover:opacity-80" style={{ color: 'var(--e-text-muted)' }}>
            All journeys <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {/* Category pills */}
        <div className="flex items-center gap-2 overflow-x-auto e-scroll-x pb-1 mb-4">
          {JOURNEY_CATS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setCat(id)} className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition border ${cat===id ? 'e-btn-primary border-transparent' : 'e-btn-ghost'}`}>
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
        {jLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map(i => <div key={i} className="e-glass rounded-3xl p-5 h-56 e-skeleton" />)}
          </div>
        ) : journeys.length === 0 ? (
          <div className="e-glass rounded-3xl p-8 text-center">
            <div className="e-chip mx-auto">✨ Fresh start</div>
            <p className="mt-4" style={{ color: 'var(--e-text-muted)' }}>No public journeys yet — be the first. <Link href="/explore/journey" className="e-grad-text font-semibold">Create one →</Link></p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {journeys.map((j) => (
              <Link key={j.id} href={`/explore/journey?trip=${j.slug || j.id}`} className="e-card e-lift-in">
                {j.coverImage && <div className="e-card-media"><Image src={j.coverImage} alt={j.title} fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover" /></div>}
                <div className="p-5">
                  <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--e-text-dim)' }}>{j.destination?.name || 'Kashmir'} · {j.theme || 'Journey'}</div>
                  <div className="font-semibold mt-1 line-clamp-2">{j.title}</div>
                  {j.pricing?.pricePerPerson && <div className="mt-2 text-xs" style={{ color: 'var(--e-text-muted)' }}>from <span className="font-semibold" style={{ color: 'var(--e-text)' }}>₹{Number(j.pricing.pricePerPerson).toLocaleString('en-IN')}</span> / person</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 3 — COMMUNITY */}
      <section className="relative max-w-7xl mx-auto px-4 md:px-8 mb-14">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="e-chip"><Users className="size-3 text-violet-300" /> Community</div>
            <h2 className="display text-2xl md:text-3xl font-bold mt-3">Travelers, tips & togetherness</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
          {COMMUNITY_TILES.map(t => (
            <Link key={t.title} href={t.href} className="e-glass rounded-2xl p-4 hover:-translate-y-0.5 transition group">
              <t.icon className="size-5 text-emerald-300" />
              <div className="font-semibold text-sm mt-2.5">{t.title}</div>
              <div className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--e-text-dim)' }}>{t.sub}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 4 — YOUR JOURNEY */}
      <section className="relative max-w-7xl mx-auto px-4 md:px-8 mb-14">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="e-chip"><IdCard className="size-3 text-fuchsia-300" /> Your Journey</div>
            <h2 className="display text-2xl md:text-3xl font-bold mt-3">{user ? `Welcome back, ${(user.name||'').split(' ')[0] || 'Traveler'}` : 'Your travel dashboard'}</h2>
          </div>
        </div>
        {!user && (
          <div className="e-glass rounded-3xl p-5 md:p-6 mb-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="font-semibold">Sign in to unlock your dashboard</div>
              <div className="text-sm mt-1" style={{ color: 'var(--e-text-muted)' }}>Trips, passport stats, invitations and saved places sync across devices.</div>
            </div>
            <Link href="/?auth=1" className="e-btn-primary rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2"><Sparkles className="size-4" /> Sign in</Link>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
          {YOUR_JOURNEY_TILES.map(t => (
            <Link key={t.title} href={t.href} className="e-glass rounded-2xl p-4 hover:-translate-y-0.5 transition">
              <t.icon className="size-5 text-fuchsia-300" />
              <div className="font-semibold text-sm mt-2.5">{t.title}</div>
              <div className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--e-text-dim)' }}>{t.sub}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* AI concierge inline */}
      <section className="relative max-w-7xl mx-auto px-4 md:px-8 pb-24">
        <AIPanel
          title="Safar AI — your travel concierge"
          suggestions={['Best weekend trip for me this week', 'Hidden gems near Srinagar', 'Ski + culture combo, ₹35k, 4 days', 'What festivals are on this month?']}
          systemHint="You are the Safar Explore concierge. Reply with warm, concise, structured travel advice for Kashmir. Use bullets and ₹ estimates."
        />
      </section>
    </div>
  );
}
