'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Home, Car, Sun, Backpack, Camera, ShieldCheck, Sparkles, CheckCircle2, Plus, Star, BadgeCheck, Info, Calendar, MapPin, X } from 'lucide-react';
import TripShell from '@/components/explore/TripShell';
import { TRIP_ADVANTAGES, VERIFIED_SERVICES } from '@/lib/trips-data';

const STEPS = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'Itinerary' },
  { id: 3, label: 'Settings' },
  { id: 4, label: 'Preview' },
];

const TYPES = [
  { id: 'trek', label: 'Trek', icon: Home },
  { id: 'road', label: 'Road Trip', icon: Car },
  { id: 'weekend', label: 'Weekend', icon: Sun },
  { id: 'backpacking', label: 'Backpacking', icon: Backpack },
];

export default function App() {
  const [mode, setMode] = useState(null); // null | 'self' | 'safar'
  const [step, setStep] = useState(1);
  const [type, setType] = useState('trek');
  const [addedServices, setAddedServices] = useState([]);

  const toggleService = (id) => {
    setAddedServices((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // === MODE PICKER (Step 0) ===
  if (!mode) {
    return (
      <TripShell>
        <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-4 lg:pt-8">
          <div className="flex items-center gap-3">
            <Link href="/explore" className="size-10 grid place-items-center rounded-full bg-white border border-slate-200"><ArrowLeft className="size-4" /></Link>
            <div>
              <h1 className="font-display text-xl lg:text-2xl font-bold">Create a Trip</h1>
              <p className="text-[13px] text-slate-500">Choose how you want to build your trip</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Safar Assisted (Recommended) */}
            <button onClick={() => setMode('safar')} className="relative text-left rounded-3xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 lg:p-6 hover:shadow-xl transition group order-1 lg:order-2">
              <div className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                <Sparkles className="size-3" /> RECOMMENDED
              </div>
              <div className="size-12 rounded-2xl bg-emerald-500 text-white grid place-items-center shadow-lg shadow-emerald-200">
                <ShieldCheck className="size-6" />
              </div>
              <h3 className="mt-4 font-display font-bold text-lg text-emerald-900">Safar Assisted Trip</h3>
              <p className="mt-1 text-[13px] text-emerald-900/80 leading-relaxed">Build your trip using verified accommodations, guides, transport providers, rental services and experiences on Safar Curated for a more organized experience and greater confidence in arrangements.</p>
              <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                <BadgeCheck className="size-3.5" /> Verified by Safar
              </div>
              <div className="mt-4 grid grid-cols-2 gap-1.5">
                {TRIP_ADVANTAGES.map(a => (
                  <div key={a} className="flex items-center gap-1.5 text-[12px] text-emerald-900"><CheckCircle2 className="size-3.5 text-emerald-600" />{a}</div>
                ))}
              </div>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-600 group-hover:bg-emerald-700 text-white px-4 py-2 text-[13px] font-semibold">
                Continue with Verified Partners <span>{'\u2192'}</span>
              </div>
            </button>

            {/* Self Hosted */}
            <button onClick={() => setMode('self')} className="relative text-left rounded-3xl border-2 border-violet-200 bg-white p-5 lg:p-6 hover:shadow-xl transition group order-2 lg:order-1">
              <div className="size-12 rounded-2xl bg-violet-600 text-white grid place-items-center shadow-lg shadow-violet-200">
                <Home className="size-6" />
              </div>
              <h3 className="mt-4 font-display font-bold text-lg text-slate-900">Self Hosted Trip</h3>
              <p className="mt-1 text-[13px] text-slate-600 leading-relaxed">{"Plan everything yourself \u2014 organize your own accommodations, transport, activities and itinerary."}</p>
              <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-violet-100 text-violet-800">Self Hosted</div>
              <p className="mt-3 text-[12px] text-slate-500">You are responsible for the complete trip and all arrangements.</p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-900 group-hover:bg-black text-white px-4 py-2 text-[13px] font-semibold">
                Continue Self-Hosted <span>{'\u2192'}</span>
              </div>
            </button>
          </div>

          {/* Trust banner */}
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 lg:p-5 flex items-start gap-3">
            <div className="size-10 rounded-xl bg-emerald-500 text-white grid place-items-center shrink-0"><ShieldCheck className="size-5" /></div>
            <div>
              <div className="font-display font-bold text-[15px] text-emerald-900">Travel with Confidence</div>
              <p className="mt-0.5 text-[13px] text-emerald-900/80">Trips created using verified Safar partners are easier to organize and help travelers identify arrangements made through trusted providers on the platform.</p>
            </div>
          </div>
        </div>
      </TripShell>
    );
  }

  // === WIZARD ===
  return (
    <TripShell>
      <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-4 lg:pt-8">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button onClick={() => setMode(null)} className="size-10 grid place-items-center rounded-full bg-white border border-slate-200"><ArrowLeft className="size-4" /></button>
          <h2 className="font-display font-bold text-lg">Create a Trip</h2>
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold ${mode === 'safar' ? 'bg-emerald-100 text-emerald-800' : 'bg-violet-100 text-violet-800'}`}>
            {mode === 'safar' ? <BadgeCheck className="size-3" /> : null}
            {mode === 'safar' ? 'Verified by Safar' : 'Self Hosted'}
          </div>
        </div>

        {/* Stepper */}
        <div className="mt-5 flex items-center justify-between">
          {STEPS.map((s, i) => {
            const active = step === s.id;
            const done = step > s.id;
            return (
              <div key={s.id} className="flex-1 flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`size-8 rounded-full grid place-items-center text-[12px] font-bold transition ${active ? 'bg-violet-600 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {done ? <CheckCircle2 className="size-4" /> : s.id}
                  </div>
                  <span className={`mt-1 text-[10.5px] font-semibold ${active ? 'text-violet-700' : 'text-slate-500'}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-[2px] mx-1 ${step > s.id ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Details */}
        {step === 1 && (
          <div className="mt-6 space-y-5">
            <h3 className="font-display font-bold text-[17px]">Trip Details</h3>

            <div>
              <label className="text-[12px] font-semibold text-slate-700">Cover Photo</label>
              <div className="mt-1.5 relative aspect-[16/9] rounded-2xl bg-slate-100 border border-dashed border-slate-300 overflow-hidden grid place-items-center cursor-pointer hover:bg-slate-50">
                <div className="absolute inset-0 opacity-30">
                  <Image src="https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200&q=80" alt="" fill className="object-cover" unoptimized />
                </div>
                <div className="relative z-10 text-center">
                  <div className="mx-auto size-10 rounded-full bg-white/95 grid place-items-center"><Camera className="size-4 text-slate-600" /></div>
                  <div className="mt-2 text-[13px] font-semibold text-slate-700">Add Cover Photo</div>
                  <div className="text-[11px] text-slate-500">Tap to upload</div>
                </div>
              </div>
            </div>

            <Field label="Trip Title" placeholder="e.g. Kashmir Adventure Trip" />

            <div>
              <label className="text-[12px] font-semibold text-slate-700">Destination</label>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 h-11">
                <input placeholder="Where are you going?" className="flex-1 bg-transparent outline-none text-[13px]" />
                <MapPin className="size-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-slate-700">Trip Type</label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {TYPES.map(t => {
                  const Icon = t.icon;
                  const active = type === t.id;
                  return (
                    <button key={t.id} onClick={() => setType(t.id)} className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[11px] font-semibold transition ${active ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      <Icon className="size-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-slate-700">Duration</label>
              <select className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-[13px]">
                <option>Select duration</option>
                <option>1–3 days</option>
                <option>4–7 days</option>
                <option>8+ days</option>
              </select>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-slate-700">Travel Dates</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 h-11">
                  <input type="date" className="flex-1 bg-transparent outline-none text-[13px]" />
                  <Calendar className="size-4 text-slate-400" />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 h-11">
                  <input type="date" className="flex-1 bg-transparent outline-none text-[13px]" />
                  <Calendar className="size-4 text-slate-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-slate-700">Group Size</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <select className="rounded-xl border border-slate-200 bg-white px-3 h-11 text-[13px]"><option>Min</option><option>2</option><option>4</option></select>
                <select className="rounded-xl border border-slate-200 bg-white px-3 h-11 text-[13px]"><option>Max</option><option>10</option><option>15</option></select>
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-slate-700">Trip Description</label>
              <textarea rows={4} placeholder="Describe your trip, places to visit, activities, what's included, etc." className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-[13px] outline-none focus:border-violet-400 resize-none" />
              <div className="text-right text-[11px] text-slate-400 mt-1">0/500</div>
            </div>
          </div>
        )}

        {/* Step 2: Itinerary — for Safar mode show verified services builder */}
        {step === 2 && (
          <div className="mt-6">
            <h3 className="font-display font-bold text-[17px]">{mode === 'safar' ? 'Add Verified Services' : 'Build Your Itinerary'}</h3>
            <p className="text-[12.5px] text-slate-500 mt-1">{mode === 'safar' ? 'Create your trip using trusted and verified Safar partners to simplify planning and give travelers greater confidence in the arrangements.' : 'Add day-by-day plans, activities and notes.'}</p>

            {mode === 'safar' ? (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VERIFIED_SERVICES.map(s => {
                  const added = addedServices.includes(s.id);
                  return (
                    <div key={s.id} className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
                      <div className="relative aspect-[16/9] bg-slate-100">
                        <Image src={s.img} alt={s.label} fill className="object-cover" unoptimized />
                        <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-500 text-white"><BadgeCheck className="size-3" /> Verified</span>
                      </div>
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-[14px]">{s.label}</h4>
                          <div className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-700"><Star className="size-3 fill-amber-400 text-amber-400" /> {s.rating}</div>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                          <span>{s.reviews} reviews</span>
                          <span className="text-[12px] font-semibold text-slate-800">{s.price ? `\u20b9${s.price}` : 'Free'}</span>
                        </div>
                        <button onClick={() => toggleService(s.id)} className={`mt-2 w-full rounded-lg text-[12px] font-semibold py-1.5 transition ${added ? 'bg-emerald-600 text-white' : 'bg-violet-50 text-violet-700 hover:bg-violet-100'}`}>
                          {added ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-3.5" /> Added</span> : <span className="inline-flex items-center gap-1"><Plus className="size-3.5" /> Add to Trip</span>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {[1,2,3].map(d => (
                  <div key={d} className="rounded-2xl border border-slate-100 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[13px] font-semibold">Day {d}</div>
                      <button className="text-[12px] font-semibold text-violet-700">Add note</button>
                    </div>
                    <input placeholder="e.g. Arrival, local sightseeing..." className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 h-10 text-[13px] outline-none focus:border-violet-400" />
                  </div>
                ))}
                <button className="w-full rounded-2xl border border-dashed border-slate-300 py-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
                  + Add Day
                </button>
              </div>
            )}

            {/* Trust banner in wizard for safar mode */}
            {mode === 'safar' && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex items-start gap-3">
                <ShieldCheck className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-[13px] text-emerald-900">Travel with Confidence</div>
                  <p className="text-[12px] text-emerald-900/80 mt-0.5">Trips created using verified Safar partners are easier to organize and help travelers identify arrangements made through trusted providers on the platform.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Settings */}
        {step === 3 && (
          <div className="mt-6 space-y-5">
            <h3 className="font-display font-bold text-[17px]">Trip Settings</h3>
            <Field label="Budget per traveler" placeholder="\u20b9 e.g. 8000" />
            <div>
              <label className="text-[12px] font-semibold text-slate-700">Difficulty</label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {['Easy','Moderate','Challenging'].map(l => (
                  <button key={l} className="rounded-xl border border-slate-200 bg-white py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">{l}</button>
                ))}
              </div>
            </div>
            <Field label="Rules" textarea placeholder="e.g. No smoking, be respectful, punctuality..." />
            <Field label="What's Included" textarea placeholder="e.g. Accommodation, meals, transport..." />
            <Field label="Packing List" textarea placeholder="e.g. Trekking shoes, warm layers, water bottle..." />
            <div>
              <label className="text-[12px] font-semibold text-slate-700">Gender Preference</label>
              <select className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-[13px]">
                <option>Anyone</option><option>Male only</option><option>Female only</option>
              </select>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-slate-700">Language</label>
              <input placeholder="e.g. English, Hindi, Urdu" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-[13px] outline-none focus:border-violet-400" />
            </div>
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 4 && (
          <div className="mt-6">
            <h3 className="font-display font-bold text-[17px]">Preview</h3>
            <p className="text-[12.5px] text-slate-500 mt-1">Review before publishing</p>
            <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold ${mode === 'safar' ? 'bg-emerald-500 text-white' : 'bg-violet-600 text-white'}`}>
                  {mode === 'safar' ? <><BadgeCheck className="size-3" /> Verified by Safar</> : 'Self Hosted'}
                </span>
                <span className="text-[12px] text-slate-500">Draft</span>
              </div>
              <div className="mt-3 aspect-[16/9] rounded-xl bg-slate-100 grid place-items-center text-slate-400 text-[13px]">Cover photo preview</div>
              <h4 className="mt-3 font-display font-bold text-lg">Untitled Trip</h4>
              <p className="text-[13px] text-slate-500">Add a description in Step 1</p>
              {mode === 'safar' && addedServices.length > 0 && (
                <div className="mt-3">
                  <div className="text-[12px] font-semibold text-slate-700">Verified services added</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {addedServices.map(id => {
                      const s = VERIFIED_SERVICES.find(x => x.id === id);
                      return <span key={id} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold"><BadgeCheck className="size-3" />{s?.label}</span>;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sticky footer */}
        <div className="mt-8 h-20" />
        <div className="fixed bottom-16 lg:bottom-6 inset-x-0 z-20 px-4 lg:pl-72 lg:pr-8">
          <div className="max-w-3xl mx-auto bg-white/95 backdrop-blur border border-slate-200 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50">Back</button>
            ) : (
              <button onClick={() => setMode(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50">Change Mode</button>
            )}
            {step < 4 ? (
              <button onClick={() => setStep(step + 1)} className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white py-2.5 text-[14px] font-semibold">Next</button>
            ) : (
              <button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-[14px] font-semibold">Publish Trip</button>
            )}
          </div>
        </div>
      </div>
    </TripShell>
  );
}

function Field({ label, placeholder, textarea = false }) {
  return (
    <div>
      <label className="text-[12px] font-semibold text-slate-700">{label}</label>
      {textarea ? (
        <textarea rows={3} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-[13px] outline-none focus:border-violet-400 resize-none" />
      ) : (
        <input placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-[13px] outline-none focus:border-violet-400" />
      )}
    </div>
  );
}
