import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import {
  hashPassword, verifyPassword, signToken,
  setAuthCookie, clearAuthCookie, getCurrentUser,
  publicUser, requireRole, ROLES,
} from '@/lib/auth';
import { getCollection, ensureIndexes } from '@/lib/db';
import { LISTINGS as DEMO_LISTINGS } from '@/lib/data';
import {
  sendWelcomeEmail,
  sendVerificationEmail,
  sendBookingConfirmation,
  sendBookingNotificationToHost,
  sendBookingCancellationEmail,
  sendBookingApprovedEmail,
  sendBookingRejectedEmail,
  sendInvoiceEmail,
  sendContactFormEmail,
  sendPasswordResetEmail,
} from '@/lib/email';
import { verifyFirebaseToken } from '@/lib/firebase-admin';

// Note: OpenAI SDK not used - using fetch API directly for Emergent LLM compatibility

const json = (data, status = 200) => NextResponse.json(data, { status });
const ok = (data = {}, status = 200) => json({ ok: true, ...data }, status);
const err = (message, status = 400) => json({ ok: false, error: message }, status);
const isEmail = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const readBody = async (request) => { try { return await request.json(); } catch { return {}; } };

// Activity Logging Helper
async function logActivity(admin, action, details, ipAddress = null) {
  try {
    const logs = await getCollection('adminActivityLogs');
    await logs.insertOne({
      id: uuid(),
      adminId: admin.id,
      adminName: admin.name,
      adminRole: admin.role,
      action,
      details,
      ipAddress,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

const CATEGORIES = ['stay','transport','experience','tour'];
const STATUSES = ['pending','approved','rejected'];

// ---------- Email verification helpers ----------
async function generateVerificationToken() {
  const crypto = await import('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  return { token, expiry };
}

function buildVerificationLink(token) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || '';
  return `${base}/auth/verify-email?token=${token}`;
}

// Returns { ok:true } if user can perform email-gated actions.
// Email/password users must have emailVerified=true. Phone-only (no email) users pass.
function requireVerifiedEmail(me) {
  if (!me) return { ok: false, status: 401, error: 'Authentication required' };
  if (me.email && !me.emailVerified) {
    return { ok: false, status: 403, error: 'Please verify your email address before continuing.' };
  }
  return { ok: true };
}

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
  
  // AUTO-INITIALIZE SUPER ADMIN ON ANY REQUEST (if not exists)
  try {
    const users = await getCollection('users');
    const superAdmin = await users.findOne({ email: 'founder@safarcurated.com' });
    if (!superAdmin) {
      console.log('🔧 Auto-creating Super Admin account...');
      await users.insertOne({
        id: uuid(),
        name: 'Founder',
        email: 'founder@safarcurated.com',
        passwordHash: await hashPassword('SuperAdmin@2025'),
        role: 'super_admin',
        status: 'active',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✅ Super Admin created: founder@safarcurated.com');
    }
  } catch (error) {
    console.error('Failed to auto-create super admin:', error);
  }
  
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
    const { token: verificationToken, expiry: verificationExpiry } = await generateVerificationToken();
    const user = {
      id: uuid(), name: name.trim(), email: email.toLowerCase(), role: userRole,
      passwordHash: await hashPassword(password),
      avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0F3D2E`,
      emailVerified: false,
      verificationToken,
      verificationExpiry,
      createdAt: new Date(), updatedAt: new Date(),
    };
    await users.insertOne(user);
    const token = signToken({ uid: user.id, role: user.role });

    // Enhanced logging for email verification flow
    console.log('=== EMAIL VERIFICATION FLOW START ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('User registered:', { email: user.email, name: user.name, role: user.role, id: user.id });
    console.log('Verification token generated:', verificationToken ? 'YES' : 'NO');
    console.log('Token expiry:', verificationExpiry);
    
    const verificationLink = buildVerificationLink(verificationToken);
    console.log('Verification link:', verificationLink);
    console.log('RESEND_API_KEY configured:', process.env.RESEND_API_KEY ? 'YES (length: ' + process.env.RESEND_API_KEY.length + ')' : 'NO - EMAIL WILL NOT SEND');
    console.log('FROM_EMAIL configured:', process.env.FROM_EMAIL || 'NOT SET - using default');
    console.log('Calling sendVerificationEmail...');
    
    // Send verification email (async with enhanced logging)
    sendVerificationEmail(user, verificationLink)
      .then((result) => {
        console.log('=== EMAIL SEND RESULT ===');
        console.log('Success:', result.success);
        if (result.success) {
          console.log('Email sent successfully! ID:', result.data?.id);
          console.log('Recipient:', user.email);
        } else {
          console.error('❌ EMAIL SEND FAILED:', result.error);
          console.error('Reason:', typeof result.error === 'object' ? JSON.stringify(result.error) : result.error);
        }
        console.log('=== EMAIL VERIFICATION FLOW END ===');
      })
      .catch((error) => {
        console.error('=== EMAIL SEND EXCEPTION ===');
        console.error('❌ Fatal error sending verification email:', error);
        console.error('Error stack:', error.stack);
        console.error('=== EMAIL VERIFICATION FLOW END ===');
      });

    const res = ok({ user: publicUser(user), token, message: 'Account created. Please check your email to verify your address.' });
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
  
  // POST /api/auth/forgot-password
  if (path === '/auth/forgot-password' && method === 'POST') {
    const { email } = await readBody(request);
    if (!isEmail(email)) return err('Valid email required');
    
    const users = await getCollection('users');
    const user = await users.findOne({ email: email.toLowerCase() });
    if (!user) return ok({ message: 'If email exists, reset link sent' });
    
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000);
    
    await users.updateOne(
      { id: user.id },
      { $set: { resetToken, resetTokenExpiry } }
    );
    
    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(user, resetLink);
    
    return ok({ message: 'If email exists, reset link sent' });
  }

  // POST /api/auth/reset-password
  if (path === '/auth/reset-password' && method === 'POST') {
    const { token, password } = await readBody(request);
    if (!token || !password) return err('Token and password required');
    if (password.length < 8) return err('Password must be at least 8 characters');
    
    const users = await getCollection('users');
    const user = await users.findOne({ 
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    });
    
    if (!user) return err('Invalid or expired reset token', 400);
    
    const hashedPassword = await hashPassword(password);
    await users.updateOne(
      { id: user.id },
      { 
        $set: { passwordHash: hashedPassword },
        $unset: { resetToken: '', resetTokenExpiry: '' }
      }
    );
    
    return ok({ message: 'Password reset successful' });
  }
  
  // GET /api/auth/verify-email?token=...
  if (path === '/auth/verify-email' && method === 'GET') {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    if (!token) return err('Verification token is required', 400);

    const users = await getCollection('users');
    const user = await users.findOne({ verificationToken: token });

    if (!user) {
      // Maybe already verified? Don't reveal more.
      return err('This verification link is invalid or has already been used.', 400);
    }
    if (user.emailVerified) {
      // Token still present but user already verified — clean up and respond gracefully
      await users.updateOne({ id: user.id }, { $unset: { verificationToken: '', verificationExpiry: '' } });
      return ok({ alreadyVerified: true, message: 'Your email is already verified.' });
    }
    if (!user.verificationExpiry || new Date(user.verificationExpiry) < new Date()) {
      return err('This verification link has expired. Please request a new one.', 400);
    }

    await users.updateOne(
      { id: user.id },
      {
        $set: { emailVerified: true, updatedAt: new Date() },
        $unset: { verificationToken: '', verificationExpiry: '' },
      }
    );

    // Send welcome email after successful verification (async)
    sendWelcomeEmail({ ...user, emailVerified: true }).catch((error) => {
      console.error('Failed to send welcome email:', error);
    });

    return ok({ verified: true, message: 'Your email has been verified.' });
  }

  // POST /api/auth/resend-verification  { email }
  if (path === '/auth/resend-verification' && method === 'POST') {
    const { email } = await readBody(request);
    if (!isEmail(email)) return err('Valid email required');

    const users = await getCollection('users');
    const user = await users.findOne({ email: email.toLowerCase() });

    // Generic response to avoid account enumeration
    const generic = { message: 'If an unverified account exists for this email, a new verification link has been sent.' };
    if (!user) return ok(generic);
    if (user.emailVerified) return ok(generic);

    const { token: verificationToken, expiry: verificationExpiry } = await generateVerificationToken();
    await users.updateOne(
      { id: user.id },
      { $set: { verificationToken, verificationExpiry, updatedAt: new Date() } }
    );

    sendVerificationEmail({ ...user, name: user.name }, buildVerificationLink(verificationToken)).catch((error) => {
      console.error('Failed to resend verification email:', error);
    });

    return ok(generic);
  }

  if (path === '/auth/me' && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me) return err('Not authenticated', 401);
    return ok({ user: publicUser(me) });
  }

  // POST /api/auth/verify-phone - Firebase Phone Authentication
  if (path === '/auth/verify-phone' && method === 'POST') {
    const { idToken } = await readBody(request);
    if (!idToken) return err('Firebase ID token is required');
    
    // Verify token with Firebase Admin SDK
    const verification = await verifyFirebaseToken(idToken);
    if (!verification.success) return err('Invalid Firebase token', 401);
    
    const { phone } = verification;
    if (!phone) return err('Phone number not found in token', 400);
    
    const users = await getCollection('users');
    let user = await users.findOne({ phone });
    
    // Auto-create user if first time login
    if (!user) {
      const phoneDigits = phone.replace(/\D/g, '');
      user = {
        id: uuid(),
        name: `User ${phoneDigits.slice(-4)}`,
        phone,
        role: 'traveler',
        avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${phoneDigits}&backgroundColor=0F3D2E`,
        emailVerified: true, // phone OTP login — no email gate
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await users.insertOne(user);
      
      // Send welcome email if user has email (async, don't block)
      if (user.email) {
        sendWelcomeEmail(user).catch((error) => {
          console.error('Failed to send welcome email:', error);
        });
      }
    }
    
    // Return JWT token (same as email/password flow)
    const token = signToken({ uid: user.id, role: user.role });
    const res = ok({ user: publicUser(user), token });
    return setAuthCookie(res, token);
  }

  // POST /api/auth/verify-google - Firebase Google Authentication
  if (path === '/auth/verify-google' && method === 'POST') {
    const { idToken } = await readBody(request);
    if (!idToken) return err('Firebase ID token is required');
    
    // Verify token with Firebase Admin SDK
    const verification = await verifyFirebaseToken(idToken);
    if (!verification.success) return err('Invalid Firebase token', 401);
    
    const { uid } = verification;
    const decodedToken = await (await import('firebase-admin')).auth().verifyIdToken(idToken);
    const email = decodedToken.email;
    const name = decodedToken.name || email.split('@')[0];
    
    if (!email) return err('Email not found in token', 400);
    
    const users = await getCollection('users');
    let user = await users.findOne({ email: email.toLowerCase() });
    
    // Auto-create user if first time login
    if (!user) {
      user = {
        id: uuid(),
        name,
        email: email.toLowerCase(),
        role: 'traveler',
        avatar: decodedToken.picture || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0F3D2E`,
        emailVerified: true, // Google has already verified the email
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await users.insertOne(user);
      
      // Send welcome email (async, don't block)
      sendWelcomeEmail(user).catch((error) => {
        console.error('Failed to send welcome email:', error);
      });
    }
    
    // Return JWT token (same as email/password flow)
    const token = signToken({ uid: user.id, role: user.role });
    const res = ok({ user: publicUser(user), token });
    return setAuthCookie(res, token);
  }

  // ---------- ROLE-GUARDED USER ENDPOINTS ----------
  if (path === '/users' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const users = await getCollection('users');
    const listings = await getCollection('listings');
    const bookings = await getCollection('bookings');
    const list = await users.find({}, { projection: { passwordHash: 0, _id: 0 } }).sort({ createdAt: -1 }).limit(200).toArray();
    
    // Enrich with counts
    const enriched = await Promise.all(list.map(async (u) => {
      const listingCount = await listings.countDocuments({ hostId: u.id });
      const bookingCount = await bookings.countDocuments({ travelerId: u.id });
      return { ...u, listingCount, bookingCount };
    }));
    
    return ok({ users: enriched });
  }
  // PATCH /api/users/me - Update current user profile
  if (path === '/users/me' && method === 'PATCH') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    const { name, phone, avatar } = await readBody(request);
    const update = {};
    if (name && typeof name === 'string' && name.trim().length >= 2) {
      update.name = name.trim();
    }
    if (phone !== undefined) {
      // Validate phone number (basic validation)
      if (phone && typeof phone === 'string') {
        const cleaned = phone.replace(/[^\d+]/g, '');
        if (cleaned.length >= 10) {
          update.phone = cleaned;
        } else {
          return err('Invalid phone number format');
        }
      } else if (phone === null || phone === '') {
        update.phone = null;
      }
    }
    if (avatar && typeof avatar === 'string') {
      update.avatar = avatar;
    }
    if (Object.keys(update).length === 0) {
      return err('No valid fields to update');
    }
    update.updatedAt = new Date();
    const users = await getCollection('users');
    await users.updateOne({ id: me.id }, { $set: update });
    const fresh = await users.findOne({ id: me.id }, { projection: { passwordHash: 0, _id: 0 } });
    return ok({ user: fresh });
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

  // ---------- ADMIN USER MANAGEMENT ----------
  // POST /api/admin/users/:id/suspend
  if (segments[0] === 'admin' && segments[1] === 'users' && segments[2] && segments[3] === 'suspend' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const userId = segments[2];
    const users = await getCollection('users');
    const user = await users.findOne({ id: userId });
    if (!user) return err('User not found', 404);
    if (user.role === 'admin') return err('Cannot suspend admin users', 403);
    await users.updateOne({ id: userId }, { $set: { status: 'suspended', updatedAt: new Date() } });
    const fresh = await users.findOne({ id: userId }, { projection: { passwordHash: 0, _id: 0 } });
    return ok({ user: fresh });
  }

  // POST /api/admin/users/:id/reactivate
  if (segments[0] === 'admin' && segments[1] === 'users' && segments[2] && segments[3] === 'reactivate' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const userId = segments[2];
    const users = await getCollection('users');
    const user = await users.findOne({ id: userId });
    if (!user) return err('User not found', 404);
    await users.updateOne({ id: userId }, { $set: { status: 'active', updatedAt: new Date() }, $unset: { blacklisted: '' } });
    const fresh = await users.findOne({ id: userId }, { projection: { passwordHash: 0, _id: 0 } });
    return ok({ user: fresh });
  }

  // POST /api/admin/users/:id/blacklist
  if (segments[0] === 'admin' && segments[1] === 'users' && segments[2] && segments[3] === 'blacklist' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const userId = segments[2];
    const users = await getCollection('users');
    const user = await users.findOne({ id: userId });
    if (!user) return err('User not found', 404);
    if (user.role === 'admin') return err('Cannot blacklist admin users', 403);
    await users.updateOne({ id: userId }, { $set: { status: 'blacklisted', blacklisted: true, updatedAt: new Date() } });
    const fresh = await users.findOne({ id: userId }, { projection: { passwordHash: 0, _id: 0 } });
    return ok({ user: fresh });
  }

  // DELETE /api/admin/users/:id
  if (segments[0] === 'admin' && segments[1] === 'users' && segments[2] && method === 'DELETE') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const userId = segments[2];
    const users = await getCollection('users');
    const user = await users.findOne({ id: userId });
    if (!user) return err('User not found', 404);
    if (user.role === 'admin') return err('Cannot delete admin users', 403);
    await users.deleteOne({ id: userId });
    return ok({ deleted: true });
  }

  // PATCH /api/admin/users/:id/role
  if (segments[0] === 'admin' && segments[1] === 'users' && segments[2] && segments[3] === 'role' && method === 'PATCH') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const userId = segments[2];
    const { role } = await readBody(request);
    if (!ROLES.includes(role)) return err('Invalid role');
    const users = await getCollection('users');
    const user = await users.findOne({ id: userId });
    if (!user) return err('User not found', 404);
    await users.updateOne({ id: userId }, { $set: { role, updatedAt: new Date() } });
    const fresh = await users.findOne({ id: userId }, { projection: { passwordHash: 0, _id: 0 } });
    return ok({ user: fresh });
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
    const v = requireVerifiedEmail(me); if (!v.ok) return err(v.error, v.status);
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
      // Fetch host phone for WhatsApp integration
      if (doc.hostId) {
        const users = await getCollection('users');
        const host = await users.findOne({ id: doc.hostId }, { projection: { phone: 1, _id: 0 } });
        if (host && host.phone) {
          doc.hostPhone = host.phone;
        }
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

    // POST /listings/:id/suspend  (admin)
    if (action === 'suspend' && method === 'POST') {
      const me = await getCurrentUser(request);
      const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
      const r = await col.updateOne({ id }, { $set: { status: 'suspended', updatedAt: new Date() } });
      if (!r.matchedCount) return err('Listing not found', 404);
      const fresh = await col.findOne({ id }, { projection: { _id: 0 } });
      return ok({ listing: fresh });
    }

    // POST /listings/:id/activate  (admin)
    if (action === 'activate' && method === 'POST') {
      const me = await getCurrentUser(request);
      const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
      const r = await col.updateOne({ id }, { $set: { status: 'approved', updatedAt: new Date() } });
      if (!r.matchedCount) return err('Listing not found', 404);
      const fresh = await col.findOne({ id }, { projection: { _id: 0 } });
      return ok({ listing: fresh });
    }

    // PATCH /listings/:id/featured  (admin)
    if (action === 'featured' && method === 'PATCH') {
      const me = await getCurrentUser(request);
      const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
      const { featured } = await readBody(request);
      const r = await col.updateOne({ id }, { $set: { featured: !!featured, updatedAt: new Date() } });
      if (!r.matchedCount) return err('Listing not found', 404);
      const fresh = await col.findOne({ id }, { projection: { _id: 0 } });
      return ok({ listing: fresh });
    }
  }

  // ---------- BOOKINGS ----------
  // POST /api/bookings (traveler creates a booking request)
  if (path === '/bookings' && method === 'POST') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    const v = requireVerifiedEmail(me); if (!v.ok) return err(v.error, v.status);
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

    // Fetch host details for email
    const users = await getCollection('users');
    const traveler = await users.findOne({ id: me.id });
    const host = await users.findOne({ id: listing.hostId });

    // Send booking confirmation emails (async, don't block response)
    if (traveler) {
      sendBookingConfirmation(doc, traveler).catch((error) => {
        console.error('Failed to send booking confirmation to traveler:', error);
      });
    }
    if (host) {
      sendBookingNotificationToHost(doc, host).catch((error) => {
        console.error('Failed to send booking notification to host:', error);
      });
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
    const { status, reason } = await readBody(request);
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
    
    // Send appropriate emails based on status change
    const users = await getCollection('users');
    const traveler = await users.findOne({ id: b.travelerId });
    const host = await users.findOne({ id: b.hostId });
    
    if (status === 'approved' && traveler) {
      // Send approval email to traveler and invoice
      sendBookingApprovedEmail(fresh, traveler).catch((error) => {
        console.error('Failed to send booking approved email:', error);
      });
      
      // Generate and send invoice
      const invoiceId = `INV-${Date.now()}-${fresh.bookingId.slice(0, 8).toUpperCase()}`;
      sendInvoiceEmail(fresh, traveler, invoiceId).catch((error) => {
        console.error('Failed to send invoice email:', error);
      });
    } else if (status === 'rejected' && traveler) {
      // Send rejection email to traveler
      sendBookingRejectedEmail(fresh, traveler, reason).catch((error) => {
        console.error('Failed to send booking rejected email:', error);
      });
    } else if (status === 'cancelled') {
      // Send cancellation emails to both parties
      if (traveler) {
        sendBookingCancellationEmail(fresh, traveler, false).catch((error) => {
          console.error('Failed to send cancellation email to traveler:', error);
        });
      }
      if (host) {
        sendBookingCancellationEmail(fresh, host, true).catch((error) => {
          console.error('Failed to send cancellation email to host:', error);
        });
      }
    }
    
    return ok({ booking: fresh });
  }

  // POST /api/bookings/:id/send-invoice (send invoice email for existing booking)
  if (segments[0] === 'bookings' && segments[1] && segments[2] === 'send-invoice' && method === 'POST') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    const id = segments[1];
    
    const bookings = await getCollection('bookings');
    const booking = await bookings.findOne({ bookingId: id });
    if (!booking) return err('Booking not found', 404);
    
    // Only traveler or admin can request invoice
    if (booking.travelerId !== me.id && me.role !== 'admin') {
      return err('Forbidden', 403);
    }
    
    const users = await getCollection('users');
    const traveler = await users.findOne({ id: booking.travelerId });
    
    if (!traveler) return err('Traveler not found', 404);
    
    const invoiceId = `INV-${Date.now()}-${booking.bookingId.slice(0, 8).toUpperCase()}`;
    
    try {
      await sendInvoiceEmail(booking, traveler, invoiceId);
      return ok({ message: 'Invoice email sent successfully', invoiceId });
    } catch (error) {
      console.error('Failed to send invoice email:', error);
      return err('Failed to send invoice email', 500);
    }
  }

  // ---------- ADMIN BOOKING MANAGEMENT ----------
  // POST /api/admin/bookings/:id/cancel (admin cancel booking)
  if (segments[0] === 'admin' && segments[1] === 'bookings' && segments[2] && segments[3] === 'cancel' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const id = segments[2];
    const bookings = await getCollection('bookings');
    const booking = await bookings.findOne({ bookingId: id });
    if (!booking) return err('Booking not found', 404);
    await bookings.updateOne({ bookingId: id }, { $set: { status: 'cancelled', updatedAt: new Date() } });
    
    // Restore inventory
    if (booking.inventoryTypeId) {
      const listings = await getCollection('listings');
      await listings.updateOne(
        { id: booking.listingId, 'inventoryTypes.id': booking.inventoryTypeId },
        { $inc: { 'inventoryTypes.$.available': 1 } }
      );
    }
    
    const fresh = await bookings.findOne({ bookingId: id }, { projection: { _id: 0 } });
    return ok({ booking: fresh });
  }

  // POST /api/admin/bookings/:id/refund (admin refund booking)
  if (segments[0] === 'admin' && segments[1] === 'bookings' && segments[2] && segments[3] === 'refund' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const id = segments[2];
    const bookings = await getCollection('bookings');
    const booking = await bookings.findOne({ bookingId: id });
    if (!booking) return err('Booking not found', 404);
    await bookings.updateOne({ bookingId: id }, { $set: { refunded: true, updatedAt: new Date() } });
    const fresh = await bookings.findOne({ bookingId: id }, { projection: { _id: 0 } });
    return ok({ booking: fresh });
  }

  // ---------- ADMIN REVENUE DASHBOARD ----------
  // GET /api/admin/revenue
  if (path === '/admin/revenue' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const bookings = await getCollection('bookings');
    
    const allBookings = await bookings.find({ status: 'approved' }).toArray();
    const totalRevenue = allBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const todayBookings = await bookings.find({ 
      status: 'approved', 
      createdAt: { $gte: today, $lt: todayEnd } 
    }).toArray();
    const todayRevenue = todayBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthBookings = await bookings.find({ 
      status: 'approved', 
      createdAt: { $gte: monthStart } 
    }).toArray();
    const monthlyRevenue = monthBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    
    const pendingBookings = await bookings.find({ status: 'pending' }).toArray();
    const pendingPayments = pendingBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    
    const platformCommission = totalRevenue * 0.15; // 15% commission
    
    return ok({
      totalRevenue,
      todayRevenue,
      monthlyRevenue,
      pendingPayments,
      platformCommission,
    });
  }

  // GET /api/admin/transactions
  if (path === '/admin/transactions' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const bookings = await getCollection('bookings');
    const transactions = await bookings.find({ status: { $in: ['approved', 'pending'] } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    
    const formatted = transactions.map((t) => ({
      ...t,
      commission: (t.totalPrice || 0) * 0.15,
      hostPayout: (t.totalPrice || 0) * 0.85,
    }));
    
    return ok({ transactions: formatted });
  }

  // ---------- CONTACT FORM ----------
  // POST /api/contact  (public endpoint for contact form submissions)
  if (path === '/contact' && method === 'POST') {
    const { name, email, phone, subject, message } = await readBody(request);
    
    // Validate required fields
    if (!name || !name.trim() || name.trim().length < 2) {
      return err('Name is required (min 2 characters)');
    }
    if (!isEmail(email)) {
      return err('Valid email is required');
    }
    if (!message || !message.trim() || message.trim().length < 10) {
      return err('Message is required (min 10 characters)');
    }
    
    // Store contact form submission in database
    const contacts = await getCollection('contacts');
    const submission = {
      id: uuid(),
      name: name.trim(),
      email: email.toLowerCase(),
      phone: phone?.trim() || null,
      subject: subject?.trim() || 'General Inquiry',
      message: message.trim(),
      status: 'new',
      createdAt: new Date(),
    };
    
    await contacts.insertOne(submission);
    
    // Send email notification to admin (async)
    const formData = {
      name: submission.name,
      email: submission.email,
      phone: submission.phone,
      subject: submission.subject,
      message: submission.message,
    };
    
    sendContactFormEmail(formData).catch((error) => {
      console.error('Failed to send contact form notification:', error);
    });
    
    const { _id, ...rest } = submission;
    return ok({ contact: rest, message: 'Your message has been sent successfully' }, 201);
  }

  // POST /api/ai-wizard/chat - AI Listing Wizard Conversation
  if (path === '/ai-wizard/chat' && method === 'POST') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);

    const { message, conversationId, messages: conversationHistory } = await readBody(request);
    if (!message) return err('Message is required');

    try {
      // Build conversation context for OpenAI
      const systemPrompt = `You are Safar AI, a friendly and efficient listing assistant for Safar - a premium Kashmir tourism marketplace.

Your job is to help hosts create professional listings through natural conversation. You support:
- Accommodations: Hotels, Houseboats, Villas, Camps, Guest Houses
- Transport: Taxis, Car Rentals, Bike Rentals, Airport Transfers
- Tour Guides: Local guides with language and area expertise
- Experiences: Adventure activities, cultural experiences, local tours
- Rentals: Equipment, boats, vehicles

IMPORTANT GUIDELINES:
1. Detect user's preferred language (English, Urdu, Roman Kashmiri) and respond accordingly
2. Be conversational, warm, and encouraging
3. Ask ONE question at a time - don't overwhelm the host
4. Infer missing information when reasonable (e.g., if they say "houseboat in Dal Lake", assume location is Srinagar)
5. Collect these ESSENTIAL fields based on category:
   - ALL: name/title, category, location, price, description
   - Accommodations: rooms, capacity, amenities
   - Transport: vehicle type, capacity, service area
   - Guides: languages, experience, areas covered
   - Experiences: duration, difficulty, inclusions
6. After collecting essential info, generate a professional listing with:
   - SEO-optimized title (50-80 chars)
   - Engaging description (150-300 words)
   - 3-5 highlight points
   - Relevant tags
7. Show preview and ask for confirmation
8. When confirmed, return listing data in JSON format

Be helpful, efficient, and make the process feel easy!`;

      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        { role: 'user', content: message }
      ];

      // Use fetch API directly for Emergent LLM compatibility
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: chatMessages,
          temperature: 0.7,
          max_tokens: 600
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('OpenAI API error:', error);
        throw new Error(error.error?.message || 'AI request failed');
      }

      const completion = await response.json();
      const aiResponse = completion.choices[0].message.content;

      // Analyze progress and detect if listing is complete
      const isComplete = aiResponse.toLowerCase().includes('confirm') || 
                        aiResponse.toLowerCase().includes('looks good') ||
                        conversationHistory.length > 20;

      // Calculate progress (rough estimation based on conversation length)
      const progress = Math.min(Math.floor((conversationHistory.length / 10) * 100), 95);

      // Determine stage
      let stage = 'collecting';
      if (conversationHistory.length < 2) stage = 'greeting';
      if (conversationHistory.length > 8) stage = 'reviewing';

      return ok({
        response: aiResponse,
        progress,
        stage,
        conversationId
      });

    } catch (error) {
      console.error('AI Wizard chat error:', error);
      return err('Failed to process message. Please try again.');
    }
  }

  // POST /api/ai-wizard/finalize - Finalize and Save Listing
  if (path === '/ai-wizard/finalize' && method === 'POST') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    const v = requireVerifiedEmail(me); if (!v.ok) return err(v.error, v.status);

    const { listing, conversationId } = await readBody(request);
    if (!listing) return err('Listing data is required');

    try {
      // Extract listing data from AI conversation
      // Use OpenAI to parse and structure the listing
      const structurePrompt = `Extract structured listing data from this conversation summary and return ONLY valid JSON:

Conversation Summary: ${JSON.stringify(listing)}

Return this exact JSON structure (fill with extracted data):
{
  "title": "Professional SEO-optimized title (50-80 chars)",
  "category": "stay|transport|experience|tour",
  "location": "City, Kashmir",
  "price": 5000,
  "description": "Engaging 150-300 word description highlighting unique features and guest experience",
  "highlights": ["Feature 1", "Feature 2", "Feature 3"],
  "amenities": ["amenity1", "amenity2"] or [],
  "capacity": 4 or null,
  "rooms": 2 or null,
  "duration": "2 hours" or null,
  "tags": ["tag1", "tag2", "tag3"]
}

Be smart about inferring the category. Examples:
- Houseboat, Hotel, Villa, Camp → "stay"
- Taxi, Car, Bike → "transport"
- Guide, Tour → "tour"
- Activity, Experience → "experience"

Return ONLY the JSON, no other text.`;

      const structureCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: structurePrompt }],
        temperature: 0.3,
        max_tokens: 800
      });

      let structuredData;
      try {
        const jsonStr = structureCompletion.choices[0].message.content.trim();
        structuredData = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        return err('Failed to structure listing data');
      }

      // Create listing in database (reuse existing schema)
      const listings = await getCollection('listings');
      
      const newListing = {
        id: uuid(),
        ...structuredData,
        host: me.id,
        hostName: me.name,
        hostEmail: me.email,
        status: 'pending', // Requires admin approval
        views: 0,
        bookings: 0,
        rating: 0,
        reviews: 0,
        featured: false,
        images: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdVia: 'ai-wizard',
        conversationId
      };

      await listings.insertOne(newListing);

      // Update user role to host if not already
      if (me.role !== 'host' && me.role !== 'admin') {
        const users = await getCollection('users');
        await users.updateOne(
          { id: me.id },
          { $set: { role: 'host', updatedAt: new Date() } }
        );
      }

      const { _id, ...listingData } = newListing;
      return ok({ 
        listing: listingData,
        message: 'Listing created successfully and submitted for approval'
      }, 201);

    } catch (error) {
      console.error('AI Wizard finalize error:', error);
      return err('Failed to create listing. Please try again.');
    }
  }

  // ---------- REVIEWS ----------
  if (path === '/reviews' && method === 'POST') {
    const { propertyId, rating, reviewText } = await readBody(request);
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    if (!propertyId || !rating || rating < 1 || rating > 5) return err('Valid propertyId and rating (1-5) required');

    const reviews = await getCollection('reviews');
    const existing = await reviews.findOne({ propertyId, userId: me.id });
    if (existing) return err('You have already reviewed this property');

    const review = {
      id: uuid(),
      propertyId,
      userId: me.id,
      userName: me.name,
      rating: Number(rating),
      reviewText: reviewText || '',
      createdAt: new Date(),
    };
    await reviews.insertOne(review);
    const { _id, ...data } = review;
    return ok({ review: data }, 201);
  }

  if (path === '/reviews' && method === 'GET') {
    const { propertyId } = Object.fromEntries(new URL(request.url).searchParams);
    if (!propertyId) return err('propertyId required');
    
    const reviews = await getCollection('reviews');
    const allReviews = await reviews.find({ propertyId }).sort({ createdAt: -1 }).toArray();
    const reviewData = allReviews.map(({ _id, ...r }) => r);
    const avgRating = allReviews.length > 0 
      ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)
      : 0;
    
    return ok({ 
      reviews: reviewData,
      count: allReviews.length,
      averageRating: Number(avgRating),
    });
  }

  // ---------- WISHLIST ----------
  if (path === '/wishlist' && method === 'POST') {
    const { propertyId } = await readBody(request);
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    if (!propertyId) return err('propertyId required');

    const wishlists = await getCollection('wishlists');
    const existing = await wishlists.findOne({ userId: me.id, propertyId });
    if (existing) return err('Already in wishlist');

    const wishlist = {
      id: uuid(),
      userId: me.id,
      propertyId,
      createdAt: new Date(),
    };
    await wishlists.insertOne(wishlist);
    
    const count = await wishlists.countDocuments({ propertyId });
    const { _id, ...data } = wishlist;
    return ok({ wishlist: data, count }, 201);
  }

  if (path.startsWith('/wishlist/') && method === 'DELETE') {
    const propertyId = path.split('/')[2];
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);

    const wishlists = await getCollection('wishlists');
    const result = await wishlists.deleteOne({ userId: me.id, propertyId });
    if (result.deletedCount === 0) return err('Not in wishlist', 404);
    
    const count = await wishlists.countDocuments({ propertyId });
    return ok({ message: 'Removed from wishlist', count });
  }

  if (path === '/wishlist' && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);

    const wishlists = await getCollection('wishlists');
    const items = await wishlists.find({ userId: me.id }).sort({ createdAt: -1 }).toArray();
    const wishlistData = items.map(({ _id, ...w }) => w);
    return ok({ wishlist: wishlistData });
  }

  if (path === '/wishlist/check' && method === 'GET') {
    const { propertyId } = Object.fromEntries(new URL(request.url).searchParams);
    const me = await getCurrentUser(request);
    if (!me || !propertyId) return ok({ saved: false, count: 0 });

    const wishlists = await getCollection('wishlists');
    const saved = await wishlists.findOne({ userId: me.id, propertyId });
    const count = await wishlists.countDocuments({ propertyId });
    return ok({ saved: !!saved, count });
  }

  // Booking Status Update
  if (path.match(/^\/admin\/bookings\/([^/]+)\/status$/) && method === 'PATCH') {
    const bookingId = path.match(/^\/admin\/bookings\/([^/]+)\/status$/)[1];
    const me = await getCurrentUser(request);
    if (!me || me.role !== 'admin') return err('Unauthorized', 401);
    
    const { status } = await request.json();
    const bookings = await getCollection('bookings');
    await bookings.updateOne({ bookingId }, { $set: { status, updatedAt: new Date() } });
    return ok({ ok: true });
  }

  // Promo Codes CRUD
  if (path === '/admin/promos' && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me || me.role !== 'admin') return ok({ ok: true, promoCodes: [] });
    
    const promos = await getCollection('promoCodes');
    const promoCodes = await promos.find({}).sort({ createdAt: -1 }).toArray();
    return ok({ ok: true, promoCodes });
  }

  if (path === '/admin/promos' && method === 'POST') {
    const me = await getCurrentUser(request);
    if (!me || me.role !== 'admin') return err('Unauthorized', 401);
    
    const data = await request.json();
    const promos = await getCollection('promoCodes');
    const promo = {
      ...data,
      id: uuid(),
      createdAt: new Date(),
      createdBy: me.id,
      usedCount: 0,
    };
    await promos.insertOne(promo);
    return ok({ ok: true, promo });
  }

  if (path.match(/^\/admin\/promos\/([^/]+)$/) && method === 'PATCH') {
    const promoId = path.match(/^\/admin\/promos\/([^/]+)$/)[1];
    const me = await getCurrentUser(request);
    if (!me || me.role !== 'admin') return err('Unauthorized', 401);
    
    const updates = await request.json();
    const promos = await getCollection('promoCodes');
    await promos.updateOne({ id: promoId }, { $set: { ...updates, updatedAt: new Date() } });
    return ok({ ok: true });
  }

  if (path.match(/^\/admin\/promos\/([^/]+)$/) && method === 'DELETE') {
    const promoId = path.match(/^\/admin\/promos\/([^/]+)$/)[1];
    const me = await getCurrentUser(request);
    if (!me || me.role !== 'admin') return err('Unauthorized', 401);
    
    const promos = await getCollection('promoCodes');
    await promos.deleteOne({ id: promoId });
    return ok({ ok: true });
  }

  // Support Tickets CRUD
  if (path === '/admin/tickets' && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me || me.role !== 'admin') return ok({ ok: true, tickets: [] });
    
    const tickets = await getCollection('supportTickets');
    const allTickets = await tickets.find({}).sort({ createdAt: -1 }).toArray();
    return ok({ ok: true, tickets: allTickets });
  }

  if (path === '/admin/tickets' && method === 'POST') {
    const data = await request.json();
    const tickets = await getCollection('supportTickets');
    const ticket = {
      ...data,
      id: uuid(),
      ticketNumber: `TKT${Date.now().toString().slice(-8)}`,
      status: 'open',
      priority: data.priority || 'medium',
      conversation: [],
      createdAt: new Date(),
    };
    await tickets.insertOne(ticket);
    return ok({ ok: true, ticket });
  }

  if (path.match(/^\/admin\/tickets\/([^/]+)$/) && method === 'PATCH') {
    const ticketId = path.match(/^\/admin\/tickets\/([^/]+)$/)[1];
    const me = await getCurrentUser(request);
    if (!me || me.role !== 'admin') return err('Unauthorized', 401);
    
    const updates = await request.json();
    const tickets = await getCollection('supportTickets');
    await tickets.updateOne({ id: ticketId }, { $set: { ...updates, updatedAt: new Date() } });
    return ok({ ok: true });
  }

  if (path.match(/^\/admin\/tickets\/([^/]+)\/reply$/) && method === 'POST') {
    const ticketId = path.match(/^\/admin\/tickets\/([^/]+)\/reply$/)[1];
    const me = await getCurrentUser(request);
    if (!me || me.role !== 'admin') return err('Unauthorized', 401);
    
    const { message } = await request.json();
    const tickets = await getCollection('supportTickets');
    await tickets.updateOne(
      { id: ticketId },
      {
        $push: {
          conversation: {
            from: 'admin',
            message,
            timestamp: new Date(),
            adminId: me.id,
            adminName: me.name,
          },
        },
        $set: { updatedAt: new Date() },
      }
    );
    return ok({ ok: true });
  }

  // Auto-create Super Admin & Get Admins
  if (path === '/admin/admins' && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me || (me.role !== 'admin' && me.role !== 'super_admin')) return ok({ ok: true, admins: [] });
    
    const users = await getCollection('users');
    
    // Auto-create Super Admin if not exists
    const superAdmin = await users.findOne({ email: 'founder@safarcurated.com' });
    if (!superAdmin) {
      await users.insertOne({
        id: uuid(),
        name: 'Founder',
        email: 'founder@safarcurated.com',
        password: await hashPassword('SuperAdmin@2025'),
        role: 'super_admin',
        status: 'active',
        createdAt: new Date(),
      });
    } else if (superAdmin.role !== 'super_admin') {
      await users.updateOne({ email: 'founder@safarcurated.com' }, { $set: { role: 'super_admin' } });
    }
    
    const admins = await users.find({ role: { $in: ['admin', 'super_admin', 'support_agent'] } }).toArray();
    return ok({ ok: true, admins });
  }

  // Create Admin
  if (path === '/admin/admins' && method === 'POST') {
    const me = await getCurrentUser(request);
    if (!me || me.role !== 'super_admin') return err('Only Super Admins can create admins', 403);
    
    const { name, email, password, role } = await request.json();
    const users = await getCollection('users');
    
    const exists = await users.findOne({ email });
    if (exists) return err('Email already exists', 400);
    
    const newAdmin = {
      id: uuid(),
      name,
      email,
      password: await hashPassword(password),
      role: role || 'admin',
      status: 'active',
      createdAt: new Date(),
    };
    await users.insertOne(newAdmin);
    
    // Log activity
    await logActivity(me, 'admin_created', `Created admin: ${name} (${email})`);
    
    return ok({ ok: true, admin: newAdmin });
  }

  // Create Host Account (Admin/Super Admin Only)
  if (path === '/admin/hosts' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    
    const { name, email, mobile, password, businessName, status, verified } = await request.json();
    const users = await getCollection('users');
    
    const exists = await users.findOne({ email });
    if (exists) return err('Email already exists', 400);
    
    const newHost = {
      id: uuid(),
      name,
      email,
      mobile,
      password: await hashPassword(password),
      role: 'host',
      status: status || 'active',
      verified: verified || false,
      businessName: businessName || '',
      createdAt: new Date(),
      listingCount: 0,
      bookingCount: 0,
    };
    await users.insertOne(newHost);
    
    // Log activity
    await logActivity(me, 'host_created', `Created host: ${name} (${email})`);
    
    return ok({ ok: true, host: newHost });
  }

  // Update Admin Role
  if (path.match(/^\/admin\/admins\/([^/]+)\/role$/) && method === 'PATCH') {
    const adminId = path.match(/^\/admin\/admins\/([^/]+)\/role$/)[1];
    const me = await getCurrentUser(request);
    if (!me || me.role !== 'super_admin') return err('Unauthorized', 403);
    if (me.id === adminId) return err('Cannot change your own role', 400);
    
    const { role } = await request.json();
    const users = await getCollection('users');
    await users.updateOne({ id: adminId }, { $set: { role, updatedAt: new Date() } });
    
    await logActivity(me, 'admin_role_updated', `Updated admin role to: ${role}`);
    
    return ok({ ok: true });
  }

  // Disable/Enable Admin
  if (path.match(/^\/admin\/admins\/([^/]+)\/(disable|enable)$/) && method === 'PATCH') {
    const match = path.match(/^\/admin\/admins\/([^/]+)\/(disable|enable)$/);
    const adminId = match[1];
    const action = match[2];
    const me = await getCurrentUser(request);
    if (!me || me.role !== 'super_admin') return err('Unauthorized', 403);
    if (me.id === adminId) return err('Cannot disable yourself', 400);
    
    const users = await getCollection('users');
    const targetAdmin = await users.findOne({ id: adminId });
    if (targetAdmin?.role === 'super_admin') {
      const superAdminCount = await users.countDocuments({ role: 'super_admin', status: { $ne: 'disabled' } });
      if (superAdminCount <= 1 && action === 'disable') {
        return err('Cannot disable the last Super Admin', 400);
      }
    }
    
    await users.updateOne({ id: adminId }, { $set: { status: action === 'disable' ? 'disabled' : 'active' } });
    await logActivity(me, `admin_${action}d`, `${action === 'disable' ? 'Disabled' : 'Enabled'} admin`);
    
    return ok({ ok: true });
  }

  // Delete Admin
  if (path.match(/^\/admin\/admins\/([^/]+)$/) && method === 'DELETE') {
    const adminId = path.match(/^\/admin\/admins\/([^/]+)$/)[1];
    const me = await getCurrentUser(request);
    if (!me || me.role !== 'super_admin') return err('Unauthorized', 403);
    if (me.id === adminId) return err('Cannot delete yourself', 400);
    
    const users = await getCollection('users');
    const targetAdmin = await users.findOne({ id: adminId });
    if (targetAdmin?.role === 'super_admin') {
      const superAdminCount = await users.countDocuments({ role: 'super_admin' });
      if (superAdminCount <= 1) return err('Cannot delete the last Super Admin', 400);
    }
    
    await users.deleteOne({ id: adminId });
    await logActivity(me, 'admin_deleted', `Deleted admin: ${targetAdmin?.email}`);
    
    return ok({ ok: true });
  }

  // Settings
  if (path === '/admin/settings' && (method === 'GET' || method === 'POST')) {
    const me = await getCurrentUser(request);
    if (!me || (me.role !== 'admin' && me.role !== 'super_admin')) return ok({ ok: true, settings: {} });
    
    const settings = await getCollection('systemSettings');
    
    if (method === 'GET') {
      const systemSettings = await settings.findOne({ type: 'system' });
      return ok({ ok: true, settings: systemSettings || {} });
    }
    
    if (method === 'POST') {
      const data = await request.json();
      await settings.updateOne(
        { type: 'system' },
        { $set: { ...data, updatedAt: new Date(), updatedBy: me.id } },
        { upsert: true }
      );
      await logActivity(me, 'settings_updated', 'Updated system settings');
      return ok({ ok: true });
    }
  }

  // Announcements
  if (path === '/admin/announcements' && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me || (me.role !== 'admin' && me.role !== 'super_admin')) return ok({ ok: true, announcements: [] });
    
    const announcements = await getCollection('announcements');
    const allAnnouncements = await announcements.find({}).sort({ createdAt: -1 }).toArray();
    return ok({ ok: true, announcements: allAnnouncements });
  }

  if (path === '/admin/announcements' && method === 'POST') {
    const me = await getCurrentUser(request);
    if (!me || (me.role !== 'admin' && me.role !== 'super_admin')) return err('Unauthorized', 403);
    
    const data = await request.json();
    const announcements = await getCollection('announcements');
    const announcement = {
      ...data,
      id: uuid(),
      createdAt: new Date(),
      createdBy: me.id,
      createdByName: me.name,
    };
    await announcements.insertOne(announcement);
    await logActivity(me, 'announcement_created', `Created announcement: ${data.title}`);
    
    return ok({ ok: true, announcement });
  }

  if (path.match(/^\/admin\/announcements\/([^/]+)$/) && method === 'DELETE') {
    const announcementId = path.match(/^\/admin\/announcements\/([^/]+)$/)[1];
    const me = await getCurrentUser(request);
    if (!me || (me.role !== 'admin' && me.role !== 'super_admin')) return err('Unauthorized', 403);
    
    const announcements = await getCollection('announcements');
    await announcements.deleteOne({ id: announcementId });
    await logActivity(me, 'announcement_deleted', 'Deleted announcement');
    
    return ok({ ok: true });
  }

  // Activity Logs
  if (path === '/admin/activity-logs' && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me || (me.role !== 'admin' && me.role !== 'super_admin')) return ok({ ok: true, logs: [] });
    
    const { limit } = Object.fromEntries(new URL(request.url).searchParams);
    const logs = await getCollection('adminActivityLogs');
    const allLogs = await logs.find({}).sort({ timestamp: -1 }).limit(Number(limit) || 100).toArray();
    return ok({ ok: true, logs: allLogs });
  }

  // === SAFAR TOGETHER FEATURE ===
  
  // Get Feature Settings
  if (path === '/settings/safar-together' && method === 'GET') {
    const settings = await getCollection('settings');
    const setting = await settings.findOne({ key: 'safarTogether' });
    return ok({ ok: true, enabled: setting?.enabled || false });
  }

  // Toggle Feature (Admin Only)
  if (path === '/admin/safar-together/toggle' && method === 'POST') {
    const me = await getCurrentUser(request);
    if (!me || me.role !== 'super_admin') return err('Unauthorized', 403);
    const { enabled } = await request.json();
    const settings = await getCollection('settings');
    await settings.updateOne(
      { key: 'safarTogether' },
      { $set: { enabled, updatedAt: new Date() } },
      { upsert: true }
    );
    return ok({ ok: true, enabled });
  }

  // Create Travel Plan
  if (path === '/safar-together/plans' && method === 'POST') {
    try {
      const me = await getCurrentUser(request);
      if (!me) return err('Authentication required', 401);
      const data = await request.json();
      const plans = await getCollection('safarTogetherPlans');
      
      // New: Save plan with "pending_booking" status initially
      // Plan will be activated after booking confirmation
      const plan = {
        id: uuid(),
        userId: me.id,
        userName: me.name,
        userEmail: me.email,
        ...data,
        status: 'pending_booking', // Changed from 'active'
        bookingId: null, // Will be set when booking is completed
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await plans.insertOne(plan);
      
      // Return plan with redirect info for booking
      return ok({ 
        ok: true, 
        plan,
        redirectToBooking: true,
        listingId: data.listingId,
        category: data.listingCategory
      }, 201);
    } catch (error) {
      console.error('Create travel plan error:', error);
      return err('Failed to create travel plan: ' + error.message, 500);
    }
  }

  // Browse Plans
  if (path === '/safar-together/plans' && method === 'GET') {
    try {
      const me = await getCurrentUser(request);
      if (!me) return err('Authentication required', 401);
      const { destination, dateFrom, dateTo, minAge, maxAge, gender, interests } = Object.fromEntries(new URL(request.url).searchParams);
      const plans = await getCollection('safarTogetherPlans');
      let query = { status: 'active', userId: { $ne: me.id } };
      if (destination) query.destination = { $regex: destination, $options: 'i' };
      if (dateFrom) query.dateFrom = { $gte: dateFrom };
      if (dateTo) query.dateTo = { $lte: dateTo };
      if (minAge) query.age = { $gte: Number(minAge) };
      if (maxAge) query.age = { ...query.age, $lte: Number(maxAge) };
      if (gender) query.gender = gender;
      const allPlans = await plans.find(query).sort({ createdAt: -1 }).toArray();
      return ok({ ok: true, plans: allPlans });
    } catch (error) {
      console.error('Browse plans error:', error);
      return err('Failed to browse plans: ' + error.message, 500);
    }
  }

  // My Plans
  if (path === '/safar-together/my-plans' && method === 'GET') {
    try {
      const me = await getCurrentUser(request);
      if (!me) return err('Authentication required', 401);
      const plans = await getCollection('safarTogetherPlans');
      const myPlans = await plans.find({ userId: me.id }).sort({ createdAt: -1 }).toArray();
      return ok({ ok: true, plans: myPlans });
    } catch (error) {
      console.error('My plans error:', error);
      return err('Failed to fetch plans: ' + error.message, 500);
    }
  }

  // Delete Plan
  if (path.match(/^\/safar-together\/plans\/([^/]+)$/) && method === 'DELETE') {
    try {
      const planId = path.match(/^\/safar-together\/plans\/([^/]+)$/)[1];
      const me = await getCurrentUser(request);
      if (!me) return err('Authentication required', 401);
      const plans = await getCollection('safarTogetherPlans');
      await plans.deleteOne({ id: planId, userId: me.id });
      return ok({ ok: true });
    } catch (error) {
      console.error('Delete plan error:', error);
      return err('Failed to delete plan: ' + error.message, 500);
    }
  }

  // Activate Plan After Booking (called after booking confirmation)
  if (path.match(/^\/safar-together\/plans\/([^/]+)\/activate$/) && method === 'PATCH') {
    try {
      const planId = path.match(/^\/safar-together\/plans\/([^/]+)\/activate$/)[1];
      const me = await getCurrentUser(request);
      if (!me) return err('Authentication required', 401);
      
      const { bookingId } = await request.json();
      const plans = await getCollection('safarTogetherPlans');
      
      const result = await plans.updateOne(
        { id: planId, userId: me.id, status: 'pending_booking' },
        { 
          $set: { 
            status: 'active', 
            bookingId: bookingId,
            activatedAt: new Date(),
            updatedAt: new Date()
          } 
        }
      );
      
      if (result.matchedCount === 0) {
        return err('Plan not found or already activated', 404);
      }
      
      return ok({ ok: true, message: 'Plan activated successfully' });
    } catch (error) {
      console.error('Activate plan error:', error);
      return err('Failed to activate plan: ' + error.message, 500);
    }
  }

  // Send Request
  if (path === '/safar-together/requests' && method === 'POST') {
    try {
      const me = await getCurrentUser(request);
      if (!me) return err('Authentication required', 401);
      const { planId, recipientId } = await request.json();
      const requests = await getCollection('safarTogetherRequests');
      const existing = await requests.findOne({ senderId: me.id, planId, status: { $in: ['pending', 'accepted'] } });
      if (existing) return err('Request already sent', 400);
      const travelRequest = {
        id: uuid(),
        planId,
        senderId: me.id,
        senderName: me.name,
        recipientId,
        status: 'pending',
        createdAt: new Date(),
      };
      await requests.insertOne(travelRequest);
      return ok({ ok: true, request: travelRequest }, 201);
    } catch (error) {
      console.error('Send request error:', error);
      return err('Failed to send request: ' + error.message, 500);
    }
  }

  // My Requests
  if (path === '/safar-together/requests' && method === 'GET') {
    try {
      const me = await getCurrentUser(request);
      if (!me) return err('Authentication required', 401);
      const requests = await getCollection('safarTogetherRequests');
      const sent = await requests.find({ senderId: me.id }).toArray();
      const received = await requests.find({ recipientId: me.id }).toArray();
      return ok({ ok: true, sent, received });
    } catch (error) {
      console.error('Get requests error:', error);
      return err('Failed to fetch requests: ' + error.message, 500);
    }
  }

  // Accept/Decline Request
  if (path.match(/^\/safar-together\/requests\/([^/]+)\/([^/]+)$/) && method === 'PATCH') {
    try {
      const [, requestId, action] = path.match(/^\/safar-together\/requests\/([^/]+)\/([^/]+)$/);
      const me = await getCurrentUser(request);
      if (!me) return err('Authentication required', 401);
      const requests = await getCollection('safarTogetherRequests');
      const travelRequest = await requests.findOne({ id: requestId });
      
      await requests.updateOne(
        { id: requestId, recipientId: me.id },
        { $set: { status: action, updatedAt: new Date() } }
      );
      
      // If accepted, create conversation and send notifications
      if (action === 'accepted' && travelRequest) {
        const conversations = await getCollection('safarTogetherConversations');
        const plans = await getCollection('safarTogetherPlans');
        const plan = await plans.findOne({ id: travelRequest.planId });
        
        // Check if conversation already exists
        const existingConvo = await conversations.findOne({
          participants: { $all: [travelRequest.senderId, me.id] }
        });
        
        if (!existingConvo && plan) {
          // Create new conversation
          await conversations.insertOne({
            id: uuid(),
            participants: [travelRequest.senderId, me.id],
            planId: travelRequest.planId,
            planDestination: plan.destination,
            planDates: { from: plan.dateFrom, to: plan.dateTo },
            createdAt: new Date(),
            lastMessageAt: new Date(),
          });
        }
        
        // Send notification to requester
        const notifications = await getCollection('notifications');
        await notifications.insertOne({
          id: uuid(),
          userId: travelRequest.senderId,
          type: 'request_accepted',
          title: 'Request Accepted!',
          description: `${me.name} accepted your travel request`,
          link: `/safar-together/chats`,
          read: false,
          createdAt: new Date(),
        });
      }
      
      return ok({ ok: true });
    } catch (error) {
      console.error('Update request error:', error);
      return err('Failed to update request: ' + error.message, 500);
    }
  }

  // My Connections
  if (path === '/safar-together/connections' && method === 'GET') {
    try {
      const me = await getCurrentUser(request);
      if (!me) return err('Authentication required', 401);
      const requests = await getCollection('safarTogetherRequests');
      const connections = await requests.find({
        $or: [{ senderId: me.id }, { recipientId: me.id }],
        status: 'accepted'
      }).toArray();
      return ok({ ok: true, connections });
    } catch (error) {
      console.error('Get connections error:', error);
      return err('Failed to fetch connections: ' + error.message, 500);
    }
  }

  // Report User
  if (path === '/safar-together/report' && method === 'POST') {
    try {
      const me = await getCurrentUser(request);
      if (!me) return err('Authentication required', 401);
      const { reportedUserId, reason } = await request.json();
      const reports = await getCollection('safarTogetherReports');
      const report = {
        id: uuid(),
        reporterId: me.id,
        reporterName: me.name,
        reportedUserId,
        reason,
        status: 'pending',
        createdAt: new Date(),
      };
      await reports.insertOne(report);
      return ok({ ok: true });
    } catch (error) {
      console.error('Report user error:', error);
      return err('Failed to report user: ' + error.message, 500);
    }
  }

  // === CHAT & NOTIFICATIONS ===

  // Get My Conversations
  if (path === '/safar-together/conversations' && method === 'GET') {
    try {
      const me = await getCurrentUser(request);
      if (!me) return err('Authentication required', 401);
      const conversations = await getCollection('safarTogetherConversations');
      const messages = await getCollection('safarTogetherMessages');
      
      const myConvos = await conversations.find({
        participants: me.id,
        blocked: { $ne: true }
      }).sort({ lastMessageAt: -1 }).toArray();
      
      // Get last message and unread count for each
      const convosWithDetails = await Promise.all(myConvos.map(async (convo) => {
        const lastMessage = await messages.findOne({ conversationId: convo.id }, { sort: { createdAt: -1 } });
        const unreadCount = await messages.countDocuments({ 
          conversationId: convo.id, 
          senderId: { $ne: me.id },
          readBy: { $ne: me.id }
        });
        const partnerId = convo.participants.find(p => p !== me.id);
        const users = await getCollection('users');
        const partner = await users.findOne({ id: partnerId });
        return { ...convo, lastMessage, unreadCount, partner };
      }));
      
      return ok({ ok: true, conversations: convosWithDetails });
    } catch (error) {
      console.error('Get conversations error:', error);
      return err('Failed to fetch conversations: ' + error.message, 500);
    }
  }

  // Get Conversation Messages
  if (path.match(/^\/safar-together\/conversations\/([^/]+)\/messages$/) && method === 'GET') {
    try {
      const conversationId = path.match(/^\/safar-together\/conversations\/([^/]+)\/messages$/)[1];
      const me = await getCurrentUser(request);
      if (!me) return err('Authentication required', 401);
      
      const conversations = await getCollection('safarTogetherConversations');
      const convo = await conversations.findOne({ id: conversationId });
      if (!convo || !convo.participants.includes(me.id)) return err('Unauthorized', 403);
      
      const messages = await getCollection('safarTogetherMessages');
      const allMessages = await messages.find({ conversationId }).sort({ createdAt: 1 }).toArray();
      
      // Mark messages as read
      await messages.updateMany(
        { conversationId, senderId: { $ne: me.id }, readBy: { $ne: me.id } },
        { $addToSet: { readBy: me.id }, $set: { readAt: new Date() } }
      );
      
      return ok({ ok: true, messages: allMessages, conversation: convo });
    } catch (error) {
      console.error('Get messages error:', error);
      return err('Failed to fetch messages: ' + error.message, 500);
    }
  }

  // Send Message
  if (path.match(/^\/safar-together\/conversations\/([^/]+)\/messages$/) && method === 'POST') {
    try {
      const conversationId = path.match(/^\/safar-together\/conversations\/([^/]+)\/messages$/)[1];
      const me = await getCurrentUser(request);
      if (!me) return err('Authentication required', 401);
      const { text } = await request.json();
      
      const conversations = await getCollection('safarTogetherConversations');
      const convo = await conversations.findOne({ id: conversationId });
      if (!convo || !convo.participants.includes(me.id)) return err('Unauthorized', 403);
      
      const messages = await getCollection('safarTogetherMessages');
      const message = {
        id: uuid(),
        conversationId,
        senderId: me.id,
        senderName: me.name,
        text,
        readBy: [me.id],
        createdAt: new Date(),
      };
      await messages.insertOne(message);
      
      // Update conversation last message time
      await conversations.updateOne({ id: conversationId }, { $set: { lastMessageAt: new Date() } });
      
      // Create notification for recipient
      const recipientId = convo.participants.find(p => p !== me.id);
      const notifications = await getCollection('notifications');
      await notifications.insertOne({
        id: uuid(),
        userId: recipientId,
        type: 'chat_message',
        title: 'New Message',
        description: `${me.name} sent you a message`,
        link: `/safar-together/chats/${conversationId}`,
        read: false,
        createdAt: new Date(),
      });
      
      return ok({ ok: true, message }, 201);
    } catch (error) {
      console.error('Send message error:', error);
      return err('Failed to send message: ' + error.message, 500);
    }
  }

  // Block User in Conversation
  if (path.match(/^\/safar-together\/conversations\/([^/]+)\/block$/) && method === 'POST') {
    try {
      const conversationId = path.match(/^\/safar-together\/conversations\/([^/]+)\/block$/)[1];
      const me = await getCurrentUser(request);
      if (!me) return err('Authentication required', 401);
      
      const conversations = await getCollection('safarTogetherConversations');
      await conversations.updateOne({ id: conversationId }, { $set: { blocked: true, blockedBy: me.id } });
      return ok({ ok: true });
    } catch (error) {
      console.error('Block user error:', error);
      return err('Failed to block user: ' + error.message, 500);
    }
  }

  // Request WhatsApp Share
  if (path.match(/^\/safar-together\/conversations\/([^/]+)\/share-whatsapp$/) && method === 'POST') {
    try {
      const conversationId = path.match(/^\/safar-together\/conversations\/([^/]+)\/share-whatsapp$/)[1];
      const me = await getCurrentUser(request);
      if (!me) return err('Authentication required', 401);
      
      const conversations = await getCollection('safarTogetherConversations');
      const convo = await conversations.findOne({ id: conversationId });
      if (!convo) return err('Conversation not found', 404);
      
      const whatsappShares = convo.whatsappShares || {};
      whatsappShares[me.id] = true;
      
      const bothApproved = Object.keys(whatsappShares).length === 2;
      await conversations.updateOne({ id: conversationId }, { $set: { whatsappShares, whatsappShared: bothApproved } });
      
      return ok({ ok: true, bothApproved });
    } catch (error) {
      console.error('Share WhatsApp error:', error);
      return err('Failed to share WhatsApp: ' + error.message, 500);
    }
  }

  // Get Notifications
  if (path === '/notifications' && method === 'GET') {
    try {
      const me = await getCurrentUser(request);
      if (!me) return err('Authentication required', 401);
      const notifications = await getCollection('notifications');
      const userNotifications = await notifications.find({ userId: me.id }).sort({ createdAt: -1 }).limit(50).toArray();
      const unreadCount = await notifications.countDocuments({ userId: me.id, read: false });
      return ok({ ok: true, notifications: userNotifications, unreadCount });
    } catch (error) {
      console.error('Get notifications error:', error);
      return err('Failed to fetch notifications: ' + error.message, 500);
    }
  }

  // Mark Notification as Read
  if (path.match(/^\/notifications\/([^/]+)\/read$/) && method === 'PATCH') {
    try {
      const notificationId = path.match(/^\/notifications\/([^/]+)\/read$/)[1];
      const me = await getCurrentUser(request);
      if (!me) return err('Authentication required', 401);
      const notifications = await getCollection('notifications');
      await notifications.updateOne({ id: notificationId, userId: me.id }, { $set: { read: true, readAt: new Date() } });
      return ok({ ok: true });
    } catch (error) {
      console.error('Mark notification read error:', error);
      return err('Failed to mark notification as read: ' + error.message, 500);
    }
  }

  // Mark All Notifications as Read
  if (path === '/notifications/read-all' && method === 'POST') {
    try {
      const me = await getCurrentUser(request);
      if (!me) return err('Authentication required', 401);
      const notifications = await getCollection('notifications');
      await notifications.updateMany({ userId: me.id, read: false }, { $set: { read: true, readAt: new Date() } });
      return ok({ ok: true });
    } catch (error) {
      console.error('Mark all read error:', error);
      return err('Failed to mark all as read: ' + error.message, 500);
    }
  }

  // Admin: Get All Conversations
  if (path === '/admin/safar-together/conversations' && method === 'GET') {
    try {
      const me = await getCurrentUser(request);
      const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
      const conversations = await getCollection('safarTogetherConversations');
      const allConvos = await conversations.find({}).sort({ lastMessageAt: -1 }).toArray();
      return ok({ ok: true, conversations: allConvos });
    } catch (error) {
      console.error('Admin get conversations error:', error);
      return err('Failed to fetch conversations: ' + error.message, 500);
    }
  }

  // Admin: Delete Message
  if (path.match(/^\/admin\/safar-together\/messages\/([^/]+)$/) && method === 'DELETE') {
    try {
      const messageId = path.match(/^\/admin\/safar-together\/messages\/([^/]+)$/)[1];
      const me = await getCurrentUser(request);
      const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
      const messages = await getCollection('safarTogetherMessages');
      await messages.deleteOne({ id: messageId });
      return ok({ ok: true });
    } catch (error) {
      console.error('Admin delete message error:', error);
      return err('Failed to delete message: ' + error.message, 500);
    }
  }

  // Admin: Get All Plans
  if (path === '/admin/safar-together/plans' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const plans = await getCollection('safarTogetherPlans');
    const allPlans = await plans.find({}).sort({ createdAt: -1 }).toArray();
    return ok({ ok: true, plans: allPlans });
  }

  // Admin: Delete Plan
  if (path.match(/^\/admin\/safar-together\/plans\/([^/]+)$/) && method === 'DELETE') {
    const planId = path.match(/^\/admin\/safar-together\/plans\/([^/]+)$/)[1];
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const plans = await getCollection('safarTogetherPlans');
    await plans.deleteOne({ id: planId });
    return ok({ ok: true });
  }

  // Admin: Get Plan Details with Related Data
  if (path.match(/^\/admin\/safar-together\/plans\/([^/]+)\/details$/) && method === 'GET') {
    const planId = path.match(/^\/admin\/safar-together\/plans\/([^/]+)\/details$/)[1];
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    
    const plans = await getCollection('safarTogetherPlans');
    const users = await getCollection('users');
    const requests = await getCollection('safarTogetherRequests');
    const reports = await getCollection('safarTogetherReports');
    
    const plan = await plans.findOne({ id: planId });
    if (!plan) return err('Plan not found', 404);
    
    const creator = await users.findOne({ id: plan.userId });
    const planRequests = await requests.find({ planId }).sort({ createdAt: -1 }).toArray();
    const acceptedRequests = await requests.find({ planId, status: 'accepted' }).toArray();
    
    // Get joined travelers
    const joinedTravelerIds = acceptedRequests.map(r => r.senderId);
    const joinedTravelers = await users.find({ id: { $in: joinedTravelerIds } }).toArray();
    
    // Get reports related to this plan's users
    const allUserIds = [plan.userId, ...joinedTravelerIds];
    const planReports = await reports.find({ 
      $or: [
        { reportedUserId: { $in: allUserIds } },
        { reporterId: { $in: allUserIds } }
      ]
    }).sort({ createdAt: -1 }).toArray();
    
    return ok({ 
      ok: true, 
      plan, 
      creator, 
      requests: planRequests,
      joinedTravelers: joinedTravelers.map(t => ({
        ...t,
        joinedDate: acceptedRequests.find(r => r.senderId === t.id)?.updatedAt || acceptedRequests.find(r => r.senderId === t.id)?.createdAt
      })),
      reports: planReports
    });
  }

  // Admin: Get Reports
  if (path === '/admin/safar-together/reports' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const reports = await getCollection('safarTogetherReports');
    const allReports = await reports.find({}).sort({ createdAt: -1 }).toArray();
    return ok({ ok: true, reports: allReports });
  }

  // Admin: Get All Requests
  if (path === '/admin/safar-together/requests' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const requests = await getCollection('safarTogetherRequests');
    const allRequests = await requests.find({}).sort({ createdAt: -1 }).toArray();
    return ok({ ok: true, requests: allRequests });
  }

  // Admin: Update Plan Status (Hide/Show)
  if (path.match(/^\/admin\/safar-together\/plans\/([^/]+)\/status$/) && method === 'PATCH') {
    const planId = path.match(/^\/admin\/safar-together\/plans\/([^/]+)\/status$/)[1];
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const { status } = await request.json();
    const plans = await getCollection('safarTogetherPlans');
    await plans.updateOne({ id: planId }, { $set: { status } });
    return ok({ ok: true });
  }

  // Admin: Resolve Report
  if (path.match(/^\/admin\/safar-together\/reports\/([^/]+)\/resolve$/) && method === 'PATCH') {
    const reportId = path.match(/^\/admin\/safar-together\/reports\/([^/]+)\/resolve$/)[1];
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const reports = await getCollection('safarTogetherReports');
    await reports.updateOne({ id: reportId }, { $set: { status: 'resolved', resolvedAt: new Date(), resolvedBy: me.id } });
    return ok({ ok: true });
  }

  // Admin: Suspend User from Safar Together
  if (path.match(/^\/admin\/safar-together\/users\/([^/]+)\/suspend$/) && method === 'POST') {
    const userId = path.match(/^\/admin\/safar-together\/users\/([^/]+)\/suspend$/)[1];
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const users = await getCollection('users');
    await users.updateOne({ id: userId }, { $set: { safarTogetherBlocked: true, safarTogetherBlockedAt: new Date() } });
    return ok({ ok: true });
  }

  // Admin: Unblock User from Safar Together
  if (path.match(/^\/admin\/safar-together\/users\/([^/]+)\/unblock$/) && method === 'POST') {
    const userId = path.match(/^\/admin\/safar-together\/users\/([^/]+)\/unblock$/)[1];
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const users = await getCollection('users');
    await users.updateOne({ id: userId }, { $set: { safarTogetherBlocked: false } });
    return ok({ ok: true });
  }

  // Admin: Get Safar Together Statistics
  if (path === '/admin/safar-together/stats' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const plans = await getCollection('safarTogetherPlans');
    const requests = await getCollection('safarTogetherRequests');
    const reports = await getCollection('safarTogetherReports');
    const users = await getCollection('users');
    
    const [totalPlans, activePlans, pendingRequests, acceptedRequests, totalReports, blockedUsers] = await Promise.all([
      plans.countDocuments({}),
      plans.countDocuments({ status: 'active' }),
      requests.countDocuments({ status: 'pending' }),
      requests.countDocuments({ status: 'accepted' }),
      reports.countDocuments({ status: 'pending' }),
      users.countDocuments({ safarTogetherBlocked: true }),
    ]);
    
    return ok({ ok: true, stats: { totalPlans, activePlans, pendingRequests, acceptedRequests, totalReports, blockedUsers } });
  }

  // Admin: Get Blocked Users
  if (path === '/admin/safar-together/blocked-users' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'admin'); if (!g.ok) return err(g.error, g.status);
    const users = await getCollection('users');
    const blockedUsers = await users.find({ safarTogetherBlocked: true }).toArray();
    return ok({ ok: true, users: blockedUsers });
  }

  // ========== AI MARKETPLACE BUILDER (MODULE 1) ==========
  // Helper: Super Admin Only middleware
  function requireSuperAdmin(user) {
    if (!user) return { ok: false, status: 401, error: 'Authentication required' };
    if (user.role?.toLowerCase() !== 'super_admin') {
      return { ok: false, status: 403, error: 'Forbidden: Super Admin access only' };
    }
    return { ok: true };
  }

  // Helper: Encrypt/Decrypt API keys
  async function encryptApiKey(plaintext) {
    if (!plaintext) return null;
    const crypto = await import('crypto');
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.JWT_SECRET || 'dev-insecure-secret-change-me', 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  async function decryptApiKey(encrypted) {
    if (!encrypted || typeof encrypted !== 'string') return null;
    try {
      const crypto = await import('crypto');
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(process.env.JWT_SECRET || 'dev-insecure-secret-change-me', 'salt', 32);
      const parts = encrypted.split(':');
      if (parts.length !== 2) return null;
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return null;
    }
  }

  // Helper: Log marketplace audit
  async function logMarketplaceAudit(user, action, details, ipAddress = null) {
    try {
      const logs = await getCollection('mpAuditLogs');
      await logs.insertOne({
        id: uuid(),
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action,
        details,
        ipAddress,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to log marketplace audit:', error);
    }
  }

  // GET /api/marketplace/settings - Get marketplace settings (Super Admin only)
  if (path === '/marketplace/settings' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const settings = await getCollection('mpSettings');
    let config = await settings.findOne({ type: 'provider_config' });
    
    if (!config) {
      // Initialize default config
      config = {
        id: uuid(),
        type: 'provider_config',
        providers: {
          googlePlaces: { enabled: false, hasApiKey: false }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await settings.insertOne(config);
    }
    
    // Never send encrypted API keys to frontend
    const safeConfig = {
      providers: {
        googlePlaces: {
          enabled: config.providers?.googlePlaces?.enabled || false,
          hasApiKey: !!config.providers?.googlePlaces?.apiKey,
        }
      }
    };
    
    return ok({ settings: safeConfig });
  }

  // POST /api/marketplace/settings - Save marketplace settings (Super Admin only)
  if (path === '/marketplace/settings' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const { googlePlacesApiKey, googlePlacesEnabled } = await readBody(request);
    
    const settings = await getCollection('mpSettings');
    let config = await settings.findOne({ type: 'provider_config' });
    
    const updates = {
      type: 'provider_config',
      providers: {
        googlePlaces: {
          enabled: !!googlePlacesEnabled,
          hasApiKey: false,
        }
      },
      updatedAt: new Date(),
      updatedBy: me.id,
    };
    
    // Encrypt and store API key if provided
    if (googlePlacesApiKey && googlePlacesApiKey.trim()) {
      const encrypted = await encryptApiKey(googlePlacesApiKey.trim());
      updates.providers.googlePlaces.apiKey = encrypted;
      updates.providers.googlePlaces.hasApiKey = true;
    } else if (config?.providers?.googlePlaces?.apiKey) {
      // Keep existing key if not updated
      updates.providers.googlePlaces.apiKey = config.providers.googlePlaces.apiKey;
      updates.providers.googlePlaces.hasApiKey = true;
    }
    
    if (!config) {
      updates.id = uuid();
      updates.createdAt = new Date();
      await settings.insertOne(updates);
    } else {
      await settings.updateOne({ type: 'provider_config' }, { $set: updates });
    }
    
    // Log audit
    await logMarketplaceAudit(me, 'Settings Updated', {
      googlePlacesEnabled: updates.providers.googlePlaces.enabled,
      apiKeyUpdated: !!googlePlacesApiKey,
    }, request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'));
    
    return ok({ message: 'Settings saved successfully' });
  }

  // POST /api/marketplace/settings/test-connection - Test Google Places API (New)
  if (path === '/marketplace/settings/test-connection' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const settings = await getCollection('mpSettings');
    const config = await settings.findOne({ type: 'provider_config' });
    
    if (!config?.providers?.googlePlaces?.apiKey) {
      return err('Google Places API key not configured');
    }
    
    const apiKey = await decryptApiKey(config.providers.googlePlaces.apiKey);
    if (!apiKey) {
      return err('Failed to decrypt API key');
    }
    
    // Test API with a simple query using NEW Places API
    try {
      console.log('=== GOOGLE PLACES API TEST CONNECTION ===');
      console.log('API Key (first 10 chars):', apiKey.substring(0, 10) + '...');
      
      const testUrl = 'https://places.googleapis.com/v1/places:searchText';
      const requestBody = { textQuery: 'restaurants in Kashmir' };
      
      console.log('Test URL:', testUrl);
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.id'
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('Response Status:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('Response Data:', JSON.stringify(data, null, 2));
      
      if (response.ok && data.places) {
        console.log('✅ Test connection successful! Found', data.places.length, 'places');
        
        // Log successful test
        await logMarketplaceAudit(me, 'API Connection Tested', {
          provider: 'Google Places (New)',
          status: 'success',
        }, request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'));
        
        return ok({ 
          success: true, 
          message: 'Connection successful! Google Places API (New) is working.',
          resultsFound: data.places?.length || 0
        });
      } else {
        console.error('❌ Test connection failed');
        console.error('Error:', data.error);
        
        const errorMessage = data.error?.message || 'Unknown error';
        const errorStatus = data.error?.status || 'UNKNOWN';
        
        // Provide helpful error messages
        if (errorMessage.includes('API key') || errorStatus === 'INVALID_ARGUMENT') {
          return err('Invalid API key. Please check your Google Places API key.');
        }
        if (errorMessage.includes('not enabled') || errorStatus === 'PERMISSION_DENIED') {
          return err('Places API (New) is not enabled. Enable it here: https://console.cloud.google.com/apis/library/places-backend.googleapis.com');
        }
        if (errorMessage.includes('billing')) {
          return err('Billing not enabled on your Google Cloud project. Enable it here: https://console.cloud.google.com/billing');
        }
        
        return err(`API returned error: ${errorMessage} (Status: ${errorStatus})`);
      }
    } catch (error) {
      console.error('=== TEST CONNECTION ERROR ===');
      console.error('Error:', error);
      console.error('Error Message:', error.message);
      return err(`Connection failed: ${error.message}`);
    }
  }

  // GET /api/marketplace/audit-logs - Get marketplace audit logs (Super Admin only)
  if (path === '/marketplace/audit-logs' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const skip = parseInt(url.searchParams.get('skip') || '0');
    
    const logs = await getCollection('mpAuditLogs');
    const total = await logs.countDocuments();
    const records = await logs.find({})
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(Math.min(limit, 100))
      .toArray();
    
    return ok({ logs: records, total, limit, skip });
  }

  // GET /api/marketplace/api-usage - Get API usage stats (Super Admin only)
  if (path === '/marketplace/api-usage' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const usage = await getCollection('mpApiUsage');
    
    // Get today's usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    const todayUsage = await usage.find({
      provider: 'googlePlaces',
      timestamp: { $gte: today, $lt: todayEnd }
    }).toArray();
    
    // Get this month's usage
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthUsage = await usage.find({
      provider: 'googlePlaces',
      timestamp: { $gte: monthStart }
    }).toArray();
    
    // Get last sync info
    const logs = await getCollection('mpAuditLogs');
    const lastSync = await logs.findOne(
      { action: { $regex: /sync|import|discovery/i } },
      { sort: { timestamp: -1 } }
    );
    
    const lastSuccess = await logs.findOne(
      { action: { $regex: /sync|import|discovery/i }, 'details.status': 'success' },
      { sort: { timestamp: -1 } }
    );
    
    const lastFailure = await logs.findOne(
      { action: { $regex: /sync|import|discovery/i }, 'details.status': { $in: ['failed', 'error'] } },
      { sort: { timestamp: -1 } }
    );
    
    return ok({
      requestsToday: todayUsage.length,
      requestsThisMonth: monthUsage.length,
      remainingQuota: null, // Will be calculated based on Google Places quota
      estimatedCost: (monthUsage.length * 0.032), // ~$32 per 1000 requests (Text Search)
      lastApiCall: lastSync?.timestamp || null,
      lastSuccessfulSync: lastSuccess?.timestamp || null,
      lastFailedSync: lastFailure?.timestamp || null,
    });
  }

  // GET /api/marketplace/debug/places-api - Debug Google Places API
  if (path === '/marketplace/debug/places-api' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const settings = await getCollection('mpSettings');
    const config = await settings.findOne({ type: 'provider_config' });
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      database: {
        configExists: !!config,
        hasGooglePlacesConfig: !!config?.providers?.googlePlaces,
        hasEncryptedKey: !!config?.providers?.googlePlaces?.apiKey,
        encryptedKeyLength: config?.providers?.googlePlaces?.apiKey?.length || 0,
        encryptedKeyPreview: config?.providers?.googlePlaces?.apiKey?.substring(0, 20) + '...' || 'N/A',
        enabled: config?.providers?.googlePlaces?.enabled || false,
        lastUpdated: config?.updatedAt || null
      }
    };
    
    if (!config?.providers?.googlePlaces?.apiKey) {
      diagnostics.error = 'No API key found in database';
      return ok(diagnostics);
    }
    
    const apiKey = await decryptApiKey(config.providers.googlePlaces.apiKey);
    
    diagnostics.decryption = {
      success: !!apiKey,
      decryptedKeyLength: apiKey?.length || 0,
      decryptedKeyFirst10: apiKey ? apiKey.substring(0, 10) + '...' : 'DECRYPTION FAILED',
      decryptedKeyFirst15: apiKey ? apiKey.substring(0, 15) + '...' : 'DECRYPTION FAILED',
      startsWithAIza: apiKey ? apiKey.startsWith('AIza') : false,
      looksValid: apiKey ? (apiKey.startsWith('AIza') && apiKey.length >= 39) : false
    };
    
    if (!apiKey) {
      diagnostics.error = 'Failed to decrypt API key';
      return ok(diagnostics);
    }
    
    console.log('=== API KEY VERIFICATION ===');
    console.log('Encrypted key from DB (first 20):', config.providers.googlePlaces.apiKey.substring(0, 20) + '...');
    console.log('Decrypted key (first 15):', apiKey.substring(0, 15) + '...');
    console.log('Key length:', apiKey.length);
    console.log('Starts with AIza:', apiKey.startsWith('AIza'));
    console.log('Looks valid:', apiKey.startsWith('AIza') && apiKey.length >= 39);
    
    try {
      // Test 1: Simple text search
      const testQuery = 'restaurants in New York';
      const requestUrl = 'https://places.googleapis.com/v1/places:searchText';
      const requestHeaders = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress'
      };
      const requestBody = {
        textQuery: testQuery
      };
      
      diagnostics.request = {
        url: requestUrl,
        method: 'POST',
        headers: {
          'Content-Type': requestHeaders['Content-Type'],
          'X-Goog-Api-Key': apiKey.substring(0, 15) + '...',
          'X-Goog-FieldMask': requestHeaders['X-Goog-FieldMask']
        },
        body: requestBody
      };
      
      console.log('=== DIAGNOSTIC API CALL ===');
      console.log('URL:', requestUrl);
      console.log('Query:', testQuery);
      console.log('API Key (first 15):', apiKey.substring(0, 15) + '...');
      
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBody)
      });
      
      diagnostics.response = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      };
      
      const responseData = await response.json();
      diagnostics.responseBody = responseData;
      
      console.log('Response Status:', response.status);
      console.log('Response Body:', JSON.stringify(responseData, null, 2));
      
      // Analyze the response
      if (response.ok) {
        diagnostics.analysis = {
          success: true,
          placesReturned: responseData.places?.length || 0,
          hasPlaces: !!responseData.places,
          placesArray: Array.isArray(responseData.places),
          firstPlace: responseData.places?.[0] || null
        };
        
        if (responseData.places && responseData.places.length > 0) {
          console.log('✅ SUCCESS! Found', responseData.places.length, 'places');
          console.log('First place:', responseData.places[0].displayName);
        } else {
          console.log('⚠️ API call succeeded but returned 0 places');
        }
      } else {
        diagnostics.analysis = {
          success: false,
          error: responseData.error,
          errorCode: responseData.error?.code,
          errorMessage: responseData.error?.message,
          errorStatus: responseData.error?.status
        };
        
        console.error('❌ API call failed');
        console.error('Error:', responseData.error?.message);
        console.error('Status:', responseData.error?.status);
      }
      
      console.log('=== DIAGNOSTIC COMPLETE ===');
      
      return ok(diagnostics);
    } catch (error) {
      console.error('=== DIAGNOSTIC ERROR ===');
      console.error('Error:', error.message);
      diagnostics.error = {
        message: error.message,
        stack: error.stack
      };
      return ok(diagnostics);
    }
  }

  // ========== AI MARKETPLACE BUILDER (MODULE 2) ==========
  // POST /api/marketplace/discover - Search Google Places API (New)
  if (path === '/marketplace/discover' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const { query, category, city, radius = 5000 } = await readBody(request);
    
    if (!query && !category) {
      return err('Search query or category is required');
    }
    
    // Get API key from settings
    const settings = await getCollection('mpSettings');
    const config = await settings.findOne({ type: 'provider_config' });
    
    if (!config?.providers?.googlePlaces?.apiKey) {
      return err('Google Places API key not configured. Please configure in Settings.');
    }
    
    if (!config.providers.googlePlaces.enabled) {
      return err('Google Places provider is disabled. Please enable in Settings.');
    }
    
    const apiKey = await decryptApiKey(config.providers.googlePlaces.apiKey);
    if (!apiKey) {
      return err('Failed to decrypt API key');
    }
    
    try {
      // Build search query
      const searchQuery = query || category;
      const location = city ? ` in ${city}` : '';
      const fullQuery = `${searchQuery}${location}`;
      
      console.log('=== GOOGLE PLACES API REQUEST ===');
      console.log('Full Query:', fullQuery);
      console.log('API Key (first 10 chars):', apiKey.substring(0, 10) + '...');
      
      // Call NEW Google Places API (Text Search)
      const searchUrl = 'https://places.googleapis.com/v1/places:searchText';
      const requestBody = {
        textQuery: fullQuery,
        pageSize: 20
      };
      
      console.log('Request URL:', searchUrl);
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));
      console.log('Request Headers:', {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey.substring(0, 10) + '...',
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.primaryType,places.types'
      });
      
      const searchResponse = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.primaryType,places.types'
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('Response Status:', searchResponse.status, searchResponse.statusText);
      
      const searchData = await searchResponse.json();
      console.log('=== GOOGLE PLACES API RESPONSE ===');
      console.log('Full Response:', JSON.stringify(searchData, null, 2));
      
      if (!searchResponse.ok) {
        console.error('API Error Response:', searchData);
        const errorMessage = searchData.error?.message || 'Unknown error';
        const errorStatus = searchData.error?.status || 'UNKNOWN';
        const errorDetails = searchData.error?.details || [];
        
        console.error('Error Status:', errorStatus);
        console.error('Error Message:', errorMessage);
        console.error('Error Details:', JSON.stringify(errorDetails, null, 2));
        
        // Check for common issues
        if (errorMessage.includes('API key') || errorMessage.includes('API_KEY_INVALID')) {
          return err('Invalid API key. Please check your Google Places API key in Settings.');
        }
        if (errorMessage.includes('not enabled') || errorMessage.includes('SERVICE_DISABLED')) {
          return err('Places API (New) is not enabled. Please enable it in Google Cloud Console: https://console.cloud.google.com/apis/library/places-backend.googleapis.com');
        }
        if (errorMessage.includes('billing') || errorMessage.includes('BILLING_NOT_ENABLED')) {
          return err('Billing is not enabled on your Google Cloud project. Please enable billing: https://console.cloud.google.com/billing');
        }
        
        return err(`Google Places API error: ${errorMessage} (Status: ${errorStatus})`);
      }
      
      const places = searchData.places || [];
      console.log('Number of places found:', places.length);
      
      if (places.length === 0) {
        console.log('No places found for query:', fullQuery);
        
        // Log API usage for search even if no results
        const usage = await getCollection('mpApiUsage');
        await usage.insertOne({
          id: uuid(),
          provider: 'googlePlaces',
          endpoint: 'text_search_new',
          timestamp: new Date(),
          cost: 0.032
        });
        
        return ok({ 
          results: [],
          total: 0,
          query: fullQuery,
          message: 'No businesses found. Try a different search query or city.'
        });
      }
      
      // Get additional details for each place using new API
      const detailedResults = [];
      for (const place of places) {
        try {
          console.log('Fetching details for place:', place.id);
          
          // Get place details using new API
          const placeId = place.id.startsWith('places/') ? place.id : `places/${place.id}`;
          const detailsUrl = `https://places.googleapis.com/v1/${placeId}`;
          const detailsResponse = await fetch(detailsUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'id,displayName,formattedAddress,internationalPhoneNumber,websiteUri,location,rating,userRatingCount,primaryType,types,regularOpeningHours,photos,businessStatus,googleMapsUri'
            }
          });
          
          const detailsData = await detailsResponse.json();
          
          if (detailsResponse.ok && detailsData) {
            console.log('Place details received for:', detailsData.displayName?.text || place.id);
            
            // Process photos - new API format
            const photos = [];
            if (detailsData.photos && detailsData.photos.length > 0) {
              for (let i = 0; i < Math.min(5, detailsData.photos.length); i++) {
                const photo = detailsData.photos[i];
                // New API photo URL format
                const photoUrl = `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=800&key=${apiKey}`;
                photos.push({
                  reference: photo.name,
                  url: photoUrl
                });
              }
            }
            
            // Extract opening hours
            let openingHours = null;
            if (detailsData.regularOpeningHours?.weekdayDescriptions) {
              openingHours = detailsData.regularOpeningHours.weekdayDescriptions;
            }
            
            detailedResults.push({
              placeId: detailsData.id,
              name: detailsData.displayName?.text || detailsData.displayName || 'Unnamed',
              address: detailsData.formattedAddress || '',
              phone: detailsData.internationalPhoneNumber || null,
              website: detailsData.websiteUri || null,
              coordinates: {
                lat: detailsData.location?.latitude || 0,
                lng: detailsData.location?.longitude || 0
              },
              rating: detailsData.rating || null,
              reviewCount: detailsData.userRatingCount || 0,
              category: detailsData.primaryType || detailsData.types?.[0] || 'business',
              openingHours: openingHours,
              photos: photos,
              businessStatus: detailsData.businessStatus || 'OPERATIONAL',
              googleMapsUrl: detailsData.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailsData.formattedAddress || detailsData.displayName?.text || '')}`
            });
          } else {
            console.error('Failed to fetch place details:', detailsResponse.status, detailsData);
          }
          
          // Log API usage for place details
          const usage = await getCollection('mpApiUsage');
          await usage.insertOne({
            id: uuid(),
            provider: 'googlePlaces',
            endpoint: 'place_details_new',
            timestamp: new Date(),
            cost: 0.017
          });
        } catch (error) {
          console.error('Error fetching place details:', error);
        }
      }
      
      // Log API usage for text search
      const usage = await getCollection('mpApiUsage');
      await usage.insertOne({
        id: uuid(),
        provider: 'googlePlaces',
        endpoint: 'text_search_new',
        timestamp: new Date(),
        cost: 0.032
      });
      
      console.log('Total detailed results:', detailedResults.length);
      
      // ===== DUPLICATE DETECTION (MODULE 3) =====
      if (detailedResults.length > 0) {
        const listings = await getCollection('listings');
        
        // Batch check all place IDs
        const placeIds = detailedResults.map(r => r.placeId);
        const existingByPlaceId = await listings.find({
          googlePlaceId: { $in: placeIds }
        }).toArray();
        
        // Create lookup maps
        const placeIdMap = new Map();
        existingByPlaceId.forEach(listing => {
          placeIdMap.set(listing.googlePlaceId, listing);
        });
        
        // Check each result for duplicates
        for (const result of detailedResults) {
          let isDuplicate = false;
          let existingListing = null;
          
          // Priority 1: Google Place ID (exact match)
          if (placeIdMap.has(result.placeId)) {
            isDuplicate = true;
            existingListing = placeIdMap.get(result.placeId);
          }
          
          // Priority 2: Business Name + Address (case-insensitive)
          if (!isDuplicate && result.name && result.address) {
            const nameAddressMatch = await listings.findOne({
              title: { $regex: new RegExp(`^${result.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
              location: { $regex: new RegExp(`^${result.address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
            });
            if (nameAddressMatch) {
              isDuplicate = true;
              existingListing = nameAddressMatch;
            }
          }
          
          // Priority 3: Business Name + Coordinates (tolerance: ~100m = 0.001 degrees)
          if (!isDuplicate && result.name && result.coordinates?.lat && result.coordinates?.lng) {
            const tolerance = 0.001;
            const coordMatch = await listings.findOne({
              title: { $regex: new RegExp(`^${result.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
              'coordinates.lat': { 
                $gte: result.coordinates.lat - tolerance, 
                $lte: result.coordinates.lat + tolerance 
              },
              'coordinates.lng': { 
                $gte: result.coordinates.lng - tolerance, 
                $lte: result.coordinates.lng + tolerance 
              }
            });
            if (coordMatch) {
              isDuplicate = true;
              existingListing = coordMatch;
            }
          }
          
          // Add duplicate detection fields
          result.isDuplicate = isDuplicate;
          result.existingListingId = existingListing?.id || null;
          result.existingListingTitle = existingListing?.title || null;
        }
        
        console.log('Duplicate check complete:', {
          total: detailedResults.length,
          duplicates: detailedResults.filter(r => r.isDuplicate).length,
          new: detailedResults.filter(r => !r.isDuplicate).length
        });
      }
      // ===== END DUPLICATE DETECTION =====
      
      // Log audit
      await logMarketplaceAudit(me, 'Business Discovery', {
        query: fullQuery,
        resultsFound: detailedResults.length
      }, request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'));
      
      return ok({ 
        results: detailedResults,
        total: detailedResults.length,
        query: fullQuery
      });
    } catch (error) {
      console.error('=== DISCOVERY ERROR ===');
      console.error('Error:', error);
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
      return err(`Discovery failed: ${error.message}`);
    }
  }

  // POST /api/marketplace/import - Start bulk import job
  if (path === '/marketplace/import' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const { businesses } = await readBody(request);
    
    if (!businesses || !Array.isArray(businesses) || businesses.length === 0) {
      return err('No businesses provided for import');
    }
    
    // Create import job
    const jobs = await getCollection('mpDiscoveryJobs');
    const jobId = uuid();
    const job = {
      id: jobId,
      type: 'import',
      status: 'pending',
      progress: 0,
      total: businesses.length,
      processed: 0,
      imported: 0,
      skipped: 0,
      failed: 0,
      currentItem: null,
      errors: [],
      businesses: businesses,
      createdBy: me.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await jobs.insertOne(job);
    
    // Log audit
    await logMarketplaceAudit(me, 'Import Started', {
      jobId,
      totalBusinesses: businesses.length
    }, request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'));
    
    // Start background processing (don't await)
    processImportJob(jobId).catch(err => {
      console.error('Import job error:', err);
    });
    
    return ok({ jobId, message: 'Import job started' });
  }

  // Background job processor
  async function processImportJob(jobId) {
    const jobs = await getCollection('mpDiscoveryJobs');
    const job = await jobs.findOne({ id: jobId });
    
    if (!job) {
      console.error('Job not found:', jobId);
      return;
    }
    
    console.log(`\n=== Starting import job ${jobId} ===`);
    console.log('Total businesses to import:', job.businesses?.length || 0);
    
    if (!job.businesses || job.businesses.length === 0) {
      console.error('No businesses in job!');
      await jobs.updateOne({ id: jobId }, {
        $set: { status: 'failed', updatedAt: new Date() }
      });
      return;
    }
    
    // Update status to running
    await jobs.updateOne({ id: jobId }, {
      $set: { status: 'running', updatedAt: new Date() }
    });
    
    const listings = await getCollection('listings');
    
    for (let i = 0; i < job.businesses.length; i++) {
      const business = job.businesses[i];
      
      console.log(`\n--- Processing business ${i + 1}/${job.businesses.length} ---`);
      console.log('Business object keys:', Object.keys(business || {}));
      
      if (!business || !business.name) {
        console.error('Invalid business object at index', i, ':', business);
        await jobs.updateOne({ id: jobId }, {
          $inc: { processed: 1, failed: 1 },
          $push: { errors: { index: i, error: 'Invalid business object' } },
          $set: { 
            progress: Math.round(((i + 1) / job.businesses.length) * 100),
            updatedAt: new Date()
          }
        });
        continue;
      }
      
      // Check if job was cancelled
      const currentJob = await jobs.findOne({ id: jobId });
      if (currentJob.status === 'cancelled') {
        break;
      }
      
      try {
        // Update current item
        await jobs.updateOne({ id: jobId }, {
          $set: { 
            currentItem: business.name,
            updatedAt: new Date()
          }
        });
        
        // Check for duplicates (with detailed logging)
        console.log(`\n=== Checking duplicate for: ${business.name} ===`);
        console.log('Place ID:', business.placeId);
        console.log('Address:', business.address);
        console.log('Phone:', business.phone);
        console.log('Coordinates:', business.coordinates);
        
        const duplicate = await listings.findOne({
          $or: [
            { googlePlaceId: business.placeId },
            { 
              title: business.name,
              location: business.address
            },
            business.phone ? {
              'contact.phone': business.phone
            } : null,
            (business.coordinates?.lat && business.coordinates?.lng) ? {
              'coordinates.lat': business.coordinates.lat,
              'coordinates.lng': business.coordinates.lng
            } : null
          ].filter(Boolean) // Remove null conditions
        });
        
        if (duplicate) {
          console.log('❌ DUPLICATE FOUND:');
          console.log('  Existing listing:', duplicate.title);
          console.log('  Existing ID:', duplicate.id);
          console.log('  Match reason:', 
            duplicate.googlePlaceId === business.placeId ? 'Place ID' :
            (duplicate.title === business.name && duplicate.location === business.address) ? 'Name+Address' :
            duplicate.contact?.phone === business.phone ? 'Phone' :
            'Coordinates'
          );
        } else {
          console.log('✅ No duplicate found - will import');
        }
        
        if (duplicate) {
          await jobs.updateOne({ id: jobId }, {
            $inc: { processed: 1, skipped: 1 },
            $set: { 
              progress: Math.round(((i + 1) / job.businesses.length) * 100),
              updatedAt: new Date()
            }
          });
          
          // Log duplicate skip
          const logs = await getCollection('mpAuditLogs');
          await logs.insertOne({
            id: uuid(),
            userId: job.createdBy,
            userName: 'System',
            userRole: 'super_admin',
            action: 'Duplicate Skipped',
            details: {
              jobId,
              businessName: business.name,
              reason: 'Duplicate found'
            },
            ipAddress: null,
            timestamp: new Date()
          });
          
          continue;
        }
        
        // Create draft listing with AI-generated content
        const listingId = uuid();
        const now = new Date();
        
        // Parse address components
        const addressParts = business.address ? business.address.split(',').map(p => p.trim()) : [];
        const city = addressParts.length >= 2 ? addressParts[addressParts.length - 3] || addressParts[0] : '';
        const state = addressParts.length >= 2 ? addressParts[addressParts.length - 2] : '';
        const country = addressParts.length >= 1 ? addressParts[addressParts.length - 1] : '';
        
        // Generate AI content using Gemini (if EMERGENT_LLM_KEY is available)
        let aiContent = {
          seoTitle: business.name,
          metaDescription: `${business.name} - ${business.address}`,
          description: `${business.name} located at ${business.address}. Imported from Google Places.`,
          shortDescription: business.name,
          amenities: [],
          suggestedTags: [],
          slug: business.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        };
        
        if (process.env.EMERGENT_LLM_KEY) {
          try {
            const prompt = `Generate SEO-optimized content for this business:
Name: ${business.name}
Address: ${business.address}
Category: ${business.category}
Rating: ${business.rating || 'N/A'}

Generate a JSON response with:
1. seoTitle (under 60 chars, include location)
2. metaDescription (under 160 chars, SEO optimized)
3. description (200-300 words, original, engaging, highlight features)
4. shortDescription (1-2 sentences)
5. amenities (array of 5-10 amenities this type of business likely offers)
6. suggestedTags (array of 5-8 relevant tags)

Return ONLY valid JSON, no markdown.`;
            
            const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + process.env.EMERGENT_LLM_KEY, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
              })
            });
            
            if (geminiResponse.ok) {
              const geminiData = await geminiResponse.json();
              const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
              const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
              
              if (jsonMatch) {
                const generated = JSON.parse(jsonMatch[0]);
                aiContent = {
                  seoTitle: generated.seoTitle || aiContent.seoTitle,
                  metaDescription: generated.metaDescription || aiContent.metaDescription,
                  description: generated.description || aiContent.description,
                  shortDescription: generated.shortDescription || aiContent.shortDescription,
                  amenities: Array.isArray(generated.amenities) ? generated.amenities : [],
                  suggestedTags: Array.isArray(generated.suggestedTags) ? generated.suggestedTags : [],
                  slug: aiContent.slug
                };
              }
            }
          } catch (aiError) {
            console.error('AI content generation failed:', aiError);
            // Continue with basic content if AI fails
          }
        }
        
        const listing = {
          id: listingId,
          title: business.name,
          description: aiContent.description,
          shortDescription: aiContent.shortDescription,
          category: business.category === 'lodging' ? 'stay' : 
                   business.category === 'restaurant' || business.category === 'cafe' ? 'experience' :
                   business.category === 'tourist_attraction' ? 'tour' : 'experience',
          subcategory: business.category,
          location: business.address,
          city: city,
          state: state,
          country: country,
          coordinates: business.coordinates,
          googlePlaceId: business.placeId,
          googleMapsUrl: business.googleMapsUrl,
          contact: {
            phone: business.phone,
            website: business.website,
            email: null
          },
          rating: business.rating,
          reviews: business.reviewCount,
          openingHours: business.openingHours,
          businessStatus: business.businessStatus || 'OPERATIONAL',
          images: business.photos.map(p => p.url),
          price: 0,
          amenities: aiContent.amenities,
          services: [],
          tags: aiContent.suggestedTags,
          slug: aiContent.slug,
          seo: {
            title: aiContent.seoTitle,
            description: aiContent.metaDescription,
            keywords: aiContent.suggestedTags.join(', ')
          },
          status: 'draft',
          featured: false,
          isPublic: false,
          isDraft: true,
          aiEnhancementPending: true, // Flag for future AI enhancements
          importSource: 'google_places',
          hostId: null,
          hostName: 'Unclaimed',
          createdAt: now,
          updatedAt: now,
          importedBy: job.createdBy,
          importJobId: jobId,
          importMetadata: {
            importDate: now,
            source: 'google_places',
            originalData: {
              placeId: business.placeId,
              category: business.category,
              rating: business.rating,
              reviewCount: business.reviewCount
            }
          }
        };
        
        await listings.insertOne(listing);
        
        // Store import history
        const importHistory = await getCollection('mpImportHistory');
        await importHistory.insertOne({
          id: uuid(),
          listingId: listingId,
          businessName: business.name,
          googlePlaceId: business.placeId,
          importDate: now,
          importedBy: job.createdBy,
          jobId: jobId,
          source: 'google_places',
          status: 'success'
        });
        
        // Update job progress
        await jobs.updateOne({ id: jobId }, {
          $inc: { processed: 1, imported: 1 },
          $set: { 
            progress: Math.round(((i + 1) / job.businesses.length) * 100),
            updatedAt: new Date()
          }
        });
        
      } catch (error) {
        console.error('Import error for business:', business.name, error);
        
        // Log error
        await jobs.updateOne({ id: jobId }, {
          $inc: { processed: 1, failed: 1 },
          $push: { errors: { business: business.name, error: error.message } },
          $set: { 
            progress: Math.round(((i + 1) / job.businesses.length) * 100),
            updatedAt: new Date()
          }
        });
      }
    }
    
    // Mark job as complete
    const finalJob = await jobs.findOne({ id: jobId });
    const finalStatus = finalJob.status === 'cancelled' ? 'cancelled' : 'completed';
    
    await jobs.updateOne({ id: jobId }, {
      $set: { 
        status: finalStatus,
        progress: 100,
        currentItem: null,
        completedAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    // Log audit
    const logs = await getCollection('mpAuditLogs');
    await logs.insertOne({
      id: uuid(),
      userId: finalJob.createdBy,
      userName: 'System',
      userRole: 'super_admin',
      action: finalStatus === 'cancelled' ? 'Import Cancelled' : 'Import Completed',
      details: {
        jobId,
        total: finalJob.total,
        imported: finalJob.imported,
        skipped: finalJob.skipped,
        failed: finalJob.failed
      },
      ipAddress: null,
      timestamp: new Date()
    });
  }

  // GET /api/marketplace/jobs/:jobId - Get job status
  if (path.match(/^\/marketplace\/jobs\/([^/]+)$/) && method === 'GET') {
    const jobId = path.match(/^\/marketplace\/jobs\/([^/]+)$/)[1];
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const jobs = await getCollection('mpDiscoveryJobs');
    const job = await jobs.findOne({ id: jobId });
    
    if (!job) return err('Job not found', 404);
    
    return ok({ job });
  }

  // POST /api/marketplace/jobs/:jobId/cancel - Cancel job
  if (path.match(/^\/marketplace\/jobs\/([^/]+)\/cancel$/) && method === 'POST') {
    const jobId = path.match(/^\/marketplace\/jobs\/([^/]+)\/cancel$/)[1];
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const jobs = await getCollection('mpDiscoveryJobs');
    const job = await jobs.findOne({ id: jobId });
    
    if (!job) return err('Job not found', 404);
    
    if (job.status !== 'running' && job.status !== 'pending') {
      return err('Job cannot be cancelled in current status');
    }
    
    await jobs.updateOne({ id: jobId }, {
      $set: { 
        status: 'cancelled',
        updatedAt: new Date()
      }
    });
    
    // Log audit
    await logMarketplaceAudit(me, 'Import Cancelled', {
      jobId,
      processed: job.processed,
      total: job.total
    }, request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'));
    
    return ok({ message: 'Job cancelled' });
  }

  // GET /api/marketplace/jobs - List all jobs
  if (path === '/marketplace/jobs' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const skip = parseInt(url.searchParams.get('skip') || '0');
    
    const jobs = await getCollection('mpDiscoveryJobs');
    const total = await jobs.countDocuments();
    const records = await jobs.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.min(limit, 100))
      .toArray();
    
    return ok({ jobs: records, total, limit, skip });
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
