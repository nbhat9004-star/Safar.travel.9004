'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, ChevronLeft, ChevronRight, Check, Upload, Sparkles, ListChecks, Wifi, Coffee, Wind, ParkingCircle, Image as ImageIcon } from 'lucide-react';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import { Button } from '@/components/ui/button';
import ServiceSelector from '@/components/safar/ServiceSelector';
import ServiceBadges from '@/components/safar/ServiceBadges';
import { SERVICE_GROUPS, SERVICE_INDEX } from '@/lib/services';

const STEPS = ['Services','Basics','Photos','Amenities','Pricing','Review'];
const AMEN = [{i:Wifi,t:'Wi-Fi'},{i:Coffee,t:'Kahwa'},{i:Wind,t:'Heater'},{i:ParkingCircle,t:'Parking'},{i:ImageIcon,t:'Mountain view'},{i:ListChecks,t:'Breakfast'}];

function App() {
  const [step, setStep] = useState(0);
  const [services, setServices] = useState(['houseboat','wazwan','kehwa']);
  const [amen, setAmen] = useState(['Wi-Fi','Kahwa']);
  const [photos, setPhotos] = useState([]);

  const onPhotos = (e) => { const files = Array.from(e.target.files || []); setPhotos((p)=>[...p, ...files.map(f=>URL.createObjectURL(f))]); };

  // Derived: groups containing at least one selected service
  const activeGroups = useMemo(() => {
    const set = new Set();
    services.forEach(id => { const s = SERVICE_INDEX[id]; if (s) set.add(s.group); });
    return SERVICE_GROUPS.filter(g => set.has(g.id));
  }, [services]);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 container">
        <div className="text-emerald2 text-xs uppercase tracking-[0.18em] font-semibold">Become a host</div>
        <h1 className="font-display text-4xl md:text-5xl font-bold mt-2">List your space &amp; services on Safar</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">Hosts can offer one or many services — stays, transport, tours, food, adventure or cultural experiences. Select what you provide, and we&#39;ll do the rest.</p>

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
                  <p className="text-sm text-muted-foreground mt-1">Pick everything you provide. You can combine multiple — for example a homestay with airport pickup, a wazwan dinner and a guided trek.</p>
                </div>
                {services.length > 0 && (
                  <div className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald2 font-semibold border border-emerald-200">{services.length} service{services.length>1?'s':''} selected</div>
                )}
              </div>
              <div className="mt-6">
                <ServiceSelector value={services} onChange={setServices} />
              </div>
            </div>
          )}
          {step===1 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold">Basic details</h2>
              <input placeholder="Listing title" className="w-full px-4 py-3 rounded-xl border" />
              <textarea placeholder="Describe your space and what makes it special..." rows={5} className="w-full px-4 py-3 rounded-xl border" />
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl border"><MapPin className="size-5 text-emerald2" /><input placeholder="Location e.g. Dal Lake, Srinagar" className="flex-1 outline-none" /></div>
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
              <h2 className="font-display text-2xl font-bold">Add stunning photos</h2>
              <p className="text-sm text-muted-foreground mt-1">High-quality photos boost bookings by 2x. Upload at least 5.</p>
              <label className="mt-5 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl py-12 cursor-pointer hover:bg-secondary/40 transition">
                <Upload className="size-7 text-emerald2" />
                <div className="font-semibold">Click to upload</div>
                <div className="text-xs text-muted-foreground">JPG, PNG · up to 12MB each</div>
                <input type="file" multiple accept="image/*" onChange={onPhotos} className="hidden" />
              </label>
              {photos.length>0 && <div className="mt-4 grid grid-cols-3 md:grid-cols-4 gap-2">{photos.map((p,i)=><img key={i} src={p} className="aspect-square rounded-xl object-cover" alt="" />)}</div>}
            </div>
          )}
          {step===3 && (
            <div>
              <h2 className="font-display text-2xl font-bold">Select amenities</h2>
              <p className="text-sm text-muted-foreground mt-1">In-room and on-property amenities travelers should know about.</p>
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
              <div className="flex items-baseline gap-2"><span className="text-2xl">₹</span><input defaultValue={4500} type="number" className="flex-1 font-display text-5xl font-bold outline-none border-b-2 pb-2" /></div>
              <p className="text-sm text-muted-foreground">Suggested for similar listings: ₹ 3,800 — ₹ 6,200 / night</p>
              <div className="grid grid-cols-2 gap-3 mt-3"><div className="p-4 rounded-xl border"><div className="text-xs text-muted-foreground">You earn</div><div className="font-bold">₹ 4,050</div></div><div className="p-4 rounded-xl border"><div className="text-xs text-muted-foreground">Safar fee (10%)</div><div className="font-bold">₹ 450</div></div></div>
            </div>
          )}
          {step===5 && (
            <div>
              <h2 className="font-display text-2xl font-bold">Review and publish</h2>
              <div className="mt-5 p-5 rounded-2xl border bg-secondary/40">
                <div className="text-xs uppercase tracking-wider text-emerald2 font-semibold flex items-center gap-1"><Sparkles className="size-3.5" /> AI suggested title</div>
                <div className="font-display font-bold mt-1">&ldquo;Authentic Kashmiri retreat · Stay, wazwan &amp; airport pickup&rdquo;</div>
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Services included ({services.length})</div>
                  <ServiceBadges ids={services} max={20} />
                </div>
                <div className="text-xs text-muted-foreground mt-3">{amen.length} amenities · {photos.length || 0} photos · ₹ 4,500/night</div>
              </div>
              <Button className="mt-5 w-full rounded-full bg-gradient-emerald h-12 font-semibold">Publish listing</Button>
            </div>
          )}
          <div className="mt-8 flex justify-between">
            <Button variant="outline" className="rounded-full" disabled={step===0} onClick={()=>setStep(Math.max(0,step-1))}><ChevronLeft className="size-4 mr-1" /> Back</Button>
            <Button className="rounded-full bg-gradient-emerald font-semibold" disabled={step===STEPS.length-1 || (step===0 && services.length===0)} onClick={()=>setStep(Math.min(STEPS.length-1,step+1))}>{step===0 && services.length===0 ? 'Pick at least one service' : 'Continue'} <ChevronRight className="size-4 ml-1" /></Button>
          </div>
        </motion.div>

        <aside className="space-y-5">
          <div className="rounded-3xl border bg-gradient-to-br from-emerald-50/60 to-white p-6">
            <Sparkles className="size-5 text-emerald2" />
            <div className="font-display font-bold text-lg mt-3">Multi-service hosts grow faster</div>
            <ul className="mt-3 space-y-2 text-sm text-charcoal/80">
              <li className="flex gap-2"><Check className="size-4 text-emerald2 mt-0.5" /> Bundle stays + transport + tours</li>
              <li className="flex gap-2"><Check className="size-4 text-emerald2 mt-0.5" /> Auto-listed in matching filters</li>
              <li className="flex gap-2"><Check className="size-4 text-emerald2 mt-0.5" /> Add or remove services anytime</li>
              <li className="flex gap-2"><Check className="size-4 text-emerald2 mt-0.5" /> Direct WhatsApp with travelers</li>
              <li className="flex gap-2"><Check className="size-4 text-emerald2 mt-0.5" /> Weekly payouts &amp; AI insights</li>
            </ul>
            <Link href="/about" className="mt-4 inline-block text-sm font-semibold text-emerald2 hover:underline">Learn more</Link>
          </div>

          {/* Live preview of selected services by group */}
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
export default App;
