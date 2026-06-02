'use client';
import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, CreditCard, Wallet, Calendar, Users, ShieldCheck, ChevronLeft, ChevronRight, PartyPopper, Mail, Download, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import { Button } from '@/components/ui/button';
import { LISTINGS } from '@/lib/data';
import { useListing, bookingsApi, useAvailability } from '@/lib/listings-api';
import { useAuth } from '@/lib/auth-context';
import AuthModal from '@/components/safar/AuthModal';

const STEPS = ['Dates','Guests','Payment','Review','Confirmed'];

// Helpers
function ymdOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function rangeOverlaps(ciStr, coStr, ranges) {
  if (!ciStr || !coStr) return null;
  const ci = new Date(ciStr), co = new Date(coStr);
  if (isNaN(ci) || isNaN(co) || co <= ci) return null;
  for (const r of ranges) {
    const rci = new Date(r.checkInDate), rco = new Date(r.checkOutDate);
    if (rci < co && rco > ci) return r;
  }
  return null;
}

function BookingContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const listingId = params.get('id') || params.get('listingId');
  const { listing } = useListing(listingId || '');
  const { bookedRanges } = useAvailability(listingId);
  // Fallback to demo data if no listingId (preview mode)
  const fallback = LISTINGS[0];
  const item = listing ? {
    id: listing.id,
    title: listing.title,
    location: listing.location,
    price: listing.price,
    guests: listing.guests,
    image: (listing.images && listing.images[0]) || fallback.image,
  } : fallback;

  const [step, setStep] = useState(0);
  const [pay, setPay] = useState('online');
  const [guests, setGuests] = useState(Number(params.get('guests')) || 2);
  // Dates — prefer URL params, otherwise default 7 → 11 days out (real, modifiable state)
  const [checkIn, setCheckIn] = useState(params.get('checkIn') || ymdOffset(7));
  const [checkOut, setCheckOut] = useState(params.get('checkOut') || ymdOffset(11));
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const todayStr = ymdOffset(0);

  // Derived values from actual state
  const validRange = !!(checkIn && checkOut && new Date(checkOut) > new Date(checkIn));
  const nights = useMemo(() => {
    if (!validRange) return 0;
    return Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000));
  }, [checkIn, checkOut, validRange]);
  const subtotal = item.price * nights;
  const tax = Math.round(subtotal * 0.12);
  const total = subtotal + tax + (nights > 0 ? 800 : 0);
  const conflict = useMemo(() => rangeOverlaps(checkIn, checkOut, bookedRanges), [checkIn, checkOut, bookedRanges]);
  const canContinueDates = validRange && !conflict;
  const maxGuests = item.guests || 30;

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
                <p className="text-sm text-muted-foreground mt-1">Choose your check-in and check-out. Dates that overlap an existing booking will be flagged.</p>
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="p-4 rounded-2xl border cursor-pointer hover:border-emerald2 transition">
                    <div className="text-[10px] uppercase tracking-wider font-semibold">Check-in</div>
                    <input
                      type="date"
                      min={todayStr}
                      value={checkIn}
                      onChange={(e) => { setCheckIn(e.target.value); if (checkOut && e.target.value && checkOut <= e.target.value) setCheckOut(''); }}
                      className="w-full text-base mt-1 font-semibold outline-none bg-transparent [color-scheme:light]"
                    />
                  </label>
                  <label className="p-4 rounded-2xl border cursor-pointer hover:border-emerald2 transition">
                    <div className="text-[10px] uppercase tracking-wider font-semibold">Check-out</div>
                    <input
                      type="date"
                      min={checkIn || todayStr}
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full text-base mt-1 font-semibold outline-none bg-transparent [color-scheme:light]"
                    />
                  </label>
                </div>

                {validRange && !conflict && (
                  <div className="mt-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald2 text-sm flex items-center gap-2">
                    <Check className="size-4" />
                    Available · {nights} {nights === 1 ? 'night' : 'nights'} · {fmt(checkIn)} → {fmt(checkOut)}
                  </div>
                )}
                {conflict && (
                  <div className="mt-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-2">
                    <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold">These dates are not available</div>
                      <div className="text-xs">Conflicts with a {conflict.status} booking from {fmt(conflict.checkInDate)} to {fmt(conflict.checkOutDate)}.</div>
                    </div>
                  </div>
                )}
                {!validRange && checkIn && checkOut && (
                  <div className="mt-4 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                    Check-out must be after check-in.
                  </div>
                )}

                {/* Booked dates summary so traveler knows what's taken */}
                {bookedRanges.length > 0 && (
                  <div className="mt-5">
                    <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Already booked</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {bookedRanges.slice(0, 8).map((r, i) => (
                        <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-secondary text-charcoal/80 border">
                          {fmt(r.checkInDate)} → {fmt(r.checkOutDate)}
                        </span>
                      ))}
                      {bookedRanges.length > 8 && <span className="text-[11px] text-muted-foreground">+{bookedRanges.length - 8} more</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div>
                <h2 className="font-display text-2xl font-bold flex items-center gap-2"><Users className="size-5 text-emerald2" /> Guests</h2>
                <p className="text-sm text-muted-foreground mt-1">{item.guests ? `This listing accommodates up to ${item.guests} guests.` : 'Tell us your group size.'}</p>
                <div className="mt-5 space-y-3">
                  {['Adults','Children','Infants'].map((g,i)=>(
                    <div key={g} className="flex items-center justify-between p-4 rounded-2xl border">
                      <div><div className="font-semibold">{g}</div><div className="text-xs text-muted-foreground">{i===0?'Age 13+':i===1?'Age 2–12':'Under 2'}</div></div>
                      <div className="flex items-center gap-3">
                        <button onClick={()=>i===0 && setGuests(Math.max(1,guests-1))} className="size-9 rounded-full border hover:bg-secondary transition disabled:opacity-40" disabled={i!==0}>−</button>
                        <div className="w-6 text-center font-semibold">{i===0?guests:0}</div>
                        <button onClick={()=>i===0 && setGuests(Math.min(maxGuests, guests+1))} className="size-9 rounded-full border hover:bg-secondary transition disabled:opacity-40" disabled={i!==0 || guests >= maxGuests}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
                {guests >= maxGuests && item.guests && (
                  <div className="mt-3 text-xs text-amber-700">Maximum guest count for this listing reached.</div>
                )}
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
                  <div className="flex-1">
                    <div className="font-display font-semibold">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.location}</div>
                    <div className="text-xs mt-1">{fmt(checkIn)} → {fmt(checkOut)} · {guests} {guests === 1 ? 'guest' : 'guests'} · {pay==='online'?'Pay online':'Pay on arrival'}</div>
                  </div>
                </div>
                <div className="mt-4 p-4 rounded-2xl border bg-secondary/40 text-sm space-y-2">
                  <div className="flex justify-between"><span>₹{item.price.toLocaleString('en-IN')} × {nights} {nights === 1 ? 'night' : 'nights'}</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
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
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">Your reservation at {item.title} from {fmt(checkIn)} — {fmt(checkOut)} is confirmed. We've sent the details to your email.</p>
                <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3">
                  <Button variant="outline" className="rounded-full"><Mail className="size-4 mr-2" /> Email invoice</Button>
                  <Button variant="outline" className="rounded-full"><Download className="size-4 mr-2" /> Download PDF</Button>
                  <Button asChild className="rounded-full bg-gradient-emerald"><Link href="/dashboard/traveler">Go to dashboard</Link></Button>
                </div>
                <div className="mt-8 max-w-md mx-auto text-left rounded-2xl border bg-secondary/40 p-5">
                  <div className="text-[10px] uppercase tracking-wider text-emerald2 font-semibold">Email preview</div>
                  <div className="font-display font-bold mt-1">✨ Welcome to Safar, your Kashmir trip is on!</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Booking #{(bookingId || '').slice(0,8) || `SF-${Math.floor(100000+Math.random()*900000)}`} · {item.title} · {fmt(checkIn)} → {fmt(checkOut)} · ₹{total.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            )}

            {step < 4 && (
              <div className="mt-8 flex justify-between">
                <Button variant="outline" className="rounded-full" onClick={()=>setStep(Math.max(0,step-1))} disabled={step === 0}><ChevronLeft className="size-4 mr-1" /> Back</Button>
                <Button
                  disabled={submitting || (step === 0 && !canContinueDates)}
                  className="rounded-full bg-emerald2 hover:bg-emerald2-deep font-semibold px-6 disabled:opacity-50"
                  onClick={async ()=>{
                    if (step === 3) {
                      if (!user) { setShowAuth(true); return; }
                      if (!listingId) { toast.error('No listing selected. Pick a stay from Explore first.'); return; }
                      if (!canContinueDates) { toast.error('Please pick valid, available dates.'); setStep(0); return; }
                      setSubmitting(true);
                      const { ok, data } = await bookingsApi.create({ listingId, checkInDate: checkIn, checkOutDate: checkOut, guests });
                      setSubmitting(false);
                      if (!ok) { toast.error(data?.error || 'Booking failed'); return; }
                      setBookingId(data.booking.bookingId);
                      toast.success('Booking request sent to host!');
                      setStep(4);
                    } else {
                      setStep(step+1);
                    }
                  }}
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : (<>{step===3?'Confirm & Send Request':'Continue'} <ChevronRight className="size-4 ml-1" /></>)}
                </Button>
              </div>
            )}
            <AuthModal open={showAuth} defaultMode="login" onClose={()=>setShowAuth(false)} />
          </motion.div>
        </div>

        {/* Summary */}
        <aside>
          <div className="lg:sticky lg:top-28 rounded-3xl border bg-white shadow-xl p-5">
            <img src={item.image} className="w-full aspect-[4/3] rounded-2xl object-cover" alt="" />
            <div className="mt-4 font-display font-bold">{item.title}</div>
            <div className="text-xs text-muted-foreground">{item.location}</div>
            <div className="mt-4 text-sm space-y-2">
              <div className="flex justify-between"><span>Dates</span><span className="font-medium">{fmt(checkIn)} — {fmt(checkOut)}</span></div>
              <div className="flex justify-between"><span>Nights</span><span className="font-medium">{nights}</span></div>
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

export default function App() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-emerald2" />
      </main>
    }>
      <BookingContent />
    </Suspense>
  );
}
