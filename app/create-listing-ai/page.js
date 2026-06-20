'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Wand2, CheckCircle2, Loader2, ArrowLeft, Home, Car, Users, Mountain, Bike, Hotel } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/safar/Navbar';
import { useAuth } from '@/lib/auth-context';

const CATEGORY_SUGGESTIONS = [
  { id: 'houseboat', label: 'Houseboat', icon: Home },
  { id: 'hotel', label: 'Hotel', icon: Hotel },
  { id: 'guide', label: 'Tour Guide', icon: Users },
  { id: 'taxi', label: 'Taxi Service', icon: Car },
  { id: 'bike', label: 'Bike Rental', icon: Bike },
  { id: 'experience', label: 'Experience', icon: Mountain },
];

export default function AIListingWizard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'Salaam! 🙏 I\'m your Safar AI Assistant. I\'ll help you create a professional listing in minutes.\n\nWhat would you like to list on Safar today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [stage, setStage] = useState('greeting'); // greeting, collecting, reviewing, finalizing
  const [progress, setProgress] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Wait for auth state to load before checking authentication
    if (loading) return;
    
    if (!user) {
      toast.error('Please sign in to create a listing');
      router.push('/');
      return;
    }
    // Check if user is a host or admin
    if (user.role !== 'host' && user.role !== 'admin') {
      toast.info('Please become a host first to use the AI Listing Wizard');
      router.push('/add-listing');
      return;
    }
    // Generate conversation ID
    setConversationId(`wizard-${user.id}-${Date.now()}`);
  }, [user, loading, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage,
      timestamp: new Date()
    }]);

    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-wizard/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: userMessage,
          conversationId,
          messages: messages.slice(-10) // Send last 10 messages for context
        })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Add assistant response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        metadata: data.metadata
      }]);

      // Update progress and stage
      if (data.progress) setProgress(data.progress);
      if (data.stage) setStage(data.stage);

      // If listing is complete, show preview and finalize
      if (data.stage === 'complete' && data.listing) {
        // Show final preview with listing details
        setTimeout(() => {
          finalizeListing(data.listing);
        }, 2000);
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error.message || 'Failed to send message');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        error: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const finalizeListing = async (listing) => {
    try {
      const response = await fetch('/api/ai-wizard/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ listing, conversationId })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to create listing');
      }

      toast.success('🎉 Listing created successfully!');
      
      // Redirect to host dashboard after 1.5 seconds
      setTimeout(() => {
        router.push('/dashboard/host');
      }, 1500);

    } catch (error) {
      console.error('Finalize error:', error);
      toast.error(error.message || 'Failed to create listing');
    }
  };

  const selectCategory = (category) => {
    setInput(category);
    setTimeout(() => sendMessage(), 100);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Show loading state while auth is being checked
  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-20 pb-10 max-w-4xl">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <Loader2 className="size-8 animate-spin text-emerald2 mx-auto mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container pt-20 pb-10 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 size-4" /> Back
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-charcoal flex items-center gap-2">
                <Wand2 className="size-8 text-emerald2" />
                Safar AI Listing Wizard
              </h1>
              <p className="text-muted-foreground mt-1">Create your listing through conversation</p>
            </div>
            
            {/* Progress indicator */}
            {progress > 0 && (
              <div className="text-right">
                <div className="text-sm font-semibold text-emerald2">{progress}% Complete</div>
                <div className="w-32 h-2 bg-secondary rounded-full mt-1 overflow-hidden">
                  <motion.div 
                    className="h-full bg-emerald2"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-3xl shadow-lg border border-border overflow-hidden">
          {/* Messages Area */}
          <div className="h-[60vh] overflow-y-auto p-6 space-y-4">
            <AnimatePresence mode="popLayout">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-emerald2 text-white' : msg.error ? 'bg-red-50 text-red-900 border border-red-200' : 'bg-secondary text-charcoal'} rounded-2xl px-5 py-3 shadow-sm`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="size-4 text-emerald2" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Safar AI</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                    {msg.metadata && msg.metadata.listingPreview && (
                      <div className="mt-3 p-3 bg-white/80 rounded-lg border border-emerald2/20">
                        <div className="text-xs font-semibold text-emerald2 mb-2">📋 Listing Preview</div>
                        <div className="text-xs space-y-1">
                          <div><strong>Title:</strong> {msg.metadata.listingPreview.title}</div>
                          <div><strong>Category:</strong> {msg.metadata.listingPreview.category}</div>
                          <div><strong>Price:</strong> ₹{msg.metadata.listingPreview.price}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-secondary rounded-2xl px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin text-emerald2" />
                    <span className="text-sm text-muted-foreground">AI is thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Category suggestions (only show initially) */}
            {messages.length === 1 && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-2 pt-2"
              >
                {CATEGORY_SUGGESTIONS.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => selectCategory(cat.label)}
                      className="px-4 py-2 rounded-full bg-emerald2/10 text-emerald2 text-sm font-medium hover:bg-emerald2/20 transition flex items-center gap-2"
                    >
                      <Icon className="size-4" />
                      {cat.label}
                    </button>
                  );
                })}
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-4 bg-secondary/30">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message... (English, Urdu, or Kashmiri)"
                disabled={isLoading || stage === 'complete'}
                className="flex-1 resize-none rounded-2xl border border-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald2 disabled:opacity-50 min-h-[56px] max-h-32"
                rows={1}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading || stage === 'complete'}
                className="rounded-full size-14 bg-emerald2 hover:bg-emerald2-deep text-white"
              >
                {isLoading ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
              </Button>
            </div>
            <div className="mt-2 text-xs text-muted-foreground text-center">
              💬 Supports English, Urdu (اردو), and Roman Kashmiri
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
            <CheckCircle2 className="size-6 text-emerald2 mb-2" />
            <h3 className="font-semibold text-sm text-charcoal mb-1">Simple & Fast</h3>
            <p className="text-xs text-muted-foreground">Create listings in under 3 minutes</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
            <Sparkles className="size-6 text-emerald2 mb-2" />
            <h3 className="font-semibold text-sm text-charcoal mb-1">AI-Powered</h3>
            <p className="text-xs text-muted-foreground">Professional titles & descriptions</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
            <Users className="size-6 text-emerald2 mb-2" />
            <h3 className="font-semibold text-sm text-charcoal mb-1">Multilingual</h3>
            <p className="text-xs text-muted-foreground">English, Urdu & Kashmiri support</p>
          </div>
        </div>
      </div>
    </main>
  );
}
