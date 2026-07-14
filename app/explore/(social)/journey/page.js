'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Route, Sparkles, Backpack, Wallet, Clock, MapPin, Plus, X, Trash2, Loader2, Wand2, ArrowRight, Check } from 'lucide-react';
import AuroraBg from '@/components/explore/AuroraBg';
import BadgeChip from '@/components/explore/BadgeChip';
import { IMG } from '@/lib/data';
import { useAuth } from '@/lib/auth-context';

const TABS = [
  { id: 'planner', label: 'Trip Planner', icon: Route },
  { id: 'itinerary', label: 'AI Itinerary', icon: Sparkles },
  { id: 'packing', label: 'Packing', icon: Backpack },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'saved', label: 'Saved places', icon: MapPin },
];

const DEFAULT_PACKING = [
  { c: 'Essentials', items: ['Passport / ID', 'Insurance', 'Cash + cards', 'Phone charger'] },
  { c: 'Clothing', items: ['Thermal layers', 'Waterproof jacket', 'Wool socks', 'Sturdy boots'] },
  { c: 'Kashmir extras', items: ['Sunglasses (snow glare)', 'Sunscreen', 'Lip balm', 'Reusable bottle'] },
];

function callAI(message) {
  return fetch('/api/ai-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) })
    .then(r => r.json()).then(j => j.reply || j.text || 'AI is warming up — try again in a moment.')
    .catch(() => 'AI is warming up — try again in a moment.');
}

export default function ExploreJourney() {
  const { user } = useAuth();
  const [tab, setTab] = useState('planner');
  const [form, setForm] = useState({ destination: 'Kashmir', days: 5, budget: 40000, style: 'balanced', travelers: 2 });
  const [itinerary, setItinerary] = useState('');
  const [packing, setPacking] = useState('');
  const [budgetOut, setBudgetOut] = useState('');
  const [loading, setLoading] = useState('');
  const [saved, setSaved] = useState([
    { name: 'Betaab Valley viewpoint', tag: 'Pahalgam • golden hour' },
    { name: 'Nishat Bagh terrace', tag: 'Srinagar • spring bloom' },
  ]);
  const [savedInput, setSavedInput] = useState('');

  const genItinerary = async () => {
    setLoading('itin');
    const msg = `Create a day-by-day ${form.days}-day itinerary for ${form.travelers} traveler(s) to ${form.destination} with a total budget of ₹${form.budget}. Travel style: ${form.style}. Format each day as "Day N — Title" then 3-4 bullet points (morning, afternoon, evening) with rough ₹ costs. End with a total estimate.`;
    setItinerary(await callAI(msg));
    setTab('itinerary');
    setLoading('');
  };
  const genPacking = async () => {
    setLoading('pack');
    const msg = `Create a smart packing checklist for a ${form.days}-day ${form.style} trip to ${form.destination} in the current season. Group items into 4 categories. Add 2 Kashmir-specific tips at the end.`;
    setPacking(await callAI(msg));
    setTab('packing');
    setLoading('');
  };
  const genBudget = async () => {
    setLoading('bud');
    const msg = `Break down a ₹${form.budget} budget for ${form.travelers} traveler(s) on a ${form.days}-day ${form.style} trip to ${form.destination}. Split into categories (stay, transport, food, experiences, buffer). Return as a compact bulleted list with ₹ amounts and % of total.`;
    setBudgetOut(await callAI(msg));
    setTab('budget');
    setLoading('');
  };

  return (
    <div className="relative">
      <section className="relative overflow-hidden pt-14 md:pt-20 pb-8">
        <AuroraBg />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 e-fade-in">
          <div className="e-chip"><Route className="size-3 text-emerald-300" /> Journey</div>
          <h1 className="display font-bold mt-4 text-[clamp(2rem,5.6vw,4rem)] leading-tight max-w-3xl">Design a trip <span className="e-grad-text">worth remembering.</span></h1>
          <p className="mt-4 text-white/75 max-w-2xl">One place for your itinerary, packing list, budget, timeline and saved places. Powered by Safar AI end-to-end.</p>
        </div>
      </section>

      {/* Tabs */}
      <section className="relative max-w-7xl mx-auto px-4 md:px-8 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto e-scroll-x pb-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition border ${tab===id ? 'e-btn-primary border-transparent' : 'bg-white/[0.04] border-white/10 text-white/75 hover:bg-white/[0.08] hover:text-white'}`}>
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
      </section>

      {/* Panels */}
      <section className="relative max-w-7xl mx-auto px-4 md:px-8 pb-24">
        {tab === 'planner' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 e-glass rounded-3xl p-6 md:p-8">
              <h3 className="font-semibold text-lg">Trip details</h3>
              <p className="text-white/60 text-sm mt-1">Give Safar AI a few hints. It will craft everything else.</p>
              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                <Field label="Destination"><input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} className="e-input" /></Field>
                <Field label="Days"><input type="number" min="1" max="30" value={form.days} onChange={e => setForm({ ...form, days: Number(e.target.value) })} className="e-input" /></Field>
                <Field label="Travelers"><input type="number" min="1" max="20" value={form.travelers} onChange={e => setForm({ ...form, travelers: Number(e.target.value) })} className="e-input" /></Field>
                <Field label="Total budget (₹)"><input type="number" min="5000" value={form.budget} onChange={e => setForm({ ...form, budget: Number(e.target.value) })} className="e-input" /></Field>
                <Field label="Style">
                  <select value={form.style} onChange={e => setForm({ ...form, style: e.target.value })} className="e-input">
                    <option value="budget">Budget • backpacker</option>
                    <option value="balanced">Balanced • mid-range</option>
                    <option value="premium">Premium • boutique</option>
                    <option value="luxury">Luxury • concierge</option>
                  </select>
                </Field>
              </div>
              <div className="mt-6 grid sm:grid-cols-3 gap-3">
                <button onClick={genItinerary} disabled={!!loading} className="e-btn-primary rounded-full px-5 py-3 text-sm inline-flex items-center justify-center gap-2">{loading==='itin' ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Generate itinerary</button>
                <button onClick={genPacking} disabled={!!loading} className="e-btn-ghost rounded-full px-5 py-3 text-sm inline-flex items-center justify-center gap-2">{loading==='pack' ? <Loader2 className="size-4 animate-spin" /> : <Backpack className="size-4" />} Packing list</button>
                <button onClick={genBudget} disabled={!!loading} className="e-btn-ghost rounded-full px-5 py-3 text-sm inline-flex items-center justify-center gap-2">{loading==='bud' ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />} Budget breakdown</button>
              </div>
            </div>
            <div className="e-glass rounded-3xl p-6">
              <h3 className="font-semibold text-lg">Save & sync</h3>
              <p className="text-white/60 text-sm mt-2 leading-relaxed">Sign in to save this trip to your Passport, invite friends, and turn it into a public journey travelers can join.</p>
              {user ? (
                <div className="mt-5 e-chip"><Check className="size-3 text-emerald-300" /> Signed in · {user.name || user.email}</div>
              ) : (
                <Link href="/?auth=1" className="mt-5 e-btn-primary rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2"><Sparkles className="size-4" /> Sign in to sync</Link>
              )}
              <div className="mt-6">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">Related</div>
                <Link href="/build-trip" className="mt-2 flex items-center justify-between p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition">
                  <div><div className="text-sm font-semibold">Build My Trip</div><div className="text-xs text-white/55">The classic step-by-step wizard</div></div>
                  <ArrowRight className="size-4 text-white/60" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {tab === 'itinerary' && (
          <div className="e-glass rounded-3xl p-6 md:p-8 e-fade-in">
            <div className="flex items-center justify-between gap-3">
              <div><h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="size-4 text-emerald-300" /> AI itinerary</h3><p className="text-white/60 text-sm mt-1">A curated day-by-day plan tailored to your inputs.</p></div>
              <button onClick={genItinerary} disabled={!!loading} className="e-btn-ghost rounded-full px-4 py-2 text-xs inline-flex items-center gap-2">{loading==='itin' ? <Loader2 className="size-3 animate-spin" /> : <Wand2 className="size-3" />} Regenerate</button>
            </div>
            <div className="mt-5 whitespace-pre-wrap text-sm text-white/85 leading-relaxed">
              {itinerary || <EmptyPrompt onGenerate={genItinerary} loading={loading==='itin'} label="Generate my itinerary" />}
            </div>
          </div>
        )}

        {tab === 'packing' && (
          <div className="grid lg:grid-cols-2 gap-5 e-fade-in">
            <div className="e-glass rounded-3xl p-6">
              <h3 className="font-semibold text-lg"><Backpack className="inline size-4 text-emerald-300 mr-2" /> AI packing list</h3>
              <div className="mt-5 whitespace-pre-wrap text-sm text-white/85 leading-relaxed">
                {packing || <EmptyPrompt onGenerate={genPacking} loading={loading==='pack'} label="Generate packing list" />}
              </div>
            </div>
            <div className="e-glass rounded-3xl p-6">
              <h3 className="font-semibold text-lg">Starter checklist</h3>
              <p className="text-white/60 text-sm mt-1">Quick defaults — tick as you pack.</p>
              <div className="mt-4 space-y-4">
                {DEFAULT_PACKING.map(g => (
                  <div key={g.c}>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">{g.c}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {g.items.map(it => (
                        <label key={it} className="flex items-center gap-2 text-sm text-white/85"><input type="checkbox" className="accent-emerald-400" /> {it}</label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'budget' && (
          <div className="e-glass rounded-3xl p-6 md:p-8 e-fade-in">
            <h3 className="font-semibold text-lg"><Wallet className="inline size-4 text-emerald-300 mr-2" /> Budget breakdown</h3>
            <div className="mt-5 whitespace-pre-wrap text-sm text-white/85 leading-relaxed">
              {budgetOut || <EmptyPrompt onGenerate={genBudget} loading={loading==='bud'} label="Generate budget" />}
            </div>
          </div>
        )}

        {tab === 'timeline' && (
          <div className="e-glass rounded-3xl p-6 md:p-8 e-fade-in">
            <h3 className="font-semibold text-lg"><Clock className="inline size-4 text-emerald-300 mr-2" /> Timeline</h3>
            <div className="mt-6 space-y-4">
              {Array.from({ length: Math.min(form.days, 7) }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="size-10 shrink-0 rounded-full bg-gradient-to-br from-emerald-300 to-violet-400 grid place-items-center text-[#06080f] font-bold text-sm">{i+1}</div>
                  <div className="flex-1 e-glass-dark rounded-2xl p-4">
                    <div className="font-semibold text-sm">Day {i+1}</div>
                    <div className="text-xs text-white/60 mt-1">Placeholder — generate an AI itinerary to auto-populate.</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'saved' && (
          <div className="e-glass rounded-3xl p-6 md:p-8 e-fade-in">
            <h3 className="font-semibold text-lg"><MapPin className="inline size-4 text-emerald-300 mr-2" /> Saved places</h3>
            <div className="mt-5 flex gap-2">
              <input value={savedInput} onChange={e => setSavedInput(e.target.value)} onKeyDown={e => { if (e.key==='Enter' && savedInput.trim()) { setSaved(s => [...s, { name: savedInput.trim(), tag: 'Custom' }]); setSavedInput(''); } }} placeholder="Add a place — e.g. Chandanwari" className="e-input flex-1" />
              <button onClick={() => { if (savedInput.trim()) { setSaved(s => [...s, { name: savedInput.trim(), tag: 'Custom' }]); setSavedInput(''); } }} className="e-btn-primary rounded-full px-4 text-sm inline-flex items-center gap-1"><Plus className="size-4" /> Add</button>
            </div>
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              {saved.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <div><div className="text-sm font-semibold">{s.name}</div><div className="text-[11px] text-white/55">{s.tag}</div></div>
                  <button onClick={() => setSaved(saved.filter((_, j) => j !== i))} className="text-white/50 hover:text-rose-300 transition"><Trash2 className="size-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <style jsx>{`.e-input{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);border-radius:14px;padding:10px 14px;color:white;font-size:14px;width:100%;outline:none;transition:border-color .2s}.e-input:focus{border-color:rgba(255,255,255,.35)}.e-input option{background:#0a0e1a;color:white}`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-[0.22em] text-white/55 mb-1.5">{label}</div>
      {children}
    </label>
  );
}
function EmptyPrompt({ onGenerate, loading, label }) {
  return (
    <div className="text-center py-10 text-white/60">
      <div className="e-chip mx-auto"><Sparkles className="size-3 text-emerald-300" /> Nothing here yet</div>
      <p className="mt-4">Fill in your trip details and let Safar AI craft this section for you.</p>
      <button onClick={onGenerate} disabled={loading} className="mt-4 e-btn-primary rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2">{loading ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />} {label}</button>
    </div>
  );
}
