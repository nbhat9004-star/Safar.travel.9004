import './circle.css';

const SITE = (process.env.NEXT_PUBLIC_BASE_URL || 'https://safarcurated.com').replace(/\/$/, '');

export const metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'Safar Circle — Create Journeys Worth Joining',
    template: '%s · Safar Circle',
  },
  description:
    'Plan incredible trips. Invite amazing people. Book everything through trusted Safar hosts. Safar Circle is a collaborative travel OS for India — curate a journey, share the invite, travel together.',
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
  authors: [{ name: 'Safar', url: SITE }],
  creator: 'Safar',
  publisher: 'Safar',
  alternates: {
    canonical: '/circle',
  },
  category: 'travel',
  openGraph: {
    type: 'website',
    siteName: 'Safar Circle',
    title: 'Safar Circle — Create Journeys Worth Joining',
    description:
      'Plan incredible trips. Invite amazing people. Book everything through trusted Safar hosts.',
    url: '/circle',
    locale: 'en_IN',
    images: [
      { url: '/og-default.jpg', width: 1200, height: 630, alt: 'Safar Circle — Create Journeys Worth Joining' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Safar Circle — Create Journeys Worth Joining',
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

export default function CircleLayout({ children }) {
  // Structured data for the Safar Circle root — helps Google surface it as a
  // travel/social product. Kept lightweight (WebSite + Organization).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE}/circle#website`,
        url: `${SITE}/circle`,
        name: 'Safar Circle',
        description:
          'Collaborative travel OS — curate journeys, invite friends, book through trusted Safar hosts.',
        inLanguage: 'en-IN',
        publisher: { '@id': `${SITE}#org` },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE}#org`,
        name: 'Safar',
        url: SITE,
        logo: `${SITE}/og-default.jpg`,
        sameAs: ['https://twitter.com/SafarKashmir'],
      },
    ],
  };
  return (
    <div className="circle-root min-h-screen">
      {/* Structured data for search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
