'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Users, UserPlus, MessageCircle, MapPin, Sparkles, Filter, Heart, Backpack, Plane,
  Baby, Baseline as User, Loader2, Plus, X, Send, Bookmark, Share2, Flag,
  Edit3, Trash2, HelpCircle, Lightbulb, Gem, CalendarClock,
} from 'lucide-react';
import AuroraBg from '@/components/explore/AuroraBg';
import BadgeChip from '@/components/explore/BadgeChip';
import { useAuth } from '@/lib/auth-context';

const CATS = [
  { id: 'all',          label: 'All',           icon: Sparkles },
  { id: 'discussions',  label: 'Discussions',   icon: MessageCircle },
  { id: 'questions',    label: 'Questions',     icon: HelpCircle },
  { id: 'tips',         label: 'Travel Tips',   icon: Lightbulb },
  { id: 'hidden_gems',  label: 'Hidden Gems',   icon: Gem },
  { id: 'meetups',      label: 'Meetups',       icon: CalendarClock },
  { id: 'travelers',    label: 'Travelers',     icon: Users },
];

const TYPES = [
  { id: 'all', label: 'All travelers', icon: Users },
  { id: 'solo', label: 'Solo', icon: User },
  { id: 'backpackers', label: 'Backpackers', icon: Backpack },
  { id: 'couples', label: 'Couples', icon: Heart },
  { id: 'families', label: 'Families', icon: Baby },
  { id: 'groups', label: 'Groups', icon: Plane },
];

const MOCK_BUDDIES = [
  { id: 'b1', name: 'Aanya Sharma', avatar: 'https://i.pravatar.cc/128?img=45', city: 'Mumbai',    dates: 'Dec 12–19', type: 'solo',        style: 'Slow travel · Cafes · Photos',   badge: '4.9 host rating' },
  { id: 'b2', name: 'Rohan & Meera',avatar: 'https://i.pravatar.cc/128?img=13', city: 'Bengaluru', dates: 'Jan 3–10',  type: 'couples',     style: 'Ski + honeymoon vibes',           badge: 'Verified traveler' },
  { id: 'b3', name: 'Trail Crew',   avatar: 'https://i.pravatar.cc/128?img=52', city: 'Delhi',     dates: 'Nov 22–28', type: 'groups',      style: 'Trekking · Camping',              badge: '6 members' },
  { id: 'b4', name: 'Saira K.',     avatar: 'https://i.pravatar.cc/128?img=32', city: 'Pune',      dates: 'Feb 8–14',  type: 'backpackers', style: 'Cheap, deep, real',               badge: 'Repeat traveler' },
  { id: 'b5', name: 'The Iyers',    avatar: 'https://i.pravatar.cc/128?img=68', city: 'Chennai',   dates: 'Dec 24–30', type: 'families',    style: '2 kids, gentle pace',             badge: 'Family-friendly' },
  { id: 'b6', name: 'Kabir M.',     avatar: 'https://i.pravatar.cc/128?img=7',  city: 'Kolkata',   dates: 'Mar 5–12',  type: 'solo',        style: 'Local food · old town',           badge: 'Photographer' },
];

