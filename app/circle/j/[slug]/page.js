'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import dynamic from 'next/dynamic';
import CircleNav from '@/components/circle/CircleNav';
import { circleApi, themeLabel, formatINR, signInHref } from '@/lib/circle-api';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import {
  MapPin, CalendarRange, Users, Star, Sparkles, Wallet, Share2, ArrowRight, ShieldCheck,
  Zap, Eye, Edit3, Trash2, Globe, Lock, Send, ExternalLink, ChevronRight, Circle,
  Check, X, LogOut, Loader2, DoorClosed, Settings
} from 'lucide-react';

// PERF: ShareSheet is only mounted when user taps "Share journey" — split into
// its own chunk so the initial preview bundle is smaller.
const ShareSheet = dynamic(() => import('@/components/circle/ShareSheet'), { ssr: false });

export default function JourneyPreview() {
  const params = useParams();
  const slug = params?.slug;
  const router = useRouter();
  const { user } = useAuth();

  const [j, setJ] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [origin, setOrigin] = useState('');

  // Module 2 — Collaboration state
  const [memberInfo, setMemberInfo] = useState(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [joinSeats, setJoinSeats] = useState(1);
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => { if (typeof window !== 'undefined') setOrigin(window.location.origin); }, []);

  const loadMembers = (jid) => {
    if (!jid) return;
    circleApi.getMembers(jid)
      .then(r => setMemberInfo(r))
      .catch(() => setMemberInfo(null));
  };

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    circleApi.getBySlug(slug)
      .then(r => { setJ(r.journey); loadMembers(r.journey?.id); })
      .catch(() => setJ(null))
      .finally(() => setLoading(false));
  }, [slug]);

  // Init leaflet map when journey loaded and script ready
  const [leafletReady, setLeafletReady] = useState(false);
  useEffect(() => {
    if (!leafletReady || !j?.destination?.lat) return;
    if (typeof window === 'undefined') return;
    const L = window.L;
    if (!L) return;
    const el = document.getElementById('journey-map');
    if (!el || el.dataset.inited) return;
    el.dataset.inited = '1';
    const map = L.map(el, { zoomControl: false, attributionControl: false, scrollWheelZoom: false }).setView([j.destination.lat, j.destination.lng], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);
    const icon = L.divIcon({
      className: 'circle-map-pin',
      html: '<div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(120deg,#6ee7b7,#a78bfa);box-shadow:0 0 0 8px rgba(167,139,250,0.25);border:2px solid white;"></div>',
      iconSize: [26, 26], iconAnchor: [13, 13],
    });
    L.marker([j.destination.lat, j.destination.lng], { icon }).addTo(map);
  }, [leafletReady, j]);

  if (loading) {
    return (
      <main className="min-h-screen text-white pt-24">
        <CircleNav />
        <div className="max-w-5xl mx-auto px-5 mt-8">
          <div className="aspect-[16/8] rounded-3xl circle-glass animate-pulse" />
          <div className="grid md:grid-cols-3 gap-5 mt-6">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 rounded-2xl circle-glass animate-pulse" />)}
          </div>
        </div>
      </main>
    );
  }

  if (!j) {
    return (
      <main className="min-h-screen text-white pt-24">
        <CircleNav />
        <div className="max-w-lg mx-auto px-5 pt-20 text-center circle-glass circle-card p-10">
          <div className="text-5xl">🧳</div>
          <div className="display text-2xl font-bold mt-3">Journey not found</div>
          <div className="text-white/60 text-sm mt-2">It may be private, deleted, or the link is wrong.</div>
          <Link href="/circle/discover" className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full circle-btn-primary text-sm font-semibold">
            Discover journeys <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>
    );
  }

  const th = themeLabel(j.theme);
  const isOwner = user && user.id === j.curatorId;
  const url = origin + `/circle/j/${j.slug}`;

  const doDelete = async () => {
    if (!confirm('Delete this journey? This cannot be undone.')) return;
    try { await circleApi.deleteJourney(j.id); toast.success('Journey deleted'); router.push('/circle/studio'); }
    catch (e) { toast.error(e.message || 'Delete failed'); }
  };

  return (
    <main className="min-h-screen text-white pt-16 pb-24">
      {/* PERF: Leaflet is a ~140KB library only needed for the destination map card.
          `lazyOnload` defers script fetch until after all above-the-fold resources
          (hero image, gradient text, meta) are painted, and CSS is loaded via
          media-print swap trick so it doesn't render-block the initial paint. */}
      {j?.destination?.lat && (
        <>
          <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="lazyOnload" onLoad={() => setLeafletReady(true)} />
          {/* eslint-disable-next-line @next/next/no-css-tags */}
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" media="print" onLoad={(e) => { e.currentTarget.media = 'all'; }} />
          <noscript>{/* eslint-disable-next-line @next/next/no-css-tags */}<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /></noscript>
        </>
      )}
      <CircleNav />

      {/* HERO */}
      <section className="relative min-h-[70svh] overflow-hidden">
        {j.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img fetchPriority="high" decoding="async" src={j.cover} alt={j.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/40 via-violet-500/40 to-pink-400/40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#06080f] via-[#06080f]/50 to-transparent" />

        <div className="relative min-h-[70svh] max-w-7xl mx-auto px-5 md:px-8 flex flex-col justify-end pt-24 pb-14">
          <div className="circle-chip">{th.emoji} {th.label}</div>
          <h1 className="display text-5xl md:text-7xl font-bold mt-4 leading-[1.05] max-w-4xl">{j.name}</h1>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-white/80 text-sm">
            <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" /> {j.destination?.name}{j.destination?.district ? `, ${j.destination.district}` : ''}</span>
            <span className="inline-flex items-center gap-1.5"><CalendarRange className="size-4" /> {j.startDate ? new Date(j.startDate).toDateString() : (j.isFlexibleDates ? 'Flexible dates' : 'TBD')}{j.endDate ? ` → ${new Date(j.endDate).toDateString()}` : ''}</span>
            <Link href={`/circle/j/${j.slug}/members`} className="inline-flex items-center gap-1.5 hover:text-white transition">
              <Users className="size-4" /> {memberInfo?.acceptedCount ?? 1} member{(memberInfo?.acceptedCount ?? 1) !== 1 ? 's' : ''} · {memberInfo?.seatsRemaining ?? j.maxMembers} seat{(memberInfo?.seatsRemaining ?? j.maxMembers) !== 1 ? 's' : ''} left
            </Link>
            <span className="inline-flex items-center gap-1.5 capitalize">{j.difficulty}</span>
            <span className="inline-flex items-center gap-1.5"><Eye className="size-4" /> {j.viewsCount || 0} views</span>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => setShareOpen(true)} className="inline-flex items-center gap-2 px-5 py-3 rounded-full circle-btn-primary text-sm font-semibold">
              <Share2 className="size-4" /> Share journey
            </button>
            <JoinAction
              user={user}
              isOwner={isOwner}
              journey={j}
              memberInfo={memberInfo}
              onOpenJoin={() => {
                if (!user) { router.push(signInHref(`/circle/j/${j.slug}`)); return; }
                setJoinOpen(true);
              }}
              onCancel={async () => {
                try { await circleApi.cancelRequest(j.id); toast.success('Request cancelled'); loadMembers(j.id); }
                catch (e) { toast.error(e.message || 'Failed'); }
              }}
              onLeave={async () => {
                if (!confirm('Leave this journey?')) return;
                try { await circleApi.leaveJourney(j.id); toast.success('You left the journey'); loadMembers(j.id); }
                catch (e) { toast.error(e.message || 'Failed'); }
              }}
            />
            <Link href={`/circle/j/${j.slug}/members`} className="inline-flex items-center gap-2 px-5 py-3 rounded-full circle-btn-ghost text-sm font-semibold">
              <Users className="size-4" /> Members
            </Link>
            {(isOwner || memberInfo?.myMembership?.status === 'accepted') && (
              <Link href={`/circle/j/${j.slug}/plan`} className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-emerald-400/25 to-violet-400/25 border border-emerald-400/40 text-white text-sm font-semibold hover:from-emerald-400/40 hover:to-violet-400/40 transition">
                <Sparkles className="size-4" /> Open Workspace
              </Link>
            )}
            {isOwner && (
              <>
                <Link href={`/circle/studio`} className="inline-flex items-center gap-2 px-5 py-3 rounded-full circle-btn-ghost text-sm font-semibold">
                  <Edit3 className="size-4" /> Studio
                </Link>
                <button onClick={doDelete} className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-red-500/20 border border-red-500/30 text-red-200 text-sm font-semibold">
                  <Trash2 className="size-4" /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* BODY */}
      <section className="relative -mt-12">
        <div className="max-w-7xl mx-auto px-5 md:px-8 grid lg:grid-cols-[1fr_400px] gap-8">
          <div className="space-y-8">
            {/* Description */}
            <div className="circle-glass circle-card p-8">
              <div className="flex items-center gap-3">
                {j.curatorAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" decoding="async" src={j.curatorAvatar} alt={j.curatorName} className="size-10 rounded-full" />
                ) : <div className="size-10 rounded-full bg-white/10 grid place-items-center text-sm">{j.curatorName?.charAt(0)}</div>}
                <div>
                  <div className="text-xs text-white/60">Journey Curator</div>
                  <div className="font-semibold">{j.curatorName}</div>
                </div>
                <div className="ml-auto circle-chip !text-[10px]">{j.visibility}</div>
              </div>
              <p className="mt-6 text-white/85 leading-relaxed whitespace-pre-line">{j.description || 'The curator hasn\'t added a story yet.'}</p>
            </div>

            {/* Timeline / Included services */}
            <div className="circle-glass circle-card p-8">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <div className="circle-chip">Itinerary</div>
                  <div className="display text-2xl font-bold mt-2">Included services</div>
                </div>
                <div className="text-xs text-white/60">{j.services?.length || 0} services</div>
              </div>

              <div className="relative pl-6">
                <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-emerald-400/70 via-violet-400/70 to-pink-400/70" />
                {(j.services || []).map((s, i) => (
                  <div key={s.listingId + i} className="relative pb-6 last:pb-0">
                    <div className="absolute -left-[22px] top-1.5 circle-dot" />
                    <div className="flex gap-4">
                      {s.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img loading="lazy" decoding="async" src={s.image} alt="" className="size-20 md:size-24 rounded-2xl object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] uppercase tracking-wider text-white/50">{s.subcategory || s.category}</div>
                        <div className="font-semibold text-lg">{s.title}</div>
                        <div className="text-white/60 text-xs mt-1">Hosted by {s.hostName || 'Safar Host'}</div>
                        {s.notes && <div className="text-white/70 text-sm mt-2">{s.notes}</div>}
                        <div className="mt-2 flex items-center gap-3">
                          <div className="text-sm font-semibold circle-grad-text">{formatINR(s.price)}</div>
                          <Link href={`/property/${s.listingId}`} target="_blank" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
                            View on Safar <ExternalLink className="size-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {(!j.services || j.services.length === 0) && <div className="text-white/60 text-sm">No services curated yet.</div>}
              </div>
            </div>

            {/* Map */}
            {(j.destination?.lat && j.destination?.lng) && (
              <div className="circle-glass circle-card p-6">
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <div className="circle-chip">On the map</div>
                    <div className="display text-xl font-bold mt-2">{j.destination.name}</div>
                  </div>
                  <div className="text-xs text-white/60">Leaflet + OpenStreetMap</div>
                </div>
                <div id="journey-map" style={{ width: '100%', height: 320, borderRadius: 20, overflow: 'hidden' }} />
              </div>
            )}

            {/* Preferences */}
            <div className="circle-glass circle-card p-8 grid md:grid-cols-2 gap-6">
              <div>
                <div className="circle-label">Age preference</div>
                <div className="font-semibold">{j.agePreference || 'Any'}</div>
              </div>
              <div>
                <div className="circle-label">Gender preference</div>
                <div className="font-semibold">{j.genderPreference || 'Any'}</div>
              </div>
              <div>
                <div className="circle-label">Languages</div>
                <div className="font-semibold">{(j.languages || []).join(', ') || 'Any'}</div>
              </div>
              <div>
                <div className="circle-label">Difficulty</div>
                <div className="font-semibold capitalize">{j.difficulty}</div>
              </div>
            </div>
          </div>

          {/* Sticky right: estimator */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <div className="circle-glass-strong circle-card p-6">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-2xl circle-btn-primary grid place-items-center"><Sparkles className="size-4 text-black" /></div>
                <div>
                  <div className="circle-label mb-0">Estimate</div>
                  <div className="text-sm font-semibold">Per person</div>
                </div>
              </div>
              <div className="display text-4xl font-bold circle-grad-text mt-4">
                {formatINR(j.estimate?.perPerson || 0)}
              </div>
              <div className="text-xs text-white/60 mt-1">
                {j.estimate?.members || j.maxMembers} travelers · {j.estimate?.days || 1} day{(j.estimate?.days || 1) > 1 ? 's' : ''}
              </div>
              <div className="mt-5 space-y-2 text-sm">
                <Row label="Subtotal" value={formatINR(j.estimate?.subtotal || 0)} />
                <Row label="Platform fee" value={formatINR(j.estimate?.platformFee || 0)} />
                <Row label="Taxes (GST)" value={formatINR(j.estimate?.taxes || 0)} />
                <div className="circle-divider my-3" />
                <Row label="Group total" value={formatINR(j.estimate?.totalGroup || 0)} strong />
              </div>
              {j.estimate?.estimatedSavings > 0 && (
                <div className="mt-4 flex items-center justify-between text-emerald-300 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-3 py-2">
                  <span>Est. savings w/ Safar Credits</span>
                  <span className="font-semibold">− {formatINR(j.estimate.estimatedSavings)}</span>
                </div>
              )}
              <button onClick={() => setShareOpen(true)} className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full circle-btn-ghost text-sm font-semibold">
                <Share2 className="size-4" /> Share this journey
              </button>
              <div className="mt-3">
                <JoinAction
                  user={user}
                  isOwner={isOwner}
                  journey={j}
                  memberInfo={memberInfo}
                  onOpenJoin={() => {
                    if (!user) { router.push(signInHref(`/circle/j/${j.slug}`)); return; }
                    setJoinOpen(true);
                  }}
                  onCancel={async () => {
                    try { await circleApi.cancelRequest(j.id); toast.success('Request cancelled'); loadMembers(j.id); }
                    catch (e) { toast.error(e.message || 'Failed'); }
                  }}
                  onLeave={async () => {
                    if (!confirm('Leave this journey?')) return;
                    try { await circleApi.leaveJourney(j.id); toast.success('You left the journey'); loadMembers(j.id); }
                    catch (e) { toast.error(e.message || 'Failed'); }
                  }}
                  fullWidth
                />
              </div>
              <div className="mt-3 text-[11px] text-white/50 text-center">
                {memberInfo?.acceptedCount ?? 1} member{(memberInfo?.acceptedCount ?? 1) !== 1 ? 's' : ''} · {memberInfo?.seatsRemaining ?? j.maxMembers} seat{(memberInfo?.seatsRemaining ?? j.maxMembers) !== 1 ? 's' : ''} remaining
              </div>
            </div>
          </aside>
        </div>
      </section>

      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} url={url} title={`Join my Journey: ${j.name}`} description={j.description} />

      <JoinModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        journey={j}
        memberInfo={memberInfo}
        seats={joinSeats}
        setSeats={setJoinSeats}
        message={joinMessage}
        setMessage={setJoinMessage}
        loading={joinLoading}
        onSubmit={async () => {
          if (!user) { toast.error('Sign in to request joining'); return; }
          setJoinLoading(true);
          try {
            await circleApi.requestJoin(j.id, { message: joinMessage, seats: joinSeats });
            toast.success('Request sent to the curator');
            setJoinOpen(false);
            setJoinMessage('');
            setJoinSeats(1);
            loadMembers(j.id);
          } catch (e) {
            toast.error(e.message || 'Failed to send request');
          } finally {
            setJoinLoading(false);
          }
        }}
      />
    </main>
  );
}

// ————————————————— Module 2 helper components —————————————————
function JoinAction({ user, isOwner, journey, memberInfo, onOpenJoin, onCancel, onLeave, fullWidth = false }) {
  const base = 'inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold ' + (fullWidth ? 'w-full ' : '');
  if (isOwner) {
    return (
      <span className={base + 'bg-emerald-500/15 border border-emerald-400/30 text-emerald-200'}>
        <ShieldCheck className="size-4" /> You are the Curator
      </span>
    );
  }
  const mine = memberInfo?.myMembership;
  const closed = journey?.registrationsClosed || journey?.visibility !== 'public';
  const full = (memberInfo?.seatsRemaining ?? journey?.maxMembers ?? 0) <= 0;

  if (mine?.status === 'accepted') {
    return (
      <div className={fullWidth ? 'grid grid-cols-2 gap-2 w-full' : 'flex items-center gap-2'}>
        <span className={base + 'bg-emerald-500/15 border border-emerald-400/30 text-emerald-200'}>
          <Check className="size-4" /> Joined{mine.role === 'co_curator' ? ' · Co-Curator' : ''}
        </span>
        {mine.role !== 'co_curator' && (
          <button onClick={onLeave} className={base + 'bg-red-500/15 border border-red-400/30 text-red-200'}>
            <LogOut className="size-4" /> Leave
          </button>
        )}
      </div>
    );
  }
  if (mine?.status === 'pending') {
    return (
      <div className={fullWidth ? 'grid grid-cols-2 gap-2 w-full' : 'flex items-center gap-2'}>
        <span className={base + 'bg-amber-500/15 border border-amber-400/30 text-amber-200'}>
          <Loader2 className="size-4 animate-spin" /> Request Pending
        </span>
        <button onClick={onCancel} className={base + 'circle-btn-ghost'}>
          <X className="size-4" /> Cancel
        </button>
      </div>
    );
  }
  if (closed) {
    return (
      <span className={base + 'bg-white/5 border border-white/10 text-white/60'}>
        <DoorClosed className="size-4" /> Registrations Closed
      </span>
    );
  }
  if (full) {
    return (
      <span className={base + 'bg-white/5 border border-white/10 text-white/60'}>
        <Users className="size-4" /> Journey Full
      </span>
    );
  }
  return (
    <button onClick={onOpenJoin} className={base + 'circle-btn-primary'}>
      <Send className="size-4" /> Request to join
    </button>
  );
}

function JoinModal({ open, onClose, journey, memberInfo, seats, setSeats, message, setMessage, loading, onSubmit }) {
  if (!open) return null;
  const maxSeats = Math.max(1, Math.min(6, memberInfo?.seatsRemaining || 1));
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md circle-glass-strong rounded-t-3xl sm:rounded-3xl p-6 text-white border border-white/10">
        <div className="flex items-start justify-between">
          <div>
            <div className="circle-chip">Request to join</div>
            <h3 className="display text-xl font-bold mt-2">{journey?.name}</h3>
            <div className="text-xs text-white/60 mt-1">
              {memberInfo?.seatsRemaining ?? journey?.maxMembers} seat{(memberInfo?.seatsRemaining ?? journey?.maxMembers) !== 1 ? 's' : ''} remaining
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1"><X className="size-5" /></button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <div className="circle-label mb-1">Seats requested</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSeats(Math.max(1, seats - 1))} className="size-9 rounded-full bg-white/10 hover:bg-white/15 grid place-items-center">−</button>
              <div className="min-w-[3rem] text-center font-semibold display text-lg">{seats}</div>
              <button onClick={() => setSeats(Math.min(maxSeats, seats + 1))} className="size-9 rounded-full bg-white/10 hover:bg-white/15 grid place-items-center">+</button>
              <div className="text-xs text-white/50 ml-2">up to {maxSeats}</div>
            </div>
          </div>
          <div>
            <div className="circle-label mb-1">Message to the curator</div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 500))}
              placeholder="Introduce yourself and tell the curator why you want to join..."
              className="w-full min-h-[100px] rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25 resize-none"
            />
            <div className="text-[10px] text-white/40 text-right mt-1">{message.length}/500</div>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-full circle-btn-ghost text-sm font-semibold">Cancel</button>
          <button onClick={onSubmit} disabled={loading} className="flex-1 px-4 py-2.5 rounded-full circle-btn-primary text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send request
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-white/70">{label}</div>
      <div className={strong ? 'font-bold display text-lg' : 'text-white/90'}>{value}</div>
    </div>
  );
}
