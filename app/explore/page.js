export const metadata = { title: 'Explore — Safar Curated' };

// Explore module is being redesigned. This placeholder keeps the /explore
// route reachable so navigation does not break. Backend APIs (circle/journeys,
// join requests, chat, notifications, rewards, profile, admin) remain intact.
export default function ExplorePlaceholder() {
  return (
    <main className="min-h-screen bg-slate-50 grid place-items-center px-6 py-24">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto size-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center shadow-lg shadow-violet-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-slate-900">Explore</h1>
        <p className="mt-2 text-[15px] text-slate-500 leading-relaxed">This module is being redesigned.<br/>Check back soon for the new experience.</p>
        <a href="/" className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-slate-900 hover:bg-black text-white text-sm font-semibold px-5 py-2.5 transition">Back to Home</a>
      </div>
    </main>
  );
}
