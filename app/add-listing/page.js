'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, ChevronLeft, ChevronRight, Check, Upload, Sparkles, ListChecks, Wifi, Coffee, Wind, ParkingCircle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import { Button } from '@/components/ui/button';
import ServiceSelector from '@/components/safar/ServiceSelector';
import ServiceBadges from '@/components/safar/ServiceBadges';
import ProtectedRoute from '@/components/safar/ProtectedRoute';
import { SERVICE_GROUPS, SERVICE_INDEX } from '@/lib/services';
import { listingsApi } from '@/lib/listings-api';
import { IMG } from '@/lib/data';
import AuthModal from '@/components/safar/AuthModal';
import { useAuth } from '@/lib/auth-context';

const STEPS = ['Services','Basics','Photos','Amenities','Pricing','Review'];
const AMEN = [{i:Wifi,t:'Wi-Fi'},{i:Coffee,t:'Kahwa'},{i:Wind,t:'Heater'},{i:ParkingCircle,t:'Parking'},{i:ImageIcon,t:'Mountain view'},{i:ListChecks,t:'Breakfast'}];

// Map first selected service -> API category
function detectCategory(services) {
  if (!services.length) return 'stay';
  const stayIds = SERVICE_GROUPS.find(g => g.id === 'accommodation')?.services.map(s => s.id) || [];
  const transportIds = SERVICE_GROUPS.find(g => g.id === 'transport')?.services.map(s => s.id) || [];
  const tourIds = SERVICE_GROUPS.find(g => g.id === 'tourism')?.services.map(s => s.id) || [];
  const expIds = [...(SERVICE_GROUPS.find(g => g.id === 'cultural')?.services || []), ...(SERVICE_GROUPS.find(g => g.id === 'adventure')?.services || []), ...(SERVICE_GROUPS.find(g => g.id === 'food')?.services || [])].map(s => s.id);
  for (const s of services) {
    if (stayIds.includes(s)) return 'stay';
    if (transportIds.includes(s)) return 'transport';
    if (tourIds.includes(s)) return 'tour';
    if (expIds.includes(s)) return 'experience';
  }
  return 'stay';
}

