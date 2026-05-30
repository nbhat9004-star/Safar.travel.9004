'use client';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import PropertyCard from '@/components/safar/PropertyCard';
import AIAssistantFloating from '@/components/safar/AIAssistantFloating';
import { LISTINGS } from '@/lib/data';
import { Heart } from 'lucide-react';

function App() {
  const list = LISTINGS.slice(0, 6);
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 container">
        <div className="flex items-center gap-3"><div className="size-12 rounded-2xl bg-rose-50 grid place-items-center"><Heart className="size-6 text-rose-500 fill-rose-500" /></div>
          <div><div className="text-emerald2 text-xs uppercase tracking-[0.18em] font-semibold">Wishlist</div><h1 className="font-display text-3xl md:text-5xl font-bold">Saved for later</h1></div></div>
        <p className="mt-3 text-muted-foreground">{list.length} stays and experiences you’ve loved.</p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map((l, i) => <PropertyCard key={l.id} item={l} index={i} />)}
        </div>
        <div className="h-12" />
      </div>
      <Footer />
      <AIAssistantFloating />
    </main>
  );
}
export default App;
