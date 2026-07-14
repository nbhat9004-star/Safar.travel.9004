/**
 * /sitemap.xml — served at /sitemap.xml via Next.js file-based convention.
 * Emits static marketing routes + top public Safar Circle destinations, and
 * appends the most-recently-published public journeys. Fails gracefully if
 * the DB is unreachable (returns static routes only).
 */
import { getCollection } from '@/lib/db';

const STATIC_ROUTES = [
  { path: '', priority: 1.0, changeFrequency: 'daily' },
  { path: '/explore', priority: 0.85, changeFrequency: 'daily' },
  { path: '/guides', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/about', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/host-guide', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/host-tips', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/trust-safety', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/cancellation-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
];

export default async function sitemap() {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://safarcurated.com').replace(/\/$/, '');
  const now = new Date();
  const entries = STATIC_ROUTES.map(r => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Append public Safar Circle journeys (best-effort). Never crash the sitemap.
  // Circle now lives on a separate origin (circle.safarcurated.com); include a
  // link to the Circle site root and skip per-journey deep-links (owned by
  // the Circle app's own sitemap).
  try {
    const circleBase = (process.env.NEXT_PUBLIC_CIRCLE_URL || 'https://circle.safarcurated.com').replace(/\/$/, '');
    entries.push({
      url: circleBase,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.95,
    });

    // Approved public listings (property pages)
    const listings = await getCollection('listings');
    const listingDocs = await listings
      .find({ status: 'approved' }, { projection: { id: 1, slug: 1, updatedAt: 1 } })
      .sort({ updatedAt: -1 })
      .limit(500)
      .toArray();
    for (const l of listingDocs) {
      const key = l.slug || l.id;
      if (!key) continue;
      entries.push({
        url: `${base}/property/${key}`,
        lastModified: l.updatedAt || now,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  } catch (e) {
    // DB unreachable — return static routes only. Logged for observability.
    console.warn('sitemap: dynamic routes skipped —', e?.message || e);
  }
  return entries;
}
