'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Award, Sparkles, Loader2, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

// -------------------------------------------------------------------
// EXPLORE V3 — Rewards board (3×3 = 9 cards)
// Each completed trip flips one card off the board. When all 9 are gone
// the final admin-configured reward reveals.
// -------------------------------------------------------------------
export default function RewardsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      try {
        const r = await fetch('/api/explore/me/rewards', { cache: 'no-store' });
        const j = await r.json();
        if (j?.ok) setData(j);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [user]);

  if (!user) return (
    <div className="container py-16 text-center">
      <Award className="size-12 mx-auto text-amber-500" />
      <h1 className="mt-4 font-display text-2xl font-bold text-charcoal">Sign in to unlock rewards</h1>
      <Link href="/?auth=1" className="mt-4 inline-flex items-center gap-2 px-6 h-11 rounded-full bg-emerald2 text-white font-semibold">Sign in</Link>
    </div>
  );
  if (loading || !data) return <div className="container py-16 grid place-items-center"><Loader2 className="size-8 animate-spin text-emerald2" /></div>;

  return (
    <div className="container py-8 md:py-12 max-w-2xl">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] uppercase tracking-[0.22em] font-bold"><Sparkles className="size-3" /> Wanderer&apos;s board</div>
        <h1 className="mt-3 font-display text-3xl md:text-4xl font-bold text-charcoal tracking-tight">{data.boardTitle}</h1>
        <p className="text-muted-foreground mt-2">{data.boardSubtitle}</p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold">
          {data.completed} / {data.total} trips completed
        </div>
      </div>

      {/* 3×3 board */}
      <div className="mt-10 grid grid-cols-3 gap-3 md:gap-4 max-w-md mx-auto">
        {(data.cards || []).map((c) => (
          <div key={c.id} className={`aspect-square rounded-2xl border-2 grid place-items-center text-center transition-all duration-500 ${c.removed ? 'bg-transparent border-dashed border-emerald-200 text-emerald-200 opacity-40' : 'bg-white border-emerald-200 hover:border-amber-400 hover:shadow-lg'}`}>
            {c.removed ? (
              <div className="text-3xl md:text-4xl">✓</div>
            ) : (
              <div>
                <div className="text-4xl md:text-5xl">{c.emoji}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider font-bold text-emerald-800">{c.label}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Final reward */}
      {data.revealed && data.finalReward && (
        <div className="mt-10 rounded-3xl bg-gradient-to-br from-emerald-900 to-emerald-950 text-white p-8 text-center relative overflow-hidden shadow-2xl">
          <Trophy className="size-16 mx-auto text-amber-300" />
          <div className="mt-3 text-[11px] uppercase tracking-[0.24em] font-bold text-amber-300">You did it!</div>
          <h2 className="mt-2 font-display text-3xl md:text-4xl font-bold">{data.finalReward.title}</h2>
          <p className="mt-3 text-white/90 max-w-md mx-auto">{data.finalReward.body}</p>
        </div>
      )}

      {!data.revealed && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          {data.remaining} more completed trip{data.remaining !== 1 ? 's' : ''} until the hidden reward reveals.
        </div>
      )}
    </div>
  );
}
