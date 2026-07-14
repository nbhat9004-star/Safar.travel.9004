'use client';
import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import CircleNav from '@/components/circle/CircleNav';
import { circleApi } from '@/lib/circle-api';
import { useAuth } from '@/lib/auth-context';
import {
  ArrowLeft, LayoutDashboard, CalendarDays, ListChecks, BarChart3, MessageSquare, Images,
  Sparkles, ChevronRight, Lock
} from 'lucide-react';

// PERF: Lazy-load heavy tab modules — only Dashboard ships in the initial bundle.
// The rest (Itinerary/Checklist/Polls/Chat/Gallery) are code-split into a
// separate chunk that loads on demand when the user opens that tab.
const TabSkeleton = () => <div className="h-64 rounded-2xl circle-glass animate-pulse" />;
const ItineraryTab = dynamic(() => import('./_tabs').then(m => ({ default: m.ItineraryTab })), { loading: TabSkeleton, ssr: false });
const ChecklistTab = dynamic(() => import('./_tabs').then(m => ({ default: m.ChecklistTab })), { loading: TabSkeleton, ssr: false });
const PollsTab     = dynamic(() => import('./_tabs').then(m => ({ default: m.PollsTab }),    ), { loading: TabSkeleton, ssr: false });
const ChatTab      = dynamic(() => import('./_tabs').then(m => ({ default: m.ChatTab })),      { loading: TabSkeleton, ssr: false });
const GalleryTab   = dynamic(() => import('./_tabs').then(m => ({ default: m.GalleryTab })),   { loading: TabSkeleton, ssr: false });

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'itinerary', label: 'Itinerary', icon: CalendarDays },
  { key: 'checklist', label: 'Checklist', icon: ListChecks },
  { key: 'polls', label: 'Polls', icon: BarChart3 },
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'gallery', label: 'Gallery', icon: Images },
];

