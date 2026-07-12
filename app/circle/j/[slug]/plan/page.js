'use client';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import CircleNav from '@/components/circle/CircleNav';
import { circleApi } from '@/lib/circle-api';
import { useAuth } from '@/lib/auth-context';
import {
  ArrowLeft, LayoutDashboard, CalendarDays, ListChecks, BarChart3, MessageSquare, Images,
  Users, Sun, Sunset, Moon, Sunrise, Plus, Trash2, Edit3, Check, X, Send, Loader2, MapPin,
  Clock, StickyNote, ChevronRight, ImagePlus, Vote, Lock, Sparkles, ThumbsUp, CheckCircle2,
  Circle as CircleIcon, Upload
} from 'lucide-react';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'itinerary', label: 'Itinerary', icon: CalendarDays },
  { key: 'checklist', label: 'Checklist', icon: ListChecks },
  { key: 'polls', label: 'Polls', icon: BarChart3 },
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'gallery', label: 'Gallery', icon: Images },
];

const SLOTS = [
  { key: 'morning', label: 'Morning', icon: Sunrise, hue: 'from-amber-400 to-orange-400' },
  { key: 'afternoon', label: 'Afternoon', icon: Sun, hue: 'from-yellow-300 to-emerald-400' },
  { key: 'evening', label: 'Evening', icon: Sunset, hue: 'from-pink-400 to-violet-400' },
  { key: 'night', label: 'Night', icon: Moon, hue: 'from-indigo-400 to-fuchsia-500' },
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
          <Link href="/circle/discover" className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full circle-btn-primary text-sm font-semibold">
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
          <Link href={`/circle/j/${journey.slug}`} className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full circle-btn-primary text-sm font-semibold">
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
        <Link href={`/circle/j/${journey.slug}`} className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm">
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
              <Link href={`/circle/j/${journey.slug}/members`} className="hover:text-white">Manage members</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="max-w-6xl mx-auto px-4 md:px-5 mt-5">
        <div className="flex overflow-x-auto no-scrollbar gap-2 -mx-1 px-1">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition ${active ? 'circle-btn-primary' : 'circle-btn-ghost'}`}
              >
                <Icon className="size-4" /> {t.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Tab content */}
      <section className="max-w-6xl mx-auto px-4 md:px-5 mt-6">
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
// DASHBOARD
// ============================================================================
function DashboardTab({ journeyId, journey, onJumpTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    circleApi.dashboard(journeyId).then(r => setData(r.widgets)).catch(() => setData(null)).finally(() => setLoading(false));
  }, [journeyId]);

  if (loading) return <div className="grid md:grid-cols-3 gap-4">{Array.from({length: 6}).map((_, i) => <div key={i} className="h-36 rounded-2xl circle-glass animate-pulse" />)}</div>;
  if (!data) return <EmptyState icon={Sparkles} title="Nothing to show yet" hint="Start planning to see your dashboard fill up." />;

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
        <Link href={`/circle/j/${journey.slug}/members`} className="mt-3 inline-flex items-center gap-1 text-xs text-white/70 hover:text-white">
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

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="circle-glass circle-card p-10 text-center">
      <Icon className="size-8 mx-auto text-white/60" />
      <div className="font-semibold mt-2">{title}</div>
      <div className="text-xs text-white/60 mt-1">{hint}</div>
    </div>
  );
}

// ============================================================================
// ITINERARY
// ============================================================================
function ItineraryTab({ journeyId, canEdit, members }) {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await circleApi.getItinerary(journeyId);
      setDays(r.itinerary?.days || []);
    } finally { setLoading(false); }
  }, [journeyId]);

  useEffect(() => { load(); }, [load]);

  const maxDay = days.length ? Math.max(...days.map(d => d.day)) : 0;

  const addDay = () => {
    setCreating({ day: maxDay + 1, timeSlot: 'morning', location: '', activity: '', description: '', meetingTime: '', notes: '', assignedTo: [] });
  };
  const addBlock = (day, slot) => {
    setCreating({ day, timeSlot: slot, location: '', activity: '', description: '', meetingTime: '', notes: '', assignedTo: [] });
  };

  const saveBlock = async (payload) => {
    try {
      if (payload._id) {
        await circleApi.updateBlock(journeyId, payload._id, payload);
      } else {
        await circleApi.addBlock(journeyId, payload);
      }
      setEditing(null); setCreating(null);
      await load();
      toast.success('Saved');
    } catch (e) { toast.error(e.message || 'Failed'); }
  };

  const removeBlock = async (blockId) => {
    if (!confirm('Delete this block?')) return;
    try {
      await circleApi.deleteBlock(journeyId, blockId);
      await load();
      toast.success('Deleted');
    } catch (e) { toast.error(e.message || 'Failed'); }
  };

  if (loading) return <div className="h-64 rounded-2xl circle-glass animate-pulse" />;

  return (
    <div>
      {canEdit && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button onClick={addDay} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full circle-btn-primary text-sm font-semibold">
            <Plus className="size-4" /> Add Day
          </button>
        </div>
      )}

      {days.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No itinerary yet" hint={canEdit ? 'Add Day 1 to start planning.' : 'The curator hasn\'t added an itinerary yet.'} />
      ) : (
        <div className="space-y-6">
          {days.slice().sort((a, b) => a.day - b.day).map(d => (
            <div key={d.day} className="circle-glass circle-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="circle-chip">Day {d.day}</div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {SLOTS.map(s => {
                  const blocks = d[s.key] || [];
                  const Icon = s.icon;
                  return (
                    <div key={s.key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`inline-flex items-center gap-2 text-sm font-semibold bg-gradient-to-r ${s.hue} bg-clip-text text-transparent`}>
                          <Icon className="size-4 text-white/70" /> {s.label}
                        </div>
                        {canEdit && (
                          <button onClick={() => addBlock(d.day, s.key)} className="text-white/60 hover:text-white text-xs inline-flex items-center gap-1"><Plus className="size-3.5" /> Add</button>
                        )}
                      </div>
                      {blocks.length === 0 ? (
                        <div className="text-white/40 text-xs italic">Nothing planned</div>
                      ) : (
                        <div className="space-y-3">
                          {blocks.map(b => (
                            <BlockCard key={b.id} block={b} canEdit={canEdit} onEdit={() => setEditing({ ...b, _id: b.id, day: d.day, timeSlot: s.key })} onDelete={() => removeBlock(b.id)} members={members} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <BlockEditorModal
          block={editing || creating}
          members={members}
          onClose={() => { setEditing(null); setCreating(null); }}
          onSave={saveBlock}
          maxDay={maxDay}
        />
      )}
    </div>
  );
}

function BlockCard({ block, canEdit, onEdit, onDelete, members }) {
  const assignedNames = useMemo(() => {
    if (!block.assignedTo?.length || !members) return [];
    const pool = [
      { userId: members.owner?.userId, name: members.owner?.name },
      ...(members.coCurators || []).map(m => ({ userId: m.userId, name: m.userName })),
      ...(members.travelers || []).map(m => ({ userId: m.userId, name: m.userName })),
    ];
    return block.assignedTo.map(uid => pool.find(p => p.userId === uid)?.name).filter(Boolean);
  }, [block, members]);

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm">{block.activity || 'Untitled'}</div>
          {block.location && <div className="text-xs text-white/60 mt-0.5 inline-flex items-center gap-1"><MapPin className="size-3" /> {block.location}</div>}
          {block.meetingTime && <div className="text-xs text-white/60 mt-0.5 inline-flex items-center gap-1"><Clock className="size-3" /> {block.meetingTime}</div>}
        </div>
        {canEdit && (
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-1.5 rounded-full hover:bg-white/10"><Edit3 className="size-3.5" /></button>
            <button onClick={onDelete} className="p-1.5 rounded-full hover:bg-red-500/20 text-red-300"><Trash2 className="size-3.5" /></button>
          </div>
        )}
      </div>
      {block.description && <div className="text-xs text-white/70 mt-2 whitespace-pre-line">{block.description}</div>}
      {block.notes && <div className="text-xs text-white/50 mt-2 inline-flex items-start gap-1"><StickyNote className="size-3 mt-0.5" /> {block.notes}</div>}
      {assignedNames.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {assignedNames.map((n, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-400/20">{n}</span>)}
        </div>
      )}
    </div>
  );
}

function BlockEditorModal({ block, members, onClose, onSave, maxDay }) {
  const [b, setB] = useState(block);
  const [saving, setSaving] = useState(false);
  const pool = useMemo(() => {
    if (!members) return [];
    return [
      { userId: members.owner?.userId, name: members.owner?.name, role: 'Curator' },
      ...(members.coCurators || []).map(m => ({ userId: m.userId, name: m.userName, role: 'Co-Curator' })),
      ...(members.travelers || []).map(m => ({ userId: m.userId, name: m.userName, role: 'Traveler' })),
    ].filter(p => p.userId);
  }, [members]);

  const toggleMember = (uid) => {
    setB(prev => ({ ...prev, assignedTo: prev.assignedTo?.includes(uid) ? prev.assignedTo.filter(x => x !== uid) : [...(prev.assignedTo || []), uid] }));
  };

  const submit = async () => {
    if (!b.activity && !b.location) { toast.error('Activity or location required'); return; }
    setSaving(true);
    await onSave(b);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-lg circle-glass-strong rounded-t-3xl sm:rounded-3xl p-6 text-white border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <div className="circle-chip">{b._id ? 'Edit block' : 'New block'}</div>
            <h3 className="display text-xl font-bold mt-2">Day {b.day} · <span className="capitalize">{b.timeSlot}</span></h3>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1"><X className="size-5" /></button>
        </div>

        <div className="mt-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="circle-label mb-1">Day</div>
              <input type="number" min={1} max={30} value={b.day} onChange={e => setB({ ...b, day: Math.max(1, Number(e.target.value) || 1) })} className="w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25" />
            </div>
            <div>
              <div className="circle-label mb-1">Time slot</div>
              <select value={b.timeSlot} onChange={e => setB({ ...b, timeSlot: e.target.value })} className="w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25">
                {SLOTS.map(s => <option key={s.key} value={s.key} className="bg-slate-900">{s.label}</option>)}
              </select>
            </div>
          </div>
          <Field label="Activity"><input value={b.activity} onChange={e => setB({ ...b, activity: e.target.value })} placeholder="e.g. Sunrise hike" className="w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25" /></Field>
          <Field label="Location"><input value={b.location} onChange={e => setB({ ...b, location: e.target.value })} placeholder="e.g. Dal Lake Boulevard" className="w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25" /></Field>
          <div className="grid grid-cols-1 gap-3">
            <Field label="Meeting time"><input type="time" value={b.meetingTime || ''} onChange={e => setB({ ...b, meetingTime: e.target.value })} className="w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25" /></Field>
          </div>
          <Field label="Description">
            <textarea value={b.description} onChange={e => setB({ ...b, description: e.target.value.slice(0, 800) })} placeholder="What are we doing?" className="w-full min-h-[80px] rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25 resize-none" />
          </Field>
          <Field label="Notes"><input value={b.notes} onChange={e => setB({ ...b, notes: e.target.value.slice(0, 400) })} placeholder="Optional notes" className="w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25" /></Field>
          {pool.length > 0 && (
            <div>
              <div className="circle-label mb-1">Assign members</div>
              <div className="flex flex-wrap gap-2">
                {pool.map(p => {
                  const on = b.assignedTo?.includes(p.userId);
                  return (
                    <button key={p.userId} onClick={() => toggleMember(p.userId)} className={`text-xs px-3 py-1.5 rounded-full border ${on ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200' : 'bg-white/5 border-white/10 text-white/70'}`}>
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-full circle-btn-ghost text-sm font-semibold">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 px-4 py-2.5 rounded-full circle-btn-primary text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="circle-label mb-1">{label}</div>
      {children}
    </div>
  );
}

