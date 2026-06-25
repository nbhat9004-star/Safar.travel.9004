'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users, Home, Calendar, Wallet, ShieldAlert, BarChart3, ArrowUpRight, Search, Check, X, Loader2, AlertTriangle, Upload, FileSpreadsheet, Ban, RotateCcw, Shield, Trash2, UserCog, Star, Eye, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ProtectedRoute from '@/components/safar/ProtectedRoute';
import { listingsApi, apiJson, bookingsApi } from '@/lib/listings-api';

function LineChart({ data }) {
  const max = Math.max(...data); const min = Math.min(...data);
  const points = data.map((v,i)=>`${(i/(data.length-1))*100},${100-((v-min)/(max-min))*88-6}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-32">
      <defs><linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity="0.4" /><stop offset="100%" stopColor="#10B981" stopOpacity="0" /></linearGradient></defs>
      <polyline fill="none" stroke="#0F3D2E" strokeWidth="1.6" points={points} />
      <polygon fill="url(#gd)" points={`0,100 ${points} 100,100`} />
    </svg>
  );
}

const StatusPill = ({ s }) => {
  const map = {
    approved: 'bg-emerald-50 text-emerald2 border-emerald-200',
    pending:  'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-rose-50 text-rose-600 border-rose-200',
    suspended: 'bg-slate-50 text-slate-600 border-slate-200',
    active: 'bg-emerald-50 text-emerald2 border-emerald-200',
    blacklisted: 'bg-rose-50 text-rose-600 border-rose-200',
    cancelled: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${map[s]||'bg-secondary'}`}>{s}</span>;
};

