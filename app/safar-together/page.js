'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, MapPin, Calendar, User, Heart, Send, Check, X, AlertTriangle, Ban } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ProtectedRoute from '@/components/safar/ProtectedRoute';

function SafarTogetherInner() {
  const [plans, setPlans] = useState([]);
  const [myPlans, setMyPlans] = useState([]);
  const [requests, setRequests] = useState({ sent: [], received: [] });
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [reportModal, setReportModal] = useState(null);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [plansRes, myPlansRes, requestsRes, connectionsRes] = await Promise.all([
      fetch('/api/safar-together/plans'),
      fetch('/api/safar-together/my-plans'),
      fetch('/api/safar-together/requests'),
      fetch('/api/safar-together/connections'),
    ]);
    const plansData = await plansRes.json();
    const myPlansData = await myPlansRes.json();
    const requestsData = await requestsRes.json();
    const connectionsData = await connectionsRes.json();
    setPlans(plansData.plans || []);
    setMyPlans(myPlansData.plans || []);
    setRequests(requestsData);
    setConnections(connectionsData.connections || []);
    setLoading(false);
  };

  const createPlan = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const plan = {
      destination: formData.get('destination'),
      dateFrom: formData.get('dateFrom'),
      dateTo: formData.get('dateTo'),
      duration: formData.get('duration'),
      age: Number(formData.get('age')),
      gender: formData.get('gender'),
      languages: formData.get('languages'),
      interests: formData.get('interests'),
      introduction: formData.get('introduction'),
    };
    const res = await fetch('/api/safar-together/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    const data = await res.json();
    if (!data.ok) return toast.error(data.error || 'Failed to create plan');
    toast.success('Travel plan created!');
    setCreateModal(false);
    loadData();
  };

  const sendRequest = async (planId, recipientId) => {
    const res = await fetch('/api/safar-together/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, recipientId }),
    });
    const data = await res.json();
    if (!data.ok) return toast.error(data.error || 'Failed to send request');
    toast.success('Request sent!');
    loadData();
  };

  const handleRequest = async (requestId, action) => {
    const res = await fetch(`/api/safar-together/requests/${requestId}/${action}`, { method: 'PATCH' });
    const data = await res.json();
    if (!data.ok) return toast.error('Action failed');
    toast.success(action === 'accepted' ? 'Request accepted!' : 'Request declined');
    loadData();
  };

  const reportUser = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const res = await fetch('/api/safar-together/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportedUserId: reportModal.userId,
        reason: formData.get('reason'),
      }),
    });
    const data = await res.json();
    if (!data.ok) return toast.error('Report failed');
    toast.success('User reported');
    setReportModal(null);
  };

  const deletePlan = async (planId) => {
    if (!confirm('Delete this travel plan?')) return;
    await fetch(`/api/safar-together/plans/${planId}`, { method: 'DELETE' });
    toast.success('Plan deleted');
    loadData();
  };

  return (
    <div className="min-h-screen bg-sage/5">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">🤝 Safar Together</h1>
            <p className="text-lg text-muted-foreground">Connect with solo travelers exploring Kashmir</p>
          </div>

          <Tabs defaultValue="browse" className="space-y-8">
            <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
              <TabsTrigger value="browse">Browse</TabsTrigger>
              <TabsTrigger value="create">Create Plan</TabsTrigger>
              <TabsTrigger value="my-plans">My Plans</TabsTrigger>
              <TabsTrigger value="connections">Connections</TabsTrigger>
            </TabsList>

            {/* Browse Travelers */}
            <TabsContent value="browse" className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h3 className="font-semibold mb-4">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input type="text" placeholder="Destination" className="px-3 py-2 border rounded-lg" onChange={(e) => setFilters({...filters, destination: e.target.value})} />
                  <input type="number" placeholder="Min Age" className="px-3 py-2 border rounded-lg" onChange={(e) => setFilters({...filters, minAge: e.target.value})} />
                  <input type="number" placeholder="Max Age" className="px-3 py-2 border rounded-lg" onChange={(e) => setFilters({...filters, maxAge: e.target.value})} />
                  <select className="px-3 py-2 border rounded-lg" onChange={(e) => setFilters({...filters, gender: e.target.value})}>
                    <option value="">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <motion.div key={plan.id} whileHover={{ y: -4 }} className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="size-12 rounded-full bg-gradient-emerald grid place-items-center text-white font-semibold text-lg">{plan.userName?.[0]}</div>
                      <div>
                        <div className="font-semibold">{plan.userName}</div>
                        <div className="text-xs text-muted-foreground">{plan.age} years · {plan.gender}</div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center gap-2"><MapPin className="size-4 text-emerald2" /> {plan.destination}</div>
                      <div className="flex items-center gap-2"><Calendar className="size-4 text-emerald2" /> {plan.dateFrom} to {plan.dateTo}</div>
                      <div className="text-muted-foreground">{plan.introduction}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {plan.interests?.split(',').map((i, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-emerald2/10 text-emerald2 rounded-full text-xs">{i.trim()}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => sendRequest(plan.id, plan.userId)} className="flex-1 bg-emerald2 hover:bg-emerald2-deep"><Send className="size-4 mr-1" /> Send Request</Button>
                      <Button onClick={() => setReportModal({ userId: plan.userId })} variant="outline" size="icon"><AlertTriangle className="size-4" /></Button>
                    </div>
                  </motion.div>
                ))}
                {plans.length === 0 && <div className="col-span-3 text-center py-12 text-muted-foreground">No travelers found</div>}
              </div>
            </TabsContent>

            {/* Create Plan */}
            <TabsContent value="create">
              <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 shadow-sm border">
                <h2 className="font-display text-2xl font-bold mb-6">Create Travel Plan</h2>
                <form onSubmit={createPlan} className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold">Destination *</label>
                    <input name="destination" required className="w-full mt-1 px-3 py-2 border rounded-lg" placeholder="Srinagar, Gulmarg, etc." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold">From Date *</label>
                      <input name="dateFrom" type="date" required className="w-full mt-1 px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="text-sm font-semibold">To Date *</label>
                      <input name="dateTo" type="date" required className="w-full mt-1 px-3 py-2 border rounded-lg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold">Duration *</label>
                      <input name="duration" required className="w-full mt-1 px-3 py-2 border rounded-lg" placeholder="3 days" />
                    </div>
                    <div>
                      <label className="text-sm font-semibold">Age *</label>
                      <input name="age" type="number" required className="w-full mt-1 px-3 py-2 border rounded-lg" placeholder="25" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Gender</label>
                    <select name="gender" className="w-full mt-1 px-3 py-2 border rounded-lg">
                      <option value="">Prefer not to say</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Languages Spoken *</label>
                    <input name="languages" required className="w-full mt-1 px-3 py-2 border rounded-lg" placeholder="English, Hindi" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Interests *</label>
                    <input name="interests" required className="w-full mt-1 px-3 py-2 border rounded-lg" placeholder="Hiking, Photography, Culture" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Introduction *</label>
                    <textarea name="introduction" required rows="4" className="w-full mt-1 px-3 py-2 border rounded-lg" placeholder="Tell others about yourself..."></textarea>
                  </div>
                  <Button type="submit" className="w-full bg-emerald2 hover:bg-emerald2-deep">Create Travel Plan</Button>
                </form>
              </div>
            </TabsContent>

            {/* My Plans */}
            <TabsContent value="my-plans">
              <div className="space-y-4">
                {myPlans.map((plan) => (
                  <div key={plan.id} className="bg-white rounded-2xl p-6 shadow-sm border">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{plan.destination}</h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div>{plan.dateFrom} to {plan.dateTo} · {plan.duration}</div>
                          <div>{plan.introduction}</div>
                        </div>
                      </div>
                      <Button onClick={() => deletePlan(plan.id)} variant="outline" size="sm">Delete</Button>
                    </div>
                  </div>
                ))}
                {myPlans.length === 0 && <div className="text-center py-12 text-muted-foreground">No plans yet. Create one to get started!</div>}
              </div>

              <div className="mt-8">
                <h3 className="font-semibold mb-4">Received Requests</h3>
                <div className="space-y-4">
                  {requests.received?.filter(r => r.status === 'pending').map((req) => (
                    <div key={req.id} className="bg-white rounded-2xl p-4 shadow-sm border flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{req.senderName}</div>
                        <div className="text-sm text-muted-foreground">Wants to travel with you</div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleRequest(req.id, 'accepted')} size="sm" className="bg-emerald2"><Check className="size-4" /></Button>
                        <Button onClick={() => handleRequest(req.id, 'declined')} size="sm" variant="outline"><X className="size-4" /></Button>
                      </div>
                    </div>
                  ))}
                  {(!requests.received || requests.received.filter(r => r.status === 'pending').length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">No pending requests</div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Connections */}
            <TabsContent value="connections">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {connections.map((conn) => (
                  <div key={conn.id} className="bg-white rounded-2xl p-6 shadow-sm border">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="size-12 rounded-full bg-gradient-emerald grid place-items-center text-white font-semibold text-lg">
                        {conn.senderName?.[0]}
                      </div>
                      <div>
                        <div className="font-semibold">{conn.senderName}</div>
                        <div className="text-xs text-emerald2">Connected</div>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full">View Profile</Button>
                  </div>
                ))}
                {connections.length === 0 && <div className="col-span-3 text-center py-12 text-muted-foreground">No connections yet</div>}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Report Modal */}
      {reportModal && (
        <Dialog open={!!reportModal} onOpenChange={() => setReportModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Report User</DialogTitle>
            </DialogHeader>
            <form onSubmit={reportUser}>
              <div className="space-y-4">
                <textarea name="reason" required rows="4" className="w-full px-3 py-2 border rounded-lg" placeholder="Reason for reporting..."></textarea>
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" onClick={() => setReportModal(null)} variant="outline">Cancel</Button>
                <Button type="submit" className="bg-rose-600 hover:bg-rose-700">Report</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <Footer />
    </div>
  );
}

export default function Page() {
  return <ProtectedRoute roles={['traveler', 'host', 'admin', 'super_admin']}><SafarTogetherInner /></ProtectedRoute>;
}
