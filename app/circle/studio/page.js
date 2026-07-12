'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import CircleNav from '@/components/circle/CircleNav';
import ShareSheet from '@/components/circle/ShareSheet';
import { useAuth } from '@/lib/auth-context';
import { circleApi, themeLabel, formatINR, signInHref } from '@/lib/circle-api';
import { toast } from 'sonner';
import {
  Sparkles, Layers, Eye, Users, Wallet, Share2, Edit3, Trash2, Send, ArrowRight,
  Globe, Lock, Clock, FileText, TrendingUp, MessageCircle, Route,
  Check, X, Crown, Star, ShieldCheck, Loader2, MapPin, UserMinus, Megaphone,
  CalendarDays, ListChecks, BarChart3, Images, Vote, Bell, Info
} from 'lucide-react';

const TABS = [
  { key: 'drafts', label: 'Drafts', icon: FileText },
  { key: 'published', label: 'Published', icon: Globe },
  { key: 'private', label: 'Private/Invite', icon: Lock },
  { key: 'archived', label: 'Archived', icon: Trash2 },
  { key: 'services', label: 'Marketplace services', icon: Layers },
  { key: 'analytics', label: 'Analytics', icon: TrendingUp },
  { key: 'requests', label: 'Requests', icon: Send },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'messages', label: 'Messages', icon: MessageCircle },
  { key: 'timeline', label: 'Timeline', icon: Route },
];

