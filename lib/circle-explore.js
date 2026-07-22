// Thin adapter over existing /api/circle/* backend for Explore module.
// Reuses: circle_journeys, circle_members, notifications, listings.

const THEME_TO_TYPE = {
  adventure: 'TREK',
  road_trip: 'ROAD TRIP',
  weekend_escape: 'WEEKEND',
  backpacking: 'BACKPACKING',
  bike_expedition: 'BIKE',
  luxury: 'LUXURY',
  spiritual: 'PILGRIMAGE',
  photography: 'ADVENTURE',
  family: 'WEEKEND',
  food: 'ADVENTURE',
};

const SLUG_TO_THEME = {
  treks: 'adventure',
  road: 'road_trip',
  weekend: 'weekend_escape',
  backpacking: 'backpacking',
  bike: 'bike_expedition',
  luxury: 'luxury',
  pilgrimage: 'spiritual',
  beach: 'weekend_escape',
  camping: 'adventure',
  international: 'adventure',
  upcoming: null,
  all: null,
};

const TYPE_TO_SLUG = {
  TREK: 'treks',
  'ROAD TRIP': 'road',
  WEEKEND: 'weekend',
  BACKPACKING: 'backpacking',
  BIKE: 'bike',
  LUXURY: 'luxury',
  PILGRIMAGE: 'pilgrimage',
  ADVENTURE: 'treks',
};

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Turn API journey doc → card shape used by TripCard/pages
export function journeyToTrip(j) {
  const start = j.startDate ? fmtDate(j.startDate) : '';
  const end = j.endDate ? fmtDate(j.endDate) : '';
  const type = THEME_TO_TYPE[j.theme] || 'ADVENTURE';
  const mode = j.hostMode || (j.services?.length ? 'safar' : 'self');
  return {
    id: j.id,
    slug: j.slug,
    title: j.name,
    type,
    typeSlug: TYPE_TO_SLUG[type] || 'treks',
    destination: [j.destination?.name, j.destination?.state].filter(Boolean).join(', ') || j.destination?.name || 'India',
    start, end,
    dateRange: start && end ? `${start} \u2013 ${end}` : (start || 'Dates TBD'),
    days: j.startDate && j.endDate ? Math.max(1, Math.ceil((new Date(j.endDate) - new Date(j.startDate)) / 86400000)) : null,
    hostName: j.curatorName || 'Host',
    hostAvatar: j.curatorAvatar || `https://i.pravatar.cc/60?u=${encodeURIComponent(j.curatorId || j.id)}`,
    hostVerified: mode !== 'self',
    joined: j.membersAccepted || 0,
    capacity: j.maxMembers || 6,
    difficulty: j.difficulty || 'Moderate',
    price: j.budget || 0,
    free: !j.budget,
    mode,
    cover: j.cover || 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200&q=80',
    gallery: [],
    description: j.description || '',
    highlights: [
      j.startDate && j.endDate ? `${Math.ceil((new Date(j.endDate) - new Date(j.startDate)) / 86400000)} Days` : null,
      j.difficulty ? `Difficulty: ${j.difficulty}` : null,
      j.maxMembers ? `Group of ${j.maxMembers}` : null,
      mode === 'safar' ? 'Verified by Safar' : mode === 'local' ? 'Hosted by Local Expert' : null,
    ].filter(Boolean),
    itinerary: [],
    verifiedServices: (j.services || []).map(s => s.category || s.title).filter(Boolean),
    raw: j,
  };
}

async function jf(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export async function fetchTrips({ typeSlug, destination, difficulty } = {}) {
  const qp = new URLSearchParams();
  const theme = typeSlug ? SLUG_TO_THEME[typeSlug] : null;
  if (theme) qp.set('theme', theme);
  if (destination) qp.set('destination', destination);
  if (difficulty) qp.set('difficulty', difficulty);
  qp.set('limit', '30');
  const data = await jf(`/api/circle/journeys?${qp.toString()}`);
  return (data.journeys || []).map(journeyToTrip);
}

export async function fetchMyTrips() {
  const data = await jf('/api/circle/journeys/mine');
  return (data.journeys || []).map(journeyToTrip);
}

export async function fetchTrip(id) {
  const data = await jf(`/api/circle/journeys/id/${encodeURIComponent(id)}`);
  return data.journey ? journeyToTrip(data.journey) : null;
}

export async function createTrip(payload) {
  const data = await jf('/api/circle/journeys', { method: 'POST', body: JSON.stringify(payload) });
  return data.journey;
}

export async function requestToJoin(id, { seats = 1, message = '' } = {}) {
  return jf(`/api/circle/journeys/${encodeURIComponent(id)}/join`, {
    method: 'POST',
    body: JSON.stringify({ seats, message }),
  });
}

export async function fetchReceivedRequests() {
  const data = await jf('/api/circle/studio/requests');
  return data.requests || data.members || [];
}

export async function decideRequest(journeyId, memberId, action) {
  // action: 'accept' | 'decline'
  return jf(`/api/circle/journeys/${encodeURIComponent(journeyId)}/members/${encodeURIComponent(memberId)}/${action}`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export { SLUG_TO_THEME };
