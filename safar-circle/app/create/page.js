'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CircleNav from '@/components/circle/CircleNav';
import { useAuth } from '@/lib/auth-context';
import { circleApi, THEMES, DIFFICULTY, LANGUAGES, INDIA_DESTINATIONS, formatINR, themeLabel, signInHref } from '@/lib/circle-api';
import { toast } from 'sonner';
import {
  Sparkles, ArrowLeft, ArrowRight, Check, Image as ImageIcon, MapPin, CalendarRange, Users, Wallet,
  Search, Filter, Star, ShieldCheck, Zap, Plus, X, ChevronRight, ChevronDown, Save, Send
} from 'lucide-react';

const STEPS = [
  { key: 'identity', label: 'Identity' },
  { key: 'plan', label: 'Plan' },
  { key: 'marketplace', label: 'Services' },
  { key: 'review', label: 'Publish' },
];

const COVER_SUGGESTIONS = [
  'https://images.pexels.com/photos/27108526/pexels-photo-27108526.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/25786776/pexels-photo-25786776.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/14262339/pexels-photo-14262339.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/32620987/pexels-photo-32620987.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1666021/pexels-photo-1666021.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/2318271/pexels-photo-2318271.jpeg?auto=compress&cs=tinysrgb&w=1600',
];

export default function CreateJourney() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState(0);

  // Journey state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cover, setCover] = useState('');
  const [theme, setTheme] = useState('weekend_escape');

  const [destName, setDestName] = useState('');
  const [destDistrict, setDestDistrict] = useState('');
  const [destState, setDestState] = useState('');
  const [destLat, setDestLat] = useState(null);
  const [destLng, setDestLng] = useState(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFlexibleDates, setIsFlexibleDates] = useState(false);
  const [maxMembers, setMaxMembers] = useState(6);
  const [budget, setBudget] = useState('');
  const [difficulty, setDifficulty] = useState('moderate');
  const [agePreference, setAgePreference] = useState('');
  const [genderPreference, setGenderPreference] = useState('');
  const [languages, setLanguages] = useState(['English']);

  // Services
  const [services, setServices] = useState([]);

  // Visibility
  const [visibility, setVisibility] = useState('public');

  // Estimator
  const days = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const s = new Date(startDate), e = new Date(endDate);
    if (!(e > s)) return 1;
    return Math.max(1, Math.ceil((e - s) / 86400000));
  }, [startDate, endDate]);

  const estimate = useMemo(() => {
    const subtotal = services.reduce((sum, s) => {
      const isStay = (s.category || '').toLowerCase() === 'stay';
      return sum + (Number(s.price) || 0) * (isStay ? days : 1);
    }, 0);
    const platformFee = Math.round(subtotal * 0.03);
    const taxes = Math.round(subtotal * 0.05);
    const total = subtotal + platformFee + taxes;
    const per = Math.round(total / Math.max(1, maxMembers));
    const savings = Math.round(subtotal * 0.08);
    return { subtotal, platformFee, taxes, total, perPerson: per, savings, days, members: maxMembers };
  }, [services, days, maxMembers]);

  const canNext = () => {
    if (step === 0) return name.trim().length >= 3 && !!theme;
    if (step === 1) return !!destName;
    if (step === 2) return services.length >= 1;
    return true;
  };

  const submit = async (asVisibility) => {
    if (!user) {
      toast.error('Please sign in first');
      router.push(signInHref('/create'));
      return;
    }
    try {
      const payload = {
        name, description, cover, theme,
        destination: { name: destName, district: destDistrict, state: destState, country: 'India', lat: destLat, lng: destLng },
        startDate: startDate || null,
        endDate: endDate || null,
        isFlexibleDates,
        maxMembers: Number(maxMembers) || 6,
        budget: budget ? Number(budget) : null,
        difficulty,
        agePreference: agePreference || null,
        genderPreference: genderPreference || null,
        languages,
        services: services.map(s => ({
          listingId: s.listingId, category: s.category, subcategory: s.subcategory,
          title: s.title, image: s.image, price: s.price, hostName: s.hostName, notes: s.notes || ''
        })),
        visibility: asVisibility || 'draft',
      };
      const r = await circleApi.createJourney(payload);
      toast.success(asVisibility === 'public' ? 'Journey published!' : 'Draft saved.');
      router.push(`/j/${r.journey.slug}`);
    } catch (e) {
      toast.error(e.message || 'Could not save');
    }
  };

  if (!authLoading && !user) {
    return (
      <main className="min-h-screen text-white pt-24">
        <CircleNav />
        <div className="max-w-lg mx-auto px-5 pt-20 text-center">
          <div className="circle-glass circle-card p-10">
            <div className="circle-chip mx-auto">Sign in required</div>
            <h1 className="display text-3xl font-bold mt-4">Only members can curate journeys.</h1>
            <p className="text-white/70 mt-3">Safar Circle uses Single Sign-On from your Safar account.</p>
            <Link href={signInHref('/create')} className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full circle-btn-primary text-sm font-semibold">
              Continue to sign in <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-white pt-24 pb-24">
      <CircleNav />
      <div className="circle-aurora" style={{ opacity: 0.25 }} />

      <div className="max-w-6xl mx-auto px-5 md:px-8 relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="circle-chip">Journey Curator</div>
            <h1 className="display text-4xl md:text-5xl font-bold mt-3">Craft a <span className="circle-grad-text">Journey Worth Joining</span></h1>
            <p className="text-white/70 mt-2 text-sm">All services are pulled live from the Safar marketplace. No duplicates. No middlemen.</p>
          </div>
          <Link href="/studio" className="text-sm text-white/70 hover:text-white hidden md:inline-flex items-center gap-1">Cancel <X className="size-4" /></Link>
        </div>

        {/* Stepper — mobile-first, equal-width columns, no overflow */}
        <div className="mt-6 md:mt-8 circle-glass circle-card p-2 sm:p-3">
          <ol className="grid grid-cols-4 gap-1 sm:gap-2" role="list" aria-label="Journey creation progress">
            {STEPS.map((s, i) => {
              const isActive = step === i;
              const isDone = i < step;
              return (
                <li key={s.key} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={`Step ${i + 1}: ${s.label}${isDone ? ' (completed)' : isActive ? ' (current)' : ''}`}
                    className={`group w-full flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-1.5 sm:px-3 py-2 sm:py-2.5 rounded-full text-[11px] sm:text-[13px] font-medium transition-all ${
                      isActive
                        ? 'circle-btn-primary'
                        : isDone
                          ? 'bg-white/10 text-white hover:bg-white/15'
                          : 'text-white/60 hover:bg-white/5'
                    }`}
                  >
                    <span
                      className={`shrink-0 size-6 sm:size-5 rounded-full grid place-items-center text-[10px] font-semibold ${
                        isActive
                          ? 'bg-black/25 text-black'
                          : isDone
                            ? 'bg-emerald-400/30 text-emerald-200'
                            : 'bg-white/10 text-white/80'
                      }`}
                    >
                      {isDone ? <Check className="size-3" /> : i + 1}
                    </span>
                    <span className="truncate max-w-full leading-none">{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-8 grid lg:grid-cols-[1fr_360px] gap-8">
          {/* Left: step content */}
          <div className="circle-glass circle-card p-6 md:p-10 min-h-[500px] circle-fade-in">
            {step === 0 && (
              <div>
                <SectionTitle eyebrow="Step 1" title="Give your journey an identity" />

                <div className="mt-6 space-y-5">
                  <div>
                    <label className="circle-label">Journey name</label>
                    <input value={name} onChange={e => setName(e.target.value)} className="circle-input" placeholder="Chinar Autumn Ride" />
                  </div>
                  <div>
                    <label className="circle-label">Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="circle-input"
                      placeholder="A 5-day soulful ride through Kashmir's autumn — golden chinars, kahwa evenings, sunrise shikara..." />
                  </div>

                  <div>
                    <label className="circle-label">Cover photograph</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {COVER_SUGGESTIONS.map((src) => (
                        <button key={src} type="button" onClick={() => setCover(src)}
                          className={`relative aspect-[16/10] rounded-2xl overflow-hidden border-2 transition ${cover === src ? 'circle-selected' : 'border-white/10 hover:border-white/30'}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img loading="lazy" decoding="async" src={src} alt="cover" className="absolute inset-0 w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <input value={cover} onChange={e => setCover(e.target.value)} className="circle-input flex-1" placeholder="Or paste an image URL" />
                    </div>
                  </div>

                  <div>
                    <label className="circle-label">Theme</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {THEMES.map(t => (
                        <button key={t.key} type="button" onClick={() => setTheme(t.key)}
                          className={`text-left px-4 py-3 rounded-2xl border transition-all ${theme === t.key ? 'circle-selected bg-white/10' : 'border-white/10 hover:border-white/30 bg-white/5'}`}>
                          <div className="text-lg">{t.emoji}</div>
                          <div className="text-sm font-semibold mt-1">{t.label}</div>
                          <div className="text-[11px] text-white/60 mt-0.5">{t.hint}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <SectionTitle eyebrow="Step 2" title="Plan the essentials" />

                <div className="mt-6 space-y-5">
                  <div>
                    <label className="circle-label">Destination (India only for now)</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {INDIA_DESTINATIONS.map(d => (
                        <button key={d.name} type="button"
                          onClick={() => {
                            setDestName(d.name); setDestDistrict(d.district); setDestState(d.state);
                            setDestLat(d.lat); setDestLng(d.lng);
                          }}
                          className={`text-left px-3 py-2.5 rounded-2xl border transition ${destName === d.name ? 'circle-selected bg-white/10' : 'border-white/10 hover:border-white/30 bg-white/5'}`}>
                          <div className="text-sm font-semibold">{d.name}</div>
                          <div className="text-[10px] text-white/50">{d.district} · {d.state}</div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 grid md:grid-cols-3 gap-3">
                      <div>
                        <label className="circle-label">Custom destination</label>
                        <input value={destName} onChange={e => setDestName(e.target.value)} className="circle-input" placeholder="City / place" />
                      </div>
                      <div>
                        <label className="circle-label">District</label>
                        <input value={destDistrict} onChange={e => setDestDistrict(e.target.value)} className="circle-input" placeholder="District" />
                      </div>
                      <div>
                        <label className="circle-label">State</label>
                        <input value={destState} onChange={e => setDestState(e.target.value)} className="circle-input" placeholder="State" />
                      </div>
                    </div>
                    {destLat && destLng && (
                      <div className="mt-2 text-[11px] text-white/50 flex items-center gap-1">
                        <MapPin className="size-3" /> {destLat.toFixed(3)}, {destLng.toFixed(3)}
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="circle-label">Start date</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="circle-input" />
                    </div>
                    <div>
                      <label className="circle-label">End date</label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="circle-input" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-white/80">
                    <input type="checkbox" checked={isFlexibleDates} onChange={e => setIsFlexibleDates(e.target.checked)} className="rounded" />
                    Dates are flexible — I'll finalise with the group
                  </label>

                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <label className="circle-label">Max members</label>
                      <input type="number" min={1} max={50} value={maxMembers}
                        onChange={e => setMaxMembers(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                        className="circle-input" />
                    </div>
                    <div>
                      <label className="circle-label">Budget hint (per person, ₹)</label>
                      <input type="number" min={0} value={budget} onChange={e => setBudget(e.target.value)} className="circle-input" placeholder="e.g. 25000" />
                    </div>
                    <div>
                      <label className="circle-label">Difficulty</label>
                      <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="circle-input">
                        {DIFFICULTY.map(d => <option key={d.key} value={d.key} className="bg-[#10162a]">{d.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="circle-label">Age preference (optional)</label>
                      <select value={agePreference} onChange={e => setAgePreference(e.target.value)} className="circle-input">
                        <option value="" className="bg-[#10162a]">Any age</option>
                        <option value="18-25" className="bg-[#10162a]">18 – 25</option>
                        <option value="25-35" className="bg-[#10162a]">25 – 35</option>
                        <option value="35-50" className="bg-[#10162a]">35 – 50</option>
                        <option value="50+" className="bg-[#10162a]">50+</option>
                      </select>
                    </div>
                    <div>
                      <label className="circle-label">Gender preference (optional)</label>
                      <select value={genderPreference} onChange={e => setGenderPreference(e.target.value)} className="circle-input">
                        <option value="" className="bg-[#10162a]">Any</option>
                        <option value="women-only" className="bg-[#10162a]">Women only</option>
                        <option value="men-only" className="bg-[#10162a]">Men only</option>
                        <option value="mixed" className="bg-[#10162a]">Mixed</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="circle-label">Languages spoken</label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES.map(l => {
                        const on = languages.includes(l);
                        return (
                          <button key={l} type="button"
                            onClick={() => setLanguages(prev => on ? prev.filter(x => x !== l) : [...prev, l])}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition ${on ? 'circle-btn-primary border-transparent' : 'bg-white/5 border-white/15 hover:border-white/30 text-white/80'}`}>
                            {l}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <MarketplacePicker services={services} setServices={setServices} />
            )}

            {step === 3 && (
              <ReviewStep
                name={name} description={description} cover={cover} theme={theme}
                destination={{ name: destName, district: destDistrict, state: destState }}
                startDate={startDate} endDate={endDate} isFlexibleDates={isFlexibleDates}
                maxMembers={maxMembers} difficulty={difficulty} languages={languages}
                services={services} estimate={estimate}
                visibility={visibility} setVisibility={setVisibility}
              />
            )}

            {/* Nav */}
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between gap-3">
              <button onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="inline-flex items-center gap-1 px-4 py-2.5 rounded-full circle-btn-ghost text-sm font-semibold disabled:opacity-40">
                <ArrowLeft className="size-4" /> Back
              </button>
              <div className="flex items-center gap-2">
                {step < STEPS.length - 1 && (
                  <button onClick={() => submit('draft')}
                    className="inline-flex items-center gap-1 px-4 py-2.5 rounded-full circle-btn-ghost text-sm font-semibold">
                    <Save className="size-4" /> Save draft
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button onClick={() => canNext() && setStep(step + 1)}
                    disabled={!canNext()}
                    className="inline-flex items-center gap-1 px-5 py-2.5 rounded-full circle-btn-primary text-sm font-semibold disabled:opacity-40">
                    Next <ArrowRight className="size-4" />
                  </button>
                ) : (
                  <button onClick={() => submit(visibility)}
                    className="inline-flex items-center gap-1 px-5 py-2.5 rounded-full circle-btn-primary text-sm font-semibold">
                    <Send className="size-4" /> {visibility === 'draft' ? 'Save draft' : visibility === 'public' ? 'Publish journey' : 'Save as ' + visibility}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: live estimator */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <EstimatorPanel estimate={estimate} services={services} />
          </aside>
        </div>
      </div>
    </main>
  );
}

function SectionTitle({ eyebrow, title }) {
  return (
    <div>
      <div className="circle-chip">{eyebrow}</div>
      <h2 className="display text-3xl md:text-4xl font-bold mt-3">{title}</h2>
    </div>
  );
}

function EstimatorPanel({ estimate, services }) {
  return (
    <div className="circle-glass-strong circle-card p-6 relative overflow-hidden">
      <div className="circle-aurora" style={{ opacity: 0.5 }} />
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-2xl circle-btn-primary grid place-items-center"><Sparkles className="size-4 text-black" /></div>
          <div>
            <div className="circle-label mb-0">Live Estimate</div>
            <div className="text-sm font-semibold">AI Journey Estimator</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs uppercase tracking-wider text-white/50">Per person</div>
          <div className="display text-4xl font-bold circle-grad-text mt-1">
            {formatINR(estimate.perPerson)}
          </div>
          <div className="text-xs text-white/50 mt-0.5">for {estimate.members} travelers · {estimate.days} day{estimate.days > 1 ? 's' : ''}</div>
        </div>

        <div className="mt-6 space-y-2 text-sm">
          <Row label="Subtotal" value={formatINR(estimate.subtotal)} />
          <Row label="Platform fee (3%)" value={formatINR(estimate.platformFee)} />
          <Row label="GST (5%)" value={formatINR(estimate.taxes)} />
          <div className="circle-divider my-3" />
          <Row label="Group total" value={formatINR(estimate.total)} strong />
          {estimate.savings > 0 && (
            <div className="mt-3 flex items-center justify-between text-emerald-300 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-3 py-2">
              <span>Est. savings w/ Safar Credits</span>
              <span className="font-semibold">− {formatINR(estimate.savings)}</span>
            </div>
          )}
        </div>

        <div className="mt-6 pt-5 border-t border-white/10">
          <div className="text-xs text-white/60 mb-3">{services.length} service{services.length !== 1 ? 's' : ''} curated</div>
          <div className="max-h-52 overflow-auto space-y-2 pr-1">
            {services.map(s => (
              <div key={s.listingId} className="flex items-center gap-2 text-xs">
                {s.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" decoding="async" src={s.image} alt="" className="size-8 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="truncate">{s.title}</div>
                  <div className="text-white/50">{s.subcategory || s.category}</div>
                </div>
                <div className="text-emerald-300">{formatINR(s.price)}</div>
              </div>
            ))}
            {services.length === 0 && <div className="text-white/50 text-xs">No services yet — add from the marketplace.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-white/70">{label}</div>
      <div className={`${strong ? 'font-bold display text-lg' : 'text-white/90'}`}>{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Marketplace Picker — pulls live from /api/circle/marketplace
// ---------------------------------------------------------------------------
function MarketplacePicker({ services, setServices }) {
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [verified, setVerified] = useState(false);
  const [instant, setInstant] = useState(false);
  const [maxPrice, setMaxPrice] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('subcategory'); // 'flat' | 'subcategory'

  useEffect(() => {
    setLoading(true);
    circleApi.marketplace({ category, q, verified: verified || undefined, instantBook: instant || undefined, maxPrice: maxPrice || undefined, limit: 60 })
      .then(r => setItems(r.listings || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [category, q, verified, instant, maxPrice]);

  const isAdded = (id) => services.some(s => s.listingId === id);
  const toggle = (item) => {
    if (isAdded(item.id)) setServices(prev => prev.filter(s => s.listingId !== item.id));
    else setServices(prev => [...prev, {
      listingId: item.id, category: item.category, subcategory: item.subcategory,
      title: item.title, image: item.image, price: item.price, hostName: item.hostName, notes: ''
    }]);
  };

  const grouped = useMemo(() => {
    const g = {};
    items.forEach(it => {
      const k = it.subcategory || it.category || 'other';
      if (!g[k]) g[k] = [];
      g[k].push(it);
    });
    return g;
  }, [items]);

  const CATS = [
    { v: '', l: 'All' },
    { v: 'stay', l: 'Stays' },
    { v: 'transport', l: 'Transport' },
    { v: 'experience', l: 'Experiences' },
    { v: 'tour', l: 'Tours & Guides' },
  ];

  return (
    <div>
      <SectionTitle eyebrow="Step 3" title="Curate every service from Safar Marketplace" />
      <p className="text-white/70 mt-3 text-sm">
        Live inventory. Every listing is a real Safar service — verified, rated, ready to book.
      </p>

      {/* Toolbar */}
      <div className="mt-6 circle-glass rounded-2xl p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 px-3 flex-1 min-w-[240px]">
          <Search className="size-4 text-white/60" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search hotels, guides, cars, wazwan..."
            className="bg-transparent outline-none w-full py-2.5 text-sm placeholder:text-white/40" />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {CATS.map(c => (
            <button key={c.v} onClick={() => setCategory(c.v)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition ${category === c.v ? 'circle-btn-primary border-transparent' : 'bg-white/5 border-white/15 text-white/80 hover:border-white/30'}`}>
              {c.l}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/15">
          <input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} /> Verified
        </label>
        <label className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/15">
          <input type="checkbox" checked={instant} onChange={e => setInstant(e.target.checked)} /> Instant book
        </label>
        <select value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="text-xs bg-white/5 border border-white/15 rounded-full px-3 py-1.5 text-white outline-none">
          <option value="" className="bg-[#10162a]">Any price</option>
          <option value="2000" className="bg-[#10162a]">Under ₹2k</option>
          <option value="5000" className="bg-[#10162a]">Under ₹5k</option>
          <option value="10000" className="bg-[#10162a]">Under ₹10k</option>
          <option value="25000" className="bg-[#10162a]">Under ₹25k</option>
        </select>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 rounded-2xl circle-glass animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 circle-glass rounded-2xl p-10 text-center text-white/60 text-sm">
          No services match. Try broader filters — every service you see is a live Safar host.
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {Object.entries(grouped).map(([cat, arr]) => (
            <div key={cat}>
              <div className="flex items-center justify-between mb-3">
                <div className="display text-xl font-semibold capitalize">{cat}</div>
                <div className="text-xs text-white/60">{arr.length} service{arr.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {arr.map(item => (
                  <ServiceCard key={item.id} item={item} added={isAdded(item.id)} onToggle={() => toggle(item)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {services.length > 0 && (
        <div className="mt-8 circle-glass-strong rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="text-sm">
            <div className="font-semibold">{services.length} services curated</div>
            <div className="text-white/60 text-xs">Total subtotal: {formatINR(services.reduce((n, s) => n + (Number(s.price) || 0), 0))}</div>
          </div>
          <button onClick={() => setServices([])} className="text-xs text-white/70 hover:text-white underline">Clear all</button>
        </div>
      )}
    </div>
  );
}

function ServiceCard({ item, added, onToggle }) {
  return (
    <div className={`rounded-2xl overflow-hidden border transition-all group ${added ? 'circle-selected bg-white/10' : 'border-white/10 hover:border-white/30 bg-white/5'}`}>
      <div className="relative aspect-[16/10] overflow-hidden">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img loading="lazy" decoding="async" src={item.image} alt={item.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 via-violet-500/30 to-pink-400/30" />
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1 flex-wrap">
          {item.superhost && <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] text-emerald-200 inline-flex items-center gap-1"><ShieldCheck className="size-3" /> Verified</span>}
          {item.instantBook && <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-[10px] text-yellow-200 inline-flex items-center gap-1"><Zap className="size-3" /> Instant</span>}
        </div>
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur text-[10px] inline-flex items-center gap-1">
          <Star className="size-3 text-yellow-300 fill-yellow-300" /> {item.rating || '—'}
        </div>
      </div>
      <div className="p-4">
        <div className="text-[11px] uppercase tracking-wider text-white/50">{item.subcategory || item.category}</div>
        <div className="font-semibold text-sm mt-1 line-clamp-1">{item.title}</div>
        <div className="text-xs text-white/60 mt-1 flex items-center gap-1"><MapPin className="size-3" /> {item.location}</div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm"><span className="font-bold">{formatINR(item.price)}</span><span className="text-white/50 text-[11px]"> / {item.category === 'stay' ? 'night' : 'unit'}</span></div>
          <button onClick={onToggle}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition ${added ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30' : 'circle-btn-primary'}`}>
            {added ? <><Check className="size-3.5" /> Added</> : <><Plus className="size-3.5" /> Add</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review & Publish step
// ---------------------------------------------------------------------------
function ReviewStep({ name, description, cover, theme, destination, startDate, endDate, isFlexibleDates, maxMembers, difficulty, languages, services, estimate, visibility, setVisibility }) {
  const th = themeLabel(theme);
  return (
    <div>
      <SectionTitle eyebrow="Step 4" title="Preview & Publish" />
      <p className="text-white/70 mt-3 text-sm">This is how travelers will experience your journey. Publish when ready.</p>

      <div className="mt-6 rounded-3xl overflow-hidden border border-white/10">
        <div className="relative aspect-[16/9] bg-white/5">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" decoding="async" src={cover} alt={name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 via-violet-500/30 to-pink-400/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            <div className="circle-chip mb-3">{th.emoji} {th.label}</div>
            <div className="display text-3xl md:text-5xl font-bold">{name || 'Untitled journey'}</div>
          </div>
        </div>
        <div className="p-6 space-y-3 bg-white/5">
          <div className="text-white/80 leading-relaxed">{description || 'No description yet.'}</div>
          <div className="grid md:grid-cols-4 gap-3 pt-3">
            <MetaTile icon={MapPin} label="Destination" value={destination.name || '—'} sub={destination.district || destination.state} />
            <MetaTile icon={CalendarRange} label="Dates" value={startDate ? `${startDate} → ${endDate || '?'}` : (isFlexibleDates ? 'Flexible' : 'To be finalised')} />
            <MetaTile icon={Users} label="Seats" value={`${maxMembers} travelers`} sub={difficulty} />
            <MetaTile icon={Wallet} label="Per person" value={formatINR(estimate.perPerson)} sub={`Total ${formatINR(estimate.total)}`} />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="circle-label">Included services ({services.length})</div>
        <div className="grid md:grid-cols-2 gap-3">
          {services.map(s => (
            <div key={s.listingId} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
              {s.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img loading="lazy" decoding="async" src={s.image} alt="" className="size-14 rounded-xl object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{s.title}</div>
                <div className="text-[11px] text-white/60">{s.subcategory || s.category} · {s.hostName || 'Safar Host'}</div>
              </div>
              <div className="text-sm font-semibold circle-grad-text">{formatINR(s.price)}</div>
            </div>
          ))}
          {services.length === 0 && <div className="text-white/50 text-xs">No services curated.</div>}
        </div>
      </div>

      <div className="mt-8">
        <div className="circle-label">Publish visibility</div>
        <div className="grid md:grid-cols-5 gap-2">
          {[
            { v: 'public', l: 'Public', d: 'Anyone can discover' },
            { v: 'private', l: 'Private', d: 'Only you' },
            { v: 'invite', l: 'Invite-only', d: 'Only via link' },
            { v: 'draft', l: 'Draft', d: 'Save for later' },
            { v: 'scheduled', l: 'Scheduled', d: 'Publish later' },
          ].map(o => (
            <button key={o.v} type="button" onClick={() => setVisibility(o.v)}
              className={`text-left p-3 rounded-2xl border transition ${visibility === o.v ? 'circle-selected bg-white/10' : 'border-white/10 hover:border-white/30 bg-white/5'}`}>
              <div className="text-sm font-semibold">{o.l}</div>
              <div className="text-[11px] text-white/60">{o.d}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetaTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
      <div className="flex items-center gap-2 text-white/60 text-xs"><Icon className="size-3.5" /> {label}</div>
      <div className="text-sm font-semibold mt-1">{value}</div>
      {sub && <div className="text-[11px] text-white/50 mt-0.5">{sub}</div>}
    </div>
  );
}
