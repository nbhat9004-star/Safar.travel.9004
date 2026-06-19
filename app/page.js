'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Search, MapPin, CalendarRange, Users, Sparkles, ArrowRight, ShieldCheck, BadgeCheck, Star, Wand2, Plane, Mountain, Compass, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import PropertyCard from '@/components/safar/PropertyCard';
import CategoryPills from '@/components/safar/CategoryPills';
import AIAssistantFloating from '@/components/safar/AIAssistantFloating';
import { LISTINGS, CATEGORIES, IMG, STATS, TESTIMONIALS, AI_PROMPT_SUGGESTIONS } from '@/lib/data';

// Kashmir seasonal images - ultra-premium iconic landmarks collection
const SEASONAL_IMAGES = [
  {
    src: 'https://images.pexels.com/photos/25786776/pexels-photo-25786776.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=2',
    alt: 'Spring in Kashmir - Indira Gandhi Tulip Garden Srinagar',
    season: 'Spring',
    emoji: '🌸',
    color: 'text-pink-500'
  },
  {
    src: 'https://images.pexels.com/photos/27108526/pexels-photo-27108526.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=2',
    alt: 'Summer in Kashmir - Dal Lake Shikara Boats',
    season: 'Summer',
    emoji: '☀️',
    color: 'text-amber-400'
  },
  {
    src: 'https://images.pexels.com/photos/14262339/pexels-photo-14262339.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=2',
    alt: 'Autumn in Kashmir - Golden Chinar Tree',
    season: 'Autumn',
    emoji: '🍂',
    color: 'text-orange-500'
  },
  {
    src: 'https://images.pexels.com/photos/32620987/pexels-photo-32620987.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=2',
    alt: 'Winter in Kashmir - Gulmarg Gondola Cable Car',
    season: 'Winter',
    emoji: '❄️',
    color: 'text-blue-400'
  }
];

const destinations = [
  { name: 'Srinagar', tag: 'Floating heritage', img: IMG.dal2, count: 248 },
  { name: 'Gulmarg', tag: 'Snow & ski capital', img: IMG.cab1, count: 142 },
  { name: 'Pahalgam', tag: 'Pine valleys', img: IMG.cot1, count: 167 },
  { name: 'Sonamarg', tag: 'Glacier escapes', img: IMG.mtn2, count: 89 },
];

const experiences = [
  { title: 'Sunset Shikara', desc: 'Glide across Dal Lake with kahwa & local stories.', img: IMG.shi1, price: 1200 },
  { title: 'Wazwan Royal Feast', desc: '7-course Kashmiri feast with cultural intro.', img: IMG.dal4, price: 2500 },
  { title: 'Gulmarg Gondola', desc: 'Phase 1 + 2 with a certified local mountaineer.', img: IMG.mtn1, price: 3800 },
  { title: 'Heritage Walk', desc: 'Old-city woodwork, mosques and bakeries tour.', img: IMG.dal3, price: 1500 },
];

