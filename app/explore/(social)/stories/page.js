'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Camera, Play, BookOpen, Heart, MessageCircle, Bookmark, MapPin, Sparkles } from 'lucide-react';
import AuroraBg from '@/components/explore/AuroraBg';
import BadgeChip from '@/components/explore/BadgeChip';
import { IMG } from '@/lib/data';

const TABS = [
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'videos', label: 'Videos', icon: Play },
  { id: 'journals', label: 'Journals', icon: BookOpen },
  { id: 'collections', label: 'Collections', icon: Bookmark },
];

const PHOTOS = [
  { id: 'ph1', user: 'Aanya', avatar: 'https://i.pravatar.cc/64?img=45', loc: 'Dal Lake', img: IMG.shi1, likes: 421 },
  { id: 'ph2', user: 'Rohan', avatar: 'https://i.pravatar.cc/64?img=13', loc: 'Gulmarg', img: IMG.mtn1, likes: 812 },
  { id: 'ph3', user: 'Saira', avatar: 'https://i.pravatar.cc/64?img=32', loc: 'Pahalgam', img: IMG.cot2, likes: 278 },
  { id: 'ph4', user: 'Kabir', avatar: 'https://i.pravatar.cc/64?img=7', loc: 'Nishat Bagh', img: IMG.dal3, likes: 654 },
  { id: 'ph5', user: 'Priya', avatar: 'https://i.pravatar.cc/64?img=44', loc: 'Sonamarg', img: IMG.mtn2, likes: 189 },
  { id: 'ph6', user: 'Vikram', avatar: 'https://i.pravatar.cc/64?img=15', loc: 'Old Srinagar', img: IMG.hb1, likes: 512 },
  { id: 'ph7', user: 'Anjali', avatar: 'https://i.pravatar.cc/64?img=47', loc: 'Nigeen Lake', img: IMG.hb2, likes: 334 },
  { id: 'ph8', user: 'Zoya', avatar: 'https://i.pravatar.cc/64?img=48', loc: 'Aru Valley', img: IMG.cot1, likes: 723 },
];

const JOURNALS = [
  { title: 'Seven mornings on a shikara', author: 'Aanya Sharma', excerpt: 'The valley wakes up differently. First a mist, then a paddle, then the kettle whistles on the boat next door…', img: IMG.shi1, minutes: 6 },
  { title: 'How I learned to ski at Gulmarg', author: 'Rohan Iyer', excerpt: 'Phase 1 was the promise. Phase 2 was the confession. Somewhere between them, I fell in love with winter…', img: IMG.mtn1, minutes: 9 },
  { title: 'Kashmir, but with two toddlers', author: 'Rohit K.', excerpt: 'Everyone said don’t. We did anyway. Here’s the honest guide with the meltdowns and the miracles.', img: IMG.cot2, minutes: 12 },
];

const COLLECTIONS = [
  { title: 'Golden Autumn 2026', count: 24, cover: IMG.cot1 },
  { title: 'Snow escapes', count: 18, cover: IMG.mtn1 },
  { title: 'Boats & backwaters', count: 32, cover: IMG.hb1 },
  { title: 'Old Srinagar walks', count: 15, cover: IMG.dal3 },
];

export default function ExploreStories() {
  const [tab, setTab] = useState('photos');
  return (
    <div className="relative">
      <section className="relative overflow-hidden pt-14 md:pt-20 pb-8">
        <AuroraBg />
        <div className="relative e-container e-fade-in">
          <div className="e-chip"><Camera className="size-3 text-emerald-300" /> Stories</div>
          <h1 className="display font-bold mt-4 text-[clamp(2rem,5.6vw,4rem)] leading-tight max-w-3xl">Moments that <span className="e-grad-text">carried them home.</span></h1>
          <p className="mt-4 text-white/75 max-w-2xl">Photos, videos, journals and collections from every corner of the valley.</p>
        </div>
      </section>

      <section className="relative e-container mb-6">
        <div className="flex items-center gap-2 overflow-x-auto e-scroll-x pb-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition border ${tab===id ? 'e-btn-primary border-transparent' : 'bg-white/[0.04] border-white/10 text-white/75 hover:bg-white/[0.08] hover:text-white'}`}>
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
      </section>

      <section className="relative e-container pb-24">
        {tab === 'photos' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {PHOTOS.map((p, i) => (
              <div key={p.id} className="relative aspect-[3/4] rounded-2xl overflow-hidden group cursor-pointer e-lift-in" style={{ animationDelay: `${i*40}ms` }}>
                <Image src={p.img} alt="" fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                  <div className="flex items-center gap-2">
                    <Image src={p.avatar} alt="" width={22} height={22} className="rounded-full ring-1 ring-white/25" />
                    <div className="text-[11px] font-medium truncate">{p.user}</div>
                  </div>
                  <div className="text-[10px] text-white/70 mt-0.5"><MapPin className="inline size-2.5" /> {p.loc} · <Heart className="inline size-2.5" /> {p.likes}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'videos' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PHOTOS.slice(0, 6).map(p => (
              <div key={p.id} className="relative aspect-video rounded-2xl overflow-hidden group">
                <Image src={p.img} alt="" fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover" />
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute inset-0 grid place-items-center"><div className="size-14 rounded-full bg-white/95 grid place-items-center shadow-2xl"><Play className="size-5 text-[#06080f] ml-0.5" fill="#06080f" /></div></div>
                <div className="absolute top-3 left-3"><BadgeChip type="live">Reel</BadgeChip></div>
                <div className="absolute inset-x-0 bottom-0 p-4 text-white"><div className="text-sm font-semibold">{p.loc} in 60 seconds</div><div className="text-[11px] text-white/70">by {p.user}</div></div>
              </div>
            ))}
          </div>
        )}
        {tab === 'journals' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {JOURNALS.map((j, i) => (
              <article key={i} className="e-card">
                <div className="e-card-media"><Image src={j.img} alt={j.title} fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover" /></div>
                <div className="p-5">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">{j.minutes} min read</div>
                  <h3 className="font-semibold mt-1">{j.title}</h3>
                  <p className="text-sm text-white/70 mt-2 leading-relaxed line-clamp-3">{j.excerpt}</p>
                  <div className="text-[11px] text-white/50 mt-3">by {j.author}</div>
                </div>
              </article>
            ))}
          </div>
        )}
        {tab === 'collections' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLLECTIONS.map(c => (
              <div key={c.title} className="e-card group cursor-pointer">
                <div className="relative aspect-square overflow-hidden">
                  <Image src={c.cover} alt={c.title} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <div className="font-semibold">{c.title}</div>
                    <div className="text-[11px] text-white/70 mt-0.5">{c.count} moments</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
