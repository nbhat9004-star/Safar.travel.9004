'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Star, MapPin } from 'lucide-react';
import { useState } from 'react';

export default function PropertyCard({ item, index = 0 }) {
  const [liked, setLiked] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const gallery = item.gallery || [item.image];
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: Math.min(index, 6) * 0.05, ease: 'easeOut' }}
      className="group"
    >
      <Link href={`/property/${item.id}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-secondary">
          {gallery.map((g, i) => (
            <img key={i} src={g} alt={item.title} loading="lazy"
              className={`absolute inset-0 size-full object-cover transition-all duration-700 ${i === imgIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-105'} group-hover:scale-[1.06]`} />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/15" />

          {item.badge && (
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-white/90 text-charcoal shadow-md backdrop-blur">{item.badge}</div>
          )}
          <button onClick={(e) => { e.preventDefault(); setLiked(!liked); }} aria-label="Wishlist"
            className="absolute top-3 right-3 size-9 grid place-items-center rounded-full bg-white/85 hover:bg-white transition shadow-md backdrop-blur">
            <Heart className={`size-4 transition ${liked ? 'fill-rose-500 text-rose-500' : 'text-charcoal'}`} />
          </button>

          {gallery.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {gallery.slice(0,4).map((_, i) => (
                <button key={i} aria-label={`img ${i+1}`} onClick={(e)=>{e.preventDefault();setImgIdx(i);}}
                  className={`size-1.5 rounded-full transition ${i===imgIdx ? 'bg-white w-4' : 'bg-white/55'}`} />
              ))}
            </div>
          )}

          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-charcoal/80 text-white backdrop-blur flex items-center gap-1">
            <Star className="size-3 fill-gold text-gold" /> {item.rating}
          </div>
        </div>

        <div className="pt-3.5 px-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display font-semibold text-[15px] leading-snug line-clamp-1 group-hover:text-emerald2 transition">{item.title}</h3>
            <div className="text-xs text-muted-foreground whitespace-nowrap">{item.reviews} reviews</div>
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" /> <span className="line-clamp-1">{item.location}</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="font-display font-bold text-charcoal text-lg">₹{item.price.toLocaleString('en-IN')}</span>
              <span className="text-xs text-muted-foreground ml-1">/ {item.duration ? item.duration : 'night'}</span>
            </div>
            {item.host?.superhost && <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald2 bg-emerald-50 px-2 py-0.5 rounded-full">Superhost</span>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
