import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/lib/auth-context';

// PERF: Only load the Inter weights actually used in the UI (body uses 400, UI accents use 500/600/700).
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

// PERF: Reduced Poppins from 5 weights (400/500/600/700/800) to 3 (500/600/700).
// Codebase audit: 0 uses of font-extrabold (800) on display headings; 3 of font-normal (400 - handled by Inter body).
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
  preload: true,
});

export const metadata = {
  title: 'Safar — Experience Kashmir Like a Local',
  description: 'Book authentic Kashmir stays, houseboats, cabins, transport and AI-planned itineraries. Premium tourism marketplace for Kashmir, India.',
  keywords: ['Kashmir tourism','Srinagar houseboats','Gulmarg cabins','Pahalgam cottages','AI trip planner','Safar'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://safarcurated.com'),
  openGraph: {
    title: 'Safar — Experience Kashmir Like a Local',
    description: 'Discover curated stays, experiences, guides, and rentals across Kashmir',
    url: '/',
    siteName: 'Safar - Kashmir Curated',
    images: [
      {
        url: '/og-default.jpg',
        width: 1200,
        height: 630,
        alt: 'Safar Kashmir - Curated Travel Experiences',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Safar — Experience Kashmir Like a Local',
    description: 'Discover curated stays, experiences, guides, and rentals across Kashmir',
    creator: '@SafarKashmir',
    images: ['/og-default.jpg'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://images.pexels.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.pexels.com" />
        {/* Razorpay checkout script — DNS-prefetch keeps first-paint fast; the script itself is lazy-loaded only when the user opens the payment sheet. */}
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
        <link rel="dns-prefetch" href="https://api.razorpay.com" />
        <link rel="dns-prefetch" href="https://api.dicebear.com" />
      </head>
      <body className="font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