// ============================================================================
// CHECKLIST
// ============================================================================
function ChecklistTab({ journeyId, canEdit, members }) {
  const [items, setItems] = useState([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await circleApi.getChecklist(journeyId);
      setItems(r.items || []); setProgress(r.progress || 0);
    } finally { setLoading(false); }
  }, [journeyId]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const t = newTitle.trim();
    if (!t) return;
    try {
      await circleApi.addChecklistItem(journeyId, { title: t });
      setNewTitle(''); setAdding(false);
      await load();
    } catch (e) { toast.error(e.message || 'Failed'); }
  };

  const toggle = async (item) => {
    try {
      await circleApi.updateChecklistItem(journeyId, item.id, { completed: !item.completed });
      await load();
    } catch (e) { toast.error(e.message || 'Failed'); }
  };

  const remove = async (item) => {
    if (!confirm('Delete this item?')) return;
    try {
      await circleApi.deleteChecklistItem(journeyId, item.id);
      await load();
    } catch (e) { toast.error(e.message || 'Failed'); }
  };

  if (loading) return <div className="h-64 rounded-2xl circle-glass animate-pulse" />;

  return (
    <div className="space-y-4">
      <div className="circle-glass circle-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="circle-label">Packing progress</div>
            <div className="display text-2xl font-bold mt-1">{progress}%</div>
          </div>
          <div className="text-xs text-white/60">{items.filter(i => i.completed).length} of {items.length} done</div>
        </div>
        <ProgressBar value={progress} colorClass="bg-gradient-to-r from-emerald-400 via-violet-400 to-pink-400" />
      </div>

      {canEdit && (
        <div className="circle-glass circle-card p-4">
          {adding ? (
            <div className="flex gap-2">
              <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value.slice(0, 140))} placeholder="e.g. Power bank" onKeyDown={e => e.key === 'Enter' && add()} className="flex-1 rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25" />
              <button onClick={add} className="px-4 py-2 rounded-full circle-btn-primary text-sm font-semibold">Add</button>
              <button onClick={() => { setAdding(false); setNewTitle(''); }} className="px-3 py-2 rounded-full circle-btn-ghost text-sm">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full circle-btn-primary text-sm font-semibold">
              <Plus className="size-4" /> Add item
            </button>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState icon={ListChecks} title="Nothing to pack yet" hint={canEdit ? 'Add your first item above.' : 'The curator hasn\'t added items yet.'} />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {items.map(item => (
            <div key={item.id} className="circle-glass circle-card p-4 flex items-start gap-3">
              <button onClick={() => toggle(item)} className={`size-6 shrink-0 rounded-full grid place-items-center border transition ${item.completed ? 'bg-emerald-500/30 border-emerald-400' : 'bg-white/5 border-white/20'}`}>
                {item.completed && <Check className="size-4 text-emerald-200" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm ${item.completed ? 'line-through text-white/50' : ''}`}>{item.title}</div>
                <div className="text-[11px] text-white/50 mt-0.5">
                  Added by {item.createdByName}
                  {item.completed && item.completedByName && ` · Done by ${item.completedByName}`}
                </div>
              </div>
              {canEdit && (
                <button onClick={() => remove(item)} className="text-white/50 hover:text-red-300 p-1"><Trash2 className="size-3.5" /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// POLLS
// ============================================================================
function PollsTab({ journeyId, canManage }) {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await circleApi.getPolls(journeyId);
      setPolls(r.polls || []);
    } finally { setLoading(false); }
  }, [journeyId]);
  useEffect(() => { load(); }, [load]);

  const vote = async (pollId, optionId) => {
    try { await circleApi.votePoll(journeyId, pollId, optionId); await load(); } catch (e) { toast.error(e.message || 'Failed'); }
  };
  const close = async (pollId) => {
    if (!confirm('Close this poll? Voting will stop.')) return;
    try { await circleApi.closePoll(journeyId, pollId); await load(); toast.success('Poll closed'); } catch (e) { toast.error(e.message || 'Failed'); }
  };
  const remove = async (pollId) => {
    if (!confirm('Delete this poll?')) return;
    try { await circleApi.deletePoll(journeyId, pollId); await load(); toast.success('Deleted'); } catch (e) { toast.error(e.message || 'Failed'); }
  };

  if (loading) return <div className="h-64 rounded-2xl circle-glass animate-pulse" />;

  return (
    <div className="space-y-4">
      {canManage && (
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full circle-btn-primary text-sm font-semibold">
          <Plus className="size-4" /> Create Poll
        </button>
      )}
      {polls.length === 0 ? (
        <EmptyState icon={Vote} title="No polls yet" hint={canManage ? 'Ask the group what they want to do!' : 'Only curators can create polls.'} />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {polls.map(p => (
            <PollCard key={p.id} poll={p} onVote={(oid) => vote(p.id, oid)} canManage={canManage} onClose={() => close(p.id)} onDelete={() => remove(p.id)} />
          ))}
        </div>
      )}
      {creating && <NewPollModal onClose={() => setCreating(false)} onCreate={async (payload) => { try { await circleApi.createPoll(journeyId, payload); setCreating(false); await load(); toast.success('Poll created'); } catch (e) { toast.error(e.message || 'Failed'); } }} />}
    </div>
  );
}

function PollCard({ poll, onVote, canManage, onClose, onDelete }) {
  const winning = poll.winning;
  return (
    <div className="circle-glass circle-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-white/60">{poll.createdByName} · {new Date(poll.createdAt).toLocaleDateString()}</div>
          <div className="font-semibold mt-1">{poll.question}</div>
        </div>
        <div className="flex items-center gap-1">
          {poll.closed && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300">Closed</span>}
          {canManage && !poll.closed && <button onClick={onClose} title="Close" className="p-1.5 rounded-full hover:bg-white/10"><Lock className="size-3.5" /></button>}
          {canManage && <button onClick={onDelete} title="Delete" className="p-1.5 rounded-full hover:bg-red-500/20 text-red-300"><Trash2 className="size-3.5" /></button>}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {poll.options.map(o => {
          const pct = poll.totalVotes ? Math.round((o.count / poll.totalVotes) * 100) : 0;
          const isMine = poll.myVoteOptionId === o.id;
          const isWinner = winning && winning.count > 0 && winning.id === o.id;
          return (
            <button
              key={o.id}
              disabled={poll.closed}
              onClick={() => !poll.closed && onVote(o.id)}
              className={`w-full relative overflow-hidden rounded-2xl border text-left px-4 py-2.5 transition ${isMine ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'} ${poll.closed ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className={`absolute inset-y-0 left-0 ${isMine ? 'bg-emerald-500/15' : 'bg-white/[0.05]'}`} style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {isMine ? <CheckCircle2 className="size-4 text-emerald-300" /> : <CircleIcon className="size-4 text-white/40" />}
                  <span className="text-sm font-medium truncate">{o.text}</span>
                  {isWinner && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 ml-1">Leading</span>}
                </div>
                <div className="text-xs text-white/70 shrink-0">{o.count} · {pct}%</div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="text-xs text-white/50 mt-3">{poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}</div>
    </div>
  );
}

function NewPollModal({ onClose, onCreate }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const cleaned = options.map(o => o.trim()).filter(Boolean);
    if (!question.trim() || cleaned.length < 2) { toast.error('Add a question and at least 2 options'); return; }
    setSaving(true);
    await onCreate({ question: question.trim(), options: cleaned });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md circle-glass-strong rounded-t-3xl sm:rounded-3xl p-6 text-white border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <div className="circle-chip">New poll</div>
            <h3 className="display text-xl font-bold mt-2">Ask the group</h3>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1"><X className="size-5" /></button>
        </div>
        <div className="mt-5 space-y-3">
          <Field label="Question"><input value={question} onChange={e => setQuestion(e.target.value.slice(0, 200))} placeholder="e.g. Which hotel?" className="w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25" /></Field>
          <div>
            <div className="circle-label mb-1">Options ({options.length})</div>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <input value={o} onChange={e => setOptions(prev => prev.map((x, j) => j === i ? e.target.value.slice(0, 120) : x))} placeholder={`Option ${i + 1}`} className="flex-1 rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25" />
                  {options.length > 2 && <button onClick={() => setOptions(prev => prev.filter((_, j) => j !== i))} className="text-white/50 hover:text-red-300 p-1"><X className="size-4" /></button>}
                </div>
              ))}
              {options.length < 8 && <button onClick={() => setOptions(prev => [...prev, ''])} className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1"><Plus className="size-3.5" /> Add option</button>}
            </div>
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-full circle-btn-ghost text-sm font-semibold">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 px-4 py-2.5 rounded-full circle-btn-primary text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CHAT
// ============================================================================
function ChatTab({ journeyId, me }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const r = await circleApi.getChat(journeyId, { limit: 100 });
      setMessages(r.messages || []);
    } catch (e) { toast.error(e.message || 'Failed to load chat'); }
    finally { setLoading(false); }
  }, [journeyId]);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      const r = await circleApi.sendChat(journeyId, t);
      setText('');
      setMessages(prev => [...prev, r.message]);
    } catch (e) { toast.error(e.message || 'Failed'); }
    finally { setSending(false); }
  };

  const del = async (mid) => {
    if (!confirm('Delete this message?')) return;
    try { await circleApi.deleteChatMessage(journeyId, mid); setMessages(prev => prev.filter(m => m.id !== mid)); } catch (e) { toast.error(e.message || 'Failed'); }
  };

  return (
    <div className="circle-glass circle-card p-0 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 260px)', minHeight: 400 }}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? <div className="text-white/50 text-sm">Loading…</div> : messages.length === 0 ? (
          <div className="text-center text-white/50 text-sm py-10">No messages yet. Say hi 👋</div>
        ) : messages.map(m => {
          const mine = m.userId === me?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} gap-2`}>
              {!mine && (
                m.userAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" decoding="async" src={m.userAvatar} alt="" className="size-7 rounded-full mt-4" />
                ) : <div className="size-7 rounded-full bg-white/10 grid place-items-center text-[10px] mt-4">{(m.userName || '?').charAt(0).toUpperCase()}</div>
              )}
              <div className={`max-w-[75%] ${mine ? 'items-end' : 'items-start'} flex flex-col group`}>
                <div className="text-[10px] text-white/50 mb-0.5 px-1">{mine ? 'You' : m.userName} · {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div className={`relative rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-emerald-500/20 border border-emerald-400/25 text-white rounded-tr-sm' : 'bg-white/10 border border-white/10 rounded-tl-sm'}`}>
                  {m.text}
                  {mine && (
                    <button onClick={() => del(m.id)} className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 transition p-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-200"><Trash2 className="size-3" /></button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-white/10 p-3 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value.slice(0, 1000))}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Type a message…"
            className="flex-1 rounded-full bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-white/25"
          />
          <button onClick={send} disabled={sending || !text.trim()} className="p-2.5 rounded-full circle-btn-primary disabled:opacity-50">
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// GALLERY
// ============================================================================
function GalleryTab({ journeyId, me, canManage }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await circleApi.getGallery(journeyId); setImages(r.images || []); }
    finally { setLoading(false); }
  }, [journeyId]);
  useEffect(() => { load(); }, [load]);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Images only'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB per image'); return; }
    setUploading(true);
    try {
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      await circleApi.uploadImage(journeyId, { dataUrl });
      toast.success('Uploaded');
      await load();
    } catch (e) { toast.error(e.message || 'Upload failed'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const del = async (imgId) => {
    if (!confirm('Delete this image?')) return;
    try { await circleApi.deleteImage(journeyId, imgId); await load(); } catch (e) { toast.error(e.message || 'Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full circle-btn-primary text-sm font-semibold disabled:opacity-60">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} Upload photo
        </button>
        <div className="text-xs text-white/50">Max 5MB · JPG/PNG/WebP</div>
      </div>

      {loading ? <div className="h-64 rounded-2xl circle-glass animate-pulse" /> : images.length === 0 ? (
        <EmptyState icon={Images} title="No photos yet" hint="Be the first to add a memory." />
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
          {images.map(img => (
            <div key={img.id} className="relative group break-inside-avoid">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src={img.src} alt={img.caption || ''} onClick={() => setLightbox(img)} className="w-full rounded-2xl cursor-pointer hover:opacity-90 transition" />
              <div className="absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition">
                <div className="text-[10px] text-white/80 truncate">{img.userName} · {new Date(img.createdAt).toLocaleDateString()}</div>
              </div>
              {(img.userId === me?.id || canManage) && (
                <button onClick={() => del(img.id)} className="absolute top-1 right-1 p-1.5 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition text-red-200 hover:bg-red-500/30"><Trash2 className="size-3.5" /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20"><X className="size-5" /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" decoding="async" src={lightbox.src} alt="" className="max-w-full max-h-[90vh] rounded-2xl" />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-xs bg-black/40 backdrop-blur px-4 py-2 rounded-full">
            {lightbox.userName} · {new Date(lightbox.createdAt).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
}
