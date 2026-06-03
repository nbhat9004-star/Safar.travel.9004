'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Wallet, Calendar, Star, Plus, Eye, BarChart3, ArrowUpRight, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProtectedRoute from '@/components/safar/ProtectedRoute';
import ProfileSettings from '@/components/safar/ProfileSettings';
import { useAuth } from '@/lib/auth-context';
import { listingsApi, bookingsApi } from '@/lib/listings-api';

function Bars({ data }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((v,i)=>(
        <motion.div key={i} initial={{ height: 0 }} whileInView={{ height: `${(v/max)*100}%` }} viewport={{ once: true }} transition={{ delay: i*0.04, duration: 0.6 }}
          className="flex-1 rounded-t-md bg-gradient-to-t from-emerald-700 to-emerald-400" />
      ))}
    </div>
  );
}

const StatusPill = ({ s }) => {
  const map = {
    approved: 'bg-emerald-50 text-emerald2 border-emerald-200',
    pending:  'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-rose-50 text-rose-600 border-rose-200',
  };
  return <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${map[s]||'bg-secondary'}`}>{s}</span>;
};

function HostDashboardInner() {
  const { user } = useAuth();
  const [myListings, setMyListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const earnings = [12,18,9,22,28,31,26,38,33,42,46,52];

  const load = async () => {
    setLoading(true); setError(null);
    const [r, b] = await Promise.all([
      listingsApi.myHostListings(),
      bookingsApi.list('received'),
    ]);
    if (r.ok && r.data?.ok) setMyListings(r.data.listings || []);
    else setError(r.data?.error || 'Failed to load listings');
    if (b.ok && b.data?.ok) setBookings(b.data.bookings || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onDelete = async (id) => {
    if (!confirm('Delete this listing?')) return;
    const { ok, data } = await listingsApi.remove(id);
    if (!ok) return toast.error(data?.error || 'Delete failed');
    toast.success('Listing deleted');
    load();
  };

  const updateBooking = async (id, status) => {
    const { ok, data } = await bookingsApi.patch(id, status);
    if (!ok) return toast.error(data?.error || 'Action failed');
    toast.success(status === 'approved' ? 'Booking approved' : 'Booking rejected');
    load();
  };

  const counts = {
    total: myListings.length,
    approved: myListings.filter(l => l.status === 'approved').length,
    pending:  myListings.filter(l => l.status === 'pending').length,
    rejected: myListings.filter(l => l.status === 'rejected').length,
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 container">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-emerald2 text-xs uppercase tracking-[0.18em] font-semibold">Host Studio</div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mt-2">Salaam, {user?.name?.split(' ')[0] || 'Host'} 👋</h1>
          </div>
          <Button asChild className="rounded-full bg-emerald2 hover:bg-emerald2-deep font-semibold"><Link href="/add-listing"><Plus className="size-4 mr-2" /> Add new listing</Link></Button>
        </div>

        <Tabs defaultValue="dashboard" className="mt-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-8">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {l:'Listings',     v: counts.total,    d:`+${counts.pending} pending`, i: BarChart3},
                {l:'Approved',     v: counts.approved, d:`live`, i: Eye},
                {l:'Avg rating',   v: '4.94',          d:'+0.04', i: Star},
                {l:'Earnings (mo)',v: '₹ 4,82,400',   d:'+18%', i: Wallet},
              ].map((k,i)=>{const Ico=k.i;return(
                <motion.div key={k.l} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.05 }} className="rounded-3xl border bg-white p-5">
                  <div className="flex items-center justify-between"><Ico className="size-5 text-emerald2" /><div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">{k.d} <ArrowUpRight className="size-3" /></div></div>
                  <div className="font-display text-2xl font-bold mt-3">{k.v}</div>
                  <div className="text-xs text-muted-foreground">{k.l}</div>
                </motion.div>
              );})}
            </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 rounded-3xl border bg-white p-6">
            <div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Earnings</div><div className="font-display text-2xl font-bold">₹ 4.82L this month</div></div><BarChart3 className="size-5 text-emerald2" /></div>
            <div className="mt-5"><Bars data={earnings} /></div>
            <div className="mt-2 grid grid-cols-12 text-[10px] text-muted-foreground">{['J','F','M','A','M','J','J','A','S','O','N','D'].map((m)=><div key={m} className="text-center">{m}</div>)}</div>
          </div>
          <div className="rounded-3xl border bg-white p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Performance</div>
            <div className="mt-3 space-y-3">
              {[{l:'Occupancy',v:78},{l:'Response rate',v:96},{l:'On-time check-ins',v:91}].map((p)=>(
                <div key={p.l}><div className="flex justify-between text-sm"><span>{p.l}</span><span className="font-semibold">{p.v}%</span></div><div className="h-2 bg-secondary rounded-full mt-1 overflow-hidden"><motion.div initial={{ width: 0 }} whileInView={{ width: `${p.v}%` }} viewport={{ once: true }} className="h-full bg-gradient-emerald" /></div></div>
              ))}
            </div>
          </div>
        </div>

        {/* Booking Requests */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-bold">Booking requests</h2>
            <span className="text-sm text-muted-foreground">{bookings.filter(b=>b.status==='pending').length} pending</span>
          </div>
          {!loading && bookings.length === 0 && (
            <div className="p-6 rounded-3xl border bg-white text-center text-sm text-muted-foreground">No booking requests yet.</div>
          )}
          {!loading && bookings.length > 0 && (
            <div className="rounded-3xl border bg-white overflow-hidden">
              <div className="grid grid-cols-12 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b">
                <div className="col-span-4">Listing</div><div className="col-span-3">Guest</div><div className="col-span-2">Dates</div><div className="col-span-1">Status</div><div className="col-span-2 text-right">Action</div>
              </div>
              {bookings.map((b) => (
                <div key={b.bookingId} className="grid grid-cols-12 px-5 py-3 border-b last:border-0 items-center hover:bg-secondary/40 transition">
                  <div className="col-span-4 flex items-center gap-3">{b.listingImage && <img src={b.listingImage} className="size-10 rounded-lg object-cover" alt="" />}<div><div className="font-semibold text-sm line-clamp-1">{b.listingTitle}</div>{b.inventoryTypeName && <div className="text-xs text-emerald2 font-medium">{b.inventoryTypeName}</div>}<div className="text-xs text-muted-foreground">₹{(b.totalPrice||0).toLocaleString('en-IN')} · {b.nights}n</div></div></div>
                  <div className="col-span-3"><div className="text-sm">{b.travelerName}</div><div className="text-xs text-muted-foreground">{b.guests} guests</div></div>
                  <div className="col-span-2 text-xs">{new Date(b.checkInDate).toLocaleDateString()} →<br/>{new Date(b.checkOutDate).toLocaleDateString()}</div>
                  <div className="col-span-1"><span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${b.status==='approved'?'bg-emerald-50 text-emerald2 border-emerald-200':b.status==='pending'?'bg-amber-50 text-amber-700 border-amber-200':b.status==='rejected'?'bg-rose-50 text-rose-600 border-rose-200':'bg-secondary text-muted-foreground border-border'}`}>{b.status}</span></div>
                  <div className="col-span-2 flex gap-1.5 justify-end">
                    {b.status === 'pending' && <>
                      <Button onClick={()=>updateBooking(b.bookingId,'approved')} size="sm" className="rounded-full h-8 bg-emerald2 hover:bg-emerald2-deep">Approve</Button>
                      <Button onClick={()=>updateBooking(b.bookingId,'rejected')} size="sm" variant="ghost" className="rounded-full h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50">Reject</Button>
                    </>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* My Listings */}
        <section>
          <h2 className="font-display text-2xl font-bold">My listings</h2>
          {loading && <div className="py-12 grid place-items-center"><Loader2 className="size-6 animate-spin text-emerald2" /></div>}
          {error && <div className="mt-4 p-6 border rounded-3xl bg-rose-50/40 border-rose-200 text-center"><AlertTriangle className="size-6 mx-auto text-rose-500" /><div className="mt-2 text-sm">{error}</div></div>}
          {!loading && !error && myListings.length === 0 && (
            <div className="mt-4 p-10 border rounded-3xl bg-white text-center">
              <Plus className="size-7 mx-auto text-emerald2" />
              <div className="font-display text-lg font-bold mt-3">No listings yet</div>
              <p className="text-sm text-muted-foreground mt-1">Create your first listing — it&#39;ll appear here once submitted.</p>
              <Button asChild className="rounded-full mt-4 bg-emerald2 hover:bg-emerald2-deep"><Link href="/add-listing">Add new listing</Link></Button>
            </div>
          )}
          {!loading && myListings.length > 0 && (
            <div className="mt-4 rounded-3xl border bg-white overflow-hidden">
              <div className="grid grid-cols-12 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b">
                <div className="col-span-5">Listing</div><div className="col-span-2">Price</div><div className="col-span-2">Status</div><div className="col-span-2">Rating</div><div className="col-span-1"></div>
              </div>
              {myListings.map((l)=>(
                <div key={l.id} className="grid grid-cols-12 px-5 py-3 border-b last:border-0 items-center hover:bg-secondary/40 transition">
                  <div className="col-span-5 flex items-center gap-3"><img src={(l.images && l.images[0]) || ''} className="size-12 rounded-xl object-cover bg-secondary" alt="" /><div><div className="font-semibold text-sm line-clamp-1">{l.title}</div><div className="text-xs text-muted-foreground">{l.location}</div>{l.inventoryTypes && l.inventoryTypes.length > 0 && <div className="text-xs text-emerald2 font-medium mt-0.5">{l.inventoryTypes.length} type{l.inventoryTypes.length > 1 ? 's' : ''} · {l.inventoryTypes.reduce((sum, t) => sum + t.quantity, 0)} units</div>}</div></div>
                  <div className="col-span-2 text-sm font-semibold">₹{l.price.toLocaleString('en-IN')}</div>
                  <div className="col-span-2"><StatusPill s={l.status} /></div>
                  <div className="col-span-2 text-sm flex items-center gap-1"><Star className="size-3.5 text-gold fill-gold" /> {l.rating || '—'}</div>
                  <div className="col-span-1 flex items-center gap-2 justify-end">
                    <Link href={`/property/${l.id}`} className="text-xs font-semibold text-emerald2 hover:underline">View</Link>
                    <button onClick={()=>onDelete(l.id)} className="text-rose-500 hover:text-rose-700" title="Delete"><Trash2 className="size-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-6">
            <ProfileSettings user={user} onUpdate={load} />
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </main>
  );
}

export default function App() {
  return <ProtectedRoute roles={['host','admin']}><HostDashboardInner /></ProtectedRoute>;
}
