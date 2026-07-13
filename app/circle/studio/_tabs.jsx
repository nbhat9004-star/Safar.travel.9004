'use client';
// PERF: Studio tabs extracted here so /app/app/circle/studio/page.js can
// code-split (`next/dynamic`) them. Only the tab currently active by the
// curator loads its chunk on demand; the initial Studio page ships without
// the analytics / services / requests / members / messages / timeline JS.
// No UI, business logic, or API surface changes vs. the previous inline
// implementations in studio/page.js.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Sparkles, Layers, Eye, Users, Wallet, Send, ArrowRight,
  Globe, Edit3, Trash2, MessageCircle, Route,
  Check, X, Crown, Star, ShieldCheck, Loader2, UserMinus, Megaphone,
  CalendarDays, ListChecks, Images, Vote, Bell, Info
} from 'lucide-react';
import { circleApi, themeLabel, formatINR } from '@/lib/circle-api';

// ————— Utilities —————
function timeAgo(d) {
  if (!d) return '';
  const then = new Date(d).getTime();
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
}

function Metric({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-white/70 text-sm">{label}</div>
      <div className="font-bold display text-lg">{value}</div>
    </div>
  );
}

// ————— ServicesTab —————
export function ServicesTab({ journeys }) {
  const all = journeys.flatMap(j => (j.services || []).map(s => ({ ...s, journey: j.name, slug: j.slug })));
  if (all.length === 0) return <div className="circle-glass circle-card p-10 text-center text-white/70">No services curated across your journeys yet.</div>;
  return (
    <div className="circle-glass circle-card p-6 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-white/60 text-xs uppercase tracking-wider">
          <tr>
            <th className="py-3 px-2">Service</th>
            <th className="py-3 px-2">Category</th>
            <th className="py-3 px-2">Host</th>
            <th className="py-3 px-2">Journey</th>
            <th className="py-3 px-2 text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          {all.map((s, i) => (
            <tr key={i} className="border-t border-white/10">
              <td className="py-3 px-2 flex items-center gap-3">
                {s.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" decoding="async" src={s.image} alt="" className="size-10 rounded-lg object-cover" />
                )}
                <span className="font-medium">{s.title}</span>
              </td>
              <td className="py-3 px-2 text-white/70">{s.subcategory || s.category}</td>
              <td className="py-3 px-2 text-white/70">{s.hostName || 'Safar Host'}</td>
              <td className="py-3 px-2"><Link href={`/circle/j/${s.slug}`} className="text-emerald-300 hover:underline">{s.journey}</Link></td>
              <td className="py-3 px-2 text-right font-semibold circle-grad-text">{formatINR(s.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ————— AnalyticsTab —————
export function AnalyticsTab({ journeys, stats }) {
  const perTheme = {};
  journeys.forEach(j => { perTheme[j.theme] = (perTheme[j.theme] || 0) + 1; });
  const totalCost = journeys.reduce((n, j) => n + (j.estimate?.totalGroup || 0), 0);
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="circle-glass circle-card p-6">
        <div className="circle-chip">Overview</div>
        <div className="mt-5 space-y-3">
          <Metric label="Total journeys" value={stats.total || 0} />
          <Metric label="Services curated" value={stats.totalServices || 0} />
          <Metric label="Total views" value={stats.totalViews || 0} />
          <Metric label="Total planned group cost" value={formatINR(totalCost)} />
        </div>
      </div>
      <div className="circle-glass circle-card p-6">
        <div className="circle-chip">By theme</div>
        <div className="mt-5 space-y-3">
          {Object.keys(perTheme).length === 0 ? (
            <div className="text-white/60 text-sm">Create journeys to see theme breakdown.</div>
          ) : Object.entries(perTheme).map(([k, v]) => {
            const th = themeLabel(k);
            return (
              <div key={k} className="flex items-center justify-between">
                <div className="text-sm">{th.emoji} {th.label}</div>
                <div className="text-sm font-semibold">{v}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ————— RequestsTab —————
export function RequestsTab({ onChange }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);
  const load = () => circleApi.studioRequests().then(setData).catch(() => setData({ requests: [], total: 0 }));
  useEffect(() => { load(); }, []);
  if (!data) return <div className="grid md:grid-cols-2 gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 rounded-2xl circle-glass animate-pulse" />)}</div>;
  if (data.total === 0) {
    return (
      <div className="circle-glass circle-card p-10 text-center">
        <div className="text-4xl">📨</div>
        <div className="display text-2xl font-bold mt-3">No pending requests</div>
        <div className="text-white/60 text-sm mt-2 max-w-md mx-auto">When travelers request to join your journeys, they'll appear here for approval.</div>
      </div>
    );
  }
  const act = async (jid, memberId, action) => {
    setBusy(memberId + ':' + action);
    try {
      await circleApi.memberAction(jid, memberId, action);
      toast.success(action === 'accept' ? 'Accepted' : 'Declined');
      load(); onChange && onChange();
    } catch (e) { toast.error(e.message || 'Action failed'); }
    finally { setBusy(null); }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-white/70">
        <Send className="size-4" /> {data.total} pending request{data.total !== 1 ? 's' : ''} across {data.journeys?.length || 0} journey{(data.journeys?.length || 0) !== 1 ? 's' : ''}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {data.requests.map(r => (
          <div key={r.id} className="circle-glass circle-card p-5">
            <div className="flex items-start gap-3">
              {r.userAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img loading="lazy" decoding="async" src={r.userAvatar} alt={r.userName} className="size-12 rounded-full object-cover" />
              ) : (
                <div className="size-12 rounded-full bg-white/10 grid place-items-center text-lg font-semibold">{(r.userName || '?').charAt(0).toUpperCase()}</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{r.userName}</div>
                <div className="text-xs text-white/60 mt-0.5">
                  ⭐ {r.userReputation || 0} rep · {r.seats} seat{r.seats !== 1 ? 's' : ''} · {timeAgo(r.createdAt)}
                </div>
                {r.journey && (
                  <div className="mt-1 text-[11px] text-white/50">
                    for <Link href={`/circle/j/${r.journey.slug}`} className="text-emerald-300 hover:underline">{r.journey.name}</Link>
                  </div>
                )}
                {r.message && (
                  <div className="mt-2 rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/80">"{r.message}"</div>
                )}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button onClick={() => act(r.journeyId, r.id, 'accept')} disabled={!!busy} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full circle-btn-primary text-xs font-semibold disabled:opacity-50">
                {busy === r.id + ':accept' ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3.5" />} Accept
              </button>
              <button onClick={() => act(r.journeyId, r.id, 'decline')} disabled={!!busy} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full circle-btn-ghost text-xs font-semibold disabled:opacity-50">
                {busy === r.id + ':decline' ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3.5" />} Decline
              </button>
              {r.journey && (
                <Link href={`/circle/j/${r.journey.slug}/members`} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10">
                  <Users className="size-3.5" /> Manage
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ————— MembersTab —————
export function MembersTab() {
  const [data, setData] = useState(null);
  useEffect(() => { circleApi.studioMembers().then(setData).catch(() => setData({ groups: [], total: 0 })); }, []);
  if (!data) return <div className="grid md:grid-cols-2 gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 rounded-2xl circle-glass animate-pulse" />)}</div>;
  if (!data.groups || data.groups.every(g => g.members.length === 0)) {
    return (
      <div className="circle-glass circle-card p-10 text-center">
        <div className="text-4xl">👥</div>
        <div className="display text-2xl font-bold mt-3">No members yet</div>
        <div className="text-white/60 text-sm mt-2 max-w-md mx-auto">When travelers join your journeys, they'll appear here. Open Members to invite and manage each journey.</div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="text-sm text-white/70 flex items-center gap-2"><Users className="size-4" /> {data.total} member{data.total !== 1 ? 's' : ''} total</div>
      {data.groups.filter(g => g.members.length > 0).map(g => (
        <div key={g.journey.id} className="circle-glass circle-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="min-w-0">
              <div className="circle-chip">{g.members.length}/{g.journey.maxMembers} member{g.members.length !== 1 ? 's' : ''}</div>
              <Link href={`/circle/j/${g.journey.slug}/members`} className="display text-lg font-bold mt-2 block hover:underline truncate">{g.journey.name}</Link>
            </div>
            <Link href={`/circle/j/${g.journey.slug}/members`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full circle-btn-ghost text-xs font-semibold shrink-0">
              Manage <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {g.members.map(m => (
              <div key={m.id} className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
                {m.userAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" decoding="async" src={m.userAvatar} alt={m.userName} className="size-10 rounded-full object-cover" />
                ) : (
                  <div className="size-10 rounded-full bg-white/10 grid place-items-center font-semibold">{(m.userName || '?').charAt(0).toUpperCase()}</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{m.userName}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/50 inline-flex items-center gap-1">
                    {m.role === 'co_curator' ? <><Star className="size-3" /> Co-Curator</> : <><ShieldCheck className="size-3" /> Traveler</>} · {m.seats} seat{m.seats !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ————— MessagesTab —————
export function MessagesTab() {
  const [data, setData] = useState(null);
  useEffect(() => { circleApi.studioMessages().then(setData).catch(() => setData({ conversations: [] })); }, []);
  if (!data) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-2xl circle-glass animate-pulse" />)}</div>;
  if (!data.conversations || data.conversations.length === 0) {
    return (
      <div className="circle-glass circle-card p-10 text-center">
        <div className="text-4xl">💬</div>
        <div className="display text-2xl font-bold mt-3">No conversations yet</div>
        <div className="text-white/60 text-sm mt-2 max-w-md mx-auto">Once your journeys have members chatting, their conversations will appear here.</div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {data.conversations.map(c => (
        <Link key={c.journey.id} href={`/circle/j/${c.journey.slug}/plan?tab=chat`} className="block circle-glass circle-card p-4 hover:bg-white/5 transition">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl overflow-hidden bg-white/10 shrink-0">
              {c.journey.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img loading="lazy" decoding="async" src={c.journey.cover} alt={c.journey.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-500/40 via-violet-500/40 to-pink-400/40" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold truncate">{c.journey.name}</div>
                <div className="text-[11px] text-white/50 shrink-0">{c.lastMessage ? timeAgo(c.lastMessage.createdAt) : ''}</div>
              </div>
              {c.lastMessage ? (
                <div className="text-sm text-white/70 mt-0.5 truncate">
                  <span className="font-medium text-white/85">{c.lastMessage.userName}:</span> {c.lastMessage.text}
                </div>
              ) : (
                <div className="text-sm text-white/50 mt-0.5">No messages yet — say hi!</div>
              )}
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[11px] text-white/50">{c.totalMessages} message{c.totalMessages !== 1 ? 's' : ''}</span>
                {c.unreadCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-[10px] font-semibold">
                    <Bell className="size-3" /> {c.unreadCount} new
                  </span>
                )}
              </div>
            </div>
            <ArrowRight className="size-4 text-white/40" />
          </div>
        </Link>
      ))}
    </div>
  );
}

// ————— TimelineTab —————
const TIMELINE_ICONS = {
  journey_created: { icon: Sparkles, hue: 'from-emerald-400 to-teal-400' },
  journey_updated: { icon: Edit3, hue: 'from-violet-400 to-fuchsia-400' },
  journey_published: { icon: Globe, hue: 'from-emerald-400 to-cyan-400' },
  journey_archived: { icon: Trash2, hue: 'from-slate-400 to-zinc-400' },
  visibility_changed: { icon: Eye, hue: 'from-blue-400 to-indigo-400' },
  request_approved: { icon: Check, hue: 'from-emerald-400 to-green-400' },
  request_declined: { icon: X, hue: 'from-rose-400 to-red-400' },
  member_removed: { icon: UserMinus, hue: 'from-red-400 to-orange-400' },
  member_left: { icon: X, hue: 'from-orange-400 to-red-400' },
  member_promoted: { icon: Crown, hue: 'from-amber-400 to-pink-400' },
  member_demoted: { icon: Star, hue: 'from-slate-400 to-violet-400' },
  settings_updated: { icon: Info, hue: 'from-slate-400 to-blue-400' },
  itinerary_updated: { icon: CalendarDays, hue: 'from-yellow-400 to-orange-400' },
  checklist_added: { icon: ListChecks, hue: 'from-teal-400 to-emerald-400' },
  poll_created: { icon: Vote, hue: 'from-fuchsia-400 to-violet-400' },
  gallery_upload: { icon: Images, hue: 'from-pink-400 to-fuchsia-400' },
  booking_received: { icon: Wallet, hue: 'from-emerald-400 to-yellow-400' },
  announcement: { icon: Megaphone, hue: 'from-amber-400 to-orange-400' },
  invite_sent: { icon: Send, hue: 'from-cyan-400 to-blue-400' },
};

export function TimelineTab() {
  const [events, setEvents] = useState(null);
  useEffect(() => { circleApi.studioTimeline(150).then(r => setEvents(r.events || [])).catch(() => setEvents([])); }, []);
  if (events === null) return <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 rounded-2xl circle-glass animate-pulse" />)}</div>;
  if (events.length === 0) {
    return (
      <div className="circle-glass circle-card p-10 text-center">
        <div className="text-4xl">📜</div>
        <div className="display text-2xl font-bold mt-3">Your timeline is quiet</div>
        <div className="text-white/60 text-sm mt-2 max-w-md mx-auto">Activity across your journeys (member joins, updates, bookings, announcements) will show up here in real time.</div>
      </div>
    );
  }
  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-emerald-400/60 via-violet-400/60 to-pink-400/60" />
      {events.map(ev => {
        const cfg = TIMELINE_ICONS[ev.type] || { icon: Info, hue: 'from-slate-400 to-white/40' };
        const Icon = cfg.icon;
        return (
          <div key={ev.id} className="relative pb-5 last:pb-0">
            <div className={`absolute -left-[22px] top-1 size-7 rounded-full bg-gradient-to-br ${cfg.hue} grid place-items-center shadow-lg`}>
              <Icon className="size-3.5 text-black/80" />
            </div>
            <div className="circle-glass circle-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm">{ev.title}</div>
                  {ev.body && <div className="text-white/70 text-xs mt-0.5 line-clamp-2">{ev.body}</div>}
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-white/50">
                    {ev.journeyName && (
                      <Link href={`/circle/j/${ev.journeySlug}`} className="text-emerald-300 hover:underline truncate max-w-[180px]">{ev.journeyName}</Link>
                    )}
                    {ev.actorName && <span>· by {ev.actorName}</span>}
                    <span>· {timeAgo(ev.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
