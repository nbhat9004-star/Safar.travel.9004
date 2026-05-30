'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Send, Sparkles, MapPin, Calendar, Wallet, Users, ArrowRight, Mountain, Camera, Coffee } from 'lucide-react';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import { Button } from '@/components/ui/button';
import { LISTINGS, AI_PROMPT_SUGGESTIONS, IMG } from '@/lib/data';

function App() {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Salaam! I’m your Kashmir AI concierge. Tell me your travel style, budget and dates — I’ll craft an unforgettable trip.' },
  ]);
  const [input, setInput] = useState('');
  const [days, setDays] = useState(5);
  const [budget, setBudget] = useState(40000);
  const [travelers, setTravelers] = useState(2);
  const [showPlan, setShowPlan] = useState(false);

  const send = (txt) => {
    const q = (txt ?? input).trim();
    if (!q) return;
    const next = [...messages, { role: 'user', text: q }];
    setMessages(next);
    setInput('');
    setTimeout(() => {
      setMessages([...next, { role: 'ai', text: `Got it! Building a ${days}-day plan for ${travelers} traveler(s) under ₹${budget.toLocaleString('en-IN')}. Scroll right → your itinerary is ready.` }]);
      setShowPlan(true);
    }, 700);
  };

  const itinerary = [
    { day: 1, place: 'Srinagar', stay: LISTINGS[0], activity: 'Arrival + Sunset Shikara on Dal Lake', img: IMG.dal1 },
    { day: 2, place: 'Srinagar', stay: LISTINGS[0], activity: 'Mughal Gardens + Old City Heritage Walk', img: IMG.dal3 },
    { day: 3, place: 'Gulmarg', stay: LISTINGS[1], activity: 'Gondola Phase 1 & 2 + Snow play', img: IMG.cab1 },
    { day: 4, place: 'Pahalgam', stay: LISTINGS[2], activity: 'Aru & Betaab Valley + River walk', img: IMG.cot1 },
    { day: 5, place: 'Srinagar', stay: LISTINGS[5], activity: 'Wazwan Royal Feast + Departure', img: IMG.dal4 },
  ].slice(0, days);

  const total = itinerary.reduce((s, i) => s + i.stay.price, 0) + 4500;

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 container">
        <div className="flex items-center gap-2 text-emerald2 text-xs uppercase tracking-[0.18em] font-semibold"><Wand2 className="size-3.5" /> Safar AI Trip Planner</div>
        <h1 className="font-display text-4xl md:text-6xl font-bold mt-2 leading-[1.05]">Plan your Kashmir trip <span className="gradient-text-emerald">in 30 seconds</span>.</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">Tell our AI your style and budget. We’ll match the right stays, transport, food and experiences — all bookable on Safar.</p>
      </div>

      <div className="container mt-10 grid lg:grid-cols-5 gap-6">
        {/* Chat */}
        <div className="lg:col-span-2">
          <div className="rounded-3xl border bg-white shadow-xl overflow-hidden h-[78vh] flex flex-col">
            <div className="px-5 py-4 bg-gradient-emerald text-white flex items-center gap-3">
              <div className="size-10 rounded-xl bg-white/15 grid place-items-center"><Wand2 className="size-5" /></div>
              <div><div className="font-display font-semibold">Safar AI · Concierge</div><div className="text-[11px] text-white/80">Demo mode · Mock responses</div></div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-secondary/40">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role==='user' ? 'justify-end' : 'justify-start'}`}>
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`whitespace-pre-line max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.role==='user' ? 'bg-charcoal text-white rounded-br-md' : 'bg-white text-charcoal rounded-bl-md border'}`}>{m.text}</motion.div>
                </div>
              ))}
            </div>
            <div className="px-5 pt-3 flex flex-wrap gap-2">
              {AI_PROMPT_SUGGESTIONS.slice(0,4).map((s) => (
                <button key={s} onClick={()=>send(s)} className="text-[12px] px-3 py-1.5 rounded-full bg-secondary hover:bg-charcoal hover:text-white border transition">{s}</button>
              ))}
            </div>
            <div className="p-4 flex items-center gap-2 border-t">
              <input value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>e.key==='Enter' && send()} placeholder="Describe your dream Kashmir trip..." className="flex-1 bg-secondary rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/30" />
              <button onClick={()=>send()} className="size-11 grid place-items-center rounded-full bg-gradient-emerald text-white shadow-lg"><Send className="size-4" /></button>
            </div>
          </div>

          {/* Quick Tuners */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Days', val: days, set: setDays, icon: Calendar, min:2, max:14 },
              { label: 'Budget (₹)', val: budget, set: setBudget, icon: Wallet, min:10000, max:200000, step:5000 },
              { label: 'Travelers', val: travelers, set: setTravelers, icon: Users, min:1, max:10 },
            ].map((c) => {
              const Ico = c.icon;
              return (
                <div key={c.label} className="p-3 rounded-2xl border bg-white">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground"><Ico className="size-3.5" /> {c.label}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <button onClick={()=>c.set(Math.max(c.min, c.val - (c.step||1)))} className="size-7 rounded-full border hover:bg-secondary">−</button>
                    <div className="font-display font-bold text-lg flex-1 text-center">{typeof c.val==='number' && c.val>=1000 ? c.val.toLocaleString('en-IN') : c.val}</div>
                    <button onClick={()=>c.set(Math.min(c.max, c.val + (c.step||1)))} className="size-7 rounded-full border hover:bg-secondary">+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Plan output */}
        <div className="lg:col-span-3">
          <AnimatePresence>
            {showPlan && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="rounded-3xl border bg-white shadow-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-emerald2 font-semibold">AI-generated</div>
                      <h2 className="font-display text-2xl md:text-3xl font-bold">Your {days}-day Kashmir itinerary</h2>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Estimated total</div>
                      <div className="font-display text-2xl font-bold gradient-text-emerald">₹{total.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {itinerary.map((d, i) => (
                      <motion.div key={d.day} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i*0.07 }}
                        className="flex gap-4 p-3 rounded-2xl border bg-secondary/40 hover:bg-secondary transition">
                        <img src={d.img} className="size-20 md:size-24 rounded-xl object-cover" alt="" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2"><span className="text-[10px] uppercase tracking-wider font-bold text-emerald2 bg-emerald-50 px-2 py-0.5 rounded-full">Day {d.day}</span><span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="size-3" />{d.place}</span></div>
                          <div className="font-display font-semibold mt-1.5">{d.activity}</div>
                          <div className="text-xs text-muted-foreground mt-1">Stay: {d.stay.title} · ₹{d.stay.price.toLocaleString('en-IN')}/night</div>
                        </div>
                        <Link href={`/property/${d.stay.id}`} className="self-center px-3 py-1.5 rounded-full bg-white border text-xs font-semibold hover:bg-charcoal hover:text-white transition">Book</Link>
                      </motion.div>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button asChild className="rounded-full bg-gradient-emerald font-semibold"><Link href="/booking">Book entire trip <ArrowRight className="size-4 ml-2" /></Link></Button>
                    <Button variant="outline" className="rounded-full font-semibold" onClick={()=>setShowPlan(false)}>Tweak with AI</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {!showPlan && (
            <div className="rounded-3xl border bg-white shadow-xl p-10 text-center">
              <div className="size-16 mx-auto rounded-2xl bg-gradient-emerald grid place-items-center text-white"><Sparkles className="size-7" /></div>
              <h3 className="font-display text-2xl font-bold mt-4">Ask the AI to start</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">Try one of the suggestions on the left, or describe your trip in natural language. Your itinerary will appear here.</p>
              <div className="mt-8 grid grid-cols-3 gap-3 max-w-md mx-auto">
                {[{i:Mountain,t:'Adventure'},{i:Camera,t:'Sightseeing'},{i:Coffee,t:'Cultural'}].map((c,k)=>{const I=c.i;return(
                  <div key={k} className="p-4 rounded-2xl border"><I className="size-5 mx-auto text-emerald2" /><div className="text-xs font-semibold mt-2">{c.t}</div></div>
                );})}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
export default App;