export default function JourneyWorkspace() {
  const params = useParams();
  const slug = params?.slug;
  const search = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [journey, setJourney] = useState(null);
  const [members, setMembers] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialTab = (search?.get('tab') && TABS.find(t => t.key === search.get('tab'))?.key) || 'dashboard';
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const j = await circleApi.getBySlug(slug);
        setJourney(j.journey);
        const m = await circleApi.getMembers(j.journey.id);
        setMembers(m);
      } catch (e) {
        setJourney(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const canView = useMemo(() => {
    if (!user || !journey || !members) return false;
    if (user.id === journey.curatorId) return true;
    if (user.role === 'admin' || user.role === 'super_admin') return true;
    return members.myMembership?.status === 'accepted';
  }, [user, journey, members]);

  if (loading || authLoading) {
    return (
      <main className="min-h-screen text-white pt-24">
        <CircleNav />
        <div className="max-w-6xl mx-auto px-5">
          <div className="h-24 rounded-3xl circle-glass animate-pulse mt-6" />
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 rounded-2xl circle-glass animate-pulse" />)}
          </div>
        </div>
      </main>
    );
  }

  if (!journey) {
    return (
      <main className="min-h-screen text-white pt-24">
        <CircleNav />
        <div className="max-w-lg mx-auto px-5 pt-20 text-center circle-glass circle-card p-10">
          <div className="text-5xl">🧭</div>
          <div className="display text-2xl font-bold mt-3">Journey not found</div>
          <Link href="/discover" className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full circle-btn-primary text-sm font-semibold">
            Discover journeys
          </Link>
        </div>
      </main>
    );
  }

  if (!canView) {
    return (
      <main className="min-h-screen text-white pt-24">
        <CircleNav />
        <div className="max-w-lg mx-auto px-5 pt-20 text-center circle-glass circle-card p-10">
          <Lock className="size-8 mx-auto text-white/60" />
          <div className="display text-2xl font-bold mt-3">Members only</div>
          <div className="text-white/70 text-sm mt-2">Join this journey to access the collaborative workspace.</div>
          <Link href={`/j/${journey.slug}`} className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full circle-btn-primary text-sm font-semibold">
            Back to journey <ChevronRight className="size-4" />
          </Link>
        </div>
      </main>
    );
  }

  const isCurator = user.id === journey.curatorId || user.role === 'admin' || user.role === 'super_admin';
  const isCoCurator = members?.myMembership?.role === 'co_curator';
  const canEdit = isCurator || isCoCurator;

  return (
    <main className="min-h-screen text-white pt-20 pb-32">
      <CircleNav />

      {/* Header */}
      <section className="max-w-6xl mx-auto px-4 md:px-5 mt-6">
        <Link href={`/j/${journey.slug}`} className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm">
          <ArrowLeft className="size-4" /> Back to journey
        </Link>
        <div className="mt-4 circle-glass circle-card p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <div className="circle-chip">Workspace</div>
            <h1 className="display text-2xl md:text-3xl font-bold mt-2 truncate">{journey.name}</h1>
            <div className="text-white/60 text-xs mt-1 flex flex-wrap items-center gap-2">
              <span>{isCurator ? 'Curator' : isCoCurator ? 'Co-Curator' : 'Traveler'}</span>
              <span>·</span>
              <span>{members?.acceptedCount || 1} member{(members?.acceptedCount || 1) !== 1 ? 's' : ''}</span>
              <span>·</span>
              <Link href={`/j/${journey.slug}/members`} className="hover:text-white">Manage members</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs — sticky below top nav on scroll, premium native-app feel on mobile */}
      <section className="sticky top-16 z-30 mt-5">
        <div className="workspace-tab-bar">
          <div className="workspace-tab-bar-inner">
            <div className="max-w-6xl mx-auto px-2 md:px-5">
              <div className="workspace-tabs-scroll no-scrollbar" role="tablist" aria-label="Workspace sections">
                {TABS.map(t => {
                  const Icon = t.icon;
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTab(t.key)}
                      className={`workspace-tab ${active ? 'is-active' : ''}`}
                    >
                      <Icon className="size-[15px] shrink-0" />
                      <span className="workspace-tab-label">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tab content */}
      <section className="max-w-6xl mx-auto px-4 md:px-5 mt-6 workspace-content">
        {tab === 'dashboard' && <DashboardTab journeyId={journey.id} journey={journey} onJumpTab={setTab} />}
        {tab === 'itinerary' && <ItineraryTab journeyId={journey.id} canEdit={canEdit} members={members} />}
        {tab === 'checklist' && <ChecklistTab journeyId={journey.id} canEdit={canEdit} members={members} />}
        {tab === 'polls' && <PollsTab journeyId={journey.id} canManage={isCurator} />}
        {tab === 'chat' && <ChatTab journeyId={journey.id} me={user} />}
        {tab === 'gallery' && <GalleryTab journeyId={journey.id} me={user} canManage={isCurator} />}
      </section>
    </main>
  );
}

// ============================================================================
// DASHBOARD (small; kept inline — it's the default tab shown on load)
// ============================================================================
function DashboardTab({ journeyId, journey, onJumpTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    circleApi.dashboard(journeyId).then(r => setData(r.widgets)).catch(() => setData(null)).finally(() => setLoading(false));
  }, [journeyId]);

  if (loading) return <div className="grid md:grid-cols-3 gap-4">{Array.from({length: 6}).map((_, i) => <div key={i} className="h-36 rounded-2xl circle-glass animate-pulse" />)}</div>;
  if (!data) return (
    <div className="circle-glass circle-card p-10 text-center">
      <Sparkles className="size-8 mx-auto text-white/60" />
      <div className="font-semibold mt-2">Nothing to show yet</div>
      <div className="text-xs text-white/60 mt-1">Start planning to see your dashboard fill up.</div>
    </div>
  );

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Widget onClick={() => onJumpTab('itinerary')} accent="from-emerald-400 to-teal-400">
        <div className="circle-label mb-1">Journey Progress</div>
        <div className="display text-3xl font-bold">{data.journeyProgress}%</div>
        <ProgressBar value={data.journeyProgress} />
        <div className="text-xs text-white/60 mt-2">{data.itineraryDays} day{data.itineraryDays !== 1 ? 's' : ''} · {data.itineraryBlocks} block{data.itineraryBlocks !== 1 ? 's' : ''} planned</div>
      </Widget>

      <Widget onClick={() => onJumpTab('checklist')} accent="from-violet-400 to-fuchsia-400">
        <div className="circle-label mb-1">Checklist</div>
        <div className="display text-3xl font-bold">{data.checklistProgress}%</div>
        <ProgressBar value={data.checklistProgress} colorClass="bg-gradient-to-r from-violet-400 to-fuchsia-400" />
        <div className="text-xs text-white/60 mt-2">{data.checklistDone} of {data.checklistTotal} items done</div>
      </Widget>

      <Widget accent="from-amber-300 to-pink-400">
        <div className="circle-label mb-1">Members</div>
        <div className="display text-3xl font-bold">{data.members.total}<span className="text-white/40 text-lg">/{data.members.capacity}</span></div>
        <div className="text-xs text-white/60 mt-2">{data.members.seatsRemaining} seat{data.members.seatsRemaining !== 1 ? 's' : ''} remaining</div>
        <Link href={`/j/${journey.slug}/members`} className="mt-3 inline-flex items-center gap-1 text-xs text-white/70 hover:text-white">
          Manage <ChevronRight className="size-3" />
        </Link>
      </Widget>

      <Widget accent="from-cyan-400 to-emerald-400">
        <div className="circle-label mb-1">Countdown</div>
        <div className="display text-3xl font-bold">{data.daysRemaining != null ? data.daysRemaining : '—'}</div>
        <div className="text-xs text-white/60 mt-2">Days until departure</div>
      </Widget>

      <Widget onClick={() => onJumpTab('polls')} accent="from-pink-400 to-red-400">
        <div className="circle-label mb-1">Latest Poll</div>
        {data.latestPoll ? (
          <>
            <div className="font-semibold text-sm line-clamp-2">{data.latestPoll.question}</div>
            <div className="text-xs text-white/60 mt-1">{data.latestPoll.totalVotes} vote{data.latestPoll.totalVotes !== 1 ? 's' : ''}{data.latestPoll.closed ? ' · closed' : ''}</div>
          </>
        ) : <div className="text-white/60 text-sm">No polls yet</div>}
      </Widget>

      <Widget onClick={() => onJumpTab('chat')} accent="from-sky-400 to-indigo-400">
        <div className="circle-label mb-1">Latest Chat</div>
        {data.latestChat?.length ? (
          <div className="space-y-1">
            {data.latestChat.slice(-2).map(m => (
              <div key={m.id} className="text-xs">
                <span className="text-white/70 font-semibold">{m.userName}:</span> <span className="text-white/80">{m.text.slice(0, 60)}</span>
              </div>
            ))}
          </div>
        ) : <div className="text-white/60 text-sm">No messages yet</div>}
      </Widget>

      <div className="md:col-span-3 circle-glass circle-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="circle-label">Gallery</div>
          <button onClick={() => onJumpTab('gallery')} className="text-xs text-white/70 hover:text-white inline-flex items-center gap-1">Open <ChevronRight className="size-3" /></button>
        </div>
        {data.galleryPreview?.length ? (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {data.galleryPreview.map(img => (
              // eslint-disable-next-line @next/next/no-img-element
              <img loading="lazy" decoding="async" key={img.id} src={img.src} alt={img.caption || ''} className="aspect-square object-cover rounded-xl" />
            ))}
          </div>
        ) : <div className="text-white/60 text-sm">No photos uploaded yet</div>}
      </div>
    </div>
  );
}

function Widget({ children, accent, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`circle-glass circle-card p-5 relative overflow-hidden ${onClick ? 'cursor-pointer hover:bg-white/[0.06] transition' : ''}`}
    >
      <div className={`absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl`} />
      <div className="relative">{children}</div>
    </div>
  );
}

function ProgressBar({ value, colorClass }) {
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden mt-2">
      <div className={`h-full rounded-full ${colorClass || 'bg-gradient-to-r from-emerald-400 to-teal-400'}`} style={{ width: `${Math.min(100, Math.max(0, value || 0))}%` }} />
    </div>
  );
}