export default function ExploreCommunity() {
  const { user } = useAuth();
  const [cat, setCat] = useState('all');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCompose, setOpenCompose] = useState(false);
  const [editing, setEditing] = useState(null);
  const [type, setType] = useState('all');

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (cat && cat !== 'all') qs.set('category', cat);
      const r = await fetch(`/api/circle/posts?${qs.toString()}`);
      const j = await r.json();
      setPosts(j.posts || []);
    } catch {}
    setLoading(false);
  }, [cat]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const onCreated = (post) => {
    setPosts(p => [post, ...p]);
    setOpenCompose(false); setEditing(null);
  };
  const onUpdated = (post) => {
    setPosts(p => p.map(x => x.id === post.id ? { ...x, ...post } : x));
    setOpenCompose(false); setEditing(null);
  };
  const onDeleted = (id) => setPosts(p => p.filter(x => x.id !== id));

  const filteredBuddies = type === 'all' ? MOCK_BUDDIES : MOCK_BUDDIES.filter(b => b.type === type);

  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative overflow-hidden pt-14 md:pt-20 pb-10">
        <AuroraBg />
        <div className="relative e-container e-fade-in">
          <div className="e-chip"><Users className="size-3 text-emerald-300" /> Community</div>
          <h1 className="display font-bold mt-4 text-[clamp(2rem,5.6vw,4rem)] leading-tight max-w-3xl">
            Find your <span className="e-grad-text">travel tribe.</span>
          </h1>
          <p className="mt-4 text-white/75 max-w-2xl">Ask, share, discover — with real travelers planning real trips right now.</p>
        </div>
      </section>

      {/* Category pills */}
      <section className="relative e-container mb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <div className="flex items-center gap-2 overflow-x-auto e-scroll-x pb-1">
            {CATS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setCat(id)} className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition border ${cat===id ? 'e-btn-primary border-transparent' : 'bg-white/[0.04] border-white/10 text-white/75 hover:bg-white/[0.08] hover:text-white'}`}>
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>
          <button onClick={() => { setEditing(null); setOpenCompose(true); }} className="e-btn-primary rounded-full px-4 py-2 text-sm inline-flex items-center gap-1.5"><Plus className="size-4" /> New post</button>
        </div>
      </section>

      {/* Meet Travelers section (when cat=travelers OR all) */}
      {(cat === 'all' || cat === 'travelers') && (
        <section className="relative e-container mb-10">
          <div className="e-chip mb-3"><Users className="size-3 text-emerald-300" /> Meet travelers</div>
          <div className="flex items-center gap-2 overflow-x-auto e-scroll-x pb-1 mb-4">
            {TYPES.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setType(id)} className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition border ${type===id ? 'e-btn-primary border-transparent' : 'bg-white/[0.04] border-white/10 text-white/75 hover:bg-white/[0.08] hover:text-white'}`}>
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBuddies.map(b => (
              <div key={b.id} className="e-glass rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Image src={b.avatar} alt={b.name} width={48} height={48} className="rounded-xl ring-1 ring-white/20" unoptimized />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-sm truncate">{b.name}</div>
                      <BadgeChip type="new">{b.badge}</BadgeChip>
                    </div>
                    <div className="text-[10px] text-white/55 mt-0.5 truncate"><MapPin className="inline size-3 mr-0.5" />{b.city} · {b.dates}</div>
                    <div className="text-xs text-white/80 mt-2 leading-relaxed">{b.style}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* POSTS FEED */}
      <section className="relative e-container pb-24">
        <div className="e-chip mb-3"><MessageCircle className="size-3 text-emerald-300" /> {cat === 'all' ? 'Community feed' : CATS.find(c=>c.id===cat)?.label}</div>
        {loading ? (
          <div className="text-center py-8"><Loader2 className="size-6 animate-spin mx-auto text-white/60" /></div>
        ) : posts.length === 0 ? (
          <div className="e-glass rounded-3xl p-8 text-center">
            <div className="e-chip mx-auto">✨ Fresh start</div>
            <p className="mt-4" style={{ color: 'var(--e-text-muted)' }}>No posts yet in this section. <button onClick={() => { setEditing(null); setOpenCompose(true); }} className="e-grad-text font-semibold">Be the first →</button></p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {posts.map(p => (
              <PostCard
                key={p.id}
                post={p}
                currentUser={user}
                onDelete={() => onDeleted(p.id)}
                onEdit={() => { setEditing(p); setOpenCompose(true); }}
              />
            ))}
          </div>
        )}
      </section>

      {openCompose && (
        <ComposeModal
          initial={editing}
          onClose={() => { setOpenCompose(false); setEditing(null); }}
          onCreated={onCreated}
          onUpdated={onUpdated}
        />
      )}
    </div>
  );
}