export default function Studio() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState('published');
  const [journeys, setJourneys] = useState([]);
  const [stats, setStats] = useState({ total: 0, drafts: 0, published: 0, private: 0, scheduled: 0, archived: 0, totalServices: 0, totalViews: 0, bookings: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState('');
  const [shareTitle, setShareTitle] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    // includeArchived so the Archived tab has data
    fetch('/api/circle/journeys/mine?includeArchived=1', { credentials: 'include' })
      .then(r => r.json())
      .then(r => { if (r.ok) { setJourneys(r.journeys || []); setStats(r.stats || {}); } else { setJourneys([]); } })
      .catch(() => setJourneys([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (user) load(); }, [user]);

  // Memoize derived lists BEFORE any conditional return (Rules of Hooks).
  const { drafts, published, priv, archived } = useMemo(() => ({
    drafts: journeys.filter(j => j.visibility === 'draft'),
    published: journeys.filter(j => j.visibility === 'public'),
    priv: journeys.filter(j => j.visibility === 'private' || j.visibility === 'invite' || j.visibility === 'scheduled'),
    archived: journeys.filter(j => j.visibility === 'archived'),
  }), [journeys]);

  if (!authLoading && !user) {
    return (
      <main className="min-h-screen text-white pt-24">
        <CircleNav />
        <div className="max-w-lg mx-auto px-5 pt-20 text-center circle-glass circle-card p-10">
          <div className="circle-chip mx-auto">Sign in required</div>
          <h1 className="display text-3xl font-bold mt-4">Studio is for Journey Curators.</h1>
          <p className="text-white/70 mt-3">Sign in with your Safar account to start.</p>
          <Link href={signInHref('/circle/studio')} className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full circle-btn-primary text-sm font-semibold">
            Continue to sign in <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>
    );
  }

  // Guard against duplicate rapid clicks on the same journey action.
  const guard = async (id, fn, successMsg, failMsg) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await fn();
      if (successMsg) toast.success(successMsg);
      load();
    } catch (e) {
      toast.error(e?.message || failMsg || 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const doDelete = (id) => {
    if (!confirm('Delete this journey? This action is permanent.')) return;
    guard(id, () => circleApi.deleteJourney(id), 'Deleted', 'Delete failed');
  };
  const doPublish = (id) => guard(id, () => circleApi.publishJourney(id), 'Published — travellers can now discover this journey', 'Publish failed');
  const doUnpublish = (id) => {
    if (!confirm('Unpublish this journey? It will move back to Drafts and disappear from Discover.')) return;
    guard(id, () => circleApi.unpublishJourney(id), 'Moved to Drafts', 'Unpublish failed');
  };
  const doArchive = (id) => {
    if (!confirm('Archive this journey? It will be hidden from Studio and Discover but preserved for records.')) return;
    guard(id, () => circleApi.archiveJourney(id), 'Archived', 'Archive failed');
  };
  const doRestore = (id) => guard(id, () => circleApi.setVisibility(id, 'draft'), 'Restored to Drafts', 'Restore failed');

  const share = (j) => {
    const url = (typeof window !== 'undefined' ? window.location.origin : '') + `/circle/j/${j.slug}`;
    setShareUrl(url); setShareTitle(`Join my Journey: ${j.name}`);
  };

  return (
    <main className="min-h-screen text-white pt-20 md:pt-24 pb-32">
      <CircleNav />
      <div className="circle-aurora" style={{ opacity: 0.3 }} />

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="circle-chip">Journey Studio</div>
            <h1 className="display text-3xl sm:text-4xl md:text-5xl font-bold mt-3 leading-tight">Your Journeys, curated.</h1>
            <p className="text-white/70 mt-2 text-sm">Every journey you’ve ever crafted — alive in one command center.</p>
          </div>
          <Link href="/circle/create" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full circle-btn-primary text-sm font-semibold w-full md:w-fit shrink-0">
            <Sparkles className="size-4" /> Create a Journey
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-6 md:mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 md:gap-3">
          <StatCard icon={Layers} label="Total journeys" value={stats.total || 0} />
          <StatCard icon={Globe} label="Published" value={stats.published || 0} />
          <StatCard icon={FileText} label="Drafts" value={stats.drafts || 0} />
          <StatCard icon={Eye} label="Total views" value={stats.totalViews || 0} />
          <StatCard icon={Users} label="Bookings" value={stats.bookings || 0} />
          <StatCard icon={Wallet} label="Revenue" value={formatINR(stats.revenue || 0)} isText />
        </div>

        {/* Tabs — mobile: horizontal scroll with fade edges; desktop: pill row */}
        <div className="mt-6 md:mt-8 circle-tabs-wrap">
          <div className="circle-tabs-scroll" role="tablist" aria-label="Studio sections">
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  role="tab"
                  aria-selected={active}
                  className={`circle-tab ${active ? 'is-active' : ''}`}
                >
                  <Icon className="size-[15px] shrink-0" />
                  <span className="circle-tab-label">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="mt-8">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 rounded-3xl circle-glass animate-pulse" />)}
            </div>
          ) : (
            <>
              {tab === 'published' && <JourneyGrid list={published} empty="Nothing published yet." onShare={share} onDelete={doDelete} onPublish={doPublish} onUnpublish={doUnpublish} onArchive={doArchive} busyId={busyId} />}
              {tab === 'drafts' && <JourneyGrid list={drafts} empty="No drafts. Start one and save as draft." onShare={share} onDelete={doDelete} onPublish={doPublish} onArchive={doArchive} busyId={busyId} />}
              {tab === 'private' && <JourneyGrid list={priv} empty="No private, invite-only or scheduled journeys." onShare={share} onDelete={doDelete} onPublish={doPublish} onArchive={doArchive} busyId={busyId} />}
              {tab === 'archived' && <JourneyGrid list={archived} empty="No archived journeys." onShare={share} onDelete={doDelete} onRestore={doRestore} busyId={busyId} archivedView />}
              {tab === 'services' && <ServicesTab journeys={journeys} />}
              {tab === 'analytics' && <AnalyticsTab journeys={journeys} stats={stats} />}
              {tab === 'requests' && <RequestsTab onChange={load} />}
              {tab === 'members' && <MembersTab />}
              {tab === 'messages' && <MessagesTab />}
              {tab === 'timeline' && <TimelineTab />}
            </>
          )}
        </div>
      </div>

      <ShareSheet open={!!shareUrl} onClose={() => setShareUrl('')} url={shareUrl} title={shareTitle} />
    </main>
  );
}

function StatCard({ icon: Icon, label, value, isText = false }) {
  return (
    <div className="circle-glass circle-card p-3.5 md:p-5">
      <div className="flex items-center gap-2 text-white/60 text-[11px] md:text-xs min-w-0">
        <Icon className="size-3.5 shrink-0" /> <span className="truncate">{label}</span>
      </div>
      <div className={`display font-bold mt-1.5 md:mt-2 circle-grad-text ${isText ? 'text-lg md:text-xl truncate' : 'text-2xl md:text-3xl'}`}>{value}</div>
    </div>
  );
}

function JourneyGrid({ list, empty, onShare, onDelete, onPublish, onUnpublish, onArchive, onRestore, archivedView = false, busyId }) {
  if (!list || list.length === 0) {
    return (
      <div className="circle-glass circle-card p-10 text-center">
        <div className="text-white/70">{empty}</div>
        <Link href="/circle/create" className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full circle-btn-primary text-sm font-semibold">
          <Sparkles className="size-4" /> Create a Journey
        </Link>
      </div>
    );
  }
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
      {list.map(j => (
        <StudioCard
          key={j.id}
          j={j}
          busy={busyId === j.id}
          onShare={() => onShare(j)}
          onDelete={() => onDelete(j.id)}
          onPublish={onPublish ? () => onPublish(j.id) : null}
          onUnpublish={onUnpublish ? () => onUnpublish(j.id) : null}
          onArchive={onArchive ? () => onArchive(j.id) : null}
          onRestore={onRestore ? () => onRestore(j.id) : null}
          archivedView={archivedView}
        />
      ))}
    </div>
  );
}

