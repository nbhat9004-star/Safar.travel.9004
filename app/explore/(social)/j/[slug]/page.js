'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  MapPin, Calendar, Users, Wallet, Route as RouteIcon, Sparkles,
  UserPlus, LogOut, Check, X, Bookmark, Share2, Loader2, ArrowLeft,
  Trash2, Edit3, Send, Clock, Mountain,
} from 'lucide-react';
import AuroraBg from '@/components/explore/AuroraBg';
import BadgeChip from '@/components/explore/BadgeChip';
import { useAuth } from '@/lib/auth-context';

export default function JourneyDetails() {
  const { slug } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [journey, setJourney] = useState(null);
  const [members, setMembers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [bookmarked, setBookmarked] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/circle/journeys/slug/${slug}`);
      const j = await r.json();
      if (!j.journey) { setLoading(false); return; }
      setJourney(j.journey);
      const rm = await fetch(`/api/circle/journeys/${j.journey.id}/members`);
      const jm = await rm.json();
      setMembers(jm);
      // check bookmark
      if (user) {
        try {
          const rb = await fetch(`/api/circle/bookmarks/mine?type=journey`);
          const jb = await rb.json();
          setBookmarked(!!(jb.bookmarks || []).find(b => b.targetId === j.journey.id));
        } catch {}
      }
    } catch {}
    setLoading(false);
  }, [slug, user]);

  useEffect(() => { load(); }, [load]);

  const act = async (endpoint, method = 'POST', body) => {
    setBusy(endpoint);
    try {
      const r = await fetch(endpoint, {
        method, headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || j.message || 'Failed');
      await load();
      setMsg('');
      return j;
    } catch (e) {
      setMsg(e.message || 'Action failed');
    } finally { setBusy(''); }
  };

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const shareData = { title: journey?.name || 'Journey on Safar', text: journey?.description || 'Check out this journey', url };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setMsg('Link copied to clipboard');
    }
  };

  const toggleBookmark = async () => {
    if (!user) { router.push('/?auth=1'); return; }
    setBookmarked(v => !v); // optimistic
    await fetch(`/api/circle/journeys/${journey.id}/bookmark`, { method: 'POST' });
  };

  if (loading) return (
    <div className="e-container pt-24 pb-24 text-center">
      <Loader2 className="size-6 animate-spin mx-auto text-white/60" />
    </div>
  );

  if (!journey) return (
    <div className="e-container pt-24 pb-24 text-center">
      <div className="e-chip mx-auto">Not found</div>
      <p className="mt-4" style={{ color: 'var(--e-text-muted)' }}>This journey doesn't exist or isn't public yet.</p>
      <Link href="/explore/home" className="mt-6 inline-flex items-center gap-1 e-btn-ghost rounded-full px-4 py-2 text-sm"><ArrowLeft className="size-4" /> Back to Explore</Link>
    </div>
  );

  const isOwner = user && user.id === journey.curatorId;
  const myMem = members?.myMembership;
  const seatsRemaining = members?.seatsRemaining ?? 0;
  const acceptedCount = members?.acceptedCount ?? 0;
  const capacity = members?.capacity ?? journey.maxMembers;
  const days = journey.startDate && journey.endDate
    ? Math.max(1, Math.ceil((new Date(journey.endDate) - new Date(journey.startDate)) / 86400000))
    : null;

  return (
    <div className="relative">
      <section className="relative overflow-hidden pt-14 md:pt-20 pb-8">
        <AuroraBg />
        <div className="relative e-container e-fade-in">
          <Link href="/explore/home" className="inline-flex items-center gap-1 text-xs e-btn-ghost rounded-full px-3 py-1.5 mb-4"><ArrowLeft className="size-3" /> Back</Link>
          <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6 lg:gap-8">
            <div>
              {journey.cover && (
                <div className="relative w-full h-64 md:h-96 rounded-3xl overflow-hidden border border-white/10">
                  <Image src={journey.cover} alt={journey.name} fill sizes="(min-width:1024px) 60vw, 100vw" className="object-cover" />
                </div>
              )}
              <div className="mt-5 flex items-center gap-2 flex-wrap">
                <div className="e-chip"><RouteIcon className="size-3 text-emerald-300" /> {journey.theme?.replace(/_/g, ' ') || 'Journey'}</div>
                {journey.difficulty && <BadgeChip type="new">{journey.difficulty}</BadgeChip>}
                {journey.visibility === 'draft' && <BadgeChip type="warn">Draft</BadgeChip>}
              </div>
              <h1 className="display font-bold mt-3 text-[clamp(1.6rem,4vw,2.6rem)] leading-tight">{journey.name}</h1>
              <div className="mt-2 text-sm flex flex-wrap gap-4" style={{ color: 'var(--e-text-muted)' }}>
                {journey.destination?.name && <span><MapPin className="inline size-3.5 mr-1" />{journey.destination.name}{journey.destination.district ? `, ${journey.destination.district}` : ''}</span>}
                {journey.startDate && <span><Calendar className="inline size-3.5 mr-1" />{new Date(journey.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{journey.endDate ? ` — ${new Date(journey.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</span>}
                {days && <span><Clock className="inline size-3.5 mr-1" />{days} day{days>1?'s':''}</span>}
                {journey.budget && <span><Wallet className="inline size-3.5 mr-1" />₹{Number(journey.budget).toLocaleString('en-IN')}</span>}
              </div>
              {journey.description && (
                <p className="mt-5 text-sm md:text-base leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--e-text-muted)' }}>{journey.description}</p>
              )}
              <div className="mt-6 flex flex-wrap gap-2">
                <button onClick={toggleBookmark} className="e-btn-ghost rounded-full px-4 py-2 text-sm inline-flex items-center gap-2"><Bookmark className={`size-4 ${bookmarked ? 'fill-emerald-300 text-emerald-300' : ''}`} /> {bookmarked ? 'Bookmarked' : 'Bookmark'}</button>
                <button onClick={share} className="e-btn-ghost rounded-full px-4 py-2 text-sm inline-flex items-center gap-2"><Share2 className="size-4" /> Share</button>
                {isOwner && (
                  <>
                    <Link href={`/explore/journey?edit=${journey.id}`} className="e-btn-ghost rounded-full px-4 py-2 text-sm inline-flex items-center gap-2"><Edit3 className="size-4" /> Edit</Link>
                    <button
                      onClick={async () => {
                        if (!confirm('Delete this journey? This cannot be undone.')) return;
                        setBusy('delete');
                        await fetch(`/api/circle/journeys/${journey.id}`, { method: 'DELETE' });
                        router.push('/explore/journey?tab=mine');
                      }}
                      className="e-btn-ghost rounded-full px-4 py-2 text-sm inline-flex items-center gap-2 text-rose-300"
                    >
                      {busy==='delete' ? <Loader2 className="size-4 animate-spin"/> : <Trash2 className="size-4" />} Delete
                    </button>
                    {journey.visibility !== 'public' && (
                      <button
                        onClick={() => act(`/api/circle/journeys/${journey.id}/visibility`, 'PATCH', { visibility: 'public' })}
                        disabled={busy}
                        className="e-btn-primary rounded-full px-4 py-2 text-sm inline-flex items-center gap-2"
                      ><Sparkles className="size-4" /> Publish</button>
                    )}
                  </>
                )}
              </div>
              {msg && <div className="mt-3 text-xs" style={{ color: 'var(--e-text-muted)' }}>{msg}</div>}
            </div>

            {/* Sidebar */}
            <aside className="e-glass rounded-3xl p-5 md:p-6 self-start">
              <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--e-text-dim)' }}>Group</div>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold e-grad-text">{acceptedCount}<span className="text-white/50 text-base font-medium"> / {capacity}</span></div>
                  <div className="text-[11px]" style={{ color: 'var(--e-text-muted)' }}>Members joined</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{seatsRemaining}</div>
                  <div className="text-[11px]" style={{ color: 'var(--e-text-muted)' }}>Seats remaining</div>
                </div>
              </div>

              {/* Join / Cancel / Leave */}
              {!isOwner && (
                <div className="mt-5">
                  {!user && (
                    <Link href="/?auth=1" className="w-full e-btn-primary rounded-full px-5 py-3 text-sm inline-flex items-center justify-center gap-2"><UserPlus className="size-4" /> Sign in to join</Link>
                  )}
                  {user && !myMem && seatsRemaining > 0 && journey.visibility === 'public' && (
                    <>
                      <textarea value={msg && msg.startsWith('note:') ? msg.slice(5) : ''} onChange={(e) => setMsg('note:' + e.target.value)} placeholder="Add a short intro (optional)…" className="w-full text-sm rounded-xl border border-white/15 bg-white/[0.04] p-3 mb-2" rows={2} />
                      <button
                        onClick={() => act(`/api/circle/journeys/${journey.id}/join`, 'POST', { seats: 1, message: msg.startsWith('note:') ? msg.slice(5) : '' })}
                        disabled={busy}
                        className="w-full e-btn-primary rounded-full px-5 py-3 text-sm inline-flex items-center justify-center gap-2"
                      >{busy ? <Loader2 className="size-4 animate-spin"/> : <UserPlus className="size-4" />} Request to join</button>
                    </>
                  )}
                  {user && myMem?.status === 'pending' && (
                    <button
                      onClick={() => act(`/api/circle/journeys/${journey.id}/cancel-request`)}
                      disabled={busy}
                      className="w-full e-btn-ghost rounded-full px-5 py-3 text-sm inline-flex items-center justify-center gap-2"
                    >{busy ? <Loader2 className="size-4 animate-spin"/> : <X className="size-4" />} Cancel request</button>
                  )}
                  {user && myMem?.status === 'accepted' && (
                    <>
                      <div className="e-chip mb-3"><Check className="size-3 text-emerald-300" /> You're in!</div>
                      <button
                        onClick={() => act(`/api/circle/journeys/${journey.id}/leave`)}
                        disabled={busy}
                        className="w-full e-btn-ghost rounded-full px-5 py-3 text-sm inline-flex items-center justify-center gap-2"
                      >{busy ? <Loader2 className="size-4 animate-spin"/> : <LogOut className="size-4" />} Leave journey</button>
                    </>
                  )}
                  {seatsRemaining <= 0 && !myMem && <div className="text-sm text-rose-300">Journey is full</div>}
                </div>
              )}

              {/* Curator */}
              <div className="mt-6 pt-5 border-t border-white/10">
                <div className="text-[10px] uppercase tracking-[0.22em] mb-2" style={{ color: 'var(--e-text-dim)' }}>Curator</div>
                <div className="flex items-center gap-3">
                  {journey.curatorAvatar
                    ? <Image src={journey.curatorAvatar} alt={journey.curatorName || 'Curator'} width={40} height={40} className="rounded-full ring-1 ring-white/20" />
                    : <div className="size-10 rounded-full bg-gradient-to-br from-emerald-300 to-violet-400 grid place-items-center text-[#06080f] font-bold">{(journey.curatorName || '?')[0]}</div>}
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{journey.curatorName}</div>
                    <div className="text-[11px]" style={{ color: 'var(--e-text-muted)' }}>{journey.curatorRole || 'Traveler'}</div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Members list + curator's pending requests */}
      <section className="relative e-container pb-24">
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <div className="e-chip"><Users className="size-3 text-emerald-300" /> Members ({acceptedCount})</div>
            <div className="mt-4 space-y-2">
              {members?.owner && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  {members.owner.userAvatar
                    ? <Image src={members.owner.userAvatar} alt={members.owner.userName} width={36} height={36} className="rounded-full" />
                    : <div className="size-9 rounded-full bg-white/10 grid place-items-center text-xs">{(members.owner.userName||'?')[0]}</div>}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{members.owner.userName}</div>
                    <div className="text-[11px]" style={{ color: 'var(--e-text-muted)' }}>Curator</div>
                  </div>
                </div>
              )}
              {(members?.travelers || []).map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  {t.userAvatar
                    ? <Image src={t.userAvatar} alt={t.userName} width={36} height={36} className="rounded-full" />
                    : <div className="size-9 rounded-full bg-white/10 grid place-items-center text-xs">{(t.userName||'?')[0]}</div>}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{t.userName}</div>
                    <div className="text-[11px]" style={{ color: 'var(--e-text-muted)' }}>{t.seats} seat{t.seats>1?'s':''}</div>
                  </div>
                </div>
              ))}
              {acceptedCount === 0 && <div className="text-sm" style={{ color: 'var(--e-text-muted)' }}>No members yet — be the first to join.</div>}
            </div>
          </div>

          {(isOwner || members?.canManage) && (
            <div>
              <div className="e-chip"><Sparkles className="size-3 text-amber-300" /> Pending requests ({(members?.pending||[]).length})</div>
              <div className="mt-4 space-y-2">
                {(members?.pending || []).map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                    {p.userAvatar
                      ? <Image src={p.userAvatar} alt={p.userName} width={36} height={36} className="rounded-full" />
                      : <div className="size-9 rounded-full bg-white/10 grid place-items-center text-xs">{(p.userName||'?')[0]}</div>}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{p.userName}</div>
                      <div className="text-[11px] line-clamp-1" style={{ color: 'var(--e-text-muted)' }}>{p.message || `${p.seats} seat${p.seats>1?'s':''}`}</div>
                    </div>
                    <button
                      onClick={() => act(`/api/circle/journeys/${journey.id}/members/${p.id}/accept`)}
                      disabled={busy}
                      className="e-btn-primary rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1"
                    ><Check className="size-3" /> Accept</button>
                    <button
                      onClick={() => act(`/api/circle/journeys/${journey.id}/members/${p.id}/decline`)}
                      disabled={busy}
                      className="e-btn-ghost rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1"
                    ><X className="size-3" /> Reject</button>
                  </div>
                ))}
                {(members?.pending || []).length === 0 && <div className="text-sm" style={{ color: 'var(--e-text-muted)' }}>No pending requests.</div>}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
