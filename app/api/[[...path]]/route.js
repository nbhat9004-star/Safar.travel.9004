import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import {
  hashPassword, verifyPassword, signToken,
  setAuthCookie, clearAuthCookie, getCurrentUser,
  publicUser, requireRole, ROLES,
} from '@/lib/auth';
import { getCollection, ensureIndexes } from '@/lib/db';
import { LISTINGS as DEMO_LISTINGS } from '@/lib/data';

const json = (data, status = 200) => NextResponse.json(data, { status });
const ok = (data = {}, status = 200) => json({ ok: true, ...data }, status);
const err = (message, status = 400) => json({ ok: false, error: message }, status);
const isEmail = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const readBody = async (request) => { try { return await request.json(); } catch { return {}; } };

const CATEGORIES = ['stay','transport','experience','tour'];
const STATUSES = ['pending','approved','rejected'];

// ---------- Seeding: ensure demo listings exist (idempotent) ----------
let _seeded = false;
async function seedDemoListings() {
  if (_seeded) return;
  const listings = await getCollection('listings');
  const count = await listings.countDocuments();
  if (count === 0) {
    const now = new Date();
    const seedDocs = DEMO_LISTINGS.map((l) => ({
      id: l.id,
      title: l.title,
      description: `Authentic ${l.category} in ${l.location} — hosted by ${l.host?.name || 'Safar Host'}.`,
      category: ['houseboat','cabin','cottage','home','camp'].includes(l.category) ? 'stay' : (l.category === 'tour' ? 'tour' : (l.category === 'transport' ? 'transport' : 'experience')),
      subcategory: l.category,
      location: l.location,
      price: l.price,
      images: l.gallery && l.gallery.length ? l.gallery : [l.image],
      hostId: 'demo-host',
      hostName: l.host?.name || 'Safar Host',
      hostAvatar: l.host?.avatar || null,
      superhost: !!l.host?.superhost,
      amenities: l.amenities || [],
      services: l.services || [],
      badge: l.badge || null,
      rating: l.rating,
      reviews: l.reviews,
      duration: l.duration || null,
      beds: l.beds || null,
      baths: l.baths || null,
      guests: l.guests || null,
      status: 'approved',
      featured: !!l.featured,
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    }));
    try { await listings.insertMany(seedDocs, { ordered: false }); } catch {}
  }
  await listings.createIndex({ id: 1 }, { unique: true });
  await listings.createIndex({ hostId: 1, status: 1 });
  await listings.createIndex({ status: 1, category: 1 });
  _seeded = true;
}

const sanitizeListing = (l) => {
  if (!l) return null;
  const { _id, ...rest } = l;
  return rest;
};