function StudioCard({ j, onShare, onDelete, onPublish, onUnpublish, onArchive, onRestore, archivedView, busy }) {
  const th = themeLabel(j.theme);
  const isPublic = j.visibility === 'public';
  const isDraft = j.visibility === 'draft';
  const isArchived = j.visibility === 'archived';
  return (
    <div className={`relative rounded-3xl overflow-hidden border border-white/10 circle-magnetic bg-white/5 ${busy ? 'opacity-70 pointer-events-none' : ''}`}>
      <div className="relative aspect-[16/10]">
        {j.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img loading="lazy" decoding="async" src={j.cover} alt={j.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/40 via-violet-500/40 to-pink-400/40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <div className="absolute top-3 left-3 circle-chip !text-[10px]">{th.emoji} {th.label}</div>
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 text-[10px] uppercase tracking-wider">{j.visibility}</div>
        <div className="absolute bottom-3 left-3 right-3">
          <div className="display text-lg font-bold line-clamp-2">{j.name}</div>
          <div className="text-[11px] text-white/70 mt-1">{j.destination?.name || 'Multi-city'} · {j.services?.length || 0} services</div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between text-xs text-white/70 gap-2">
          <span className="inline-flex items-center gap-1 min-w-0"><Eye className="size-3 shrink-0" /> <span className="truncate">{j.viewsCount || 0}</span></span>
          <span className="inline-flex items-center gap-1 min-w-0"><Users className="size-3 shrink-0" /> <span className="truncate">{j.maxMembers}</span></span>
          <span className="inline-flex items-center gap-1 min-w-0"><Wallet className="size-3 shrink-0" /> <span className="truncate">{formatINR(j.estimate?.perPerson || 0)}</span></span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {!isArchived && (
            <Link href={`/circle/j/${j.slug}`} className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1 px-3 py-2 rounded-full circle-btn-ghost text-xs font-semibold">
              <Eye className="size-3.5" /> Preview
            </Link>
          )}
          {isPublic && (
            <Link href={`/circle/j/${j.slug}`} className="inline-flex items-center gap-1 px-3 py-2 rounded-full circle-btn-ghost text-xs font-semibold shrink-0" aria-label="Edit">
              <Edit3 className="size-3.5" />
            </Link>
          )}
          {!isArchived && (
            <button onClick={onShare} aria-label="Share" className="inline-flex items-center gap-1 px-3 py-2 rounded-full circle-btn-ghost text-xs font-semibold shrink-0">
              <Share2 className="size-3.5" />
            </button>
          )}
          {onPublish && !isPublic && !isArchived && (
            <button onClick={onPublish} disabled={busy} className="inline-flex items-center gap-1 px-3 py-2 rounded-full circle-btn-primary text-xs font-semibold shrink-0 disabled:opacity-60">
              <Globe className="size-3.5" /> Publish
            </button>
          )}
          {onUnpublish && isPublic && (
            <button onClick={onUnpublish} disabled={busy} className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-white/5 border border-white/15 text-white/80 text-xs font-semibold shrink-0 hover:bg-white/10 disabled:opacity-60" aria-label="Unpublish">
              <Lock className="size-3.5" /> Unpublish
            </button>
          )}
          {onArchive && !isArchived && (
            <button onClick={onArchive} disabled={busy} className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-white/5 border border-white/15 text-white/80 text-xs font-semibold shrink-0 hover:bg-white/10 disabled:opacity-60" aria-label="Archive">
              <FileText className="size-3.5" /> Archive
            </button>
          )}
          {onRestore && isArchived && (
            <button onClick={onRestore} disabled={busy} className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1 px-3 py-2 rounded-full circle-btn-primary text-xs font-semibold disabled:opacity-60">
              <ArrowRight className="size-3.5 rotate-180" /> Restore
            </button>
          )}
          <button onClick={onDelete} disabled={busy} aria-label="Delete" className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-red-500/20 border border-red-500/30 text-red-200 text-xs font-semibold shrink-0 hover:bg-red-500/30 disabled:opacity-60">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ServicesTab({ journeys }) {
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

function AnalyticsTab({ journeys, stats }) {
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

function Metric({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-white/70 text-sm">{label}</div>
      <div className="font-bold display text-lg">{value}</div>
    </div>
  );
}

// ————————————————— Module 6 tabs —————————————————
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

function RequestsTab({ onChange }) {
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
                <img src={r.userAvatar} alt={r.userName} className="size-12 rounded-full object-cover" />
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

function MembersTab() {
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
                  <img src={m.userAvatar} alt={m.userName} className="size-10 rounded-full object-cover" />
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

function MessagesTab() {
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
                <img src={c.journey.cover} alt={c.journey.name} className="w-full h-full object-cover" />
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

function TimelineTab() {
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
