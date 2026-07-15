'use client';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { MessageCircle, Send, Loader2, ArrowLeft, ImagePlus, Route, Lock } from 'lucide-react';
import AuroraBg from '@/components/explore/AuroraBg';
import { useAuth } from '@/lib/auth-context';

export default function MessagesPageWrapper() {
  return (
    <Suspense fallback={<div className="e-container pt-24 pb-24 text-center"><Loader2 className="size-6 animate-spin mx-auto text-white/60" /></div>}>
      <MessagesPage />
    </Suspense>
  );
}

function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const activeId = params.get('thread') || '';
  const [threads, setThreads] = useState(null);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [readOnly, setReadOnly] = useState(false);
  const [archived, setArchived] = useState(false);
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  const loadInbox = useCallback(async () => {
    try {
      const r = await fetch('/api/circle/dm/mine');
      const j = await r.json();
      if (j.ok) setThreads(j.threads || []);
    } catch { setThreads([]); }
  }, []);

  const loadThread = useCallback(async (id) => {
    if (!id) { setThread(null); setMessages([]); return; }
    try {
      const r = await fetch(`/api/circle/dm/${id}`);
      const j = await r.json();
      if (j.ok) {
        setThread(j.thread);
        setMessages(j.messages || []);
        setReadOnly(!!j.readOnly);
        setArchived(!!j.archived);
        fetch(`/api/circle/dm/${id}/read`, { method: 'PATCH' }).catch(()=>{});
        // Update local unread indicator
        setThreads(ts => (ts || []).map(t => t.id === id ? { ...t, myUnread: 0 } : t));
      } else {
        setThread(null); setMessages([]);
      }
    } catch {}
  }, []);

  useEffect(() => { if (user) loadInbox(); }, [user, loadInbox]);
  useEffect(() => { if (user && activeId) loadThread(activeId); }, [user, activeId, loadThread]);

  // light polling every 15s while a thread is open
  useEffect(() => {
    if (!activeId) return;
    const t = setInterval(() => loadThread(activeId), 15000);
    return () => clearInterval(t);
  }, [activeId, loadThread]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    if ((!text.trim() && !imageUrl.trim()) || busy || !activeId) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/circle/dm/${activeId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), image: imageUrl.trim() || undefined }),
      });
      const j = await r.json();
      if (j.ok) {
        setMessages(m => [...m, j.message]);
        setText(''); setImageUrl(''); setShowImageInput(false);
        loadInbox();
      }
    } catch {}
    setBusy(false);
  };

  if (!user) return (
    <div className="e-container pt-24 pb-24 text-center">
      <div className="e-chip mx-auto"><Lock className="size-3" /> Sign in</div>
      <p className="mt-4" style={{ color: 'var(--e-text-muted)' }}>Please <Link href="/?auth=1" className="e-grad-text font-semibold">sign in</Link> to view your messages.</p>
    </div>
  );

  const other = thread ? (thread.participants || []).find(p => p.id !== user.id) : null;

  return (
    <div className="relative">
      <section className="relative overflow-hidden pt-14 md:pt-20 pb-4">
        <AuroraBg />
        <div className="relative e-container e-fade-in">
          <div className="e-chip"><MessageCircle className="size-3 text-emerald-300" /> Journey messages</div>
          <h1 className="display font-bold mt-3 text-[clamp(1.6rem,4vw,2.4rem)] leading-tight">Coordinate your <span className="e-grad-text">travels</span></h1>
          <p className="mt-2 text-sm max-w-2xl" style={{ color: 'var(--e-text-muted)' }}>Private chats are only available with organizers and accepted travelers of your journeys.</p>
        </div>
      </section>

      <section className="relative e-container pb-24">
        <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-4">
          {/* Inbox */}
          <aside className={`e-glass rounded-2xl p-2 ${activeId ? 'hidden lg:block' : ''}`}>
            {threads === null && <div className="p-4 text-center"><Loader2 className="size-4 animate-spin mx-auto text-white/50" /></div>}
            {threads && threads.length === 0 && (
              <div className="p-6 text-center text-sm" style={{ color: 'var(--e-text-muted)' }}>
                No conversations yet.
                <div className="text-xs mt-2" style={{ color: 'var(--e-text-dim)' }}>DMs appear after you're accepted into a journey.</div>
              </div>
            )}
            <div className="space-y-1">
              {(threads || []).map(t => {
                const o = (t.participants || []).find(p => p.id !== user.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => router.push(`/explore/messages?thread=${t.id}`)}
                    className={`w-full text-left p-2 rounded-xl transition flex items-center gap-3 ${activeId === t.id ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'}`}
                  >
                    {o?.avatar
                      ? <Image src={o.avatar} alt={o.name} width={40} height={40} className="rounded-full shrink-0" unoptimized />
                      : <div className="size-10 rounded-full bg-gradient-to-br from-emerald-300 to-violet-400 grid place-items-center text-[#06080f] font-bold shrink-0">{(o?.name || '?')[0]}</div>}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold truncate">{o?.name || 'Traveler'}</div>
                        {t.myUnread > 0 && <span className="text-[10px] bg-rose-500 text-white rounded-full px-1.5 min-w-[16px] h-4 grid place-items-center">{t.myUnread}</span>}
                      </div>
                      <div className="text-[11px] truncate" style={{ color: 'var(--e-text-dim)' }}>
                        <Route className="inline size-3 mr-0.5" />{t.journeyName}{t.archived ? ' · archived' : ''}
                      </div>
                      {t.lastMessage && <div className="text-xs truncate mt-0.5" style={{ color: 'var(--e-text-muted)' }}>{t.lastMessage.text}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Thread view */}
          <div className={`e-glass rounded-2xl flex flex-col ${!activeId ? 'hidden lg:flex' : ''}`} style={{ minHeight: '60vh' }}>
            {!activeId && (
              <div className="flex-1 grid place-items-center p-6 text-sm text-center" style={{ color: 'var(--e-text-muted)' }}>
                <div>
                  <MessageCircle className="size-8 mx-auto mb-2 opacity-50" />
                  Select a conversation to start
                </div>
              </div>
            )}
            {activeId && !thread && <div className="flex-1 grid place-items-center"><Loader2 className="size-5 animate-spin text-white/50" /></div>}
            {activeId && thread && (
              <>
                <div className="flex items-center gap-3 p-3 border-b border-white/10">
                  <button onClick={() => router.push('/explore/messages')} className="lg:hidden e-btn-ghost rounded-full size-8 grid place-items-center"><ArrowLeft className="size-4" /></button>
                  {other?.avatar
                    ? <Image src={other.avatar} alt={other.name} width={36} height={36} className="rounded-full" unoptimized />
                    : <div className="size-9 rounded-full bg-gradient-to-br from-emerald-300 to-violet-400 grid place-items-center text-[#06080f] font-bold text-sm">{(other?.name || '?')[0]}</div>}
                  <div className="flex-1 min-w-0">
                    <Link href={`/explore/u/${other?.username || other?.id}`} className="text-sm font-semibold truncate hover:underline">{other?.name}</Link>
                    <Link href={`/explore/j/${thread.journeySlug}`} className="text-[11px] block truncate hover:underline" style={{ color: 'var(--e-text-dim)' }}>
                      <Route className="inline size-3 mr-0.5" />{thread.journeyName}{archived ? ' · archived' : ''}
                    </Link>
                  </div>
                </div>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2" style={{ background: 'rgba(0,0,0,0.12)' }}>
                  {messages.length === 0 && <div className="text-center text-sm py-6" style={{ color: 'var(--e-text-dim)' }}>Say hi 👋</div>}
                  {messages.map(m => {
                    const mine = m.userId === user.id;
                    return (
                      <div key={m.id} className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                        {m.userAvatar
                          ? <Image src={m.userAvatar} alt={m.userName} width={28} height={28} className="rounded-full shrink-0 self-end" unoptimized />
                          : <div className="size-7 rounded-full bg-white/10 grid place-items-center text-[10px] shrink-0 self-end">{(m.userName||'?')[0]}</div>}
                        <div className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-sm ${mine ? 'bg-emerald-400/20' : 'bg-white/[0.06]'}`}>
                          {m.image && <div className="mb-1 rounded-lg overflow-hidden">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={m.image} alt="" className="max-h-56 object-cover" loading="lazy"/></div>}
                          {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
                          <div className="text-[10px] mt-0.5 flex justify-end gap-1" style={{ color: 'var(--e-text-dim)' }}>
                            <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {mine && (m.readBy || []).some(uid => uid !== user.id) && <span title="Read">✓✓</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {readOnly || archived ? (
                  <div className="p-3 text-center text-xs border-t border-white/10" style={{ color: 'var(--e-text-muted)' }}>{archived ? 'This journey is archived. Chat is read-only.' : 'This chat is read-only.'}</div>
                ) : (
                  <div className="p-2 border-t border-white/10 space-y-2">
                    {showImageInput && <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Image URL" className="w-full text-xs rounded-full bg-white/[0.04] border border-white/10 px-3 py-1.5 outline-none" />}
                    <div className="flex gap-2">
                      <button onClick={() => setShowImageInput(v => !v)} title="Add image" className="e-btn-ghost rounded-full size-9 grid place-items-center shrink-0"><ImagePlus className="size-4" /></button>
                      <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Type a message…" className="flex-1 text-sm rounded-full bg-white/[0.04] border border-white/10 px-4 py-2 outline-none" />
                      <button onClick={send} disabled={busy || (!text.trim() && !imageUrl.trim())} className="e-btn-primary rounded-full size-9 grid place-items-center shrink-0">{busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
