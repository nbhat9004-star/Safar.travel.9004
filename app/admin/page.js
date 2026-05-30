'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users, Home, Calendar, Wallet, ShieldAlert, BarChart3, ArrowUpRight, Search, Check, X, MoreHorizontal } from 'lucide-react';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import { Button } from '@/components/ui/button';
import { LISTINGS } from '@/lib/data';

function LineChart({ data }) {
  const max = Math.max(...data); const min = Math.min(...data);
  const points = data.map((v,i)=>`${(i/(data.length-1))*100},${100-((v-min)/(max-min))*88-6}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-32">
      <defs><linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity="0.4" /><stop offset="100%" stopColor="#10B981" stopOpacity="0" /></linearGradient></defs>
      <polyline fill="none" stroke="#0E6B5A" strokeWidth="1.6" points={points} />
      <polygon fill="url(#gd)" points={`0,100 ${points} 100,100`} />
    </svg>
  );
}

function App() {
  const pending = LISTINGS.slice(7,11);
  const revenue = [22,28,34,30,42,55,49,62,68,71,84,96];
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
          {[{l:'Total users',v:'34,820',d:'+5.2%',i:Users},{l:'Active listings',v:'1,284',d:'+38',i:Home},{l:'Bookings (mo)',v:'4,210',d:'+12%',i:Calendar},{l:'Revenue (mo)',v:'₹ 1.84 Cr',d:'+22%',i:Wallet}].map((k,i)=>{const Ico=k.i;return(
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
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Top destinations</div>
            <div className="mt-3 space-y-3">
              {[{l:'Srinagar',v:42},{l:'Gulmarg',v:28},{l:'Pahalgam',v:22},{l:'Sonamarg',v:8}].map((r)=>(
                <div key={r.l}><div className="flex justify-between text-sm"><span>{r.l}</span><span className="font-semibold">{r.v}%</span></div><div className="h-2 bg-secondary rounded-full mt-1 overflow-hidden"><motion.div initial={{ width: 0 }} whileInView={{ width: `${r.v}%` }} viewport={{ once: true }} className="h-full bg-gradient-emerald" /></div></div>
              ))}
            </div>
          </div>
        </div>

        {/* Approvals */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4"><h2 className="font-display text-2xl font-bold flex items-center gap-2"><ShieldAlert className="size-5 text-gold" /> Pending approvals</h2><span className="text-sm text-muted-foreground">{pending.length} listings awaiting review</span></div>
          <div className="rounded-3xl border bg-white overflow-hidden">
            <div className="grid grid-cols-12 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b"><div className="col-span-5">Listing</div><div className="col-span-3">Host</div><div className="col-span-2">Category</div><div className="col-span-2 text-right">Action</div></div>
            {pending.map((p)=>(
              <div key={p.id} className="grid grid-cols-12 px-5 py-3 border-b last:border-0 items-center hover:bg-secondary/40 transition">
                <div className="col-span-5 flex items-center gap-3"><img src={p.image} className="size-12 rounded-xl object-cover" alt="" /><div><div className="font-semibold text-sm line-clamp-1">{p.title}</div><div className="text-xs text-muted-foreground">{p.location}</div></div></div>
                <div className="col-span-3 flex items-center gap-2"><img src={p.host.avatar} className="size-7 rounded-full" alt="" /><span className="text-sm">{p.host.name}</span></div>
                <div className="col-span-2 text-sm capitalize">{p.category}</div>
                <div className="col-span-2 flex justify-end gap-1.5"><Button size="sm" variant="outline" className="rounded-full h-8"><Check className="size-3.5 mr-1" /> Approve</Button><Button size="sm" variant="ghost" className="rounded-full h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"><X className="size-3.5" /></Button></div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent users */}
        <section className="mt-10 mb-12">
          <h2 className="font-display text-2xl font-bold">Recent travelers</h2>
          <div className="mt-4 rounded-3xl border bg-white overflow-hidden">
            {['Aanya Sharma','Rohan Iyer','Saira Khan','Karan Mehta','Pooja Reddy'].map((n,i)=>(
              <div key={n} className="flex items-center gap-3 px-5 py-3 border-b last:border-0 hover:bg-secondary/40 transition">
                <div className="size-10 rounded-full bg-gradient-emerald grid place-items-center text-white font-semibold">{n.charAt(0)}</div>
                <div className="flex-1"><div className="font-semibold text-sm">{n}</div><div className="text-xs text-muted-foreground">Joined {3+i*2} days ago · {i+1} bookings</div></div>
                <div className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald2 font-semibold">Active</div>
                <button className="size-8 grid place-items-center rounded-full hover:bg-secondary"><MoreHorizontal className="size-4" /></button>
              </div>
            ))}
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}
export default App;
