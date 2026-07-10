'use client';
import { useState } from 'react';
import { X, Copy, Check, Send, MessageCircle, Facebook, Instagram, Twitter } from 'lucide-react';
import { shareLinks } from '@/lib/circle-api';

export default function ShareSheet({ open, onClose, url, title, description }) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;
  const links = shareLinks({ url, title, description });

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true); setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const items = [
    { label: 'WhatsApp', href: links.whatsapp, icon: MessageCircle, tone: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    { label: 'Telegram', href: links.telegram, icon: Send, tone: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
    { label: 'Facebook', href: links.facebook, icon: Facebook, tone: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    { label: 'X (Twitter)', href: links.x, icon: Twitter, tone: 'bg-white/10 text-white border-white/20' },
    { label: 'Instagram', href: links.instagram, icon: Instagram, tone: 'bg-pink-500/20 text-pink-300 border-pink-500/30', note: 'Copy link then paste into your story.' },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center p-4 md:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <div className="relative w-full max-w-lg circle-glass-dark circle-card border p-6 md:p-8 circle-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="circle-chip">Share</div>
            <h3 className="display text-2xl font-bold mt-3">Invite the world in</h3>
            <p className="text-white/60 text-sm mt-1">Anyone with the link can view (public journeys).</p>
          </div>
          <button onClick={onClose} className="size-9 rounded-full circle-glass grid place-items-center"><X className="size-4" /></button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
          {items.map(it => {
            const Icon = it.icon;
            return (
              <a key={it.label} href={it.href} target="_blank" rel="noreferrer"
                className={`px-3 py-3 rounded-2xl border ${it.tone} text-sm font-medium flex flex-col items-center gap-2 hover:scale-[1.02] transition-transform`}
                title={it.note}>
                <Icon className="size-5" />
                {it.label}
              </a>
            );
          })}
        </div>

        <div className="mt-6 circle-glass rounded-2xl p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="circle-label mb-1">Deep link</div>
            <div className="text-xs md:text-sm text-white/85 truncate">{url}</div>
          </div>
          <button onClick={doCopy} className="circle-btn-primary rounded-xl px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5">
            {copied ? <><Check className="size-4" /> Copied</> : <><Copy className="size-4" /> Copy</>}
          </button>
        </div>

        <div className="mt-6 circle-glass rounded-2xl p-5 flex flex-col md:flex-row items-center gap-5">
          <div className="size-32 rounded-2xl bg-white p-2 grid place-items-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={links.qr} alt="QR code" className="size-full" />
          </div>
          <div className="text-sm text-white/70 text-center md:text-left">
            <div className="circle-label mb-1">QR Code</div>
            Show this in your reel, poster or storefront. Scanning opens the journey instantly.
          </div>
        </div>
      </div>
    </div>
  );
}
