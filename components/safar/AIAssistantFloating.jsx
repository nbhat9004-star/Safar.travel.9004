'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { AI_PROMPT_SUGGESTIONS } from '@/lib/data';

export default function AIAssistantFloating() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Salaam! I’m your Kashmir AI concierge. Ask me to plan a trip, compare stays, or estimate budgets.' },
  ]);
  const [input, setInput] = useState('');

  const send = (txt) => {
    const q = (txt ?? input).trim();
    if (!q) return;
    const next = [...messages, { role: 'user', text: q }];
    setMessages(next);
    setInput('');
    setTimeout(() => {
      setMessages([...next, {
        role: 'ai',
        text: `Here’s a quick idea for "${q}":\n\n\u2022 Day 1\u20132: Srinagar — Royal Cedar Houseboat + Shikara sunset\n\u2022 Day 3: Gulmarg — Pinepeak Snow Cabin + Gondola tour\n\u2022 Day 4\u20135: Pahalgam — Apple Orchard Cottage + Aru valley\n\nEstimated total: ₹38,400 for 2 guests — includes stays, transport & one cultural Wazwan dinner.`,
      }]);
    }, 700);
  };

  return (
    <>
      <motion.button onClick={() => setOpen(true)} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-gradient-emerald text-white shadow-2xl shadow-emerald-900/30 px-5 py-3.5 flex items-center gap-2 font-medium">
        <span className="absolute inset-0 rounded-full bg-emerald-500/40 animate-ping" />
        <Sparkles className="size-4 relative" /> <span className="relative">AI Concierge</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6" onClick={() => setOpen(false)}>
            <motion.div onClick={(e)=>e.stopPropagation()} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 28 }}
              className="w-full md:max-w-xl bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden border">
              <div className="px-5 py-4 bg-gradient-emerald text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-xl bg-white/15 grid place-items-center"><Wand2 className="size-5" /></div>
                  <div>
                    <div className="font-display font-semibold">Safar AI Concierge</div>
                    <div className="text-[11px] text-white/75">Powered by local hosts · Demo mode</div>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="size-9 grid place-items-center rounded-full hover:bg-white/15"><X className="size-5" /></button>
              </div>
              <div className="max-h-[55vh] md:max-h-[420px] overflow-y-auto p-5 space-y-3 bg-secondary/40">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role==='user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`whitespace-pre-line max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.role==='user' ? 'bg-charcoal text-white rounded-br-md' : 'bg-white text-charcoal rounded-bl-md border'}`}>{m.text}</div>
                  </div>
                ))}
              </div>
              <div className="px-5 pt-3 flex flex-wrap gap-2">
                {AI_PROMPT_SUGGESTIONS.slice(0,3).map((s) => (
                  <button key={s} onClick={() => send(s)} className="text-[12px] px-3 py-1.5 rounded-full bg-secondary hover:bg-charcoal hover:text-white border transition">{s}</button>
                ))}
              </div>
              <div className="p-4 flex items-center gap-2 border-t bg-white">
                <input value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>e.key==='Enter' && send()}
                  placeholder="Ask anything about Kashmir..." className="flex-1 bg-secondary rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/30" />
                <button onClick={() => send()} className="size-11 grid place-items-center rounded-full bg-gradient-emerald text-white shadow-lg"><Send className="size-4" /></button>
              </div>
              <div className="px-5 pb-4 text-center">
                <Link href="/ai-planner" className="text-xs text-emerald2 font-medium hover:underline">Open full AI Trip Planner →</Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
