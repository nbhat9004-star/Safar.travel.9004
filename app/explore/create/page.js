'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, Car, Sun, Backpack, Camera, ShieldCheck, Sparkles, CheckCircle2, Plus, Star, BadgeCheck, UserCheck, Award, MapPin, Calendar, Loader2 } from 'lucide-react';
import TripShell from '@/components/explore/TripShell';
import { TRIP_ADVANTAGES, VERIFIED_SERVICES } from '@/lib/trips-data';
import { createTrip } from '@/lib/circle-explore';
import { toast } from 'sonner';

const STEPS = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'Itinerary' },
  { id: 3, label: 'Settings' },
  { id: 4, label: 'Preview' },
];

const TYPES = [
  { id: 'adventure', label: 'Trek', icon: Home },
  { id: 'road_trip', label: 'Road Trip', icon: Car },
  { id: 'weekend_escape', label: 'Weekend', icon: Sun },
  { id: 'backpacking', label: 'Backpacking', icon: Backpack },
];

export default function App() {
  const router = useRouter();
  const [mode, setMode] = useState(null); // null | 'self' | 'safar' | 'local'
  const [step, setStep] = useState(1);
  const [publishing, setPublishing] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [theme, setTheme] = useState('adventure');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxMembers, setMaxMembers] = useState(8);
  const [minMembers, setMinMembers] = useState(2);
  const [difficulty, setDifficulty] = useState('moderate');
  const [budget, setBudget] = useState('');
  const [genderPref, setGenderPref] = useState('');
  const [languages, setLanguages] = useState('');
  const [rules, setRules] = useState('');
  const [included, setIncluded] = useState('');
  const [packingList, setPackingList] = useState('');
  const [addedServices, setAddedServices] = useState([]);

  const toggleService = (id) => {
    setAddedServices((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handlePublish = async () => {
    if (!title || title.trim().length < 3) { toast.error('Trip title must be at least 3 characters'); setStep(1); return; }
    setPublishing(true);
    try {
      const fullDescription = [
        description,
        rules ? `\n\nRules:\n${rules}` : '',
        included ? `\n\nWhat\u2019s included:\n${included}` : '',
        packingList ? `\n\nPacking list:\n${packingList}` : '',
      ].join('');
      const services = mode === 'safar' ? addedServices.map(id => {
        const s = VERIFIED_SERVICES.find(x => x.id === id);
        return { listingId: id, category: s?.id, title: s?.label, image: s?.img, price: s?.price || 0 };
      }) : [];
      const payload = {
        name: title.trim(),
        description: fullDescription.trim(),
        theme,
        hostMode: mode,
        destination: { name: destination.trim(), country: 'India' },
        startDate: startDate || null,
        endDate: endDate || null,
        maxMembers: Number(maxMembers) || 6,
        difficulty,
        budget: Number(budget) || null,
        genderPreference: genderPref || null,
        languages: languages ? languages.split(',').map(s => s.trim()).filter(Boolean).slice(0, 8) : [],
        services,
        visibility: 'public',
      };
      const journey = await createTrip(payload);
      toast.success('Trip published!');
      router.push(`/explore/trip/${journey.id}`);
    } catch (e) {
      toast.error(e.message || 'Could not publish trip. Please sign in and try again.');
    } finally {
      setPublishing(false);
    }
  };

  // === MODE PICKER (Step 0) ===
  if (!mode) {
    return (
      <TripShell>
        <div className="max-w-5xl mx-auto px-4 lg:px-8 pt-4 lg:pt-8">
          <div className="flex items-center gap-3">
            <Link href="/explore" className="size-10 grid place-items-center rounded-full bg-white border border-slate-200"><ArrowLeft className="size-4" /></Link>
            <div>
              <h1 className="font-display text-xl lg:text-2xl font-bold">Create a Trip</h1>
              <p className="text-[13px] text-slate-500">Choose how you want to build your trip</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Self Hosted */}
            <button onClick={() => setMode('self')} className="relative text-left rounded-3xl border-2 border-violet-200 bg-white p-5 lg:p-6 hover:shadow-xl transition group">
              <div className="size-12 rounded-2xl bg-violet-600 text-white grid place-items-center shadow-lg shadow-violet-200">
                <Home className="size-6" />
              </div>
              <h3 className="mt-4 font-display font-bold text-lg text-slate-900">Self Hosted Trip</h3>
              <p className="mt-1 text-[13px] text-slate-600 leading-relaxed">Plan everything yourself \u2014 organize your own accommodations, transport, activities and itinerary.</p>
              <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-violet-100 text-violet-800">Self Hosted</div>
              <p className="mt-3 text-[12px] text-slate-500">You are responsible for the complete trip and all arrangements.</p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-900 group-hover:bg-black text-white px-4 py-2 text-[13px] font-semibold">
                Continue Self-Hosted <span>{'\u2192'}</span>
              </div>
            </button>

            {/* Safar Assisted (Recommended) */}
            <button onClick={() => setMode('safar')} className="relative text-left rounded-3xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 lg:p-6 hover:shadow-xl transition group">
              <div className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                <Sparkles className="size-3" /> RECOMMENDED
              </div>
              <div className="size-12 rounded-2xl bg-emerald-500 text-white grid place-items-center shadow-lg shadow-emerald-200">
                <ShieldCheck className="size-6" />
              </div>
              <h3 className="mt-4 font-display font-bold text-lg text-emerald-900">Safar Assisted Trip</h3>
              <p className="mt-1 text-[13px] text-emerald-900/80 leading-relaxed">Build your trip using verified accommodations, guides, transport providers, rental services and experiences on Safar Curated for a more organized experience.</p>
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

            {/* Hosted by Local Expert */}
            <button onClick={() => setMode('local')} className="relative text-left rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-5 lg:p-6 hover:shadow-xl transition group">
              <div className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                <Award className="size-3" /> LOCAL CURATED
              </div>
              <div className="size-12 rounded-2xl bg-amber-500 text-white grid place-items-center shadow-lg shadow-amber-200">
                <UserCheck className="size-6" />
              </div>
              <h3 className="mt-4 font-display font-bold text-lg text-amber-900">Hosted by Local Expert</h3>
              <p className="mt-1 text-[13px] text-amber-900/80 leading-relaxed">Verified local organizers create complete trips \u2014 travelers simply request to join. Great for authentic, guided experiences with someone from the region.</p>
              <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-900">
                <BadgeCheck className="size-3.5" /> Hosted by Local Expert
              </div>
              <div className="mt-4 space-y-1.5">
                {['Verified Local Organizer','Complete Curated Itinerary','Authentic Regional Experience','Trusted Community Host'].map(a => (
                  <div key={a} className="flex items-center gap-1.5 text-[12px] text-amber-900"><CheckCircle2 className="size-3.5 text-amber-600" />{a}</div>
                ))}
              </div>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-600 group-hover:bg-amber-700 text-white px-4 py-2 text-[13px] font-semibold">
                Continue as Local Host <span>{'\u2192'}</span>
              </div>
            </button>
          </div>

          {/* Trust banner */}
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 lg:p-5 flex items-start gap-3">
            <div className="size-10 rounded-xl bg-emerald-500 text-white grid place-items-center shrink-0"><ShieldCheck className="size-5" /></div>
            <div>
              <div className="font-display font-bold text-[15px] text-emerald-900">Travel with Confidence</div>
              <p className="mt-0.5 text-[13px] text-emerald-900/80">Trips created using verified Safar partners or local experts are easier to organize and help travelers identify arrangements made through trusted providers on the platform.</p>
            </div>
          </div>
        </div>
      </TripShell>
    );
  }

  const modeMeta = mode === 'safar'
    ? { label: 'Verified by Safar', cls: 'bg-emerald-100 text-emerald-800', icon: BadgeCheck }
    : mode === 'local'
    ? { label: 'Hosted by Local Expert', cls: 'bg-amber-100 text-amber-900', icon: UserCheck }
    : { label: 'Self Hosted', cls: 'bg-violet-100 text-violet-800', icon: Home };
  const MetaIcon = modeMeta.icon;

  return (
    <TripShell>
      <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-4 lg:pt-8">
        <div className="flex items-center justify-between">
          <button onClick={() => setMode(null)} className="size-10 grid place-items-center rounded-full bg-white border border-slate-200"><ArrowLeft className="size-4" /></button>
          <h2 className="font-display font-bold text-lg">Create a Trip</h2>
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold ${modeMeta.cls}`}>
            <MetaIcon className="size-3" /> {modeMeta.label}
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

            <div>
              <label className="text-[12px] font-semibold text-slate-700">Trip Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Kashmir Adventure Trip" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-[13px] outline-none focus:border-violet-400" />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-slate-700">Destination</label>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 h-11">
                <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Where are you going?" className="flex-1 bg-transparent outline-none text-[13px]" />
                <MapPin className="size-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-slate-700">Trip Type</label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {TYPES.map(t => {
                  const Icon = t.icon;
                  const active = theme === t.id;
                  return (
                    <button key={t.id} onClick={() => setTheme(t.id)} className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[11px] font-semibold transition ${active ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      <Icon className="size-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-slate-700">Travel Dates</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 h-11">
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 bg-transparent outline-none text-[13px]" />
                  <Calendar className="size-4 text-slate-400" />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 h-11">
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 bg-transparent outline-none text-[13px]" />
                  <Calendar className="size-4 text-slate-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-slate-700">Group Size</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <input type="number" value={minMembers} onChange={e => setMinMembers(e.target.value)} placeholder="Min" className="rounded-xl border border-slate-200 bg-white px-3 h-11 text-[13px]" />
                <input type="number" value={maxMembers} onChange={e => setMaxMembers(e.target.value)} placeholder="Max" className="rounded-xl border border-slate-200 bg-white px-3 h-11 text-[13px]" />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-slate-700">Trip Description</label>
              <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} maxLength={500} placeholder="Describe your trip, places to visit, activities, what's included, etc." className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-[13px] outline-none focus:border-violet-400 resize-none" />
              <div className="text-right text-[11px] text-slate-400 mt-1">{description.length}/500</div>
            </div>
          </div>
        )}

        {/* Step 2: Itinerary */}
        {step === 2 && (
          <div className="mt-6">
            <h3 className="font-display font-bold text-[17px]">{mode === 'safar' ? 'Add Verified Services' : mode === 'local' ? 'Curate Your Local Itinerary' : 'Build Your Itinerary'}</h3>
            <p className="text-[12.5px] text-slate-500 mt-1">
              {mode === 'safar' ? 'Create your trip using trusted and verified Safar partners to simplify planning and give travelers greater confidence in the arrangements.' :
                mode === 'local' ? 'Add day-by-day plans that showcase your local expertise. Travelers will trust your curation.' :
                'Add day-by-day plans, activities and notes.'}
            </p>

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
                <button className="w-full rounded-2xl border border-dashed border-slate-300 py-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">+ Add Day</button>
              </div>
            )}

            {mode === 'safar' && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex items-start gap-3">
                <ShieldCheck className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-[13px] text-emerald-900">Travel with Confidence</div>
                  <p className="text-[12px] text-emerald-900/80 mt-0.5">Trips created using verified Safar partners are easier to organize and help travelers identify arrangements made through trusted providers on the platform.</p>
                </div>
              </div>
            )}
            {mode === 'local' && (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 flex items-start gap-3">
                <UserCheck className="size-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-[13px] text-amber-900">Hosted by a Local Expert</div>
                  <p className="text-[12px] text-amber-900/80 mt-0.5">Verified local organizers craft the complete experience. Travelers simply request to join and enjoy an authentic regional trip.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Settings */}
        {step === 3 && (
          <div className="mt-6 space-y-5">
            <h3 className="font-display font-bold text-[17px]">Trip Settings</h3>
            <div>
              <label className="text-[12px] font-semibold text-slate-700">Budget per traveler (\u20b9)</label>
              <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g. 8000" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-[13px] outline-none focus:border-violet-400" />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-slate-700">Difficulty</label>
              <div className="mt-1.5 grid grid-cols-4 gap-2">
                {['easy','moderate','challenging','expert'].map(l => (
                  <button key={l} onClick={() => setDifficulty(l)} className={`rounded-xl border py-2 text-[12px] font-semibold capitalize transition ${difficulty === l ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-slate-700">Rules</label>
              <textarea rows={2} value={rules} onChange={e => setRules(e.target.value)} placeholder="e.g. No smoking, be respectful, punctuality..." className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-[13px] outline-none focus:border-violet-400 resize-none" />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-slate-700">What's Included</label>
              <textarea rows={2} value={included} onChange={e => setIncluded(e.target.value)} placeholder="e.g. Accommodation, meals, transport..." className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-[13px] outline-none focus:border-violet-400 resize-none" />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-slate-700">Packing List</label>
              <textarea rows={2} value={packingList} onChange={e => setPackingList(e.target.value)} placeholder="e.g. Trekking shoes, warm layers, water bottle..." className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-[13px] outline-none focus:border-violet-400 resize-none" />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-slate-700">Gender Preference</label>
              <select value={genderPref} onChange={e => setGenderPref(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-[13px]">
                <option value="">Anyone</option><option value="male">Male only</option><option value="female">Female only</option>
              </select>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-slate-700">Language</label>
              <input value={languages} onChange={e => setLanguages(e.target.value)} placeholder="e.g. English, Hindi, Urdu" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-[13px] outline-none focus:border-violet-400" />
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
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold ${mode === 'safar' ? 'bg-emerald-500 text-white' : mode === 'local' ? 'bg-amber-500 text-white' : 'bg-violet-600 text-white'}`}>
                  <MetaIcon className="size-3" /> {modeMeta.label}
                </span>
                <span className="text-[12px] text-slate-500">Ready to publish</span>
              </div>
              <div className="mt-3 aspect-[16/9] rounded-xl bg-slate-100 grid place-items-center text-slate-400 text-[13px]">Cover photo preview</div>
              <h4 className="mt-3 font-display font-bold text-lg">{title || 'Untitled Trip'}</h4>
              <div className="text-[13px] text-slate-500 flex items-center gap-3 mt-0.5">
                <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {destination || 'Destination TBD'}</span>
                {startDate && endDate && <span className="inline-flex items-center gap-1"><Calendar className="size-3.5" /> {startDate} \u2192 {endDate}</span>}
              </div>
              <p className="mt-2 text-[13px] text-slate-600 whitespace-pre-line">{description || 'Add a description in Step 1'}</p>
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

        <div className="mt-8 h-20" />
        <div className="fixed bottom-16 lg:bottom-6 inset-x-0 z-20 px-4 lg:pl-72 lg:pr-8">
          <div className="max-w-3xl mx-auto bg-white/95 backdrop-blur border border-slate-200 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} disabled={publishing} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Back</button>
            ) : (
              <button onClick={() => setMode(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50">Change Mode</button>
            )}
            {step < 4 ? (
              <button onClick={() => setStep(step + 1)} className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white py-2.5 text-[14px] font-semibold">Next</button>
            ) : (
              <button onClick={handlePublish} disabled={publishing} className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-[14px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-70">
                {publishing && <Loader2 className="size-4 animate-spin" />} Publish Trip
              </button>
            )}
          </div>
        </div>
      </div>
    </TripShell>
  );
}
