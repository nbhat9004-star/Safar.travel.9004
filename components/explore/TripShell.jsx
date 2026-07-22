'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Compass, MapPin, Bell, Plus, Inbox, User, Bookmark, MessageCircle, Settings, Gift, ChevronDown } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'explore', label: 'Explore', icon: Compass, href: '/explore' },
  { id: 'my-trips', label: 'My Trips', icon: MapPin, href: '/explore/my-trips' },
  { id: 'requests', label: 'Requests', icon: Inbox, href: '/explore/requests', badge: 3 },
  { id: 'saved', label: 'Saved Trips', icon: Bookmark, href: '/explore/my-trips?tab=saved' },
  { id: 'chats', label: 'Chats', icon: MessageCircle, href: '/explore/requests?tab=chats' },
  { id: 'notifications', label: 'Notifications', icon: Bell, href: '/explore/requests?tab=notifications' },
  { id: 'profile', label: 'Profile', icon: User, href: '/explore/me' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/explore/me?tab=settings' },
];

const MOBILE_NAV = [
  { id: 'explore', label: 'Explore', icon: Compass, href: '/explore' },
  { id: 'my-trips', label: 'My Trips', icon: MapPin, href: '/explore/my-trips' },
  { id: 'requests', label: 'Requests', icon: Inbox, href: '/explore/requests', badge: 3 },
  { id: 'profile', label: 'Profile', icon: User, href: '/explore/me' },
];

export default function TripShell({ children, right = null }) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href) => {
    const clean = href.split('?')[0];
    if (clean === '/explore') return pathname === '/explore';
    return pathname.startsWith(clean);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b px-4 h-14 flex items-center justify-between">
        <Link href="/explore" className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center text-white"><Compass className="size-4" /></div>
          <div className="leading-tight">
            <div className="font-display font-bold text-[15px]">Safar</div>
            <div className="text-[10px] text-slate-500 -mt-0.5">Curated</div>
          </div>
        </Link>
        <button onClick={() => router.push('/explore/requests?tab=notifications')} className="size-9 grid place-items-center rounded-full hover:bg-slate-100 relative">
          <Bell className="size-5 text-slate-700" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-violet-600" />
        </button>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white border-r flex-col justify-between py-6 px-4 z-20">
          <div>
            <Link href="/explore" className="flex items-center gap-2.5 px-2 mb-8">
              <div className="size-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center text-white shadow-lg shadow-violet-200"><Compass className="size-5" /></div>
              <div className="leading-tight">
                <div className="font-display font-bold text-[17px]">Safar</div>
                <div className="text-[11px] text-slate-500 -mt-0.5">Curated</div>
              </div>
            </Link>
            <nav className="space-y-1">
              {NAV_ITEMS.map((it) => {
                const active = isActive(it.href);
                const Icon = it.icon;
                return (
                  <Link key={it.id} href={it.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${active ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Icon className={`size-4.5 ${active ? 'text-violet-600' : 'text-slate-500'}`} />
                    <span className="flex-1">{it.label}</span>
                    {it.badge && <span className="text-[10px] font-bold size-5 grid place-items-center rounded-full bg-violet-100 text-violet-700">{it.badge}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="space-y-3">
            <Link href="/explore/create" className="flex items-center justify-center gap-2 w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2.5 shadow-lg shadow-violet-200 transition">
              <Plus className="size-4" /> Create a Trip
            </Link>
            <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 p-3 relative overflow-hidden">
              <Gift className="absolute -right-1 -bottom-1 size-14 text-fuchsia-200" />
              <div className="font-semibold text-[13px] text-slate-800">Share Safar</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Invite friends and get rewards</div>
              <button className="mt-2 text-[11px] font-semibold text-violet-700 hover:underline">Invite Now</button>
            </div>
          </div>
        </aside>

        {/* Main content column */}
        <div className="flex-1 lg:ml-64 lg:mr-0 xl:mr-80">
          <div className="pb-24 lg:pb-8">{children}</div>
        </div>

        {/* Right rail (desktop) */}
        {right && (
          <aside className="hidden xl:block fixed inset-y-0 right-0 w-80 bg-white border-l overflow-y-auto z-10">
            <div className="p-5">{right}</div>
          </aside>
        )}
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-5 items-end">
          {MOBILE_NAV.slice(0, 2).map((it) => {
            const active = isActive(it.href);
            const Icon = it.icon;
            return (
              <Link key={it.id} href={it.href} className={`flex flex-col items-center gap-0.5 py-1 ${active ? 'text-violet-600' : 'text-slate-500'}`}>
                <Icon className="size-5" />
                <span className="text-[10px] font-medium">{it.label}</span>
              </Link>
            );
          })}
          <Link href="/explore/create" className="flex flex-col items-center -mt-6">
            <div className="size-12 rounded-full bg-violet-600 grid place-items-center text-white shadow-lg shadow-violet-300"><Plus className="size-6" /></div>
          </Link>
          {MOBILE_NAV.slice(2).map((it) => {
            const active = isActive(it.href);
            const Icon = it.icon;
            return (
              <Link key={it.id} href={it.href} className={`flex flex-col items-center gap-0.5 py-1 relative ${active ? 'text-violet-600' : 'text-slate-500'}`}>
                <div className="relative">
                  <Icon className="size-5" />
                  {it.badge && <span className="absolute -top-1 -right-2 text-[9px] font-bold px-1 min-w-[16px] h-4 grid place-items-center rounded-full bg-violet-600 text-white">{it.badge}</span>}
                </div>
                <span className="text-[10px] font-medium">{it.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
