'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Building2,
  MapPin,
  Phone,
  Globe,
  Star,
  MessageCircle,
  Mail,
  Calendar,
  Clock,
  User,
  Plus,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProtectedRoute from '@/components/safar/ProtectedRoute';

function BusinessProfileInner() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.id;
  
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [notes, setNotes] = useState([]);
  const [followups, setFollowups] = useState([]);
  
  const [newNote, setNewNote] = useState('');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  
  const [followupData, setFollowupData] = useState({
    followUpDate: '',
    priority: 'medium',
    note: ''
  });

  useEffect(() => {
    if (businessId) {
      loadBusinessProfile();
    }
  }, [businessId]);

  const loadBusinessProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/marketplace/crm/business/${businessId}`);
      const data = await res.json();
      
      if (data.ok) {
        setBusiness(data.business);
        setTimeline(data.timeline || []);
        setNotes(data.notes || []);
        setFollowups(data.followups || []);
      } else {
        toast.error('Failed to load business profile');
        router.push('/admin/marketplace/crm');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load business profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      const res = await fetch(`/api/marketplace/crm/business/${businessId}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote })
      });
      
      const data = await res.json();
      if (data.ok) {
        toast.success('Note added');
        setNewNote('');
        setShowNoteForm(false);
        loadBusinessProfile();
      } else {
        toast.error(data.error || 'Failed to add note');
      }
    } catch (error) {
      console.error('Failed to add note:', error);
      toast.error('Failed to add note');
    }
  };

  const handleUpdateStatus = async (pipelineStage) => {
    try {
      const res = await fetch(`/api/marketplace/crm/business/${businessId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineStage })
      });
      
      const data = await res.json();
      if (data.ok) {
        toast.success('Status updated');
        loadBusinessProfile();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleScheduleFollowup = async () => {
    if (!followupData.followUpDate) {
      toast.error('Please select a follow-up date');
      return;
    }
    
    try {
      const res = await fetch(`/api/marketplace/crm/business/${businessId}/followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(followupData)
      });
      
      const data = await res.json();
      if (data.ok) {
        toast.success('Follow-up scheduled');
        setFollowupData({ followUpDate: '', priority: 'medium', note: '' });
        setShowFollowupForm(false);
        loadBusinessProfile();
      } else {
        toast.error(data.error || 'Failed to schedule follow-up');
      }
    } catch (error) {
      console.error('Failed to schedule follow-up:', error);
      toast.error('Failed to schedule follow-up');
    }
  };

  const getWhatsAppLink = (phone) => {
    if (!phone) return '#';
    const cleaned = phone.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleaned}`;
  };

  const pipelineStages = [
    { id: 'pending', label: 'Pending' },
    { id: 'contacted', label: 'Contacted' },
    { id: 'interested', label: 'Interested' },
    { id: 'meeting_scheduled', label: 'Meeting Scheduled' },
    { id: 'negotiating', label: 'Negotiating' },
    { id: 'live_partner', label: 'Live Partner' },
    { id: 'rejected', label: 'Rejected' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/20">
        <Navbar />
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald2"></div>
              <p className="text-sm text-muted-foreground mt-4">Loading business profile...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!business) {
    return null;
  }

  return (
    <div className="min-h-screen bg-secondary/20 pt-20 lg:pt-24">
      <Navbar />
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/marketplace/crm">
            <Button variant="ghost" className="rounded-full mb-4">
              <ArrowLeft className="size-4 mr-2" />
              Back to CRM
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Business Info */}
            <div className="rounded-3xl border bg-white p-6">
              <div className="flex items-start gap-4">
                {business.images && business.images[0] && (
                  <img 
                    src={business.images[0]} 
                    alt={business.title}
                    className="size-24 rounded-xl object-cover shrink-0"
                  />
                )}
                <div className="flex-1">
                  <h1 className="font-display text-2xl font-bold">{business.title}</h1>
                  
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
                    {business.city && (
                      <div className="flex items-center gap-1">
                        <MapPin className="size-4" />
                        <span>{business.city}</span>
                      </div>
                    )}
                    {business.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="size-4 fill-amber-400 text-amber-400" />
                        <span className="font-medium">{business.rating}</span>
                        <span className="text-xs">({business.reviews} reviews)</span>
                      </div>
                    )}
                    {business.category && (
                      <span className="px-2 py-1 rounded-full bg-secondary text-xs font-medium capitalize">
                        {business.category}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-2">
                    {business.location && (
                      <p className="text-sm">{business.location}</p>
                    )}
                    {business.contact?.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="size-4 text-muted-foreground" />
                        <span>{business.contact.phone}</span>
                      </div>
                    )}
                    {business.contact?.website && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="size-4 text-muted-foreground" />
                        <a href={business.contact.website} target="_blank" rel="noopener noreferrer" className="text-emerald2 hover:underline">
                          Visit Website
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Communication Actions */}
              <div className="flex gap-2 mt-6 pt-6 border-t flex-wrap">
                {business.contact?.phone && (
                  <>
                    <a href={`tel:${business.contact.phone}`}>
                      <Button variant="outline" className="rounded-full">
                        <Phone className="size-4 mr-2" />
                        Call
                      </Button>
                    </a>
                    <a href={getWhatsAppLink(business.contact.phone)} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="rounded-full">
                        <MessageCircle className="size-4 mr-2" />
                        WhatsApp
                      </Button>
                    </a>
                  </>
                )}
                {business.contact?.website && (
                  <a href={business.contact.website} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="rounded-full">
                      <Globe className="size-4 mr-2" />
                      Website
                    </Button>
                  </a>
                )}
                <Button variant="outline" className="rounded-full" disabled>
                  <Mail className="size-4 mr-2" />
                  Send Email
                </Button>
              </div>
            </div>

            {/* Photos */}
            {business.images && business.images.length > 1 && (
              <div className="rounded-3xl border bg-white p-6">
                <h3 className="font-semibold mb-4">Photos</h3>
                <div className="grid grid-cols-3 gap-3">
                  {business.images.slice(0, 6).map((img, idx) => (
                    <img 
                      key={idx}
                      src={img} 
                      alt={`${business.title} ${idx + 1}`}
                      className="w-full aspect-square rounded-xl object-cover"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="rounded-3xl border bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Notes</h3>
                <Button 
                  size="sm" 
                  onClick={() => setShowNoteForm(!showNoteForm)}
                  className="rounded-full"
                >
                  <Plus className="size-4 mr-2" />
                  Add Note
                </Button>
              </div>

              {showNoteForm && (
                <div className="mb-4 p-4 rounded-xl bg-secondary/20">
                  <Textarea
                    placeholder="Write a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="mb-3"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddNote} size="sm" className="rounded-full">
                      <Save className="size-4 mr-2" />
                      Save Note
                    </Button>
                    <Button 
                      onClick={() => {
                        setShowNoteForm(false);
                        setNewNote('');
                      }} 
                      size="sm" 
                      variant="outline"
                      className="rounded-full"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
              ) : (
                <div className="space-y-3">
                  {notes.map(note => (
                    <div key={note.id} className="p-4 rounded-xl bg-secondary/20">
                      <p className="text-sm">{note.content}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <User className="size-3" />
                        <span>{note.author}</span>
                        <span>·</span>
                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity Timeline */}
            <div className="rounded-3xl border bg-white p-6">
              <h3 className="font-semibold mb-4">Activity Timeline</h3>
              
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
              ) : (
                <div className="space-y-4">
                  {timeline.map(event => (
                    <div key={event.id} className="flex gap-3">
                      <div className="shrink-0 size-8 rounded-full bg-emerald-50 grid place-items-center">
                        <Clock className="size-4 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{event.action}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          by {event.user} · {new Date(event.timestamp).toLocaleString()}
                        </p>
                        {event.details && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {JSON.stringify(event.details)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pipeline Status */}
            <div className="rounded-3xl border bg-white p-6">
              <h3 className="font-semibold mb-4">Pipeline Stage</h3>
              
              <Select
                value={business.crmData?.pipelineStage || 'pending'}
                onValueChange={handleUpdateStatus}
              >
                <SelectTrigger className="rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pipelineStages.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="mt-4 text-xs text-muted-foreground">
                Last updated: {business.crmData?.lastStatusChange ? new Date(business.crmData.lastStatusChange).toLocaleString() : 'Never'}
              </div>
            </div>

            {/* Follow-ups */}
            <div className="rounded-3xl border bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Follow-ups</h3>
                <Button 
                  size="sm" 
                  onClick={() => setShowFollowupForm(!showFollowupForm)}
                  className="rounded-full"
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              {showFollowupForm && (
                <div className="mb-4 p-4 rounded-xl bg-secondary/20 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block">Follow-up Date</label>
                    <Input
                      type="date"
                      value={followupData.followUpDate}
                      onChange={(e) => setFollowupData({...followupData, followUpDate: e.target.value})}
                      className="rounded-full"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block">Priority</label>
                    <Select
                      value={followupData.priority}
                      onValueChange={(value) => setFollowupData({...followupData, priority: value})}
                    >
                      <SelectTrigger className="rounded-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block">Note</label>
                    <Textarea
                      placeholder="Add a note..."
                      value={followupData.note}
                      onChange={(e) => setFollowupData({...followupData, note: e.target.value})}
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleScheduleFollowup} size="sm" className="rounded-full flex-1">
                      <Save className="size-4 mr-2" />
                      Schedule
                    </Button>
                    <Button 
                      onClick={() => {
                        setShowFollowupForm(false);
                        setFollowupData({ followUpDate: '', priority: 'medium', note: '' });
                      }}
                      size="sm" 
                      variant="outline"
                      className="rounded-full"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {followups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No follow-ups scheduled</p>
              ) : (
                <div className="space-y-3">
                  {followups.map(followup => (
                    <div key={followup.id} className="p-3 rounded-xl border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="size-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {new Date(followup.followUpDate).toLocaleDateString()}
                            </span>
                          </div>
                          {followup.note && (
                            <p className="text-xs text-muted-foreground mt-2">{followup.note}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          followup.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                          followup.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {followup.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Business Details */}
            <div className="rounded-3xl border bg-white p-6">
              <h3 className="font-semibold mb-4">Details</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <span className="ml-2 font-medium capitalize">{business.status}</span>
                </div>
                
                {business.googlePlaceId && (
                  <div>
                    <span className="text-muted-foreground">Place ID:</span>
                    <span className="ml-2 font-mono text-xs">{business.googlePlaceId.substring(0, 20)}...</span>
                  </div>
                )}
                
                {business.createdAt && (
                  <div>
                    <span className="text-muted-foreground">Imported:</span>
                    <span className="ml-2">{new Date(business.createdAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function BusinessProfilePage() {
  return (
    <ProtectedRoute requireRole="super_admin">
      <BusinessProfileInner />
    </ProtectedRoute>
  );
}
