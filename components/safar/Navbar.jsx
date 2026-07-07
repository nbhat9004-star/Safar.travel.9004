'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Menu, User, UserPlus, Sparkles, MapPin, Compass, Bell, MessageCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AuthButtons, MobileAuthButtons } from '@/components/safar/AuthButtons';
import AuthModal from '@/components/safar/AuthModal';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function Navbar({ transparent = false }) {
  const { user } = useAuth();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [authMode, setAuthMode] = useState(null); // 'login' | 'signup' | null
  const [safarTogetherEnabled, setSafarTogetherEnabled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    
    // Close notifications on outside click
    const handleClick = (e) => {
      if (showNotifications && !e.target.closest('.notification-dropdown')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('click', handleClick);
    
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', handleClick);
    };
  }, [showNotifications]);
  
  useEffect(() => {
    fetch('/api/settings/safar-together').then(r => r.json()).then(d => setSafarTogetherEnabled(d.enabled));
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [user]);
  
  const loadNotifications = async () => {
    if (!user) return;
    const res = await fetch('/api/notifications');
    const data = await res.json();
    if (data.ok) {
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    }
  };
  
  const markAsRead = async (notificationId) => {
    await fetch(`/api/notifications/${notificationId}/read`, { method: 'PATCH' });
    loadNotifications();
  };
  
  const markAllAsRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    loadNotifications();
  };
  
  const solid = !transparent || scrolled;

  // Filter navigation based on user role
  const getVisibleNavItems = () => {
    // Admin/Super Admin users: Show ONLY admin navigation
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      return [
        { href: '/admin/marketplace/dashboard', label: 'Dashboard' }
      ];
    }

    // Customer navigation (for travelers, hosts, and guests)
    const baseNav = [
      { href: '/explore?cat=all',         label: 'Stays' },
      { href: '/explore?cat=experience',  label: 'Experiences' },
      { href: '/explore?cat=transport',   label: 'Bikes & Cars' },
      { href: '/explore?cat=tour',        label: 'Tour Guides' },
      { href: '/explore?nearme=true',     label: 'Near Me' },
      { href: '/ai-planner',              label: 'AI Planner' },
    ];

    // Add Safar Together if enabled and user is logged in
    if (safarTogetherEnabled && user) {
      baseNav.splice(5, 0, { href: '/safar-together', label: '🤝 Safar Together' });
    }

    // Add role-specific items
    if (user?.role === 'traveler') {
      baseNav.push({ href: '/dashboard/traveler/bookings', label: 'My Bookings' });
    }

    // Only show "Become a Host" if user is NOT logged in
    if (!user) {
      baseNav.push({ href: '/add-listing', label: 'Become a Host' });
    }

    return baseNav;
  };

  const visibleNav = getVisibleNavItems();
  return (
    <header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${solid ? 'glass-nav border-b border-border/60 shadow-[0_4px_30px_-12px_rgba(15,20,25,0.18)]' : 'bg-transparent'}`}
    >
      <div className="container flex h-16 lg:h-20 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="size-10 rounded-2xl bg-gradient-emerald grid place-items-center shadow-lg shadow-emerald2/25 ring-1 ring-white/20">
            <MapPin className="size-5 text-gold" strokeWidth={2.4} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className={`font-display font-bold text-xl tracking-tight ${solid ? 'text-charcoal' : 'text-white'}`}>Safar</span>
            <span className={`text-[10px] uppercase tracking-[0.22em] -mt-0.5 ${solid ? 'text-muted-foreground' : 'text-white/70'}`}>Kashmir · Curated</span>
          </div>
        </Link>

        <nav className="hidden xl:flex items-center gap-0.5">
          {visibleNav.map((n) => (
            <Link key={n.href} href={n.href}
              className={`px-3.5 py-2 rounded-full text-[13.5px] font-medium tracking-tight transition-colors ${solid ? 'text-charcoal/80 hover:text-charcoal hover:bg-secondary' : 'text-white/85 hover:text-white hover:bg-white/10'}`}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          {user && (
            <div className="relative">
              <Button
                onClick={() => setShowNotifications(!showNotifications)}
                variant="ghost"
                size="icon"
                className="relative rounded-full"
              >
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-5 rounded-full bg-rose-600 text-white text-[10px] grid place-items-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute top-full right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl border shadow-lg z-50 max-h-[500px] overflow-hidden flex flex-col notification-dropdown">
                  <div className="flex items-center justify-between p-4 border-b">
                    <div className="font-semibold">Notifications</div>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-xs text-emerald2 hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-sm">
                        <Bell className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                        No notifications
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markAsRead(notif.id);
                            if (notif.link) router.push(notif.link);
                            setShowNotifications(false);
                          }}
                          className={`p-4 border-b hover:bg-secondary cursor-pointer ${!notif.read ? 'bg-emerald2/5' : ''}`}
                        >
                          <div className="flex gap-3">
                            <div className="size-10 rounded-full bg-gradient-emerald grid place-items-center text-white flex-shrink-0">
                              {notif.type === 'chat_message' ? <MessageCircle className="size-5" /> : <Bell className="size-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm">{notif.title}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{notif.description}</div>
                              <div className="text-[10px] text-muted-foreground mt-1">
                                {new Date(notif.createdAt).toLocaleString()}
                              </div>
                            </div>
                            {!notif.read && (
                              <div className="size-2 rounded-full bg-emerald2 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <AuthButtons solid={solid} />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                whileTap={{ scale: 1.05 }}
                transition={{ duration: 0.15 }}
                className="xl:hidden relative rounded-full p-2.5 bg-white/18 backdrop-blur-md border border-white/20 shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:bg-white/25 transition-colors duration-200"
              >
                <div
                  animate={{ 
                    rotate: open ? 180 : [0, 360, 360],
                  }}
                  transition={
                    open 
                      ? { duration: 0.3, ease: "easeInOut" }
                      : {
                          duration: 12,
                          times: [0, 0.95, 1],
                          repeat: Infinity,
                          ease: "linear",
                        }
                  }
                  className="relative"
                >
                  <Compass className="size-5 text-gold" style={{ strokeWidth: 2.4 }} />
                </div>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[90vw] sm:w-[420px] p-0 bg-background flex flex-col h-full">
              {/* Fixed Header */}
              <div className="p-6 border-b flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-2xl bg-gradient-emerald grid place-items-center shadow-md"><MapPin className="size-5 text-gold" /></div>
                  <div>
                    <div className="font-display font-bold text-lg">Safar</div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Kashmir · Curated</div>
                  </div>
                </div>
              </div>
              
              {/* Scrollable Navigation Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-3 pb-6">
                  {/* EXPLORE Section */}
                  <div className="mb-4">
                    <div className="px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Explore</div>
                    <Link href="/explore?cat=all" onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-secondary text-[15px] font-medium transition">
                      Stays
                    </Link>
                    <Link href="/explore?cat=experience" onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-secondary text-[15px] font-medium transition">
                      Experiences
                    </Link>
                    <Link href="/explore?cat=transport" onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-secondary text-[15px] font-medium transition">
                      Bikes & Cars
                    </Link>
                    <Link href="/explore?cat=tour" onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-secondary text-[15px] font-medium transition">
                      Tour Guides
                    </Link>
                    <Link href="/explore?nearme=true" onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-secondary text-[15px] font-medium transition">
                      Near Me
                    </Link>
                  </div>

                  <div className="h-px bg-border mb-4" />

                  {/* TRAVEL Section */}
                  <div className="mb-4">
                    <div className="px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Travel</div>
                    {safarTogetherEnabled && user && (
                      <Link href="/safar-together" onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-secondary text-[15px] font-medium transition">
                        🤝 Safar Together
                      </Link>
                    )}
                    <Link href="/ai-planner" onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-secondary text-[15px] font-medium transition">
                      AI Planner
                    </Link>
                    {(user?.role === 'traveler' || user?.role === 'admin' || user?.role === 'super_admin') && (
                      <Link href="/dashboard/traveler/bookings" onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-secondary text-[15px] font-medium transition">
                        My Bookings
                      </Link>
                    )}
                    {user && safarTogetherEnabled && (
                      <Link href="/safar-together/chats" onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-secondary text-[15px] font-medium transition">
                        <span className="flex items-center gap-2"><MessageCircle className="size-4" /> My Chats</span>
                      </Link>
                    )}
                  </div>

                  {/* HOST Section - Only show if not logged in or if user is host/admin */}
                  {(!user || user?.role === 'host' || user?.role === 'admin' || user?.role === 'super_admin') && (
                    <>
                      <div className="h-px bg-border mb-4" />
                      <div className="mb-4">
                        <div className="px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Host</div>
                        {!user && (
                          <Link href="/add-listing" onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-secondary text-[15px] font-medium transition">
                            Become a Host
                          </Link>
                        )}
                        {(user?.role === 'host' || user?.role === 'admin' || user?.role === 'super_admin') && (
                          <Link href="/dashboard/host" onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-secondary text-[15px] font-medium transition">
                            Host Dashboard
                          </Link>
                        )}
                      </div>
                    </>
                  )}

                  {/* ADMINISTRATION Section - Only for admins */}
                  {(user?.role === 'admin' || user?.role === 'super_admin') && (
                    <>
                      <div className="h-px bg-border mb-4" />
                      <div className="mb-4">
                        <div className="px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Administration</div>
                        <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-secondary text-[15px] font-medium transition">
                          <span className="flex items-center gap-2"><Shield className="size-4" /> Admin Dashboard</span>
                        </Link>
                      </div>
                    </>
                  )}

                  {/* Extra padding at bottom to ensure last item is always visible */}
                  <div className="h-20" />
                </div>
              </div>
              
              {/* Fixed Account Section at Bottom */}
              <div className="border-t flex-shrink-0 bg-background">
                <div className="p-4 pb-safe">
                  {user && (
                    <div className="mb-3">
                      <div className="px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Account</div>
                    </div>
                  )}
                  <MobileAuthButtons onClose={()=>setOpen(false)} onOpenAuth={(m)=>setAuthMode(m)} />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      {/* Root-level AuthModal so Radix Sheet's pointer-events lock doesn't pass clicks through to nav Links underneath. */}
      <AuthModal open={!!authMode} defaultMode={authMode || 'login'} onClose={()=>setAuthMode(null)} />
    </header>
  );
}
