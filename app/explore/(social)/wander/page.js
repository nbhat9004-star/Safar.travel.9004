'use client';
import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, X, Bookmark, Share2, ShoppingBag, MapPin, Sparkles, Coffee, Camera, Mountain, TreePine, Utensils, ArrowRight } from 'lucide-react';
import AuroraBg from '@/components/explore/AuroraBg';
import { IMG } from '@/lib/data';

const CATS = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'gem', label: 'Hidden gems', icon: MapPin },
  { id: 'cafe', label: 'Cafes', icon: Coffee },
  { id: 'exp', label: 'Experiences', icon: Camera },
  { id: 'food', label: 'Restaurants', icon: Utensils },
  { id: 'view', label: 'Viewpoints', icon: Mountain },
  { id: 'camp', label: 'Camping', icon: TreePine },
];

const DECK = [
  { id: 'w1', title: 'Char Chinar Island', tag: 'Hidden gem', cat: 'gem', place: 'Dal Lake', img: IMG.dal2, blurb: 'A tiny island crowned with four chinar trees. Best at golden hour.' },
  { id: 'w2', title: 'Mughal Darbar Rooftop', tag: 'Cafe', cat: 'cafe', place: 'Srinagar', img: IMG.dal3, blurb: 'Kahwa + old-city skyline. Locals-favourite.' },
  { id: 'w3', title: 'Betaab Valley loop', tag: 'Viewpoint', cat: 'view', place: 'Pahalgam', img: IMG.cot2, blurb: 'Ridge walk with 360° valley views — skip the crowds by walking east.' },
  { id: 'w4', title: 'Aru Meadow campsite', tag: 'Camping', cat: 'camp', place: 'Pahalgam', img: IMG.mtn2, blurb: 'Riverside pitch, milky way sky, ~₹1,800/night with tent.' },
  { id: 'w5', title: 'Ahdoos Wazwan', tag: 'Restaurant', cat: 'food', place: 'Lal Chowk', img: IMG.dal4, blurb: '1918-era institution. The rista is the reason.' },
  { id: 'w6', title: 'Sunrise Shikara', tag: 'Experience', cat: 'exp', place: 'Nigeen Lake', img: IMG.shi1, blurb: '5:30 AM paddle. Colder, quieter, unforgettable.' },
  { id: 'w7', title: 'Doodhpathri meadow', tag: 'Hidden gem', cat: 'gem', place: 'Budgam', img: IMG.mtn1, blurb: 'The “Valley of Milk”. Weekday visits recommended.' },
  { id: 'w8', title: 'Chai Jaai (book cafe)', tag: 'Cafe', cat: 'cafe', place: 'Old Srinagar', img: IMG.hb1, blurb: 'Restored heritage building, hyperlocal library.' },
];

