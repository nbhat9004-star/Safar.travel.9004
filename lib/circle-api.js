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
