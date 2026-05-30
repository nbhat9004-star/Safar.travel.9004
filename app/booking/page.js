'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, CreditCard, Wallet, Calendar, Users, ShieldCheck, ChevronLeft, ChevronRight, PartyPopper, Mail, Download } from 'lucide-react';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import { Button } from '@/components/ui/button';
import { LISTINGS } from '@/lib/data';

const STEPS = ['Dates','Guests','Payment','Review','Confirmed'];

function App() {
  const item = LISTINGS[0];
  const [step, setStep] = useState(0);
  const [pay, setPay] = useState('online');
  const [guests, setGuests] = useState(2);
  const nights = 4;
  const subtotal = item.price * nights;
  const tax = Math.round(subtotal * 0.12);
  const total = subtotal + tax + 800;

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 container">
        <div className="text-emerald2 text-xs uppercase tracking-[0.18em] font-semibold">Booking</div>
        <h1 className="font-display text-3xl md:text-5xl font-bold mt-2">Confirm and pay</h1>

        {/* Progress */}
        <div className="mt-8 flex items-center gap-2 overflow-x-auto scroll-hide">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 shrink-0">
              <div className={`size-8 rounded-full grid place-items-center text-xs font-bold ${i<=step ? 'bg-gradient-emerald text-white shadow' : 'bg-secondary text-muted-foreground'}`}>{i<step ? <Check className="size-4" /> : i+1}</div>
              <div className={`text-sm font-medium ${i<=step ? 'text-charcoal' : 'text-muted-foreground'}`}>{s}</div>
              {i < STEPS.length-1 && <div className={`w-10 h-px ${i<step ? 'bg-emerald2' : 'bg-border'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="container mt-10 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <motion.div key={step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border bg-white shadow-xl p-6 md:p-8">
            {step === 0 && (
              <div>
                <h2 className="font-display text-2xl font-bold flex items-center gap-2"><Calendar className="size-5 text-emerald2" /> Select dates</h2>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl border"><div className="text-[10px] uppercase tracking-wider font-semibold">Check-in</div><div className="text-base mt-0.5 font-semibold">12 Jul 2025</div></div>
                  <div className="p-4 rounded-2xl border"><div className="text-[10px] uppercase tracking-wider font-semibold">Check-out</div><div className="text-base mt-0.5 font-semibold">16 Jul 2025</div></div>
                </div>
                <div className="mt-6 grid grid-cols-7 gap-1.5">
                  {Array.from({length:28}).map((_, i)=>(
                    <div key={i} className={`aspect-square grid place-items-center text-xs rounded-lg ${i>=11 && i<=14 ? 'bg-gradient-emerald text-white font-semibold' : 'bg-secondary'}`}>{i+1}</div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">Selected: 4 nights · Free cancellation until 10 Jul</p>
              </div>
            )}
            {step === 1 && (
              <div>
                <h2 className="font-display text-2xl font-bold flex items-center gap-2"><Users className="size-5 text-emerald2" /> Guests</h2>
                <div className="mt-5 space-y-3">
                  {['Adults','Children','Infants'].map((g,i)=>(
                    <div key={g} className="flex items-center justify-between p-4 rounded-2xl border">
                      <div><div className="font-semibold">{g}</div><div className="text-xs text-muted-foreground">{i===0?'Age 13+':i===1?'Age 2–12':'Under 2'}</div></div>
                      <div className="flex items-center gap-3">
                        <button onClick={()=>i===0 && setGuests(Math.max(1,guests-1))} className="size-9 rounded-full border">−</button>
                        <div className="w-6 text-center font-semibold">{i===0?guests:0}</div>
                        <button onClick={()=>i===0 && setGuests(guests+1)} className="size-9 rounded-full border">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {step === 2 && (
              <div>
                <h2 className="font-display text-2xl font-bold">Choose how to pay</h2>
                <div className="mt-5 grid md:grid-cols-2 gap-3">
                  {[{k:'online',i:CreditCard,t:'Pay online now',d:'Card / UPI / Net banking · Instant confirm'},{k:'arrival',i:Wallet,t:'Pay on arrival',d:'Reserve free · Pay host on check-in'}].map((o)=>{const Ico=o.i;return(
                    <button key={o.k} onClick={()=>setPay(o.k)} className={`text-left p-5 rounded-2xl border-2 transition ${pay===o.k ? 'border-emerald-600 bg-emerald-50/40' : 'border-border hover:border-charcoal/40'}`}>
                      <Ico className="size-6 text-emerald2" /><div className="font-display font-bold mt-3">{o.t}</div><div className="text-xs text-muted-foreground mt-1">{o.d}</div>
                    </button>
                  );})}
                </div>
                {pay==='online' && (
                  <div className="mt-6 grid sm:grid-cols-2 gap-3">
                    <input placeholder="Card number" className="px-4 py-3 rounded-xl border text-sm sm:col-span-2" />
                    <input placeholder="MM / YY" className="px-4 py-3 rounded-xl border text-sm" />
                    <input placeholder="CVC" className="px-4 py-3 rounded-xl border text-sm" />
                  </div>
                )}
              </div>
            )}
            {step === 3 && (
              <div>
                <h2 className="font-display text-2xl font-bold">Review your booking</h2>
                <div className="mt-5 flex gap-4 p-4 rounded-2xl border">
                  <img src={item.image} alt="" className="size-24 rounded-xl object-cover" />
                  <div className="flex-1"><div className="font-display font-semibold">{item.title}</div><div className="text-xs text-muted-foreground">{item.location}</div><div className="text-xs mt-1">12–16 Jul · {guests} guests · {pay==='online'?'Pay online':'Pay on arrival'}</div></div>
                </div>
                <div className="mt-4 p-4 rounded-2xl border bg-secondary/40 text-sm space-y-2">
                  <div className="flex justify-between"><span>₹{item.price.toLocaleString('en-IN')} × 4 nights</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Cleaning fee</span><span>₹800</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Taxes</span><span>₹{tax.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between font-bold pt-2 border-t"><span>Total</span><span>₹{total.toLocaleString('en-IN')}</span></div>
                </div>
                <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-emerald2 mt-0.5" /> Free cancellation until 48h before check-in. Your card is charged only on confirm.</div>
              </div>
            )}
            {step === 4 && (
              <div className="text-center py-6">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="size-20 rounded-full bg-gradient-emerald text-white grid place-items-center mx-auto shadow-2xl"><PartyPopper className="size-10" /></motion.div>
                <h2 className="font-display text-3xl font-bold mt-5">Booking confirmed!</h2>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">Your reservation at {item.title} from 12 — 16 Jul is confirmed. We’ve sent the details to your email.</p>
                <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3">
                  <Button variant="outline" className="rounded-full"><Mail className="size-4 mr-2" /> Email invoice</Button>
                  <Button variant="outline" className="rounded-full"><Download className="size-4 mr-2" /> Download PDF</Button>
                  <Button asChild className="rounded-full bg-gradient-emerald"><Link href="/dashboard/traveler">Go to dashboard</Link></Button>
                </div>
                <div className="mt-8 max-w-md mx-auto text-left rounded-2xl border bg-secondary/40 p-5">
                  <div className="text-[10px] uppercase tracking-wider text-emerald2 font-semibold">Email preview</div>
                  <div className="font-display font-bold mt-1">✨ Welcome to Safar, your Kashmir trip is on!</div>
                  <p className="text-xs text-muted-foreground mt-1">Booking #SF-{Math.floor(100000+Math.random()*900000)} · {item.title} · 12–16 Jul · ₹{total.toLocaleString('en-IN')}</p>
                </div>
              </div>
            )}

            {step < 4 && (
              <div className="mt-8 flex justify-between">
                <Button variant="outline" className="rounded-full" onClick={()=>setStep(Math.max(0,step-1))}><ChevronLeft className="size-4 mr-1" /> Back</Button>
                <Button className="rounded-full bg-gradient-emerald font-semibold px-6" onClick={()=>setStep(step+1)}>{step===3?'Confirm & Pay':'Continue'} <ChevronRight className="size-4 ml-1" /></Button>
              </div>
            )}
          </motion.div>
        </div>

        {/* Summary */}
        <aside>
          <div className="lg:sticky lg:top-28 rounded-3xl border bg-white shadow-xl p-5">
            <img src={item.image} className="w-full aspect-[4/3] rounded-2xl object-cover" alt="" />
            <div className="mt-4 font-display font-bold">{item.title}</div>
            <div className="text-xs text-muted-foreground">{item.location}</div>
            <div className="mt-4 text-sm space-y-2">
              <div className="flex justify-between"><span>Dates</span><span className="font-medium">12 — 16 Jul</span></div>
              <div className="flex justify-between"><span>Guests</span><span className="font-medium">{guests}</span></div>
              <div className="flex justify-between"><span>Payment</span><span className="font-medium">{pay==='online'?'Online':'On arrival'}</span></div>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between font-bold"><span>Total</span><span>₹{total.toLocaleString('en-IN')}</span></div>
          </div>
        </aside>
      </div>
      <Footer />
    </main>
  );
}
export default App;