async function route(request, { params }) {
  await ensureIndexes();
  await seedDemoListings();
  const segments = params?.path || [];
  const path = '/' + segments.join('/');
  const method = request.method.toUpperCase();
  const url = new URL(request.url);

  // ---------- AUTH ----------
  if (path === '/auth/register' && method === 'POST') {
    const { name, email, password, role } = await readBody(request);
    if (!name || typeof name !== 'string' || name.trim().length < 2) return err('Name is required (min 2 chars)');
    if (!isEmail(email)) return err('Valid email is required');
    if (!password || password.length < 6) return err('Password must be at least 6 characters');
    const userRole = ROLES.includes(role) && role !== 'admin' ? role : 'traveler';
    const users = await getCollection('users');
    const existing = await users.findOne({ email: email.toLowerCase() });
    if (existing) return err('An account with this email already exists', 409);
    const user = {
      id: uuid(), name: name.trim(), email: email.toLowerCase(), role: userRole,
      passwordHash: await hashPassword(password),
      avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0F3D2E`,
      createdAt: new Date(), updatedAt: new Date(),
    };
    await users.insertOne(user);
    const token = signToken({ uid: user.id, role: user.role });
    const res = ok({ user: publicUser(user), token });
    return setAuthCookie(res, token);
  }
  if (path === '/auth/login' && method === 'POST') {
    const { email, password } = await readBody(request);
    if (!isEmail(email)) return err('Valid email is required');
    if (!password) return err('Password is required');
    const users = await getCollection('users');
    const user = await users.findOne({ email: email.toLowerCase() });
    if (!user) return err('Invalid email or password', 401);
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return err('Invalid email or password', 401);
    const token = signToken({ uid: user.id, role: user.role });
    const res = ok({ user: publicUser(user), token });
    return setAuthCookie(res, token);
  }
  if (path === '/auth/logout' && method === 'POST') {
    return clearAuthCookie(ok({ message: 'Logged out' }));
  }
  if (path === '/auth/me' && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me) return err('Not authenticated', 401);
    return ok({ user: publicUser(me) });
  }

  // ---------- ROLE-GUARDED USER ENDPOINTS ----------
  if (path === '/users' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const users = await getCollection('users');
    const list = await users.find({}, { projection: { passwordHash: 0, _id: 0 } }).sort({ createdAt: -1 }).limit(200).toArray();
    return ok({ users: list });
  }
  if (path === '/host/me' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['host','admin']); if (!g.ok) return err(g.error, g.status);
    return ok({ user: publicUser(me) });
  }
  if (path === '/traveler/me' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['traveler','host','admin']); if (!g.ok) return err(g.error, g.status);
    return ok({ user: publicUser(me) });
  }

  // ---------- LISTINGS ----------
  // GET /api/listings  (public, default status=approved; admin may pass status=all/pending/rejected)
  if (path === '/listings' && method === 'GET') {
    const me = await getCurrentUser(request);
    const listings = await getCollection('listings');
    const category = url.searchParams.get('category');     // stay|transport|experience|tour
    const subcategory = url.searchParams.get('subcategory'); // houseboat|cabin|...
    const location = url.searchParams.get('location');
    const minPrice = parseInt(url.searchParams.get('minPrice') || '0', 10);
    const maxPrice = parseInt(url.searchParams.get('maxPrice') || '0', 10);
    const services = (url.searchParams.get('services') || '').split(',').filter(Boolean);
    const requestedStatus = url.searchParams.get('status'); // approved|pending|rejected|all
    const hostId = url.searchParams.get('hostId');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1);

    const filter = {};
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (minPrice) filter.price = { ...(filter.price || {}), $gte: minPrice };
    if (maxPrice) filter.price = { ...(filter.price || {}), $lte: maxPrice };
    if (services.length) filter.services = { $all: services };
    if (hostId) filter.hostId = hostId;

    // Status visibility rules
    if (requestedStatus && requestedStatus !== 'all') {
      filter.status = requestedStatus;
    } else if (requestedStatus === 'all') {
      if (!me || me.role !== 'admin') filter.status = 'approved';
    } else {
      filter.status = 'approved';
    }

    const total = await listings.countDocuments(filter);
    const docs = await listings.find(filter, { projection: { _id: 0 } })
      .sort({ featured: -1, createdAt: -1 })
      .skip((page - 1) * limit).limit(limit).toArray();
    return ok({ listings: docs, total, page, limit });
  }

  // POST /api/listings  (host/admin)
  if (path === '/listings' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['host','admin']); if (!g.ok) return err(g.error, g.status);
    const body = await readBody(request);
    const { title, description, category, subcategory, location, price, images, amenities, services, duration } = body;
    if (!title || title.trim().length < 3) return err('Title is required (min 3 chars)');
    if (!description || description.trim().length < 10) return err('Description is required (min 10 chars)');
    if (!CATEGORIES.includes(category)) return err(`Category must be one of: ${CATEGORIES.join(', ')}`);
    if (!location || !location.trim()) return err('Location is required');
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return err('Price must be a positive number');
    const imgs = Array.isArray(images) ? images.filter((s) => typeof s === 'string' && s.length) : [];

    const now = new Date();
    const doc = {
      id: uuid(),
      title: title.trim(),
      description: description.trim(),
      category, subcategory: subcategory || null,
      location: location.trim(),
      price: priceNum,
      images: imgs,
      hostId: me.id,
      hostName: me.name,
      hostAvatar: me.avatar || null,
      superhost: false,
      amenities: Array.isArray(amenities) ? amenities : [],
      services: Array.isArray(services) ? services : [],
      duration: duration || null,
      badge: null,
      rating: 0,
      reviews: 0,
      status: me.role === 'admin' ? 'approved' : 'pending',
      featured: false,
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };
    const col = await getCollection('listings');
    await col.insertOne(doc);
    return ok({ listing: sanitizeListing(doc) }, 201);
  }

  // GET /api/listings/host/me  -> all listings for current host (any status)
  if (path === '/listings/host/me' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['host','admin']); if (!g.ok) return err(g.error, g.status);
    const col = await getCollection('listings');
    const docs = await col.find({ hostId: me.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    return ok({ listings: docs });
  }

  // GET /api/listings/host/:hostId
  if (segments[0] === 'listings' && segments[1] === 'host' && segments[2] && method === 'GET') {
    const hostId = segments[2];
    const me = await getCurrentUser(request);
    const col = await getCollection('listings');
    const filter = { hostId };
    if (!me || (me.role !== 'admin' && me.id !== hostId)) filter.status = 'approved';
    const docs = await col.find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    return ok({ listings: docs });
  }

  // /listings/:id endpoints
  if (segments[0] === 'listings' && segments[1] && !['host'].includes(segments[1])) {
    const id = segments[1];
    const action = segments[2]; // approve | reject | undefined
    const col = await getCollection('listings');

    if (!action && method === 'GET') {
      const me = await getCurrentUser(request);
      const doc = await col.findOne({ id }, { projection: { _id: 0 } });
      if (!doc) return err('Listing not found', 404);
      if (doc.status !== 'approved') {
        if (!me || (me.role !== 'admin' && me.id !== doc.hostId)) return err('Listing not found', 404);
      }
      return ok({ listing: doc });
    }

    if (!action && method === 'PUT') {
      const me = await getCurrentUser(request);
      if (!me) return err('Authentication required', 401);
      const doc = await col.findOne({ id });
      if (!doc) return err('Listing not found', 404);
      if (me.role !== 'admin' && me.id !== doc.hostId) return err('Forbidden', 403);
      const body = await readBody(request);
      const update = {};
      const allowed = ['title','description','category','subcategory','location','price','images','amenities','services','duration','badge'];
      for (const k of allowed) if (body[k] !== undefined) update[k] = body[k];
      if (update.price !== undefined) {
        const p = Number(update.price); if (!Number.isFinite(p) || p <= 0) return err('Invalid price');
        update.price = p;
      }
      if (update.category && !CATEGORIES.includes(update.category)) return err('Invalid category');
      // hosts editing a listing reset to pending re-approval (admins keep status)
      if (me.role !== 'admin') update.status = 'pending';
      update.updatedAt = new Date();
      await col.updateOne({ id }, { $set: update });
      const fresh = await col.findOne({ id }, { projection: { _id: 0 } });
      return ok({ listing: fresh });
    }

    if (!action && method === 'DELETE') {
      const me = await getCurrentUser(request);
      if (!me) return err('Authentication required', 401);
      const doc = await col.findOne({ id });
      if (!doc) return err('Listing not found', 404);
      if (me.role !== 'admin' && me.id !== doc.hostId) return err('Forbidden', 403);
      await col.deleteOne({ id });
      return ok({ deleted: true });
    }

    // PATCH /listings/:id/status  (admin only) — alternative
    if (action === 'status' && method === 'PATCH') {
      const me = await getCurrentUser(request);
      const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
      const { status, reason } = await readBody(request);
      if (!STATUSES.includes(status)) return err('Invalid status');
      const update = { status, updatedAt: new Date() };
      if (status === 'rejected' && reason) update.rejectionReason = reason;
      const r = await col.updateOne({ id }, { $set: update });
      if (!r.matchedCount) return err('Listing not found', 404);
      const fresh = await col.findOne({ id }, { projection: { _id: 0 } });
      return ok({ listing: fresh });
    }

    // POST /listings/:id/approve  (admin)
    if (action === 'approve' && method === 'POST') {
      const me = await getCurrentUser(request);
      const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
      const r = await col.updateOne({ id }, { $set: { status: 'approved', updatedAt: new Date() }, $unset: { rejectionReason: '' } });
      if (!r.matchedCount) return err('Listing not found', 404);
      const fresh = await col.findOne({ id }, { projection: { _id: 0 } });
      return ok({ listing: fresh });
    }

    // POST /listings/:id/reject  (admin)
    if (action === 'reject' && method === 'POST') {
      const me = await getCurrentUser(request);
      const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
      const { reason } = await readBody(request);
      const r = await col.updateOne({ id }, { $set: { status: 'rejected', rejectionReason: reason || 'Not approved', updatedAt: new Date() } });
      if (!r.matchedCount) return err('Listing not found', 404);
      const fresh = await col.findOne({ id }, { projection: { _id: 0 } });
      return ok({ listing: fresh });
    }
  }

  // Health
  if (path === '/health' || path === '/' || path === '') {
    return ok({ service: 'Safar API', message: 'Online' });
  }

  return err(`Not found: ${method} ${path}`, 404);
}

export const GET = route;
export const POST = route;
export const PUT = route;
export const PATCH = route;
export const DELETE = route;
