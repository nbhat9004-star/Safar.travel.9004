'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User as UserIcon, Sparkles, MapPin, Shield, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

const ROLE_OPTIONS = [
  { id: 'traveler', label: 'Traveler', desc: 'Book stays, experiences & transport', icon: MapPin },
  { id: 'host',     label: 'Host',     desc: 'List your home, transport or tour service', icon: Sparkles },
];

export default function AuthModal({ open, onClose, defaultMode = 'login' }) {
  const [mode, setMode] = useState(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('traveler');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { login, register } = useAuth();

  // Mark client-mounted so createPortal is SSR-safe.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  // Lock body scroll while the modal is open; restore on close/unmount.
  // Also close on Escape.
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    // Compensate for the disappearing scrollbar so layout doesn't shift.
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarW > 0) document.body.style.paddingRight = `${scrollbarW}px`;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    let res;
    if (mode === 'login') res = await login(email, password);
    else res = await register(name, email, password, role);
    setLoading(false);
    if (!res.success) { toast.error(res.error || 'Something went wrong'); return; }
    toast.success(mode === 'login' ? `Welcome back, ${res.user.name.split(' ')[0]}!` : `Account created. Welcome to Safar, ${res.user.name.split(' ')[0]}!`);
    onClose?.();
  };

  const modalNode = (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        // Full-viewport backdrop: fixed + dvh keeps it correct on mobile address-bar changes.
        // Rendered via portal to document.body so no transformed ancestor can rebase the
        // containing block of `position: fixed`.
        style={{ position: 'fixed', inset: 0, height: '100dvh' }}
        className="z-[1000] bg-charcoal/55 backdrop-blur-md flex items-center justify-center p-0 md:p-6 overflow-y-auto overscroll-contain" onClick={onClose}>
        <motion.div onClick={(e) => e.stopPropagation()} initial={{ y: 40, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 30, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 26 }}
          className="w-full md:max-w-md bg-white md:rounded-3xl shadow-2xl border overflow-hidden max-h-[100dvh] md:max-h-[92dvh] overflow-y-auto my-auto">
          {/* Header */}
          <div className="px-6 pt-6 pb-5 bg-gradient-emerald text-white relative">
            <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 size-9 grid place-items-center rounded-full hover:bg-white/15"><X className="size-5" /></button>
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-2xl bg-white/15 grid place-items-center ring-1 ring-white/20"><MapPin className="size-5 text-gold" /></div>
              <div>
                <div className="font-display font-bold text-lg leading-tight">{mode === 'login' ? 'Welcome back' : 'Join Safar'}</div>
                <div className="text-[11px] text-white/75">{mode === 'login' ? 'Sign in to continue' : 'Create your free account'}</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 pt-5">
            <div className="grid grid-cols-2 p-1 rounded-full bg-secondary text-sm font-semibold">
              <button onClick={()=>setMode('login')} className={`py-2 rounded-full transition ${mode==='login' ? 'bg-white shadow' : 'text-muted-foreground'}`}>Sign in</button>
              <button onClick={()=>setMode('signup')} className={`py-2 rounded-full transition ${mode==='signup' ? 'bg-white shadow' : 'text-muted-foreground'}`}>Sign up</button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="px-6 pb-6 pt-5 space-y-3.5">
            {mode === 'signup' && (
              <>
                <Field icon={UserIcon} placeholder="Full name" value={name} onChange={setName} autoFocus />
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">I want to join as</div>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLE_OPTIONS.map((r) => {
                      const Ico = r.icon; const on = role === r.id;
                      return (
                        <button type="button" key={r.id} onClick={()=>setRole(r.id)} className={`text-left p-3 rounded-2xl border-2 transition ${on ? 'border-emerald2 bg-emerald2/5' : 'border-border hover:border-charcoal/30'}`}>
                          <Ico className="size-4 text-emerald2" />
                          <div className="font-semibold text-sm mt-1.5">{r.label}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{r.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
            <Field icon={Mail} type="email" placeholder="Email address" value={email} onChange={setEmail} autoFocus={mode==='login'} />
            <Field icon={Lock} type="password" placeholder={mode==='signup' ? 'Create password (min 6)' : 'Password'} value={password} onChange={setPassword} />
            {mode === 'login' && (
              <div className="text-right">
                <a href="/auth/forgot-password" className="text-xs text-emerald2 hover:underline">Forgot password?</a>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full h-12 rounded-2xl bg-emerald2 hover:bg-emerald2-deep text-white font-semibold mt-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : (mode === 'login' ? <>Sign in <ChevronRight className="size-4 ml-1" /></> : <>Create account <ChevronRight className="size-4 ml-1" /></>)}
            </Button>

            <div className="text-[11px] text-muted-foreground text-center pt-2 flex items-center justify-center gap-1.5"><Shield className="size-3 text-emerald2" /> Secure auth · Passwords are hashed · JWT sessions</div>
            <div className="text-center text-sm text-muted-foreground">
              {mode === 'login' ? <>New to Safar? <button type="button" onClick={()=>setMode('signup')} className="text-emerald2 font-semibold hover:underline">Create an account</button></> : <>Already have an account? <button type="button" onClick={()=>setMode('login')} className="text-emerald2 font-semibold hover:underline">Sign in</button></>}
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // Render through a root-level portal so the modal is a direct child of <body>.
  // Bypasses any transformed/filtered/will-change ancestor that would otherwise
  // rebase the containing block of `position: fixed` and break viewport centering.
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(modalNode, document.body);
}

function Field({ icon: Ico, type = 'text', placeholder, value, onChange, autoFocus }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border bg-white focus-within:border-emerald2 focus-within:ring-2 focus-within:ring-emerald2/15 transition">
      <Ico className="size-4 text-muted-foreground" />
      <input type={type} required placeholder={placeholder} value={value} onChange={(e)=>onChange(e.target.value)} autoFocus={autoFocus}
        className="flex-1 outline-none bg-transparent text-sm placeholder:text-muted-foreground" />
    </div>
  );
}