/* -------------------- PostCard -------------------- */
function PostCard({ post, currentUser, onDelete, onEdit }) {
  const [liked, setLiked] = useState(!!post.liked);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [bookmarked, setBookmarked] = useState(!!post.bookmarked);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(null);
  const [cText, setCText] = useState('');
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState(false);
  const isOwner = currentUser && currentUser.id === post.authorId;

  const like = async () => {
    if (!currentUser) { window.location.href = '/?auth=1'; return; }
    const nx = !liked;
    setLiked(nx); setLikesCount(c => c + (nx ? 1 : -1)); // optimistic
    await fetch(`/api/circle/posts/${post.id}/like`, { method: 'POST' });
  };
  const bookmark = async () => {
    if (!currentUser) { window.location.href = '/?auth=1'; return; }
    setBookmarked(v => !v);
    await fetch(`/api/circle/posts/${post.id}/bookmark`, { method: 'POST' });
  };
  const share = async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/explore/community?post=${post.id}` : '';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: post.title || 'Community post', text: post.content?.slice(0, 100), url }); } catch {}
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
    }
  };
  const report = async () => {
    if (!currentUser) { window.location.href = '/?auth=1'; return; }
    const reason = prompt('Report reason (optional):') || '';
    setReported(true);
    await fetch(`/api/circle/posts/${post.id}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
  };
  const del = async () => {
    if (!confirm('Delete this post?')) return;
    setBusy(true);
    await fetch(`/api/circle/posts/${post.id}`, { method: 'DELETE' });
    onDelete();
  };
  const toggleComments = async () => {
    const nx = !showComments;
    setShowComments(nx);
    if (nx && !comments) {
      try {
        const r = await fetch(`/api/circle/posts/${post.id}/comments`);
        const j = await r.json();
        setComments(j.comments || []);
      } catch { setComments([]); }
    }
  };
  const postComment = async () => {
    if (!currentUser) { window.location.href = '/?auth=1'; return; }
    if (!cText.trim()) return;
    setBusy(true);
    const r = await fetch(`/api/circle/posts/${post.id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: cText }) });
    const j = await r.json();
    if (j.comment) setComments(c => [...(c || []), j.comment]);
    setCText(''); setBusy(false);
  };

  return (
    <div className="e-glass rounded-2xl p-4 md:p-5">
      <div className="flex items-center gap-3">
        <Link href={`/explore/u/${post.authorId}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-90 transition">
          {post.authorAvatar
            ? <Image src={post.authorAvatar} alt={post.authorName} width={36} height={36} className="rounded-full ring-1 ring-white/15" unoptimized />
            : <div className="size-9 rounded-full bg-gradient-to-br from-emerald-300 to-violet-400 grid place-items-center text-[#06080f] font-bold text-sm">{(post.authorName||'?')[0]}</div>}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{post.authorName}</div>
            <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--e-text-dim)' }}>{post.category?.replace('_',' ')} · {new Date(post.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</div>
          </div>
        </Link>
        {isOwner && (
          <div className="flex gap-1">
            <button onClick={onEdit} className="text-white/50 hover:text-white/90 transition p-1" title="Edit"><Edit3 className="size-4" /></button>
            <button onClick={del} disabled={busy} className="text-white/50 hover:text-rose-300 transition p-1" title="Delete"><Trash2 className="size-4" /></button>
          </div>
        )}
      </div>

      {post.title && <div className="font-semibold mt-3 text-base leading-snug">{post.title}</div>}
      {post.content && <p className="mt-2 text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--e-text-muted)' }}>{post.content}</p>}
      {post.image && (
        <div className="mt-3 rounded-xl overflow-hidden border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image} alt="" className="w-full h-auto object-cover" loading="lazy" />
        </div>
      )}
      {post.location && <div className="mt-2 text-[11px]" style={{ color: 'var(--e-text-dim)' }}><MapPin className="inline size-3 mr-0.5" />{post.location}</div>}

      <div className="mt-4 flex items-center gap-3 flex-wrap text-xs">
        <button onClick={like} className="inline-flex items-center gap-1.5 hover:text-rose-300 transition" style={{ color: liked ? 'rgb(251 113 133)' : 'var(--e-text-muted)' }}>
          <Heart className={`size-4 ${liked ? 'fill-current' : ''}`} /> {likesCount}
        </button>
        <button onClick={toggleComments} className="inline-flex items-center gap-1.5 transition hover:opacity-80" style={{ color: 'var(--e-text-muted)' }}>
          <MessageCircle className="size-4" /> {post.commentsCount || 0}
        </button>
        <button onClick={bookmark} className="inline-flex items-center gap-1.5 transition hover:opacity-80" style={{ color: bookmarked ? 'rgb(110 231 183)' : 'var(--e-text-muted)' }}>
          <Bookmark className={`size-4 ${bookmarked ? 'fill-current' : ''}`} /> {bookmarked ? 'Saved' : 'Save'}
        </button>
        <button onClick={share} className="inline-flex items-center gap-1.5 transition hover:opacity-80" style={{ color: 'var(--e-text-muted)' }}>
          <Share2 className="size-4" /> Share
        </button>
        {!isOwner && (
          <button onClick={report} className="inline-flex items-center gap-1.5 transition hover:opacity-80" style={{ color: reported ? 'rgb(251 191 36)' : 'var(--e-text-dim)' }}>
            <Flag className="size-3.5" /> {reported ? 'Reported' : 'Report'}
          </button>
        )}
      </div>

      {showComments && (
        <div className="mt-4 pt-4 border-t border-white/10">
          {comments === null ? (
            <div className="text-center py-3"><Loader2 className="size-4 animate-spin mx-auto text-white/40" /></div>
          ) : (
            <div className="space-y-2 mb-3">
              {comments.length === 0 && <div className="text-xs" style={{ color: 'var(--e-text-dim)' }}>Be the first to comment.</div>}
              {comments.map(c => (
                <div key={c.id} className="flex items-start gap-2 text-xs">
                  {c.userAvatar
                    ? <Image src={c.userAvatar} alt={c.userName} width={24} height={24} className="rounded-full shrink-0" unoptimized />
                    : <div className="size-6 rounded-full bg-white/10 grid place-items-center text-[10px] shrink-0">{(c.userName||'?')[0]}</div>}
                  <div className="flex-1 min-w-0 rounded-lg bg-white/[0.04] px-3 py-1.5">
                    <span className="font-semibold">{c.userName}</span> <span style={{ color: 'var(--e-text-muted)' }}>{c.text}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {currentUser ? (
            <div className="flex gap-2">
              <input value={cText} onChange={e => setCText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') postComment(); }} placeholder="Write a comment…" className="flex-1 text-xs rounded-full bg-white/[0.04] border border-white/10 px-3 py-2 outline-none" />
              <button onClick={postComment} disabled={busy || !cText.trim()} className="e-btn-primary rounded-full px-3 py-2 text-xs inline-flex items-center gap-1"><Send className="size-3" /></button>
            </div>
          ) : (
            <Link href="/?auth=1" className="text-xs e-grad-text font-semibold">Sign in to comment →</Link>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------- ComposeModal -------------------- */
function ComposeModal({ initial, onClose, onCreated, onUpdated }) {
  const [category, setCategory] = useState(initial?.category || 'discussions');
  const [title, setTitle] = useState(initial?.title || '');
  const [content, setContent] = useState(initial?.content || '');
  const [image, setImage] = useState(initial?.image || '');
  const [location, setLocation] = useState(initial?.location || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setErr('');
    if (!content.trim() && !title.trim()) { setErr('Add a title or some content.'); return; }
    setBusy(true);
    try {
      const body = { category, title: title.trim(), content: content.trim(), image: image.trim(), location: location.trim() };
      let r, j;
      if (initial?.id) {
        r = await fetch(`/api/circle/posts/${initial.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Update failed');
        onUpdated(j.post);
      } else {
        r = await fetch('/api/circle/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Post failed');
        onCreated(j.post);
      }
    } catch (e) { setErr(e.message || 'Save failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm grid place-items-center p-4">
      <div className="e-glass rounded-3xl w-full max-w-lg p-6 relative border border-white/15" style={{ background: 'var(--e-panel, rgba(15,20,32,0.85))' }}>
        <button onClick={onClose} className="absolute top-3 right-3 text-white/60 hover:text-white transition"><X className="size-5" /></button>
        <div className="e-chip"><Plus className="size-3 text-emerald-300" /> {initial ? 'Edit post' : 'New post'}</div>
        <div className="mt-4 space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/55 mb-1.5">Category</div>
            <div className="flex flex-wrap gap-1.5">
              {CATS.filter(c => c.id !== 'all' && c.id !== 'travelers').map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setCategory(id)} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] transition border ${category===id ? 'e-btn-primary border-transparent' : 'bg-white/[0.04] border-white/10 text-white/70'}`}>
                  <Icon className="size-3" /> {label}
                </button>
              ))}
            </div>
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={160} placeholder="Title (optional)" className="w-full rounded-xl bg-white/[0.04] border border-white/15 px-3 py-2 text-sm outline-none" />
          <textarea value={content} onChange={e => setContent(e.target.value)} maxLength={4000} rows={4} placeholder="Share your thoughts, tips, questions…" className="w-full rounded-xl bg-white/[0.04] border border-white/15 px-3 py-2 text-sm outline-none" />
          <input value={image} onChange={e => setImage(e.target.value)} placeholder="Image URL (optional)" className="w-full rounded-xl bg-white/[0.04] border border-white/15 px-3 py-2 text-sm outline-none" />
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location (optional)" className="w-full rounded-xl bg-white/[0.04] border border-white/15 px-3 py-2 text-sm outline-none" />
          {err && <div className="text-xs text-rose-300">{err}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="e-btn-ghost rounded-full px-4 py-2 text-sm">Cancel</button>
            <button onClick={save} disabled={busy} className="e-btn-primary rounded-full px-5 py-2 text-sm inline-flex items-center gap-1.5">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} {initial ? 'Update' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