function AdminInner() {
  const [pending, setPending] = useState([]);
  const [all, setAll] = useState([]);
  const [users, setUsers] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userModal, setUserModal] = useState(null);
  const [roleModal, setRoleModal] = useState(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [listingStatusFilter, setListingStatusFilter] = useState('all');
  const [listingCategoryFilter, setListingCategoryFilter] = useState('all');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  
  const revenueChart = [22,28,34,30,42,55,49,62,68,71,84,96];

  const load = async () => {
    setLoading(true); setError(null);
    const [p, a, u, bk, rev, trans] = await Promise.all([
      listingsApi.list({ status: 'pending', limit: 50 }),
      listingsApi.list({ status: 'all', limit: 200 }),
      apiJson('/api/users'),
      bookingsApi.list('all'),
      apiJson('/api/admin/revenue'),
      apiJson('/api/admin/transactions'),
    ]);
    if (p.ok && p.data?.ok) setPending(p.data.listings); else setError(p.data?.error || 'Failed to load pending');
    if (a.ok && a.data?.ok) setAll(a.data.listings);
    if (u.ok && u.data?.ok) setUsers(u.data.users);
    if (bk.ok && bk.data?.ok) setAllBookings(bk.data.bookings || []);
    if (rev.ok && rev.data?.ok) setRevenue(rev.data);
    if (trans.ok && trans.data?.ok) setTransactions(trans.data.transactions || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    const { ok, data } = await listingsApi.approve(id);
    if (!ok) return toast.error(data?.error || 'Approve failed');
    toast.success('Listing approved');
    load();
  };
  const reject = async (id) => {
    const reason = prompt('Reason for rejection (optional)') || '';
    const { ok, data } = await listingsApi.reject(id, reason);
    if (!ok) return toast.error(data?.error || 'Reject failed');
    toast.success('Listing rejected');
    load();
  };

  // User Management Actions
  const suspendUser = async (userId) => {
    const res = await fetch(`/api/admin/users/${userId}/suspend`, { method: 'POST' });
    const data = await res.json();
    if (!data.ok) return toast.error(data.error || 'Suspend failed');
    toast.success('User suspended');
    load();
  };

  const reactivateUser = async (userId) => {
    const res = await fetch(`/api/admin/users/${userId}/reactivate`, { method: 'POST' });
    const data = await res.json();
    if (!data.ok) return toast.error(data.error || 'Reactivate failed');
    toast.success('User reactivated');
    load();
  };

  const blacklistUser = async (userId) => {
    const res = await fetch(`/api/admin/users/${userId}/blacklist`, { method: 'POST' });
    const data = await res.json();
    if (!data.ok) return toast.error(data.error || 'Blacklist failed');
    toast.success('User blacklisted');
    load();
  };

  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.ok) return toast.error(data.error || 'Delete failed');
    toast.success('User deleted');
    load();
  };

  const changeRole = async (userId, newRole) => {
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    const data = await res.json();
    if (!data.ok) return toast.error(data.error || 'Role change failed');
    toast.success(`Role changed to ${newRole}`);
    setRoleModal(null);
    load();
  };

  // Listing Management Actions
  const suspendListing = async (id) => {
    const res = await fetch(`/api/listings/${id}/suspend`, { method: 'POST' });
    const data = await res.json();
    if (!data.ok) return toast.error(data.error || 'Suspend failed');
    toast.success('Listing suspended');
    load();
  };

  const activateListing = async (id) => {
    const res = await fetch(`/api/listings/${id}/activate`, { method: 'POST' });
    const data = await res.json();
    if (!data.ok) return toast.error(data.error || 'Activate failed');
    toast.success('Listing activated');
    load();
  };

  const toggleFeatured = async (id, featured) => {
    const res = await fetch(`/api/listings/${id}/featured`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featured }),
    });
    const data = await res.json();
    if (!data.ok) return toast.error(data.error || 'Featured update failed');
    toast.success(featured ? 'Marked as featured' : 'Removed from featured');
    load();
  };

  const deleteListing = async (id) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.ok) return toast.error(data.error || 'Delete failed');
    toast.success('Listing deleted');
    load();
  };

  // Booking Management Actions
  const cancelBooking = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    const res = await fetch(`/api/admin/bookings/${id}/cancel`, { method: 'POST' });
    const data = await res.json();
    if (!data.ok) return toast.error(data.error || 'Cancel failed');
    toast.success('Booking cancelled');
    load();
  };

  const refundBooking = async (id) => {
    if (!confirm('Issue refund for this booking?')) return;
    const res = await fetch(`/api/admin/bookings/${id}/refund`, { method: 'POST' });
    const data = await res.json();
    if (!data.ok) return toast.error(data.error || 'Refund failed');
    toast.success('Refund issued');
    load();
  };

  const counts = {
    total:    all.length,
    approved: all.filter(l => l.status === 'approved').length,
    pending:  pending.length,
    rejected: all.filter(l => l.status === 'rejected').length,
    travelers: users.filter(u => u.role === 'traveler').length,
    hosts:    users.filter(u => u.role === 'host').length,
    todayBookings: allBookings.filter(b => {
      const today = new Date().toDateString();
      return new Date(b.createdAt).toDateString() === today;
    }).length,
  };

  // Recent Activity - last 20 activities
  const recentActivity = [];
  
  // New user registrations
  users.slice(-10).reverse().forEach(u => {
    if (u.createdAt) {
      recentActivity.push({
        type: u.role === 'host' ? 'host_registered' : 'traveler_registered',
        user: u.name,
        userId: u.id,
        timestamp: u.createdAt,
        icon: Users,
      });
    }
  });
  
  // New listings
  all.slice(-10).reverse().forEach(l => {
    if (l.createdAt) {
      recentActivity.push({
        type: 'listing_submitted',
        listing: l.title,
        listingId: l.id,
        user: l.hostName,
        status: l.status,
        timestamp: l.createdAt,
        icon: Home,
      });
    }
  });
  
  // Recent bookings
  allBookings.slice(-10).reverse().forEach(b => {
    if (b.createdAt) {
      recentActivity.push({
        type: 'booking_created',
        booking: b.listingTitle,
        bookingId: b.bookingId,
        user: b.travelerName,
        timestamp: b.createdAt,
        icon: Calendar,
      });
    }
  });
  
  // Sort by timestamp and take top 15
  recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const topActivity = recentActivity.slice(0, 15);

  // Filter functions
  const filteredListings = all.filter(l => {
    const matchesSearch = !searchQuery || 
      l.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.hostName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = listingStatusFilter === 'all' || l.status === listingStatusFilter;
    const matchesCategory = listingCategoryFilter === 'all' || l.category === listingCategoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchQuery || 
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const hosts = users.filter(u => u.role === 'host');
  const travelers = users.filter(u => u.role === 'traveler');

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 container pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-emerald2 text-xs uppercase tracking-[0.18em] font-semibold">Admin Console</div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mt-2">Safar Operations</h1>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto md:flex-row flex-col-reverse md:items-center">
            <div className="flex items-center gap-2 bg-white border rounded-full px-4 py-2.5 w-full md:w-80">
              <Search className="size-4 text-muted-foreground" />
              <input 
                placeholder="Search users, hosts, listings..." 
                className="flex-1 text-sm outline-none" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-charcoal">
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Button asChild className="rounded-full bg-emerald2 hover:bg-emerald2-deep font-semibold shrink-0">
              <Link href="/admin/import"><Upload className="size-4 mr-2" /> Import Listings</Link>
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            { l:'Total users', v: users.length.toLocaleString(), d:`${counts.hosts} hosts · ${counts.travelers} travelers`, i: Users },
            { l:'Active listings', v: counts.approved.toLocaleString(), d:`${counts.pending} pending approval`, i: Home },
            { l:"Today's bookings", v: counts.todayBookings.toLocaleString(), d: `${allBookings.length} total bookings`, i: Calendar },
            { l:'Revenue (mo)', v: revenue?.monthlyRevenue ? `₹${(revenue.monthlyRevenue/100000).toFixed(1)}L` : '...', d:'+22% vs last month', i: Wallet },
          ].map((k,i)=>{const Ico=k.i;return(
            <motion.div key={k.l} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.05 }} className="rounded-3xl border bg-white p-5">
              <div className="flex items-center justify-between"><Ico className="size-5 text-emerald2" /><div className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><TrendingUp className="size-3" /></div></div>
              <div className="font-display text-2xl font-bold mt-3">{k.v}</div>
              <div className="text-xs text-muted-foreground">{k.l}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{k.d}</div>
            </motion.div>
          );})}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="mt-8">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-7 h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="hosts">Hosts</TabsTrigger>
            <TabsTrigger value="travelers">Travelers</TabsTrigger>
            <TabsTrigger value="users">All Users</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8 mt-6">
            <div className="grid lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 rounded-3xl border bg-white p-6">
                <div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Revenue trend</div><div className="font-display text-2xl font-bold">12-month overview</div></div><BarChart3 className="size-5 text-emerald2" /></div>
                <div className="mt-4"><LineChart data={revenueChart} /></div>
              </div>
              <div className="rounded-3xl border bg-white p-6">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Listings overview</div>
                <div className="mt-3 space-y-3">
                  {[
                    {l:'Approved',v: counts.total ? Math.round(counts.approved/counts.total*100) : 0},
                    {l:'Pending', v: counts.total ? Math.round(counts.pending/counts.total*100) : 0},
                    {l:'Rejected',v: counts.total ? Math.round(counts.rejected/counts.total*100) : 0},
                  ].map((r)=>(
                    <div key={r.l}><div className="flex justify-between text-sm"><span>{r.l}</span><span className="font-semibold">{r.v}%</span></div><div className="h-2 bg-secondary rounded-full mt-1 overflow-hidden"><motion.div initial={{ width: 0 }} whileInView={{ width: `${r.v}%` }} viewport={{ once: true }} className="h-full bg-gradient-emerald" /></div></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity Feed */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                  <BarChart3 className="size-5 text-emerald2" /> Recent Activity
                </h2>
                <span className="text-sm text-muted-foreground">{topActivity.length} recent events</span>
              </div>
              <div className="rounded-3xl border bg-white p-6">
                {topActivity.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">No recent activity</div>
                ) : (
                  <div className="space-y-3">
                    {topActivity.map((activity, idx) => {
                      const Icon = activity.icon;
                      const getActivityText = () => {
                        switch(activity.type) {
                          case 'host_registered':
                            return <><span className="font-semibold">{activity.user}</span> registered as a <span className="text-emerald2 font-semibold">Host</span></>;
                          case 'traveler_registered':
                            return <><span className="font-semibold">{activity.user}</span> registered as a <span className="text-blue-600 font-semibold">Traveler</span></>;
                          case 'listing_submitted':
                            return <><span className="font-semibold">{activity.user}</span> submitted listing <span className="font-semibold">"{activity.listing}"</span> · <StatusPill s={activity.status} /></>;
                          case 'booking_created':
                            return <><span className="font-semibold">{activity.user}</span> booked <span className="font-semibold">"{activity.booking}"</span></>;
                          default:
                            return null;
                        }
                      };
                      
                      return (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-xl hover:bg-secondary/40 transition">
                          <div className="size-8 rounded-full bg-secondary grid place-items-center shrink-0">
                            <Icon className="size-4 text-emerald2" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm">{getActivityText()}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {new Date(activity.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Pending Approvals */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-2xl font-bold flex items-center gap-2"><ShieldAlert className="size-5 text-gold" /> Pending approvals</h2>
                <span className="text-sm text-muted-foreground">{pending.length} listing{pending.length===1?'':'s'} awaiting review</span>
              </div>
              {loading && <div className="py-12 grid place-items-center"><Loader2 className="size-6 animate-spin text-emerald2" /></div>}
              {error && <div className="p-6 border rounded-3xl bg-rose-50/40 border-rose-200 text-center"><AlertTriangle className="size-6 mx-auto text-rose-500" /><div className="mt-2 text-sm">{error}</div></div>}
              {!loading && pending.length === 0 && !error && (
                <div className="p-10 border rounded-3xl bg-white text-center">
                  <Check className="size-7 mx-auto text-emerald2" />
                  <div className="font-display text-lg font-bold mt-3">All caught up!</div>
                  <p className="text-sm text-muted-foreground mt-1">No listings are pending approval right now.</p>
                </div>
              )}
              {!loading && pending.length > 0 && (
                <div className="rounded-3xl border bg-white overflow-hidden">
                  <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                      <div className="grid grid-cols-12 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b"><div className="col-span-5">Listing</div><div className="col-span-3">Host</div><div className="col-span-2">Category</div><div className="col-span-2 text-right">Action</div></div>
                      {pending.map((p)=>(
                        <div key={p.id} className="grid grid-cols-12 px-5 py-3 border-b last:border-0 items-center hover:bg-secondary/40 transition">
                          <div className="col-span-5 flex items-center gap-3"><img src={(p.images && p.images[0]) || ''} className="size-12 rounded-xl object-cover bg-secondary" alt="" /><div><div className="font-semibold text-sm line-clamp-1">{p.title}</div><div className="text-xs text-muted-foreground">{p.location}</div></div></div>
                          <div className="col-span-3 flex items-center gap-2"><div className="size-7 rounded-full bg-gradient-emerald grid place-items-center text-white text-xs font-bold">{(p.hostName||'?').charAt(0)}</div><span className="text-sm">{p.hostName || p.hostId}</span></div>
                          <div className="col-span-2 text-sm capitalize">{p.category}</div>
                          <div className="col-span-2 flex justify-end gap-1.5"><Button onClick={()=>approve(p.id)} size="sm" className="rounded-full h-8 bg-emerald2 hover:bg-emerald2-deep"><Check className="size-3.5 mr-1" /> Approve</Button><Button onClick={()=>reject(p.id)} size="sm" variant="ghost" className="rounded-full h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"><X className="size-3.5" /></Button></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </TabsContent>

          {/* Hosts Tab */}
          <TabsContent value="hosts" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold">Host Management</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage all hosts and their listings</p>
              </div>
              <span className="text-sm text-muted-foreground">{hosts.length} total hosts</span>
            </div>
            {loading && <div className="py-12 grid place-items-center"><Loader2 className="size-6 animate-spin text-emerald2" /></div>}
            {!loading && hosts.length === 0 && (
              <div className="p-10 border rounded-3xl bg-white text-center">
                <Users className="size-7 mx-auto text-muted-foreground" />
                <div className="font-display text-lg font-bold mt-3">No hosts yet</div>
                <p className="text-sm text-muted-foreground mt-1">Hosts will appear here once they register.</p>
              </div>
            )}
            {!loading && hosts.length > 0 && (
              <div className="rounded-3xl border bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[900px]">
                    <div className="grid grid-cols-12 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b">
                      <div className="col-span-3">Host</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-2">Listings</div>
                      <div className="col-span-2">Bookings</div>
                      <div className="col-span-3 text-right">Actions</div>
                    </div>
                    {hosts.filter(h => {
                      if (!searchQuery) return true;
                      return h.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             h.email?.toLowerCase().includes(searchQuery.toLowerCase());
                    }).map((h)=>(
                      <div key={h.id} className="grid grid-cols-12 px-5 py-3 border-b last:border-0 items-center hover:bg-secondary/40 transition">
                        <div className="col-span-3 flex items-center gap-3">
                          <div className="size-10 rounded-full bg-gradient-emerald grid place-items-center text-white font-semibold">{(h.name||'?').charAt(0)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate">{h.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{h.email}</div>
                          </div>
                        </div>
                        <div className="col-span-2"><StatusPill s={h.status || 'active'} /></div>
                        <div className="col-span-2">
                          <div className="text-sm font-semibold">{h.listingCount || 0} listings</div>
                          <div className="text-xs text-muted-foreground">
                            {all.filter(l => l.hostId === h.id && l.status === 'approved').length} approved
                          </div>
                        </div>
                        <div className="col-span-2 text-sm">{h.bookingCount || 0} bookings</div>
                        <div className="col-span-3 flex justify-end gap-1">
                          {h.status !== 'suspended' && <Button onClick={()=>suspendUser(h.id)} size="sm" variant="ghost" className="rounded-full h-8" title="Suspend"><Ban className="size-3.5" /></Button>}
                          {h.status === 'suspended' && <Button onClick={()=>reactivateUser(h.id)} size="sm" variant="ghost" className="rounded-full h-8 text-emerald2" title="Reactivate"><RotateCcw className="size-3.5" /></Button>}
                          <Button onClick={()=>blacklistUser(h.id)} size="sm" variant="ghost" className="rounded-full h-8 text-rose-600" title="Blacklist"><Shield className="size-3.5" /></Button>
                          <Button onClick={()=>setUserModal(h)} size="sm" className="rounded-full h-8 bg-emerald2 hover:bg-emerald2-deep">View</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Travelers Tab */}
          <TabsContent value="travelers" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold">Traveler Management</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage all travelers and their bookings</p>
              </div>
              <span className="text-sm text-muted-foreground">{travelers.length} total travelers</span>
            </div>
            {loading && <div className="py-12 grid place-items-center"><Loader2 className="size-6 animate-spin text-emerald2" /></div>}
            {!loading && travelers.length === 0 && (
              <div className="p-10 border rounded-3xl bg-white text-center">
                <Users className="size-7 mx-auto text-muted-foreground" />
                <div className="font-display text-lg font-bold mt-3">No travelers yet</div>
                <p className="text-sm text-muted-foreground mt-1">Travelers will appear here once they register.</p>
              </div>
            )}
            {!loading && travelers.length > 0 && (
              <div className="rounded-3xl border bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    <div className="grid grid-cols-12 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b">
                      <div className="col-span-4">Traveler</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-2">Bookings</div>
                      <div className="col-span-1">Reviews</div>
                      <div className="col-span-3 text-right">Actions</div>
                    </div>
                    {travelers.filter(t => {
                      if (!searchQuery) return true;
                      return t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             t.email?.toLowerCase().includes(searchQuery.toLowerCase());
                    }).map((t)=>(
                      <div key={t.id} className="grid grid-cols-12 px-5 py-3 border-b last:border-0 items-center hover:bg-secondary/40 transition">
                        <div className="col-span-4 flex items-center gap-3">
                          <div className="size-10 rounded-full bg-blue-500 grid place-items-center text-white font-semibold">{(t.name||'?').charAt(0)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate">{t.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{t.email}</div>
                          </div>
                        </div>
                        <div className="col-span-2"><StatusPill s={t.status || 'active'} /></div>
                        <div className="col-span-2">
                          <div className="text-sm font-semibold">{t.bookingCount || 0} bookings</div>
                          <div className="text-xs text-muted-foreground">
                            {allBookings.filter(b => b.travelerId === t.id).length} total
                          </div>
                        </div>
                        <div className="col-span-1 text-sm">{t.reviewCount || 0}</div>
                        <div className="col-span-3 flex justify-end gap-1">
                          {t.status !== 'suspended' && <Button onClick={()=>suspendUser(t.id)} size="sm" variant="ghost" className="rounded-full h-8" title="Disable"><Ban className="size-3.5" /></Button>}
                          {t.status === 'suspended' && <Button onClick={()=>reactivateUser(t.id)} size="sm" variant="ghost" className="rounded-full h-8 text-emerald2" title="Reactivate"><RotateCcw className="size-3.5" /></Button>}
                          <Button onClick={()=>blacklistUser(t.id)} size="sm" variant="ghost" className="rounded-full h-8 text-rose-600" title="Blacklist"><Shield className="size-3.5" /></Button>
                          <Button onClick={()=>setUserModal(t)} size="sm" className="rounded-full h-8 bg-emerald2 hover:bg-emerald2-deep">View</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6 mt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold">All Users</h2>
                <span className="text-sm text-muted-foreground">{filteredUsers.length} of {users.length} users</span>
              </div>
              <select 
                value={userRoleFilter} 
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-full border text-sm outline-none focus:ring-2 focus:ring-emerald2/20"
              >
                <option value="all">All Roles</option>
                <option value="traveler">Travelers</option>
                <option value="host">Hosts</option>
                <option value="admin">Admins</option>
              </select>
            </div>
            {loading && <div className="py-12 grid place-items-center"><Loader2 className="size-6 animate-spin text-emerald2" /></div>}
            {!loading && filteredUsers.length > 0 && (
              <div className="rounded-3xl border bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    <div className="grid grid-cols-12 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b">
                      <div className="col-span-3">User</div><div className="col-span-2">Role</div><div className="col-span-2">Status</div><div className="col-span-2">Listings/Bookings</div><div className="col-span-3 text-right">Actions</div>
                    </div>
                    {filteredUsers.map((u)=>(
                      <div key={u.id} className="grid grid-cols-12 px-5 py-3 border-b last:border-0 items-center hover:bg-secondary/40 transition">
                        <div className="col-span-3 flex items-center gap-3">
                          <div className="size-10 rounded-full bg-gradient-emerald grid place-items-center text-white font-semibold">{(u.name||'?').charAt(0)}</div>
                          <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{u.name}</div><div className="text-xs text-muted-foreground truncate">{u.email}</div></div>
                        </div>
                        <div className="col-span-2"><StatusPill s={u.role} /></div>
                        <div className="col-span-2"><StatusPill s={u.status || 'active'} /></div>
                        <div className="col-span-2 text-sm">{u.listingCount || 0} / {u.bookingCount || 0}</div>
                        <div className="col-span-3 flex justify-end gap-1">
                          {u.role !== 'admin' && (
                            <>
                              {u.status !== 'suspended' && <Button onClick={()=>suspendUser(u.id)} size="sm" variant="ghost" className="rounded-full h-8" title="Suspend"><Ban className="size-3.5" /></Button>}
                              {u.status === 'suspended' && <Button onClick={()=>reactivateUser(u.id)} size="sm" variant="ghost" className="rounded-full h-8 text-emerald2" title="Reactivate"><RotateCcw className="size-3.5" /></Button>}
                              <Button onClick={()=>blacklistUser(u.id)} size="sm" variant="ghost" className="rounded-full h-8 text-rose-600" title="Blacklist"><Shield className="size-3.5" /></Button>
                              <Button onClick={()=>setRoleModal(u)} size="sm" variant="ghost" className="rounded-full h-8" title="Change Role"><UserCog className="size-3.5" /></Button>
                              <Button onClick={()=>deleteUser(u.id)} size="sm" variant="ghost" className="rounded-full h-8 text-rose-600" title="Delete"><Trash2 className="size-3.5" /></Button>
                            </>
                          )}
                          <Button onClick={()=>setUserModal(u)} size="sm" className="rounded-full h-8 bg-emerald2 hover:bg-emerald2-deep">View</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Listings Tab */}
          <TabsContent value="listings" className="space-y-6 mt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold">Listing Management</h2>
                <span className="text-sm text-muted-foreground">{filteredListings.length} of {all.length} listings</span>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <select 
                  value={listingStatusFilter} 
                  onChange={(e) => setListingStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-full border text-sm outline-none focus:ring-2 focus:ring-emerald2/20"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="suspended">Suspended</option>
                </select>
                <select 
                  value={listingCategoryFilter} 
                  onChange={(e) => setListingCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-full border text-sm outline-none focus:ring-2 focus:ring-emerald2/20"
                >
                  <option value="all">All Categories</option>
                  <option value="houseboat">Houseboat</option>
                  <option value="cabin">Cabin</option>
                  <option value="cottage">Cottage</option>
                  <option value="home">Home</option>
                  <option value="camp">Camp</option>
                  <option value="tour">Tour</option>
                  <option value="transport">Transport</option>
                  <option value="experience">Experience</option>
                </select>
              </div>
            </div>
            {!loading && (
              <div className="rounded-3xl border bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[900px]">
                    <div className="grid grid-cols-12 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b">
                      <div className="col-span-4">Listing</div><div className="col-span-2">Host</div><div className="col-span-2">Status</div><div className="col-span-1">Featured</div><div className="col-span-3 text-right">Actions</div>
                    </div>
                    {filteredListings.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">No listings match your filters</div>
                    ) : (
                      filteredListings.slice(0, 50).map((p)=>(
                        <div key={p.id} className="grid grid-cols-12 px-5 py-3 border-b last:border-0 items-center hover:bg-secondary/40 transition">
                          <div className="col-span-4 flex items-center gap-3"><img src={(p.images && p.images[0]) || ''} className="size-12 rounded-xl object-cover bg-secondary" alt="" /><div><div className="font-semibold text-sm line-clamp-1">{p.title}</div><div className="text-xs text-muted-foreground">{p.location} · ₹{p.price.toLocaleString('en-IN')}</div></div></div>
                          <div className="col-span-2 text-sm">{p.hostName || p.hostId}</div>
                          <div className="col-span-2"><StatusPill s={p.status} /></div>
                          <div className="col-span-1">{p.featured ? <Star className="size-4 text-gold fill-gold" /> : <Star className="size-4 text-muted-foreground" />}</div>
                          <div className="col-span-3 flex justify-end gap-1">
                            {p.status !== 'approved' && <Button onClick={()=>approve(p.id)} size="sm" variant="outline" className="rounded-full h-8" title="Approve"><Check className="size-3.5" /></Button>}
                            {p.status !== 'suspended' && <Button onClick={()=>suspendListing(p.id)} size="sm" variant="ghost" className="rounded-full h-8" title="Suspend"><Ban className="size-3.5" /></Button>}
                            {p.status === 'suspended' && <Button onClick={()=>activateListing(p.id)} size="sm" variant="ghost" className="rounded-full h-8 text-emerald2" title="Activate"><RotateCcw className="size-3.5" /></Button>}
                            <Button onClick={()=>toggleFeatured(p.id, !p.featured)} size="sm" variant="ghost" className="rounded-full h-8 text-gold" title={p.featured ? "Unfeature" : "Feature"}><Star className="size-3.5" /></Button>
                            <Button onClick={()=>deleteListing(p.id)} size="sm" variant="ghost" className="rounded-full h-8 text-rose-600" title="Delete"><Trash2 className="size-3.5" /></Button>
                            <Link href={`/property/${p.id}`} className="px-3 py-1 rounded-full bg-secondary text-xs font-semibold hover:bg-secondary/80">View</Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold">Booking Management</h2>
              <span className="text-sm text-muted-foreground">{allBookings.length} total · {allBookings.filter(b=>b.status==='pending').length} pending</span>
            </div>
            {!loading && allBookings.length === 0 && (
              <div className="p-6 rounded-3xl border bg-white text-center text-sm text-muted-foreground">No bookings yet.</div>
            )}
            {!loading && allBookings.length > 0 && (
              <div className="rounded-3xl border bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[1000px]">
                    <div className="grid grid-cols-12 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b">
                      <div className="col-span-3">Listing</div><div className="col-span-2">Guest → Host</div><div className="col-span-2">Dates</div><div className="col-span-1">Status</div><div className="col-span-2 text-right">Total</div><div className="col-span-2 text-right">Actions</div>
                    </div>
                    {allBookings.slice(0, 20).map((b) => (
                      <div key={b.bookingId} className="grid grid-cols-12 px-5 py-3 border-b last:border-0 items-center hover:bg-secondary/40 transition">
                        <div className="col-span-3 flex items-center gap-3">{b.listingImage && <img src={b.listingImage} className="size-10 rounded-lg object-cover" alt="" />}<div><div className="font-semibold text-sm line-clamp-1">{b.listingTitle}</div></div></div>
                        <div className="col-span-2 text-xs">{b.travelerName}<br/><span className="text-muted-foreground">→ {b.hostName}</span></div>
                        <div className="col-span-2 text-xs">{new Date(b.checkInDate).toLocaleDateString()} →<br/>{new Date(b.checkOutDate).toLocaleDateString()}</div>
                        <div className="col-span-1"><StatusPill s={b.status} /></div>
                        <div className="col-span-2 text-right text-sm font-semibold">₹{(b.totalPrice||0).toLocaleString('en-IN')}{b.refunded && <span className="text-xs text-emerald2 block">Refunded</span>}</div>
                        <div className="col-span-2 flex justify-end gap-1">
                          {b.status !== 'cancelled' && <Button onClick={()=>cancelBooking(b.bookingId)} size="sm" variant="ghost" className="rounded-full h-8 text-rose-600" title="Cancel"><X className="size-3.5" /></Button>}
                          {!b.refunded && <Button onClick={()=>refundBooking(b.bookingId)} size="sm" variant="ghost" className="rounded-full h-8 text-emerald2" title="Refund"><Wallet className="size-3.5" /></Button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-6 mt-6">
            <h2 className="font-display text-2xl font-bold">Revenue Dashboard</h2>
            
            {/* Revenue Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { l:'Total Revenue', v: revenue ? `₹${(revenue.totalRevenue/10000000).toFixed(2)} Cr` : '...', i: Wallet },
                { l:"Today's Revenue", v: revenue ? `₹${(revenue.todayRevenue/100000).toFixed(2)}L` : '...', i: TrendingUp },
                { l:'Monthly Revenue', v: revenue ? `₹${(revenue.monthlyRevenue/100000).toFixed(2)}L` : '...', i: Calendar },
                { l:'Pending Payments', v: revenue ? `₹${(revenue.pendingPayments/100000).toFixed(2)}L` : '...', i: AlertTriangle },
                { l:'Platform Commission', v: revenue ? `₹${(revenue.platformCommission/100000).toFixed(2)}L` : '...', i: BarChart3 },
              ].map((k,i)=>{const Ico=k.i;return(
                <motion.div key={k.l} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.05 }} className="rounded-3xl border bg-white p-5">
                  <Ico className="size-5 text-emerald2 mb-3" />
                  <div className="font-display text-xl font-bold">{k.v}</div>
                  <div className="text-xs text-muted-foreground mt-1">{k.l}</div>
                </motion.div>
              );})}
            </div>

            {/* Transactions Table */}
            <div>
              <h3 className="font-display text-xl font-bold mb-4">Recent Transactions</h3>
              {transactions.length === 0 && <div className="p-6 rounded-3xl border bg-white text-center text-sm text-muted-foreground">No transactions yet.</div>}
              {transactions.length > 0 && (
                <div className="rounded-3xl border bg-white overflow-hidden">
                  <div className="overflow-x-auto">
                    <div className="min-w-[900px]">
                      <div className="grid grid-cols-12 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b">
                        <div className="col-span-3">Booking</div><div className="col-span-2">Guest</div><div className="col-span-2">Host</div><div className="col-span-1">Status</div><div className="col-span-1 text-right">Total</div><div className="col-span-2 text-right">Commission</div><div className="col-span-1 text-right">Host Pay</div>
                      </div>
                      {transactions.map((t) => (
                        <div key={t.bookingId} className="grid grid-cols-12 px-5 py-3 border-b last:border-0 items-center hover:bg-secondary/40 transition">
                          <div className="col-span-3 text-sm font-semibold truncate">{t.listingTitle}</div>
                          <div className="col-span-2 text-xs truncate">{t.travelerName}</div>
                          <div className="col-span-2 text-xs truncate">{t.hostName}</div>
                          <div className="col-span-1"><StatusPill s={t.status} /></div>
                          <div className="col-span-1 text-right text-sm font-semibold">₹{(t.totalPrice||0).toLocaleString('en-IN')}</div>
                          <div className="col-span-2 text-right text-sm text-emerald2 font-semibold">₹{(t.commission||0).toLocaleString('en-IN')}</div>
                          <div className="col-span-1 text-right text-sm font-semibold">₹{(t.hostPayout||0).toLocaleString('en-IN')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* User Details Modal */}
      {userModal && (
        <Dialog open={!!userModal} onOpenChange={()=>setUserModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full bg-gradient-emerald grid place-items-center text-white text-2xl font-bold">{(userModal.name||'?').charAt(0)}</div>
                <div className="flex-1">
                  <div className="font-semibold text-lg">{userModal.name}</div>
                  <div className="text-sm text-muted-foreground">{userModal.email}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Role:</span> <StatusPill s={userModal.role} /></div>
                <div><span className="text-muted-foreground">Status:</span> <StatusPill s={userModal.status || 'active'} /></div>
                <div><span className="text-muted-foreground">Listings:</span> <span className="font-semibold">{userModal.listingCount || 0}</span></div>
                <div><span className="text-muted-foreground">Bookings:</span> <span className="font-semibold">{userModal.bookingCount || 0}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Joined:</span> <span className="font-semibold">{new Date(userModal.createdAt).toLocaleDateString()}</span></div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={()=>setUserModal(null)} variant="outline">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Role Change Modal */}
      {roleModal && (
        <Dialog open={!!roleModal} onOpenChange={()=>setRoleModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm">Change role for <span className="font-semibold">{roleModal.name}</span></div>
              <div className="flex gap-2">
                {['traveler', 'host', 'admin'].map((r) => (
                  <Button key={r} onClick={()=>changeRole(roleModal.id, r)} variant={roleModal.role === r ? 'default' : 'outline'} className="flex-1 capitalize">{r}</Button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={()=>setRoleModal(null)} variant="outline">Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Footer />
    </main>
  );
}

export default function App() {
  return <ProtectedRoute roles={['admin']}><AdminInner /></ProtectedRoute>;
}
