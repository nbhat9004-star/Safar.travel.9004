'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import CircleNav from '@/components/circle/CircleNav';
import ShareSheet from '@/components/circle/ShareSheet';
import { useAuth } from '@/lib/auth-context';
import { circleApi, themeLabel, formatINR, signInHref } from '@/lib/circle-api';
import { toast } from 'sonner';
import {
  Sparkles, Layers, Eye, Users, Wallet, Share2, Edit3, Trash2, Send, ArrowRight,
  Globe, Lock, Clock, FileText, TrendingUp, MessageCircle, Route
} from 'lucide-react';

const TABS = [
  { key: 'drafts', label: 'Drafts', icon: FileText },
  { key: 'published', label: 'Published', icon: Globe },
  { key: 'private', label: 'Private/Invite', icon: Lock },
  { key: 'services', label: 'Marketplace services', icon: Layers },
  { key: 'analytics', label: 'Analytics', icon: TrendingUp },
  { key: 'requests', label: 'Requests', icon: Send, locked: true },
  { key: 'members', label: 'Members', icon: Users, locked: true },
  { key: 'messages', label: 'Messages', icon: MessageCircle, locked: true },
  { key: 'timeline', label: 'Timeline', icon: Route, locked: true },
];

export default function Studio() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState('published');
  const [journeys, setJourneys] = useState([]);
  const [stats, setStats] = useState({ total: 0, drafts: 0, published: 0, private: 0, scheduled: 0, totalServices: 0, totalViews: 0 });
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState('');
  const [shareTitle, setShareTitle] = useState('');

  const load = () => {
    setLoading(true);
    circleApi.mine()
      .then(r => { setJourneys(r.journeys || []); setStats(r.stats || {}); })
      .catch(() => setJourneys([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (user) load(); }, [user]);

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

  const drafts = journeys.filter(j => j.visibility === 'draft');
  const published = journeys.filter(j => j.visibility === 'public');
  const priv = journeys.filter(j => j.visibility === 'private' || j.visibility === 'invite' || j.visibility === 'scheduled');

  const doDelete = async (id) => {
    if (!confirm('Delete this journey?')) return;
    try { await circleApi.deleteJourney(id); toast.success('Deleted'); load(); }
    catch (e) { toast.error(e.message || 'Delete failed'); }
  };

  const doPublish = async (id) => {
    try { await circleApi.setVisibility(id, 'public'); toast.success('Published'); load(); }
    catch (e) { toast.error(e.message || 'Publish failed'); }
  };

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
        <div className="mt-6 md:mt-8 grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
          <StatCard icon={Layers} label="Total journeys" value={stats.total || 0} />
          <StatCard icon={Globe} label="Published" value={stats.published || 0} />
          <StatCard icon={FileText} label="Drafts" value={stats.drafts || 0} />
          <StatCard icon={Eye} label="Total views" value={stats.totalViews || 0} />
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
                  className={`circle-tab ${active ? 'is-active' : ''} ${t.locked ? 'is-locked' : ''}`}
                >
                  <Icon className="size-[15px] shrink-0" />
                  <span className="circle-tab-label">{t.label}</span>
                  {t.locked && <span className="circle-tab-badge">M2</span>}
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
              {tab === 'published' && <JourneyGrid list={published} empty="Nothing published yet." onShare={share} onDelete={doDelete} onPublish={doPublish} />}
              {tab === 'drafts' && <JourneyGrid list={drafts} empty="No drafts. Start one and save as draft." onShare={share} onDelete={doDelete} onPublish={doPublish} />}
              {tab === 'private' && <JourneyGrid list={priv} empty="No private, invite-only or scheduled journeys." onShare={share} onDelete={doDelete} onPublish={doPublish} />}
              {tab === 'services' && <ServicesTab journeys={journeys} />}
              {tab === 'analytics' && <AnalyticsTab journeys={journeys} stats={stats} />}
              {(['requests', 'members', 'messages', 'timeline'].includes(tab)) && (
                <div className="circle-glass circle-card p-10 text-center">
                  <div className="text-4xl">⚡️</div>
                  <div className="display text-2xl font-bold mt-3">Arriving in Module 2</div>
                  <div className="text-white/60 text-sm mt-2 max-w-md mx-auto">Requests, member management, group messaging and interactive timelines are being crafted for the next chapter of Safar Circle.</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ShareSheet open={!!shareUrl} onClose={() => setShareUrl('')} url={shareUrl} title={shareTitle} />
    </main>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="circle-glass circle-card p-3.5 md:p-5">
      <div className="flex items-center gap-2 text-white/60 text-[11px] md:text-xs min-w-0">
        <Icon className="size-3.5 shrink-0" /> <span className="truncate">{label}</span>
      </div>
      <div className="display text-2xl md:text-3xl font-bold mt-1.5 md:mt-2 circle-grad-text">{value}</div>
    </div>
  );
}

function JourneyGrid({ list, empty, onShare, onDelete, onPublish }) {
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
      {list.map(j => <StudioCard key={j.id} j={j} onShare={() => onShare(j)} onDelete={() => onDelete(j.id)} onPublish={() => onPublish(j.id)} />)}
    </div>
  );
}

function StudioCard({ j, onShare, onDelete, onPublish }) {
  const th = themeLabel(j.theme);
  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/10 circle-magnetic bg-white/5">
      <div className="relative aspect-[16/10]">
        {j.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={j.cover} alt={j.name} className="absolute inset-0 w-full h-full object-cover" />
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
          <Link href={`/circle/j/${j.slug}`} className="flex-1 min-w-[110px] inline-flex items-center justify-center gap-1 px-3 py-2 rounded-full circle-btn-ghost text-xs font-semibold">
            <Eye className="size-3.5" /> Preview
          </Link>
          <button onClick={onShare} aria-label="Share" className="inline-flex items-center gap-1 px-3 py-2 rounded-full circle-btn-ghost text-xs font-semibold shrink-0">
            <Share2 className="size-3.5" />
          </button>
          {j.visibility !== 'public' && (
            <button onClick={onPublish} className="inline-flex items-center gap-1 px-3 py-2 rounded-full circle-btn-primary text-xs font-semibold shrink-0">
              <Globe className="size-3.5" /> Publish
            </button>
          )}
          <button onClick={onDelete} aria-label="Delete" className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-red-500/20 border border-red-500/30 text-red-200 text-xs font-semibold shrink-0">
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
                  <img src={s.image} alt="" className="size-10 rounded-lg object-cover" />
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
