'use client';
import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MessageCircle, Loader2, Bell, CheckCircle2, XCircle, Clock } from 'lucide-react';
import TripShell from '@/components/explore/TripShell';
import { REQUESTS_SENT } from '@/lib/trips-data';
import { fetchReceivedRequests, decideRequest } from '@/lib/circle-explore';
import { toast } from 'sonner';

const TABS = [
  { id: 'received', label: 'Received' },
  { id: 'sent', label: 'Sent' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'chats', label: 'Chats' },
];

function timeAgo(d) {
  if (!d) return '';
  const t = new Date(d).getTime();
  const diff = Date.now() - t;
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  const hrs = Math.floor(diff / 3600000);
  if (hrs > 0) return `${hrs}h ago`;
  const mins = Math.floor(diff / 60000);
  return `${Math.max(1, mins)}m ago`;
}

function RequestsInner() {
  const sp = useSearchParams();
  const initial = sp.get('tab') || 'received';
  const [tab, setTab] = useState(initial);
  const [received, setReceived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioned, setActioned] = useState({});
  const [pending, setPending] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchReceivedRequests();
      setReceived(list);
    } catch { setReceived([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (tab === 'received') load(); }, [tab, load]);

  const act = async (r, action) => {
    setPending((p) => ({ ...p, [r.id]: action }));
    try {
      await decideRequest(r.journeyId, r.id, action);
      setActioned((prev) => ({ ...prev, [r.id]: action }));
      toast.success(action === 'accept' ? 'Traveler accepted' : 'Request declined');
    } catch (e) {
      toast.error(e.message || 'Could not update request');
    } finally {
      setPending((p) => { const n = { ...p }; delete n[r.id]; return n; });
    }
  };

  return (
    <TripShell>
      <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-4 lg:pt-8">
        <div className="lg:hidden flex items-center gap-3">
          <Link href="/explore" className="size-10 grid place-items-center rounded-full hover:bg-slate-100 active:scale-95 transition"><ArrowLeft className="size-5" /></Link>
          <h1 className="flex-1 text-center font-display font-bold text-[17px]">Join Requests</h1>
          <div className="size-10" />
        </div>
        <div className="hidden lg:block">
          <h1 className="font-display text-3xl font-bold">Join Requests</h1>
          <p className="text-[14px] text-slate-500 mt-1">Manage requests, chats and notifications</p>
        </div>

        {/* Segmented pill tabs (Received / Sent) per mobile ref */}
        <div className="mt-5 lg:mt-6 rounded-2xl bg-slate-100/70 p-1 grid grid-cols-2 max-w-md mx-auto lg:mx-0 lg:max-w-none lg:flex lg:gap-2 lg:bg-transparent lg:p-0">
          {['received','sent'].map(id => {
            const active = tab === id;
            const label = id === 'received' ? 'Received' : 'Sent';
            const count = id === 'received' ? received.length : null;
            return (
              <button key={id} onClick={() => setTab(id)} className={`inline-flex items-center justify-center gap-1.5 h-10 rounded-xl text-[13.5px] font-semibold transition-all lg:rounded-xl lg:px-4 lg:h-10 ${active ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'text-slate-600 lg:bg-slate-100'}`}>
                {label}
                {count ? <span className={`text-[10px] font-bold size-5 grid place-items-center rounded-full ${active ? 'bg-rose-500 text-white' : 'bg-white text-violet-700'}`}>{count}</span> : null}
              </button>
            );
          })}
        </div>
        {/* Secondary tabs for chats/notifications on desktop */}
        <div className="mt-3 hidden lg:flex items-center gap-2">
          {['notifications','chats'].map(id => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} className={`rounded-xl px-4 h-10 text-[13px] font-semibold transition ${active ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{id === 'notifications' ? 'Notifications' : 'Chats'}</button>
            );
          })}
        </div>

        {tab === 'received' && (
          <div className="mt-5 space-y-3">
            {loading && <div className="py-10 grid place-items-center"><Loader2 className="size-5 animate-spin text-violet-600" /></div>}
            {!loading && received.length === 0 && (
              <div className="text-center py-14 bg-white rounded-2xl border border-slate-100">
                <div className="font-display font-bold text-slate-900">No pending requests</div>
                <p className="text-[13px] text-slate-500 mt-1">When travelers request to join your trips, they\u2019ll show up here.</p>
              </div>
            )}
            {!loading && received.map(r => {
              const status = actioned[r.id];
              const busy = pending[r.id];
              return (
                <div key={r.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <Image src={r.userAvatar || `https://i.pravatar.cc/60?u=${encodeURIComponent(r.userId || r.id)}`} alt={r.userName} width={44} height={44} className="rounded-full object-cover" unoptimized />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="truncate">
                          <div className="font-semibold text-[14px] text-slate-900 truncate">{r.userName}</div>
                          <div className="text-[11.5px] text-slate-500">wants to join <span className="font-semibold text-slate-700">{r.journeyName || 'your trip'}</span> \u00b7 {r.seats || 1} seat{(r.seats || 1) > 1 ? 's' : ''}</div>
                        </div>
                        <div className="text-[11px] text-slate-400 shrink-0">{timeAgo(r.createdAt)}</div>
                      </div>
                      {r.message && <p className="mt-2 text-[13px] text-slate-700">{r.message}</p>}
                      {status ? (
                        <div className={`mt-3 inline-flex items-center gap-1 text-[12px] font-semibold ${status === 'accept' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {status === 'accept' ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                          {status === 'accept' ? 'Accepted' : 'Declined'}
                        </div>
                      ) : (
                        <div className="mt-3 flex items-center gap-2">
                          <button onClick={() => act(r, 'decline')} disabled={!!busy} className="flex-1 rounded-xl border border-slate-200 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{busy === 'decline' ? '\u2026' : 'Decline'}</button>
                          <button className="size-9 grid place-items-center rounded-xl border border-slate-200"><MessageCircle className="size-4 text-slate-600" /></button>
                          <button onClick={() => act(r, 'accept')} disabled={!!busy} className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white py-2 text-[13px] font-semibold disabled:opacity-70">{busy === 'accept' ? '\u2026' : 'Accept'}</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'sent' && (
          <div className="mt-5 space-y-3">
            {REQUESTS_SENT.map(r => (
              <div key={r.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex items-start gap-3">
                  <Image src={r.avatar} alt={r.name} width={44} height={44} className="rounded-lg object-cover" unoptimized />
                  <div className="flex-1">
                    <div className="font-semibold text-[14px] text-slate-900">{r.name}</div>
                    <p className="mt-1 text-[12.5px] text-slate-500">{r.message}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {r.status === 'accepted' ? (
                        <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-emerald-700"><CheckCircle2 className="size-3.5" /> Accepted</span>
                      ) : r.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-amber-700"><Clock className="size-3.5" /> Pending</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-rose-700"><XCircle className="size-3.5" /> Rejected</span>
                      )}
                      <span className="text-[11px] text-slate-400 ml-auto">{r.when}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'notifications' && (
          <div className="mt-5 space-y-2">
            {[
              { icon: Bell, tone: 'violet', title: 'New join request', body: 'A traveler requested to join one of your trips', when: 'Recently' },
              { icon: CheckCircle2, tone: 'emerald', title: 'Request accepted', body: 'Your request was accepted by the host', when: '1d ago' },
              { icon: MessageCircle, tone: 'sky', title: 'New message', body: 'You have a new message in a trip chat', when: '2d ago' },
              { icon: Clock, tone: 'amber', title: 'Trip reminder', body: 'An upcoming trip starts soon', when: '3d ago' },
            ].map((n, i) => {
              const Icon = n.icon;
              return (
                <div key={i} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4">
                  <div className={`size-9 rounded-xl grid place-items-center bg-${n.tone}-100 text-${n.tone}-700 shrink-0`}><Icon className="size-4" /></div>
                  <div className="flex-1">
                    <div className="font-semibold text-[13.5px] text-slate-900">{n.title}</div>
                    <div className="text-[12.5px] text-slate-500">{n.body}</div>
                  </div>
                  <div className="text-[11px] text-slate-400">{n.when}</div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'chats' && (
          <div className="mt-5 space-y-2">
            {['Kashmir Great Lakes Trek','Ladakh Road Trip','Weekend in Gulmarg'].map((chat, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5">
                <div className="size-10 rounded-xl bg-violet-100 text-violet-700 grid place-items-center font-semibold">{chat[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[14px] text-slate-900 truncate">{chat}</div>
                  <div className="text-[12px] text-slate-500 truncate">{'Group chat \u00B7 8 members'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TripShell>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin text-violet-600" /></div>}>
      <RequestsInner />
    </Suspense>
  );
}
