import { Inter, Poppins } from 'next/font/google';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';
import './circle.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
  preload: true,
});

const SITE = (process.env.NEXT_PUBLIC_BASE_URL || 'https://circle.safarcurated.com').replace(/\/$/, '');
const CURATED = (process.env.NEXT_PUBLIC_CURATED_URL || 'https://safarcurated.com').replace(/\/$/, '');

export const metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'Safar Circle \u2014 Create Journeys Worth Joining',
    template: '%s \u00b7 Safar Circle',
  },
  description:
    'Plan incredible trips. Invite amazing people. Book everything through trusted Safar hosts. Safar Circle is a collaborative travel OS for India \u2014 curate a journey, share the invite, travel together.',
  applicationName: 'Safar Circle',
  keywords: [
    'Safar Circle',
    'collaborative travel',
    'group trip planner',
    'Kashmir travel',
    'India journeys',
    'travel with friends',
    'trip curator',
    'AI itinerary',
  ],
  authors: [{ name: 'Safar', url: CURATED }],
  creator: 'Safar',
  publisher: 'Safar',
  alternates: {
    canonical: '/',
  },
  category: 'travel',
  openGraph: {
    type: 'website',
    siteName: 'Safar Circle',
    title: 'Safar Circle \u2014 Create Journeys Worth Joining',
    description:
      'Plan incredible trips. Invite amazing people. Book everything through trusted Safar hosts.',
    url: '/',
    locale: 'en_IN',
    images: [
      { url: '/og-default.jpg', width: 1200, height: 630, alt: 'Safar Circle \u2014 Create Journeys Worth Joining' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Safar Circle \u2014 Create Journeys Worth Joining',
    description:
      'Plan incredible trips. Invite amazing people. Book through trusted Safar hosts.',
    creator: '@SafarKashmir',
    images: ['/og-default.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport = {
  themeColor: '#06080f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE}#website`,
        url: SITE,
        name: 'Safar Circle',
        description:
          'Collaborative travel OS \u2014 curate journeys, invite friends, book through trusted Safar hosts.',
        inLanguage: 'en-IN',
        publisher: { '@id': `${CURATED}#org` },
      },
      {
        '@type': 'Organization',
        '@id': `${CURATED}#org`,
        name: 'Safar',
        url: CURATED,
        logo: `${CURATED}/og-default.jpg`,
        sameAs: ['https://twitter.com/SafarKashmir'],
      },
    ],
  };

  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://images.pexels.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
        <link rel="dns-prefetch" href="https://api.razorpay.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans">
        <AuthProvider>
          <div className="circle-root min-h-screen">
            {children}
          </div>
        </AuthProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
