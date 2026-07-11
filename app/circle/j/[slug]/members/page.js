'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import CircleNav from '@/components/circle/CircleNav';
import { circleApi } from '@/lib/circle-api';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import {
  Users, Crown, Star, ShieldCheck, ArrowLeft, Check, X, LogOut, Loader2,
  UserPlus, UserMinus, ChevronUp, ChevronDown, Settings, DoorClosed, DoorOpen,
  Globe, Lock, MailPlus, Send, Sparkles
} from 'lucide-react';

const VIS_OPTIONS = [
  { key: 'public', label: 'Public', icon: Globe, hint: 'Anyone can discover & request to join' },
  { key: 'private', label: 'Private', icon: Lock, hint: 'Hidden from discovery' },
  { key: 'invite', label: 'Invite only', icon: MailPlus, hint: 'Only invited travelers can view' },
];

export default function MembersPage() {
  const params = useParams();
  const slug = params?.slug;
  const router = useRouter();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyMemberId, setBusyMemberId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const j = await circleApi.getBySlug(slug);
      const jid = j.journey.id;
      const m = await circleApi.getMembers(jid);
      setData({ journey: j.journey, ...m });
    } catch (e) {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { if (slug) load(); }, [slug, load]);

  const act = async (memberId, action, confirmMsg) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusyMemberId(memberId + ':' + action);
    try {
      await circleApi.memberAction(data.journey.id, memberId, action);
      toast.success('Done');
      await load();
    } catch (e) {
      toast.error(e.message || 'Action failed');
    } finally {
      setBusyMemberId(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen text-white pt-24">
        <CircleNav />
        <div className="max-w-5xl mx-auto px-5 mt-8 space-y-4">
          <div className="h-16 rounded-3xl circle-glass animate-pulse" />
          <div className="grid md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 rounded-2xl circle-glass animate-pulse" />)}
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen text-white pt-24">
        <CircleNav />
        <div className="max-w-lg mx-auto px-5 pt-20 text-center circle-glass circle-card p-10">
          <div className="text-5xl">🧭</div>
          <div className="display text-2xl font-bold mt-3">Journey not found</div>
          <Link href="/circle/discover" className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full circle-btn-primary text-sm font-semibold">
            Discover journeys
          </Link>
        </div>
      </main>
    );
  }

  const { journey, owner, coCurators, travelers, pending, capacity, acceptedCount, acceptedSeats, seatsRemaining, canManage, myMembership, isOwner } = data;

  return (
    <main className="min-h-screen text-white pt-20 pb-24">
      <CircleNav />

      {/* Header */}
      <section className="max-w-5xl mx-auto px-5 mt-6">
        <Link href={`/circle/j/${journey.slug}`} className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm">
          <ArrowLeft className="size-4" /> Back to journey
        </Link>
        <div className="mt-4 circle-glass circle-card p-5 md:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="circle-chip">Journey members</div>
            <h1 className="display text-2xl md:text-3xl font-bold mt-2">{journey.name}</h1>
            <div className="text-white/70 text-sm mt-2 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5"><Users className="size-4" /> {acceptedCount} member{acceptedCount !== 1 ? 's' : ''}</span>
              <span className="text-white/40">·</span>
              <span>{acceptedSeats}/{capacity} seat{capacity !== 1 ? 's' : ''} filled</span>
              <span className="text-white/40">·</span>
              <span className={seatsRemaining === 0 ? 'text-amber-300' : 'text-emerald-300'}>
                {seatsRemaining} remaining
              </span>
              {journey.registrationsClosed && (
                <span className="inline-flex items-center gap-1 text-red-300"><DoorClosed className="size-3.5" /> Registrations closed</span>
              )}
              <span className="inline-flex items-center gap-1 capitalize">
                {journey.visibility === 'public' ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />} {journey.visibility}
              </span>
            </div>
          </div>
          {canManage && (
            <button onClick={() => setSettingsOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full circle-btn-primary text-sm font-semibold">
              <Settings className="size-4" /> Journey settings
            </button>
          )}
        </div>
      </section>

      {/* Capacity bar */}
      <section className="max-w-5xl mx-auto px-5 mt-4">
        <div className="circle-glass circle-card p-4">
          <div className="flex items-center justify-between text-xs text-white/60 mb-2">
            <span>Capacity</span>
            <span>{acceptedSeats} / {capacity}</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-violet-400 to-pink-400"
              style={{ width: `${Math.min(100, (acceptedSeats / Math.max(1, capacity)) * 100)}%` }}
            />
          </div>
        </div>
      </section>

      {/* Pending requests */}
      {canManage && (
        <section className="max-w-5xl mx-auto px-5 mt-6">
          <SectionTitle icon={Send} label="Pending requests" count={pending?.length || 0} />
          {(!pending || pending.length === 0) ? (
            <div className="circle-glass circle-card p-6 text-white/60 text-sm">No pending requests yet.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {pending.map(m => (
                <PendingCard
                  key={m.id}
                  member={m}
                  busy={busyMemberId}
                  onAccept={() => act(m.id, 'accept')}
                  onDecline={() => act(m.id, 'decline')}
                  onRemove={() => act(m.id, 'remove', 'Remove this request?')}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Owner + Co-curators */}
      <section className="max-w-5xl mx-auto px-5 mt-8">
        <SectionTitle icon={Crown} label="Curators" count={1 + (coCurators?.length || 0)} />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MemberCard
            name={owner.name}
            avatar={owner.avatar}
            roleLabel="Journey Curator"
            roleColor="from-amber-400 to-pink-400"
            icon={Crown}
            isOwner
          />
          {(coCurators || []).map(m => (
            <MemberCard
              key={m.id}
              name={m.userName}
              avatar={m.userAvatar}
              reputation={m.userReputation}
              roleLabel="Co-Curator"
              roleColor="from-violet-400 to-fuchsia-400"
              icon={Star}
              actions={canManage ? (
                <>
                  <ActionBtn onClick={() => act(m.id, 'demote', 'Demote to Traveler?')} busy={busyMemberId === m.id + ':demote'} icon={ChevronDown} label="Demote" />
                  <ActionBtn onClick={() => act(m.id, 'remove', 'Remove this member?')} busy={busyMemberId === m.id + ':remove'} icon={UserMinus} label="Remove" danger />
                </>
              ) : null}
            />
          ))}
        </div>
      </section>

      {/* Travelers */}
      <section className="max-w-5xl mx-auto px-5 mt-8">
        <SectionTitle icon={Users} label="Travelers" count={travelers?.length || 0} />
        {(!travelers || travelers.length === 0) ? (
          <div className="circle-glass circle-card p-6 text-white/60 text-sm">No travelers accepted yet.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {travelers.map(m => (
              <MemberCard
                key={m.id}
                name={m.userName}
                avatar={m.userAvatar}
                reputation={m.userReputation}
                seats={m.seats}
                roleLabel="Traveler"
                roleColor="from-emerald-400 to-teal-400"
                icon={ShieldCheck}
                actions={canManage ? (
                  <>
                    <ActionBtn onClick={() => act(m.id, 'promote')} busy={busyMemberId === m.id + ':promote'} icon={ChevronUp} label="Promote" />
                    <ActionBtn onClick={() => act(m.id, 'remove', 'Remove this member?')} busy={busyMemberId === m.id + ':remove'} icon={UserMinus} label="Remove" danger />
                  </>
                ) : (!isOwner && myMembership?.status === 'accepted' && myMembership.userId === m.userId ? null : null)}
              />
            ))}
          </div>
        )}
      </section>

      {/* My status footer */}
      {!isOwner && user && (
        <section className="max-w-5xl mx-auto px-5 mt-10">
          <div className="circle-glass circle-card p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="circle-label mb-1">Your status</div>
              <div className="font-semibold">
                {myMembership?.status === 'accepted' && `You are a ${myMembership.role === 'co_curator' ? 'Co-Curator' : 'Traveler'} on this journey`}
                {myMembership?.status === 'pending' && 'Your request is pending curator approval'}
                {!myMembership && 'You are not a member of this journey'}
              </div>
            </div>
            {myMembership?.status === 'accepted' && myMembership.role !== 'co_curator' && (
              <button
                onClick={async () => {
                  if (!confirm('Leave this journey?')) return;
                  try { await circleApi.leaveJourney(data.journey.id); toast.success('You left the journey'); await load(); }
                  catch (e) { toast.error(e.message || 'Failed'); }
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-200 text-sm font-semibold"
              >
                <LogOut className="size-4" /> Leave journey
              </button>
            )}
            {myMembership?.status === 'pending' && (
              <button
                onClick={async () => {
                  try { await circleApi.cancelRequest(data.journey.id); toast.success('Request cancelled'); await load(); }
                  catch (e) { toast.error(e.message || 'Failed'); }
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full circle-btn-ghost text-sm font-semibold"
              >
                <X className="size-4" /> Cancel request
              </button>
            )}
          </div>
        </section>
      )}

      {settingsOpen && canManage && (
        <SettingsModal
          journey={journey}
          minMembers={acceptedSeats}
          onClose={() => setSettingsOpen(false)}
          onSaved={async () => { setSettingsOpen(false); await load(); }}
        />
      )}
    </main>
  );
}

// ————————————— Sub-components —————————————
function SectionTitle({ icon: Icon, label, count }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="size-4 text-white/70" />
      <h2 className="display text-lg font-bold">{label}</h2>
      <span className="text-xs text-white/50">({count})</span>
    </div>
  );
}

function MemberCard({ name, avatar, reputation, seats, roleLabel, roleColor, icon: Icon, actions, isOwner }) {
  return (
    <div className="circle-glass circle-card p-5">
      <div className="flex items-center gap-3">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={name} className="size-12 rounded-full object-cover" />
        ) : (
          <div className="size-12 rounded-full bg-white/10 grid place-items-center text-lg font-semibold">{(name || '?').charAt(0).toUpperCase()}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{name || 'Traveler'}</div>
          <div className={`text-[11px] uppercase tracking-wider inline-flex items-center gap-1 mt-0.5 bg-gradient-to-r ${roleColor} bg-clip-text text-transparent font-semibold`}>
            <Icon className="size-3 text-white/60" /> {roleLabel}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-white/60">
        {reputation != null && <span>⭐ {reputation} rep</span>}
        {seats != null && <span>{seats} seat{seats !== 1 ? 's' : ''}</span>}
        {isOwner && <span>Founder</span>}
      </div>
      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

function PendingCard({ member, busy, onAccept, onDecline, onRemove }) {
  return (
    <div className="circle-glass circle-card p-5">
      <div className="flex items-start gap-3">
        {member.userAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.userAvatar} alt={member.userName} className="size-12 rounded-full object-cover" />
        ) : (
          <div className="size-12 rounded-full bg-white/10 grid place-items-center text-lg font-semibold">{(member.userName || '?').charAt(0).toUpperCase()}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{member.userName}</div>
          <div className="text-xs text-white/60 mt-0.5">
            ⭐ {member.userReputation || 0} rep · {member.seats} seat{member.seats !== 1 ? 's' : ''}
          </div>
          {member.message && (
            <div className="mt-2 rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/80">
              "{member.message}"
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button onClick={onAccept} disabled={!!busy} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full circle-btn-primary text-xs font-semibold disabled:opacity-50">
          {busy === member.id + ':accept' ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3.5" />}
          Accept
        </button>
        <button onClick={onDecline} disabled={!!busy} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full circle-btn-ghost text-xs font-semibold disabled:opacity-50">
          {busy === member.id + ':decline' ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3.5" />}
          Decline
        </button>
        <button onClick={onRemove} disabled={!!busy} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-200 text-xs font-semibold disabled:opacity-50">
          <UserMinus className="size-3.5" /> Remove
        </button>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, busy, icon: Icon, label, danger }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold disabled:opacity-50 ' +
        (danger ? 'bg-red-500/10 border border-red-500/20 text-red-200' : 'circle-btn-ghost')
      }
    >
      {busy ? <Loader2 className="size-3 animate-spin" /> : <Icon className="size-3.5" />}
      {label}
    </button>
  );
}

function SettingsModal({ journey, minMembers, onClose, onSaved }) {
  const [maxMembers, setMaxMembers] = useState(journey.maxMembers || 6);
  const [visibility, setVisibility] = useState(journey.visibility || 'public');
  const [regClosed, setRegClosed] = useState(!!journey.registrationsClosed);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await circleApi.updateSettings(journey.id, {
        maxMembers: Number(maxMembers),
        visibility,
        registrationsClosed: regClosed,
      });
      toast.success('Settings updated');
      onSaved && onSaved();
    } catch (e) {
      toast.error(e.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-lg circle-glass-strong rounded-t-3xl sm:rounded-3xl p-6 text-white border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <div className="circle-chip">Settings</div>
            <h3 className="display text-xl font-bold mt-2">Journey settings</h3>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1"><X className="size-5" /></button>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <div className="circle-label mb-1">Maximum travelers</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setMaxMembers(Math.max(minMembers, Number(maxMembers) - 1))} className="size-9 rounded-full bg-white/10 hover:bg-white/15 grid place-items-center">−</button>
              <input
                type="number"
                min={minMembers}
                max={50}
                value={maxMembers}
                onChange={(e) => setMaxMembers(Math.max(minMembers, Math.min(50, Number(e.target.value) || minMembers)))}
                className="w-20 text-center rounded-2xl bg-white/5 border border-white/10 px-2 py-1.5 font-semibold display outline-none focus:border-white/25"
              />
              <button onClick={() => setMaxMembers(Math.min(50, Number(maxMembers) + 1))} className="size-9 rounded-full bg-white/10 hover:bg-white/15 grid place-items-center">+</button>
              <div className="text-xs text-white/50 ml-2">min {minMembers} · max 50</div>
            </div>
          </div>

          <div>
            <div className="circle-label mb-2">Visibility</div>
            <div className="grid gap-2">
              {VIS_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const active = visibility === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setVisibility(opt.key)}
                    className={`text-left rounded-2xl border px-4 py-3 transition ${active ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <Icon className="size-4" /> {opt.label}
                      {active && <Check className="size-4 text-emerald-300 ml-auto" />}
                    </div>
                    <div className="text-xs text-white/60 mt-0.5">{opt.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm inline-flex items-center gap-2">
                {regClosed ? <DoorClosed className="size-4" /> : <DoorOpen className="size-4" />}
                Close registrations
              </div>
              <div className="text-xs text-white/60 mt-0.5">Stops new join requests. Existing members are unaffected.</div>
            </div>
            <button
              onClick={() => setRegClosed(v => !v)}
              className={`relative w-12 h-7 rounded-full transition ${regClosed ? 'bg-red-500/60' : 'bg-white/15'}`}
            >
              <span className={`absolute top-0.5 ${regClosed ? 'left-5' : 'left-0.5'} size-6 rounded-full bg-white transition-all`} />
            </button>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-full circle-btn-ghost text-sm font-semibold">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 rounded-full circle-btn-primary text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}
