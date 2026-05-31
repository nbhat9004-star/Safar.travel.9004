'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users, Home, Calendar, Wallet, ShieldAlert, BarChart3, ArrowUpRight, Search, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import { Button } from '@/components/ui/button';
import ProtectedRoute from '@/components/safar/ProtectedRoute';
import { listingsApi, apiJson } from '@/lib/listings-api';

function LineChart({ data }) {
  const max = Math.max(...data); const min = Math.min(...data);
  const points = data.map((v,i)=>`${(i/(data.length-1))*100},${100-((v-min)/(max-min))*88-6}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-32">
      <defs><linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity="0.4" /><stop offset="100%" stopColor="#10B981" stopOpacity="0" /></linearGradient></defs>
      <polyline fill="none" stroke="#0F3D2E" strokeWidth="1.6" points={points} />
      <polygon fill="url(#gd)" points={`0,100 ${points} 100,100`} />
    </svg>
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

function AdminInner() {
  const [pending, setPending] = useState([]);
  const [all, setAll] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const revenue = [22,28,34,30,42,55,49,62,68,71,84,96];

  const load = async () => {
    setLoading(true); setError(null);
    const [p, a, u] = await Promise.all([
      listingsApi.list({ status: 'pending', limit: 50 }),
      listingsApi.list({ status: 'all', limit: 200 }),
      apiJson('/api/users'),
    ]);
    if (p.ok && p.data?.ok) setPending(p.data.listings); else setError(p.data?.error || 'Failed to load pending');
    if (a.ok && a.data?.ok) setAll(a.data.listings);
    if (u.ok && u.data?.ok) setUsers(u.data.users);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    const { ok, data } = await listingsApi.approve(id);
    if (!ok) return toast.error(data?.error || 'Approve failed');
    toast.success('Listing approved');
    load();
  };
  const reject = async (id) => {
    const reason = prompt('Reason for rejection (optional)') || '';
    const { ok, data } = await listingsApi.reject(id, reason);
    if (!ok) return toast.error(data?.error || 'Reject failed');
    toast.success('Listing rejected');
    load();
  };

  const counts = {
    total:    all.length,
    approved: all.filter(l => l.status === 'approved').length,
    pending:  pending.length,
    rejected: all.filter(l => l.status === 'rejected').length,
    travelers: users.filter(u => u.role === 'traveler').length,
    hosts:    users.filter(u => u.role === 'host').length,
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 container">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-emerald2 text-xs uppercase tracking-[0.18em] font-semibold">Admin Console</div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mt-2">Safar Operations</h1>
          </div>
          <div className="flex items-center gap-2 bg-white border rounded-full px-4 py-2.5 w-full md:w-80"><Search className="size-4 text-muted-foreground" /><input placeholder="Search users, hosts, bookings..." className="flex-1 text-sm outline-none" /></div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            { l:'Total users', v: users.length.toLocaleString(), d:`+${counts.travelers} trav`, i: Users },
            { l:'Active listings', v: counts.approved.toLocaleString(), d:`${counts.pending} pending`, i: Home },
            { l:'Bookings (mo)', v:'4,210', d:'+12%', i: Calendar },
            { l:'Revenue (mo)', v:'₹ 1.84 Cr', d:'+22%', i: Wallet },
          ].map((k,i)=>{const Ico=k.i;return(
            <motion.div key={k.l} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.05 }} className="rounded-3xl border bg-white p-5">
              <div className="flex items-center justify-between"><Ico className="size-5 text-emerald2" /><div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">{k.d} <ArrowUpRight className="size-3" /></div></div>
              <div className="font-display text-2xl font-bold mt-3">{k.v}</div>
              <div className="text-xs text-muted-foreground">{k.l}</div>
            </motion.div>
          );})}
        </div>

        <div className="mt-8 grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 rounded-3xl border bg-white p-6">
            <div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Revenue trend</div><div className="font-display text-2xl font-bold">12-month overview</div></div><BarChart3 className="size-5 text-emerald2" /></div>
            <div className="mt-4"><LineChart data={revenue} /></div>
          </div>
          <div className="rounded-3xl border bg-white p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Listings overview</div>
            <div className="mt-3 space-y-3">
              {[
                {l:'Approved',v: counts.total ? Math.round(counts.approved/counts.total*100) : 0},
                {l:'Pending', v: counts.total ? Math.round(counts.pending/counts.total*100) : 0},
                {l:'Rejected',v: counts.total ? Math.round(counts.rejected/counts.total*100) : 0},
              ].map((r)=>(
                <div key={r.l}><div className="flex justify-between text-sm"><span>{r.l}</span><span className="font-semibold">{r.v}%</span></div><div className="h-2 bg-secondary rounded-full mt-1 overflow-hidden"><motion.div initial={{ width: 0 }} whileInView={{ width: `${r.v}%` }} viewport={{ once: true }} className="h-full bg-gradient-emerald" /></div></div>
              ))}
            </div>
          </div>
        </div>

        {/* Approvals */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-bold flex items-center gap-2"><ShieldAlert className="size-5 text-gold" /> Pending approvals</h2>
            <span className="text-sm text-muted-foreground">{pending.length} listing{pending.length===1?'':'s'} awaiting review</span>
          </div>
          {loading && <div className="py-12 grid place-items-center"><Loader2 className="size-6 animate-spin text-emerald2" /></div>}
          {error && <div className="p-6 border rounded-3xl bg-rose-50/40 border-rose-200 text-center"><AlertTriangle className="size-6 mx-auto text-rose-500" /><div className="mt-2 text-sm">{error}</div></div>}
          {!loading && pending.length === 0 && !error && (
            <div className="p-10 border rounded-3xl bg-white text-center">
              <Check className="size-7 mx-auto text-emerald2" />
              <div className="font-display text-lg font-bold mt-3">All caught up!</div>
              <p className="text-sm text-muted-foreground mt-1">No listings are pending approval right now.</p>
            </div>
          )}
          {!loading && pending.length > 0 && (
            <div className="rounded-3xl border bg-white overflow-hidden">
              <div className="grid grid-cols-12 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b"><div className="col-span-5">Listing</div><div className="col-span-3">Host</div><div className="col-span-2">Category</div><div className="col-span-2 text-right">Action</div></div>
              {pending.map((p)=>(
                <div key={p.id} className="grid grid-cols-12 px-5 py-3 border-b last:border-0 items-center hover:bg-secondary/40 transition">
                  <div className="col-span-5 flex items-center gap-3"><img src={(p.images && p.images[0]) || ''} className="size-12 rounded-xl object-cover bg-secondary" alt="" /><div><div className="font-semibold text-sm line-clamp-1">{p.title}</div><div className="text-xs text-muted-foreground">{p.location}</div></div></div>
                  <div className="col-span-3 flex items-center gap-2"><div className="size-7 rounded-full bg-gradient-emerald grid place-items-center text-white text-xs font-bold">{(p.hostName||'?').charAt(0)}</div><span className="text-sm">{p.hostName || p.hostId}</span></div>
                  <div className="col-span-2 text-sm capitalize">{p.category}</div>
                  <div className="col-span-2 flex justify-end gap-1.5"><Button onClick={()=>approve(p.id)} size="sm" className="rounded-full h-8 bg-emerald2 hover:bg-emerald2-deep"><Check className="size-3.5 mr-1" /> Approve</Button><Button onClick={()=>reject(p.id)} size="sm" variant="ghost" className="rounded-full h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"><X className="size-3.5" /></Button></div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* All Listings */}
        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold">All listings</h2>
          {!loading && (
            <div className="mt-4 rounded-3xl border bg-white overflow-hidden">
              <div className="grid grid-cols-12 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b"><div className="col-span-5">Listing</div><div className="col-span-3">Host</div><div className="col-span-2">Status</div><div className="col-span-2 text-right">Action</div></div>
              {all.slice(0, 12).map((p)=>(
                <div key={p.id} className="grid grid-cols-12 px-5 py-3 border-b last:border-0 items-center hover:bg-secondary/40 transition">
                  <div className="col-span-5 flex items-center gap-3"><img src={(p.images && p.images[0]) || ''} className="size-12 rounded-xl object-cover bg-secondary" alt="" /><div><div className="font-semibold text-sm line-clamp-1">{p.title}</div><div className="text-xs text-muted-foreground">{p.location} · ₹{p.price.toLocaleString('en-IN')}</div></div></div>
                  <div className="col-span-3 text-sm">{p.hostName || p.hostId}</div>
                  <div className="col-span-2"><StatusPill s={p.status} /></div>
                  <div className="col-span-2 text-right flex gap-1 justify-end">
                    {p.status !== 'approved' && <Button onClick={()=>approve(p.id)} size="sm" variant="outline" className="rounded-full h-8"><Check className="size-3.5" /></Button>}
                    {p.status !== 'rejected' && <Button onClick={()=>reject(p.id)} size="sm" variant="ghost" className="rounded-full h-8 text-rose-600"><X className="size-3.5" /></Button>}
                    <Link href={`/property/${p.id}`} className="px-3 py-1 rounded-full bg-secondary text-xs font-semibold">View</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent users */}
        <section className="mt-10 mb-12">
          <h2 className="font-display text-2xl font-bold">Recent users</h2>
          {!loading && users.length > 0 && (
            <div className="mt-4 rounded-3xl border bg-white overflow-hidden">
              {users.slice(0, 8).map((u)=>(
                <div key={u.id} className="flex items-center gap-3 px-5 py-3 border-b last:border-0 hover:bg-secondary/40 transition">
                  <div className="size-10 rounded-full bg-gradient-emerald grid place-items-center text-white font-semibold">{(u.name||'?').charAt(0)}</div>
                  <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{u.name}</div><div className="text-xs text-muted-foreground truncate">{u.email}</div></div>
                  <div className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald2 border border-emerald-200">{u.role}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <Footer />
    </main>
  );
}

export default function App() {
  return <ProtectedRoute roles={['admin']}><AdminInner /></ProtectedRoute>;
}
