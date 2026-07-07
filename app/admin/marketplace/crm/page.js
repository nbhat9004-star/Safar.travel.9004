'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  FileText, 
  CheckCircle, 
  XCircle,
  Phone,
  MessageCircle,
  Mail,
  Calendar,
  Search,
  Filter,
  TrendingUp,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProtectedRoute from '@/components/safar/ProtectedRoute';

function CRMInner() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});

  useEffect(() => {
    loadDashboard();
    loadBusinesses();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/marketplace/crm/dashboard');
      const data = await res.json();
      if (data.ok) setStats(data.stats);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        search, 
        limit: '10',
        ...filters 
      });
      const res = await fetch(`/api/marketplace/crm/businesses?${params}`);
      const data = await res.json();
      if (data.ok) setBusinesses(data.businesses || []);
    } catch (error) {
      console.error('Failed to load businesses:', error);
      toast.error('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Businesses', value: stats?.total || 0, icon: Building2, color: 'blue' },
    { label: 'Draft Listings', value: stats?.draft || 0, icon: FileText, color: 'amber' },
    { label: 'Claimed', value: stats?.claimed || 0, icon: CheckCircle, color: 'emerald' },
    { label: 'Active Partners', value: stats?.activePartners || 0, icon: Users, color: 'purple' },
  ];

  const getWhatsAppLink = (phone) => {
    if (!phone) return '#';
    const cleaned = phone.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleaned}`;
  };

  return (
    <div className="min-h-screen bg-secondary/20">
      <Navbar />
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/marketplace">
            <Button variant="ghost" className="rounded-full mb-4">
              ← Back to Marketplace
            </Button>
          </Link>
          <h1 className="font-display text-3xl font-bold">Partnership CRM</h1>
          <p className="text-muted-foreground mt-1">
            Manage outreach, partnerships, and business relationships
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-3xl border bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      {stat.label}
                    </div>
                    <div className="font-display text-2xl font-bold mt-2">
                      {stat.value}
                    </div>
                  </div>
                  <div className={`size-12 rounded-full bg-${stat.color}-50 grid place-items-center`}>
                    <Icon className={`size-6 text-${stat.color}-600`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Search & Filters */}
        <div className="rounded-3xl border bg-white p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <Input
                placeholder="Search businesses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && loadBusinesses()}
                className="pl-12 h-12 rounded-full"
              />
            </div>
            <Button onClick={loadBusinesses} className="rounded-full h-12 px-8">
              Search
            </Button>
          </div>
        </div>

        {/* Business List */}
        <div className="rounded-3xl border bg-white overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="font-display text-xl font-bold">Businesses ({businesses.length})</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald2"></div>
              <p className="text-sm text-muted-foreground mt-4">Loading...</p>
            </div>
          ) : businesses.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="size-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-semibold">No businesses found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Import some businesses to see them here
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {businesses.map((business) => (
                <div key={business.id} className="p-6 hover:bg-secondary/20 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{business.title}</h3>
                        <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase">
                          {business.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {business.location}
                      </p>
                      <div className="flex gap-2 mt-3">
                        {business.contact?.phone && (
                          <a href={`tel:${business.contact.phone}`}>
                            <Button size="sm" variant="outline" className="rounded-full">
                              <Phone className="size-4 mr-2" />
                              Call
                            </Button>
                          </a>
                        )}
                        {business.contact?.phone && (
                          <a href={getWhatsAppLink(business.contact.phone)} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="rounded-full">
                              <MessageCircle className="size-4 mr-2" />
                              WhatsApp
                            </Button>
                          </a>
                        )}
                        <Link href={`/admin/marketplace/crm/business/${business.id}`}>
                          <Button size="sm" className="rounded-full bg-emerald2">
                            View Profile
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function CRMPage() {
  return (
    <ProtectedRoute requireRole="super_admin">
      <CRMInner />
    </ProtectedRoute>
  );
}
