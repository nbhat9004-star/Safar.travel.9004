'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import AuthModal from '@/components/safar/AuthModal';
import { Button } from '@/components/ui/button';
import { User, UserPlus, LogOut, LayoutDashboard, Shield, Home as HomeIcon } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export function AuthButtons({ solid }) {
  const { user, loading, logout } = useAuth();
  const [mode, setMode] = useState(null); // 'login' | 'signup' | null
  const [menu, setMenu] = useState(false);

  if (loading) {
    return <div className="hidden md:block size-10 rounded-full bg-white/10 animate-pulse" />;
  }

  if (!user) {
    return (
      <>
        <Button variant="ghost" size="sm" onClick={()=>setMode('login')}
          className={`hidden md:inline-flex rounded-full px-4 h-10 font-medium ${solid ? 'text-charcoal hover:bg-secondary' : 'text-white hover:bg-white/10'}`}>
          Sign in
        </Button>
        <Button size="sm" onClick={()=>setMode('signup')}
          className="hidden md:inline-flex rounded-full bg-emerald2 hover:bg-emerald2-deep shadow-lg shadow-emerald2/25 px-5 h-10 font-semibold text-white">
          <UserPlus className="size-4 mr-1.5" /> Sign up
        </Button>
        <AuthModal open={!!mode} defaultMode={mode || 'login'} onClose={()=>setMode(null)} />
      </>
    );
  }

  const initials = (user.name || user.email || 'U').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
  const roleLabel = user.role?.charAt(0).toUpperCase() + user.role?.slice(1);
  const dashHref = user.role === 'admin' ? '/admin' : user.role === 'host' ? '/dashboard/host' : '/dashboard/traveler';

  return (
    <div className="relative">
      <button onClick={()=>setMenu(!menu)} className={`hidden md:inline-flex items-center gap-2 rounded-full pl-2 pr-3 h-10 border transition ${solid ? 'border-border bg-white hover:bg-secondary' : 'border-white/30 bg-white/10 hover:bg-white/20 text-white backdrop-blur'}`}>
        <span className="size-7 rounded-full bg-gradient-emerald text-white grid place-items-center text-xs font-bold">{initials}</span>
        <span className="text-sm font-medium tracking-tight">{user.name?.split(' ')[0]}</span>
      </button>
      <AnimatePresence>
        {menu && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border overflow-hidden z-50" onMouseLeave={()=>setMenu(false)}>
            <div className="px-4 py-3 border-b">
              <div className="font-display font-semibold text-sm leading-tight">{user.name}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald2/10 text-emerald2 text-[10px] uppercase tracking-wider font-bold">
                {user.role === 'admin' ? <Shield className="size-3" /> : user.role === 'host' ? <HomeIcon className="size-3" /> : <User className="size-3" />} {roleLabel}
              </div>
            </div>
            <Link href={dashHref} onClick={()=>setMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary"><LayoutDashboard className="size-4" /> Dashboard</Link>
            {user.role !== 'admin' && (<Link href="/wishlist" onClick={()=>setMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary"><User className="size-4" /> My wishlist</Link>)}
            <button onClick={async ()=>{ await logout(); toast.success('Signed out'); setMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-secondary text-rose-600 border-t"><LogOut className="size-4" /> Sign out</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MobileAuthButtons({ onClose, onOpenAuth }) {
  const { user, logout } = useAuth();
  if (!user) {
    // Close the Sheet FIRST, then ask Navbar to open the AuthModal at the
    // root level. Rendering the modal inside the Sheet's Radix Dialog subtree
    // caused Radix to apply aria-hidden + pointer-events:none on the modal
    // portal, letting clicks pass through to nav Links underneath.
    const trigger = (m) => (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      onClose?.();
      // Wait for Sheet close/unmount so Radix releases its pointer-events lock
      setTimeout(() => onOpenAuth?.(m), 60);
    };
    return (
      <>
        <Button variant="outline" className="w-full h-11 rounded-full font-semibold" onClick={trigger('login')}><User className="size-4 mr-2" /> Sign in</Button>
        <Button className="w-full h-11 rounded-full bg-emerald2 hover:bg-emerald2-deep font-semibold" onClick={trigger('signup')}><UserPlus className="size-4 mr-2" /> Sign up</Button>
      </>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary">
        <div className="size-10 rounded-full bg-gradient-emerald text-white grid place-items-center font-bold">{(user.name||'U').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{user.name}</div>
          <div className="text-xs text-muted-foreground truncate">{user.email} · {user.role}</div>
        </div>
      </div>
      <Button variant="outline" className="w-full h-11 rounded-full font-semibold text-rose-600" onClick={async ()=>{ await logout(); toast.success('Signed out'); onClose?.(); }}><LogOut className="size-4 mr-2" /> Sign out</Button>
    </div>
  );
}
