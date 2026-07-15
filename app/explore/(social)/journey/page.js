'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Route, Sparkles, Backpack, Wallet, Clock, MapPin, Plus, X, Trash2, Loader2, Wand2,
  ArrowRight, Check, Camera, Bike, Mountain, Car, Utensils, Users, ShoppingBag,
  Edit3, Send, Save, Eye, Bookmark, FileText,
} from 'lucide-react';
import AuroraBg from '@/components/explore/AuroraBg';
import BadgeChip from '@/components/explore/BadgeChip';
import { useAuth } from '@/lib/auth-context';

const JOURNEY_TYPES = [
  { id: 'journey',        label: 'Journey',         icon: Route,     theme: 'weekend_escape' },
  { id: 'meetup',         label: 'Meetup',          icon: Users,     theme: 'weekend_escape' },
  { id: 'road_trip',      label: 'Road trip',       icon: Car,       theme: 'road_trip' },
  { id: 'photography',    label: 'Photo walk',      icon: Camera,    theme: 'photography' },
  { id: 'bike_expedition',label: 'Bike expedition', icon: Bike,      theme: 'bike_expedition' },
  { id: 'camping',        label: 'Camping',         icon: Mountain,  theme: 'adventure' },
  { id: 'weekend_escape', label: 'Weekend escape',  icon: Sparkles,  theme: 'weekend_escape' },
  { id: 'food',           label: 'Food trail',      icon: Utensils,  theme: 'food' },
  { id: 'adventure',      label: 'Adventure',       icon: Mountain,  theme: 'adventure' },
];

const ORCHESTRA_SERVICES = [
  { id: 'stay',   label: 'Accommodation', icon: MapPin,   href: '/explore?cat=all',       desc: 'Houseboats, cabins, cottages' },
  { id: 'bike',   label: 'Bike rental',   icon: Bike,     href: '/explore?cat=transport', desc: 'Royal Enfield, Himalayan' },
  { id: 'car',    label: 'Car rental',    icon: Car,      href: '/explore?cat=transport', desc: 'Sedans, SUVs, drivers' },
  { id: 'guide',  label: 'Guide',         icon: Users,    href: '/explore?cat=tour',      desc: 'Certified locals' },
  { id: 'camp',   label: 'Camping',       icon: Mountain, href: '/explore?cat=camp',      desc: 'Glacier & meadow camps' },
  { id: 'exp',    label: 'Experiences',   icon: Sparkles, href: '/explore?cat=experience',desc: 'Shikara, Wazwan, culture' },
];

const TABS = [
  { id: 'create', label: 'Create Journey', icon: Plus },
  { id: 'mine',   label: 'My Journeys',    icon: Route },
  { id: 'planner',label: 'Trip Planner',   icon: Sparkles },
];

const DIFFICULTIES = ['easy','moderate','challenging','expert'];

