'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Heart, Calendar, MessageCircle, Wand2, Compass, BookOpen, MapPin, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import AIAssistantFloating from '@/components/safar/AIAssistantFloating';
import ProtectedRoute from '@/components/safar/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { LISTINGS } from '@/lib/data';
import { useAuth } from '@/lib/auth-context';
import { bookingsApi } from '@/lib/listings-api';

const StatusPill = ({ s }) => {
  const map = {
    approved: 'bg-emerald-50 text-emerald2 border-emerald-200',
    pending:  'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-rose-50 text-rose-600 border-rose-200',
    cancelled:'bg-secondary text-muted-foreground border-border',
  };
  return <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${map[s]||'bg-secondary'}`}>{s}</span>;
};

function TravelerDashboardInner() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loadingBk, setLoadingBk] = useState(true);
  const wishlist = LISTINGS.slice(2,6);

  const loadBookings = async () => {
    setLoadingBk(true);
    const { ok, data } = await bookingsApi.list();
    if (ok && data?.ok) setBookings(data.bookings || []);
    setLoadingBk(false);
  };
  useEffect(() => { loadBookings(); }, []);

  const cancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    const { ok, data } = await bookingsApi.patch(id, 'cancelled');
    if (!ok) return toast.error(data?.error || 'Cancel failed');
    toast.success('Booking cancelled');
    loadBookings();
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 container">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-emerald2 text-xs uppercase tracking-[0.18em] font-semibold">Welcome back, {user?.name?.split(' ')[0] || 'Traveler'}</div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mt-2">Your travel hub</h1>
          </div>
          <Button asChild className="rounded-full bg-emerald2 hover:bg-emerald2-deep font-semibold"><Link href="/ai-planner"><Wand2 className="size-4 mr-2" /> Open AI Planner</Link></Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            {l:'My bookings', v: bookings.length, i: Calendar},
            {l:'Approved',    v: bookings.filter(b=>b.status==='approved').length, i: Calendar},
            {l:'Pending',     v: bookings.filter(b=>b.status==='pending').length,  i: BookOpen},
            {l:'Wishlist',    v: 14, i: Heart},
          ].map((k,i)=>{const Ico=k.i;return(
            <motion.div key={k.l} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.05 }} className="rounded-3xl border bg-white p-5">
              <Ico className="size-5 text-emerald2" />
              <div className="font-display text-3xl font-bold mt-3">{k.v}</div>
              <div className="text-xs text-muted-foreground">{k.l}</div>
            </motion.div>
          );})}
        </div>

        {/* My Bookings */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4"><h2 className="font-display text-2xl font-bold">My bookings</h2><Link href="/explore" className="text-sm text-emerald2 hover:underline">Browse more</Link></div>
          {loadingBk && <div className="py-10 grid place-items-center"><Loader2 className="size-6 animate-spin text-emerald2" /></div>}
          {!loadingBk && bookings.length === 0 && (
            <div className="p-10 border rounded-3xl bg-white text-center">
              <Calendar className="size-7 mx-auto text-emerald2" />
              <div className="font-display text-lg font-bold mt-3">No bookings yet</div>
              <p className="text-sm text-muted-foreground mt-1">Find a stay and send your first booking request.</p>
              <Button asChild className="rounded-full mt-4 bg-emerald2 hover:bg-emerald2-deep"><Link href="/explore">Explore Stays</Link></Button>
            </div>
          )}
          {!loadingBk && bookings.length > 0 && (
            <div className="grid md:grid-cols-2 gap-5">
              {bookings.map((b, i) => (
                <motion.div key={b.bookingId} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.04 }}
                  className="rounded-3xl border bg-white overflow-hidden flex flex-col md:flex-row">
                  {b.listingImage && <img src={b.listingImage} alt="" className="md:w-48 h-44 md:h-auto object-cover" />}
                  <div className="p-5 flex-1">
                    <div className="flex items-center justify-between gap-2"><StatusPill s={b.status} /><div className="text-[11px] text-muted-foreground">Booking #{b.bookingId.slice(0,8)}</div></div>
                    <div className="font-display font-bold mt-2">{b.listingTitle}</div>
                    <div className="text-xs text-muted-foreground mt-1">Host: {b.hostName}</div>
                    <div className="mt-3 text-sm">{new Date(b.checkInDate).toLocaleDateString()} → {new Date(b.checkOutDate).toLocaleDateString()} · {b.nights} nights · {b.guests} guests</div>
                    <div className="mt-1 text-sm font-semibold">₹{(b.totalPrice||0).toLocaleString('en-IN')}</div>
                    <div className="mt-4 flex gap-2">
                      <Button asChild size="sm" className="rounded-full bg-emerald2 hover:bg-emerald2-deep"><Link href={`/property/${b.listingId}`}>View listing</Link></Button>
                      {(b.status === 'pending' || b.status === 'approved') && (
                        <Button onClick={()=>cancel(b.bookingId)} size="sm" variant="outline" className="rounded-full text-rose-600"><X className="size-4 mr-1" /> Cancel</Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Wishlist */}
        <section className="mt-12 mb-12">
          <div className="flex items-center justify-between mb-4"><h2 className="font-display text-2xl font-bold">Recently liked</h2><Link href="/wishlist" className="text-sm text-emerald2 hover:underline">See all</Link></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {wishlist.map((w) => (
              <Link key={w.id} href={`/property/${w.id}`} className="group rounded-3xl overflow-hidden block relative aspect-square">
                <img src={w.image} className="absolute inset-0 size-full object-cover group-hover:scale-110 transition duration-700" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 text-white"><div className="text-xs font-semibold line-clamp-1">{w.title}</div><div className="text-[10px] text-white/70">₹{w.price.toLocaleString('en-IN')}</div></div>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <Footer />
      <AIAssistantFloating />
    </main>
  );
}

export default function App() {
  return <ProtectedRoute roles={['traveler','host','admin']}><TravelerDashboardInner /></ProtectedRoute>;
}

function TravelerDashboardInner() {
  const { user } = useAuth();
  const upcoming = [LISTINGS[0], LISTINGS[1]];
  const wishlist = LISTINGS.slice(2,6);
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 container">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-emerald2 text-xs uppercase tracking-[0.18em] font-semibold">Welcome back, {user?.name?.split(' ')[0] || 'Traveler'}</div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mt-2">Your travel hub</h1>
          </div>
          <Button asChild className="rounded-full bg-emerald2 hover:bg-emerald2-deep font-semibold"><Link href="/ai-planner"><Wand2 className="size-4 mr-2" /> Open AI Planner</Link></Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[{l:'Upcoming trips',v:'2',i:Calendar},{l:'Wishlist',v:'14',i:Heart},{l:'Saved itineraries',v:'3',i:BookOpen},{l:'AI plans',v:'7',i:Sparkles}].map((k,i)=>{const Ico=k.i;return(
            <motion.div key={k.l} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.05 }} className="rounded-3xl border bg-white p-5">
              <Ico className="size-5 text-emerald2" />
              <div className="font-display text-3xl font-bold mt-3">{k.v}</div>
              <div className="text-xs text-muted-foreground">{k.l}</div>
            </motion.div>
          );})}
        </div>

        {/* Upcoming */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-4"><h2 className="font-display text-2xl font-bold">Upcoming bookings</h2><Link href="/explore" className="text-sm text-emerald2 hover:underline">Browse more</Link></div>
          <div className="grid md:grid-cols-2 gap-5">
            {upcoming.map((u, i) => (
              <motion.div key={u.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i*0.07 }}
                className="rounded-3xl border bg-white overflow-hidden flex flex-col md:flex-row">
                <img src={u.image} alt="" className="md:w-56 h-48 md:h-auto object-cover" />
                <div className="p-5 flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-emerald2 font-semibold">Confirmed</div>
                  <div className="font-display font-bold mt-1">{u.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="size-3" /> {u.location}</div>
                  <div className="mt-3 text-sm">12–16 Jul · 2 guests · ₹{(u.price*4).toLocaleString('en-IN')}</div>
                  <div className="mt-4 flex gap-2">
                    <Button asChild size="sm" className="rounded-full"><Link href={`/property/${u.id}`}>View</Link></Button>
                    <Button asChild size="sm" variant="outline" className="rounded-full"><a href="#"><MessageCircle className="size-4 mr-1" /> Chat host</a></Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Itinerary preview */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-4"><h2 className="font-display text-2xl font-bold">Saved itineraries</h2></div>
          <div className="grid md:grid-cols-3 gap-5">
            {[{t:'5-day Honeymoon',sub:'Srinagar → Gulmarg → Pahalgam'},{t:'4-day Family Fun',sub:'Srinagar → Gulmarg'},{t:'3-day Adventure',sub:'Sonamarg + Pahalgam'}].map((it,i)=>(
              <motion.div key={it.t} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i*0.05 }}
                className="rounded-3xl border bg-gradient-to-br from-emerald-50/60 to-white p-5">
                <Compass className="size-5 text-emerald2" />
                <div className="font-display font-bold mt-3">{it.t}</div>
                <div className="text-xs text-muted-foreground mt-1">{it.sub}</div>
                <Button asChild variant="outline" size="sm" className="mt-4 rounded-full"><Link href="/ai-planner">Open plan</Link></Button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Wishlist */}
        <section className="mt-12 mb-12">
          <div className="flex items-center justify-between mb-4"><h2 className="font-display text-2xl font-bold">Recently liked</h2><Link href="/wishlist" className="text-sm text-emerald2 hover:underline">See all</Link></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {wishlist.map((w) => (
              <Link key={w.id} href={`/property/${w.id}`} className="group rounded-3xl overflow-hidden block relative aspect-square">
                <img src={w.image} className="absolute inset-0 size-full object-cover group-hover:scale-110 transition duration-700" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 text-white"><div className="text-xs font-semibold line-clamp-1">{w.title}</div><div className="text-[10px] text-white/70">₹{w.price.toLocaleString('en-IN')}</div></div>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <Footer />
      <AIAssistantFloating />
    </main>
  );
}

export default function App() {
  return <ProtectedRoute roles={['traveler','host','admin']}><TravelerDashboardInner /></ProtectedRoute>;
}
