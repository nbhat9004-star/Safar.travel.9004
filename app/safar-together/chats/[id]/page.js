'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Phone, AlertTriangle, Ban, LogOut, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ProtectedRoute from '@/components/safar/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';

function ChatConversationInner() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const conversationId = params.id;
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (conversationId) {
      loadMessages();
      const interval = setInterval(loadMessages, 5000); // Refresh every 5s
      return () => clearInterval(interval);
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const res = await fetch(`/api/safar-together/conversations/${conversationId}/messages`);
      const data = await res.json();
      if (data.ok) {
        setMessages(data.messages || []);
        setConversation(data.conversation);
      } else {
        toast.error(data.error || 'Failed to load messages');
      }
      setLoading(false);
    } catch (error) {
      console.error('Load messages error:', error);
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    
    setSending(true);
    try {
      const res = await fetch(`/api/safar-together/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newMessage.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setNewMessage('');
        loadMessages();
      } else {
        toast.error(data.error || 'Failed to send message');
      }
    } catch (error) {
      toast.error('Failed to send message');
    }
    setSending(false);
  };

  const blockUser = async () => {
    if (!confirm('Block this user? They will no longer be able to message you.')) return;
    const res = await fetch(`/api/safar-together/conversations/${conversationId}/block`, { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      toast.success('User blocked');
      router.push('/safar-together/chats');
    }
  };

  const requestWhatsApp = async () => {
    const res = await fetch(`/api/safar-together/conversations/${conversationId}/share-whatsapp`, { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      if (data.bothApproved) {
        toast.success('WhatsApp numbers shared! Check conversation details.');
      } else {
        toast.success('Request sent. Waiting for partner approval.');
      }
      loadMessages();
    }
  };

  const reportUser = async (reason) => {
    const partnerId = conversation?.participants?.find(p => p !== user.id);
    const res = await fetch('/api/safar-together/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportedUserId: partnerId, reason }),
    });
    const data = await res.json();
    if (data.ok) {
      toast.success('User reported');
      setReportModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sage/5">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center py-12">Loading conversation...</div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-sage/5">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center py-12">Conversation not found</div>
        </div>
      </div>
    );
  }

  const partnerId = conversation.participants?.find(p => p !== user.id);
  const partner = messages[0]?.senderId === partnerId ? messages[0] : messages.find(m => m.senderId === partnerId);

  return (
    <div className="min-h-screen bg-sage/5 flex flex-col">
      <Navbar />
      
      {/* Chat Container */}
      <div className="flex-1 container mx-auto px-4 py-6 max-w-5xl flex flex-col">
        {/* Header */}
        <div className="bg-white rounded-2xl border p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="size-5" />
              </Button>
              <div className="size-12 rounded-full bg-gradient-emerald grid place-items-center text-white font-bold text-lg">
                {partner?.senderName?.[0] || '?'}
              </div>
              <div>
                <div className="font-semibold text-lg">{partner?.senderName || 'Travel Partner'}</div>
                <div className="text-sm text-muted-foreground">
                  {conversation.planDestination} · {conversation.planDates?.from} to {conversation.planDates?.to}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={requestWhatsApp} size="sm" variant="outline" className="hidden md:flex">
                <Phone className="size-4 mr-1" /> Share WhatsApp
              </Button>
              <Button onClick={() => setReportModal(true)} size="sm" variant="outline">
                <AlertTriangle className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 bg-white rounded-2xl border overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <MessageCircle className="size-12 mx-auto mb-4 text-muted-foreground/50" />
                <div>No messages yet. Say hello!</div>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.senderId === user.id;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isOwn ? 'bg-emerald2 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      <div className="text-sm whitespace-pre-wrap break-words">{msg.text}</div>
                      <div className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={sendMessage} className="border-t p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-emerald2"
                disabled={sending}
              />
              <Button type="submit" disabled={!newMessage.trim() || sending} className="rounded-full bg-emerald2 hover:bg-emerald2-deep">
                <Send className="size-5" />
              </Button>
            </div>
          </form>
        </div>

        {/* Mobile Actions */}
        <div className="flex gap-2 mt-4 md:hidden">
          <Button onClick={requestWhatsApp} size="sm" variant="outline" className="flex-1">
            <Phone className="size-4 mr-1" /> Share WhatsApp
          </Button>
          <Button onClick={blockUser} size="sm" variant="outline" className="flex-1">
            <Ban className="size-4 mr-1" /> Block
          </Button>
        </div>
      </div>

      {/* Report Modal */}
      {reportModal && (
        <Dialog open={reportModal} onOpenChange={setReportModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report User</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); reportUser(new FormData(e.target).get('reason')); }}>
              <textarea name="reason" required rows="4" className="w-full px-3 py-2 border rounded-lg" placeholder="Reason for reporting..."></textarea>
              <DialogFooter className="mt-4">
                <Button type="button" onClick={() => setReportModal(false)} variant="outline">Cancel</Button>
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
  return <ProtectedRoute roles={['traveler', 'host', 'admin', 'super_admin']}><ChatConversationInner /></ProtectedRoute>;
}
