// PWA manifest — Next.js file convention. Automatically served at /manifest.webmanifest
// and referenced via <link rel="manifest"> injected by the framework.
export default function manifest() {
  return {
    name: 'Safar Curated — Kashmir',
    short_name: 'Safar',
    description: 'Discover curated stays, experiences, guides, and rentals across Kashmir.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0F766E',
    orientation: 'portrait',
    scope: '/',
    lang: 'en',
    categories: ['travel', 'lifestyle', 'business'],
    icons: [
      { src: '/icon.svg',       sizes: 'any',       type: 'image/svg+xml', purpose: 'any' },
      { src: '/apple-icon.svg', sizes: '180x180',   type: 'image/svg+xml', purpose: 'any maskable' },
      { src: '/icon',           sizes: '32x32',     type: 'image/png' },
      { src: '/icon',           sizes: '192x192',   type: 'image/png' },
      { src: '/icon',           sizes: '512x512',   type: 'image/png', purpose: 'any maskable' },
    ],
  };
}