function callAI(message) {
  return fetch('/api/ai-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) })
    .then(r => r.json()).then(j => j.reply || j.text || 'Journey Studio is warming up — try again in a moment.')
    .catch(() => 'Journey Studio is warming up — try again in a moment.');
}

const emptyForm = () => ({
  name: '',
  description: '',
  cover: '',
  destination: { name: 'Kashmir', district: '', state: 'Jammu & Kashmir', country: 'India' },
  startDate: '',
  endDate: '',
  maxMembers: 6,
  budget: 40000,
  theme: 'weekend_escape',
  difficulty: 'moderate',
  type: 'journey',
});

export default function ExploreJourneyPage() {
  return (
    <Suspense fallback={null}>
      <ExploreJourney />
    </Suspense>
  );
}

function ExploreJourney() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const initialTab = params.get('tab') || (params.get('edit') ? 'create' : 'create');
  const [tab, setTab] = useState(initialTab);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [mine, setMine] = useState([]);
  const [mineLoading, setMineLoading] = useState(false);

  // AI planner state (kept as-is, minor)
  const [pForm, setPForm] = useState({ destination: 'Kashmir', days: 5, budget: 40000, style: 'balanced', travelers: 2 });
  const [aiOut, setAiOut] = useState('');
  const [aiKind, setAiKind] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const loadMine = useCallback(async () => {
    if (!user) return;
    setMineLoading(true);
    try {
      const r = await fetch('/api/circle/journeys/mine');
      const j = await r.json();
      setMine(j.journeys || []);
    } catch {}
    setMineLoading(false);
  }, [user]);

  useEffect(() => { if (tab === 'mine') loadMine(); }, [tab, loadMine]);

  // Load journey to edit (?edit=id)
  useEffect(() => {
    const eid = params.get('edit');
    if (!eid) return;
    (async () => {
      try {
        const r = await fetch(`/api/circle/journeys/id/${eid}`);
        const j = await r.json();
        if (j.journey) {
          const jd = j.journey;
          setEditingId(jd.id);
          setForm({
            name: jd.name || '',
            description: jd.description || '',
            cover: jd.cover || '',
            destination: jd.destination || { name: 'Kashmir', country: 'India' },
            startDate: jd.startDate ? String(jd.startDate).slice(0, 10) : '',
            endDate: jd.endDate ? String(jd.endDate).slice(0, 10) : '',
            maxMembers: jd.maxMembers || 6,
            budget: jd.budget || 40000,
            theme: jd.theme || 'weekend_escape',
            difficulty: jd.difficulty || 'moderate',
            type: JOURNEY_TYPES.find(t => t.theme === jd.theme)?.id || 'journey',
          });
          setTab('create');
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveJourney = async (visibility) => {
    if (!user) { router.push('/?auth=1'); return; }
    if (!form.name || form.name.trim().length < 3) { setMsg('Journey title needs at least 3 characters'); return; }
    setBusy(visibility);
    setMsg('');
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        cover: form.cover.trim() || null,
        destination: form.destination,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        maxMembers: Number(form.maxMembers) || 6,
        budget: Number(form.budget) || null,
        theme: form.theme,
        difficulty: form.difficulty,
        visibility,
      };
      let r, j;
      if (editingId) {
        r = await fetch(`/api/circle/journeys/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Save failed');
      } else {
        r = await fetch('/api/circle/journeys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Save failed');
      }
      const saved = j.journey;
      if (visibility === 'public') {
        router.push(`/explore/j/${saved.slug}`);
      } else {
        setMsg(editingId ? 'Journey updated.' : 'Draft saved to My Journeys.');
        setEditingId(saved.id);
        loadMine();
      }
    } catch (e) {
      setMsg(e.message || 'Save failed');
    } finally { setBusy(''); }
  };

  const deleteJourney = async (id) => {
    if (!confirm('Delete this journey? This cannot be undone.')) return;
    await fetch(`/api/circle/journeys/${id}`, { method: 'DELETE' });
    loadMine();
    if (editingId === id) { setEditingId(''); setForm(emptyForm()); }
  };

  const publishExisting = async (id) => {
    await fetch(`/api/circle/journeys/${id}/visibility`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visibility: 'public' }) });
    loadMine();
  };

  const genAI = async (kind) => {
    setAiKind(kind); setAiLoading(true);
    const prompts = {
      itin: `Create a day-by-day ${pForm.days}-day itinerary for ${pForm.travelers} traveler(s) to ${pForm.destination} with a total budget of ₹${pForm.budget}. Travel style: ${pForm.style}. Format each day as "Day N — Title" then 3-4 bullet points with rough ₹ costs.`,
      pack: `Create a smart packing checklist for a ${pForm.days}-day ${pForm.style} trip to ${pForm.destination}. Group items into 4 categories.`,
      bud:  `Break down a ₹${pForm.budget} budget for ${pForm.travelers} traveler(s) on a ${pForm.days}-day ${pForm.style} trip to ${pForm.destination}. Split into stay, transport, food, experiences, buffer. Return as bulleted list with ₹ amounts and %.`,
    };
    setAiOut(await callAI(prompts[kind] || prompts.itin));
    setAiLoading(false);
  };

  return (
    <div className="relative">
      <section className="relative overflow-hidden pt-14 md:pt-20 pb-8">
        <AuroraBg />
        <div className="relative e-container e-fade-in">
          <div className="e-chip"><Route className="size-3 text-emerald-300" /> Journey</div>
          <h1 className="display font-bold mt-4 text-[clamp(2rem,5.6vw,4rem)] leading-tight max-w-3xl">Design a trip <span className="e-grad-text">worth remembering.</span></h1>
          <p className="mt-4 text-white/75 max-w-2xl">Draft privately, publish when ready, invite your tribe or open it to the community.</p>
        </div>
      </section>

      {/* Tabs */}
      <section className="relative e-container mb-6">
        <div className="flex items-center gap-2 overflow-x-auto e-scroll-x pb-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition border ${tab===id ? 'e-btn-primary border-transparent' : 'bg-white/[0.04] border-white/10 text-white/75 hover:bg-white/[0.08] hover:text-white'}`}>
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
      </section>

      {/* ---------------- CREATE / EDIT ---------------- */}
      {tab === 'create' && (
        <section className="relative e-container pb-12">
          {/* Journey type selector */}
          <div className="e-chip mb-3"><Sparkles className="size-3 text-emerald-300" /> Journey type</div>
          <div className="flex items-center gap-2 overflow-x-auto e-scroll-x pb-1 mb-5">
            {JOURNEY_TYPES.map(({ id, label, icon: Icon, theme }) => (
              <button
                key={id}
                onClick={() => setForm({ ...form, type: id, theme })}
                className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition border ${form.type===id ? 'e-btn-primary border-transparent' : 'e-btn-ghost'}`}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6">
            <div className="e-glass rounded-3xl p-6 md:p-8">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                {editingId ? <><Edit3 className="size-4 text-emerald-300" /> Edit journey</> : <><Plus className="size-4 text-emerald-300" /> New journey</>}
              </h3>
              <p className="text-white/60 text-sm mt-1">Fill the essentials — save as draft or publish for others to join.</p>

              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                <Field label="Title *" full>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chinar Autumn Ride" className="e-input" />
                </Field>
                <Field label="Destination *">
                  <input value={form.destination?.name || ''} onChange={e => setForm({ ...form, destination: { ...form.destination, name: e.target.value } })} placeholder="Srinagar, Gulmarg…" className="e-input" />
                </Field>
                <Field label="District">
                  <input value={form.destination?.district || ''} onChange={e => setForm({ ...form, destination: { ...form.destination, district: e.target.value } })} placeholder="Anantnag, Baramulla…" className="e-input" />
                </Field>
                <Field label="Start date">
                  <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="e-input" />
                </Field>
                <Field label="End date">
                  <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="e-input" />
                </Field>
                <Field label="Budget total (₹)">
                  <input type="number" min="0" value={form.budget} onChange={e => setForm({ ...form, budget: Number(e.target.value) })} className="e-input" />
                </Field>
                <Field label="Seats available">
                  <input type="number" min="1" max="50" value={form.maxMembers} onChange={e => setForm({ ...form, maxMembers: Number(e.target.value) })} className="e-input" />
                </Field>
                <Field label="Difficulty">
                  <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} className="e-input">
                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Cover image URL" full>
                  <input value={form.cover} onChange={e => setForm({ ...form, cover: e.target.value })} placeholder="https://…" className="e-input" />
                </Field>
                <Field label="Description" full>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} placeholder="What's the vibe? What will travelers experience?" className="e-input" />
                </Field>
              </div>

              {form.cover && (
                <div className="mt-4 relative w-full h-48 rounded-2xl overflow-hidden border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.cover} alt="Cover preview" className="w-full h-full object-cover" />
                </div>
              )}

              {msg && <div className="mt-4 text-xs" style={{ color: 'var(--e-text-muted)' }}>{msg}</div>}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => saveJourney('draft')}
                  disabled={!!busy}
                  className="e-btn-ghost rounded-full px-5 py-3 text-sm inline-flex items-center gap-2"
                >{busy==='draft' ? <Loader2 className="size-4 animate-spin"/> : <Save className="size-4" />} Save draft</button>
                <button
                  onClick={() => saveJourney('public')}
                  disabled={!!busy}
                  className="e-btn-primary rounded-full px-5 py-3 text-sm inline-flex items-center gap-2"
                >{busy==='public' ? <Loader2 className="size-4 animate-spin"/> : <Send className="size-4" />} {editingId ? 'Update & publish' : 'Publish journey'}</button>
                {editingId && (
                  <button
                    onClick={() => { setEditingId(''); setForm(emptyForm()); setMsg(''); }}
                    className="e-btn-ghost rounded-full px-5 py-3 text-sm inline-flex items-center gap-2"
                  ><X className="size-4" /> Cancel edit</button>
                )}
              </div>
            </div>

            {/* Side panel with Journey Orchestra */}
            <aside className="e-glass rounded-3xl p-6">
              <div className="e-chip"><Sparkles className="size-3 text-emerald-300" /> Journey Orchestra</div>
              <h3 className="font-semibold mt-3">Complete your journey</h3>
              <p className="mt-2 text-xs" style={{ color: 'var(--e-text-muted)' }}>Add real services from Marketplace after publishing.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {ORCHESTRA_SERVICES.map(s => (
                  <Link key={s.id} href={s.href} className="e-glass rounded-xl p-3 hover:-translate-y-0.5 transition text-xs">
                    <s.icon className="size-4 text-emerald-300" />
                    <div className="mt-1 font-semibold">{s.label}</div>
                    <div className="opacity-70">{s.desc}</div>
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        </section>
      )}

      {/* ---------------- MY JOURNEYS ---------------- */}
      {tab === 'mine' && (
        <section className="relative e-container pb-16">
          <div className="flex items-end justify-between mb-5">
            <div>
              <div className="e-chip"><Route className="size-3 text-emerald-300" /> My Journeys</div>
              <h2 className="display text-2xl md:text-3xl font-bold mt-3">Your trips</h2>
            </div>
            <button onClick={() => { setEditingId(''); setForm(emptyForm()); setTab('create'); }} className="e-btn-primary rounded-full px-4 py-2 text-sm inline-flex items-center gap-1.5"><Plus className="size-4" /> New</button>
          </div>
          {!user && <div className="e-glass rounded-3xl p-8 text-center">Please <Link href="/?auth=1" className="e-grad-text font-semibold">sign in</Link> to view your journeys.</div>}
          {user && mineLoading && <div className="text-center py-8"><Loader2 className="size-6 animate-spin mx-auto text-white/60" /></div>}
          {user && !mineLoading && mine.length === 0 && (
            <div className="e-glass rounded-3xl p-8 text-center">
              <div className="e-chip mx-auto">✨ Nothing yet</div>
              <p className="mt-4" style={{ color: 'var(--e-text-muted)' }}>Create your first journey — save as draft or publish for the community.</p>
            </div>
          )}
          {user && mine.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {mine.map(j => (
                <div key={j.id} className="e-card e-lift-in">
                  {j.cover && <div className="e-card-media relative"><Image src={j.cover} alt={j.name} fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover" unoptimized /></div>}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <BadgeChip type={j.visibility === 'public' ? 'new' : 'warn'}>{j.visibility}</BadgeChip>
                      {j.difficulty && <span className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--e-text-dim)' }}>{j.difficulty}</span>}
                    </div>
                    <div className="font-semibold line-clamp-2">{j.name}</div>
                    <div className="text-[11px] mt-1" style={{ color: 'var(--e-text-muted)' }}>{j.destination?.name || 'Kashmir'} · {j.maxMembers} seats</div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Link href={`/explore/j/${j.slug}`} className="e-btn-ghost rounded-full px-3 py-1.5 text-[11px] inline-flex items-center gap-1"><Eye className="size-3" /> View</Link>
                      <button onClick={() => { setEditingId(j.id); setForm({ name: j.name, description: j.description||'', cover: j.cover||'', destination: j.destination||{name:'Kashmir',country:'India'}, startDate: j.startDate ? String(j.startDate).slice(0,10) : '', endDate: j.endDate ? String(j.endDate).slice(0,10) : '', maxMembers: j.maxMembers||6, budget: j.budget||40000, theme: j.theme||'weekend_escape', difficulty: j.difficulty||'moderate', type: JOURNEY_TYPES.find(t=>t.theme===j.theme)?.id||'journey' }); setTab('create'); }} className="e-btn-ghost rounded-full px-3 py-1.5 text-[11px] inline-flex items-center gap-1"><Edit3 className="size-3" /> Edit</button>
                      {j.visibility !== 'public' && <button onClick={() => publishExisting(j.id)} className="e-btn-primary rounded-full px-3 py-1.5 text-[11px] inline-flex items-center gap-1"><Send className="size-3" /> Publish</button>}
                      <button onClick={() => deleteJourney(j.id)} className="e-btn-ghost rounded-full px-3 py-1.5 text-[11px] inline-flex items-center gap-1 text-rose-300"><Trash2 className="size-3" /> Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ---------------- AI TRIP PLANNER (kept from previous version) ---------------- */}
      {tab === 'planner' && (
        <section className="relative e-container pb-24">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 e-glass rounded-3xl p-6 md:p-8">
              <h3 className="font-semibold text-lg">AI trip inputs</h3>
              <p className="text-white/60 text-sm mt-1">Get a starter itinerary, packing list or budget breakdown in seconds.</p>
              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                <Field label="Destination"><input value={pForm.destination} onChange={e => setPForm({ ...pForm, destination: e.target.value })} className="e-input" /></Field>
                <Field label="Days"><input type="number" min="1" max="30" value={pForm.days} onChange={e => setPForm({ ...pForm, days: Number(e.target.value) })} className="e-input" /></Field>
                <Field label="Travelers"><input type="number" min="1" max="20" value={pForm.travelers} onChange={e => setPForm({ ...pForm, travelers: Number(e.target.value) })} className="e-input" /></Field>
                <Field label="Total budget (₹)"><input type="number" min="5000" value={pForm.budget} onChange={e => setPForm({ ...pForm, budget: Number(e.target.value) })} className="e-input" /></Field>
                <Field label="Style" full>
                  <select value={pForm.style} onChange={e => setPForm({ ...pForm, style: e.target.value })} className="e-input">
                    <option value="budget">Budget · backpacker</option>
                    <option value="balanced">Balanced · mid-range</option>
                    <option value="premium">Premium · boutique</option>
                    <option value="luxury">Luxury · personal service</option>
                  </select>
                </Field>
              </div>
              <div className="mt-6 grid sm:grid-cols-3 gap-3">
                <button onClick={() => genAI('itin')} disabled={aiLoading} className="e-btn-primary rounded-full px-5 py-3 text-sm inline-flex items-center justify-center gap-2">{aiLoading && aiKind==='itin' ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Itinerary</button>
                <button onClick={() => genAI('pack')} disabled={aiLoading} className="e-btn-ghost rounded-full px-5 py-3 text-sm inline-flex items-center justify-center gap-2">{aiLoading && aiKind==='pack' ? <Loader2 className="size-4 animate-spin" /> : <Backpack className="size-4" />} Packing</button>
                <button onClick={() => genAI('bud')}  disabled={aiLoading} className="e-btn-ghost rounded-full px-5 py-3 text-sm inline-flex items-center justify-center gap-2">{aiLoading && aiKind==='bud'  ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />} Budget</button>
              </div>
              {aiOut && (
                <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed p-5 rounded-2xl bg-white/[0.04] border border-white/10" style={{ color: 'var(--e-text-muted)' }}>{aiOut}</div>
              )}
            </div>
            <div className="e-glass rounded-3xl p-6">
              <div className="e-chip"><FileText className="size-3 text-emerald-300" /> Ready to publish?</div>
              <p className="mt-3 text-sm" style={{ color: 'var(--e-text-muted)' }}>Turn your plan into a real journey and let travelers join you.</p>
              <button onClick={() => setTab('create')} className="mt-4 e-btn-primary rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2"><Plus className="size-4" /> Create journey</button>
            </div>
          </div>
        </section>
      )}

      <style jsx>{`.e-input{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);border-radius:14px;padding:10px 14px;color:white;font-size:14px;width:100%;outline:none;transition:border-color .2s}.e-input:focus{border-color:rgba(255,255,255,.35)}.e-input option{background:#0a0e1a;color:white}textarea.e-input{resize:vertical;font-family:inherit}`}</style>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
      <div className="text-[10px] uppercase tracking-[0.22em] text-white/55 mb-1.5">{label}</div>
      {children}
    </label>
  );
}
