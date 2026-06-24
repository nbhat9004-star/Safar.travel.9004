'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, ChevronLeft, ChevronRight, Check, Upload, Sparkles, ListChecks, Wifi, Coffee, Wind, ParkingCircle, Image as ImageIcon, Loader2, AlertTriangle } from 'lucide-react';
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

const STEPS = ['Category','Details','Pricing & Publish'];
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
  const [resendingVerification, setResendingVerification] = useState(false);

  // form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState(4500);
  
  // Inventory types state
  const [useInventoryTypes, setUseInventoryTypes] = useState(false);
  const [inventoryTypes, setInventoryTypes] = useState([]);

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

  // Inventory types helpers
  const addInventoryType = () => {
    setInventoryTypes([...inventoryTypes, {
      id: Date.now().toString(),
      name: '',
      description: '',
      price: price,
      quantity: 1,
      images: [],
      status: 'active',
      displayOrder: inventoryTypes.length
    }]);
  };

  const removeInventoryType = (id) => {
    setInventoryTypes(inventoryTypes.filter(t => t.id !== id));
  };

  const updateInventoryType = (id, field, value) => {
    setInventoryTypes(inventoryTypes.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

  const moveTypeUp = (index) => {
    if (index === 0) return;
    const newTypes = [...inventoryTypes];
    [newTypes[index - 1], newTypes[index]] = [newTypes[index], newTypes[index - 1]];
    newTypes.forEach((t, i) => t.displayOrder = i);
    setInventoryTypes(newTypes);
  };

  const moveTypeDown = (index) => {
    if (index === inventoryTypes.length - 1) return;
    const newTypes = [...inventoryTypes];
    [newTypes[index], newTypes[index + 1]] = [newTypes[index + 1], newTypes[index]];
    newTypes.forEach((t, i) => t.displayOrder = i);
    setInventoryTypes(newTypes);
  };

  const handleResendVerification = async () => {
    if (!user?.email) {
      toast.error('No email address found');
      return;
    }
    setResendingVerification(true);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Verification email sent! Please check your inbox and spam folder.');
      } else {
        toast.error(data.error || 'Unable to send verification email. Please try again.');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      toast.error('Unable to send verification email. Please try again.');
    } finally {
      setResendingVerification(false);
    }
  };

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
      inventoryTypes: useInventoryTypes ? inventoryTypes.map(t => ({
        name: t.name,
        description: t.description,
        price: Number(t.price),
        quantity: Number(t.quantity),
        images: Array.isArray(t.images) ? t.images : [],
        status: t.status,
        displayOrder: t.displayOrder
      })) : []
    };
    const { ok, data } = await listingsApi.create(payload);
    setSubmitting(false);
    if (!ok) { toast.error(data?.error || 'Failed to create listing'); return; }
    toast.success('Listing submitted! It will appear after admin approval.');
    router.push('/dashboard/host');
  };

  // Email Verification Guard
  if (user && !user.emailVerified) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-20 container">
          <div className="max-w-2xl mx-auto text-center py-20">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="size-20 rounded-full bg-amber-50 border-2 border-amber-200 text-amber-600 grid place-items-center mx-auto">
              <AlertTriangle className="size-10" />
            </motion.div>
            <h2 className="font-display text-3xl font-bold mt-6">Verify your email to create listings</h2>
            <p className="text-muted-foreground mt-3 max-w-md mx-auto">
              Please verify your email address before creating listings. Check your inbox for the verification email.
            </p>
            <Button
              onClick={handleResendVerification}
              disabled={resendingVerification}
              className="mt-6 rounded-full bg-emerald2 hover:bg-emerald2-deep font-semibold"
            >
              {resendingVerification ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Resend Verification Email'
              )}
            </Button>
            <div className="mt-8 p-5 rounded-2xl border bg-secondary/40 text-left max-w-md mx-auto">
              <div className="text-xs font-semibold text-emerald2 uppercase tracking-wider">Why verify?</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-emerald2 mt-0.5 shrink-0" />
                  <span>Protect your account and listings</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-emerald2 mt-0.5 shrink-0" />
                  <span>Receive booking notifications</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-emerald2 mt-0.5 shrink-0" />
                  <span>Build trust with travelers</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

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
          {/* STEP 0: Category & Services */}
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

          {/* STEP 1: Details (Name, Description, Location, Photos, Amenities) */}
          {step===1 && (
            <div className="space-y-8">
              <div>
                <h2 className="font-display text-2xl font-bold mb-4">Listing Details</h2>
                <div className="space-y-4">
                  <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Listing title" className="w-full px-4 py-3 rounded-xl border" />
                  <textarea value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Describe your space and what makes it special..." rows={5} className="w-full px-4 py-3 rounded-xl border" />
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl border">
                    <MapPin className="size-5 text-emerald2" />
                    <input value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="Location e.g. Dal Lake, Srinagar" className="flex-1 outline-none" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-display text-xl font-bold mb-3">Photos</h3>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl py-8 cursor-pointer hover:bg-secondary/40 transition">
                  <Upload className="size-6 text-emerald2" />
                  <div className="font-semibold text-sm">Click to upload</div>
                  <div className="text-xs text-muted-foreground">JPG, PNG · multiple allowed</div>
                  <input type="file" multiple accept="image/*" onChange={onPhotos} className="hidden" />
                </label>
                <div className="mt-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Or paste image URLs</div>
                  {photoUrls.map((u, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <input value={u} onChange={(e)=>{ const next=[...photoUrls]; next[i]=e.target.value; setPhotoUrls(next); }} placeholder="https://images.unsplash.com/..." className="flex-1 px-4 py-2.5 rounded-xl border text-sm" />
                      {i === photoUrls.length-1 && <button type="button" onClick={()=>setPhotoUrls([...photoUrls, ''])} className="px-3 py-2.5 rounded-xl bg-secondary text-xs font-semibold">+ Add</button>}
                    </div>
                  ))}
                </div>
                {(photos.length>0 || photoUrls.some(u=>u.startsWith('http'))) && (
                  <div className="mt-3 grid grid-cols-3 md:grid-cols-4 gap-2">
                    {[...photoUrls.filter(u=>u.startsWith('http')), ...photos].map((p,i)=><img key={i} src={p} className="aspect-square rounded-xl object-cover" alt="" />)}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-display text-xl font-bold mb-3">Amenities</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {AMEN.map((a)=>{const I=a.i;const on=amen.includes(a.t);return(
                    <button key={a.t} onClick={()=>setAmen(on?amen.filter(x=>x!==a.t):[...amen,a.t])} className={`p-3 rounded-xl border-2 text-left transition flex items-center gap-2 ${on?'border-emerald-600 bg-emerald-50/40':'border-border hover:border-charcoal/40'}`}><I className="size-5 text-emerald2" /><span className="text-sm font-medium">{a.t}</span></button>
                  );})}
                </div>
              </div>

              {services.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Your selected services</div>
                  <ServiceBadges ids={services} max={20} />
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Pricing, Inventory (Collapsible), Review & Publish */}
          {step===2 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold mb-4">Set your price</h2>
                <div className="flex items-baseline gap-2"><span className="text-2xl">₹</span><input value={price} onChange={(e)=>setPrice(e.target.value)} type="number" className="flex-1 font-display text-5xl font-bold outline-none border-b-2 pb-2" /></div>
                <p className="text-sm text-muted-foreground mt-2">Suggested for similar listings: ₹ 3,800 — ₹ 6,200 / night</p>
                <div className="grid grid-cols-2 gap-3 mt-4"><div className="p-4 rounded-xl border"><div className="text-xs text-muted-foreground">You earn (90%)</div><div className="font-bold">₹ {Math.round(price*0.9).toLocaleString('en-IN')}</div></div><div className="p-4 rounded-xl border"><div className="text-xs text-muted-foreground">Safar fee (10%)</div><div className="font-bold">₹ {Math.round(price*0.1).toLocaleString('en-IN')}</div></div></div>
              </div>

              {/* Collapsible Inventory Section */}
              <details className="rounded-2xl border bg-secondary/10">
                <summary className="px-5 py-4 cursor-pointer font-semibold text-sm flex items-center justify-between hover:bg-secondary/20 transition rounded-2xl">
                  <span>⚙️ Advanced: Multi-Type Inventory (Optional)</span>
                  <span className="text-xs text-muted-foreground">Click to expand</span>
                </summary>
                <div className="px-5 pb-5 pt-2">
                  <p className="text-sm text-muted-foreground mb-4">For hotels, homestays, or fleets: Create room/vehicle types with different pricing.</p>
                  <Button
                    type="button"
                    size="sm"
                    variant={useInventoryTypes ? "default" : "outline"}
                    onClick={() => {
                      setUseInventoryTypes(!useInventoryTypes);
                      if (!useInventoryTypes && inventoryTypes.length === 0) {
                        addInventoryType();
                      }
                    }}
                    className="rounded-full mb-4"
                  >
                    {useInventoryTypes ? 'Enabled' : 'Enable Multi-Type'}
                  </Button>
                  
                  {!useInventoryTypes && (
                    <div className="p-4 rounded-xl border bg-white/50">
                      <div className="text-sm text-muted-foreground">
                        Skip this if you have a single-unit property. Enable for hotels with multiple room types or vehicle rentals.
                      </div>
                    </div>
                  )}

                  {useInventoryTypes && (
                    <div className="space-y-4">
                      {inventoryTypes.map((type, idx) => (
                        <div key={type.id} className="p-4 rounded-xl border bg-white">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-emerald2">Type {idx + 1}</div>
                              <div className="flex gap-1">
                                <button type="button" onClick={() => moveTypeUp(idx)} disabled={idx === 0} className="p-1 hover:bg-secondary rounded disabled:opacity-30 text-xs">↑</button>
                                <button type="button" onClick={() => moveTypeDown(idx)} disabled={idx === inventoryTypes.length - 1} className="p-1 hover:bg-secondary rounded disabled:opacity-30 text-xs">↓</button>
                              </div>
                            </div>
                            <button type="button" onClick={() => removeInventoryType(type.id)} className="text-xs text-rose-500 hover:underline">Remove</button>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-2">
                            <input type="text" placeholder="Name (e.g., Standard Room)" value={type.name} onChange={(e) => updateInventoryType(type.id, 'name', e.target.value)} className="px-3 py-2 rounded-xl border text-sm" />
                            <input type="number" placeholder="Price per night" value={type.price} onChange={(e) => updateInventoryType(type.id, 'price', e.target.value)} className="px-3 py-2 rounded-xl border text-sm" />
                            <input type="number" placeholder="Quantity" min="1" value={type.quantity} onChange={(e) => updateInventoryType(type.id, 'quantity', e.target.value)} className="px-3 py-2 rounded-xl border text-sm" />
                            <select value={type.status} onChange={(e) => updateInventoryType(type.id, 'status', e.target.value)} className="px-3 py-2 rounded-xl border text-sm">
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </div>
                          <textarea placeholder="Description (optional)" value={type.description} onChange={(e) => updateInventoryType(type.id, 'description', e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm mt-2" rows={2} />
                        </div>
                      ))}
                      <Button type="button" onClick={addInventoryType} variant="outline" className="w-full rounded-full text-sm">+ Add Another Type</Button>
                    </div>
                  )}
                </div>
              </details>

              {/* Review Summary */}
              <div>
                <h3 className="font-display text-xl font-bold mb-3">Review Summary</h3>
                <div className="p-5 rounded-2xl border bg-secondary/40">
                  <div className="text-xs uppercase tracking-wider text-emerald2 font-semibold capitalize">{category}</div>
                  <div className="font-display font-bold mt-1">{title || `New ${category} listing in Kashmir`}</div>
                  <div className="text-xs text-muted-foreground mt-1">{location || 'Location not set'} · {useInventoryTypes ? `${inventoryTypes.length} type(s)` : `₹${Number(price).toLocaleString('en-IN')}`}</div>
                  <div className="mt-4"><div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Services ({services.length})</div><ServiceBadges ids={services} max={20} /></div>
                  {useInventoryTypes && inventoryTypes.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Inventory Types</div>
                      {inventoryTypes.map(t => (
                        <div key={t.id} className="text-xs flex justify-between">
                          <span>{t.name}</span>
                          <span className="text-emerald2 font-semibold">₹{Number(t.price).toLocaleString('en-IN')} × {t.quantity} units</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Publish Button */}
              <Button onClick={handlePublish} disabled={submitting} className="w-full rounded-full bg-emerald2 hover:bg-emerald2-deep h-12 font-semibold text-base">
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
