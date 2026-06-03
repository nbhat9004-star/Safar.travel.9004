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
    // Date-range + guests for availability-aware search
    const checkInStr = url.searchParams.get('checkIn');
    const checkOutStr = url.searchParams.get('checkOut');
    const guestsParam = parseInt(url.searchParams.get('guests') || '0', 10);

    const filter = {};
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (minPrice) filter.price = { ...(filter.price || {}), $gte: minPrice };
    if (maxPrice) filter.price = { ...(filter.price || {}), $lte: maxPrice };
    if (services.length) filter.services = { $all: services };
    if (hostId) filter.hostId = hostId;
    // Guests filter: listing must accommodate at least the requested guests (when the
    // listing defines a `guests` capacity; experiences/tours often don't)
    if (guestsParam > 0) {
      filter.$or = [
        { guests: { $exists: false } },
        { guests: null },
        { guests: { $gte: guestsParam } },
      ];
    }

    // Status visibility rules
    if (requestedStatus && requestedStatus !== 'all') {
      filter.status = requestedStatus;
    } else if (requestedStatus === 'all') {
      if (!me || me.role !== 'admin') filter.status = 'approved';
    } else {
      filter.status = 'approved';
    }

    // Availability-aware search: if date range supplied, exclude listings with overlapping
    // confirmed/pending bookings in that window.
    let unavailableIds = [];
    if (checkInStr && checkOutStr) {
      const ci = new Date(checkInStr);
      const co = new Date(checkOutStr);
      if (!isNaN(ci) && !isNaN(co) && co > ci) {
        const bookings = await getCollection('bookings');
        
        // Get all listings that match other filters first
        const candidateListings = await listings.find(filter, { projection: { id: 1, inventoryTypes: 1 } }).toArray();
        
        unavailableIds = [];
        for (const listing of candidateListings) {
          const hasTypes = listing.inventoryTypes && Array.isArray(listing.inventoryTypes) && listing.inventoryTypes.length > 0;
          
          if (!hasTypes) {
            // LEGACY SINGLE-UNIT: Check if ANY booking exists
            const overlap = await bookings.findOne({
              listingId: listing.id,
              status: { $in: ['pending', 'approved'] },
              checkInDate: { $lt: co },
              checkOutDate: { $gt: ci },
            });
            if (overlap) {
              unavailableIds.push(listing.id);
            }
          } else {
            // MULTI-TYPE: Check if ALL types are fully booked
            let hasAvailability = false;
            const activeTypes = listing.inventoryTypes.filter(t => t.status === 'active');
            
            for (const type of activeTypes) {
              const bookedCount = await bookings.countDocuments({
                listingId: listing.id,
                inventoryTypeId: type.id,
                status: { $in: ['pending', 'approved'] },
                checkInDate: { $lt: co },
                checkOutDate: { $gt: ci },
              });
              
              if (type.quantity > bookedCount) {
                hasAvailability = true;
                break;
              }
            }
            
            if (!hasAvailability) {
              unavailableIds.push(listing.id);
            }
          }
        }
        
        if (unavailableIds.length) filter.id = { $nin: unavailableIds };
      }
    }

    const total = await listings.countDocuments(filter);
    const docs = await listings.find(filter, { projection: { _id: 0 } })
      .sort({ featured: -1, createdAt: -1 })
      .skip((page - 1) * limit).limit(limit).toArray();
    
    // Calculate displayPrice (lowest active type price or listing price)
    docs.forEach(listing => {
      if (listing.inventoryTypes && listing.inventoryTypes.length > 0) {
        const activePrices = listing.inventoryTypes
          .filter(t => t.status === 'active')
          .map(t => t.price);
        if (activePrices.length > 0) {
          listing.displayPrice = Math.min(...activePrices);
        } else {
          listing.displayPrice = listing.price;
        }
      } else {
        listing.displayPrice = listing.price;
      }
    });
    
    return ok({ listings: docs, total, page, limit });
  }

  // POST /api/listings  (host/admin)
  if (path === '/listings' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['host','admin']); if (!g.ok) return err(g.error, g.status);
    const body = await readBody(request);
    const { title, description, category, subcategory, location, price, images, amenities, services, duration, inventoryTypes } = body;
    if (!title || title.trim().length < 3) return err('Title is required (min 3 chars)');
    if (!description || description.trim().length < 10) return err('Description is required (min 10 chars)');
    if (!CATEGORIES.includes(category)) return err(`Category must be one of: ${CATEGORIES.join(', ')}`);
    if (!location || !location.trim()) return err('Location is required');
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return err('Price must be a positive number');
    const imgs = Array.isArray(images) ? images.filter((s) => typeof s === 'string' && s.length) : [];

    // Process inventory types if provided
    let processedTypes = [];
    if (inventoryTypes && Array.isArray(inventoryTypes) && inventoryTypes.length > 0) {
      let order = 0;
      for (const type of inventoryTypes) {
        if (!type.name || type.name.trim().length < 2) {
          return err('Inventory type name is required (min 2 chars)');
        }
        const typePrice = Number(type.price);
        if (!Number.isFinite(typePrice) || typePrice <= 0) {
          return err(`Invalid price for type "${type.name}"`);
        }
        const quantity = Number(type.quantity);
        if (!Number.isFinite(quantity) || quantity < 1) {
          return err(`Quantity must be at least 1 for type "${type.name}"`);
        }
        
        processedTypes.push({
          id: uuid(),
          name: type.name.trim(),
          description: type.description || '',
          price: typePrice,
          quantity,
          available: quantity,
          images: Array.isArray(type.images) ? type.images.filter(s => typeof s === 'string' && s.length) : [],
          status: type.status === 'inactive' ? 'inactive' : 'active',
          displayOrder: type.displayOrder !== undefined ? Number(type.displayOrder) : order++,
          beds: type.beds || null,
          guests: type.guests || null,
          amenities: Array.isArray(type.amenities) ? type.amenities : [],
        });
      }
      // Sort by displayOrder
      processedTypes.sort((a, b) => a.displayOrder - b.displayOrder);
    }

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
      inventoryTypes: processedTypes,
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
      const allowed = ['title','description','category','subcategory','location','price','images','amenities','services','duration','badge','inventoryTypes'];
      for (const k of allowed) if (body[k] !== undefined) update[k] = body[k];
      if (update.price !== undefined) {
        const p = Number(update.price); if (!Number.isFinite(p) || p <= 0) return err('Invalid price');
        update.price = p;
      }
      if (update.category && !CATEGORIES.includes(update.category)) return err('Invalid category');
      
      // Process inventory types if provided
      if (update.inventoryTypes !== undefined) {
        if (!Array.isArray(update.inventoryTypes)) {
          return err('inventoryTypes must be an array');
        }
        const processedTypes = [];
        let order = 0;
        for (const type of update.inventoryTypes) {
          if (!type.name || type.name.trim().length < 2) {
            return err('Inventory type name is required (min 2 chars)');
          }
          const typePrice = Number(type.price);
          if (!Number.isFinite(typePrice) || typePrice <= 0) {
            return err(`Invalid price for type "${type.name}"`);
          }
          const quantity = Number(type.quantity);
          if (!Number.isFinite(quantity) || quantity < 1) {
            return err(`Quantity must be at least 1 for type "${type.name}"`);
          }
          
          processedTypes.push({
            id: type.id || uuid(),
            name: type.name.trim(),
            description: type.description || '',
            price: typePrice,
            quantity,
            available: type.available !== undefined ? Number(type.available) : quantity,
            images: Array.isArray(type.images) ? type.images.filter(s => typeof s === 'string' && s.length) : [],
            status: type.status === 'inactive' ? 'inactive' : 'active',
            displayOrder: type.displayOrder !== undefined ? Number(type.displayOrder) : order++,
            beds: type.beds || null,
            guests: type.guests || null,
            amenities: Array.isArray(type.amenities) ? type.amenities : [],
          });
        }
        processedTypes.sort((a, b) => a.displayOrder - b.displayOrder);
        update.inventoryTypes = processedTypes;
      }
      
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

    // GET /listings/:id/availability  (public)
    // Returns the list of pending/approved booking date ranges for a listing
    // so the booking calendar UI can disable those days.
    if (action === 'availability' && method === 'GET') {
      const bookings = await getCollection('bookings');
      const ranges = await bookings.find(
        { listingId: id, status: { $in: ['pending', 'approved'] } },
        { projection: { _id: 0, checkInDate: 1, checkOutDate: 1, status: 1 } }
      ).toArray();
      return ok({
        listingId: id,
        bookedRanges: ranges.map((r) => ({
          checkInDate: r.checkInDate,
          checkOutDate: r.checkOutDate,
          status: r.status,
        })),
      });
    }
  }

  // ---------- BOOKINGS ----------
  // POST /api/bookings (traveler creates a booking request)
  if (path === '/bookings' && method === 'POST') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    const { listingId, checkInDate, checkOutDate, guests, inventoryTypeId } = await readBody(request);
    if (!listingId) return err('listingId is required');
    const ci = new Date(checkInDate), co = new Date(checkOutDate);
    if (isNaN(ci) || isNaN(co)) return err('Invalid dates');
    if (ci < new Date(new Date().toDateString())) return err('Check-in must be in the future');
    if (co <= ci) return err('Check-out must be after check-in');
    const g = Number(guests);
    if (!Number.isFinite(g) || g < 1 || g > 30) return err('Guests must be between 1 and 30');

    const listings = await getCollection('listings');
    const listing = await listings.findOne({ id: listingId });
    if (!listing || listing.status !== 'approved') return err('Listing not available for booking', 404);

    // Determine inventory type and pricing
    let selectedType = null;
    let pricePerNight = listing.price;
    let bookingImage = (listing.images && listing.images[0]) || null;

    const hasInventoryTypes = listing.inventoryTypes && Array.isArray(listing.inventoryTypes) && listing.inventoryTypes.length > 0;

    if (hasInventoryTypes) {
      // MULTI-TYPE LISTING: Must select a type
      if (!inventoryTypeId) {
        return err('Please select a room/vehicle type', 400);
      }
      selectedType = listing.inventoryTypes.find(t => t.id === inventoryTypeId);
      if (!selectedType) {
        return err('Invalid inventory type selected', 400);
      }
      if (selectedType.status === 'inactive') {
        return err(`${selectedType.name} is currently unavailable`, 400);
      }
      pricePerNight = selectedType.price;
      bookingImage = (selectedType.images && selectedType.images[0]) || bookingImage;

      // Check availability for this specific type
      const bookings = await getCollection('bookings');
      const bookedCount = await bookings.countDocuments({
        listingId,
        inventoryTypeId,
        status: { $in: ['pending', 'approved'] },
        checkInDate: { $lt: co },
        checkOutDate: { $gt: ci },
      });

      const available = selectedType.quantity - bookedCount;
      if (available < 1) {
        return err(`No ${selectedType.name} available for these dates. ${available === 0 ? 'All units are booked.' : 'Try different dates or another type.'}`, 409);
      }
    } else {
      // LEGACY SINGLE-UNIT LISTING: Use old overlap logic
      const bookings = await getCollection('bookings');
      const overlap = await bookings.findOne({
        listingId,
        status: { $in: ['pending', 'approved'] },
        checkInDate: { $lt: co },
        checkOutDate: { $gt: ci },
      });
      if (overlap) {
        return err('These dates overlap with an existing booking. Please pick other dates.', 409);
      }
    }

    // Create booking
    const bookings = await getCollection('bookings');
    const nights = Math.max(1, Math.round((co - ci) / 86400000));
    const totalPrice = pricePerNight * nights;
    const doc = {
      bookingId: uuid(),
      listingId,
      listingTitle: listing.title,
      listingImage: bookingImage,
      travelerId: me.id,
      travelerName: me.name,
      travelerEmail: me.email,
      hostId: listing.hostId,
      hostName: listing.hostName || 'Safar Host',
      checkInDate: ci,
      checkOutDate: co,
      guests: g,
      nights,
      pricePerNight,
      totalPrice,
      status: 'pending',
      inventoryTypeId: inventoryTypeId || null,
      inventoryTypeName: selectedType?.name || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await bookings.insertOne(doc);

    // Update available counter (if multi-type)
    if (selectedType) {
      await listings.updateOne(
        { id: listingId, 'inventoryTypes.id': inventoryTypeId },
        { $inc: { 'inventoryTypes.$.available': -1 } }
      );
    }

    const { _id, ...rest } = doc;
    return ok({ booking: rest }, 201);
  }

  // GET /api/bookings  (auth-aware: traveler->own, host->received, admin->all; ?role=traveler|host to disambiguate)
  if (path === '/bookings' && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    const view = url.searchParams.get('view'); // 'mine' | 'received' | 'all'
    const bookings = await getCollection('bookings');
    let filter = {};
    if (me.role === 'admin' && view === 'all') filter = {};
    else if (view === 'received' || me.role === 'host') filter = { hostId: me.id };
    else filter = { travelerId: me.id };
    // Travelers can only see their own; hosts default to received
    if (me.role === 'traveler') filter = { travelerId: me.id };
    const docs = await bookings.find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(200).toArray();
    return ok({ bookings: docs });
  }

  // PATCH /api/bookings/:id  (host approve/reject; traveler cancel)
  if (segments[0] === 'bookings' && segments[1] && method === 'PATCH') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    const id = segments[1];
    const { status } = await readBody(request);
    if (!['approved','rejected','cancelled'].includes(status)) return err('Invalid status');
    const bookings = await getCollection('bookings');
    const b = await bookings.findOne({ bookingId: id });
    if (!b) return err('Booking not found', 404);
    // Permissions
    const isAdmin = me.role === 'admin';
    const isHost = me.id === b.hostId;
    const isTraveler = me.id === b.travelerId;
    if (status === 'cancelled' && !(isTraveler || isAdmin)) return err('Forbidden', 403);
    if ((status === 'approved' || status === 'rejected') && !(isHost || isAdmin)) return err('Forbidden', 403);
    
    // Update booking status
    await bookings.updateOne({ bookingId: id }, { $set: { status, updatedAt: new Date() } });
    
    // Restore inventory counter if booking is cancelled or rejected
    if ((status === 'cancelled' || status === 'rejected') && b.inventoryTypeId) {
      const listings = await getCollection('listings');
      await listings.updateOne(
        { id: b.listingId, 'inventoryTypes.id': b.inventoryTypeId },
        { $inc: { 'inventoryTypes.$.available': 1 } }
      );
    }
    
    const fresh = await bookings.findOne({ bookingId: id }, { projection: { _id: 0 } });
    return ok({ booking: fresh });
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
