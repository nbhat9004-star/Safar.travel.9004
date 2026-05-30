'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrendingUp, Wallet, Calendar, Star, Plus, Eye, BarChart3, ArrowUpRight } from 'lucide-react';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import { Button } from '@/components/ui/button';
import { LISTINGS } from '@/lib/data';

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

function App() {
  const myListings = LISTINGS.slice(0,4);
  const earnings = [12,18,9,22,28,31,26,38,33,42,46,52];
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 container">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-emerald2 text-xs uppercase tracking-[0.18em] font-semibold">Host Studio</div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mt-2">Salaam, Ishfaq 👋</h1>
          </div>
          <Button asChild className="rounded-full bg-gradient-emerald font-semibold"><Link href="/add-listing"><Plus className="size-4 mr-2" /> Add new listing</Link></Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[{l:'Earnings (mo)',v:'₹ 4,82,400',d:'+18%',i:Wallet},{l:'Bookings',v:'34',d:'+6',i:Calendar},{l:'Listing views',v:'12,890',d:'+22%',i:Eye},{l:'Avg rating',v:'4.94',d:'+0.04',i:Star}].map((k,i)=>{const Ico=k.i;return(
            <motion.div key={k.l} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.05 }} className="rounded-3xl border bg-white p-5">
              <div className="flex items-center justify-between"><Ico className="size-5 text-emerald2" /><div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">{k.d} <ArrowUpRight className="size-3" /></div></div>
              <div className="font-display text-2xl font-bold mt-3">{k.v}</div>
              <div className="text-xs text-muted-foreground">{k.l}</div>
            </motion.div>
          );})}
        </div>

        <div className="mt-8 grid lg:grid-cols-3 gap-5">
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

        {/* My Listings */}
        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold">My listings</h2>
          <div className="mt-4 rounded-3xl border bg-white overflow-hidden">
            <div className="grid grid-cols-12 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b">
              <div className="col-span-5">Listing</div><div className="col-span-2">Price</div><div className="col-span-2">Bookings</div><div className="col-span-2">Rating</div><div className="col-span-1"></div>
            </div>
            {myListings.map((l)=>(
              <div key={l.id} className="grid grid-cols-12 px-5 py-3 border-b last:border-0 items-center hover:bg-secondary/40 transition">
                <div className="col-span-5 flex items-center gap-3"><img src={l.image} className="size-12 rounded-xl object-cover" alt="" /><div><div className="font-semibold text-sm line-clamp-1">{l.title}</div><div className="text-xs text-muted-foreground">{l.location}</div></div></div>
                <div className="col-span-2 text-sm font-semibold">₹{l.price.toLocaleString('en-IN')}</div>
                <div className="col-span-2 text-sm">{l.reviews}</div>
                <div className="col-span-2 text-sm flex items-center gap-1"><Star className="size-3.5 text-gold fill-gold" /> {l.rating}</div>
                <div className="col-span-1 text-right"><Link href={`/property/${l.id}`} className="text-xs font-semibold text-emerald2 hover:underline">Edit</Link></div>
              </div>
            ))}
          </div>
        </section>

        <div className="h-12" />
      </div>
      <Footer />
    </main>
  );
}
export default App;
