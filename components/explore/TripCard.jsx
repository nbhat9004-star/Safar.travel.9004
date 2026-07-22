'use client';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Bookmark, BadgeCheck, ShieldCheck, User, UserCheck, Share2 } from 'lucide-react';
import { TRIP_TYPE_COLORS } from '@/lib/trips-data';

export default function TripCard({ trip }) {
  const badgeCls = TRIP_TYPE_COLORS[trip.type] || 'bg-slate-800 text-white';
  const modeBadge = trip.mode === 'safar'
    ? { cls: 'bg-emerald-500 text-white', icon: ShieldCheck, label: 'Verified by Safar' }
    : trip.mode === 'local'
    ? { cls: 'bg-amber-500 text-white', icon: UserCheck, label: 'Local Expert' }
    : { cls: 'bg-violet-600 text-white', icon: null, label: 'Self Hosted' };
  const ModeIcon = modeBadge.icon;

  return (
    <article className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-[0_20px_40px_-12px_rgba(15,23,42,0.15)] hover:-translate-y-1 active:scale-[0.99] transition-all duration-300 flex flex-col">
      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
        <Image
          src={trip.cover}
          alt={trip.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover group-hover:scale-[1.06] transition-transform duration-[600ms] ease-out"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide shadow-sm ${badgeCls}`}>{trip.type}</span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold bg-white/95 backdrop-blur text-slate-700 shadow-sm">{trip.dateRange}</span>
        </div>
        <div className="absolute bottom-3 left-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold shadow-sm ${modeBadge.cls}`}>
            {ModeIcon && <ModeIcon className="size-3" />} {modeBadge.label}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-display font-bold text-[15.5px] text-slate-900 line-clamp-1 tracking-tight">{trip.title}</h3>
        <div className="mt-1 flex items-center gap-1 text-[12px] text-slate-500">
          <MapPin className="size-3.5 shrink-0" /> <span className="truncate">{trip.destination}</span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="size-6 rounded-full bg-slate-200 overflow-hidden shrink-0 grid place-items-center ring-1 ring-slate-100">
            {trip.hostAvatar ? (
              <Image src={trip.hostAvatar} alt={trip.hostName} width={24} height={24} className="object-cover size-full" unoptimized />
            ) : (
              <User className="size-3 text-slate-500" />
            )}
          </div>
          <span className="text-[12px] text-slate-500 truncate">Hosted by <span className="font-semibold text-slate-800">{trip.hostName}</span></span>
          {trip.hostVerified && <BadgeCheck className="size-3.5 text-violet-600 shrink-0" />}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex -space-x-1.5">
              {[0,1,2].map((i) => (
                <div key={i} className="size-6 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                  <Image src={`https://i.pravatar.cc/48?img=${(i+3+trip.id.charCodeAt(0)%40)}`} alt="member" width={24} height={24} className="object-cover" unoptimized />
                </div>
              ))}
            </div>
            <span className="ml-1.5 text-[11px] font-semibold text-slate-500">+{Math.max(trip.joined - 3, 0)}</span>
          </div>
          <span className="text-[12px] font-semibold text-slate-800 tabular-nums">
            {trip.joined} / {trip.capacity} joined
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 mt-auto pt-1">
          <Link href={`/explore/trip/${trip.id}`} className="flex-1 text-center rounded-xl bg-violet-50 hover:bg-violet-100 active:scale-[0.98] text-violet-700 text-[13px] font-semibold py-2.5 transition">Request to Join</Link>
          <button className="size-10 grid place-items-center rounded-xl bg-violet-50 hover:bg-violet-100 active:scale-95 text-violet-600 transition" aria-label="Save">
            <Bookmark className="size-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
