'use client';
import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Plus, ArrowRight, ArrowLeft, Check, X, Sparkles, MapPin, Users, Wallet,
  Calendar, Loader2, Compass, Star, Home as HomeIcon, ShieldCheck, Info,
  Search, Trash2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

// ------------------------------------------------------------------
// EXPLORE V2 — Create a Trip
// Flow:
//   Step 0  Choose planning mode  (DIY  |  Plan with Safar Curated)
//   Step 1  Trip details form
//   Step 2  (Safar Curated only) Add services from Marketplace
//   Step 3  Budget split preview  (auto-calculated via /api/circle/estimate)
//   Step 4  Publish confirmation
// Uses existing endpoints: POST /api/circle/journeys, GET /api/circle/marketplace,
// POST /api/circle/estimate. No new backend needed.
// ------------------------------------------------------------------

const TRIP_TYPES = [
  { key: 'family',        label: 'Family',        theme: 'weekend_escape' },
  { key: 'friends',       label: 'Friends',       theme: 'weekend_escape' },
  { key: 'adventure',     label: 'Adventure',     theme: 'adventure' },
  { key: 'photography',   label: 'Photography',   theme: 'photography' },
  { key: 'road_trip',     label: 'Road Trip',     theme: 'road_trip' },
  { key: 'luxury',        label: 'Luxury',        theme: 'weekend_escape' },
  { key: 'backpacking',   label: 'Backpacking',   theme: 'adventure' },
  { key: 'couples',       label: 'Couples',       theme: 'weekend_escape' },
  { key: 'solo_friendly', label: 'Solo Friendly', theme: 'weekend_escape' },
  { key: 'spiritual',     label: 'Spiritual',     theme: 'weekend_escape' },
  { key: 'food_tour',     label: 'Food Tour',     theme: 'food' },
  { key: 'trekking',      label: 'Trekking',      theme: 'adventure' },
];

const SERVICE_CATEGORIES = [
  { key: '',                label: 'All',           icon: Compass  },
  { key: 'stay',            label: 'Homestays & Stays', icon: HomeIcon },
  { key: 'transport',       label: 'Transport',     icon: Users    },
  { key: 'experience',      label: 'Experiences',   icon: Sparkles },
  { key: 'tour',            label: 'Local Guides',  icon: MapPin   },
  { key: 'food',            label: 'Restaurants & Cafés', icon: Star },
];

const emptyForm = () => ({
  name: '',
  description: '',
  cover: 'https://images.pexels.com/photos/27108526/pexels-photo-27108526.jpeg?auto=compress&cs=tinysrgb&w=1200',
  destination: { name: '', district: '', state: 'Jammu & Kashmir', country: 'India' },
  startDate: '', endDate: '',
  maxMembers: 6,
  budget: 0,
  tripType: 'friends',
  theme: 'weekend_escape',
  meetingPoint: '',
  rules: '',
  services: [], // when Plan with Safar Curated is chosen
  planMode: '', // 'diy' | 'safar'
});

export default function CreateTripPage() {
  return (
    <Suspense fallback={null}>
      <CreateTripInner />
    </Suspense>
  );
}

function CreateTripInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const initialMode = params.get('mode') || '';
  const [step, setStep] = useState(initialMode ? 1 : 0);
  const [form, setForm] = useState(() => ({ ...emptyForm(), planMode: initialMode }));
  const [busy, setBusy] = useState(false);

  const upd = (patch) => setForm((f) => ({ ...f, ...patch }));
  const updDest = (patch) => setForm((f) => ({ ...f, destination: { ...f.destination, ...patch } }));

  const chooseMode = (mode) => { upd({ planMode: mode }); setStep(1); };

  const days = useMemo(() => {
    if (!form.startDate || !form.endDate) return 1;
    const d = Math.ceil((new Date(form.endDate) - new Date(form.startDate)) / 86400000);
    return Math.max(1, d);
  }, [form.startDate, form.endDate]);

  // Live estimator via existing endpoint
  const [estimate, setEstimate] = useState({ total: 0, perPerson: 0, breakdown: {} });
  useEffect(() => {
    if (form.services.length === 0 && !form.budget) return;
    (async () => {
      try {
        const r = await fetch('/api/circle/estimate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ services: form.services, days, maxMembers: form.maxMembers }),
        });
        const j = await r.json();
        if (j?.ok) setEstimate(j.estimate || {});
      } catch { /* keep prior estimate */ }
    })();
  }, [form.services, days, form.maxMembers, form.budget]);

  const perPerson = form.services.length > 0
    ? (estimate?.perPerson || 0)
    : (form.budget ? Math.round(form.budget / Math.max(1, form.maxMembers)) : 0);
  const total = form.services.length > 0 ? (estimate?.total || 0) : (Number(form.budget) || 0);

  const validateStep1 = () => {
    if (!form.name.trim() || form.name.trim().length < 3) return 'Please give the trip a name (3+ chars)';
    if (!form.destination.name.trim()) return 'Please add a destination';
    if (!form.startDate || !form.endDate) return 'Please add start and end dates';
    if (new Date(form.endDate) < new Date(form.startDate)) return 'End date must be after start date';
    return null;
  };

  const publish = async (visibility = 'public') => {
    if (!user) { router.push('/?auth=1'); return; }
    const v = validateStep1();
    if (v) { toast.error(v); setStep(1); return; }
    setBusy(true);
    try {
      const tripTypeObj = TRIP_TYPES.find((t) => t.key === form.tripType);
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        cover: form.cover,
        destination: form.destination,
        startDate: form.startDate,
        endDate: form.endDate,
        maxMembers: form.maxMembers,
        budget: total || form.budget || null,
        theme: tripTypeObj?.theme || 'weekend_escape',
        difficulty: 'moderate',
        services: form.services,
        visibility,
        meta: {
          tripType: form.tripType,
          meetingPoint: form.meetingPoint,
          rules: form.rules,
          planMode: form.planMode,
        },
      };
      const r = await fetch('/api/circle/journeys', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || 'Failed to publish');
      toast.success('Trip published!');
      router.push(`/explore/j/${j.journey.slug}`);
    } catch (e) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="container py-8 md:py-12 max-w-4xl">
      {/* Breadcrumb + Steps */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/explore/home" className="hover:text-charcoal inline-flex items-center gap-1"><ArrowLeft className="size-3.5" /> Explore</Link>
        <span>/</span>
        <span className="text-charcoal font-semibold">Create a Trip</span>
      </div>

      {/* STEP 0 — Choose planning mode */}
      {step === 0 && (
        <div className="mt-6">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-charcoal tracking-tight">How would you like to plan your trip?</h1>
          <p className="mt-2 text-muted-foreground">Pick the flow that suits you — you can change your mind anytime.</p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
            <ModeCard
              title="DIY Trip"
              icon={Compass}
              tagline="I want to arrange my own accommodation, transport, food and activities."
              benefits={['Free to publish', 'Invite others', 'Plan independently']}
              cta="Continue"
              onClick={() => chooseMode('diy')}
            />
            <ModeCard
              title="Plan with Safar Curated"
              icon={Star}
              recommended
              tagline="Want your trip to go exactly as planned? Let Safar Curated help you organise everything. Book your accommodation, transport, experiences and activities through our platform. We'll help coordinate your journey and make shared planning easier."
              benefits={['Easier planning', 'One place for bookings', 'Better coordination', 'Shared cost estimation', 'Dedicated support']}
              cta="Plan with Safar Curated"
              onClick={() => chooseMode('safar')}
            />
          </div>
        </div>
      )}

      {/* STEP 1 — Trip details */}
      {step === 1 && (
        <div className="mt-6">
          <StepHeader
            title={form.planMode === 'safar' ? 'Trip details' : 'DIY trip details'}
            step={1}
            total={form.planMode === 'safar' ? 3 : 2}
            onBack={() => setStep(0)}
          />

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field full label="Trip Title *" value={form.name} onChange={(v) => upd({ name: v })} placeholder="e.g. 4-day Kashmir Autumn Meetup" />
            <Field label="Destination *" value={form.destination.name} onChange={(v) => updDest({ name: v })} placeholder="e.g. Srinagar" />
            <Field label="District" value={form.destination.district} onChange={(v) => updDest({ district: v })} placeholder="e.g. Srinagar" />
            <Field label="Start Date *" type="date" value={form.startDate} onChange={(v) => upd({ startDate: v })} />
            <Field label="End Date *" type="date" value={form.endDate} onChange={(v) => upd({ endDate: v })} />
            <Field label="Maximum Participants" type="number" value={form.maxMembers} onChange={(v) => upd({ maxMembers: Math.max(1, Math.min(50, Number(v) || 1)) })} min={1} max={50} />
            {form.planMode === 'diy' && (
              <Field label="Estimated Budget (₹)" type="number" value={form.budget} onChange={(v) => upd({ budget: Math.max(0, Number(v) || 0) })} placeholder="Total for the whole trip" />
            )}
            <div className="md:col-span-2">
              <Label>Trip Type</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {TRIP_TYPES.map((t) => (
                  <button key={t.key} type="button" onClick={() => upd({ tripType: t.key, theme: t.theme })}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${form.tripType === t.key ? 'bg-emerald2 text-white border-emerald2' : 'bg-white hover:bg-emerald2/5'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <TextArea full label="About the Trip" value={form.description} onChange={(v) => upd({ description: v })} rows={3} placeholder="Share what makes this trip special…" />
            <Field full label="Meeting Point" value={form.meetingPoint} onChange={(v) => upd({ meetingPoint: v })} placeholder="e.g. Srinagar Airport, 4 PM" />
            <TextArea full label="Rules / Expectations" value={form.rules} onChange={(v) => upd({ rules: v })} rows={3} placeholder="e.g. Non-smoking, split costs equally, respect local customs…" />
            <Field full label="Cover Image URL" value={form.cover} onChange={(v) => upd({ cover: v })} placeholder="https://… (defaults to a Kashmir photo)" />
          </div>

          <StepFooter
            onBack={() => setStep(0)}
            onNext={() => {
              const v = validateStep1(); if (v) return toast.error(v);
              setStep(form.planMode === 'safar' ? 2 : 3);
            }}
            nextLabel={form.planMode === 'safar' ? 'Add Services' : 'Review Budget'}
          />
        </div>
      )}

      {/* STEP 2 — Add services (Safar Curated only) */}
      {step === 2 && form.planMode === 'safar' && (
        <ServicesPicker
          services={form.services}
          onChange={(services) => upd({ services })}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {/* STEP 3 — Budget split */}
      {step === 3 && (
        <div className="mt-6">
          <StepHeader
            title="Budget split"
            step={form.planMode === 'safar' ? 3 : 2}
            total={form.planMode === 'safar' ? 3 : 2}
            onBack={() => setStep(form.planMode === 'safar' ? 2 : 1)}
          />

          <div className="mt-6 bg-white rounded-3xl border shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 space-y-4">
              {form.services.length > 0 && (
                <>
                  <BudgetRow label="Accommodation" amount={estimate?.breakdown?.stay || 0} />
                  <BudgetRow label="Transport"     amount={(estimate?.breakdown?.transport || 0) + (estimate?.breakdown?.rental || 0)} />
                  <BudgetRow label="Food"          amount={estimate?.breakdown?.food || 0} />
                  <BudgetRow label="Activities"    amount={(estimate?.breakdown?.experience || 0) + (estimate?.breakdown?.tour || 0)} />
                  <BudgetRow label="Other"         amount={estimate?.breakdown?.other || 0} />
                </>
              )}
              {form.services.length === 0 && form.budget > 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">DIY trips share the total budget equally among participants.</div>
              )}
              <div className="pt-4 border-t flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Total Estimated Cost</div>
                <div className="font-bold text-charcoal text-lg">₹{(total || 0).toLocaleString('en-IN')}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Participants</div>
                <div className="font-bold text-charcoal">{form.maxMembers}</div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-emerald2">Estimated per person</div>
                  <div className="font-display font-bold text-charcoal text-2xl mt-0.5">₹{(perPerson || 0).toLocaleString('en-IN')}</div>
                </div>
                <Wallet className="size-8 text-emerald2" />
              </div>
              <div className="text-xs text-muted-foreground flex items-start gap-2">
                <Info className="size-4 mt-0.5 shrink-0 text-emerald2" />
                <span>The per-person amount updates automatically as the participant limit changes. If actual participants differ, the final share may vary.</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button onClick={() => setStep(form.planMode === 'safar' ? 2 : 1)} className="px-5 h-11 rounded-full text-charcoal/70 hover:text-charcoal font-semibold"><ArrowLeft className="size-4 inline mr-1" /> Back</button>
            <div className="flex items-center gap-2">
              <button disabled={busy} onClick={() => publish('draft')} className="px-5 h-11 rounded-full bg-white border font-semibold text-charcoal hover:bg-secondary/50 disabled:opacity-50 transition">Save as draft</button>
              <button disabled={busy} onClick={() => publish('public')} className="inline-flex items-center gap-2 px-6 h-11 rounded-full bg-emerald2 hover:bg-emerald2-deep text-white font-semibold shadow-lg shadow-emerald2/25 disabled:opacity-50 transition">
                {busy ? <><Loader2 className="size-4 animate-spin" /> Publishing…</> : <>Publish Trip <Check className="size-4" /></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Mode Card ----------
function ModeCard({ title, icon: Icon, tagline, benefits, cta, onClick, recommended }) {
  return (
    <button onClick={onClick} className={`relative text-left rounded-3xl p-6 md:p-7 border-2 transition-all hover:-translate-y-1 hover:shadow-xl ${recommended ? 'border-amber-400 bg-gradient-to-br from-emerald-900 to-emerald-950 text-white shadow-xl' : 'border-emerald-100 bg-white text-charcoal shadow-sm hover:border-emerald-200'}`}>
      {recommended && (
        <div className="absolute -top-3 right-6 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400 text-emerald-950 text-[10px] uppercase tracking-[0.22em] font-bold shadow-md">
          <Star className="size-3" strokeWidth={3} /> Recommended
        </div>
      )}
      <div className={`size-12 rounded-2xl grid place-items-center ${recommended ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-50 text-emerald2'}`}>
        <Icon className="size-6" />
      </div>
      <h3 className={`mt-4 font-display font-bold text-xl md:text-2xl ${recommended ? 'text-white' : 'text-charcoal'}`}>{title}</h3>
      <p className={`mt-2 text-sm leading-relaxed ${recommended ? 'text-white/85' : 'text-muted-foreground'}`}>{tagline}</p>
      <ul className="mt-4 space-y-1.5">
        {benefits.map((b) => (
          <li key={b} className={`flex items-center gap-2 text-sm ${recommended ? 'text-white/90' : 'text-charcoal/80'}`}>
            <Check className={`size-4 ${recommended ? 'text-amber-300' : 'text-emerald2'}`} strokeWidth={3} /> {b}
          </li>
        ))}
      </ul>
      <div className={`mt-6 inline-flex items-center gap-2 px-5 h-11 rounded-full font-semibold text-sm ${recommended ? 'bg-white text-emerald-950' : 'bg-emerald2 text-white'}`}>
        {cta} <ArrowRight className="size-4" />
      </div>
    </button>
  );
}

// ---------- Services Picker (Step 2) ----------
function ServicesPicker({ services, onChange, onBack, onNext }) {
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (cat) params.set('category', cat);
        if (q) params.set('q', q);
        params.set('limit', '40');
        const r = await fetch('/api/circle/marketplace?' + params.toString(), { cache: 'no-store' });
        const j = await r.json();
        if (j?.ok) setList(j.listings || []);
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [cat, q]);

  const has = (id) => services.some((s) => s.listingId === id);
  const toggle = (l) => {
    if (has(l.id)) onChange(services.filter((s) => s.listingId !== l.id));
    else onChange([...services, {
      listingId: l.id, category: l.category, subcategory: l.subcategory,
      title: l.title, image: l.image, price: l.price,
      hostName: l.hostName, notes: '',
    }]);
  };

  return (
    <div className="mt-6">
      <StepHeader title="Add services from Safar Marketplace" step={2} total={3} onBack={onBack} />
      <p className="mt-2 text-sm text-muted-foreground">Pick approved Safar-verified listings — they become part of your trip and everyone can book together.</p>

      {/* Category chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        {SERVICE_CATEGORIES.map(({ key, label, icon: Icon }) => (
          <button key={key || 'all'} onClick={() => setCat(key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${cat === key ? 'bg-emerald2 text-white border-emerald2' : 'bg-white hover:bg-emerald2/5'}`}>
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mt-4 relative">
        <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search homestays, transport, guides, experiences…"
          className="w-full h-11 pl-10 pr-4 rounded-xl border bg-white text-sm outline-none focus:border-emerald2 focus:ring-2 focus:ring-emerald2/10" />
      </div>

      {/* Selected banner */}
      {services.length > 0 && (
        <div className="mt-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-emerald-900">{services.length} service{services.length !== 1 ? 's' : ''} added</div>
            <button onClick={() => onChange([])} className="text-xs font-semibold text-rose-600 hover:underline">Clear all</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {services.map((s) => (
              <div key={s.listingId} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border text-xs">
                <span className="truncate max-w-[180px]">{s.title}</span>
                <button onClick={() => onChange(services.filter((x) => x.listingId !== s.listingId))} className="size-4 rounded-full grid place-items-center hover:bg-rose-100 text-rose-600"><X className="size-3" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Listings grid */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && [...Array(6)].map((_, i) => (
          <div key={i} className="h-56 rounded-2xl bg-secondary/60 animate-pulse" />
        ))}
        {!loading && list.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">No listings match your filter.</div>
        )}
        {!loading && list.map((l) => (
          <div key={l.id} className="bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition">
            <div className="relative aspect-[16/10] bg-secondary">
              {l.image && <Image src={l.image} alt={l.title} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover" />}
              <div className="absolute top-2 left-2 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-white/95 text-emerald2 shadow">{l.category}</div>
            </div>
            <div className="p-3">
              <div className="font-semibold text-charcoal text-sm line-clamp-2 min-h-[40px]">{l.title}</div>
              <div className="text-xs text-muted-foreground mt-1 truncate">{l.location}</div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm font-bold text-charcoal">₹{(l.price || 0).toLocaleString('en-IN')}</div>
                <button onClick={() => toggle(l)} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition ${has(l.id) ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald2 hover:bg-emerald2-deep text-white'}`}>
                  {has(l.id) ? <><Check className="size-3.5" /> Added</> : <><Plus className="size-3.5" /> Add</>}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <StepFooter onBack={onBack} onNext={onNext} nextLabel="Review Budget" nextDisabled={false} />
    </div>
  );
}

// ---------- UI atoms ----------
function StepHeader({ title, step, total, onBack }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="size-9 rounded-full bg-white border grid place-items-center hover:bg-secondary/50 transition"><ArrowLeft className="size-4" /></button>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-emerald2">Step {step} of {total}</div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-charcoal">{title}</h1>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1">
        {[...Array(total)].map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-emerald2' : 'bg-emerald-100'}`} />
        ))}
      </div>
    </div>
  );
}
function StepFooter({ onBack, onNext, nextLabel = 'Next', nextDisabled }) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3">
      <button onClick={onBack} className="px-5 h-11 rounded-full text-charcoal/70 hover:text-charcoal font-semibold"><ArrowLeft className="size-4 inline mr-1" /> Back</button>
      <button disabled={nextDisabled} onClick={onNext} className="inline-flex items-center gap-2 px-6 h-11 rounded-full bg-emerald2 hover:bg-emerald2-deep disabled:opacity-50 text-white font-semibold shadow-md transition">
        {nextLabel} <ArrowRight className="size-4" />
      </button>
    </div>
  );
}
function Label({ children }) { return <label className="block text-[11px] uppercase tracking-wider font-bold text-emerald-800">{children}</label>; }
function Field({ label, value, onChange, type = 'text', placeholder, full, min, max }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <Label>{label}</Label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} min={min} max={max}
        className="mt-1.5 w-full h-11 px-3.5 rounded-xl border border-emerald-100 bg-white text-sm outline-none focus:border-emerald2 focus:ring-2 focus:ring-emerald2/10" />
    </div>
  );
}
function TextArea({ label, value, onChange, rows = 3, placeholder, full }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <Label>{label}</Label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-emerald-100 bg-white text-sm outline-none focus:border-emerald2 focus:ring-2 focus:ring-emerald2/10 resize-y" />
    </div>
  );
}
function BudgetRow({ label, amount }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="text-sm text-charcoal">{label}</div>
      <div className="font-semibold text-charcoal">₹{(amount || 0).toLocaleString('en-IN')}</div>
    </div>
  );
}
