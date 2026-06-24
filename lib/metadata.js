// Shared metadata utilities for Open Graph and social sharing

export function generateSafarMetadata({
  title,
  description,
  image,
  url,
  type = 'website',
  price,
  location,
}) {
  const siteName = 'Safar - Kashmir Curated';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://safarcurated.com';
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl;
  const ogImage = image || `${baseUrl}/og-default.jpg`;

  return {
    title: title ? `${title} | Safar` : siteName,
    description: description || 'Discover curated stays, experiences, guides, and rentals across Kashmir',
    openGraph: {
      title: title || siteName,
      description: description || 'Discover curated stays, experiences, guides, and rentals across Kashmir',
      url: fullUrl,
      siteName: siteName,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title || 'Safar Kashmir',
        },
      ],
      locale: 'en_US',
      type: type,
      ...(price && { 
        product: {
          price: { amount: price, currency: 'INR' }
        }
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: title || siteName,
      description: description || 'Discover curated stays, experiences, guides, and rentals across Kashmir',
      images: [ogImage],
      creator: '@SafarKashmir',
    },
    ...(location && {
      other: {
        'og:locality': location,
        'og:region': 'Kashmir',
        'og:country-name': 'India',
      }
    }),
  };
}