// Small helper: yyyy-mm-dd for a date N days from today.
function ymdOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function App() {
  const router = useRouter();
  const [cat, setCat] = useState('all');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]); // Parallax effect
  
  // Hero search state — fully functional, drives /explore navigation
  const [where, setWhere] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const todayStr = ymdOffset(0);

  // Seasonal slideshow auto-rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % SEASONAL_IMAGES.length);
    }, 7000); // Change every 7 seconds
    return () => clearInterval(interval);
  }, []);

  const onSearch = (e) => {
    if (e) e.preventDefault();
    const qp = new URLSearchParams();
    if (where.trim()) qp.set('location', where.trim());
    if (checkIn) qp.set('checkIn', checkIn);
    if (checkOut) qp.set('checkOut', checkOut);
    if (guests && guests !== 2) qp.set('guests', String(guests));
    router.push(`/explore${qp.toString() ? '?' + qp.toString() : ''}`);
  };

  const featured = LISTINGS.filter(l => l.featured);
  const filtered = cat === 'all' ? LISTINGS : LISTINGS.filter(l => l.category === cat);

  return (
    <main className="min-h-screen bg-background">
      <Navbar transparent />

      {/* HERO with Seasonal Slideshow */}
      <section className="relative min-h-[100svh] w-full overflow-hidden">
        {/* Seasonal Background Slideshow */}
        <motion.div style={{ y: heroY }} className="absolute inset-0">
          {SEASONAL_IMAGES.map((image, index) => (
            <motion.div
              key={index}
              className={`absolute inset-0`}
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: index === currentImageIndex ? 1 : 0,
                scale: index === currentImageIndex ? 1 : 1.05
              }}
              transition={{ 
                opacity: { duration: 2, ease: "easeInOut" },
                scale: { duration: 7, ease: "linear" }
              }}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                priority={index === 0}
                sizes="100vw"
                quality={90}
                className="object-cover"
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Premium dark gradient overlay for text readability (30-40% darkness) */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,20,25,0.50)_0%,rgba(15,20,25,0.35)_35%,rgba(15,20,25,0.60)_70%,rgba(15,20,25,0.92)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,rgba(15,61,46,0.30),transparent_60%)]" />

        <div className="relative h-full container flex flex-col justify-end pt-24 md:pt-0 pb-16 md:pb-24">
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.9, ease: 'easeOut' }}
            className="max-w-3xl text-white">
            <motion.div
              key={currentImageIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-dark text-[11px] uppercase tracking-[0.22em] font-semibold"
            >
              <Sparkles className="size-3.5 text-gold" />
              Curated by locals • Trusted by travelers • {SEASONAL_IMAGES[currentImageIndex].emoji} {SEASONAL_IMAGES[currentImageIndex].season} in Kashmir
            </motion.div>
            <h1 className="font-display font-bold mt-6 text-[clamp(2.6rem,6.4vw,5.6rem)] leading-[1.02] tracking-tight text-balance drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
              Experience Kashmir<br/>Like a Local.
            </h1>
            <p className="mt-5 text-lg md:text-xl text-white/85 max-w-2xl text-balance leading-relaxed drop-shadow-[0_1px_12px_rgba(0,0,0,0.35)]">
              Discover authentic stays, local experiences, transport, guides, and unforgettable journeys across Kashmir.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button asChild size="lg" className="rounded-full bg-emerald2 hover:bg-emerald2-deep text-white shadow-[0_20px_50px_-12px_rgba(15,61,46,0.55)] hover:shadow-[0_24px_60px_-12px_rgba(15,61,46,0.7)] hover:-translate-y-0.5 transition-all px-7 h-14 font-semibold text-base">
                  <Link href="/explore">Explore Stays <ArrowRight className="ml-2 size-4" /></Link>
                </Button>
              </motion.div>
              <motion.div
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button asChild size="lg" variant="outline" className="rounded-full bg-white/[0.08] hover:bg-white/15 backdrop-blur-md text-white border-white/40 hover:border-gold hover:text-white shadow-lg transition-all px-7 h-14 font-semibold text-base">
                  <Link href="/ai-planner"><Wand2 className="mr-2 size-4 text-gold" /> Plan My Trip with AI</Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* Search Card — responsive, fully contained at all viewports */}
          <motion.form
            onSubmit={onSearch}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="mt-10 md:mt-14 glass rounded-3xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] p-3 lg:p-2 flex flex-col gap-2 lg:flex-row lg:items-stretch w-full max-w-4xl"
          >
            {/* Fields wrapper: stack on mobile, 2x2 grid on sm-tablet, inline row on lg+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-1 lg:items-stretch gap-2 lg:gap-0 min-w-0">
              <label className="flex items-center gap-3 px-3 py-2.5 lg:px-4 lg:py-3 rounded-2xl hover:bg-white transition cursor-text min-w-0 lg:flex-1">
                <div className="size-9 rounded-xl bg-emerald2/10 grid place-items-center shrink-0"><MapPin className="size-4 text-emerald2" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-charcoal">Where</div>
                  <input
                    type="text"
                    value={where}
                    onChange={(e) => setWhere(e.target.value)}
                    placeholder="Srinagar, Gulmarg..."
                    className="w-full bg-transparent text-sm text-charcoal placeholder:text-charcoal/60 outline-none border-0 p-0 truncate"
                  />
                </div>
              </label>
              <div className="hidden lg:block self-center h-10 w-px bg-border/80 shrink-0" />
              <label className="flex items-center gap-3 px-3 py-2.5 lg:px-4 lg:py-3 rounded-2xl hover:bg-white transition cursor-pointer min-w-0 lg:flex-1">
                <div className="size-9 rounded-xl bg-emerald2/10 grid place-items-center shrink-0"><CalendarRange className="size-4 text-emerald2" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-charcoal">Check-in</div>
                  <input
                    type="date"
                    min={todayStr}
                    value={checkIn}
                    onChange={(e) => { setCheckIn(e.target.value); if (checkOut && e.target.value && checkOut <= e.target.value) setCheckOut(''); }}
                    className="w-full bg-transparent text-sm text-charcoal outline-none border-0 p-0 [color-scheme:light]"
                  />
                </div>
              </label>
              <div className="hidden lg:block self-center h-10 w-px bg-border/80 shrink-0" />
              <label className="flex items-center gap-3 px-3 py-2.5 lg:px-4 lg:py-3 rounded-2xl hover:bg-white transition cursor-pointer min-w-0 lg:flex-1">
                <div className="size-9 rounded-xl bg-emerald2/10 grid place-items-center shrink-0"><CalendarRange className="size-4 text-emerald2" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-charcoal">Check-out</div>
                  <input
                    type="date"
                    min={checkIn || todayStr}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full bg-transparent text-sm text-charcoal outline-none border-0 p-0 [color-scheme:light]"
                  />
                </div>
              </label>
              <div className="hidden lg:block self-center h-10 w-px bg-border/80 shrink-0" />
              <div className="flex items-center gap-3 px-3 py-2.5 lg:px-4 lg:py-3 rounded-2xl hover:bg-white transition min-w-0 lg:flex-1">
                <div className="size-9 rounded-xl bg-emerald2/10 grid place-items-center shrink-0"><Users className="size-4 text-emerald2" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-charcoal">Guests</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button type="button" onClick={() => setGuests(Math.max(1, guests - 1))} aria-label="Decrease guests" className="size-6 rounded-full border border-charcoal/30 text-charcoal text-sm grid place-items-center hover:bg-charcoal hover:text-white transition shrink-0">−</button>
                    <span className="text-sm font-semibold text-charcoal whitespace-nowrap">{guests} {guests === 1 ? 'guest' : 'guests'}</span>
                    <button type="button" onClick={() => setGuests(Math.min(20, guests + 1))} aria-label="Increase guests" className="size-6 rounded-full border border-charcoal/30 text-charcoal text-sm grid place-items-center hover:bg-charcoal hover:text-white transition shrink-0">+</button>
                  </div>
                </div>
              </div>
            </div>
            <Button
              type="submit"
              size="lg"
              className="rounded-2xl bg-emerald2 hover:bg-emerald2-deep h-12 lg:h-auto lg:min-h-14 px-5 lg:px-7 font-semibold shadow-lg shadow-emerald2/30 shrink-0 w-full lg:w-auto"
            >
              <Search className="size-5 mr-2" /> <span>Search</span>
            </Button>
          </motion.form>

          {/* Trust strip */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 text-white/90 text-[13px]">
            {[
              {t:'Verified Hosts'},
              {t:'Secure Payments'},
              {t:'Free Cancellation'},
              {t:'Local Support'},
              {t:'Real Reviews'},
            ].map((tr) => (
              <div key={tr.t} className="flex items-center gap-2">
                <div className="size-5 rounded-full bg-gold/20 ring-1 ring-gold/50 grid place-items-center backdrop-blur-sm">
                  <Check className="size-3 text-gold" strokeWidth={3} />
                </div>
                <span className="font-medium drop-shadow">{tr.t}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-12 border-b">
        <div className="container grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i*0.05 }}
              className="text-center md:text-left">
              <div className="font-display text-3xl md:text-4xl font-bold gradient-text-emerald">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CATEGORIES + FEATURED */}
      <section className="py-20">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="text-emerald2 text-xs uppercase tracking-[0.18em] font-semibold">Curated Selection</div>
              <h2 className="font-display text-3xl md:text-5xl font-bold mt-2 text-balance">Stays travelers can’t stop talking about</h2>
            </div>
            <Link href="/explore" className="text-sm font-semibold text-charcoal inline-flex items-center gap-1 hover:gap-2 transition-all">View all <ChevronRight className="size-4" /></Link>
          </div>
          <CategoryPills value={cat} onChange={setCat} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {filtered.slice(0, 8).map((l, i) => <PropertyCard key={l.id} item={l} index={i} priority={i < 4} />)}
          </div>
        </div>
      </section>

      {/* DESTINATIONS */}
      <section className="py-20 bg-secondary/50">
        <div className="container">
          <div className="max-w-2xl mb-10">
            <div className="text-emerald2 text-xs uppercase tracking-[0.18em] font-semibold">Destinations</div>
            <h2 className="font-display text-3xl md:text-5xl font-bold mt-2 text-balance">Where the valley calls you next</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {destinations.map((d, i) => (
              <motion.div key={d.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.55, delay: i*0.06 }}
                className="group relative aspect-[4/5] rounded-3xl overflow-hidden cursor-pointer">
                <Image src={d.img} alt={d.name} fill loading="lazy" quality={60}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/70">{d.tag}</div>
                  <div className="font-display text-2xl font-bold mt-1">{d.name}</div>
                  <div className="mt-1 text-xs text-white/75">{d.count} stays · from ₹2,900</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI PROMO */}
      <section className="py-24 relative overflow-hidden">
        <div className="aurora" />
        <div className="container relative grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald2 text-xs uppercase tracking-[0.18em] font-semibold"><Wand2 className="size-3.5" /> Safar AI · Concierge</div>
            <h2 className="font-display text-4xl md:text-6xl font-bold mt-4 leading-[1.05] text-balance">Your personal Kashmir <span className="gradient-text-emerald">trip planner</span>, in seconds.</h2>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">Compare stays, choose transport, build itineraries and estimate budgets — powered by locals + AI. Try a prompt:</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {AI_PROMPT_SUGGESTIONS.slice(0,3).map((p) => (
                <Link key={p} href="/ai-planner" className="text-sm px-4 py-2.5 rounded-full bg-white border hover:border-emerald2 hover:text-emerald2 transition">{p}</Link>
              ))}
            </div>
            <div className="mt-8 flex gap-3">
              <Button asChild size="lg" className="rounded-full bg-gradient-emerald hover:opacity-95 px-7 h-12 font-semibold">
                <Link href="/ai-planner"><Sparkles className="size-4 mr-2" /> Try AI Planner</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-7 h-12 font-semibold">
                <Link href="/explore">Browse Listings</Link>
              </Button>
            </div>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
            className="relative">
            <div className="absolute -inset-6 bg-gradient-to-tr from-emerald-200/30 via-gold/20 to-transparent rounded-[3rem] blur-2xl" />
            <div className="relative rounded-3xl bg-white border shadow-2xl overflow-hidden">
              <div className="px-5 py-4 bg-gradient-emerald text-white flex items-center gap-3">
                <div className="size-9 rounded-xl bg-white/15 grid place-items-center"><Wand2 className="size-5" /></div>
                <div>
                  <div className="font-semibold">Safar AI</div>
                  <div className="text-[11px] text-white/75">Live demo · 5-day Kashmir honeymoon</div>
                </div>
              </div>
              <div className="p-5 space-y-3 bg-secondary/30">
                <div className="flex justify-end"><div className="max-w-[80%] bg-charcoal text-white text-sm rounded-2xl rounded-br-md px-4 py-3">Plan a 5-day honeymoon under ₹40,000</div></div>
                <div className="flex justify-start"><div className="max-w-[88%] bg-white border text-sm rounded-2xl rounded-bl-md px-4 py-3 leading-relaxed">
                  <span className="font-semibold text-emerald2">Suggested itinerary</span><br/>• Day 1–2 — Royal Cedar Houseboat (Dal Lake)<br/>• Day 3 — Pinepeak Snow Cabin (Gulmarg)<br/>• Day 4–5 — Apple Orchard Cottage (Pahalgam)<br/><span className="text-muted-foreground text-xs">Total est. ₹38,400 · incl. transport + 1 cultural dinner</span>
                </div></div>
                <div className="grid grid-cols-3 gap-2">
                  {[IMG.hb1, IMG.cab1, IMG.cot1].map((src,i)=>(
                    <Image key={i} src={src} alt="" width={200} height={200} loading="lazy" quality={65}
                      sizes="120px" className="aspect-square object-cover rounded-xl w-full h-auto"/>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* EXPERIENCES */}
      <section className="py-20">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="text-emerald2 text-xs uppercase tracking-[0.18em] font-semibold">Local Experiences</div>
              <h2 className="font-display text-3xl md:text-5xl font-bold mt-2 text-balance">Beyond the stay — the soul of Kashmir</h2>
            </div>
            <Link href="/explore" className="text-sm font-semibold inline-flex items-center gap-1 hover:gap-2 transition-all">View all <ChevronRight className="size-4" /></Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {experiences.map((e, i) => (
              <div key={e.title} className="group relative aspect-[3/4] rounded-3xl overflow-hidden">
                <Image src={e.img} alt={e.title} fill loading="lazy" quality={55}
                  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <div className="font-display text-xl font-bold">{e.title}</div>
                  <div className="text-xs text-white/80 mt-1 line-clamp-2">{e.desc}</div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm font-semibold">from ₹{e.price.toLocaleString('en-IN')}</div>
                    <div className="size-8 rounded-full bg-white text-charcoal grid place-items-center group-hover:bg-gold transition"><ArrowRight className="size-4" /></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOST CTA */}
      <section className="py-24">
        <div className="container">
          <div className="relative overflow-hidden rounded-[2.5rem] p-10 md:p-16 bg-charcoal text-white">
            <Image src={IMG.mtn4} alt="" fill loading="lazy" quality={60}
              sizes="100vw" className="object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/85 to-charcoal/30" />
            <div className="relative max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-dark text-xs uppercase tracking-[0.18em] font-semibold text-white"><Mountain className="size-3.5" /> For Hosts</div>
              <h2 className="font-display text-4xl md:text-6xl font-bold mt-4 leading-[1.05] text-balance">List your home, cabin or experience — reach the world.</h2>
              <p className="mt-4 text-white/80 max-w-xl">Earn in your own valley. Upload photos, set prices, manage bookings and grow with our analytics dashboard.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full bg-white text-charcoal hover:bg-white/90 px-7 h-12 font-semibold"><Link href="/add-listing">Become a Host</Link></Button>
                <Button asChild size="lg" variant="outline" className="rounded-full bg-transparent text-white border-white/40 hover:bg-white/10 px-7 h-12 font-semibold"><Link href="/dashboard/host">Host Dashboard <ArrowRight className="size-4 ml-2" /></Link></Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 bg-secondary/50">
        <div className="container">
          <div className="max-w-2xl mb-10">
            <div className="text-emerald2 text-xs uppercase tracking-[0.18em] font-semibold">Loved by Travelers</div>
            <h2 className="font-display text-3xl md:text-5xl font-bold mt-2 text-balance">Stories from the valley</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i*0.07 }}
                className="bg-white rounded-3xl p-7 border shadow-sm">
                <div className="flex items-center gap-1 text-gold">{Array.from({length: t.rating}).map((_,j)=><Star key={j} className="size-4 fill-gold" />)}</div>
                <p className="mt-4 text-charcoal/85 leading-relaxed">“{t.text}”</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="size-10 rounded-full bg-gradient-emerald grid place-items-center text-white font-semibold">{t.name.charAt(0)}</div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.city}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <AIAssistantFloating />
    </main>
  );
}

export default App;
