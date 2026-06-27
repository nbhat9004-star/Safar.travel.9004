'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import ProtectedRoute from '@/components/safar/ProtectedRoute';

function MyChatsInner() {
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const loadConversations = async () => {
    const res = await fetch('/api/safar-together/conversations');
    const data = await res.json();
    if (data.ok) setConversations(data.conversations || []);
    setLoading(false);
  };

  const filtered = conversations.filter(c =>
    c.partner?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.planDestination?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-sage/5">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold">My Chats</h1>
              <p className="text-muted-foreground mt-1">Your Safar Together conversations</p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border rounded-xl"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border">
                <MessageCircle className="size-12 mx-auto text-muted-foreground mb-4" />
                <div className="font-semibold text-lg">No conversations yet</div>
                <p className="text-sm text-muted-foreground mt-2">Start connecting with fellow travelers!</p>
              </div>
            ) : (
              filtered.map((convo) => (
                <div
                  key={convo.id}
                  onClick={() => router.push(`/safar-together/chats/${convo.id}`)}
                  className="bg-white rounded-2xl p-4 border hover:border-emerald2 transition cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-full bg-gradient-emerald grid place-items-center text-white font-bold text-lg flex-shrink-0">
                      {convo.partner?.name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold truncate">{convo.partner?.name || 'Unknown'}</div>
                        {convo.unreadCount > 0 && (
                          <div className="size-6 rounded-full bg-emerald2 text-white text-xs grid place-items-center font-bold flex-shrink-0">
                            {convo.unreadCount}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {convo.planDestination} · {convo.planDates?.from}
                      </div>
                      {convo.lastMessage && (
                        <div className="text-sm text-muted-foreground truncate mt-1">
                          {convo.lastMessage.text}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function Page() {
  return <ProtectedRoute roles={['traveler', 'host', 'admin', 'super_admin']}><MyChatsInner /></ProtectedRoute>;
}
