'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Star, MapPin, Heart, Share2, ShieldCheck, Wifi, Coffee, Wind, ParkingCircle, MessageCircle, ChevronRight, BadgeCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import AIAssistantFloating from '@/components/safar/AIAssistantFloating';
import ServiceBadges from '@/components/safar/ServiceBadges';
import { Button } from '@/components/ui/button';
import { useListing } from '@/lib/listings-api';
import { SERVICE_GROUPS, SERVICE_INDEX } from '@/lib/services';

const AMENITY_ICONS = { 'Wi-Fi': Wifi, 'Heater': Wind, 'Kahwa': Coffee, 'Parking': ParkingCircle };

function App() {
  const { id } = useParams();
  const { listing, loading, error } = useListing(id);
  const [liked, setLiked] = useState(false);
  const [guests, setGuests] = useState(2);

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 min-h-[60vh] grid place-items-center">
          <Loader2 className="size-7 animate-spin text-emerald2" />
        </div>
        <Footer />
      </main>
    );
  }
  if (error || !listing) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 container min-h-[60vh] grid place-items-center text-center">
          <div className="max-w-md">
            <AlertTriangle className="size-7 mx-auto text-rose-500" />
            <h2 className="font-display text-2xl font-bold mt-3">Listing not available</h2>
            <p className="text-sm text-muted-foreground mt-1">{error || 'This listing could not be found, or is pending approval.'}</p>
            <Button asChild className="rounded-full mt-5 bg-emerald2 hover:bg-emerald2-deep"><Link href="/explore">Back to Explore</Link></Button>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const item = listing;
  const gallery = (item.images && item.images.length) ? item.images : [];
  const nights = 4;
  const subtotal = item.price * nights;
  const tax = Math.round(subtotal * 0.12);
  const total = subtotal + tax + 800;

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 container">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/explore" className="hover:text-charcoal">Explore</Link>
          <ChevronRight className="size-3" />
          <span className="capitalize">{item.category}</span>
          <ChevronRight className="size-3" />
          <span className="text-charcoal font-medium line-clamp-1">{item.title}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-3">
          <div>
            <h1 className="font-display text-3xl md:text-5xl font-bold leading-tight">{item.title}</h1>
            <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="size-4 text-gold fill-gold" /> {item.rating || '—'} · {item.reviews || 0} reviews</span>
              <span className="flex items-center gap-1"><MapPin className="size-4" /> {item.location}</span>
              {item.superhost && <span className="flex items-center gap-1 text-emerald2"><BadgeCheck className="size-4" /> Superhost</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-full"><Share2 className="size-4 mr-2" /> Share</Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={()=>setLiked(!liked)}><Heart className={`size-4 mr-2 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} /> Save</Button>
          </div>
        </div>

        {gallery.length > 0 && (
          <div className="mt-6 grid grid-cols-4 grid-rows-2 gap-3 h-[60vh] min-h-[420px] rounded-3xl overflow-hidden">
            <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={gallery[0]} alt="" className="col-span-2 row-span-2 size-full object-cover" />
            {[1,2,3,4].map((i) => (
              <motion.img key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i*0.05 }}
                src={gallery[i % gallery.length]} alt="" className="size-full object-cover" />
            ))}
          </div>
        )}
      </div>

      <div className="container mt-10 grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-emerald2 font-semibold">Hosted by</div>
              <div className="flex items-center gap-3 mt-2">
                {item.hostAvatar && <img src={item.hostAvatar} alt="" className="size-12 rounded-full object-cover" />}
                <div>
                  <div className="font-display font-semibold">{item.hostName || 'Safar Host'}</div>
                  <div className="text-xs text-muted-foreground">{item.superhost ? 'Superhost · Local host' : 'Local host · Verified'}</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              {item.guests && <div><div className="font-semibold">{item.guests}</div><div className="text-xs text-muted-foreground">Guests</div></div>}
              {item.beds && <div><div className="font-semibold">{item.beds}</div><div className="text-xs text-muted-foreground">Beds</div></div>}
              {item.baths && <div><div className="font-semibold">{item.baths}</div><div className="text-xs text-muted-foreground">Baths</div></div>}
              {item.duration && <div><div className="font-semibold">{item.duration}</div><div className="text-xs text-muted-foreground">Duration</div></div>}
            </div>
          </div>

          <div className="prose prose-zinc max-w-none">
            <h3 className="font-display text-2xl font-bold">A signature Kashmir experience</h3>
            <p className="text-charcoal/80 leading-relaxed">{item.description || `${item.title} sits in ${item.location}, ready to deliver an unforgettable Kashmir experience.`}</p>
          </div>

          {item.amenities && item.amenities.length > 0 && (
            <div>
              <h3 className="font-display text-2xl font-bold mb-4">What this place offers</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {item.amenities.map((a) => {
                  const Ico = AMENITY_ICONS[a] || ShieldCheck;
                  return <div key={a} className="flex items-center gap-3 p-4 rounded-2xl border bg-white"><Ico className="size-5 text-emerald2" /><span className="font-medium">{a}</span></div>;
                })}
              </div>
            </div>
          )}

          {item.services && item.services.length > 0 && (
            <div>
              <div className="flex items-end justify-between flex-wrap gap-2 mb-4">
                <div>
                  <div className="text-emerald2 text-xs uppercase tracking-[0.18em] font-semibold">All-in-one host</div>
                  <h3 className="font-display text-2xl font-bold">Services offered by {item.hostName}</h3>
                </div>
                <div className="text-xs text-muted-foreground">{item.services.length} services</div>
              </div>
              <div className="space-y-4">
                {SERVICE_GROUPS.map((g) => {
                  const ids = (item.services || []).filter(id => SERVICE_INDEX[id]?.group === g.id);
                  if (!ids.length) return null;
                  return (
                    <div key={g.id} className="rounded-2xl border bg-white p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-display font-semibold">{g.label}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{ids.length} service{ids.length>1?'s':''}</div>
                      </div>
                      <ServiceBadges ids={ids} max={20} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-28 rounded-3xl border bg-white shadow-xl p-6">
            <div className="flex items-baseline justify-between">
              <div><span className="font-display text-3xl font-bold">₹{item.price.toLocaleString('en-IN')}</span><span className="text-sm text-muted-foreground"> / {item.duration ? item.duration : 'night'}</span></div>
              <div className="text-xs flex items-center gap-1 text-muted-foreground"><Star className="size-3.5 fill-gold text-gold" /> {item.rating || '—'}</div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="p-3 rounded-2xl border"><div className="text-[10px] uppercase tracking-wider font-semibold">Check-in</div><div className="text-sm mt-0.5">12 Jul 2025</div></div>
              <div className="p-3 rounded-2xl border"><div className="text-[10px] uppercase tracking-wider font-semibold">Check-out</div><div className="text-sm mt-0.5">16 Jul 2025</div></div>
              <div className="p-3 rounded-2xl border col-span-2 flex items-center justify-between">
                <div><div className="text-[10px] uppercase tracking-wider font-semibold">Guests</div><div className="text-sm mt-0.5">{guests} adults</div></div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>setGuests(Math.max(1,guests-1))} className="size-8 rounded-full border hover:bg-secondary">−</button>
                  <button onClick={()=>setGuests(guests+1)} className="size-8 rounded-full border hover:bg-secondary">+</button>
                </div>
              </div>
            </div>
            <Button asChild className="w-full mt-4 h-12 rounded-2xl bg-emerald2 hover:bg-emerald2-deep font-semibold">
              <Link href={`/booking?id=${item.id}&guests=${guests}`}>Reserve <ChevronRight className="size-4 ml-1" /></Link>
            </Button>
            <Button variant="outline" className="w-full mt-2 h-11 rounded-2xl" asChild>
              <a href={`https://wa.me/911234567890?text=Hi%20${encodeURIComponent(item.hostName||'host')}%2C%20I%27m%20interested%20in%20%22${encodeURIComponent(item.title)}%22%20on%20Safar.`} target="_blank" rel="noreferrer"><MessageCircle className="size-4 mr-2" /> Chat with Host on WhatsApp</a>
            </Button>
            <div className="mt-5 pt-5 border-t space-y-2 text-sm">
              <div className="flex justify-between"><span>₹{item.price.toLocaleString('en-IN')} × {nights} nights</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Cleaning fee</span><span>₹800</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Service &amp; taxes</span><span>₹{tax.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between font-semibold pt-2 border-t"><span>Total</span><span>₹{total.toLocaleString('en-IN')}</span></div>
            </div>
          </div>
        </aside>
      </div>

      <Footer />
      <AIAssistantFloating />
    </main>
  );
}
export default App;
