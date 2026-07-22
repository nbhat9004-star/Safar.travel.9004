'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Home, Lock, Globe, Link2, QrCode, Trophy } from 'lucide-react';
import Shell from '@/components/explore-v2/Shell';
import { VERIFIED_SERVICES } from '@/lib/explore-v2-data';

export default function CreateTrip() {
  const [mode, setMode] = useState(null);
  const [privacy, setPrivacy] = useState('public');
  const [addedSvc, setAddedSvc] = useState([]);

  const toggleSvc = (id) => setAddedSvc(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <Shell hideNav={!!mode}>
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-slate-100 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="max-w-3xl mx-auto px-4 md:px-8 pb-3 flex items-center gap-3">
          <Link href={mode ? '#' : '/explore'} onClick={(e) => { if (mode) { e.preventDefault(); setMode(null); } }} className="size-10 grid place-items-center rounded-full hover:bg-slate-100 active:scale-95 transition"><ArrowLeft className="size-5" /></Link>
          <h1 className="flex-1 text-center font-display font-bold text-[17px] tracking-tight">Create a Trip</h1>
          <div className="size-10" />
        </div>
      </header>

      {!mode ? (
        <main className="max-w-3xl mx-auto px-4 md:px-8 py-6">
          <div className="text-center">
            <h2 className="font-display font-bold text-[24px] md:text-[30px] tracking-tight text-slate-900">Two ways to create</h2>
            <p className="mt-1.5 text-[13.5px] md:text-[15px] text-slate-500">Choose how you want to organize your trip</p>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Self Hosted */}
            <button onClick={() => setMode('self')} className="text-left rounded-3xl border-2 border-slate-200 bg-white p-5 md:p-6 hover:border-violet-300 hover:shadow-xl transition group">
              <div className="size-12 rounded-2xl bg-violet-100 text-violet-600 grid place-items-center"><Home className="size-6" strokeWidth={2} /></div>
              <h3 className="mt-4 font-display font-bold text-[18px] text-slate-900">Self Hosted</h3>
              <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">Plan everything yourself. Free to use, public or private.</p>
              <div className="mt-4 space-y-1.5">
                {['Free forever','Public or Private','You handle all logistics'].map(x => (
                  <div key={x} className="flex items-center gap-1.5 text-[12.5px] text-slate-700"><CheckCircle2 className="size-3.5 text-violet-600" />{x}</div>
                ))}
              </div>
              <div className="mt-3 text-[11.5px] text-slate-400">No reward-card unlocks</div>
              <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-slate-900 group-hover:bg-black text-white px-4 py-2 text-[13px] font-semibold">Continue <ArrowRight className="size-4" /></div>
            </button>

            {/* Safar Assisted */}
            <button onClick={() => setMode('safar')} className="relative text-left rounded-3xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 md:p-6 hover:shadow-xl transition group">
              <div className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2.5 py-1 text-[10px] font-bold"><Sparkles className="size-3" /> RECOMMENDED</div>
              <div className="size-12 rounded-2xl bg-emerald-500 text-white grid place-items-center shadow-lg shadow-emerald-200"><ShieldCheck className="size-6" strokeWidth={2} /></div>
              <h3 className="mt-4 font-display font-bold text-[18px] text-emerald-900">Verified Safar Services</h3>
              <p className="mt-1 text-[13px] text-emerald-900/80 leading-relaxed">Build with verified partners. Earn reward cards and badges.</p>
              <div className="mt-4 space-y-1.5">
                {['Verified providers','Reward progress','Badge collection','Trust for travelers'].map(x => (
                  <div key={x} className="flex items-center gap-1.5 text-[12.5px] text-emerald-900"><CheckCircle2 className="size-3.5 text-emerald-600" />{x}</div>
                ))}
              </div>
              <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 group-hover:bg-emerald-700 text-white px-4 py-2 text-[13px] font-semibold">Continue <ArrowRight className="size-4" /></div>
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 flex items-start gap-3">
            <Trophy className="size-5 text-violet-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[13.5px] text-violet-900">Verified trips unlock reward cards</div>
              <p className="mt-0.5 text-[12.5px] text-violet-900/80">Complete verified trips to reveal one of nine mystery reward cards on your Explore home.</p>
            </div>
          </div>
        </main>
      ) : (
        <main className="max-w-3xl mx-auto px-4 md:px-8 py-5 pb-32">
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-bold"
            style={{ backgroundColor: mode === 'safar' ? '#d1fae5' : '#ede9fe', color: mode === 'safar' ? '#065f46' : '#5b21b6' }}>
            {mode === 'safar' ? <><ShieldCheck className="size-3" /> VERIFIED BY SAFAR</> : <>SELF HOSTED</>}
          </div>

          <h2 className="mt-3 font-display font-bold text-[22px] md:text-[26px] tracking-tight text-slate-900">Trip Details</h2>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-[12px] font-semibold text-slate-700">Trip Title</label>
              <input placeholder="e.g. Kashmir Great Lakes" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-[14px] outline-none focus:border-violet-400" />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-slate-700">Destination</label>
              <input placeholder="Where are you going?" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-[14px] outline-none focus:border-violet-400" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[12px] font-semibold text-slate-700">Start Date</label>
                <input type="date" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-[14px]" />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-slate-700">End Date</label>
                <input type="date" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 h-11 text-[14px]" />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-slate-700">Description</label>
              <textarea rows={4} placeholder="Describe your trip..." className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-[14px] outline-none focus:border-violet-400 resize-none" />
            </div>
          </div>

          {/* Privacy */}
          <h3 className="mt-8 font-display font-bold text-[18px] tracking-tight text-slate-900">Privacy</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setPrivacy('public')} className={`rounded-2xl border-2 p-4 text-left transition ${privacy === 'public' ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center justify-between">
                <Globe className={`size-5 ${privacy === 'public' ? 'text-violet-600' : 'text-slate-500'}`} />
                {privacy === 'public' && <CheckCircle2 className="size-4 text-violet-600" />}
              </div>
              <div className="mt-2 font-semibold text-[14px] text-slate-900">Public</div>
              <div className="text-[11.5px] text-slate-500">Anyone can discover and request</div>
            </button>
            <button onClick={() => setPrivacy('private')} className={`rounded-2xl border-2 p-4 text-left transition ${privacy === 'private' ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center justify-between">
                <Lock className={`size-5 ${privacy === 'private' ? 'text-violet-600' : 'text-slate-500'}`} />
                {privacy === 'private' && <CheckCircle2 className="size-4 text-violet-600" />}
              </div>
              <div className="mt-2 font-semibold text-[14px] text-slate-900">Private</div>
              <div className="text-[11.5px] text-slate-500">Invite-only via link / QR</div>
            </button>
          </div>
          {privacy === 'private' && (
            <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-3 space-y-2">
              <div className="text-[12px] font-semibold text-slate-500">Share methods (available after publishing)</div>
              {[{ icon: Link2, label: 'Invite Link' }, { icon: Link2, label: 'Referral Link' }, { icon: QrCode, label: 'QR Code' }].map((s, i) => {
                const I = s.icon;
                return (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                    <I className="size-4 text-slate-500" />
                    <span className="text-[13px] font-medium text-slate-700">{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Verified services */}
          {mode === 'safar' && (
            <>
              <h3 className="mt-8 font-display font-bold text-[18px] tracking-tight text-slate-900">Add Verified Services</h3>
              <p className="text-[12.5px] text-slate-500 mt-0.5">Trips built with verified partners earn reward-card unlocks.</p>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                {VERIFIED_SERVICES.map(s => {
                  const added = addedSvc.includes(s.id);
                  return (
                    <button key={s.id} onClick={() => toggleSvc(s.id)} className={`text-left rounded-2xl border-2 p-3 transition ${added ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                      <div className="text-[22px]">{s.emoji}</div>
                      <div className="mt-1 font-semibold text-[13px] text-slate-900">{s.label}</div>
                      <div className={`mt-1 text-[11px] font-bold ${added ? 'text-emerald-700' : 'text-violet-700'}`}>{added ? '\u2713 Added' : '+ Add'}</div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Publish CTA */}
          <div className="fixed bottom-24 md:bottom-8 inset-x-0 px-4 md:px-8 z-30">
            <div className="max-w-3xl mx-auto">
              <button className="w-full rounded-2xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-semibold py-3.5 shadow-2xl shadow-violet-400/30 transition">Publish Trip</button>
            </div>
          </div>
        </main>
      )}
    </Shell>
  );
}
