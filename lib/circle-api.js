// Safar Circle — client API helpers. Reuses safar_token cookie via credentials:'include'.

async function apiJson(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    const msg = data.error || `Request failed (${res.status})`;
    const e = new Error(msg); e.status = res.status; throw e;
  }
  return data;
}

export const circleApi = {
  // Journeys
  createJourney: (payload) => apiJson('/api/circle/journeys', { method: 'POST', body: JSON.stringify(payload) }),
  updateJourney: (id, payload) => apiJson(`/api/circle/journeys/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteJourney: (id) => apiJson(`/api/circle/journeys/${id}`, { method: 'DELETE' }),
  setVisibility: (id, visibility, scheduledFor = null) =>
    apiJson(`/api/circle/journeys/${id}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ visibility, scheduledFor }),
    }),
  // Publishing helpers — thin wrappers over setVisibility for clarity.
  publishJourney: (id) => apiJson(`/api/circle/journeys/${id}/visibility`, { method: 'PATCH', body: JSON.stringify({ visibility: 'public' }) }),
  unpublishJourney: (id) => apiJson(`/api/circle/journeys/${id}/visibility`, { method: 'PATCH', body: JSON.stringify({ visibility: 'draft' }) }),
  archiveJourney: (id) => apiJson(`/api/circle/journeys/${id}/visibility`, { method: 'PATCH', body: JSON.stringify({ visibility: 'archived' }) }),
  discover: (params = {}) => {
    const qp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qp.set(k, String(v)); });
    return apiJson(`/api/circle/journeys${qp.toString() ? '?' + qp.toString() : ''}`);
  },
  mine: () => apiJson('/api/circle/journeys/mine'),
  getById: (id) => apiJson(`/api/circle/journeys/id/${id}`),
  getBySlug: (slug) => apiJson(`/api/circle/journeys/slug/${slug}`),

  // Marketplace live proxy
  marketplace: (params = {}) => {
    const qp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qp.set(k, String(v)); });
    return apiJson(`/api/circle/marketplace${qp.toString() ? '?' + qp.toString() : ''}`);
  },

  // Estimator
  estimate: (payload) => apiJson('/api/circle/estimate', { method: 'POST', body: JSON.stringify(payload) }),

  // Passport
  passport: () => apiJson('/api/circle/passport'),

  // Module 2 — Collaboration Engine (members & requests)
  getMembers: (id) => apiJson(`/api/circle/journeys/${id}/members`),
  requestJoin: (id, payload = {}) => apiJson(`/api/circle/journeys/${id}/join`, { method: 'POST', body: JSON.stringify(payload) }),
  cancelRequest: (id) => apiJson(`/api/circle/journeys/${id}/cancel-request`, { method: 'POST' }),
  leaveJourney: (id) => apiJson(`/api/circle/journeys/${id}/leave`, { method: 'POST' }),
  memberAction: (id, memberId, action) =>
    apiJson(`/api/circle/journeys/${id}/members/${memberId}/${action}`, { method: 'POST' }),
  updateSettings: (id, payload) => apiJson(`/api/circle/journeys/${id}/settings`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // Module 3 — Collaborative Planning
  dashboard: (id) => apiJson(`/api/circle/journeys/${id}/dashboard`),
  // Itinerary
  getItinerary: (id) => apiJson(`/api/circle/journeys/${id}/itinerary`),
  addBlock: (id, payload) => apiJson(`/api/circle/journeys/${id}/itinerary/blocks`, { method: 'POST', body: JSON.stringify(payload) }),
  updateBlock: (id, blockId, payload) => apiJson(`/api/circle/journeys/${id}/itinerary/blocks/${blockId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteBlock: (id, blockId) => apiJson(`/api/circle/journeys/${id}/itinerary/blocks/${blockId}`, { method: 'DELETE' }),
  // Checklist
  getChecklist: (id) => apiJson(`/api/circle/journeys/${id}/checklist`),
  addChecklistItem: (id, payload) => apiJson(`/api/circle/journeys/${id}/checklist`, { method: 'POST', body: JSON.stringify(payload) }),
  updateChecklistItem: (id, itemId, payload) => apiJson(`/api/circle/journeys/${id}/checklist/${itemId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteChecklistItem: (id, itemId) => apiJson(`/api/circle/journeys/${id}/checklist/${itemId}`, { method: 'DELETE' }),
  // Polls
  getPolls: (id) => apiJson(`/api/circle/journeys/${id}/polls`),
  createPoll: (id, payload) => apiJson(`/api/circle/journeys/${id}/polls`, { method: 'POST', body: JSON.stringify(payload) }),
  votePoll: (id, pollId, optionId) => apiJson(`/api/circle/journeys/${id}/polls/${pollId}/vote`, { method: 'POST', body: JSON.stringify({ optionId }) }),
  closePoll: (id, pollId) => apiJson(`/api/circle/journeys/${id}/polls/${pollId}/close`, { method: 'PATCH' }),
  deletePoll: (id, pollId) => apiJson(`/api/circle/journeys/${id}/polls/${pollId}`, { method: 'DELETE' }),
  // Chat
  getChat: (id, params = {}) => {
    const qp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qp.set(k, String(v)); });
    return apiJson(`/api/circle/journeys/${id}/chat${qp.toString() ? '?' + qp.toString() : ''}`);
  },
  sendChat: (id, text) => apiJson(`/api/circle/journeys/${id}/chat`, { method: 'POST', body: JSON.stringify({ text }) }),
  deleteChatMessage: (id, messageId) => apiJson(`/api/circle/journeys/${id}/chat/${messageId}`, { method: 'DELETE' }),
  // Gallery
  getGallery: (id) => apiJson(`/api/circle/journeys/${id}/gallery`),
  uploadImage: (id, payload) => apiJson(`/api/circle/journeys/${id}/gallery`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteImage: (id, imageId) => apiJson(`/api/circle/journeys/${id}/gallery/${imageId}`, { method: 'DELETE' }),

  // Module 6 — Timeline, Announcements, Invites, Studio Aggregates
  getTimeline: (id, limit = 100) => apiJson(`/api/circle/journeys/${id}/timeline?limit=${limit}`),
  postAnnouncement: (id, payload) => apiJson(`/api/circle/journeys/${id}/announcements`, { method: 'POST', body: JSON.stringify(payload) }),
  inviteMember: (id, payload) => apiJson(`/api/circle/journeys/${id}/invite`, { method: 'POST', body: JSON.stringify(payload) }),
  studioRequests: () => apiJson(`/api/circle/studio/requests`),
  studioMembers: () => apiJson(`/api/circle/studio/members`),
  studioMessages: () => apiJson(`/api/circle/studio/messages`),
  studioTimeline: (limit = 100) => apiJson(`/api/circle/studio/timeline?limit=${limit}`),
};

export const THEMES = [
  { key: 'adventure', label: 'Adventure', emoji: '🏔', hint: 'Trek, raft, chase peaks' },
  { key: 'luxury', label: 'Luxury', emoji: '✨', hint: 'Slow, sumptuous stays' },
  { key: 'photography', label: 'Photography', emoji: '📸', hint: 'Golden hour hunts' },
  { key: 'family', label: 'Family', emoji: '👨‍👩‍👧', hint: 'Kid-safe wonder' },
  { key: 'food', label: 'Food', emoji: '🍲', hint: 'Wazwan & bakeries' },
  { key: 'spiritual', label: 'Spiritual', emoji: '🕉', hint: 'Shrines & silence' },
  { key: 'bike_expedition', label: 'Bike Expedition', emoji: '🏍', hint: 'Ladakh & Zanskar' },
  { key: 'backpacking', label: 'Backpacking', emoji: '🎒', hint: 'Lean & long' },
  { key: 'weekend_escape', label: 'Weekend Escape', emoji: '🌿', hint: '48 hours, done right' },
  { key: 'road_trip', label: 'Road Trip', emoji: '🚙', hint: 'Windows down' },
];

export const DIFFICULTY = [
  { key: 'easy', label: 'Easy' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'challenging', label: 'Challenging' },
  { key: 'expert', label: 'Expert' },
];

export const LANGUAGES = ['English', 'Hindi', 'Urdu', 'Kashmiri', 'Punjabi', 'Ladakhi', 'Tamil', 'Bengali'];

// Indian destinations (Kashmir focus, expandable). International reserved for future.
export const INDIA_DESTINATIONS = [
  { name: 'Srinagar', district: 'Srinagar', state: 'J&K', lat: 34.0837, lng: 74.7973 },
  { name: 'Gulmarg', district: 'Baramulla', state: 'J&K', lat: 34.0484, lng: 74.3805 },
  { name: 'Pahalgam', district: 'Anantnag', state: 'J&K', lat: 34.0154, lng: 75.3312 },
  { name: 'Sonamarg', district: 'Ganderbal', state: 'J&K', lat: 34.3057, lng: 75.2934 },
  { name: 'Leh', district: 'Leh', state: 'Ladakh', lat: 34.1526, lng: 77.5771 },
  { name: 'Kargil', district: 'Kargil', state: 'Ladakh', lat: 34.5539, lng: 76.1349 },
  { name: 'Manali', district: 'Kullu', state: 'HP', lat: 32.2432, lng: 77.1892 },
  { name: 'Rishikesh', district: 'Dehradun', state: 'UK', lat: 30.0869, lng: 78.2676 },
  { name: 'Jaipur', district: 'Jaipur', state: 'RJ', lat: 26.9124, lng: 75.7873 },
  { name: 'Udaipur', district: 'Udaipur', state: 'RJ', lat: 24.5854, lng: 73.7125 },
  { name: 'Munnar', district: 'Idukki', state: 'KL', lat: 10.0889, lng: 77.0595 },
  { name: 'Goa', district: 'North Goa', state: 'GA', lat: 15.2993, lng: 74.1240 },
];

export function themeLabel(key) {
  return THEMES.find(t => t.key === key) || { key, label: key, emoji: '✨' };
}

export function formatINR(n) {
  const num = Number(n) || 0;
  return '₹' + num.toLocaleString('en-IN');
}

// Build a sign-in URL for the SafarCurated auth flow that returns the user back
// to `returnPath` after successful authentication. Used by Safar Circle pages
// so users land back on the Circle screen (e.g. /circle/create) they came from.
export function signInHref(returnPath) {
  const safe = safeReturnUrl(returnPath) || '/circle';
  return `/?auth=1&returnUrl=${encodeURIComponent(safe)}`;
}

// Validate a redirect destination to prevent open-redirect attacks.
// Accepts only same-origin, relative paths starting with a single slash.
export function safeReturnUrl(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim();
  // Must start with a single `/` — reject `//host`, `/\host`, protocol URLs, etc.
  if (!s.startsWith('/')) return null;
  if (s.startsWith('//') || s.startsWith('/\\')) return null;
  if (/^\/+[a-z][a-z0-9+.-]*:/i.test(s)) return null; // e.g. `/http:` weirdness
  // Strip any auth-modal reopen params to avoid loops
  try {
    const url = new URL(s, 'http://x');
    url.searchParams.delete('auth');
    url.searchParams.delete('returnUrl');
    const qs = url.searchParams.toString();
    return url.pathname + (qs ? '?' + qs : '') + (url.hash || '');
  } catch {
    return s;
  }
}

// Client-side deep-link builders for Journey Sharing.
export function shareLinks({ url, title, description }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title || 'Join my Journey on Safar Circle');
  const d = encodeURIComponent(description || '');
  return {
    whatsapp: `https://wa.me/?text=${t}%20${u}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
    instagram: url, // IG has no web-share intent, users paste in story
    qr: `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${u}&bgcolor=ffffff&color=0F3D2E`,
    copy: url,
  };
}

// ---------------------------------------------------------------- //
// Module 4 — Payments (shared with Safar Curated via /api/payments) //
// ---------------------------------------------------------------- //
export const paymentsApi = {
  activeGateway: () => apiJson('/api/payments/active-gateway'),
  createOrder: (payload) => apiJson('/api/payments/create-order', { method: 'POST', body: JSON.stringify(payload) }),
  verify: (payload) => apiJson('/api/payments/verify', { method: 'POST', body: JSON.stringify(payload) }),
  mine: () => apiJson('/api/payments/mine'),
  payAndJoin: (journeyId, payload) =>
    apiJson(`/api/circle/journeys/${journeyId}/pay-and-join`, { method: 'POST', body: JSON.stringify(payload) }),
};

// Lazy-loads the Razorpay Checkout script once. Safe to call multiple times.
export function loadRazorpayCheckout() {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve(window.Razorpay);
    s.onerror = () => reject(new Error('Failed to load Razorpay Checkout'));
    document.head.appendChild(s);
  });
}

/**
 * Opens Razorpay checkout for the current user and resolves with the verified
 * server-side payment. Handles order creation, checkout UI, verification and
 * user-cancellation gracefully. Never trusts client-side signatures — always
 * verifies on the server.
 *
 * @param {object} args
 * @param {number} args.amount        Amount in INR (rupees).
 * @param {string} args.purpose       'circle_join' | 'booking' | 'other'
 * @param {string} [args.refId]       Reference id (e.g. journeyId, bookingId).
 * @param {string} [args.name]        Display name.
 * @param {string} [args.description] Checkout description line.
 * @param {object} [args.prefill]     { email, contact, name }
 * @param {object} [args.theme]       { color }
 * @returns {Promise<object>} verified payment { orderId, paymentId, amount, ... }
 */
export async function openRazorpayCheckout({
  amount, purpose = 'other', refId = null, name = 'Safar', description = '', prefill = {}, theme = {},
} = {}) {
  const Razorpay = await loadRazorpayCheckout();
  const order = await paymentsApi.createOrder({ amount, purpose, refId, currency: 'INR' });
  return await new Promise((resolve, reject) => {
    const opts = {
      key: order.keyId,
      order_id: order.orderId,
      amount: order.rzpAmount,
      currency: order.currency,
      name,
      description: description || 'Safar payment',
      prefill,
      theme: { color: '#0F3D2E', ...theme },
      handler: async (response) => {
        try {
          const verified = await paymentsApi.verify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          resolve({ ...verified, ...response });
        } catch (e) { reject(e); }
      },
      modal: {
        ondismiss: () => reject(Object.assign(new Error('Payment cancelled by user'), { code: 'CANCELLED' })),
      },
    };
    const rzp = new Razorpay(opts);
    rzp.on('payment.failed', (resp) => {
      const desc = resp?.error?.description || 'Payment failed';
      reject(Object.assign(new Error(desc), { code: 'FAILED', detail: resp?.error }));
    });
    rzp.open();
  });
}
