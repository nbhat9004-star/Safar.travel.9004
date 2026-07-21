import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';

export const metadata = {
  title: 'Trips — Safar Curated',
  description: 'Create your own trip or join someone else’s journey. Plan, share and split expenses — with Safar Curated.',
};

// -------------------------------------------------------------------
// Explore V2 — Community Trip Planning & Shared Travel
// Uses the standard Safar Navbar + Footer for full visual continuity
// with the rest of the app (bright white / green / gold). The former
// dark ExploreShell + AuroraBg have been retired.
// -------------------------------------------------------------------
export default function ExploreLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="bg-white text-charcoal min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