function AddListingInner() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [services, setServices] = useState(['houseboat','wazwan','kehwa']);
  const [amen, setAmen] = useState(['Wi-Fi','Kahwa']);
  const [photos, setPhotos] = useState([]);
  const [photoUrls, setPhotoUrls] = useState(['']);  // optional URL inputs
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState(4500);

  const category = useMemo(() => detectCategory(services), [services]);

  const onPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    setPhotos((p) => [...p, ...files.map(f => URL.createObjectURL(f))]);
  };

  const activeGroups = useMemo(() => {
    const set = new Set();
    services.forEach(id => { const s = SERVICE_INDEX[id]; if (s) set.add(s.group); });
    return SERVICE_GROUPS.filter(g => set.has(g.id));
  }, [services]);

  const handlePublish = async () => {
    setSubmitting(true);
    // Build images array: photoUrls + uploaded blob previews. Blob URLs won't persist across refresh; for MVP we accept them.
    const imgs = [...photoUrls.filter(u => u && u.startsWith('http')), ...photos];
    if (imgs.length === 0) {
      // Fall back to a demo image if host didn't add any
      imgs.push(IMG.cot1);
    }
    const payload = {
      title: title || `New ${category} in Kashmir`,
      description: description || `A wonderful ${category} hosted by ${user?.name || 'a local'} in ${location || 'Kashmir'}.`,
      category,
      subcategory: services[0] || null,
      location: location || 'Srinagar, Kashmir',
      price: Number(price) || 4500,
      images: imgs,
      amenities: amen,
      services,
    };
    const { ok, data } = await listingsApi.create(payload);
    setSubmitting(false);
    if (!ok) { toast.error(data?.error || 'Failed to create listing'); return; }
    toast.success('Listing submitted! It will appear after admin approval.');
    router.push('/dashboard/host');
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 container">
        <div className="text-emerald2 text-xs uppercase tracking-[0.18em] font-semibold">Become a host</div>
        <h1 className="font-display text-4xl md:text-5xl font-bold mt-2">List your space &amp; services on Safar</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">Pick services, fill basics, upload photos, set price &amp; publish. New listings go to admin for approval.</p>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          {STEPS.map((s, i)=>(
            <div key={s} className="flex items-center gap-2">
              <div className={`size-8 rounded-full grid place-items-center text-xs font-bold ${i<=step ? 'bg-gradient-emerald text-white' : 'bg-secondary text-muted-foreground'}`}>{i<step?<Check className="size-4"/>:i+1}</div>
              <div className={`text-sm ${i<=step ? 'text-charcoal font-medium' : 'text-muted-foreground'}`}>{s}</div>
              {i<STEPS.length-1 && <div className={`w-6 h-px ${i<step ? 'bg-emerald2' : 'bg-border'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="container mt-8 grid lg:grid-cols-3 gap-6 pb-16">
        <motion.div key={step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 rounded-3xl border bg-white shadow-xl p-6 md:p-8">
          {step===0 && (
            <div>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="font-display text-2xl md:text-3xl font-bold">What services do you offer?</h2>
                  <p className="text-sm text-muted-foreground mt-1">Pick everything you provide. Auto-detected category: <span className="font-semibold text-emerald2 capitalize">{category}</span>.</p>
                </div>
                {services.length > 0 && (
                  <div className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald2 font-semibold border border-emerald-200">{services.length} service{services.length>1?'s':''} selected</div>
                )}
              </div>
              <div className="mt-6"><ServiceSelector value={services} onChange={setServices} /></div>
            </div>
          )}
          {step===1 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold">Basic details</h2>
              <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Listing title" className="w-full px-4 py-3 rounded-xl border" />
              <textarea value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Describe your space and what makes it special..." rows={5} className="w-full px-4 py-3 rounded-xl border" />
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl border">
                <MapPin className="size-5 text-emerald2" />
                <input value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="Location e.g. Dal Lake, Srinagar" className="flex-1 outline-none" />
              </div>
              {services.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Your selected services</div>
                  <ServiceBadges ids={services} max={20} />
                </div>
              )}
            </div>
          )}
          {step===2 && (
            <div>
              <h2 className="font-display text-2xl font-bold">Add photos</h2>
              <p className="text-sm text-muted-foreground mt-1">Upload device photos or paste image URLs.</p>
              <label className="mt-5 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl py-10 cursor-pointer hover:bg-secondary/40 transition">
                <Upload className="size-7 text-emerald2" />
                <div className="font-semibold">Click to upload</div>
                <div className="text-xs text-muted-foreground">JPG, PNG · multiple allowed</div>
                <input type="file" multiple accept="image/*" onChange={onPhotos} className="hidden" />
              </label>
              <div className="mt-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Or paste image URLs</div>
                {photoUrls.map((u, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input value={u} onChange={(e)=>{ const next=[...photoUrls]; next[i]=e.target.value; setPhotoUrls(next); }} placeholder="https://images.unsplash.com/..." className="flex-1 px-4 py-2.5 rounded-xl border text-sm" />
                    {i === photoUrls.length-1 && <button type="button" onClick={()=>setPhotoUrls([...photoUrls, ''])} className="px-3 py-2.5 rounded-xl bg-secondary text-xs font-semibold">+ Add</button>}
                  </div>
                ))}
              </div>
              {(photos.length>0 || photoUrls.some(u=>u.startsWith('http'))) && (
                <div className="mt-4 grid grid-cols-3 md:grid-cols-4 gap-2">
                  {[...photoUrls.filter(u=>u.startsWith('http')), ...photos].map((p,i)=><img key={i} src={p} className="aspect-square rounded-xl object-cover" alt="" />)}
                </div>
              )}
            </div>
          )}
          {step===3 && (
            <div>
              <h2 className="font-display text-2xl font-bold">Select amenities</h2>
              <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-3">
                {AMEN.map((a)=>{const I=a.i;const on=amen.includes(a.t);return(
                  <button key={a.t} onClick={()=>setAmen(on?amen.filter(x=>x!==a.t):[...amen,a.t])} className={`p-4 rounded-2xl border-2 text-left transition flex items-center gap-3 ${on?'border-emerald-600 bg-emerald-50/40':'border-border hover:border-charcoal/40'}`}><I className="size-5 text-emerald2" /><span className="font-medium">{a.t}</span></button>
                );})}
              </div>
            </div>
          )}
          {step===4 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold">Set your price</h2>
              <div className="flex items-baseline gap-2"><span className="text-2xl">₹</span><input value={price} onChange={(e)=>setPrice(e.target.value)} type="number" className="flex-1 font-display text-5xl font-bold outline-none border-b-2 pb-2" /></div>
              <p className="text-sm text-muted-foreground">Suggested for similar listings: ₹ 3,800 — ₹ 6,200 / night</p>
              <div className="grid grid-cols-2 gap-3 mt-3"><div className="p-4 rounded-xl border"><div className="text-xs text-muted-foreground">You earn (90%)</div><div className="font-bold">₹ {Math.round(price*0.9).toLocaleString('en-IN')}</div></div><div className="p-4 rounded-xl border"><div className="text-xs text-muted-foreground">Safar fee (10%)</div><div className="font-bold">₹ {Math.round(price*0.1).toLocaleString('en-IN')}</div></div></div>
            </div>
          )}
          {step===5 && (
            <div>
              <h2 className="font-display text-2xl font-bold">Review and publish</h2>
              <div className="mt-5 p-5 rounded-2xl border bg-secondary/40">
                <div className="text-xs uppercase tracking-wider text-emerald2 font-semibold capitalize">{category}</div>
                <div className="font-display font-bold mt-1">{title || `New ${category} listing in Kashmir`}</div>
                <div className="text-xs text-muted-foreground mt-1">{location || 'Location not set'} · ₹{Number(price).toLocaleString('en-IN')}</div>
                <div className="mt-4"><div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Services ({services.length})</div><ServiceBadges ids={services} max={20} /></div>
              </div>
              <Button onClick={handlePublish} disabled={submitting} className="mt-5 w-full rounded-full bg-emerald2 hover:bg-emerald2-deep h-12 font-semibold">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Publish listing'}
              </Button>
            </div>
          )}
          <div className="mt-8 flex justify-between">
            <Button variant="outline" className="rounded-full" disabled={step===0} onClick={()=>setStep(Math.max(0,step-1))}><ChevronLeft className="size-4 mr-1" /> Back</Button>
            <Button className="rounded-full bg-emerald2 hover:bg-emerald2-deep font-semibold" disabled={step===STEPS.length-1 || (step===0 && services.length===0)} onClick={()=>setStep(Math.min(STEPS.length-1,step+1))}>Continue <ChevronRight className="size-4 ml-1" /></Button>
          </div>
        </motion.div>

        <aside className="space-y-5">
          <div className="rounded-3xl border bg-gradient-to-br from-emerald-50/60 to-white p-6">
            <Sparkles className="size-5 text-emerald2" />
            <div className="font-display font-bold text-lg mt-3">Multi-service hosts grow faster</div>
            <ul className="mt-3 space-y-2 text-sm text-charcoal/80">
              <li className="flex gap-2"><Check className="size-4 text-emerald2 mt-0.5" /> Bundle stays + transport + tours</li>
              <li className="flex gap-2"><Check className="size-4 text-emerald2 mt-0.5" /> Auto-listed in matching filters</li>
              <li className="flex gap-2"><Check className="size-4 text-emerald2 mt-0.5" /> Weekly payouts &amp; AI insights</li>
            </ul>
          </div>

          {activeGroups.length > 0 && (
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Live preview</div>
              <div className="space-y-3">
                {activeGroups.map(g => {
                  const ids = services.filter(id => SERVICE_INDEX[id]?.group === g.id);
                  return (
                    <div key={g.id}>
                      <div className="text-[11px] uppercase tracking-wider font-bold text-charcoal/80">{g.label}</div>
                      <div className="mt-1.5"><ServiceBadges ids={ids} size="sm" max={20} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
      <Footer />
    </main>
  );
}

export default function App() {
  return <ProtectedRoute roles={['host','admin']}><AddListingInner /></ProtectedRoute>;
}
