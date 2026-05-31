'use client';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import AuthModal from '@/components/safar/AuthModal';
import { Loader2, Lock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Props: roles (string[] | string), children
// Shows skeleton while loading, AuthModal if not signed in, 403 page if wrong role.
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const [openAuth, setOpenAuth] = useState(false);
  const allowed = Array.isArray(roles) ? roles : (roles ? [roles] : null);

  useEffect(() => {
    if (!loading && !user) setOpenAuth(true);
  }, [loading, user]);

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Loader2 className="size-6 animate-spin text-emerald2" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] grid place-items-center px-4">
        <div className="text-center max-w-md">
          <div className="size-14 mx-auto rounded-2xl bg-emerald2/10 grid place-items-center"><Lock className="size-6 text-emerald2" /></div>
          <h2 className="font-display text-2xl font-bold mt-4">Sign in to continue</h2>
          <p className="text-muted-foreground text-sm mt-1">This page is for Safar members.</p>
          <Button className="mt-5 rounded-full bg-emerald2 hover:bg-emerald2-deep" onClick={()=>setOpenAuth(true)}>Sign in / Sign up</Button>
        </div>
        <AuthModal open={openAuth} defaultMode="login" onClose={()=>setOpenAuth(false)} />
      </div>
    );
  }

  if (allowed && !allowed.includes(user.role)) {
    return (
      <div className="min-h-[70vh] grid place-items-center px-4">
        <div className="text-center max-w-md">
          <div className="size-14 mx-auto rounded-2xl bg-rose-50 grid place-items-center"><Lock className="size-6 text-rose-600" /></div>
          <h2 className="font-display text-2xl font-bold mt-4">Access restricted</h2>
          <p className="text-muted-foreground text-sm mt-1">Your role (<span className="font-semibold capitalize">{user.role}</span>) cannot view this page. Required: <span className="font-semibold capitalize">{allowed.join(' / ')}</span>.</p>
          <Button asChild className="mt-5 rounded-full bg-emerald2 hover:bg-emerald2-deep"><Link href="/">Back to home</Link></Button>
        </div>
      </div>
    );
  }

  return children;
}