export default function Wander() {
  const [cat, setCat] = useState('all');
  const [idx, setIdx] = useState(0);
  const [saved, setSaved] = useState(new Set());
  const [wish, setWish] = useState(new Set());
  const filtered = cat === 'all' ? DECK : DECK.filter(d => d.cat === cat);
  const card = filtered[idx % filtered.length];
  const startX = useRef(null);
  const [dx, setDx] = useState(0);

  const advance = (dir) => { setIdx(i => (i + 1) % filtered.length); setDx(0); };
  const onSave = () => { if (!card) return; setSaved(s => new Set(s).add(card.id)); advance(1); };
  const onWish = () => { if (!card) return; setWish(s => new Set(s).add(card.id)); advance(1); };
  const onSkip = () => advance(-1);

  return (
    <div className="relative">
      <section className="relative overflow-hidden pt-14 md:pt-20 pb-6">
        <AuroraBg />
        <div className="relative max-w-5xl mx-auto px-4 md:px-8 e-fade-in">
          <div className="e-chip"><Sparkles className="size-3 text-emerald-300" /> WanderMatch</div>
          <h1 className="display font-bold mt-4 text-[clamp(1.8rem,4.6vw,3.4rem)] leading-tight max-w-2xl">Swipe your way to the <span className="e-grad-text">next best place.</span></h1>
          <p className="mt-3 text-white/70 max-w-xl text-sm md:text-base">Skip, save, wishlist or open the Marketplace — one card at a time.</p>
        </div>
      </section>

      <section className="relative max-w-5xl mx-auto px-4 md:px-8 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto e-scroll-x pb-1">
          {CATS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setCat(id); setIdx(0); }} className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition border ${cat===id ? 'e-btn-primary border-transparent' : 'bg-white/[0.04] border-white/10 text-white/75 hover:bg-white/[0.08] hover:text-white'}`}>
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
      </section>

      <section className="relative max-w-md mx-auto px-4 md:px-8 pb-24">
        {card ? (
          <div
            className="relative rounded-3xl overflow-hidden e-glass e-lift-in select-none"
            style={{ transform: `translateX(${dx}px) rotate(${dx*0.04}deg)`, transition: dx===0 ? 'transform .3s ease' : 'none' }}
            onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
            onTouchMove={(e) => { if (startX.current!=null) setDx(e.touches[0].clientX - startX.current); }}
            onTouchEnd={() => { if (dx > 80) onWish(); else if (dx < -80) onSkip(); else setDx(0); startX.current = null; }}
            onMouseDown={(e) => { startX.current = e.clientX; }}
            onMouseMove={(e) => { if (startX.current!=null) setDx(e.clientX - startX.current); }}
            onMouseUp={() => { if (dx > 80) onWish(); else if (dx < -80) onSkip(); else setDx(0); startX.current = null; }}
            onMouseLeave={() => { startX.current = null; setDx(0); }}
          >
            <div className="relative aspect-[3/4]">
              <Image src={card.img} alt={card.title} fill sizes="(min-width:768px) 448px, 100vw" className="object-cover pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              <div className="absolute top-4 left-4 e-chip">{card.tag}</div>
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/70"><MapPin className="inline size-3" /> {card.place}</div>
                <h2 className="display text-2xl md:text-3xl font-bold mt-1">{card.title}</h2>
                <p className="mt-2 text-sm text-white/85 leading-relaxed">{card.blurb}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 p-4 bg-black/40">
              <button onClick={onSkip} aria-label="Skip" className="size-12 rounded-full bg-white/8 border border-white/20 grid place-items-center hover:bg-white/12 transition"><X className="size-5 text-white" /></button>
              <button onClick={onSave} aria-label="Save" className="size-12 rounded-full bg-white/8 border border-white/20 grid place-items-center hover:bg-emerald-400/25 hover:border-emerald-300 transition"><Bookmark className={`size-5 ${saved.has(card.id) ? 'fill-emerald-300 text-emerald-300' : 'text-white'}`} /></button>
              <button onClick={onWish} aria-label="Wishlist" className="size-14 rounded-full e-btn-primary grid place-items-center"><Heart className={`size-6 ${wish.has(card.id) ? 'fill-current' : ''}`} /></button>
              <Link href={`/explore?location=${encodeURIComponent(card.place)}`} aria-label="Open Marketplace" className="size-12 rounded-full bg-white/8 border border-white/20 grid place-items-center hover:bg-white/12 transition"><ShoppingBag className="size-5 text-white" /></Link>
              <button onClick={() => { if (navigator?.share) navigator.share({ title: card.title, text: card.blurb }); }} aria-label="Share" className="size-12 rounded-full bg-white/8 border border-white/20 grid place-items-center hover:bg-white/12 transition"><Share2 className="size-5 text-white" /></button>
            </div>
          </div>
        ) : (
          <div className="e-glass rounded-3xl p-8 text-center text-white/70">No more cards — <button onClick={() => setIdx(0)} className="e-grad-text font-semibold">restart</button>.</div>
        )}
        <div className="mt-4 text-center text-xs text-white/50">Swipe left to skip • right to wishlist • {saved.size} saved • {wish.size} wishlisted</div>
      </section>
    </div>
  );
}
