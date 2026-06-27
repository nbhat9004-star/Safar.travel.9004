'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, MapPin, Calendar, Send, Check, X, AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ProtectedRoute from '@/components/safar/ProtectedRoute';

const CATEGORIES = [
  { value: 'stay', label: '🏡 Stays', emoji: '🏡' },
  { value: 'bike', label: '🏍️ Bike Rentals', emoji: '🏍️' },
  { value: 'car', label: '🚗 Car Rentals', emoji: '🚗' },
  { value: 'tour', label: '🗺️ Local Guides', emoji: '🗺️' },
  { value: 'experience', label: '🛶 Experiences', emoji: '🛶' },
  { value: 'transport', label: '✈️ Airport Transfers', emoji: '✈️' },
];

function SafarTogetherInner() {
  const [plans, setPlans] = useState([]);
  const [myPlans, setMyPlans] = useState([]);
  const [requests, setRequests] = useState({ sent: [], received: [] });
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create plan states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [step, setStep] = useState(1); // 1: Select Category, 2: Select Listing, 3: Add Details
  const [selectedCategory, setSelectedCategory] = useState('');
  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [loadingListings, setLoadingListings] = useState(false);
  
  const [reportModal, setReportModal] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCategory && step === 2) {
      loadListings();
    }
  }, [selectedCategory, step]);

  const loadData = async () => {
    setLoading(true);
    const [plansRes, myPlansRes, requestsRes, connectionsRes] = await Promise.all([
      fetch('/api/safar-together/plans'),
      fetch('/api/safar-together/my-plans'),
      fetch('/api/safar-together/requests'),
      fetch('/api/safar-together/connections'),
    ]);
    const [plansData, myPlansData, requestsData, connectionsData] = await Promise.all([
      plansRes.json(), myPlansRes.json(), requestsRes.json(), connectionsRes.json()
    ]);
    setPlans(plansData.plans || []);
    setMyPlans(myPlansData.plans || []);
    setRequests(requestsData);
    setConnections(connectionsData.connections || []);
    setLoading(false);
  };

  const loadListings = async () => {
    setLoadingListings(true);
    const res = await fetch(`/api/listings?cat=${selectedCategory}&status=approved&limit=50`);
    const data = await res.json();
    setListings(data.listings || []);
    setLoadingListings(false);
  };

  const createPlan = async (e) => {
    e.preventDefault();
    if (!selectedListing) return toast.error('Please select a listing');
    
    const formData = new FormData(e.target);
    const plan = {
      listingId: selectedListing.id,
      listingTitle: selectedListing.title,
      listingImage: selectedListing.images?.[0] || '',
      listingCategory: selectedListing.category,
      listingPrice: selectedListing.price,
      destination: selectedListing.location || formData.get('destination'),
      dateFrom: formData.get('dateFrom'),
      dateTo: formData.get('dateTo'),
      availableSpots: Number(formData.get('availableSpots')),
      introduction: formData.get('introduction'),
      age: Number(formData.get('age')),
      gender: formData.get('gender'),
      languages: formData.get('languages'),
      interests: formData.get('interests'),
    };
    
    const res = await fetch('/api/safar-together/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    const data = await res.json();
    if (!data.ok) return toast.error(data.error || 'Failed to create plan');
    toast.success('Travel plan created!');
    resetCreateModal();
    loadData();
  };

  const resetCreateModal = () => {
    setShowCreateModal(false);
    setStep(1);
    setSelectedCategory('');
    setSelectedListing(null);
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

  const deletePlan = async (planId) => {
    if (!confirm('Delete this travel plan?')) return;
    await fetch(`/api/safar-together/plans/${planId}`, { method: 'DELETE' });
    toast.success('Plan deleted');
    loadData();
  };

  const getCategoryEmoji = (category) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.emoji || '📍';
  };

  return (
    <div className="min-h-screen bg-sage/5">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">🤝 Safar Together</h1>
            <p className="text-lg text-muted-foreground">Share experiences, split costs, travel together</p>
          </div>

          <Tabs defaultValue="browse" className="space-y-8">
            <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
              <TabsTrigger value="browse">Browse</TabsTrigger>
              <TabsTrigger value="create">Create Plan</TabsTrigger>
              <TabsTrigger value="my-plans">My Plans</TabsTrigger>
              <TabsTrigger value="connections">Connections</TabsTrigger>
            </TabsList>

            {/* Browse Tab */}
            <TabsContent value="browse" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <motion.div key={plan.id} whileHover={{ y: -4 }} className="bg-white rounded-2xl overflow-hidden shadow-sm border hover:shadow-md transition">
                    {plan.listingImage && (
                      <div className="relative h-48">
                        <Image src={plan.listingImage} alt={plan.listingTitle} fill className="object-cover" />
                        <div className="absolute top-3 right-3 px-3 py-1 bg-white/95 rounded-full text-xs font-semibold">
                          {getCategoryEmoji(plan.listingCategory)} {plan.listingCategory}
                        </div>
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="size-10 rounded-full bg-gradient-emerald grid place-items-center text-white font-semibold">{plan.userName?.[0]}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{plan.userName}</div>
                          <div className="text-xs text-muted-foreground">{plan.age} years · {plan.gender}</div>
                        </div>
                      </div>
                      <Link href={`/property/${plan.listingId}`} className="block mb-2">
                        <h3 className="font-semibold text-lg hover:text-emerald2 transition">{plan.listingTitle}</h3>
                      </Link>
                      <div className="space-y-1 text-sm mb-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="size-4 text-emerald2" /> {plan.destination}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="size-4 text-emerald2" /> {plan.dateFrom} - {plan.dateTo}
                        </div>
                        {plan.availableSpots && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="size-4 text-emerald2" /> {plan.availableSpots} spot(s) available
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{plan.introduction}</p>
                      <div className="flex gap-2">
                        <Button onClick={() => sendRequest(plan.id, plan.userId)} className="flex-1 bg-emerald2 hover:bg-emerald2-deep">
                          <Send className="size-4 mr-1" /> Join Plan
                        </Button>
                        <Link href={`/property/${plan.listingId}`}>
                          <Button variant="outline" size="icon"><ExternalLink className="size-4" /></Button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {plans.length === 0 && <div className="col-span-3 text-center py-12 text-muted-foreground">No travel plans yet. Be the first to create one!</div>}
              </div>
            </TabsContent>

            {/* Create Plan Tab */}
            <TabsContent value="create">
              <div className="max-w-2xl mx-auto">
                <Button onClick={() => setShowCreateModal(true)} className="w-full bg-emerald2 hover:bg-emerald2-deep h-16 text-lg">
                  + Create Travel Plan
                </Button>
              </div>
            </TabsContent>

            {/* My Plans Tab */}
            <TabsContent value="my-plans">
              <div className="space-y-4">
                {myPlans.map((plan) => (
                  <div key={plan.id} className="bg-white rounded-2xl p-6 shadow-sm border">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4 flex-1">
                        {plan.listingImage && (
                          <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                            <Image src={plan.listingImage} alt={plan.listingTitle} fill className="object-cover" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-lg mb-1">{plan.listingTitle}</h3>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>{getCategoryEmoji(plan.listingCategory)} {plan.listingCategory}</div>
                            <div>{plan.dateFrom} to {plan.dateTo}</div>
                            <div>{plan.introduction}</div>
                          </div>
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
                        <div className="text-sm text-muted-foreground">Wants to join your plan</div>
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

            {/* Connections Tab */}
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
                    <Link href={`/safar-together/chats`}>
                      <Button variant="outline" className="w-full">Message</Button>
                    </Link>
                  </div>
                ))}
                {connections.length === 0 && <div className="col-span-3 text-center py-12 text-muted-foreground">No connections yet</div>}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Create Plan Modal */}
      {showCreateModal && (
        <Dialog open={showCreateModal} onOpenChange={resetCreateModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Travel Plan - Step {step} of 3</DialogTitle>
            </DialogHeader>
            
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Select a service category to find companions</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => { setSelectedCategory(cat.value); setStep(2); }}
                      className="p-6 border-2 rounded-xl hover:border-emerald2 hover:bg-emerald2/5 transition text-center"
                    >
                      <div className="text-4xl mb-2">{cat.emoji}</div>
                      <div className="font-semibold text-sm">{cat.label.replace(cat.emoji, '').trim()}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Select a listing from {selectedCategory}</p>
                  <Button onClick={() => { setStep(1); setSelectedListing(null); }} variant="outline" size="sm">← Back</Button>
                </div>
                {loadingListings ? (
                  <div className="text-center py-12">Loading listings...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                    {listings.map((listing) => (
                      <div
                        key={listing.id}
                        onClick={() => { setSelectedListing(listing); setStep(3); }}
                        className={`p-4 border-2 rounded-xl cursor-pointer hover:border-emerald2 transition ${selectedListing?.id === listing.id ? 'border-emerald2 bg-emerald2/5' : ''}`}
                      >
                        {listing.images?.[0] && (
                          <div className="relative h-32 rounded-lg overflow-hidden mb-3">
                            <Image src={listing.images[0]} alt={listing.title} fill className="object-cover" />
                          </div>
                        )}
                        <div className="font-semibold line-clamp-1">{listing.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">{listing.location}</div>
                        <div className="text-sm font-semibold text-emerald2 mt-1">₹{listing.price?.toLocaleString('en-IN')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 3 && selectedListing && (
              <form onSubmit={createPlan} className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-semibold">{selectedListing.title}</div>
                    <div className="text-sm text-muted-foreground">{selectedListing.location}</div>
                  </div>
                  <Button type="button" onClick={() => setStep(2)} variant="outline" size="sm">← Change</Button>
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
                <div>
                  <label className="text-sm font-semibold">Available Spots *</label>
                  <input name="availableSpots" type="number" min="1" required className="w-full mt-1 px-3 py-2 border rounded-lg" placeholder="How many people can join?" />
                </div>
                <div>
                  <label className="text-sm font-semibold">Introduction *</label>
                  <textarea name="introduction" required rows="3" className="w-full mt-1 px-3 py-2 border rounded-lg" placeholder="Tell others why you're looking for companions..."></textarea>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-semibold">Your Age *</label>
                    <input name="age" type="number" required className="w-full mt-1 px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Gender</label>
                    <select name="gender" className="w-full mt-1 px-3 py-2 border rounded-lg">
                      <option value="">Any</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold">Languages *</label>
                  <input name="languages" required className="w-full mt-1 px-3 py-2 border rounded-lg" placeholder="English, Hindi" />
                </div>
                <div>
                  <label className="text-sm font-semibold">Interests</label>
                  <input name="interests" className="w-full mt-1 px-3 py-2 border rounded-lg" placeholder="Photography, Hiking, etc." />
                </div>
                <DialogFooter>
                  <Button type="button" onClick={resetCreateModal} variant="outline">Cancel</Button>
                  <Button type="submit" className="bg-emerald2 hover:bg-emerald2-deep">Create Plan</Button>
                </DialogFooter>
              </form>
            )}
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
