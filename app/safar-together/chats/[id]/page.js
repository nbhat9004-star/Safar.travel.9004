'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Phone, AlertTriangle, Ban, LogOut, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/safar/Navbar';
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
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (conversationId) {
      loadMessages();
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll to bottom when keyboard opens (viewport resize on mobile)
  useEffect(() => {
    const handleResize = () => {
      setTimeout(scrollToBottom, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadMessages = async () => {
    try {
      const res = await fetch(`/api/safar-together/conversations/${conversationId}/messages`);
      const data = await res.json();
      if (data.ok) {
        const hadMessages = messages.length > 0;
        setMessages(data.messages || []);
        setConversation(data.conversation);
        // Only scroll if we had messages before (to detect new messages)
        if (hadMessages && data.messages?.length > messages.length) {
          setTimeout(scrollToBottom, 100);
        }
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
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    
    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage(''); // Clear immediately for better UX
    
    try {
      const res = await fetch(`/api/safar-together/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: messageText }),
      });
      const data = await res.json();
      if (data.ok) {
        loadMessages();
        setTimeout(scrollToBottom, 100);
      } else {
        toast.error(data.error || 'Failed to send message');
        setNewMessage(messageText); // Restore message on error
      }
    } catch (error) {
      toast.error('Failed to send message');
      setNewMessage(messageText);
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
        toast.success('WhatsApp numbers shared!');
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
      <div className="h-[100dvh] flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center mt-16 md:mt-20">
          <div className="text-muted-foreground">Loading conversation...</div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="h-[100dvh] flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center mt-16 md:mt-20">
          <div className="text-muted-foreground">Conversation not found</div>
        </div>
      </div>
    );
  }

  const partnerId = conversation.participants?.find(p => p !== user.id);
  const partner = messages[0]?.senderId === partnerId ? messages[0] : messages.find(m => m.senderId === partnerId);

  return (
    <div className="h-[100dvh] flex flex-col bg-white">
      <Navbar />
      
      {/* Chat Header - Compact, below fixed navbar */}
      <div className="bg-white border-b px-4 py-3 flex-shrink-0 mt-16 md:mt-20">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full flex-shrink-0 h-9 w-9">
              <ArrowLeft className="size-5" />
            </Button>
            <div className="size-10 rounded-full bg-gradient-emerald grid place-items-center text-white font-bold flex-shrink-0">
              {partner?.senderName?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{partner?.senderName || 'Travel Partner'}</div>
              <div className="text-xs text-muted-foreground truncate">
                {conversation.planDestination} · {conversation.planDates?.from}
              </div>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button onClick={requestWhatsApp} size="sm" variant="ghost" className="hidden sm:flex h-9">
              <Phone className="size-4" />
            </Button>
            <Button onClick={() => setReportModal(true)} size="sm" variant="ghost" className="h-9 w-9 p-0">
              <AlertTriangle className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Container - Flexible, fills remaining space */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-gray-50 min-h-0"
      >
        <div className="max-w-5xl mx-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="size-12 mb-3 text-muted-foreground/30" />
              <div className="text-sm">No messages yet. Say hello!</div>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.senderId === user.id;
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 ${isOwn ? 'bg-emerald2 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.text}</div>
                    <div className={`text-[10px] mt-1 ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input - Fixed at Bottom */}
      <div className="bg-white border-t px-4 py-3 flex-shrink-0">
        <form onSubmit={sendMessage} className="max-w-5xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 border rounded-full focus:outline-none focus:ring-2 focus:ring-emerald2 text-sm"
              disabled={sending}
              autoComplete="off"
            />
            <Button 
              type="submit" 
              disabled={!newMessage.trim() || sending} 
              className="rounded-full bg-emerald2 hover:bg-emerald2-deep h-10 w-10 p-0 flex-shrink-0"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </form>
      </div>

      {/* Mobile Action Sheet (optional - at bottom) */}
      {/* Can be expanded with swipe up gesture in future */}

      {/* Report Modal */}
      {reportModal && (
        <Dialog open={reportModal} onOpenChange={setReportModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Report User</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); reportUser(new FormData(e.target).get('reason')); }}>
              <textarea 
                name="reason" 
                required 
                rows="4" 
                className="w-full px-3 py-2 border rounded-lg text-sm" 
                placeholder="Please describe the issue..."
              ></textarea>
              <DialogFooter className="mt-4">
                <Button type="button" onClick={() => setReportModal(false)} variant="outline">Cancel</Button>
                <Button type="submit" className="bg-rose-600 hover:bg-rose-700">Report</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function Page() {
  return <ProtectedRoute roles={['traveler', 'host', 'admin', 'super_admin']}><ChatConversationInner /></ProtectedRoute>;
}
