'use client';

/**
 * PWALayer — global, additive PWA enhancements. Rendered once in the root
 * layout. It does two things and nothing else:
 *   1. Registers the service worker (/sw.js) for offline + instant repeat loads.
 *   2. Shows a premium branded launch splash ONLY when the app is opened as an
 *      installed PWA (display-mode: standalone). It is intentionally NOT shown
 *      in the normal browser so it never affects web Lighthouse / LCP.
 * The splash is CSS-only (no heavy images) and auto-dismisses in ~1s.
 */
import { useEffect, useState } from 'react';

export default function PWALayer() {
  const [showSplash, setShowSplash] = useState(false);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // --- Service worker registration (safe: never caches /api) ---
    if ('serviceWorker' in navigator) {
      const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
      if (document.readyState === 'complete') register();
      else window.addEventListener('load', register, { once: true });
    }

    // --- Branded splash only for the installed (standalone) app ---
    let standalone = false;
    try {
      standalone =
        window.matchMedia?.('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
    } catch (e) { /* noop */ }

    if (standalone) {
      setShowSplash(true);
      const fadeT = setTimeout(() => setFade(true), 850);
      const hideT = setTimeout(() => setShowSplash(false), 1250);
      return () => { clearTimeout(fadeT); clearTimeout(hideT); };
    }
  }, []);

  if (!showSplash) return null;

  return (
    <div
      aria-hidden="true"
      className={`pwa-splash ${fade ? 'pwa-splash--hide' : ''}`}
    >
      <div className="pwa-splash__inner">
        <div className="pwa-splash__logo">
          {/* Uses the existing Safar icon (served by Next at /icon.svg) */}
          <img src="/icon.svg" alt="" width={84} height={84} />
        </div>
        <div className="pwa-splash__wordmark">
          <span className="pwa-splash__title">Safar</span>
          <span className="pwa-splash__sub">CURATED</span>
        </div>
        <p className="pwa-splash__tagline">Experience Kashmir Like a Local</p>
        <span className="pwa-splash__bar"><i /></span>
      </div>
    </div>
  );
}
