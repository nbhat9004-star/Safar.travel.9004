'use client';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Bookmark, BadgeCheck, ShieldCheck, User } from 'lucide-react';
import { TRIP_TYPE_COLORS } from '@/lib/trips-data';

export default function TripCard({ trip, compact = false }) {
  const badgeCls = TRIP_TYPE_COLORS[trip.type] || 'bg-slate-800 text-white';
  return (
    <article className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group">
      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
        <Image
          src={trip.cover}
          alt={trip.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          unoptimized
        />
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide ${badgeCls}`}>{trip.type}</span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold bg-white/90 backdrop-blur text-slate-700">{trip.dateRange}</span>
        </div>
        {trip.mode === 'safar' && (
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-emerald-500 text-white">
              <ShieldCheck className="size-3" /> Verified by Safar
            </span>
          </div>
        )}
        {trip.mode === 'self' && (
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-violet-600 text-white">
              Self Hosted
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display font-bold text-[15px] text-slate-900 line-clamp-1">{trip.title}</h3>
        <div className="mt-1 flex items-center gap-1 text-[12px] text-slate-500">
          <MapPin className="size-3.5" /> {trip.destination}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="size-6 rounded-full bg-slate-200 overflow-hidden shrink-0 grid place-items-center">
            {trip.hostAvatar ? (
              <Image src={trip.hostAvatar} alt={trip.hostName} width={24} height={24} className="object-cover size-full" unoptimized />
            ) : (
              <User className="size-3 text-slate-500" />
            )}
          </div>
          <span className="text-[12px] text-slate-500">Hosted by <span className="font-semibold text-slate-800">{trip.hostName}</span></span>
          {trip.hostVerified && <BadgeCheck className="size-3.5 text-violet-600" />}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex -space-x-1.5">
              {[0,1,2].map((i) => (
                <div key={i} className="size-6 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                  <Image src={`https://i.pravatar.cc/48?img=${(i+3+parseInt(trip.id.charCodeAt(0))%40)}`} alt="member" width={24} height={24} className="object-cover" unoptimized />
                </div>
              ))}
            </div>
            <span className="ml-1.5 text-[11px] font-semibold text-slate-500">+{Math.max(trip.joined - 3, 0)}</span>
          </div>
          <span className="text-[12px] font-semibold text-slate-800">
            {trip.joined} / {trip.capacity} joined
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Link href={`/explore/trip/${trip.id}`} className="flex-1 text-center rounded-lg border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700 text-[13px] font-semibold py-2 transition">Request to Join</Link>
          <button className="size-9 grid place-items-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600" aria-label="Save">
            <Bookmark className="size-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
