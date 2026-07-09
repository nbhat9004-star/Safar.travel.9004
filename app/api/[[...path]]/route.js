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
  sendEmail,
} from '@/lib/email';
import { verifyFirebaseToken } from '@/lib/firebase-admin';

// Note: OpenAI SDK not used - using fetch API directly for Emergent LLM compatibility

const json = (data, status = 200) => NextResponse.json(data, { status });
const ok = (data = {}, status = 200) => json({ ok: true, ...data }, status);
const err = (message, status = 400) => json({ ok: false, error: message }, status);
const isEmail = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const readBody = async (request) => { try { return await request.json(); } catch { return {}; } };

// Module 9: Booking Timeline / Audit Log
// Writes an event to the bookingTimeline collection. Silent on failure so the
// primary booking write is never blocked by an audit-log error.
async function logBookingEvent(bookingId, action, actor, details) {
  try {
    if (!bookingId || !action) return;
    const tl = await getCollection('bookingTimeline');
    await tl.insertOne({
      id: uuid(),
      bookingId,
      action, // e.g. 'created', 'approved', 'rejected', 'cancelled', 'refunded', 'status_changed'
      actorId: actor?.id || null,
      actorName: actor?.name || (actor?.role === 'system' ? 'System' : 'Unknown'),
      actorRole: actor?.role || null,
      details: details || {},
      timestamp: new Date(),
    });
  } catch (e) { console.error('booking timeline log error', e); }
}

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

// ============================================================================
// MODULE 12 — Host Earnings, Commission & Payout Management (helpers)
// ============================================================================
// Design goals:
//   - All finance amounts stored as numbers (INR). Percentages 0-100.
//   - Provider-agnostic: `hostPayouts.method` is a string ('bank'|'upi'|'wallet'|
//     'manual'|'razorpay_route'|'stripe_connect'|'cashfree'|...). Business logic
//     does not depend on the string — future providers plug in without changes.
//   - Non-blocking: earnings / audit writes never break the primary flow.
//   - Idempotent: earnings creation is upserted per bookingId.

const FINANCE_DEFAULTS_M12 = {
  id: 'default',
  commissionMode: 'percent',         // 'percent' | 'fixed'
  defaultCommissionPct: 15,
  fixedCommission: 0,
  categoryCommissions: {
    hotels: 15, houseboats: 15, homestays: 12, tours: 10,
    activities: 10, car_rentals: 12, bike_rentals: 12,
  },
  minPayoutAmount: 500,
  payoutSchedule: 'weekly',          // 'instant' | 'daily' | 'weekly' | 'monthly'
  holdPeriodDays: 3,                 // funds move to `available` this many days after checkout
  autoPayouts: false,
  manualApproval: true,
  enabledMethods: { wallet: true, bank: true, upi: true },
  createdAt: new Date(), updatedAt: new Date(),
};

async function m12GetFinanceSettings() {
  const col = await getCollection('financeSettings');
  let doc = await col.findOne({ id: 'default' }, { projection: { _id: 0 } });
  if (!doc) {
    doc = { ...FINANCE_DEFAULTS_M12 };
    try { await col.insertOne({ ...doc }); } catch {}
  }
  // Ensure new fields exist (forward-compatible)
  const merged = { ...FINANCE_DEFAULTS_M12, ...doc, categoryCommissions: { ...FINANCE_DEFAULTS_M12.categoryCommissions, ...(doc.categoryCommissions || {}) }, enabledMethods: { ...FINANCE_DEFAULTS_M12.enabledMethods, ...(doc.enabledMethods || {}) } };
  return merged;
}

function m12ResolveCommission(listing, settings) {
  // Map internal category → finance category key
  const cat = (listing?.category || '').toLowerCase();
  const sub = (listing?.subcategory || '').toLowerCase();
  const map = {
    stay: sub === 'houseboat' ? 'houseboats' : (sub === 'home' || sub === 'homestay' || sub === 'cottage' ? 'homestays' : 'hotels'),
    tour: 'tours',
    experience: 'activities',
    transport: sub === 'bike' ? 'bike_rentals' : 'car_rentals',
  };
  const key = map[cat] || 'hotels';
  if (settings.commissionMode === 'fixed') {
    return { mode: 'fixed', pct: 0, fixed: Number(settings.fixedCommission) || 0, categoryKey: key };
  }
  const pct = Number(settings.categoryCommissions?.[key] ?? settings.defaultCommissionPct) || 0;
  return { mode: 'percent', pct, fixed: 0, categoryKey: key };
}

function m12CalcNet(bookingAmount, commissionResolved, refundDeduction = 0) {
  const amt = Number(bookingAmount) || 0;
  const commissionAmount = commissionResolved.mode === 'fixed'
    ? Math.min(amt, Number(commissionResolved.fixed) || 0)
    : Math.round(amt * (commissionResolved.pct / 100));
  const net = Math.max(0, amt - commissionAmount - (Number(refundDeduction) || 0));
  return { commissionAmount, netEarnings: net };
}

async function m12CreateHostEarnings(booking, listing) {
  try {
    if (!booking || !listing || !booking.hostId) return;
    const col = await getCollection('hostEarnings');
    // Idempotent
    const existing = await col.findOne({ bookingId: booking.bookingId });
    if (existing) return;
    const settings = await m12GetFinanceSettings();
    const resolved = m12ResolveCommission(listing, settings);
    const { commissionAmount, netEarnings } = m12CalcNet(booking.totalPrice, resolved, 0);
    const availableAt = new Date();
    availableAt.setDate(availableAt.getDate() + (Number(settings.holdPeriodDays) || 0));
    const doc = {
      id: uuid(),
      bookingId: booking.bookingId,
      hostId: booking.hostId,
      listingId: booking.listingId,
      listingTitle: booking.listingTitle,
      listingCategory: listing.category || null,
      listingSubcategory: listing.subcategory || null,
      commissionCategory: resolved.categoryKey,
      travelerId: booking.travelerId,
      travelerName: booking.travelerName,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      bookingAmount: Number(booking.totalPrice) || 0,
      commissionMode: resolved.mode,
      commissionPct: resolved.pct,
      commissionFixed: resolved.fixed,
      commissionAmount,
      refundDeduction: 0,
      netEarnings,
      status: 'pending',              // pending | available | paid | refunded
      availableAt,
      payoutId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await col.insertOne(doc);
  } catch (e) { console.error('m12CreateHostEarnings error', e); }
}

async function m12RefundHostEarnings(bookingId, actor) {
  try {
    if (!bookingId) return;
    const col = await getCollection('hostEarnings');
    const rec = await col.findOne({ bookingId });
    if (!rec) return;
    if (rec.status === 'paid') {
      // Cannot claw-back a paid earning automatically; mark refunded with deduction note
      await col.updateOne({ bookingId }, { $set: { refundDeduction: rec.netEarnings, status: 'refunded', updatedAt: new Date(), refundedAt: new Date() } });
    } else {
      await col.updateOne({ bookingId }, { $set: { refundDeduction: rec.netEarnings, netEarnings: 0, status: 'refunded', updatedAt: new Date(), refundedAt: new Date() } });
    }
    m12LogFinanceAudit(actor || { role: 'system', name: 'System' }, 'earnings_refunded', { bookingId, previous: { status: rec.status, netEarnings: rec.netEarnings }, new: { status: 'refunded' } }).catch(() => {});
  } catch (e) { console.error('m12RefundHostEarnings error', e); }
}

async function m12MarkEarningsAvailableIfDue() {
  // Utility called on host earnings reads; moves 'pending' → 'available' when availableAt has passed AND booking is 'approved'.
  try {
    const col = await getCollection('hostEarnings');
    const now = new Date();
    const due = await col.find({ status: 'pending', availableAt: { $lte: now } }).toArray();
    if (!due.length) return;
    const bookingsCol = await getCollection('bookings');
    for (const e of due) {
      const b = await bookingsCol.findOne({ bookingId: e.bookingId }, { projection: { status: 1, _id: 0 } });
      if (!b) continue;
      if (b.status === 'approved') {
        await col.updateOne({ id: e.id }, { $set: { status: 'available', updatedAt: new Date() } });
      }
    }
  } catch (e) { console.error('m12MarkEarningsAvailableIfDue error', e); }
}

async function m12LogFinanceAudit(actor, action, details) {
  try {
    const col = await getCollection('financeAuditLog');
    await col.insertOne({
      id: uuid(),
      actorId: actor?.id || null,
      actorName: actor?.name || (actor?.role === 'system' ? 'System' : 'Unknown'),
      actorRole: actor?.role || null,
      action,
      details: details || {},
      timestamp: new Date(),
    });
  } catch (e) { console.error('m12LogFinanceAudit error', e); }
}

function m12MaskAccount(acc) {
  if (!acc) return '';
  const s = String(acc);
  if (s.length <= 4) return '****';
  return `****${s.slice(-4)}`;
}

function m12SanitizePayoutSettings(doc, { unmask = false } = {}) {
  if (!doc) return null;
  const { _id, accountNumber, ...rest } = doc;
  return {
    ...rest,
    accountNumber: unmask ? accountNumber : m12MaskAccount(accountNumber),
    accountNumberMasked: m12MaskAccount(accountNumber),
  };
}
// ============================================================================
// End Module 12 helpers
// ============================================================================

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
    
    // Send verification email — AWAITED so Vercel serverless doesn't drop the
    // outgoing HTTP request to Resend before the response is returned.
    // sendEmail() has internal try/catch and returns { success, error } without
    // throwing, so this cannot fail the registration.
    try {
      const result = await sendVerificationEmail(user, verificationLink);
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
    } catch (error) {
      console.error('=== EMAIL SEND EXCEPTION ===');
      console.error('❌ Fatal error sending verification email:', error);
      console.error('Error stack:', error?.stack);
      console.error('=== EMAIL VERIFICATION FLOW END ===');
    }

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

    // Send welcome email after successful verification — AWAITED
    try {
      await sendWelcomeEmail({ ...user, emailVerified: true });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }

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

    // Send resend verification email — AWAITED
    try {
      await sendVerificationEmail({ ...user, name: user.name }, buildVerificationLink(verificationToken));
    } catch (error) {
      console.error('Failed to resend verification email:', error);
    }

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
      
      // Send welcome email if user has email — AWAITED (Vercel serverless)
      if (user.email) {
        try {
          await sendWelcomeEmail(user);
        } catch (error) {
          console.error('Failed to send welcome email:', error);
        }
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
      
      // Send welcome email — AWAITED (Vercel serverless)
      try {
        await sendWelcomeEmail(user);
      } catch (error) {
        console.error('Failed to send welcome email:', error);
      }
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

    // Module 12: create host earnings record (pending until hold period elapses)
    m12CreateHostEarnings(doc, listing).catch(() => {});

    // Module 13: in-app notifications for booking creation
    mkNotif({
      userId: listing.hostId,
      type: 'booking_created',
      category: 'booking',
      title: 'New booking request',
      body: `${me.name} requested ${listing.title} · ${nights} night${nights === 1 ? '' : 's'} · ${g} guest${g === 1 ? '' : 's'}`,
      link: `/dashboard/host?tab=bookings`,
      meta: { bookingId: doc.bookingId, listingTitle: listing.title, listingId: listingId, amount: totalPrice },
    }).catch(() => {});
    mkNotif({
      userId: me.id,
      type: 'booking_created',
      category: 'booking',
      title: 'Booking request sent',
      body: `Your request for ${listing.title} was sent to the host.`,
      link: `/dashboard/traveler/bookings/${doc.bookingId}`,
      meta: { bookingId: doc.bookingId, listingTitle: listing.title, listingId },
    }).catch(() => {});

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

    // Send booking confirmation emails — AWAITED so Vercel serverless doesn't
    // drop the outgoing Resend HTTP request before returning the response.
    // Uses Promise.allSettled so a failure of one email doesn't affect the other
    // or the booking response.
    const bookingEmailTasks = [];
    if (traveler) bookingEmailTasks.push(
      sendBookingConfirmation(doc, traveler).catch((error) => {
        console.error('Failed to send booking confirmation to traveler:', error);
        return { success: false, error };
      })
    );
    if (host) bookingEmailTasks.push(
      sendBookingNotificationToHost(doc, host).catch((error) => {
        console.error('Failed to send booking notification to host:', error);
        return { success: false, error };
      })
    );
    if (bookingEmailTasks.length) await Promise.allSettled(bookingEmailTasks);

    // Module 9: log booking created event
    logBookingEvent(doc.bookingId, 'created', me, {
      listingId: doc.listingId,
      listingTitle: doc.listingTitle,
      checkInDate: doc.checkInDate,
      checkOutDate: doc.checkOutDate,
      guests: doc.guests,
      nights: doc.nights,
      totalPrice: doc.totalPrice,
      inventoryTypeName: doc.inventoryTypeName,
    }).catch(() => {});

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
    
    // Send status-change emails — AWAITED (Promise.allSettled) so Vercel
    // serverless doesn't drop the Resend HTTP calls before responding.
    const statusEmailTasks = [];
    if (status === 'approved' && traveler) {
      statusEmailTasks.push(
        sendBookingApprovedEmail(fresh, traveler).catch((error) => {
          console.error('Failed to send booking approved email:', error);
          return { success: false, error };
        })
      );
      const invoiceId = `INV-${Date.now()}-${fresh.bookingId.slice(0, 8).toUpperCase()}`;
      statusEmailTasks.push(
        sendInvoiceEmail(fresh, traveler, invoiceId).catch((error) => {
          console.error('Failed to send invoice email:', error);
          return { success: false, error };
        })
      );
    } else if (status === 'rejected' && traveler) {
      statusEmailTasks.push(
        sendBookingRejectedEmail(fresh, traveler, reason).catch((error) => {
          console.error('Failed to send booking rejected email:', error);
          return { success: false, error };
        })
      );
    } else if (status === 'cancelled') {
      if (traveler) statusEmailTasks.push(
        sendBookingCancellationEmail(fresh, traveler, false).catch((error) => {
          console.error('Failed to send cancellation email to traveler:', error);
          return { success: false, error };
        })
      );
      if (host) statusEmailTasks.push(
        sendBookingCancellationEmail(fresh, host, true).catch((error) => {
          console.error('Failed to send cancellation email to host:', error);
          return { success: false, error };
        })
      );
    }
    if (statusEmailTasks.length) await Promise.allSettled(statusEmailTasks);

    // Module 9: log status-change event
    logBookingEvent(id, status, me, {
      previousStatus: b.status,
      reason: reason || null,
      listingTitle: b.listingTitle,
    }).catch(() => {});

    // Module 12: refund host earnings on cancellation / rejection
    if (status === 'cancelled' || status === 'rejected') {
      m12RefundHostEarnings(id, me).catch(() => {});
    }

    // Module 13: booking lifecycle notifications
    if (status === 'approved') {
      mkNotif({
        userId: b.travelerId,
        type: 'booking_confirmed',
        category: 'booking',
        title: 'Booking confirmed',
        body: `${b.listingTitle} — Your booking has been confirmed by the host.`,
        link: `/dashboard/traveler/bookings/${id}`,
        meta: { bookingId: id, listingTitle: b.listingTitle, listingId: b.listingId },
      }).catch(() => {});
    } else if (status === 'rejected') {
      mkNotif({
        userId: b.travelerId,
        type: 'booking_rejected',
        category: 'booking',
        title: 'Booking not accepted',
        body: reason ? `${b.listingTitle} — ${reason}` : `${b.listingTitle} — Unfortunately your booking wasn't accepted.`,
        link: `/dashboard/traveler/bookings/${id}`,
        meta: { bookingId: id, listingTitle: b.listingTitle, reason: reason || null },
      }).catch(() => {});
    } else if (status === 'cancelled') {
      // notify counter-party
      const others = [b.travelerId, b.hostId].filter((uid) => uid && uid !== me.id);
      others.forEach((uid) => {
        mkNotif({
          userId: uid,
          type: 'booking_cancelled',
          category: 'booking',
          title: 'Booking cancelled',
          body: `${b.listingTitle} — booking was cancelled.`,
          link: `/dashboard/traveler/bookings/${id}`,
          meta: { bookingId: id, listingTitle: b.listingTitle, cancelledBy: me.id },
        }).catch(() => {});
      });
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
      logBookingEvent(id, 'invoice_sent', me, { invoiceId, to: traveler.email }).catch(() => {});
      return ok({ message: 'Invoice email sent successfully', invoiceId });
    } catch (error) {
      console.error('Failed to send invoice email:', error);
      return err('Failed to send invoice email', 500);
    }
  }

  // =====================================================================
  // MODULE 11 (Messaging) — Host ↔ Guest booking-scoped conversations.
  // Reuses:
  //   - `notifications` collection + existing GET/PATCH/POST endpoints
  //     (NotificationBell in Navbar polls /api/notifications every 30s and
  //      surfaces our new "New message" notifications automatically)
  //   - `bookings` permission model (traveler owner / host owner / admin)
  //   - `users` collection for actor identity + recipient email lookup
  //   - `sendEmail` from /app/lib/email.js for outbound email notifications
  // Adds only two collections: `bookingMessages` + optional `bookingConversations`.
  // =====================================================================

  const mkMessageNotif = async (recipientId, actor, booking, preview) => {
    if (!recipientId || recipientId === actor.id) return;
    try {
      const notifications = await getCollection('notifications');
      await notifications.insertOne({
        id: uuid(),
        userId: recipientId,
        type: 'booking_message',
        title: `New message from ${actor.name || actor.email}`,
        body: preview.length > 140 ? preview.slice(0, 137) + '...' : preview,
        link: `/dashboard/traveler/bookings/${booking.bookingId}`,
        meta: { bookingId: booking.bookingId, listingTitle: booking.listingTitle, actorId: actor.id, actorName: actor.name },
        read: false,
        createdAt: new Date(),
      });
    } catch (e) { console.error('mkMessageNotif error', e); }
  };

  // MODULE 13 — Generic notification helper (used across booking / payment / wallet events)
  const mkNotif = async ({ userId, type, title, body, link = null, meta = {}, category = null }) => {
    if (!userId) return;
    try {
      const notifications = await getCollection('notifications');
      await notifications.insertOne({
        id: uuid(),
        userId,
        type,
        category: category || (String(type).split('_')[0]),
        title: String(title || '').slice(0, 180),
        body: String(body || '').slice(0, 500),
        link,
        meta: meta || {},
        read: false,
        createdAt: new Date(),
      });
    } catch (e) { console.error('mkNotif error', e); }
  };

  // POST /api/bookings/:id/messages — send a message (traveler / host / admin)
  if (segments[0] === 'bookings' && segments[1] && segments[2] === 'messages' && method === 'POST') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    const id = segments[1];
    const bookings = await getCollection('bookings');
    const b = await bookings.findOne({ bookingId: id }, { projection: { _id: 0 } });
    if (!b) return err('Booking not found', 404);
    if (me.role !== 'admin' && me.role !== 'super_admin' && me.id !== b.travelerId && me.id !== b.hostId) {
      return err('Forbidden', 403);
    }
    const body = await readBody(request);
    const text = String(body.text || body.message || '').trim();
    const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null;
    const attachmentType = body.attachmentType || (imageUrl ? 'image' : null);
    if (!text && !imageUrl) return err('Message text or attachment is required');
    if (text.length > 4000) return err('Message too long (max 4000 chars)');
    if (imageUrl && imageUrl.length > 5000) return err('Attachment URL too long');

    const msg = {
      id: uuid(),
      bookingId: id,
      senderId: me.id,
      senderName: me.name || me.email,
      senderRole: me.role,
      // Denormalize participants for cheap indexed lookups later
      participantIds: [b.travelerId, b.hostId].filter(Boolean),
      text,
      imageUrl,
      attachmentType,
      createdAt: new Date(),
      readBy: [me.id], // sender counts as read
    };

    const msgs = await getCollection('bookingMessages');
    await msgs.insertOne(msg);

    // Upsert lightweight conversation doc for fast list rendering.
    const convos = await getCollection('bookingConversations');
    const preview = text || (imageUrl ? '📷 Photo' : '');
    await convos.updateOne(
      { bookingId: id },
      { $set: {
          bookingId: id,
          participantIds: msg.participantIds,
          travelerId: b.travelerId,
          hostId: b.hostId,
          listingId: b.listingId,
          listingTitle: b.listingTitle,
          listingImage: b.listingImage,
          bookingStatus: b.status,
          lastMessageAt: msg.createdAt,
          lastMessagePreview: preview.slice(0, 200),
          lastSenderId: me.id,
          lastSenderName: msg.senderName,
        },
        $setOnInsert: { id: uuid(), createdAt: new Date() },
        $inc: { messageCount: 1 },
      },
      { upsert: true }
    );

    // In-app notifications for the *other* party (traveler ↔ host).
    // Admin messaging notifies both parties. Every sender's own device is skipped.
    const users = await getCollection('users');
    const notifyIds = new Set();
    if (me.id !== b.travelerId) notifyIds.add(b.travelerId);
    if (me.id !== b.hostId) notifyIds.add(b.hostId);
    // Also notify any admins who are actively watching (best-effort broadcast)
    const admins = await users.find({ role: { $in: ['admin','super_admin'] } }, { projection: { id: 1 } }).toArray();
    admins.forEach(a => { if (a.id !== me.id) notifyIds.add(a.id); });

    await Promise.all([...notifyIds].map(rid => mkMessageNotif(rid, me, b, preview || 'sent an attachment')));

    // Email notification for traveler ↔ host (skip admins to avoid noise).
    // AWAITED (Vercel serverless email fix pattern established earlier).
    const emailRecipients = [];
    if (me.id !== b.travelerId && b.travelerId) emailRecipients.push({ userId: b.travelerId });
    if (me.id !== b.hostId && b.hostId) emailRecipients.push({ userId: b.hostId });
    const recipientUsers = await Promise.all(
      emailRecipients.map(r => users.findOne({ id: r.userId }, { projection: { email: 1, name: 1 } }))
    );
    const emailTasks = recipientUsers.filter(Boolean).filter(u => u.email).map(u => {
      const subject = `New message about ${b.listingTitle || 'your booking'}`;
      const safeText = (text || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const imageBlock = imageUrl ? `<div style="margin-top:12px"><img src="${imageUrl}" alt="attachment" style="max-width:100%;border-radius:8px" /></div>` : '';
      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1c1917">
          <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#059669;font-weight:700">Safar · New Message</div>
          <h1 style="font-size:24px;margin:8px 0 4px 0">${msg.senderName} sent you a message</h1>
          <div style="font-size:13px;color:#6b7280">About: ${b.listingTitle || 'Booking ' + id}</div>
          <div style="margin:24px 0;padding:20px;background:#f8fafc;border-left:4px solid #10b981;border-radius:8px;font-size:15px;line-height:1.6;white-space:pre-wrap">${safeText || '(sent an attachment)'}${imageBlock}</div>
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || ''}/dashboard/traveler/bookings/${id}"
             style="display:inline-block;background:#10b981;color:#fff;padding:12px 24px;border-radius:9999px;font-weight:600;text-decoration:none">Reply on Safar</a>
          <div style="margin-top:32px;font-size:12px;color:#9ca3af">You're receiving this because you're a participant on booking #${id.slice(0,8)}.</div>
        </div>`;
      return sendEmail({ to: u.email, subject, html }).catch(e => ({ success: false, error: e }));
    });
    if (emailTasks.length) await Promise.allSettled(emailTasks);

    return ok({ message: msg }, 201);
  }

  // GET /api/bookings/:id/messages — thread history + auto-mark-read for viewer
  if (segments[0] === 'bookings' && segments[1] && segments[2] === 'messages' && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    const id = segments[1];
    const bookings = await getCollection('bookings');
    const b = await bookings.findOne({ bookingId: id }, { projection: { _id: 0, travelerId: 1, hostId: 1, listingTitle: 1, listingImage: 1, listingId: 1 } });
    if (!b) return err('Booking not found', 404);
    if (me.role !== 'admin' && me.role !== 'super_admin' && me.id !== b.travelerId && me.id !== b.hostId) {
      return err('Forbidden', 403);
    }
    const msgs = await getCollection('bookingMessages');
    const list = await msgs.find({ bookingId: id }, { projection: { _id: 0 } }).sort({ createdAt: 1 }).limit(500).toArray();

    // Mark viewer as reader on any messages they haven't marked (fire-and-forget-safe: no email cost)
    const unreadIds = list.filter(m => !(m.readBy || []).includes(me.id)).map(m => m.id);
    if (unreadIds.length) {
      await msgs.updateMany({ id: { $in: unreadIds } }, { $addToSet: { readBy: me.id } });
    }
    // Clear any "booking_message" in-app notifications targeting this user for this booking
    const notifications = await getCollection('notifications');
    await notifications.updateMany(
      { userId: me.id, type: 'booking_message', 'meta.bookingId': id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    return ok({
      messages: list,
      booking: { bookingId: id, listingTitle: b.listingTitle, listingImage: b.listingImage, listingId: b.listingId, travelerId: b.travelerId, hostId: b.hostId },
      viewerId: me.id,
    });
  }

  // GET /api/me/conversations — my booking threads (traveler + host)
  if (path === '/me/conversations' && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    const convos = await getCollection('bookingConversations');
    const list = await convos.find({ participantIds: me.id }, { projection: { _id: 0 } }).sort({ lastMessageAt: -1 }).limit(100).toArray();
    // Compute per-thread unread for viewer
    const msgs = await getCollection('bookingMessages');
    const withUnread = await Promise.all(list.map(async (c) => {
      const unread = await msgs.countDocuments({ bookingId: c.bookingId, readBy: { $ne: me.id } });
      return { ...c, unreadCount: unread };
    }));
    return ok({ conversations: withUnread });
  }

  // Module 9: GET /api/bookings/:id/timeline (booking audit history)
  // Placed BEFORE GET /api/bookings/:id so it matches first.
  if (segments[0] === 'bookings' && segments[1] && segments[2] === 'timeline' && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    const id = segments[1];
    const bookings = await getCollection('bookings');
    const b = await bookings.findOne({ bookingId: id }, { projection: { _id: 0 } });
    if (!b) return err('Booking not found', 404);
    // Permission: traveler owner, host owner, or admin
    if (me.role !== 'admin' && me.id !== b.travelerId && me.id !== b.hostId) {
      return err('Forbidden', 403);
    }
    const tl = await getCollection('bookingTimeline');
    const events = await tl.find({ bookingId: id }, { projection: { _id: 0 } })
      .sort({ timestamp: 1 })
      .toArray();
    return ok({ bookingId: id, events });
  }

  // Module 9: GET /api/bookings/:id (single booking with permission check)
  if (segments[0] === 'bookings' && segments[1] && !segments[2] && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    const id = segments[1];
    const bookings = await getCollection('bookings');
    const b = await bookings.findOne({ bookingId: id }, { projection: { _id: 0 } });
    if (!b) return err('Booking not found', 404);
    // Permission: traveler owner, host owner, or admin
    if (me.role !== 'admin' && me.id !== b.travelerId && me.id !== b.hostId) {
      return err('Forbidden', 403);
    }
    return ok({ booking: b });
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
    logBookingEvent(id, 'cancelled', { ...me, role: 'admin' }, {
      by: 'admin',
      previousStatus: booking.status,
      listingTitle: booking.listingTitle,
    }).catch(() => {});
    // Module 12: refund host earnings
    m12RefundHostEarnings(id, me).catch(() => {});
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
    logBookingEvent(id, 'refunded', { ...me, role: 'admin' }, {
      amount: booking.totalPrice || 0,
      listingTitle: booking.listingTitle,
    }).catch(() => {});
    // Module 12: refund host earnings
    m12RefundHostEarnings(id, me).catch(() => {});
    // Module 13: notify traveler about refund
    mkNotif({
      userId: booking.travelerId,
      type: 'refund_issued',
      category: 'payment',
      title: 'Refund issued',
      body: `A refund of ₹${(booking.totalPrice || 0).toLocaleString('en-IN')} has been issued for ${booking.listingTitle}.`,
      link: `/dashboard/traveler/bookings/${id}`,
      meta: { bookingId: id, amount: booking.totalPrice || 0 },
    }).catch(() => {});
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

  // =====================================================================
  // MODULE 10 — PAYMENT GATEWAY MANAGEMENT (Super Admin)
  // Additive only. Reuses requireRole + getCurrentUser + getCollection.
  // Provider-agnostic architecture; Razorpay is the first supported provider.
  // =====================================================================

  // ---- Local helpers (encryption, masking, audit, provider drivers) ----
  const crypto = await import('crypto');

  const _pgDeriveKey = () => {
    const raw = process.env.PAYMENT_ENCRYPTION_KEY || process.env.JWT_SECRET || 'safar-pg-fallback-key-please-configure';
    // 32-byte key via SHA-256
    return crypto.createHash('sha256').update(String(raw)).digest();
  };

  const pgEncrypt = (plain) => {
    if (plain === undefined || plain === null || plain === '') return null;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', _pgDeriveKey(), iv);
    const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // format: v1:ivHex:tagHex:cipherHex
    return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
  };

  const pgDecrypt = (blob) => {
    try {
      if (!blob || typeof blob !== 'string' || !blob.startsWith('v1:')) return '';
      const parts = blob.split(':');
      if (parts.length !== 4) return '';
      const [, ivHex, tagHex, encHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const enc = Buffer.from(encHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', _pgDeriveKey(), iv);
      decipher.setAuthTag(tag);
      const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
      return dec.toString('utf8');
    } catch (e) { console.error('pgDecrypt error', e); return ''; }
  };

  const pgMask = (plain, keep = 4) => {
    if (!plain) return '';
    const s = String(plain);
    if (s.length <= keep + 2) return '••••';
    return s.slice(0, keep) + '••••••••' + s.slice(-2);
  };

  const pgSanitize = (doc) => {
    if (!doc) return null;
    const { _id, encryptedKeySecret, encryptedWebhookSecret, ...rest } = doc;
    // Decrypt purely to build the masked preview; NEVER return plaintext to client.
    const secretPlain = encryptedKeySecret ? pgDecrypt(encryptedKeySecret) : '';
    const webhookPlain = encryptedWebhookSecret ? pgDecrypt(encryptedWebhookSecret) : '';
    return {
      ...rest,
      keySecretMasked: secretPlain ? pgMask(secretPlain) : '',
      webhookSecretMasked: webhookPlain ? pgMask(webhookPlain) : '',
      hasKeySecret: !!secretPlain,
      hasWebhookSecret: !!webhookPlain,
    };
  };

  const pgAudit = async (gatewayId, provider, action, actor, note) => {
    try {
      const col = await getCollection('paymentAudit');
      await col.insertOne({
        id: uuid(),
        gatewayId: gatewayId || null,
        provider: provider || null,
        action, // 'created' | 'updated' | 'deleted' | 'enabled' | 'disabled' | 'test_connection' | 'credentials_changed'
        actorId: actor?.id || null,
        actorName: actor?.name || null,
        actorEmail: actor?.email || null,
        note: note || null,
        timestamp: new Date(),
      });
    } catch (e) { console.error('pgAudit error', e); }
  };

  // Razorpay driver — verifies credentials without creating a payment.
  const pgTestRazorpay = async ({ keyId, keySecret }) => {
    if (!keyId || !keySecret) return { ok: false, status: 'not_configured', message: 'keyId and keySecret are required' };
    try {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      // Lightweight read-only call. Uses no funds and creates no records.
      const res = await fetch('https://api.razorpay.com/v1/payments?count=1', {
        method: 'GET',
        headers: { 'Authorization': `Basic ${auth}` },
      });
      if (res.status === 200) return { ok: true, status: 'configured', message: 'Connection verified' };
      if (res.status === 401) return { ok: false, status: 'invalid', message: 'Invalid Razorpay credentials' };
      const body = await res.text().catch(() => '');
      return { ok: false, status: 'invalid', message: `Razorpay returned ${res.status}${body ? ': ' + body.slice(0, 200) : ''}` };
    } catch (e) {
      return { ok: false, status: 'error', message: e?.message || 'Network error contacting Razorpay' };
    }
  };

  const pgTestProvider = async (provider, creds) => {
    switch ((provider || '').toLowerCase()) {
      case 'razorpay': return pgTestRazorpay(creds);
      // Stubs for future providers — return not_supported so admin can save creds
      // but knows test-connection isn't wired yet. No code changes required to
      // enable a new provider beyond adding a case here.
      case 'stripe':
      case 'paypal':
      case 'phonepe':
      case 'cashfree':
      case 'ccavenue':
      case 'manual_bank_transfer':
        return { ok: false, status: 'not_supported', message: `Test connection for ${provider} is not yet implemented. Credentials saved.` };
      default:
        return { ok: false, status: 'unknown_provider', message: 'Unknown provider' };
    }
  };

  const PG_ALLOWED_PROVIDERS = ['razorpay','stripe','paypal','phonepe','cashfree','ccavenue','manual_bank_transfer'];
  const PG_ALLOWED_MODES = ['test','live'];
  const PG_ALLOWED_REFUND_MODES = ['auto','manual','disabled'];

  // ---- Endpoints ----

  // GET /api/admin/payment-gateways — list (super_admin only)
  if (path === '/admin/payment-gateways' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'super_admin'); if (!g.ok) return err(g.error, g.status);
    const col = await getCollection('paymentGateways');
    const docs = await col.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    return ok({ gateways: docs.map(pgSanitize), providers: PG_ALLOWED_PROVIDERS });
  }

  // POST /api/admin/payment-gateways — create (super_admin only)
  if (path === '/admin/payment-gateways' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'super_admin'); if (!g.ok) return err(g.error, g.status);
    const body = await readBody(request);
    const provider = String(body.provider || '').toLowerCase();
    if (!PG_ALLOWED_PROVIDERS.includes(provider)) return err('Unsupported provider');
    const mode = PG_ALLOWED_MODES.includes(body.mode) ? body.mode : 'test';
    const refundMode = PG_ALLOWED_REFUND_MODES.includes(body.refundMode) ? body.refundMode : 'manual';
    const keyId = body.keyId ? String(body.keyId).trim() : '';
    const keySecretPlain = body.keySecret ? String(body.keySecret) : '';
    const webhookSecretPlain = body.webhookSecret ? String(body.webhookSecret) : '';
    if (!keyId) return err('Key ID is required');
    if (!keySecretPlain) return err('Key Secret is required');

    const col = await getCollection('paymentGateways');
    const now = new Date();
    const doc = {
      id: uuid(),
      provider,
      providerName: body.providerName || provider.charAt(0).toUpperCase() + provider.slice(1),
      enabled: body.enabled === true,
      mode,
      keyId,
      encryptedKeySecret: pgEncrypt(keySecretPlain),
      encryptedWebhookSecret: webhookSecretPlain ? pgEncrypt(webhookSecretPlain) : null,
      currency: body.currency || 'INR',
      country: body.country || 'IN',
      paymentTimeout: Number(body.paymentTimeout) > 0 ? Number(body.paymentTimeout) : 300, // seconds
      autoCapture: body.autoCapture !== false,
      refundMode,
      // Module 10.1 — commercial flags (safe defaults)
      bookingFeeEnabled: body.bookingFeeEnabled === true,
      bookingFeeAmount: Number(body.bookingFeeAmount) >= 0 ? Number(body.bookingFeeAmount) : 0,
      onlinePaymentDiscount: Number(body.onlinePaymentDiscount) >= 0 ? Number(body.onlinePaymentDiscount) : 0,
      enableWallet: body.enableWallet === true,
      enableSafarCredits: body.enableSafarCredits === true,
      status: 'not_configured', // becomes 'configured' after successful test-connection
      lastTestedAt: null,
      lastTestResult: null,
      createdAt: now,
      updatedAt: now,
      createdBy: me.id,
      createdByName: me.name || me.email || 'super_admin',
      updatedBy: me.id,
      updatedByName: me.name || me.email || 'super_admin',
    };
    await col.insertOne(doc);
    await pgAudit(doc.id, provider, 'created', me, `Provider ${provider} configured in ${mode} mode`);
    return ok({ gateway: pgSanitize(doc) }, 201);
  }

  // GET /api/admin/payment-gateways/:id — single (super_admin only)
  if (segments[0] === 'admin' && segments[1] === 'payment-gateways' && segments[2] && !segments[3] && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'super_admin'); if (!g.ok) return err(g.error, g.status);
    const col = await getCollection('paymentGateways');
    const doc = await col.findOne({ id: segments[2] });
    if (!doc) return err('Gateway not found', 404);
    return ok({ gateway: pgSanitize(doc) });
  }

  // PUT /api/admin/payment-gateways/:id — update (super_admin only)
  if (segments[0] === 'admin' && segments[1] === 'payment-gateways' && segments[2] && !segments[3] && method === 'PUT') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'super_admin'); if (!g.ok) return err(g.error, g.status);
    const body = await readBody(request);
    const col = await getCollection('paymentGateways');
    const doc = await col.findOne({ id: segments[2] });
    if (!doc) return err('Gateway not found', 404);

    const set = { updatedAt: new Date(), updatedBy: me.id, updatedByName: me.name || me.email || 'super_admin' };
    let credentialsChanged = false;

    if (body.providerName !== undefined) set.providerName = String(body.providerName);
    if (body.enabled !== undefined) set.enabled = !!body.enabled;
    if (body.mode !== undefined && PG_ALLOWED_MODES.includes(body.mode)) set.mode = body.mode;
    if (body.currency !== undefined) set.currency = String(body.currency);
    if (body.country !== undefined) set.country = String(body.country);
    if (body.paymentTimeout !== undefined) {
      const n = Number(body.paymentTimeout);
      if (Number.isFinite(n) && n > 0) set.paymentTimeout = n;
    }
    if (body.autoCapture !== undefined) set.autoCapture = !!body.autoCapture;
    if (body.refundMode !== undefined && PG_ALLOWED_REFUND_MODES.includes(body.refundMode)) set.refundMode = body.refundMode;
    // Module 10.1 — commercial flags (Module 10 backend extension, additive)
    if (body.bookingFeeEnabled !== undefined) set.bookingFeeEnabled = !!body.bookingFeeEnabled;
    if (body.bookingFeeAmount !== undefined) {
      const n = Number(body.bookingFeeAmount);
      if (Number.isFinite(n) && n >= 0) set.bookingFeeAmount = n;
    }
    if (body.onlinePaymentDiscount !== undefined) {
      const n = Number(body.onlinePaymentDiscount);
      if (Number.isFinite(n) && n >= 0) set.onlinePaymentDiscount = n;
    }
    if (body.enableWallet !== undefined) set.enableWallet = !!body.enableWallet;
    if (body.enableSafarCredits !== undefined) set.enableSafarCredits = !!body.enableSafarCredits;
    if (body.keyId !== undefined && String(body.keyId).trim()) { set.keyId = String(body.keyId).trim(); credentialsChanged = true; }
    if (body.keySecret) { set.encryptedKeySecret = pgEncrypt(String(body.keySecret)); credentialsChanged = true; }
    if (body.webhookSecret !== undefined) {
      set.encryptedWebhookSecret = body.webhookSecret ? pgEncrypt(String(body.webhookSecret)) : null;
      credentialsChanged = true;
    }
    // Invalidate status when creds change until re-tested
    if (credentialsChanged) { set.status = 'not_configured'; set.lastTestedAt = null; set.lastTestResult = null; }

    await col.updateOne({ id: segments[2] }, { $set: set });
    await pgAudit(segments[2], doc.provider, credentialsChanged ? 'credentials_changed' : 'updated', me, null);
    const fresh = await col.findOne({ id: segments[2] });
    return ok({ gateway: pgSanitize(fresh) });
  }

  // DELETE /api/admin/payment-gateways/:id — delete (super_admin only)
  if (segments[0] === 'admin' && segments[1] === 'payment-gateways' && segments[2] && !segments[3] && method === 'DELETE') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'super_admin'); if (!g.ok) return err(g.error, g.status);
    const col = await getCollection('paymentGateways');
    const doc = await col.findOne({ id: segments[2] });
    if (!doc) return err('Gateway not found', 404);
    await col.deleteOne({ id: segments[2] });
    await pgAudit(segments[2], doc.provider, 'deleted', me, `Provider ${doc.provider} configuration removed`);
    return ok({ deleted: true });
  }

  // POST /api/admin/payment-gateways/:id/toggle — enable/disable (super_admin only)
  if (segments[0] === 'admin' && segments[1] === 'payment-gateways' && segments[2] && segments[3] === 'toggle' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'super_admin'); if (!g.ok) return err(g.error, g.status);
    const col = await getCollection('paymentGateways');
    const doc = await col.findOne({ id: segments[2] });
    if (!doc) return err('Gateway not found', 404);
    const body = await readBody(request);
    const nextEnabled = typeof body.enabled === 'boolean' ? body.enabled : !doc.enabled;
    await col.updateOne(
      { id: segments[2] },
      { $set: { enabled: nextEnabled, updatedAt: new Date(), updatedBy: me.id, updatedByName: me.name || me.email || 'super_admin' } }
    );
    await pgAudit(segments[2], doc.provider, nextEnabled ? 'enabled' : 'disabled', me, null);
    const fresh = await col.findOne({ id: segments[2] });
    return ok({ gateway: pgSanitize(fresh) });
  }

  // POST /api/admin/payment-gateways/:id/test-connection — verify creds only, NO charge (super_admin only)
  if (segments[0] === 'admin' && segments[1] === 'payment-gateways' && segments[2] && segments[3] === 'test-connection' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'super_admin'); if (!g.ok) return err(g.error, g.status);
    const col = await getCollection('paymentGateways');
    const doc = await col.findOne({ id: segments[2] });
    if (!doc) return err('Gateway not found', 404);
    const keySecret = doc.encryptedKeySecret ? pgDecrypt(doc.encryptedKeySecret) : '';
    const result = await pgTestProvider(doc.provider, { keyId: doc.keyId, keySecret });
    const now = new Date();
    await col.updateOne(
      { id: segments[2] },
      { $set: {
          status: result.ok ? 'configured' : (result.status || 'invalid'),
          lastTestedAt: now,
          lastTestResult: { ok: !!result.ok, status: result.status, message: result.message, at: now },
          updatedAt: now,
        }
      }
    );
    await pgAudit(segments[2], doc.provider, 'test_connection', me, result.message);
    const fresh = await col.findOne({ id: segments[2] });
    return ok({ result, gateway: pgSanitize(fresh) });
  }

  // GET /api/admin/payment-gateways/:id/audit — history for one gateway (super_admin only)
  if (segments[0] === 'admin' && segments[1] === 'payment-gateways' && segments[2] && segments[3] === 'audit' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'super_admin'); if (!g.ok) return err(g.error, g.status);
    const col = await getCollection('paymentAudit');
    const events = await col.find({ gatewayId: segments[2] }, { projection: { _id: 0 } }).sort({ timestamp: -1 }).limit(100).toArray();
    return ok({ events });
  }

  // GET /api/payments/active-gateway — READ-ONLY consumer endpoint for future
  // booking/checkout flows. Returns the currently ENABLED gateway (public-safe
  // fields only, NO secrets, NO keyId). Booking module can call this without
  // any hardcoded provider details. Requires authentication.
  if (path === '/payments/active-gateway' && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    const col = await getCollection('paymentGateways');
    const doc = await col.findOne({ enabled: true, status: 'configured' }, { sort: { updatedAt: -1 } });
    if (!doc) return ok({ gateway: null });
    return ok({ gateway: {
      id: doc.id,
      provider: doc.provider,
      providerName: doc.providerName,
      mode: doc.mode,
      currency: doc.currency,
      country: doc.country,
      paymentTimeout: doc.paymentTimeout,
      autoCapture: doc.autoCapture,
      // Public identifier — safe to expose (Razorpay keyId is intended for client-side use)
      keyId: doc.keyId,
    }});
  }

  // =====================================================================
  // MODULE 11 — SAFAR REVENUE, LOYALTY & REWARDS ENGINE
  // Additive only. Reuses: getCollection, getCurrentUser, requireRole,
  // pgSanitize (M10), uuid, ok/err, crypto (already imported for M10).
  // =====================================================================

  const REVENUE_DEFAULTS = {
    id: 'default',
    bookingFee: { enabled: false, mode: 'percent', percent: 5, flat: 0, minAmount: 0, maxAmount: 500, currency: 'INR' },
    onlinePayDiscount: { enabled: true, percent: 3 },
    wallet: { enabled: true, minRedeem: 100, maxUsagePctPerBooking: 100 },
    credits: { enabled: true, signupBonus: 100, referralAward: 100, expiryDays: 365, minRedeem: 50 },
    referral: { enabled: true, referrerReward: 200, refereeReward: 100, rewardType: 'credits', codePrefix: 'SAFAR' },
    loyalty: { enabled: true, tiers: [
      { name: 'Bronze', min: 0, creditPct: 5, benefits: ['5% credits back on bookings','Basic support'] },
      { name: 'Silver', min: 5000, creditPct: 8, benefits: ['8% credits back','Priority support','Early access to promotions'] },
      { name: 'Gold', min: 20000, creditPct: 12, benefits: ['12% credits back','Free room upgrades (subject to availability)','Late checkout'] },
      { name: 'Platinum', min: 50000, creditPct: 15, benefits: ['15% credits back','Personal concierge','Complimentary amenities','Guaranteed upgrades'] },
    ] },
    cashback: { enabled: true, defaultPct: 2, walletMode: true, minBookingAmount: 1000 },
    membership: { enabled: false, tiers: [
      { name: 'Free', pricePerMonth: 0, benefits: ['Basic access'] },
      { name: 'Premium', pricePerMonth: 299, benefits: ['5% extra credits','Priority support'] },
      { name: 'Business', pricePerMonth: 999, benefits: ['10% extra credits','GST invoicing','Bulk bookings'] },
      { name: 'VIP', pricePerMonth: 2999, benefits: ['15% extra credits','Dedicated concierge','Free cancellation'] },
    ] },
    commission: { hostCommissionPct: 15, categoryOverrides: [] },
    refund: { autoApprove: false, refundWindowDays: 7, cancellationFeePct: 10 },
    tax: { gstEnabled: true, gstPct: 18, taxInclusive: false },
    publicDisplay: { showRewards: true, showReferral: true, showPromotions: true, showCashback: true, showLoyalty: true },
    createdAt: new Date(), updatedAt: new Date(),
  };

  const revenueGetSettings = async () => {
    const col = await getCollection('revenueSettings');
    let doc = await col.findOne({ id: 'default' }, { projection: { _id: 0 } });
    if (!doc) {
      doc = { ...REVENUE_DEFAULTS };
      await col.insertOne({ ...doc });
    }
    return doc;
  };

  const genReferralCode = (prefix = 'SAFAR') => `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const ensureUserRewards = async (u) => {
    if (!u) return u;
    const users = await getCollection('users');
    const patch = {};
    if (!u.referralCode) patch.referralCode = genReferralCode();
    if (u.walletBalance === undefined) patch.walletBalance = 0;
    if (u.safarCredits === undefined) patch.safarCredits = 0;
    if (u.creditsEarned === undefined) patch.creditsEarned = 0;
    if (u.creditsRedeemed === undefined) patch.creditsRedeemed = 0;
    if (u.loyaltyPoints === undefined) patch.loyaltyPoints = 0;
    if (u.loyaltyTier === undefined) patch.loyaltyTier = 'Bronze';
    if (u.totalSavings === undefined) patch.totalSavings = 0;
    if (Object.keys(patch).length) await users.updateOne({ id: u.id }, { $set: patch });
    return { ...u, ...patch };
  };

  const computeLoyaltyTier = (points, tiers) => {
    const sorted = [...tiers].sort((a, b) => b.min - a.min);
    for (const t of sorted) if (points >= t.min) return t;
    return tiers[0];
  };

  // ---- ADMIN: Revenue Settings ----
  if (path === '/admin/revenue-settings' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'super_admin'); if (!g.ok) return err(g.error, g.status);
    return ok({ settings: await revenueGetSettings() });
  }
  if (path === '/admin/revenue-settings' && method === 'PUT') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, 'super_admin'); if (!g.ok) return err(g.error, g.status);
    const body = await readBody(request);
    const existing = await revenueGetSettings();
    const merged = { ...existing, ...body, id: 'default', updatedAt: new Date(), updatedBy: me.id, updatedByName: me.name || me.email };
    const col = await getCollection('revenueSettings');
    await col.updateOne({ id: 'default' }, { $set: merged }, { upsert: true });
    return ok({ settings: merged });
  }

  // ---- ADMIN: Promotions CRUD ----
  if (path === '/admin/promotions' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin','super_admin']); if (!g.ok) return err(g.error, g.status);
    const col = await getCollection('promotions');
    const list = await col.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    return ok({ promotions: list });
  }
  if (path === '/admin/promotions' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin','super_admin']); if (!g.ok) return err(g.error, g.status);
    const b = await readBody(request);
    const doc = {
      id: uuid(),
      title: String(b.title || '').trim(),
      description: b.description || '',
      badge: b.badge || 'Limited Offer',
      category: b.category || 'general',
      audience: b.audience || 'traveler',
      discountType: b.discountType || 'percent',
      discountValue: Number(b.discountValue) || 0,
      startsAt: b.startsAt ? new Date(b.startsAt) : new Date(),
      endsAt: b.endsAt ? new Date(b.endsAt) : null,
      imageUrl: b.imageUrl || '',
      ctaText: b.ctaText || 'Explore',
      ctaHref: b.ctaHref || '/explore',
      active: b.active !== false,
      createdAt: new Date(), updatedAt: new Date(),
      createdBy: me.id, createdByName: me.name || me.email,
    };
    if (!doc.title) return err('title required');
    const col = await getCollection('promotions');
    await col.insertOne(doc);
    return ok({ promotion: doc }, 201);
  }
  if (segments[0]==='admin' && segments[1]==='promotions' && segments[2] && method === 'PUT') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin','super_admin']); if (!g.ok) return err(g.error, g.status);
    const b = await readBody(request);
    const set = { updatedAt: new Date(), updatedBy: me.id };
    ['title','description','badge','category','audience','discountType','imageUrl','ctaText','ctaHref'].forEach(k => { if (b[k]!==undefined) set[k] = b[k]; });
    if (b.discountValue!==undefined) set.discountValue = Number(b.discountValue);
    if (b.active!==undefined) set.active = !!b.active;
    if (b.startsAt) set.startsAt = new Date(b.startsAt);
    if (b.endsAt) set.endsAt = new Date(b.endsAt);
    const col = await getCollection('promotions');
    const r = await col.updateOne({ id: segments[2] }, { $set: set });
    if (!r.matchedCount) return err('not found', 404);
    return ok({ promotion: await col.findOne({ id: segments[2] }, { projection: { _id: 0 } }) });
  }
  if (segments[0]==='admin' && segments[1]==='promotions' && segments[2] && method === 'DELETE') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin','super_admin']); if (!g.ok) return err(g.error, g.status);
    const col = await getCollection('promotions');
    await col.deleteOne({ id: segments[2] });
    return ok({ deleted: true });
  }

  // ---- ADMIN: Coupons CRUD ----
  if (path === '/admin/coupons' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin','super_admin']); if (!g.ok) return err(g.error, g.status);
    const col = await getCollection('coupons');
    const list = await col.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    return ok({ coupons: list });
  }
  if (path === '/admin/coupons' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin','super_admin']); if (!g.ok) return err(g.error, g.status);
    const b = await readBody(request);
    const code = String(b.code || '').trim().toUpperCase();
    if (!code) return err('code required');
    const col = await getCollection('coupons');
    if (await col.findOne({ code })) return err('coupon code already exists', 409);
    const doc = {
      id: uuid(), code,
      title: b.title || code,
      description: b.description || '',
      discountType: b.discountType || 'percent',
      discountValue: Number(b.discountValue) || 0,
      minBooking: Number(b.minBooking) || 0,
      maxDiscount: Number(b.maxDiscount) || 0,
      categories: Array.isArray(b.categories) ? b.categories : [],
      usageLimit: Number(b.usageLimit) || 0,
      usedCount: 0,
      perUserLimit: Number(b.perUserLimit) || 1,
      expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
      isPublic: b.isPublic !== false,
      active: b.active !== false,
      createdAt: new Date(), updatedAt: new Date(),
      createdBy: me.id, createdByName: me.name || me.email,
    };
    await col.insertOne(doc);
    return ok({ coupon: doc }, 201);
  }
  if (segments[0]==='admin' && segments[1]==='coupons' && segments[2] && method === 'PUT') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin','super_admin']); if (!g.ok) return err(g.error, g.status);
    const b = await readBody(request);
    const set = { updatedAt: new Date() };
    ['title','description','discountType'].forEach(k => { if (b[k]!==undefined) set[k]=b[k]; });
    ['discountValue','minBooking','maxDiscount','usageLimit','perUserLimit'].forEach(k => { if (b[k]!==undefined) set[k]=Number(b[k])||0; });
    if (Array.isArray(b.categories)) set.categories = b.categories;
    if (b.active!==undefined) set.active = !!b.active;
    if (b.isPublic!==undefined) set.isPublic = !!b.isPublic;
    if (b.expiresAt) set.expiresAt = new Date(b.expiresAt);
    const col = await getCollection('coupons');
    const r = await col.updateOne({ id: segments[2] }, { $set: set });
    if (!r.matchedCount) return err('not found', 404);
    return ok({ coupon: await col.findOne({ id: segments[2] }, { projection: { _id: 0 } }) });
  }
  if (segments[0]==='admin' && segments[1]==='coupons' && segments[2] && method === 'DELETE') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin','super_admin']); if (!g.ok) return err(g.error, g.status);
    const col = await getCollection('coupons');
    await col.deleteOne({ id: segments[2] });
    return ok({ deleted: true });
  }

  // ---- ADMIN: Revenue Analytics (composite, best-effort aggregations) ----
  if (path === '/admin/revenue-analytics' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin','super_admin']); if (!g.ok) return err(g.error, g.status);
    const [bookingsCol, walletTx, creditTx, couponUses, cashbackCol, users, promotions, coupons] = await Promise.all([
      getCollection('bookings'), getCollection('walletTransactions'), getCollection('creditTransactions'),
      getCollection('couponUses'), getCollection('cashbackLedger'), getCollection('users'),
      getCollection('promotions'), getCollection('coupons'),
    ]);
    const [totalBookings, totalRevenueAgg, walletIssuedAgg, creditsIssuedAgg, creditsRedeemedAgg, couponUsesCount, cashbackAgg, promoCount, couponCount, allUsers] = await Promise.all([
      bookingsCol.countDocuments({}),
      bookingsCol.aggregate([{ $match: { status: { $in: ['approved','cancelled'] } } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]).toArray().catch(() => []),
      walletTx.aggregate([{ $match: { type: 'credit' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]).toArray().catch(() => []),
      creditTx.aggregate([{ $match: { type: 'earn' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]).toArray().catch(() => []),
      creditTx.aggregate([{ $match: { type: 'redeem' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]).toArray().catch(() => []),
      couponUses.countDocuments({}).catch(() => 0),
      cashbackCol.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]).toArray().catch(() => []),
      promotions.countDocuments({ active: true }),
      coupons.countDocuments({ active: true }),
      users.find({ role: 'traveler' }, { projection: { loyaltyTier: 1, walletBalance: 1, safarCredits: 1 } }).toArray(),
    ]);
    const loyaltyDist = allUsers.reduce((acc, u) => { const t = u.loyaltyTier || 'Bronze'; acc[t] = (acc[t]||0)+1; return acc; }, {});
    const totalWalletBalance = allUsers.reduce((s,u) => s+(u.walletBalance||0), 0);
    const totalCreditsBalance = allUsers.reduce((s,u) => s+(u.safarCredits||0), 0);
    return ok({
      analytics: {
        totalBookings,
        totalRevenue: totalRevenueAgg[0]?.total || 0,
        walletIssued: walletIssuedAgg[0]?.total || 0,
        walletOutstanding: totalWalletBalance,
        creditsIssued: creditsIssuedAgg[0]?.total || 0,
        creditsRedeemed: creditsRedeemedAgg[0]?.total || 0,
        creditsOutstanding: totalCreditsBalance,
        couponUses: couponUsesCount,
        cashbackIssued: cashbackAgg[0]?.total || 0,
        activePromotions: promoCount,
        activeCoupons: couponCount,
        loyaltyDistribution: loyaltyDist,
        travelerCount: allUsers.length,
      }
    });
  }

  // ---- TRAVELER: composite rewards data ----
  if (path === '/me/rewards' && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    const settings = await revenueGetSettings();
    const fresh = await ensureUserRewards(me);
    const [walletTx, creditTx, referrals, referralsAsReferee, activePromos, myCouponUses, cashback] = await Promise.all([
      (await getCollection('walletTransactions')).find({ userId: fresh.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(50).toArray(),
      (await getCollection('creditTransactions')).find({ userId: fresh.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(50).toArray(),
      (await getCollection('referrals')).find({ referrerId: fresh.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(100).toArray(),
      (await getCollection('referrals')).findOne({ refereeId: fresh.id }, { projection: { _id: 0 } }),
      (await getCollection('promotions')).find({ active: true }, { projection: { _id: 0 } }).limit(20).toArray(),
      (await getCollection('couponUses')).find({ userId: fresh.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(50).toArray(),
      (await getCollection('cashbackLedger')).find({ userId: fresh.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(50).toArray(),
    ]);
    const currentTier = computeLoyaltyTier(fresh.loyaltyPoints || 0, settings.loyalty.tiers);
    const nextTier = settings.loyalty.tiers.find(t => t.min > (fresh.loyaltyPoints || 0)) || null;
    const savings = {
      couponSavings: myCouponUses.reduce((s, u) => s + (u.discountAmount || 0), 0),
      cashbackEarned: cashback.reduce((s, c) => s + (c.amount || 0), 0),
      referralEarnings: referrals.filter(r => r.rewardCredited).reduce((s, r) => s + (r.rewardAmount || 0), 0),
      walletSavings: walletTx.filter(t => t.type === 'debit' && t.source === 'booking').reduce((s, t) => s + (t.amount || 0), 0),
      onlinePayDiscountSaved: fresh.onlinePayDiscountSaved || 0,
      lifetimeSavings: fresh.totalSavings || 0,
    };
    savings.total = (savings.couponSavings || 0) + (savings.cashbackEarned || 0) + (savings.referralEarnings || 0) + (savings.walletSavings || 0) + (savings.onlinePayDiscountSaved || 0);

    return ok({
      user: {
        id: fresh.id, name: fresh.name, email: fresh.email,
        walletBalance: fresh.walletBalance || 0,
        safarCredits: fresh.safarCredits || 0,
        creditsEarned: fresh.creditsEarned || 0,
        creditsRedeemed: fresh.creditsRedeemed || 0,
        loyaltyPoints: fresh.loyaltyPoints || 0,
        loyaltyTier: currentTier?.name || 'Bronze',
        referralCode: fresh.referralCode,
      },
      currentTier,
      nextTier,
      referral: {
        code: fresh.referralCode,
        link: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/auth/signup?ref=${encodeURIComponent(fresh.referralCode || '')}`,
        successfulReferrals: referrals.filter(r => r.rewardCredited).length,
        pendingReferrals: referrals.filter(r => !r.rewardCredited).length,
        totalRewards: referrals.filter(r => r.rewardCredited).reduce((s, r) => s + (r.rewardAmount || 0), 0),
        referrals,
        referredBy: referralsAsReferee || null,
        config: settings.referral,
      },
      wallet: { balance: fresh.walletBalance || 0, transactions: walletTx, config: settings.wallet },
      credits: {
        balance: fresh.safarCredits || 0, earned: fresh.creditsEarned || 0, redeemed: fresh.creditsRedeemed || 0,
        transactions: creditTx, config: settings.credits,
        expiring: creditTx.filter(t => t.type === 'earn' && t.expiresAt && new Date(t.expiresAt) < new Date(Date.now() + 30*24*60*60*1000)).reduce((s,t)=>s+(t.amount||0),0),
      },
      coupons: myCouponUses,
      cashback: { entries: cashback, total: savings.cashbackEarned, config: settings.cashback },
      loyalty: { config: settings.loyalty, currentTier, nextTier, points: fresh.loyaltyPoints || 0 },
      savings,
      promotions: activePromos,
      membership: { config: settings.membership, currentPlan: 'Free' },
      publicDisplay: settings.publicDisplay,
    });
  }

  // ---- TRAVELER: manual referral code regeneration ----
  if (path === '/me/referral/regenerate' && method === 'POST') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    const users = await getCollection('users');
    const settings = await revenueGetSettings();
    const code = genReferralCode(settings.referral?.codePrefix || 'SAFAR');
    await users.updateOne({ id: me.id }, { $set: { referralCode: code } });
    return ok({ referralCode: code });
  }

  // ---- PUBLIC: promotions + rewards config for landing pages (no auth) ----
  if (path === '/public/promotions' && method === 'GET') {
    const col = await getCollection('promotions');
    const now = new Date();
    const list = await col.find({
      active: true,
      $or: [ { endsAt: null }, { endsAt: { $gte: now } } ]
    }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(20).toArray();
    return ok({ promotions: list });
  }
  if (path === '/public/rewards-config' && method === 'GET') {
    const s = await revenueGetSettings();
    return ok({
      publicDisplay: s.publicDisplay,
      referral: { enabled: s.referral.enabled, referrerReward: s.referral.referrerReward, refereeReward: s.referral.refereeReward, rewardType: s.referral.rewardType },
      loyalty: { enabled: s.loyalty.enabled, tiers: s.loyalty.tiers.map(t => ({ name: t.name, min: t.min, benefits: t.benefits })) },
      credits: { enabled: s.credits.enabled, signupBonus: s.credits.signupBonus },
      cashback: { enabled: s.cashback.enabled, defaultPct: s.cashback.defaultPct },
      onlinePayDiscount: s.onlinePayDiscount,
      bookingFee: { enabled: s.bookingFee.enabled, mode: s.bookingFee.mode, percent: s.bookingFee.percent, flat: s.bookingFee.flat },
    });
  }
  if (path === '/public/coupons' && method === 'GET') {
    const col = await getCollection('coupons');
    const now = new Date();
    const list = await col.find({
      active: true, isPublic: true,
      $or: [ { expiresAt: null }, { expiresAt: { $gte: now } } ],
    }, { projection: { _id: 0, code:1, title:1, description:1, discountType:1, discountValue:1, minBooking:1, maxDiscount:1, expiresAt:1 } }).sort({ createdAt: -1 }).limit(20).toArray();
    return ok({ coupons: list });
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
    
    // AWAITED so Vercel serverless doesn't drop the Resend HTTP call.
    try {
      await sendContactFormEmail(formData);
    } catch (error) {
      console.error('Failed to send contact form notification:', error);
    }
    
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
  // Module 15 note: POST /reviews handler is defined later in the file with the
  // full extended schema (verified booking, categories, media, host reply, etc.).
  // The legacy GET /reviews (by propertyId) remains here for backward compat.

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

  // ========== SUPER ADMIN DASHBOARD VISUALIZATION (MODULE 7) ==========
  
  // GET /api/marketplace/dashboard/overview - Comprehensive Dashboard Stats
  if (path === '/marketplace/dashboard/overview' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const listings = await getCollection('listings');
    const users = await getCollection('users');
    const bookings = await getCollection('bookings');
    
    // Get all stats in parallel
    const [
      totalListings,
      publishedListings,
      importedBusinesses,
      claimedBusinesses,
      pendingApprovals,
      activeHosts,
      totalBookings,
      totalUsers,
      draftListings
    ] = await Promise.all([
      listings.countDocuments(),
      listings.countDocuments({ status: 'published' }),
      listings.countDocuments({ importSource: 'google_places' }),
      listings.countDocuments({ hostId: { $ne: null } }),
      listings.countDocuments({ status: 'draft', claimStatus: 'pending' }),
      users.countDocuments({ role: 'host', isActive: true }),
      bookings.countDocuments(),
      users.countDocuments(),
      listings.countDocuments({ status: 'draft' })
    ]);
    
    // Calculate revenue (placeholder - sum confirmed booking amounts)
    const revenueResult = await bookings.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]).toArray();
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
    
    return ok({
      stats: {
        totalListings,
        publishedListings,
        importedBusinesses,
        claimedBusinesses,
        pendingApprovals,
        activeHosts,
        totalBookings,
        totalRevenue,
        totalUsers,
        draftListings,
        supportTickets: 0 // Placeholder
      }
    });
  }
  
  // GET /api/marketplace/dashboard/analytics - Charts & Trends Data
  if (path === '/marketplace/dashboard/analytics' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const listings = await getCollection('listings');
    const bookings = await getCollection('bookings');
    
    // Listings growth (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const listingsGrowth = await listings.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]).toArray();
    
    // Bookings trend (last 7 days)
    const bookingsTrend = await bookings.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]).toArray();
    
    // Revenue trend (last 7 days)
    const revenueTrend = await bookings.aggregate([
      { $match: { 
        createdAt: { $gte: sevenDaysAgo },
        status: 'confirmed'
      }},
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$totalAmount' }
      }},
      { $sort: { _id: 1 } }
    ]).toArray();
    
    // Top categories
    const topCategories = await listings.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]).toArray();
    
    // Top cities
    const topCities = await listings.aggregate([
      { $match: { city: { $ne: null } } },
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]).toArray();
    
    // Recently imported (last 10)
    const recentlyImported = await listings.find({ 
      importSource: 'google_places' 
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .project({ id: 1, title: 1, city: 1, createdAt: 1, status: 1 })
      .toArray();
    
    return ok({
      listingsGrowth,
      bookingsTrend,
      revenueTrend,
      topCategories,
      topCities,
      recentlyImported
    });
  }
  
  // GET /api/marketplace/dashboard/activity - Recent Activity Feed
  if (path === '/marketplace/dashboard/activity' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    const listings = await getCollection('listings');
    const bookings = await getCollection('bookings');
    const users = await getCollection('users');
    const logs = await getCollection('mpAuditLogs');
    const adminLogs = await getCollection('adminActivityLogs');
    
    // Get recent imports
    const recentImports = await listings.find({ importSource: 'google_places' })
      .sort({ createdAt: -1 })
      .limit(5)
      .project({ id: 1, title: 1, city: 1, createdAt: 1 })
      .toArray();
    
    // Get recent bookings
    const recentBookings = await bookings.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .project({ id: 1, listingId: 1, userId: 1, status: 1, createdAt: 1 })
      .toArray();
    
    // Get recent user registrations
    const recentUsers = await users.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .project({ id: 1, name: 1, email: 1, role: 1, createdAt: 1 })
      .toArray();
    
    // Get recent admin actions
    const recentActions = await adminLogs.find({})
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();
    
    // Get recent marketplace audit logs
    const recentAudit = await logs.find({})
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();
    
    // Combine and format activities
    const activities = [];
    
    recentImports.forEach(item => {
      activities.push({
        id: item.id,
        type: 'import',
        title: `Imported: ${item.title}`,
        description: item.city || 'No city',
        timestamp: item.createdAt,
        icon: 'download'
      });
    });
    
    recentBookings.forEach(item => {
      activities.push({
        id: item.id,
        type: 'booking',
        title: `New Booking`,
        description: `Status: ${item.status}`,
        timestamp: item.createdAt,
        icon: 'calendar'
      });
    });
    
    recentUsers.forEach(item => {
      activities.push({
        id: item.id,
        type: 'user',
        title: `New User: ${item.name}`,
        description: `Role: ${item.role}`,
        timestamp: item.createdAt,
        icon: 'user'
      });
    });
    
    recentActions.forEach(item => {
      activities.push({
        id: item.id,
        type: 'admin',
        title: item.action,
        description: item.adminName || 'Admin',
        timestamp: item.timestamp,
        icon: 'shield'
      });
    });
    
    recentAudit.forEach(item => {
      activities.push({
        id: item.id,
        type: 'audit',
        title: item.action,
        description: item.userName || 'System',
        timestamp: item.timestamp,
        icon: 'activity'
      });
    });
    
    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return ok({ activities: activities.slice(0, limit) });
  }
  
  // GET /api/marketplace/dashboard/system-status - System Health
  if (path === '/marketplace/dashboard/system-status' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const jobs = await getCollection('mpDiscoveryJobs');
    const templates = await getCollection('mpTemplates');
    const settings = await getCollection('mpSettings');
    
    // Check database
    const dbHealthy = true; // If we got here, DB is working
    
    // Check last import job
    const lastJob = await jobs.findOne({}, { sort: { createdAt: -1 } });
    const importEngineStatus = lastJob ? 
      (lastJob.status === 'completed' ? 'healthy' : 
       lastJob.status === 'processing' ? 'running' : 'error') 
      : 'idle';
    
    // Check templates
    const templateCount = await templates.countDocuments({ enabled: true });
    const emailTemplateStatus = templateCount > 0 ? 'healthy' : 'warning';
    
    // Check API settings
    const apiSettings = await settings.findOne({ type: 'api_providers' });
    const apiHealthy = apiSettings?.providers?.googlePlaces?.enabled ? 'healthy' : 'warning';
    
    // Storage placeholder
    const storageUsage = {
      used: 0,
      total: 100,
      percentage: 0
    };
    
    return ok({
      database: { status: dbHealthy ? 'healthy' : 'error', message: 'Connected' },
      importEngine: { status: importEngineStatus, lastRun: lastJob?.createdAt || null },
      emailTemplates: { status: emailTemplateStatus, count: templateCount },
      apiHealth: { status: apiHealthy, message: 'Google Places API configured' },
      storage: storageUsage
    });
  }

  // ========== PARTNERSHIP CRM & COMMUNICATION CENTER (MODULE 5) ==========
  
  // GET /api/marketplace/crm/dashboard - CRM Dashboard Stats
  if (path === '/marketplace/crm/dashboard' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const listings = await getCollection('listings');
    
    const [
      total,
      draft,
      claimed,
      unclaimed,
      verified,
      contacted,
      activePartners
    ] = await Promise.all([
      listings.countDocuments({ importSource: 'google_places' }),
      listings.countDocuments({ status: 'draft' }),
      listings.countDocuments({ hostId: { $ne: null } }),
      listings.countDocuments({ hostId: null }),
      listings.countDocuments({ 'crmData.verificationStatus': 'verified' }),
      listings.countDocuments({ 'crmData.pipelineStage': { $in: ['contacted', 'interested', 'meeting_scheduled'] } }),
      listings.countDocuments({ 'crmData.pipelineStage': 'live_partner' })
    ]);
    
    // Get today's contacts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const contactedToday = await listings.countDocuments({
      'crmData.lastContactDate': { $gte: today }
    });
    
    // Get upcoming follow-ups
    const followups = await getCollection('mpFollowUps');
    const upcomingFollowups = await followups.countDocuments({
      followUpDate: { $gte: new Date() },
      completed: false
    });
    
    return ok({
      stats: {
        total,
        draft,
        claimed,
        unclaimed,
        verified,
        contacted,
        contactedToday,
        upcomingFollowups,
        activePartners
      }
    });
  }
  
  // GET /api/marketplace/crm/businesses - List businesses with filters
  if (path === '/marketplace/crm/businesses' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    const search = url.searchParams.get('search') || '';
    const category = url.searchParams.get('category') || '';
    const status = url.searchParams.get('status') || '';
    const pipelineStage = url.searchParams.get('pipelineStage') || '';
    const claimed = url.searchParams.get('claimed') || '';
    const city = url.searchParams.get('city') || '';
    
    const query = { importSource: 'google_places' };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;
    if (status) query.status = status;
    if (pipelineStage) query['crmData.pipelineStage'] = pipelineStage;
    if (claimed === 'true') query.hostId = { $ne: null };
    if (claimed === 'false') query.hostId = null;
    if (city) query.city = { $regex: city, $options: 'i' };
    
    const listings = await getCollection('listings');
    const total = await listings.countDocuments(query);
    const businesses = await listings.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    return ok({ businesses, total, page, limit });
  }
  
  // GET /api/marketplace/crm/business/:id - Get business profile
  if (path.match(/^\/marketplace\/crm\/business\/([^/]+)$/) && method === 'GET') {
    const businessId = path.match(/^\/marketplace\/crm\/business\/([^/]+)$/)[1];
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const listings = await getCollection('listings');
    const business = await listings.findOne({ id: businessId });
    
    if (!business) return err('Business not found', 404);
    
    // Get timeline
    const timeline = await getCollection('mpTimeline');
    const events = await timeline.find({ businessId })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();
    
    // Get notes
    const notes = await getCollection('mpNotes');
    const businessNotes = await notes.find({ businessId })
      .sort({ createdAt: -1 })
      .toArray();
    
    // Get follow-ups
    const followups = await getCollection('mpFollowUps');
    const upcomingFollowups = await followups.find({
      businessId,
      completed: false
    }).sort({ followUpDate: 1 }).toArray();
    
    return ok({ business, timeline: events, notes: businessNotes, followups: upcomingFollowups });
  }
  
  // POST /api/marketplace/crm/business/:id/note - Add note
  if (path.match(/^\/marketplace\/crm\/business\/([^/]+)\/note$/) && method === 'POST') {
    const businessId = path.match(/^\/marketplace\/crm\/business\/([^/]+)\/note$/)[1];
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const { content } = await readBody(request);
    if (!content) return err('Note content is required');
    
    const notes = await getCollection('mpNotes');
    const noteId = uuid();
    await notes.insertOne({
      id: noteId,
      businessId,
      content,
      author: me.name,
      authorId: me.id,
      createdAt: new Date()
    });
    
    // Log in timeline
    const timeline = await getCollection('mpTimeline');
    await timeline.insertOne({
      id: uuid(),
      businessId,
      action: 'Note Added',
      user: me.name,
      userId: me.id,
      timestamp: new Date(),
      details: { notePreview: content.substring(0, 50) }
    });
    
    return ok({ noteId, message: 'Note added successfully' });
  }
  
  // PUT /api/marketplace/crm/business/:id/status - Update pipeline stage
  if (path.match(/^\/marketplace\/crm\/business\/([^/]+)\/status$/) && method === 'PUT') {
    const businessId = path.match(/^\/marketplace\/crm\/business\/([^/]+)\/status$/)[1];
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const { pipelineStage, verificationStatus } = await readBody(request);
    
    const listings = await getCollection('listings');
    const updateData = { updatedAt: new Date() };
    
    if (pipelineStage) {
      updateData['crmData.pipelineStage'] = pipelineStage;
      updateData['crmData.lastStatusChange'] = new Date();
    }
    if (verificationStatus) {
      updateData['crmData.verificationStatus'] = verificationStatus;
    }
    
    await listings.updateOne({ id: businessId }, { $set: updateData });
    
    // Log in timeline
    const timeline = await getCollection('mpTimeline');
    await timeline.insertOne({
      id: uuid(),
      businessId,
      action: pipelineStage ? 'Status Changed' : 'Verification Updated',
      user: me.name,
      userId: me.id,
      timestamp: new Date(),
      details: { pipelineStage, verificationStatus }
    });
    
    return ok({ message: 'Status updated successfully' });
  }
  
  // POST /api/marketplace/crm/business/:id/followup - Schedule follow-up
  if (path.match(/^\/marketplace\/crm\/business\/([^/]+)\/followup$/) && method === 'POST') {
    const businessId = path.match(/^\/marketplace\/crm\/business\/([^/]+)\/followup$/)[1];
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const { followUpDate, reminder, priority, note } = await readBody(request);
    
    const followups = await getCollection('mpFollowUps');
    const followupId = uuid();
    await followups.insertOne({
      id: followupId,
      businessId,
      followUpDate: new Date(followUpDate),
      reminder,
      priority: priority || 'medium',
      note,
      assignedTo: me.id,
      assignedToName: me.name,
      completed: false,
      createdAt: new Date()
    });
    
    // Log in timeline
    const timeline = await getCollection('mpTimeline');
    await timeline.insertOne({
      id: uuid(),
      businessId,
      action: 'Follow-up Scheduled',
      user: me.name,
      userId: me.id,
      timestamp: new Date(),
      details: { followUpDate, priority }
    });
    
    return ok({ followupId, message: 'Follow-up scheduled' });
  }
  
  // GET /api/marketplace/crm/followups - Get upcoming follow-ups
  if (path === '/marketplace/crm/followups' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const followups = await getCollection('mpFollowUps');
    const upcoming = await followups.find({
      followUpDate: { $gte: new Date() },
      completed: false
    }).sort({ followUpDate: 1 }).limit(20).toArray();
    
    // Get business names
    const listings = await getCollection('listings');
    for (const followup of upcoming) {
      const business = await listings.findOne({ id: followup.businessId }, { projection: { title: 1 } });
      followup.businessName = business?.title || 'Unknown';
    }
    
    return ok({ followups: upcoming });
  }
  
  // ========== COMMUNICATION TEMPLATES MANAGEMENT (MODULE 6) ==========
  
  // GET /api/marketplace/templates - List all templates with filters
  if (path === '/marketplace/templates' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const search = url.searchParams.get('search') || '';
    const category = url.searchParams.get('category') || '';
    const type = url.searchParams.get('type') || '';
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;
    if (type) query.type = type;
    
    const templates = await getCollection('mpTemplates');
    const results = await templates.find(query).sort({ createdAt: -1 }).toArray();
    
    return ok({ templates: results });
  }
  
  // GET /api/marketplace/templates/:id - Get single template
  if (path.match(/^\/marketplace\/templates\/([^/]+)$/) && method === 'GET') {
    const templateId = path.match(/^\/marketplace\/templates\/([^/]+)$/)[1];
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const templates = await getCollection('mpTemplates');
    const template = await templates.findOne({ id: templateId });
    
    if (!template) return err('Template not found', 404);
    
    return ok({ template });
  }
  
  // POST /api/marketplace/templates - Create template
  if (path === '/marketplace/templates' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const { name, category, type, subject, body, enabled } = await readBody(request);
    
    if (!name) return err('Template name is required');
    if (!category) return err('Category is required');
    if (!type) return err('Type is required (email or whatsapp)');
    if (!body) return err('Template body is required');
    if (type === 'email' && !subject) return err('Subject is required for email templates');
    
    const templates = await getCollection('mpTemplates');
    const templateId = uuid();
    
    await templates.insertOne({
      id: templateId,
      name,
      category,
      type,
      subject: subject || null,
      body,
      enabled: enabled !== false,
      createdBy: me.id,
      createdByName: me.name,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await logMarketplaceAudit(me, 'Template Created', {
      templateId,
      name,
      type
    }, request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'));
    
    return ok({ templateId, message: 'Template created successfully' });
  }
  
  // PUT /api/marketplace/templates/:id - Update template
  if (path.match(/^\/marketplace\/templates\/([^/]+)$/) && method === 'PUT') {
    const templateId = path.match(/^\/marketplace\/templates\/([^/]+)$/)[1];
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const { name, category, subject, body, enabled } = await readBody(request);
    
    const templates = await getCollection('mpTemplates');
    const existing = await templates.findOne({ id: templateId });
    
    if (!existing) return err('Template not found', 404);
    
    const updateData = {
      updatedAt: new Date(),
      updatedBy: me.id,
      updatedByName: me.name
    };
    
    if (name) updateData.name = name;
    if (category) updateData.category = category;
    if (subject !== undefined) updateData.subject = subject;
    if (body) updateData.body = body;
    if (enabled !== undefined) updateData.enabled = enabled;
    
    await templates.updateOne({ id: templateId }, { $set: updateData });
    
    await logMarketplaceAudit(me, 'Template Updated', {
      templateId,
      name: name || existing.name
    }, request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'));
    
    return ok({ message: 'Template updated successfully' });
  }
  
  // DELETE /api/marketplace/templates/:id - Delete template
  if (path.match(/^\/marketplace\/templates\/([^/]+)$/) && method === 'DELETE') {
    const templateId = path.match(/^\/marketplace\/templates\/([^/]+)$/)[1];
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const templates = await getCollection('mpTemplates');
    const template = await templates.findOne({ id: templateId });
    
    if (!template) return err('Template not found', 404);
    
    await templates.deleteOne({ id: templateId });
    
    await logMarketplaceAudit(me, 'Template Deleted', {
      templateId,
      name: template.name
    }, request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'));
    
    return ok({ message: 'Template deleted successfully' });
  }
  
  // POST /api/marketplace/templates/:id/duplicate - Duplicate template
  if (path.match(/^\/marketplace\/templates\/([^/]+)\/duplicate$/) && method === 'POST') {
    const templateId = path.match(/^\/marketplace\/templates\/([^/]+)\/duplicate$/)[1];
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const templates = await getCollection('mpTemplates');
    const original = await templates.findOne({ id: templateId });
    
    if (!original) return err('Template not found', 404);
    
    const newTemplateId = uuid();
    const duplicate = {
      ...original,
      _id: undefined,
      id: newTemplateId,
      name: `${original.name} (Copy)`,
      createdBy: me.id,
      createdByName: me.name,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await templates.insertOne(duplicate);
    
    await logMarketplaceAudit(me, 'Template Duplicated', {
      originalId: templateId,
      newId: newTemplateId,
      name: duplicate.name
    }, request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'));
    
    return ok({ templateId: newTemplateId, message: 'Template duplicated successfully' });
  }
  
  // POST /api/marketplace/templates/:id/preview - Preview template with sample data
  if (path.match(/^\/marketplace\/templates\/([^/]+)\/preview$/) && method === 'POST') {
    const templateId = path.match(/^\/marketplace\/templates\/([^/]+)\/preview$/)[1];
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const templates = await getCollection('mpTemplates');
    const template = await templates.findOne({ id: templateId });
    
    if (!template) return err('Template not found', 404);
    
    // Sample data for preview
    const sampleData = {
      host_name: 'Rahul Kumar',
      business_name: 'Kashmir Paradise Hotel',
      listing_title: 'Luxury Houseboat on Dal Lake',
      booking_id: 'BK-2026-001',
      customer_name: 'Priya Sharma',
      city: 'Srinagar',
      website_name: 'Safar Curated',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString()
    };
    
    // Replace variables in body
    let previewBody = template.body;
    let previewSubject = template.subject || '';
    
    Object.keys(sampleData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      previewBody = previewBody.replace(regex, sampleData[key]);
      previewSubject = previewSubject.replace(regex, sampleData[key]);
    });
    
    return ok({ 
      preview: {
        subject: previewSubject,
        body: previewBody
      },
      sampleData
    });
  }
  
  // Legacy endpoint for backward compatibility
  // GET /api/marketplace/crm/templates - Get email templates
  if (path === '/marketplace/crm/templates' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    
    const templates = {
      partnership_invitation: {
        subject: 'Partnership Opportunity with Safar Curated',
        body: 'Dear {businessName},\n\nWe discovered your business on Google and would love to feature you on Safar Curated...'
      },
      claim_listing: {
        subject: 'Claim Your Listing on Safar Curated',
        body: 'Hello {businessName},\n\nWe have created a listing for your business on Safar Curated...'
      },
      welcome_partner: {
        subject: 'Welcome to Safar Curated!',
        body: 'Dear Partner,\n\nWelcome to Safar Curated! We are excited to have you on board...'
      }
    };
    
    return ok({ templates });
  }

  // ============================================================
  // MODULE 8 – HOST CLAIM, REVIEW & PUBLISH WORKFLOW
  // ============================================================
  // Helpers ---------------------------------------------------
  const M8_BASE = process.env.NEXT_PUBLIC_BASE_URL || '';
  async function m8GenToken() {
    const crypto = await import('crypto');
    return crypto.randomBytes(24).toString('hex'); // 48-char
  }
  function m8Url(type, token) {
    const path = type === 'review' ? 'review' : 'present';
    return `${M8_BASE}/${path}/${token}`;
  }
  async function m8AddTimeline(businessId, action, user, details) {
    try {
      const tl = await getCollection('mpTimeline');
      await tl.insertOne({
        id: uuid(),
        businessId,
        action,
        user: user?.name || 'Public',
        userId: user?.id || null,
        timestamp: new Date(),
        details: details || {},
      });
    } catch (e) { console.error('m8 timeline error', e); }
  }
  async function m8ResolveToken(token) {
    if (!token) return null;
    const tokens = await getCollection('mpTokens');
    const rec = await tokens.findOne({ token });
    if (!rec) return null;
    if (rec.revoked) return { rec, error: 'This link has been revoked.' };
    if (rec.expiresAt && new Date(rec.expiresAt) < new Date()) {
      return { rec, error: 'This link has expired.' };
    }
    return { rec, error: null };
  }

  // POST /api/marketplace/crm/business/:id/generate-link
  {
    const m = path.match(/^\/marketplace\/crm\/business\/([^/]+)\/generate-link$/);
    if (m && method === 'POST') {
      const businessId = m[1];
      const me = await getCurrentUser(request);
      const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
      const { type, expiryDays } = await readBody(request);
      if (!['review','presentation'].includes(type)) return err('Invalid link type');
      const listings = await getCollection('listings');
      const biz = await listings.findOne({ id: businessId });
      if (!biz) return err('Business not found', 404);
      const tokens = await getCollection('mpTokens');
      // Revoke any existing active token of same type (only one active per type per listing)
      await tokens.updateMany(
        { businessId, type, revoked: { $ne: true } },
        { $set: { revoked: true, revokedAt: new Date(), revokedBy: me.id } }
      );
      const token = await m8GenToken();
      const days = Number.isFinite(Number(expiryDays)) ? Number(expiryDays) : 30;
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const rec = {
        id: uuid(),
        businessId,
        listingId: businessId,
        type,
        token,
        revoked: false,
        expiresAt,
        createdAt: new Date(),
        createdBy: me.id,
        createdByName: me.name,
      };
      await tokens.insertOne(rec);
      await m8AddTimeline(businessId, type === 'review' ? 'Review Link Generated' : 'Presentation Link Generated', me, { expiresAt });
      const { _id, ...clean } = rec;
      return ok({ link: { ...clean, url: m8Url(type, token) } });
    }
  }

  // POST /api/marketplace/crm/business/:id/revoke-link
  {
    const m = path.match(/^\/marketplace\/crm\/business\/([^/]+)\/revoke-link$/);
    if (m && method === 'POST') {
      const businessId = m[1];
      const me = await getCurrentUser(request);
      const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
      const { type, tokenId } = await readBody(request);
      const tokens = await getCollection('mpTokens');
      const filter = { businessId, revoked: { $ne: true } };
      if (tokenId) filter.id = tokenId;
      else if (type) filter.type = type;
      const res = await tokens.updateMany(filter, { $set: { revoked: true, revokedAt: new Date(), revokedBy: me.id } });
      await m8AddTimeline(businessId, 'Link Revoked', me, { type, tokenId, count: res.modifiedCount });
      return ok({ revokedCount: res.modifiedCount });
    }
  }

  // POST /api/marketplace/crm/business/:id/regenerate-link
  {
    const m = path.match(/^\/marketplace\/crm\/business\/([^/]+)\/regenerate-link$/);
    if (m && method === 'POST') {
      const businessId = m[1];
      const me = await getCurrentUser(request);
      const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
      const { type, expiryDays } = await readBody(request);
      if (!['review','presentation'].includes(type)) return err('Invalid link type');
      const listings = await getCollection('listings');
      const biz = await listings.findOne({ id: businessId });
      if (!biz) return err('Business not found', 404);
      const tokens = await getCollection('mpTokens');
      await tokens.updateMany({ businessId, type, revoked: { $ne: true } }, { $set: { revoked: true, revokedAt: new Date(), revokedBy: me.id } });
      const token = await m8GenToken();
      const days = Number.isFinite(Number(expiryDays)) ? Number(expiryDays) : 30;
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const rec = {
        id: uuid(),
        businessId,
        listingId: businessId,
        type,
        token,
        revoked: false,
        expiresAt,
        createdAt: new Date(),
        createdBy: me.id,
        createdByName: me.name,
      };
      await tokens.insertOne(rec);
      await m8AddTimeline(businessId, type === 'review' ? 'Review Link Regenerated' : 'Presentation Link Regenerated', me, { expiresAt });
      const { _id, ...clean } = rec;
      return ok({ link: { ...clean, url: m8Url(type, token) } });
    }
  }

  // GET /api/marketplace/crm/business/:id/links
  {
    const m = path.match(/^\/marketplace\/crm\/business\/([^/]+)\/links$/);
    if (m && method === 'GET') {
      const businessId = m[1];
      const me = await getCurrentUser(request);
      const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
      const tokens = await getCollection('mpTokens');
      const list = await tokens.find({ businessId }).sort({ createdAt: -1 }).toArray();
      const enriched = list.map(({ _id, ...t }) => ({ ...t, url: m8Url(t.type, t.token) }));
      return ok({ links: enriched });
    }
  }

  // GET /api/public/token/:token — resolve a public review/present token
  {
    const m = path.match(/^\/public\/token\/([^/]+)$/);
    if (m && method === 'GET') {
      const token = m[1];
      const r = await m8ResolveToken(token);
      if (!r) return err('Invalid link.', 404);
      if (r.error) return err(r.error, 410);
      const listings = await getCollection('listings');
      const listing = await listings.findOne({ id: r.rec.listingId });
      if (!listing) return err('Listing not found', 404);
      const { _id, ...clean } = listing;
      return ok({ type: r.rec.type, expiresAt: r.rec.expiresAt, listing: clean });
    }
  }

  // POST /api/public/review/:token/submit — submit corrections
  {
    const m = path.match(/^\/public\/review\/([^/]+)\/submit$/);
    if (m && method === 'POST') {
      const token = m[1];
      const r = await m8ResolveToken(token);
      if (!r) return err('Invalid link.', 404);
      if (r.error) return err(r.error, 410);
      if (r.rec.type !== 'review') return err('This link cannot be used for review submission.', 403);
      const body = await readBody(request);
      const {
        sections = {}, // { description, photos, contact, amenities, pricing, address, mapLocation }
        generalComment = '',
        photos = [],
        documents = [],
        submitterName = '',
        submitterEmail = '',
      } = body || {};
      const listingId = r.rec.listingId;
      const cr = {
        id: uuid(),
        businessId: listingId,
        listingId,
        tokenId: r.rec.id,
        sections,
        generalComment,
        photos: Array.isArray(photos) ? photos.slice(0, 30) : [],
        documents: Array.isArray(documents) ? documents.slice(0, 20) : [],
        submittedBy: { name: submitterName, email: submitterEmail },
        status: 'open',
        createdAt: new Date(),
      };
      const crCol = await getCollection('mpChangeRequests');
      await crCol.insertOne(cr);
      // Auto-create CRM tasks per non-empty section
      const tasksCol = await getCollection('mpTasks');
      const taskDocs = [];
      const sectionLabels = {
        description: 'Description',
        photos: 'Photos',
        contact: 'Contact',
        amenities: 'Amenities',
        pricing: 'Pricing',
        address: 'Address',
        mapLocation: 'Map Location',
      };
      for (const [key, value] of Object.entries(sections || {})) {
        const comment = typeof value === 'string' ? value : (value?.comment || '');
        if (comment && comment.trim()) {
          taskDocs.push({
            id: uuid(),
            businessId: listingId,
            listingId,
            source: 'review_change_request',
            changeRequestId: cr.id,
            section: key,
            title: `Fix ${sectionLabels[key] || key}`,
            description: comment.trim(),
            status: 'open',
            priority: 'medium',
            createdAt: new Date(),
          });
        }
      }
      if (generalComment && generalComment.trim()) {
        taskDocs.push({
          id: uuid(),
          businessId: listingId,
          listingId,
          source: 'review_change_request',
          changeRequestId: cr.id,
          section: 'general',
          title: 'General feedback from host',
          description: generalComment.trim(),
          status: 'open',
          priority: 'low',
          createdAt: new Date(),
        });
      }
      if (taskDocs.length) await tasksCol.insertMany(taskDocs);
      await m8AddTimeline(listingId, 'Change Requests Submitted', { name: submitterName || 'Host', id: null }, { sectionsCount: taskDocs.length, photos: cr.photos.length, documents: cr.documents.length });
      return ok({ changeRequestId: cr.id, tasksCreated: taskDocs.length });
    }
  }

  // POST /api/public/claim/:token/submit — host submits claim
  {
    const m = path.match(/^\/public\/claim\/([^/]+)\/submit$/);
    if (m && method === 'POST') {
      const token = m[1];
      const r = await m8ResolveToken(token);
      if (!r) return err('Invalid link.', 404);
      if (r.error) return err(r.error, 410);
      const body = await readBody(request);
      const { name, email, phone, businessRole, identityProofUrl, businessProofUrl, message } = body || {};
      if (!name || String(name).trim().length < 2) return err('Name is required');
      if (!isEmail(email)) return err('Valid email is required');
      if (!phone || String(phone).trim().length < 6) return err('Phone is required');
      if (!businessRole || String(businessRole).trim().length < 2) return err('Business role is required');
      const listingId = r.rec.listingId;
      const claims = await getCollection('mpClaims');
      const claim = {
        id: uuid(),
        businessId: listingId,
        listingId,
        tokenId: r.rec.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        businessRole: businessRole.trim(),
        identityProofUrl: identityProofUrl || '',
        businessProofUrl: businessProofUrl || '',
        message: message || '',
        status: 'pending',
        createdAt: new Date(),
      };
      await claims.insertOne(claim);
      // Mark listing as having a claim in progress (do not change status yet)
      const listings = await getCollection('listings');
      await listings.updateOne({ id: listingId }, { $set: { claimStatus: 'pending', updatedAt: new Date() } });
      await m8AddTimeline(listingId, 'Host Claim Submitted', { name, id: null }, { claimId: claim.id, email: claim.email });
      const { _id, ...clean } = claim;
      return ok({ claim: clean });
    }
  }

  // GET /api/marketplace/crm/claims — list all claim requests
  if (path === '/marketplace/crm/claims' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
    const status = url.searchParams.get('status') || '';
    const q = {};
    if (status) q.status = status;
    const claims = await getCollection('mpClaims');
    const list = await claims.find(q).sort({ createdAt: -1 }).limit(200).toArray();
    const listings = await getCollection('listings');
    const enriched = [];
    for (const c of list) {
      const biz = await listings.findOne({ id: c.listingId }, { projection: { title: 1, city: 1, images: 1 } });
      const { _id, ...clean } = c;
      enriched.push({ ...clean, businessTitle: biz?.title || 'Unknown', businessCity: biz?.city || '', businessImage: biz?.images?.[0] || null });
    }
    return ok({ claims: enriched });
  }

  // GET /api/marketplace/crm/business/:id/claims — claims for one business
  {
    const m = path.match(/^\/marketplace\/crm\/business\/([^/]+)\/claims$/);
    if (m && method === 'GET') {
      const businessId = m[1];
      const me = await getCurrentUser(request);
      const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
      const claims = await getCollection('mpClaims');
      const list = await claims.find({ businessId }).sort({ createdAt: -1 }).toArray();
      return ok({ claims: list.map(({ _id, ...c }) => c) });
    }
  }

  // GET /api/marketplace/crm/business/:id/change-requests
  {
    const m = path.match(/^\/marketplace\/crm\/business\/([^/]+)\/change-requests$/);
    if (m && method === 'GET') {
      const businessId = m[1];
      const me = await getCurrentUser(request);
      const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
      const crCol = await getCollection('mpChangeRequests');
      const list = await crCol.find({ businessId }).sort({ createdAt: -1 }).toArray();
      return ok({ changeRequests: list.map(({ _id, ...c }) => c) });
    }
  }

  // GET /api/marketplace/crm/business/:id/tasks — auto-generated tasks
  {
    const m = path.match(/^\/marketplace\/crm\/business\/([^/]+)\/tasks$/);
    if (m && method === 'GET') {
      const businessId = m[1];
      const me = await getCurrentUser(request);
      const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
      const tasksCol = await getCollection('mpTasks');
      const list = await tasksCol.find({ businessId }).sort({ createdAt: -1 }).limit(200).toArray();
      return ok({ tasks: list.map(({ _id, ...t }) => t) });
    }
  }

  // POST /api/marketplace/crm/tasks/:id/status — update task status
  {
    const m = path.match(/^\/marketplace\/crm\/tasks\/([^/]+)\/status$/);
    if (m && method === 'POST') {
      const taskId = m[1];
      const me = await getCurrentUser(request);
      const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
      const { status } = await readBody(request);
      if (!['open','in_progress','done','dismissed'].includes(status)) return err('Invalid status');
      const tasksCol = await getCollection('mpTasks');
      const t = await tasksCol.findOne({ id: taskId });
      if (!t) return err('Task not found', 404);
      await tasksCol.updateOne({ id: taskId }, { $set: { status, updatedAt: new Date(), updatedBy: me.id } });
      await m8AddTimeline(t.businessId, 'Task Updated', me, { taskId, status });
      return ok({ taskId, status });
    }
  }

  // POST /api/marketplace/crm/claims/:id/action — approve/reject/request-info/suspend
  {
    const m = path.match(/^\/marketplace\/crm\/claims\/([^/]+)\/action$/);
    if (m && method === 'POST') {
      const claimId = m[1];
      const me = await getCurrentUser(request);
      const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
      const { action, notes } = await readBody(request);
      if (!['approve','reject','request_info','suspend'].includes(action)) return err('Invalid action');
      const claims = await getCollection('mpClaims');
      const claim = await claims.findOne({ id: claimId });
      if (!claim) return err('Claim not found', 404);
      const listings = await getCollection('listings');
      const now = new Date();
      const nextStatus = action === 'approve' ? 'approved'
        : action === 'reject' ? 'rejected'
        : action === 'suspend' ? 'suspended'
        : 'info_requested';
      await claims.updateOne(
        { id: claimId },
        { $set: { status: nextStatus, decidedAt: now, decidedBy: me.id, decidedByName: me.name, adminNotes: notes || '' } }
      );

      if (action === 'approve') {
        // Ensure a host user exists / promote user by email
        const users = await getCollection('users');
        let hostUser = await users.findOne({ email: claim.email });
        if (!hostUser) {
          hostUser = {
            id: uuid(),
            email: claim.email,
            name: claim.name,
            phone: claim.phone,
            role: 'host',
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
            createdVia: 'host_claim',
          };
          await users.insertOne(hostUser);
        } else if (hostUser.role === 'traveler') {
          await users.updateOne({ id: hostUser.id }, { $set: { role: 'host', updatedAt: now } });
          hostUser.role = 'host';
        }
        // Convert listing into a claimed, verified host listing
        await listings.updateOne(
          { id: claim.listingId },
          { $set: {
              hostId: hostUser.id,
              hostName: hostUser.name,
              claimStatus: 'approved',
              claimedAt: now,
              verified: true,
              updatedAt: now,
            } }
        );
      } else if (action === 'reject') {
        await listings.updateOne({ id: claim.listingId }, { $set: { claimStatus: 'rejected', updatedAt: now } });
      } else if (action === 'suspend') {
        await listings.updateOne({ id: claim.listingId }, { $set: { claimStatus: 'suspended', status: 'suspended', updatedAt: now } });
      } else if (action === 'request_info') {
        await listings.updateOne({ id: claim.listingId }, { $set: { claimStatus: 'info_requested', updatedAt: now } });
      }
      await m8AddTimeline(claim.listingId, `Claim ${action.replace('_',' ')}`, me, { claimId, notes: notes || '' });
      return ok({ claimId, status: nextStatus });
    }
  }

  // POST /api/marketplace/crm/business/:id/publish — publish to marketplace
  {
    const m = path.match(/^\/marketplace\/crm\/business\/([^/]+)\/publish$/);
    if (m && method === 'POST') {
      const businessId = m[1];
      const me = await getCurrentUser(request);
      const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
      const listings = await getCollection('listings');
      const biz = await listings.findOne({ id: businessId });
      if (!biz) return err('Business not found', 404);
      const now = new Date();
      await listings.updateOne(
        { id: businessId },
        { $set: {
            status: 'approved',
            isPublished: true,
            publishedAt: now,
            claimStatus: biz.claimStatus === 'approved' ? 'approved' : (biz.claimStatus || 'unclaimed'),
            updatedAt: now,
          } }
      );
      await m8AddTimeline(businessId, 'Listing Published', me, { publishedAt: now });
      return ok({ businessId, published: true });
    }
  }

  // POST /api/marketplace/crm/business/:id/archive — archive listing
  {
    const m = path.match(/^\/marketplace\/crm\/business\/([^/]+)\/archive$/);
    if (m && method === 'POST') {
      const businessId = m[1];
      const me = await getCurrentUser(request);
      const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
      const listings = await getCollection('listings');
      const biz = await listings.findOne({ id: businessId });
      if (!biz) return err('Business not found', 404);
      await listings.updateOne(
        { id: businessId },
        { $set: { status: 'archived', isPublished: false, archivedAt: new Date(), updatedAt: new Date() } }
      );
      await m8AddTimeline(businessId, 'Listing Archived', me, {});
      return ok({ businessId, archived: true });
    }
  }

  // POST /api/marketplace/crm/business/:id/invite-host — send invite email w/ claim link
  {
    const m = path.match(/^\/marketplace\/crm\/business\/([^/]+)\/invite-host$/);
    if (m && method === 'POST') {
      const businessId = m[1];
      const me = await getCurrentUser(request);
      const g = requireSuperAdmin(me); if (!g.ok) return err(g.error, g.status);
      const { email, name, message } = await readBody(request);
      if (!isEmail(email)) return err('Valid email is required');
      const listings = await getCollection('listings');
      const biz = await listings.findOne({ id: businessId });
      if (!biz) return err('Business not found', 404);
      // Ensure an active review token exists (or create one) to send with invite
      const tokens = await getCollection('mpTokens');
      let rec = await tokens.findOne({ businessId, type: 'review', revoked: { $ne: true }, expiresAt: { $gt: new Date() } });
      if (!rec) {
        const token = await m8GenToken();
        rec = {
          id: uuid(),
          businessId,
          listingId: businessId,
          type: 'review',
          token,
          revoked: false,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          createdBy: me.id,
          createdByName: me.name,
        };
        await tokens.insertOne(rec);
      }
      const reviewUrl = m8Url('review', rec.token);
      // Send email via Resend (fire and forget)
      try {
        const { sendEmail } = await import('@/lib/email');
        const subject = `You're invited to claim your listing on Safar Curated`;
        const html = `
          <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
            <h2 style="margin:0 0 12px">Hello ${name || 'there'},</h2>
            <p>We have created a listing for <strong>${biz.title || 'your business'}</strong> on Safar Curated.
            Please review the listing exactly as visitors will see it and request any corrections you would like us to make.
            You can also claim the listing to manage it directly.</p>
            ${message ? `<p style="background:#f6f6f6;padding:12px;border-radius:8px">${String(message).replace(/</g,'&lt;')}</p>` : ''}
            <p style="margin:24px 0">
              <a href="${reviewUrl}" style="background:#0f766e;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600">Review & Claim Your Listing</a>
            </p>
            <p style="color:#666;font-size:13px">This link expires on ${new Date(rec.expiresAt).toLocaleDateString()}.</p>
            <p style="color:#666;font-size:13px">— Safar Curated</p>
          </div>`;
        if (typeof sendEmail === 'function') {
          await sendEmail({ to: email, subject, html });
        }
      } catch (e) {
        console.error('invite-host email error', e);
      }
      await m8AddTimeline(businessId, 'Host Invitation Sent', me, { email, reviewUrl });
      return ok({ sent: true, reviewUrl });
    }
  }

  // ============================================================================
  // MODULE 12 — Host Earnings, Commission & Payout Management (endpoints)
  // ============================================================================

  // ------------------- HOST EARNINGS -------------------

  // GET /api/host/earnings/summary
  if (path === '/host/earnings/summary' && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    if (me.role !== 'host' && me.role !== 'admin' && me.role !== 'super_admin') return err('Forbidden', 403);
    await m12MarkEarningsAvailableIfDue();
    const col = await getCollection('hostEarnings');
    const bookings = await getCollection('bookings');
    const settings = await m12GetFinanceSettings();
    const hostId = me.id;
    const all = await col.find({ hostId }, { projection: { _id: 0 } }).toArray();
    const sumBy = (fn, filter = () => true) => all.filter(filter).reduce((s, r) => s + (Number(fn(r)) || 0), 0);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const available = sumBy((r) => r.netEarnings, (r) => r.status === 'available');
    const pending = sumBy((r) => r.netEarnings, (r) => r.status === 'pending');
    const paid = sumBy((r) => r.netEarnings, (r) => r.status === 'paid');
    const lifetime = available + pending + paid; // net of refunds
    const monthNet = sumBy((r) => r.netEarnings, (r) => new Date(r.createdAt) >= monthStart && r.status !== 'refunded');
    const completed = await bookings.countDocuments({ hostId, status: 'approved' });
    const commissionPaid = sumBy((r) => r.commissionAmount, (r) => r.status !== 'refunded');
    const refundDed = sumBy((r) => r.refundDeduction, () => true);
    // Upcoming payout date
    const upcoming = all.filter((r) => r.status === 'pending').map((r) => new Date(r.availableAt)).sort((a, b) => a - b)[0] || null;
    return ok({
      summary: {
        availableBalance: available,
        pendingBalance: pending,
        lifetimeEarnings: lifetime,
        thisMonthEarnings: monthNet,
        totalCompletedBookings: completed,
        platformCommissionPaid: commissionPaid,
        totalRefundDeductions: refundDed,
        upcomingPayoutDate: upcoming,
        minPayoutAmount: settings.minPayoutAmount,
        payoutSchedule: settings.payoutSchedule,
      },
    });
  }

  // GET /api/host/earnings/history?from=&to=&property=&status=
  if (path === '/host/earnings/history' && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    if (me.role !== 'host' && me.role !== 'admin' && me.role !== 'super_admin') return err('Forbidden', 403);
    await m12MarkEarningsAvailableIfDue();
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const property = url.searchParams.get('property');
    const status = url.searchParams.get('status');
    const filter = { hostId: me.id };
    if (property) filter.listingId = property;
    if (status && ['pending', 'available', 'paid', 'refunded'].includes(status)) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    const col = await getCollection('hostEarnings');
    const list = await col.find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    return ok({ earnings: list });
  }

  // GET /api/host/payouts/history
  if (path === '/host/payouts/history' && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    if (me.role !== 'host' && me.role !== 'admin' && me.role !== 'super_admin') return err('Forbidden', 403);
    const col = await getCollection('hostPayouts');
    const list = await col.find({ hostId: me.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    return ok({ payouts: list });
  }

  // ------------------- HOST PAYOUT SETTINGS -------------------

  // GET /api/host/payout-settings
  if (path === '/host/payout-settings' && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    if (me.role !== 'host' && me.role !== 'admin' && me.role !== 'super_admin') return err('Forbidden', 403);
    const col = await getCollection('hostPayoutSettings');
    const doc = await col.findOne({ hostId: me.id });
    return ok({ settings: doc ? m12SanitizePayoutSettings(doc, { unmask: true }) : null });
  }

  // PUT /api/host/payout-settings
  if (path === '/host/payout-settings' && method === 'PUT') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    if (me.role !== 'host' && me.role !== 'admin') return err('Forbidden', 403);
    const b = await readBody(request);
    const col = await getCollection('hostPayoutSettings');
    const existing = await col.findOne({ hostId: me.id });
    const set = {
      hostId: me.id,
      accountHolder: (b.accountHolder || '').toString().trim(),
      bankName: (b.bankName || '').toString().trim(),
      accountNumber: (b.accountNumber || '').toString().trim(),
      ifsc: (b.ifsc || '').toString().trim().toUpperCase(),
      upi: (b.upi || '').toString().trim(),
      pan: (b.pan || '').toString().trim().toUpperCase(),
      gst: (b.gst || '').toString().trim().toUpperCase(),
      isDisabled: !!b.isDisabled,
      verificationStatus: existing?.verificationStatus || 'pending',
      updatedAt: new Date(),
    };
    if (!existing) set.createdAt = new Date();
    await col.updateOne({ hostId: me.id }, { $set: set }, { upsert: true });
    const fresh = await col.findOne({ hostId: me.id });
    m12LogFinanceAudit(me, 'host_payout_settings_updated', { hostId: me.id, previous: existing ? { bankName: existing.bankName, accountNumber: m12MaskAccount(existing.accountNumber), upi: existing.upi } : null, new: { bankName: set.bankName, accountNumber: m12MaskAccount(set.accountNumber), upi: set.upi } }).catch(() => {});
    return ok({ settings: m12SanitizePayoutSettings(fresh, { unmask: true }) });
  }

  // ------------------- ADMIN: FINANCE SETTINGS -------------------

  // GET /api/admin/finance-settings
  if (path === '/admin/finance-settings' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    return ok({ settings: await m12GetFinanceSettings() });
  }

  // PUT /api/admin/finance-settings
  if (path === '/admin/finance-settings' && method === 'PUT') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const body = await readBody(request);
    const existing = await m12GetFinanceSettings();
    const merged = {
      ...existing,
      ...body,
      id: 'default',
      categoryCommissions: { ...existing.categoryCommissions, ...(body.categoryCommissions || {}) },
      enabledMethods: { ...existing.enabledMethods, ...(body.enabledMethods || {}) },
      updatedAt: new Date(),
      updatedBy: me.id,
      updatedByName: me.name || me.email,
    };
    const col = await getCollection('financeSettings');
    await col.updateOne({ id: 'default' }, { $set: merged }, { upsert: true });
    m12LogFinanceAudit(me, 'finance_settings_updated', { previous: existing, new: merged }).catch(() => {});
    return ok({ settings: merged });
  }

  // ------------------- ADMIN: HOST PAYOUTS -------------------

  // GET /api/admin/host-payouts?status=&search=
  if (path === '/admin/host-payouts' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const filter = {};
    if (status && ['pending', 'paid', 'rejected', 'hold'].includes(status)) filter.status = status;
    const col = await getCollection('hostPayouts');
    let list = await col.find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    if (search) {
      list = list.filter((p) => (p.hostName || '').toLowerCase().includes(search) || (p.hostEmail || '').toLowerCase().includes(search) || (p.id || '').toLowerCase().includes(search));
    }
    return ok({ payouts: list });
  }

  // GET /api/admin/host-payouts/available — list hosts with earnings available for payout
  if (path === '/admin/host-payouts/available' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    await m12MarkEarningsAvailableIfDue();
    const col = await getCollection('hostEarnings');
    const settings = await m12GetFinanceSettings();
    const users = await getCollection('users');
    const rows = await col.aggregate([
      { $match: { status: 'available' } },
      { $group: { _id: '$hostId', amount: { $sum: '$netEarnings' }, bookingCount: { $sum: 1 } } },
    ]).toArray();
    const enriched = [];
    for (const r of rows) {
      const u = await users.findOne({ id: r._id }, { projection: { name: 1, email: 1, _id: 0 } });
      enriched.push({ hostId: r._id, hostName: u?.name || 'Unknown', hostEmail: u?.email || '', amount: r.amount, bookingCount: r.bookingCount, meetsMinimum: r.amount >= (settings.minPayoutAmount || 0) });
    }
    return ok({ hosts: enriched, minPayoutAmount: settings.minPayoutAmount });
  }

  // POST /api/admin/host-payouts/create { hostId, method }
  if (path === '/admin/host-payouts/create' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const { hostId, method = 'bank', note } = await readBody(request);
    if (!hostId) return err('hostId required');
    const settings = await m12GetFinanceSettings();
    const earn = await getCollection('hostEarnings');
    const rows = await earn.find({ hostId, status: 'available', payoutId: null }, { projection: { _id: 0 } }).toArray();
    if (!rows.length) return err('No available earnings for this host', 400);
    const amount = rows.reduce((s, r) => s + (Number(r.netEarnings) || 0), 0);
    if (amount < (Number(settings.minPayoutAmount) || 0)) return err(`Amount ₹${amount} is below minimum payout ₹${settings.minPayoutAmount}`, 400);
    const users = await getCollection('users');
    const host = await users.findOne({ id: hostId }, { projection: { name: 1, email: 1, _id: 0 } });
    const payoutSettings = await (await getCollection('hostPayoutSettings')).findOne({ hostId });
    const payoutId = uuid();
    const payoutDoc = {
      id: payoutId,
      hostId,
      hostName: host?.name || 'Unknown',
      hostEmail: host?.email || '',
      amount,
      bookingCount: rows.length,
      earningIds: rows.map((r) => r.id),
      method,
      status: settings.manualApproval ? 'pending' : 'paid',
      payoutSettingsSnapshot: payoutSettings ? m12SanitizePayoutSettings(payoutSettings) : null,
      note: note || null,
      requestedBy: me.id,
      requestedByName: me.name || me.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const col = await getCollection('hostPayouts');
    await col.insertOne(payoutDoc);
    // Mark earnings with payoutId
    await earn.updateMany({ id: { $in: payoutDoc.earningIds } }, { $set: { payoutId, updatedAt: new Date(), status: settings.manualApproval ? 'available' : 'paid' } });
    m12LogFinanceAudit(me, 'host_payout_created', { payoutId, hostId, amount, bookingCount: rows.length, method, status: payoutDoc.status }).catch(() => {});
    return ok({ payout: payoutDoc }, 201);
  }

  // POST /api/admin/host-payouts/:id/approve|reject|mark-paid|hold
  {
    const m = path.match(/^\/admin\/host-payouts\/([^/]+)\/(approve|reject|mark-paid|hold)$/);
    if (m && method === 'POST') {
      const me = await getCurrentUser(request);
      const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
      const [_, id, action] = m;
      const body = await readBody(request);
      const col = await getCollection('hostPayouts');
      const rec = await col.findOne({ id });
      if (!rec) return err('Payout not found', 404);
      const earn = await getCollection('hostEarnings');
      let newStatus = rec.status;
      let earningStatus = null;
      if (action === 'approve' || action === 'mark-paid') {
        newStatus = 'paid';
        earningStatus = 'paid';
      } else if (action === 'reject') {
        newStatus = 'rejected';
        earningStatus = 'available'; // return earnings to available pool
      } else if (action === 'hold') {
        newStatus = 'hold';
        earningStatus = 'available';
      }
      const set = { status: newStatus, updatedAt: new Date(), processedBy: me.id, processedByName: me.name || me.email };
      if (newStatus === 'paid') set.paidAt = new Date();
      if (body.reason) set.reason = body.reason;
      if (body.transactionRef) set.transactionRef = body.transactionRef;
      await col.updateOne({ id }, { $set: set });
      if (earningStatus) {
        const update = { $set: { updatedAt: new Date(), status: earningStatus } };
        if (earningStatus !== 'paid') update.$set.payoutId = null;
        await earn.updateMany({ id: { $in: rec.earningIds || [] } }, update);
      }
      const fresh = await col.findOne({ id }, { projection: { _id: 0 } });
      m12LogFinanceAudit(me, `host_payout_${action.replace('-', '_')}`, { payoutId: id, hostId: rec.hostId, amount: rec.amount, previousStatus: rec.status, newStatus, reason: body.reason || null }).catch(() => {});
      // Module 13: notify host on payout status change
      if (newStatus === 'paid') {
        mkNotif({
          userId: rec.hostId,
          type: 'host_payout_completed',
          category: 'payout',
          title: 'Payout completed',
          body: `Your payout of ₹${(rec.amount || 0).toLocaleString('en-IN')} has been processed.`,
          link: `/dashboard/host?tab=payouts`,
          meta: { payoutId: id, amount: rec.amount, method: rec.method },
        }).catch(() => {});
      } else if (newStatus === 'rejected') {
        mkNotif({
          userId: rec.hostId,
          type: 'host_payout_rejected',
          category: 'payout',
          title: 'Payout rejected',
          body: body.reason ? `Payout was rejected: ${body.reason}` : 'Your recent payout request was rejected by admin.',
          link: `/dashboard/host?tab=payouts`,
          meta: { payoutId: id, reason: body.reason || null },
        }).catch(() => {});
      }
      return ok({ payout: fresh });
    }
  }

  // ------------------- ADMIN: REPORTS -------------------

  // GET /api/admin/finance/reports
  if (path === '/admin/finance/reports' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    await m12MarkEarningsAvailableIfDue();
    const earn = await getCollection('hostEarnings');
    const payouts = await getCollection('hostPayouts');
    const [earnings, payoutList] = await Promise.all([
      earn.find({}, { projection: { _id: 0 } }).toArray(),
      payouts.find({}, { projection: { _id: 0 } }).toArray(),
    ]);
    const sum = (arr, fn) => arr.reduce((s, r) => s + (Number(fn(r)) || 0), 0);
    const platformRevenue = sum(earnings.filter(e => e.status !== 'refunded'), e => e.bookingAmount);
    const hostEarningsTotal = sum(earnings.filter(e => e.status !== 'refunded'), e => e.netEarnings);
    const commissionEarned = sum(earnings.filter(e => e.status !== 'refunded'), e => e.commissionAmount);
    const pendingPayouts = sum(payoutList.filter(p => p.status === 'pending' || p.status === 'hold'), p => p.amount);
    const paidPayouts = sum(payoutList.filter(p => p.status === 'paid'), p => p.amount);
    const refundedCount = earnings.filter(e => e.status === 'refunded').length;
    const refundedAmount = sum(earnings.filter(e => e.status === 'refunded'), e => e.refundDeduction);
    return ok({
      reports: {
        platformRevenue,
        hostEarningsTotal,
        commissionEarned,
        pendingPayouts,
        paidPayouts,
        refundStats: { count: refundedCount, amount: refundedAmount },
        earningsCount: earnings.length,
        payoutsCount: payoutList.length,
      },
    });
  }

  // GET /api/admin/finance/reports/export?type=earnings|payouts
  if (path === '/admin/finance/reports/export' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'earnings';
    const escape = (v) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    let csv = '';
    if (type === 'payouts') {
      const col = await getCollection('hostPayouts');
      const list = await col.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
      const headers = ['id', 'hostName', 'hostEmail', 'amount', 'bookingCount', 'method', 'status', 'createdAt', 'paidAt'];
      csv = headers.join(',') + '\n' + list.map((r) => headers.map((h) => escape(r[h])).join(',')).join('\n');
    } else {
      const col = await getCollection('hostEarnings');
      const list = await col.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
      const headers = ['bookingId', 'hostId', 'listingTitle', 'travelerName', 'checkInDate', 'checkOutDate', 'bookingAmount', 'commissionAmount', 'refundDeduction', 'netEarnings', 'status', 'createdAt'];
      csv = headers.join(',') + '\n' + list.map((r) => headers.map((h) => escape(r[h])).join(',')).join('\n');
    }
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="finance-${type}-${Date.now()}.csv"`,
      },
    });
  }

  // ------------------- ADMIN: AUDIT LOG -------------------

  // GET /api/admin/finance/audit-log
  if (path === '/admin/finance/audit-log' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const url = new URL(request.url);
    const limit = Math.min(500, Number(url.searchParams.get('limit')) || 200);
    const col = await getCollection('financeAuditLog');
    const list = await col.find({}, { projection: { _id: 0 } }).sort({ timestamp: -1 }).limit(limit).toArray();
    return ok({ logs: list });
  }

  // ============================================================================
  // MODULE 13 — Communication Center (endpoints)
  // ============================================================================

  // DELETE /api/notifications/:id
  if (path.match(/^\/notifications\/([^/]+)$/) && method === 'DELETE') {
    const notificationId = path.match(/^\/notifications\/([^/]+)$/)[1];
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    const notifications = await getCollection('notifications');
    // Only allow deleting own notifications
    const r = await notifications.deleteOne({ id: notificationId, userId: me.id });
    return ok({ deleted: r.deletedCount === 1 });
  }

  // POST /api/notifications/delete-all-read — delete all read notifications for user
  if (path === '/notifications/delete-all-read' && method === 'POST') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    const notifications = await getCollection('notifications');
    const r = await notifications.deleteMany({ userId: me.id, read: true });
    return ok({ deleted: r.deletedCount });
  }

  // GET /api/me/inbox-summary — quick unread counts for bell + messages badge
  if (path === '/me/inbox-summary' && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    const [notifications, msgs] = await Promise.all([getCollection('notifications'), getCollection('bookingMessages')]);
    const [unreadNotif, unreadMsgs] = await Promise.all([
      notifications.countDocuments({ userId: me.id, read: false }),
      msgs.countDocuments({ participantIds: me.id, senderId: { $ne: me.id }, readBy: { $ne: me.id } }),
    ]);
    return ok({ unreadNotifications: unreadNotif, unreadMessages: unreadMsgs });
  }

  // ------------------- SUPER ADMIN COMMUNICATION CENTER -------------------

  // GET /api/admin/broadcasts?status=active|expired|all
  if (path === '/admin/broadcasts' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'all';
    const col = await getCollection('adminBroadcasts');
    const now = new Date();
    const filter = {};
    if (status === 'active') filter.$and = [{ $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }, { $or: [{ scheduledFor: null }, { scheduledFor: { $lte: now } }] }];
    if (status === 'expired') filter.expiresAt = { $lte: now };
    if (status === 'scheduled') filter.scheduledFor = { $gt: now };
    const list = await col.find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(200).toArray();
    return ok({ broadcasts: list });
  }

  // POST /api/admin/broadcasts — create + immediately fan-out (or schedule)
  if (path === '/admin/broadcasts' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const b = await readBody(request);
    const title = String(b.title || '').trim();
    const message = String(b.message || b.body || '').trim();
    if (!title || !message) return err('title and message are required');
    const audience = b.audience || 'all'; // 'all' | 'travelers' | 'hosts' | 'admins' | 'selected'
    const userIds = Array.isArray(b.userIds) ? b.userIds : [];
    const scheduledFor = b.scheduledFor ? new Date(b.scheduledFor) : null;
    const expiresAt = b.expiresAt ? new Date(b.expiresAt) : null;
    const category = b.category || 'announcement';
    const link = b.link || null;

    const broadcast = {
      id: uuid(),
      title,
      message,
      audience,
      userIds: audience === 'selected' ? userIds : [],
      scheduledFor,
      expiresAt,
      category,
      link,
      createdBy: me.id,
      createdByName: me.name || me.email,
      createdByRole: me.role,
      createdAt: new Date(),
      dispatchedAt: null,
      recipientCount: 0,
      status: scheduledFor && scheduledFor > new Date() ? 'scheduled' : 'sent',
    };

    // Resolve recipients unless scheduled for later
    let recipientCount = 0;
    const users = await getCollection('users');
    const notifications = await getCollection('notifications');
    if (broadcast.status === 'sent') {
      let targets = [];
      if (audience === 'all') {
        targets = await users.find({}, { projection: { id: 1, _id: 0 } }).toArray();
      } else if (audience === 'travelers') {
        targets = await users.find({ role: { $in: ['traveler', 'user', null] } }, { projection: { id: 1, _id: 0 } }).toArray();
      } else if (audience === 'hosts') {
        targets = await users.find({ role: 'host' }, { projection: { id: 1, _id: 0 } }).toArray();
      } else if (audience === 'admins') {
        targets = await users.find({ role: { $in: ['admin', 'super_admin'] } }, { projection: { id: 1, _id: 0 } }).toArray();
      } else if (audience === 'selected') {
        targets = userIds.map((uid) => ({ id: uid }));
      }
      const docs = targets.filter(t => t.id).map((t) => ({
        id: uuid(),
        userId: t.id,
        type: 'system_announcement',
        category,
        title,
        body: message,
        link,
        meta: { broadcastId: broadcast.id, audience },
        read: false,
        createdAt: new Date(),
      }));
      if (docs.length) {
        try { await notifications.insertMany(docs, { ordered: false }); } catch (e) { console.error('broadcast insertMany', e); }
      }
      recipientCount = docs.length;
      broadcast.dispatchedAt = new Date();
      broadcast.recipientCount = recipientCount;
    }

    const col = await getCollection('adminBroadcasts');
    await col.insertOne({ ...broadcast });
    // Audit log
    m12LogFinanceAudit(me, 'broadcast_sent', { broadcastId: broadcast.id, audience, recipientCount, title, scheduled: !!scheduledFor }).catch(() => {});
    return ok({ broadcast: { ...broadcast, recipientCount } }, 201);
  }

  // DELETE /api/admin/broadcasts/:id
  if (path.match(/^\/admin\/broadcasts\/([^/]+)$/) && method === 'DELETE') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const bid = path.match(/^\/admin\/broadcasts\/([^/]+)$/)[1];
    const col = await getCollection('adminBroadcasts');
    await col.deleteOne({ id: bid });
    // Also delete notifications spawned by this broadcast (optional, keep notifications for user history)
    const notifications = await getCollection('notifications');
    await notifications.deleteMany({ 'meta.broadcastId': bid });
    m12LogFinanceAudit(me, 'broadcast_deleted', { broadcastId: bid }).catch(() => {});
    return ok({ deleted: true });
  }

  // GET /api/admin/users/search?role=&q=
  if (path === '/admin/users/search' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim();
    const role = url.searchParams.get('role') || '';
    const filter = {};
    if (role) filter.role = role;
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: re }, { email: re }];
    }
    const users = await getCollection('users');
    const list = await users.find(filter, { projection: { _id: 0, id: 1, name: 1, email: 1, role: 1 } }).limit(30).toArray();
    return ok({ users: list });
  }

  // ============================================================================
  // MODULE 14 — Analytics & Business Intelligence
  // ============================================================================
  // Everything is computed on-demand via lightweight aggregations. No writes.
  // Reuses existing collections; no schema changes.

  const m14ResolveRange = (rangeKey, from, to) => {
    const now = new Date();
    const end = new Date(now);
    let start = new Date(now);
    switch (rangeKey) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7d':
        start = new Date(now); start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start = new Date(now); start.setDate(start.getDate() - 30);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end.setTime(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime());
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        if (from) start = new Date(from);
        if (to) end.setTime(new Date(to).getTime());
        break;
      default:
        start = new Date(now); start.setDate(start.getDate() - 30);
    }
    return { start, end };
  };

  const m14DayBucket = (d) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  };
  const m14MonthBucket = (d) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
  };
  const m14WeekBucket = (d) => {
    const x = new Date(d);
    // ISO week YYYY-Www
    const dt = new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()));
    const day = dt.getUTCDay() || 7;
    dt.setUTCDate(dt.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((dt - yearStart) / 86400000) + 1) / 7);
    return `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };

  const m14CategoryOf = (b, listingMap) => {
    const l = listingMap.get(b.listingId);
    const cat = (l?.category || b.category || '').toLowerCase();
    const sub = (l?.subcategory || '').toLowerCase();
    if (cat === 'stay') {
      if (sub === 'houseboat') return 'houseboats';
      if (['home', 'homestay', 'cottage'].includes(sub)) return 'homestays';
      return 'hotels';
    }
    if (cat === 'tour') return 'tours';
    if (cat === 'experience') return 'activities';
    if (cat === 'transport') return sub === 'bike' ? 'bike_rentals' : 'car_rentals';
    return 'other';
  };

  const m14PaymentBucket = (b) => {
    const t = String(b.paymentType || b.paymentMode || '').toLowerCase();
    if (t.includes('full')) return 'full';
    if (t.includes('fee') || t.includes('deposit') || t.includes('booking_fee')) return 'booking_fee';
    if (t.includes('cash')) return 'cash';
    if (t.includes('wallet')) return 'wallet';
    if (b.paymentGateway || b.paymentStatus === 'paid' || t) return 'online';
    return 'unspecified';
  };

  // GET /api/admin/analytics/overview
  if (path === '/admin/analytics/overview' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const url = new URL(request.url);
    const rangeKey = url.searchParams.get('range') || '30d';
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const fCat = (url.searchParams.get('category') || '').toLowerCase();
    const fDistrict = (url.searchParams.get('district') || '').toLowerCase();
    const fStatus = url.searchParams.get('status');
    const fPayment = (url.searchParams.get('paymentType') || '').toLowerCase();
    const fHost = url.searchParams.get('hostId');
    const fTraveler = url.searchParams.get('travelerId');

    const { start, end } = m14ResolveRange(rangeKey, from, to);

    // Pull collections (parallel)
    const [
      bookingsC, listingsC, usersC, walletC, creditC, couponUseC, promoC, couponC,
      referralsC, hostEarningsC, hostPayoutsC, reviewsC, wishlistsC, safarPlansC,
    ] = await Promise.all([
      getCollection('bookings'), getCollection('listings'), getCollection('users'),
      getCollection('walletTransactions'), getCollection('creditTransactions'),
      getCollection('couponUses'), getCollection('promotions'), getCollection('coupons'),
      getCollection('referrals'), getCollection('hostEarnings'), getCollection('hostPayouts'),
      getCollection('reviews'), getCollection('wishlists'), getCollection('safarTogetherPlans'),
    ]);

    // Build listing map (used for category/district)
    const listingsAll = await listingsC.find({}, { projection: { _id: 0, id: 1, title: 1, category: 1, subcategory: 1, district: 1, city: 1, hostId: 1, status: 1, createdAt: 1, images: 1, price: 1 } }).toArray();
    const listingMap = new Map(listingsAll.map((l) => [l.id, l]));

    // Load bookings within range + all-time bookings for lifetime KPIs
    const rangeQ = { createdAt: { $gte: start, $lte: end } };
    if (fStatus) rangeQ.status = fStatus;
    if (fHost) rangeQ.hostId = fHost;
    if (fTraveler) rangeQ.travelerId = fTraveler;

    let bookingsRange = await bookingsC.find(rangeQ, { projection: { _id: 0 } }).toArray();
    // Category / district filters applied via listingMap (post-filter)
    if (fCat || fDistrict) {
      bookingsRange = bookingsRange.filter((b) => {
        const l = listingMap.get(b.listingId);
        if (fCat && m14CategoryOf(b, listingMap) !== fCat) return false;
        if (fDistrict && (String(l?.district || l?.city || '').toLowerCase() !== fDistrict)) return false;
        return true;
      });
    }
    if (fPayment) {
      bookingsRange = bookingsRange.filter((b) => m14PaymentBucket(b) === fPayment);
    }
    const bookingsAll = await bookingsC.find({}, { projection: { _id: 0 } }).toArray();

    const sum = (arr, fn) => arr.reduce((s, r) => s + (Number(fn(r)) || 0), 0);
    const bAmt = (b) => Number(b.totalPrice || b.amount || 0);

    // -------- Executive KPIs --------
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const kpi = {
      totalRevenueLifetime: sum(bookingsAll.filter((b) => b.status !== 'cancelled' && b.status !== 'rejected'), bAmt),
      totalRevenueRange: sum(bookingsRange.filter((b) => b.status !== 'cancelled' && b.status !== 'rejected'), bAmt),
      monthlyRevenue: sum(bookingsAll.filter((b) => new Date(b.createdAt) >= monthStart && b.status !== 'cancelled' && b.status !== 'rejected'), bAmt),
      dailyRevenue: sum(bookingsAll.filter((b) => new Date(b.createdAt) >= todayStart && b.status !== 'cancelled' && b.status !== 'rejected'), bAmt),
      totalBookingsRange: bookingsRange.length,
      totalBookingsLifetime: bookingsAll.length,
      activeBookings: bookingsAll.filter((b) => b.status === 'approved' || b.status === 'pending').length,
      completedBookings: bookingsAll.filter((b) => b.status === 'approved').length,
      cancelledBookings: bookingsAll.filter((b) => b.status === 'cancelled').length,
      rejectedBookings: bookingsAll.filter((b) => b.status === 'rejected').length,
      refundAmount: sum(bookingsAll.filter((b) => b.refunded), bAmt),
    };
    kpi.averageBookingValue = kpi.totalBookingsRange > 0 ? Math.round(kpi.totalRevenueRange / kpi.totalBookingsRange) : 0;

    // Users
    const [travelerCount, hostCount] = await Promise.all([
      usersC.countDocuments({ role: { $in: ['traveler', 'user', null] } }),
      usersC.countDocuments({ role: 'host' }),
    ]);
    kpi.totalTravelers = travelerCount;
    kpi.totalHosts = hostCount;
    kpi.activeListings = listingsAll.filter((l) => l.status === 'active' || l.status === 'approved' || !l.status).length;
    kpi.pendingListings = listingsAll.filter((l) => l.status === 'pending' || l.status === 'draft').length;

    // Wallet + credits + referrals
    const walletTx = await walletC.find({}, { projection: { _id: 0 } }).toArray();
    const creditTx = await creditC.find({}, { projection: { _id: 0 } }).toArray();
    const referralsAll = await referralsC.find({}, { projection: { _id: 0 } }).toArray();
    kpi.walletBalance = sum(walletTx, (t) => (t.type === 'credit' ? t.amount : -t.amount));
    kpi.creditsIssued = sum(creditTx.filter((t) => t.type === 'credit'), (t) => t.amount);
    kpi.creditsRedeemed = sum(creditTx.filter((t) => t.type === 'debit'), (t) => t.amount);
    kpi.referralRewardsIssued = sum(referralsAll.filter((r) => r.rewarded || r.status === 'rewarded'), (r) => r.rewardAmount || 0);

    // Commission earned
    const earningsAll = await hostEarningsC.find({}, { projection: { _id: 0 } }).toArray();
    kpi.platformCommission = sum(earningsAll.filter((e) => e.status !== 'refunded'), (e) => e.commissionAmount);

    // -------- Revenue series (by day / week / month) --------
    const daySeries = {}, weekSeries = {}, monthSeries = {};
    for (const b of bookingsRange) {
      const revenue = (b.status === 'cancelled' || b.status === 'rejected') ? 0 : bAmt(b);
      const d = m14DayBucket(b.createdAt), w = m14WeekBucket(b.createdAt), m = m14MonthBucket(b.createdAt);
      daySeries[d] = (daySeries[d] || 0) + revenue;
      weekSeries[w] = (weekSeries[w] || 0) + revenue;
      monthSeries[m] = (monthSeries[m] || 0) + revenue;
    }
    const toSeries = (obj) => Object.keys(obj).sort().map((k) => ({ bucket: k, value: obj[k] }));

    // Category breakdown
    const categoryBreakdown = {};
    for (const b of bookingsRange) {
      const k = m14CategoryOf(b, listingMap);
      const paid = (b.status !== 'cancelled' && b.status !== 'rejected');
      const entry = categoryBreakdown[k] || { category: k, gross: 0, net: 0, commission: 0, bookings: 0 };
      const gross = paid ? bAmt(b) : 0;
      entry.bookings += 1;
      entry.gross += gross;
      // Approx commission using default 15% if no earning found
      const e = earningsAll.find((x) => x.bookingId === b.bookingId);
      entry.commission += e ? (e.commissionAmount || 0) : Math.round(gross * 0.15);
      entry.net += gross - (e ? (e.commissionAmount || 0) : Math.round(gross * 0.15));
      categoryBreakdown[k] = entry;
    }

    // Discounts / wallet / refunds within range
    const walletUsage = sum(walletTx.filter((t) => t.type === 'debit' && new Date(t.createdAt) >= start && new Date(t.createdAt) <= end && (t.reason === 'booking' || t.category === 'booking' || t.bookingId)), (t) => t.amount);
    const refundsInRange = sum(bookingsRange.filter((b) => b.refunded), bAmt);
    const discountsInRange = sum(bookingsRange, (b) => Number(b.discount || b.couponDiscount || 0));

    // -------- Booking analytics --------
    const totalR = bookingsRange.length || 1;
    const confirmedR = bookingsRange.filter((b) => b.status === 'approved').length;
    const cancelledR = bookingsRange.filter((b) => b.status === 'cancelled').length;
    const paymentDist = { full: 0, booking_fee: 0, online: 0, wallet: 0, cash: 0, unspecified: 0 };
    let avgStayDays = 0, stayCount = 0;
    for (const b of bookingsRange) {
      paymentDist[m14PaymentBucket(b)] = (paymentDist[m14PaymentBucket(b)] || 0) + 1;
      if (b.checkInDate && b.checkOutDate) {
        const d1 = new Date(b.checkInDate), d2 = new Date(b.checkOutDate);
        const diff = Math.round((d2 - d1) / 86400000);
        if (diff > 0) { avgStayDays += diff; stayCount += 1; }
      }
    }
    const bookingAnalytics = {
      trendDaily: toSeries(daySeries),
      confirmationRate: (confirmedR / totalR) * 100,
      cancellationRate: (cancelledR / totalR) * 100,
      averageBookingValue: kpi.averageBookingValue,
      averageStayDays: stayCount ? +(avgStayDays / stayCount).toFixed(1) : 0,
      paymentDistribution: paymentDist,
      onlinePaymentPct: (paymentDist.online + paymentDist.full) / totalR * 100,
      bookingFeePct: paymentDist.booking_fee / totalR * 100,
      fullPaymentPct: paymentDist.full / totalR * 100,
    };

    // -------- Traveler analytics --------
    const travelersInRange = new Set(bookingsRange.map((b) => b.travelerId).filter(Boolean));
    const bookingsByTraveler = {};
    for (const b of bookingsAll) {
      if (!b.travelerId) continue;
      bookingsByTraveler[b.travelerId] = (bookingsByTraveler[b.travelerId] || 0) + 1;
    }
    const repeatTravelers = Object.values(bookingsByTraveler).filter((c) => c > 1).length;
    const totalUniq = Object.keys(bookingsByTraveler).length || 1;
    const newUsers = await usersC.countDocuments({ createdAt: { $gte: start, $lte: end } });
    // top travelers
    const spendByTraveler = {};
    for (const b of bookingsAll.filter((x) => x.status !== 'cancelled' && x.status !== 'rejected')) {
      if (!b.travelerId) continue;
      spendByTraveler[b.travelerId] = (spendByTraveler[b.travelerId] || 0) + bAmt(b);
    }
    const topTravelerIds = Object.entries(spendByTraveler).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topTravelerUsers = await usersC.find({ id: { $in: topTravelerIds.map((x) => x[0]) } }, { projection: { _id: 0, id: 1, name: 1, email: 1 } }).toArray();
    const topTravelers = topTravelerIds.map(([id, amt]) => {
      const u = topTravelerUsers.find((x) => x.id === id);
      return { id, name: u?.name || 'Unknown', email: u?.email || '', spend: amt, bookings: bookingsByTraveler[id] || 0 };
    });
    // favourite destinations
    const cityCount = {};
    for (const b of bookingsAll) {
      const l = listingMap.get(b.listingId);
      const key = String(l?.district || l?.city || 'Unknown');
      cityCount[key] = (cityCount[key] || 0) + 1;
    }
    const favoriteDestinations = Object.entries(cityCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));
    const totalCreditsRedeemedRange = sum(creditTx.filter((t) => t.type === 'debit' && new Date(t.createdAt) >= start && new Date(t.createdAt) <= end), (t) => t.amount);
    const travelerAnalytics = {
      newUsers,
      returningUsers: repeatTravelers,
      repeatBookingRate: (repeatTravelers / totalUniq) * 100,
      walletUsage,
      creditsRedeemed: totalCreditsRedeemedRange,
      referralParticipation: referralsAll.length,
      favoriteDestinations,
      averageSpending: totalUniq ? Math.round(Object.values(spendByTraveler).reduce((s, v) => s + v, 0) / totalUniq) : 0,
      topTravelers,
      activeTravelersInRange: travelersInRange.size,
    };

    // -------- Host analytics --------
    const earnByHost = {};
    for (const e of earningsAll) {
      if (!e.hostId) continue;
      earnByHost[e.hostId] = (earnByHost[e.hostId] || { net: 0, bookings: 0 });
      earnByHost[e.hostId].net += Number(e.netEarnings || 0);
      earnByHost[e.hostId].bookings += 1;
    }
    const topHostIds = Object.entries(earnByHost).sort((a, b) => b[1].net - a[1].net).slice(0, 10).map((x) => x[0]);
    const topHostUsers = await usersC.find({ id: { $in: topHostIds } }, { projection: { _id: 0, id: 1, name: 1, email: 1 } }).toArray();
    const topEarningHosts = topHostIds.map((id) => {
      const u = topHostUsers.find((x) => x.id === id);
      return { id, name: u?.name || 'Unknown', email: u?.email || '', net: earnByHost[id].net, bookings: earnByHost[id].bookings };
    });
    // Highest rated hosts
    const reviewsAll = await reviewsC.find({}, { projection: { _id: 0 } }).toArray();
    const ratingByHost = {};
    for (const r of reviewsAll) {
      const l = listingMap.get(r.listingId); if (!l?.hostId) continue;
      ratingByHost[l.hostId] = ratingByHost[l.hostId] || { sum: 0, count: 0 };
      ratingByHost[l.hostId].sum += Number(r.rating || 0);
      ratingByHost[l.hostId].count += 1;
    }
    const ratedHostIds = Object.keys(ratingByHost);
    const ratedHostUsers = await usersC.find({ id: { $in: ratedHostIds } }, { projection: { _id: 0, id: 1, name: 1 } }).toArray();
    const highestRatedHosts = ratedHostIds
      .map((id) => ({ id, name: ratedHostUsers.find((x) => x.id === id)?.name || 'Unknown', avgRating: ratingByHost[id].sum / ratingByHost[id].count, reviews: ratingByHost[id].count }))
      .filter((x) => x.reviews >= 1)
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 10);
    // Response rate: proportion of bookings not stuck in pending > 24h
    const respByHost = {};
    for (const b of bookingsAll) {
      if (!b.hostId) continue;
      respByHost[b.hostId] = respByHost[b.hostId] || { total: 0, responded: 0 };
      respByHost[b.hostId].total += 1;
      if (b.status !== 'pending') respByHost[b.hostId].responded += 1;
    }
    const avgResponseRate = Object.values(respByHost).length ? Object.values(respByHost).reduce((s, r) => s + (r.responded / r.total), 0) / Object.values(respByHost).length * 100 : 0;
    // Cancellation rate per host (host-initiated approx)
    const hostCancelRate = Object.values(respByHost).length ? bookingsAll.filter((b) => b.status === 'rejected').length / (bookingsAll.length || 1) * 100 : 0;
    const payoutsAll = await hostPayoutsC.find({}, { projection: { _id: 0 } }).toArray();
    const hostAnalytics = {
      topEarningHosts,
      highestRatedHosts,
      averageResponseRate: +avgResponseRate.toFixed(1),
      hostRejectionRate: +hostCancelRate.toFixed(1),
      pendingPayouts: sum(payoutsAll.filter((p) => p.status === 'pending' || p.status === 'hold'), (p) => p.amount),
      paidPayouts: sum(payoutsAll.filter((p) => p.status === 'paid'), (p) => p.amount),
      averageHostEarnings: Object.keys(earnByHost).length ? Math.round(Object.values(earnByHost).reduce((s, v) => s + v.net, 0) / Object.keys(earnByHost).length) : 0,
    };

    // -------- Listing analytics --------
    const bookingsByListing = {};
    for (const b of bookingsAll) {
      if (!b.listingId) continue;
      bookingsByListing[b.listingId] = (bookingsByListing[b.listingId] || 0) + 1;
    }
    const viewsByListing = {}; // Approximated via wishlist counts (real 'views' collection not present)
    const wishlists = await wishlistsC.find({}, { projection: { _id: 0, listingId: 1 } }).toArray();
    for (const w of wishlists) {
      if (!w.listingId) continue;
      viewsByListing[w.listingId] = (viewsByListing[w.listingId] || 0) + 1;
    }
    const listingList = listingsAll.map((l) => ({
      id: l.id, title: l.title,
      category: l.category, subcategory: l.subcategory, district: l.district || l.city,
      views: viewsByListing[l.id] || 0,
      bookings: bookingsByListing[l.id] || 0,
      conversion: (viewsByListing[l.id] || 0) > 0 ? ((bookingsByListing[l.id] || 0) / viewsByListing[l.id]) * 100 : 0,
      createdAt: l.createdAt,
      status: l.status,
    }));
    const mostViewed = [...listingList].sort((a, b) => b.views - a.views).slice(0, 10);
    const mostBooked = [...listingList].sort((a, b) => b.bookings - a.bookings).slice(0, 10);
    const highestConversion = [...listingList].filter((l) => l.views >= 3).sort((a, b) => b.conversion - a.conversion).slice(0, 10);
    const noBookings = listingList.filter((l) => l.bookings === 0).slice(0, 20);
    const recent = [...listingList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);
    // Category / district performance
    const catPerf = {}, distPerf = {};
    for (const b of bookingsAll.filter((x) => x.status !== 'cancelled' && x.status !== 'rejected')) {
      const key = m14CategoryOf(b, listingMap);
      catPerf[key] = catPerf[key] || { category: key, revenue: 0, bookings: 0 };
      catPerf[key].revenue += bAmt(b);
      catPerf[key].bookings += 1;
      const l = listingMap.get(b.listingId); const dk = String(l?.district || l?.city || 'Unknown');
      distPerf[dk] = distPerf[dk] || { district: dk, revenue: 0, bookings: 0 };
      distPerf[dk].revenue += bAmt(b);
      distPerf[dk].bookings += 1;
    }
    const listingAnalytics = {
      mostViewed, mostBooked, highestConversion, noBookings, recent,
      categoryPerformance: Object.values(catPerf).sort((a, b) => b.revenue - a.revenue),
      districtPerformance: Object.values(distPerf).sort((a, b) => b.revenue - a.revenue).slice(0, 15),
    };

    // -------- Marketing analytics --------
    const couponUses = await couponUseC.find({}, { projection: { _id: 0 } }).toArray();
    const couponUsageInRange = couponUses.filter((c) => new Date(c.usedAt || c.createdAt) >= start && new Date(c.usedAt || c.createdAt) <= end);
    const totalDiscountFromCoupons = sum(couponUsageInRange, (c) => c.discountAmount || c.amount || 0);
    const promotionsCount = await promoC.countDocuments({});
    const activePromotions = await promoC.countDocuments({ active: true });
    const referralsInRange = referralsAll.filter((r) => new Date(r.createdAt) >= start && new Date(r.createdAt) <= end);
    const referralReward = sum(referralsInRange, (r) => r.rewardAmount || 0);
    const walletPaymentsInRange = walletTx.filter((t) => new Date(t.createdAt) >= start && new Date(t.createdAt) <= end && t.type === 'debit' && (t.reason === 'booking' || t.category === 'booking' || t.bookingId));
    const marketingAnalytics = {
      couponUsageCount: couponUsageInRange.length,
      couponDiscount: totalDiscountFromCoupons,
      promotionsTotal: promotionsCount,
      promotionsActive: activePromotions,
      referralsInRange: referralsInRange.length,
      referralRewardAmount: referralReward,
      creditsRedeemed: totalCreditsRedeemedRange,
      walletPaymentsCount: walletPaymentsInRange.length,
      walletPaymentsAmount: sum(walletPaymentsInRange, (t) => t.amount),
      couponROI: totalDiscountFromCoupons > 0 ? +((kpi.totalRevenueRange - totalDiscountFromCoupons) / totalDiscountFromCoupons * 100).toFixed(1) : 0,
      onlinePaymentDiscount: 0,
    };

    // -------- AI Planner analytics --------
    const aiPlansAll = await safarPlansC.find({}, { projection: { _id: 0 } }).toArray();
    const aiPlansRange = aiPlansAll.filter((p) => new Date(p.createdAt) >= start && new Date(p.createdAt) <= end);
    const destCount = {}, typeCount = {}, dateCount = {};
    for (const p of aiPlansAll) {
      const dest = p.destination || p.location || 'Unknown';
      destCount[dest] = (destCount[dest] || 0) + 1;
      const type = p.itineraryType || p.tripType || 'general';
      typeCount[type] = (typeCount[type] || 0) + 1;
      if (p.startDate) {
        const mo = m14MonthBucket(p.startDate);
        dateCount[mo] = (dateCount[mo] || 0) + 1;
      }
    }
    const planIds = new Set(aiPlansAll.map((p) => p.id));
    const bookingsFromPlan = bookingsAll.filter((b) => b.aiPlanId && planIds.has(b.aiPlanId)).length;
    const aiAnalytics = {
      totalPlans: aiPlansAll.length,
      plansInRange: aiPlansRange.length,
      topDestinations: Object.entries(destCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })),
      popularTypes: Object.entries(typeCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })),
      popularMonths: Object.entries(dateCount).sort().map(([bucket, count]) => ({ bucket, count })),
      conversionToBooking: aiPlansAll.length ? +(bookingsFromPlan / aiPlansAll.length * 100).toFixed(1) : 0,
      bookingsFromPlan,
    };

    // -------- Revenue analytics --------
    const revenueAnalytics = {
      byDay: toSeries(daySeries),
      byWeek: toSeries(weekSeries),
      byMonth: toSeries(monthSeries),
      categoryBreakdown: Object.values(categoryBreakdown).sort((a, b) => b.gross - a.gross),
      grossRevenue: kpi.totalRevenueRange,
      netRevenue: kpi.totalRevenueRange - kpi.platformCommission,
      commission: kpi.platformCommission,
      discounts: discountsInRange,
      walletUsage,
      refunds: refundsInRange,
    };

    return ok({
      range: { key: rangeKey, start, end },
      kpi,
      revenueAnalytics,
      bookingAnalytics,
      travelerAnalytics,
      hostAnalytics,
      listingAnalytics,
      marketingAnalytics,
      aiAnalytics,
    });
  }

  // GET /api/admin/analytics/filters — returns filter option lists
  if (path === '/admin/analytics/filters' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const [listings, users] = await Promise.all([getCollection('listings'), getCollection('users')]);
    const districtsAgg = await listings.distinct('district');
    const cities = await listings.distinct('city');
    const districts = Array.from(new Set([...(districtsAgg || []), ...(cities || [])])).filter(Boolean).sort();
    const hosts = await users.find({ role: 'host' }, { projection: { _id: 0, id: 1, name: 1, email: 1 } }).limit(500).toArray();
    return ok({
      categories: ['hotels', 'houseboats', 'homestays', 'tours', 'activities', 'car_rentals', 'bike_rentals'],
      districts,
      hosts,
      statuses: ['pending', 'approved', 'cancelled', 'rejected'],
      paymentTypes: ['full', 'booking_fee', 'online', 'wallet', 'cash'],
    });
  }

  // GET /api/admin/analytics/export?report=revenue|booking|host|traveler|listing|refund|wallet|referral|promotion&range=&from=&to=
  if (path === '/admin/analytics/export' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const url = new URL(request.url);
    const report = url.searchParams.get('report') || 'revenue';
    const rangeKey = url.searchParams.get('range') || '30d';
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const { start, end } = m14ResolveRange(rangeKey, from, to);
    const esc = (v) => {
      const s = v === null || v === undefined ? '' : (v instanceof Date ? v.toISOString() : String(v));
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csvOf = (headers, rows) => headers.join(',') + '\n' + rows.map((r) => headers.map((h) => esc(r[h])).join(',')).join('\n');

    let csv = '', filename = `${report}-${Date.now()}.csv`;
    const bookings = await (await getCollection('bookings')).find({ createdAt: { $gte: start, $lte: end } }, { projection: { _id: 0 } }).toArray();
    if (report === 'revenue' || report === 'booking') {
      const rows = bookings.map((b) => ({
        bookingId: b.bookingId, listingTitle: b.listingTitle, travelerName: b.travelerName,
        hostName: b.hostName, status: b.status, totalPrice: b.totalPrice,
        checkInDate: b.checkInDate, checkOutDate: b.checkOutDate,
        createdAt: b.createdAt, refunded: b.refunded ? 'yes' : 'no',
      }));
      csv = csvOf(['bookingId', 'listingTitle', 'travelerName', 'hostName', 'status', 'totalPrice', 'checkInDate', 'checkOutDate', 'createdAt', 'refunded'], rows);
    } else if (report === 'host') {
      const rows = await (await getCollection('hostEarnings')).find({ createdAt: { $gte: start, $lte: end } }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
      csv = csvOf(['bookingId', 'hostId', 'listingTitle', 'bookingAmount', 'commissionAmount', 'netEarnings', 'status', 'createdAt'], rows);
    } else if (report === 'traveler') {
      const users = await (await getCollection('users')).find({ createdAt: { $gte: start, $lte: end } }, { projection: { _id: 0, passwordHash: 0 } }).toArray();
      csv = csvOf(['id', 'name', 'email', 'role', 'createdAt'], users);
    } else if (report === 'listing') {
      const listings = await (await getCollection('listings')).find({ createdAt: { $gte: start, $lte: end } }, { projection: { _id: 0 } }).toArray();
      csv = csvOf(['id', 'title', 'category', 'district', 'city', 'hostId', 'status', 'price', 'createdAt'], listings);
    } else if (report === 'refund') {
      const rows = bookings.filter((b) => b.refunded).map((b) => ({ bookingId: b.bookingId, listingTitle: b.listingTitle, travelerName: b.travelerName, amount: b.totalPrice, createdAt: b.createdAt }));
      csv = csvOf(['bookingId', 'listingTitle', 'travelerName', 'amount', 'createdAt'], rows);
    } else if (report === 'wallet') {
      const rows = await (await getCollection('walletTransactions')).find({ createdAt: { $gte: start, $lte: end } }, { projection: { _id: 0 } }).toArray();
      csv = csvOf(['id', 'userId', 'type', 'amount', 'reason', 'bookingId', 'createdAt'], rows);
    } else if (report === 'referral') {
      const rows = await (await getCollection('referrals')).find({ createdAt: { $gte: start, $lte: end } }, { projection: { _id: 0 } }).toArray();
      csv = csvOf(['id', 'referrerId', 'refereeId', 'code', 'status', 'rewardAmount', 'createdAt'], rows);
    } else if (report === 'promotion') {
      const rows = await (await getCollection('couponUses')).find({ createdAt: { $gte: start, $lte: end } }, { projection: { _id: 0 } }).toArray();
      csv = csvOf(['id', 'couponCode', 'userId', 'bookingId', 'discountAmount', 'createdAt'], rows);
    }
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  // ============================================================================
  // MODULE 15 — Trust, Reviews & Reputation (extended endpoints)
  // ============================================================================
  // Backwards compat: legacy POST /reviews with { propertyId, rating, reviewText }
  // still works. New payload supports the full Module 15 schema.

  const M15_DEFAULTS = {
    minReviewLength: 20,
    maxReviewLength: 4000,
    allowAnonymous: true,
    allowPhotos: true,
    allowVideos: true,
    maxPhotos: 10,
    maxVideos: 2,
    editWindowHours: 48,
    autoPublish: true,
    requireApproval: false,
    enableAiSummary: true,
    badgeThresholds: {
      trustedHostMinBookings: 10,
      trustedHostMinRating: 4.5,
      topRatedMinReviews: 20,
      topRatedMinRating: 4.7,
      superHostMinBookings: 50,
      superHostMinRating: 4.8,
      fastResponderMaxHours: 2,
      eliteTravelerMinTrips: 25,
    },
  };

  const m15GetSettings = async () => {
    const col = await getCollection('reviewSettings');
    let doc = await col.findOne({ id: 'default' }, { projection: { _id: 0 } });
    if (!doc) {
      doc = { id: 'default', ...M15_DEFAULTS, createdAt: new Date(), updatedAt: new Date() };
      try { await col.insertOne({ ...doc }); } catch {}
    }
    return { ...M15_DEFAULTS, ...doc, badgeThresholds: { ...M15_DEFAULTS.badgeThresholds, ...(doc.badgeThresholds || {}) } };
  };

  // Compute an aggregated summary for a listing:
  //   overall average, histogram, category averages, AI-style summary text.
  const m15SummarizeReviews = (reviews) => {
    if (!reviews.length) {
      return {
        count: 0, averageRating: 0,
        histogram: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        categoryAverages: {},
        aiSummary: null,
      };
    }
    const round1 = (n) => Math.round(n * 10) / 10;
    const sum = (arr, fn) => arr.reduce((s, r) => s + (Number(fn(r)) || 0), 0);
    const catKeys = ['cleanliness', 'location', 'value', 'hostBehaviour', 'communication', 'accuracy', 'amenities', 'safety'];
    const categoryAverages = {};
    catKeys.forEach((k) => {
      const rated = reviews.filter((r) => r.categories && r.categories[k]);
      categoryAverages[k] = rated.length ? round1(sum(rated, (r) => r.categories[k]) / rated.length) : 0;
    });
    const histogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => { const b = Math.round(r.rating); if (histogram[b] !== undefined) histogram[b] += 1; });
    const averageRating = round1(sum(reviews, (r) => r.rating) / reviews.length);
    // Non-LLM AI-style summary: pick top praised categories + note common cons keywords.
    const topCategories = Object.entries(categoryAverages).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k.replace(/([A-Z])/g, ' $1').toLowerCase());
    const bottomCat = Object.entries(categoryAverages).filter(([, v]) => v > 0).sort((a, b) => a[1] - b[1])[0];
    const commonCons = reviews.flatMap((r) => (r.cons || '').split(/[,;\.]/).map((s) => s.trim()).filter((s) => s.length > 3 && s.length < 40));
    const consMap = {};
    commonCons.forEach((c) => { const k = c.toLowerCase(); consMap[k] = (consMap[k] || 0) + 1; });
    const topCon = Object.entries(consMap).sort((a, b) => b[1] - a[1])[0];
    let aiSummary = '';
    if (topCategories.length) {
      aiSummary = `Guests frequently praise ${topCategories.join(', ')}`;
      if (topCon && topCon[1] >= 2) aiSummary += `, while suggesting improvements in ${topCon[0]}`;
      else if (bottomCat && bottomCat[1] > 0 && bottomCat[1] < 4) aiSummary += `, while noting ${bottomCat[0].replace(/([A-Z])/g, ' $1').toLowerCase()} could improve`;
      aiSummary += '.';
    } else {
      aiSummary = `Average rating ${averageRating} across ${reviews.length} review${reviews.length === 1 ? '' : 's'}.`;
    }
    return { count: reviews.length, averageRating, histogram, categoryAverages, aiSummary };
  };

  // Compute Host Trust Score + badges
  const m15ComputeHostScore = async (hostId) => {
    const [bookingsC, reviewsC, listingsC, payoutsC, usersC, settings] = await Promise.all([
      getCollection('bookings'), getCollection('reviews'), getCollection('listings'),
      getCollection('hostPayoutSettings'), getCollection('users'), m15GetSettings(),
    ]);
    const [bookings, listings, user, payoutSettings] = await Promise.all([
      bookingsC.find({ hostId }, { projection: { _id: 0 } }).toArray(),
      listingsC.find({ hostId }, { projection: { _id: 0, id: 1 } }).toArray(),
      usersC.findOne({ id: hostId }, { projection: { _id: 0 } }),
      payoutsC.findOne({ hostId }),
    ]);
    const listingIds = listings.map((l) => l.id);
    const reviews = await reviewsC.find({ $or: [{ listingId: { $in: listingIds } }, { propertyId: { $in: listingIds } }] }, { projection: { _id: 0 } }).toArray();
    const avgRating = reviews.length ? reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length : 0;
    const total = bookings.length || 1;
    const completed = bookings.filter((b) => b.status === 'approved').length;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
    const rejected = bookings.filter((b) => b.status === 'rejected').length;
    const cancellationRate = (cancelled / total) * 100;
    const acceptanceRate = ((total - rejected) / total) * 100;
    const responseRate = bookings.filter((b) => b.status !== 'pending').length / total * 100;
    // Repeat guests
    const gCount = {};
    bookings.forEach((b) => { if (b.travelerId) gCount[b.travelerId] = (gCount[b.travelerId] || 0) + 1; });
    const repeatGuests = Object.values(gCount).filter((c) => c > 1).length;
    const yearsActive = user?.createdAt ? Math.max(0, ((Date.now() - new Date(user.createdAt).getTime()) / (365 * 86400000)).toFixed(1)) : 0;
    // Identity verification (loose heuristic — reuses existing fields if present)
    const identity = {
      email: !!user?.emailVerified || !!user?.email,
      phone: !!user?.phoneVerified || !!user?.phone,
      governmentId: !!user?.identityVerified || !!user?.idVerified,
      payout: !!payoutSettings,
    };
    // Weighted trust score (0-100)
    let score = 0;
    score += Math.min(40, avgRating * 8);              // up to 40 for rating
    score += Math.min(20, acceptanceRate * 0.2);        // up to 20 for acceptance
    score += Math.min(15, responseRate * 0.15);         // up to 15 for response
    score += Math.max(0, 10 - cancellationRate);        // up to 10 (penalise cancels)
    score += Math.min(5, repeatGuests);                 // up to 5 for repeat guests
    score += (identity.email ? 2 : 0) + (identity.phone ? 3 : 0) + (identity.governmentId ? 3 : 0) + (identity.payout ? 2 : 0);
    score = Math.round(score);

    // Badges
    const bt = settings.badgeThresholds;
    const badges = [];
    const daysActive = user?.createdAt ? (Date.now() - new Date(user.createdAt).getTime()) / 86400000 : 0;
    if (daysActive < 60) badges.push('new_host');
    if (identity.email || identity.phone) badges.push('verified_host');
    if (completed >= bt.trustedHostMinBookings && avgRating >= bt.trustedHostMinRating) badges.push('trusted_host');
    if (reviews.length >= bt.topRatedMinReviews && avgRating >= bt.topRatedMinRating) badges.push('top_rated');
    if (repeatGuests >= 5) badges.push('guest_favourite');
    if (responseRate >= 90) badges.push('fast_responder');
    if (completed >= bt.superHostMinBookings && avgRating >= bt.superHostMinRating) badges.push('super_host');
    const cleanlinessScores = reviews.filter((r) => r.categories?.cleanliness).map((r) => r.categories.cleanliness);
    const cleanAvg = cleanlinessScores.length ? cleanlinessScores.reduce((s, v) => s + v, 0) / cleanlinessScores.length : 0;
    if (cleanAvg >= 4.7) badges.push('excellent_cleanliness');
    if (avgRating >= 4.6 && reviews.length >= 10) badges.push('highly_recommended');
    if (score >= 85) badges.push('premium_host');

    return {
      hostId, trustScore: score, badges,
      metrics: { avgRating: +avgRating.toFixed(2), totalBookings: total, completed, cancelled, cancellationRate: +cancellationRate.toFixed(1), acceptanceRate: +acceptanceRate.toFixed(1), responseRate: +responseRate.toFixed(1), repeatGuests, yearsActive, reviewCount: reviews.length },
      identity,
    };
  };

  // Compute Traveler badges + stats
  const m15ComputeTravelerBadges = async (travelerId) => {
    const [bookingsC, reviewsC, referralsC, settings] = await Promise.all([
      getCollection('bookings'), getCollection('reviews'), getCollection('referrals'), m15GetSettings(),
    ]);
    const [bookings, reviews, referrals] = await Promise.all([
      bookingsC.find({ travelerId }, { projection: { _id: 0 } }).toArray(),
      reviewsC.find({ userId: travelerId }, { projection: { _id: 0 } }).toArray(),
      referralsC.find({ referrerId: travelerId }, { projection: { _id: 0 } }).toArray(),
    ]);
    const completed = bookings.filter((b) => b.status === 'approved').length;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
    const cancelRate = bookings.length ? (cancelled / bookings.length) * 100 : 0;
    const helpfulVotes = reviews.reduce((s, r) => s + (r.helpfulCount || 0), 0);
    const bt = settings.badgeThresholds;
    const badges = ['verified_traveler'];
    if (completed >= 5) badges.push('explorer');
    if (completed >= bt.eliteTravelerMinTrips) badges.push('elite_traveler');
    if (bookings.some((b) => b.checkInDate && new Date(b.checkInDate).getDay() >= 5)) badges.push('weekend_traveler');
    // Guess family/luxury/adventure heuristically from booking counts (soft-tag)
    if (bookings.filter((b) => (b.guests || 1) >= 3).length >= 3) badges.push('family_traveler');
    if (bookings.some((b) => (b.totalPrice || 0) > 25000)) badges.push('luxury_traveler');
    if (reviews.length >= 10) badges.push('top_contributor');
    if (helpfulVotes >= 25) badges.push('vip_traveler');
    return {
      travelerId, badges,
      stats: {
        tripsCompleted: completed, bookingsCompleted: completed, reviewsWritten: reviews.length,
        helpfulVotes, referralCount: referrals.length,
        cancellationRate: +cancelRate.toFixed(1),
      },
    };
  };

  // POST /api/reviews  (extended — backwards-compatible with legacy payload)
  if (path === '/reviews' && method === 'POST') {
    const b = await readBody(request);
    const me = await getCurrentUser(request);
    if (!me) return err('Authentication required', 401);
    const settings = await m15GetSettings();

    const listingId = b.listingId || b.propertyId;
    const rating = Number(b.rating);
    const reviewText = String(b.reviewText || b.review || '').trim();
    if (!listingId || !rating || rating < 1 || rating > 5) return err('Valid listingId and rating (1-5) required');
    if (reviewText.length && (reviewText.length < settings.minReviewLength || reviewText.length > settings.maxReviewLength)) {
      return err(`Review must be ${settings.minReviewLength}–${settings.maxReviewLength} characters`);
    }

    const reviews = await getCollection('reviews');

    // Verified booking check (if bookingId provided)
    let verifiedBooking = false, bookingId = b.bookingId || null;
    if (bookingId) {
      const bk = await (await getCollection('bookings')).findOne({ bookingId });
      if (!bk) return err('Booking not found', 404);
      if (bk.travelerId !== me.id) return err('You cannot review this booking', 403);
      if (bk.status !== 'approved') return err('Only completed bookings can be reviewed', 400);
      if (bk.checkOutDate && new Date(bk.checkOutDate) > new Date()) return err('You can review after check-out', 400);
      const dup = await reviews.findOne({ bookingId });
      if (dup) return err('You have already reviewed this booking');
      verifiedBooking = true;
    } else {
      // Legacy path — one review per (listing, user)
      const existing = await reviews.findOne({ $or: [{ listingId, userId: me.id }, { propertyId: listingId, userId: me.id }] });
      if (existing) return err('You have already reviewed this property');
    }

    // Media validation
    const photos = Array.isArray(b.photos) ? b.photos.slice(0, settings.maxPhotos) : [];
    const videos = Array.isArray(b.videos) ? b.videos.slice(0, settings.maxVideos) : [];
    if (!settings.allowPhotos && photos.length) return err('Photos are not allowed');
    if (!settings.allowVideos && videos.length) return err('Videos are not allowed');

    const categories = {};
    ['cleanliness', 'location', 'value', 'hostBehaviour', 'communication', 'accuracy', 'amenities', 'safety'].forEach((k) => {
      if (b.categories && typeof b.categories[k] === 'number' && b.categories[k] >= 1 && b.categories[k] <= 5) {
        categories[k] = Number(b.categories[k]);
      } else if (typeof b[k] === 'number') {
        categories[k] = Number(b[k]);
      }
    });

    const review = {
      id: uuid(),
      listingId,
      propertyId: listingId, // legacy alias
      bookingId,
      userId: me.id,
      userName: b.anonymous && settings.allowAnonymous ? 'Anonymous Traveler' : (me.name || 'Traveler'),
      realUserName: me.name || null,
      anonymous: !!b.anonymous && settings.allowAnonymous,
      rating,
      categories,
      title: String(b.title || '').slice(0, 140),
      reviewText,
      pros: String(b.pros || '').slice(0, 1000),
      cons: String(b.cons || '').slice(0, 1000),
      visitType: ['solo', 'family', 'friends', 'couple', 'business'].includes(b.visitType) ? b.visitType : null,
      stayMonth: b.stayMonth || null,
      wouldRecommend: typeof b.wouldRecommend === 'boolean' ? b.wouldRecommend : null,
      photos,
      videos,
      verifiedBooking,
      verifiedTraveler: !!me.emailVerified || !!me.phoneVerified,
      helpfulCount: 0,
      notHelpfulCount: 0,
      helpfulVoters: [],
      notHelpfulVoters: [],
      reports: [],
      hostReply: null,
      moderationStatus: settings.requireApproval ? 'pending' : 'approved',
      hidden: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await reviews.insertOne(review);
    const { _id, ...data } = review;
    return ok({ review: data }, 201);
  }

  // PUT /api/reviews/:id  (edit within window)
  {
    const m = path.match(/^\/reviews\/([^/]+)$/);
    if (m && method === 'PUT') {
      const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
      const settings = await m15GetSettings();
      const b = await readBody(request);
      const reviews = await getCollection('reviews');
      const rec = await reviews.findOne({ id: m[1] });
      if (!rec) return err('Review not found', 404);
      const isOwner = rec.userId === me.id;
      const isAdmin = ['admin', 'super_admin'].includes(me.role);
      if (!isOwner && !isAdmin) return err('Forbidden', 403);
      // Owner: allowed only within edit window unless admin override
      if (isOwner && !isAdmin) {
        const hours = (Date.now() - new Date(rec.createdAt).getTime()) / 3600000;
        if (hours > settings.editWindowHours) return err('Edit window has expired. Contact support to edit.', 403);
      }
      const patch = { updatedAt: new Date() };
      ['rating', 'title', 'reviewText', 'pros', 'cons', 'visitType', 'stayMonth', 'wouldRecommend', 'photos', 'videos', 'categories', 'anonymous'].forEach((k) => {
        if (b[k] !== undefined) patch[k] = b[k];
      });
      await reviews.updateOne({ id: m[1] }, { $set: patch });
      const fresh = await reviews.findOne({ id: m[1] }, { projection: { _id: 0 } });
      return ok({ review: fresh });
    }
    if (m && method === 'DELETE') {
      const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
      const reviews = await getCollection('reviews');
      const rec = await reviews.findOne({ id: m[1] });
      if (!rec) return err('Review not found', 404);
      const isOwner = rec.userId === me.id;
      const isAdmin = ['admin', 'super_admin'].includes(me.role);
      if (!isOwner && !isAdmin) return err('Forbidden', 403);
      await reviews.deleteOne({ id: m[1] });
      if (isAdmin) m12LogFinanceAudit(me, 'review_deleted', { reviewId: m[1], listingId: rec.listingId }).catch(() => {});
      return ok({ deleted: true });
    }
  }

  // POST /api/reviews/:id/reply — host reply
  {
    const m = path.match(/^\/reviews\/([^/]+)\/reply$/);
    if (m && (method === 'POST' || method === 'PUT')) {
      const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
      if (me.role !== 'host' && !['admin', 'super_admin'].includes(me.role)) return err('Only hosts can reply', 403);
      const b = await readBody(request);
      const text = String(b.text || '').trim();
      if (!text) return err('Reply text required');
      const reviews = await getCollection('reviews');
      const rec = await reviews.findOne({ id: m[1] });
      if (!rec) return err('Review not found', 404);
      // Verify host owns the listing
      const listing = await (await getCollection('listings')).findOne({ id: rec.listingId || rec.propertyId }, { projection: { hostId: 1, _id: 0 } });
      if (me.role === 'host' && listing?.hostId !== me.id) return err('Not your listing', 403);
      if (rec.hostReply && method === 'POST') return err('You have already replied. Use PUT to edit.', 400);
      if (rec.hostReply && method === 'PUT') {
        const hours = (Date.now() - new Date(rec.hostReply.createdAt).getTime()) / 3600000;
        if (hours > 24 && !['admin', 'super_admin'].includes(me.role)) return err('Reply edit window closed (24h)', 403);
      }
      const reply = {
        text: text.slice(0, 2000),
        hostId: me.id, hostName: me.name || me.email,
        createdAt: rec.hostReply?.createdAt || new Date(),
        updatedAt: new Date(),
      };
      await reviews.updateOne({ id: m[1] }, { $set: { hostReply: reply, updatedAt: new Date() } });
      // Notify traveler
      mkNotif({ userId: rec.userId, type: 'review_reply', category: 'review', title: 'Host replied to your review', body: text.slice(0, 140), link: `/listing/${rec.listingId || rec.propertyId}` }).catch(() => {});
      return ok({ hostReply: reply });
    }
    if (m && method === 'DELETE') {
      const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
      const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
      const reviews = await getCollection('reviews');
      await reviews.updateOne({ id: m[1] }, { $set: { hostReply: null, updatedAt: new Date() } });
      m12LogFinanceAudit(me, 'review_reply_removed', { reviewId: m[1] }).catch(() => {});
      return ok({ deleted: true });
    }
  }

  // POST /api/reviews/:id/vote  { vote: 'helpful' | 'not_helpful' }
  {
    const m = path.match(/^\/reviews\/([^/]+)\/vote$/);
    if (m && method === 'POST') {
      const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
      const { vote } = await readBody(request);
      if (!['helpful', 'not_helpful'].includes(vote)) return err('Invalid vote');
      const reviews = await getCollection('reviews');
      const rec = await reviews.findOne({ id: m[1] });
      if (!rec) return err('Review not found', 404);
      const helpfulSet = new Set(rec.helpfulVoters || []);
      const notSet = new Set(rec.notHelpfulVoters || []);
      // Remove any prior vote from this user
      helpfulSet.delete(me.id); notSet.delete(me.id);
      if (vote === 'helpful') helpfulSet.add(me.id); else notSet.add(me.id);
      await reviews.updateOne({ id: m[1] }, { $set: {
        helpfulVoters: [...helpfulSet], notHelpfulVoters: [...notSet],
        helpfulCount: helpfulSet.size, notHelpfulCount: notSet.size,
        updatedAt: new Date(),
      } });
      return ok({ helpfulCount: helpfulSet.size, notHelpfulCount: notSet.size });
    }
  }

  // POST /api/reviews/:id/report  { reason, note }
  {
    const m = path.match(/^\/reviews\/([^/]+)\/report$/);
    if (m && method === 'POST') {
      const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
      const { reason, note } = await readBody(request);
      if (!['spam', 'fake', 'offensive', 'wrong_property', 'duplicate', 'other'].includes(reason)) return err('Invalid reason');
      const reviews = await getCollection('reviews');
      const rec = await reviews.findOne({ id: m[1] });
      if (!rec) return err('Review not found', 404);
      // Prevent duplicate report by same user
      if ((rec.reports || []).some((r) => r.userId === me.id)) return err('You have already reported this review');
      const report = { userId: me.id, userName: me.name || me.email, reason, note: (note || '').slice(0, 500), createdAt: new Date() };
      await reviews.updateOne({ id: m[1] }, { $push: { reports: report }, $set: { updatedAt: new Date() } });
      return ok({ reported: true });
    }
  }

  // GET /api/listings/:id/reviews (paginated + sorted + filtered) with summary
  {
    const m = path.match(/^\/listings\/([^/]+)\/reviews$/);
    if (m && method === 'GET') {
      const url = new URL(request.url);
      const listingId = m[1];
      const sort = url.searchParams.get('sort') || 'newest';
      const filterVerified = url.searchParams.get('verified') === '1';
      const filterPhotos = url.searchParams.get('photos') === '1';
      const filterVideos = url.searchParams.get('videos') === '1';
      const filterRating = url.searchParams.get('rating');
      const filterVisit = url.searchParams.get('visitType');
      const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
      const pageSize = Math.min(50, Number(url.searchParams.get('pageSize')) || 10);
      const reviewsC = await getCollection('reviews');
      const query = {
        $or: [{ listingId }, { propertyId: listingId }],
        hidden: { $ne: true },
        moderationStatus: { $in: ['approved', null] },
      };
      if (filterVerified) query.verifiedBooking = true;
      if (filterPhotos) query.photos = { $exists: true, $not: { $size: 0 } };
      if (filterVideos) query.videos = { $exists: true, $not: { $size: 0 } };
      if (filterRating) query.rating = Number(filterRating);
      if (filterVisit) query.visitType = filterVisit;
      const all = await reviewsC.find({ $or: [{ listingId }, { propertyId: listingId }] }, { projection: { _id: 0 } }).toArray();
      const visible = await reviewsC.find(query, { projection: { _id: 0 } }).toArray();
      // Sort
      const sortFns = {
        newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        highest: (a, b) => b.rating - a.rating,
        lowest: (a, b) => a.rating - b.rating,
        most_helpful: (a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0),
        photos_first: (a, b) => (b.photos?.length || 0) - (a.photos?.length || 0),
        videos_first: (a, b) => (b.videos?.length || 0) - (a.videos?.length || 0),
      };
      visible.sort(sortFns[sort] || sortFns.newest);
      const start = (page - 1) * pageSize;
      const pageItems = visible.slice(start, start + pageSize);
      const summary = m15SummarizeReviews(all.filter((r) => !r.hidden && (r.moderationStatus || 'approved') === 'approved'));
      return ok({ reviews: pageItems, total: visible.length, page, pageSize, summary });
    }
  }

  // GET /api/hosts/:id/score
  {
    const m = path.match(/^\/hosts\/([^/]+)\/score$/);
    if (m && method === 'GET') {
      return ok(await m15ComputeHostScore(m[1]));
    }
  }

  // GET /api/host/reviews  (received + reply pending; the caller is a host)
  if (path === '/host/reviews' && method === 'GET') {
    const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
    if (me.role !== 'host' && !['admin', 'super_admin'].includes(me.role)) return err('Forbidden', 403);
    const listings = await (await getCollection('listings')).find({ hostId: me.id }, { projection: { _id: 0, id: 1, title: 1 } }).toArray();
    const listingIds = listings.map((l) => l.id);
    const reviews = await (await getCollection('reviews')).find({ $or: [{ listingId: { $in: listingIds } }, { propertyId: { $in: listingIds } }] }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    const score = await m15ComputeHostScore(me.id);
    return ok({ reviews, listings, score, pendingReplies: reviews.filter((r) => !r.hostReply).length });
  }

  // POST /api/host/reviews/traveler — host reviews traveler (private + public parts)
  if (path === '/host/reviews/traveler' && method === 'POST') {
    const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
    if (me.role !== 'host') return err('Only hosts', 403);
    const b = await readBody(request);
    if (!b.bookingId) return err('bookingId required');
    const booking = await (await getCollection('bookings')).findOne({ bookingId: b.bookingId });
    if (!booking) return err('Booking not found', 404);
    if (booking.hostId !== me.id) return err('Not your booking', 403);
    const col = await getCollection('travelerReviews');
    const existing = await col.findOne({ bookingId: b.bookingId });
    if (existing) return err('Already reviewed', 400);
    const doc = {
      id: uuid(),
      bookingId: b.bookingId,
      travelerId: booking.travelerId,
      travelerName: booking.travelerName,
      hostId: me.id,
      hostName: me.name || me.email,
      ratings: {
        communication: Number(b.communication) || 0,
        cleanliness: Number(b.cleanliness) || 0,
        punctuality: Number(b.punctuality) || 0,
        ruleFollowing: Number(b.ruleFollowing) || 0,
        overall: Number(b.overall) || 0,
      },
      wouldHostAgain: !!b.wouldHostAgain,
      publicComment: String(b.publicComment || '').slice(0, 1000),
      privateNotes: String(b.privateNotes || '').slice(0, 1000),
      createdAt: new Date(),
    };
    await col.insertOne(doc);
    const { _id, ...data } = doc;
    return ok({ review: data }, 201);
  }

  // GET /api/host/reviews/given
  if (path === '/host/reviews/given' && method === 'GET') {
    const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
    if (me.role !== 'host' && !['admin', 'super_admin'].includes(me.role)) return err('Forbidden', 403);
    const list = await (await getCollection('travelerReviews')).find({ hostId: me.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    return ok({ reviews: list });
  }

  // GET /api/traveler/reviews — my reviews + reviewable bookings
  if (path === '/traveler/reviews' && method === 'GET') {
    const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
    const reviews = await (await getCollection('reviews')).find({ userId: me.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    const bookings = await (await getCollection('bookings')).find({ travelerId: me.id, status: 'approved' }, { projection: { _id: 0 } }).toArray();
    const now = new Date();
    const reviewed = new Set(reviews.map((r) => r.bookingId).filter(Boolean));
    const eligible = bookings.filter((b) => !reviewed.has(b.bookingId) && b.checkOutDate && new Date(b.checkOutDate) <= now);
    const badges = await m15ComputeTravelerBadges(me.id);
    return ok({ reviews, eligibleBookings: eligible, badges });
  }

  // GET /api/traveler/:id/public-profile — trips completed, badges, avg rating from hosts
  {
    const m = path.match(/^\/traveler\/([^/]+)\/public-profile$/);
    if (m && method === 'GET') {
      const travelerId = m[1];
      const [bookings, hostReviews, badges] = await Promise.all([
        (await getCollection('bookings')).find({ travelerId, status: 'approved' }, { projection: { _id: 0, listingId: 1, checkInDate: 1, totalPrice: 1 } }).toArray(),
        (await getCollection('travelerReviews')).find({ travelerId }, { projection: { _id: 0, ratings: 1 } }).toArray(),
        m15ComputeTravelerBadges(travelerId),
      ]);
      const listings = await (await getCollection('listings')).find({ id: { $in: bookings.map((b) => b.listingId).filter(Boolean) } }, { projection: { _id: 0, city: 1, district: 1, country: 1 } }).toArray();
      const cities = new Set(listings.map((l) => l.city).filter(Boolean));
      const countries = new Set(listings.map((l) => l.country).filter(Boolean));
      const avgFromHosts = hostReviews.length ? hostReviews.reduce((s, r) => s + Number(r.ratings?.overall || 0), 0) / hostReviews.length : 0;
      return ok({
        stats: {
          ...badges.stats,
          citiesVisited: cities.size,
          countriesVisited: countries.size,
          averageRatingFromHosts: +avgFromHosts.toFixed(2),
        },
        badges: badges.badges,
      });
    }
  }

  // ------------------- ADMIN: MODERATION -------------------

  // GET /api/admin/reviews/moderation?status=pending|reported|deleted|approved
  if (path === '/admin/reviews/moderation' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'reported';
    const col = await getCollection('reviews');
    let filter = {};
    if (status === 'pending') filter = { moderationStatus: 'pending' };
    else if (status === 'reported') filter = { 'reports.0': { $exists: true } };
    else if (status === 'hidden') filter = { hidden: true };
    else if (status === 'approved') filter = { moderationStatus: 'approved', hidden: { $ne: true } };
    const reviews = await col.find(filter, { projection: { _id: 0 } }).sort({ updatedAt: -1 }).limit(200).toArray();
    // Stats
    const [pendingC, reportedC, hiddenC, approvedC, totalC] = await Promise.all([
      col.countDocuments({ moderationStatus: 'pending' }),
      col.countDocuments({ 'reports.0': { $exists: true } }),
      col.countDocuments({ hidden: true }),
      col.countDocuments({ moderationStatus: 'approved', hidden: { $ne: true } }),
      col.countDocuments({}),
    ]);
    // Most reported listings
    const reported = await col.aggregate([
      { $match: { 'reports.0': { $exists: true } } },
      { $group: { _id: { $ifNull: ['$listingId', '$propertyId'] }, reports: { $sum: { $size: '$reports' } } } },
      { $sort: { reports: -1 } }, { $limit: 10 },
    ]).toArray();
    // Most active reviewers
    const active = await col.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 10 },
    ]).toArray();
    return ok({ reviews, stats: { pending: pendingC, reported: reportedC, hidden: hiddenC, approved: approvedC, total: totalC }, mostReportedListings: reported, mostActiveReviewers: active });
  }

  // POST /api/admin/reviews/:id/moderate  { action: approve|reject|hide|delete|restore, reason }
  {
    const m = path.match(/^\/admin\/reviews\/([^/]+)\/moderate$/);
    if (m && method === 'POST') {
      const me = await getCurrentUser(request);
      const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
      const { action, reason } = await readBody(request);
      const col = await getCollection('reviews');
      const rec = await col.findOne({ id: m[1] });
      if (!rec) return err('Review not found', 404);
      let update = { updatedAt: new Date(), moderatedBy: me.id, moderatedByName: me.name || me.email };
      if (action === 'approve') update = { ...update, moderationStatus: 'approved', hidden: false };
      else if (action === 'reject') update = { ...update, moderationStatus: 'rejected', hidden: true };
      else if (action === 'hide') update = { ...update, hidden: true };
      else if (action === 'restore') update = { ...update, hidden: false, moderationStatus: 'approved' };
      else if (action === 'delete') {
        await col.deleteOne({ id: m[1] });
        m12LogFinanceAudit(me, 'review_moderation_delete', { reviewId: m[1], listingId: rec.listingId, reason }).catch(() => {});
        return ok({ deleted: true });
      } else return err('Invalid action');
      if (reason) update.moderationReason = reason;
      await col.updateOne({ id: m[1] }, { $set: update });
      m12LogFinanceAudit(me, `review_moderation_${action}`, { reviewId: m[1], listingId: rec.listingId, reason }).catch(() => {});
      return ok({ review: { ...rec, ...update } });
    }
  }

  // GET/PUT /api/admin/review-settings
  if (path === '/admin/review-settings' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    return ok({ settings: await m15GetSettings() });
  }
  if (path === '/admin/review-settings' && method === 'PUT') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const body = await readBody(request);
    const existing = await m15GetSettings();
    const merged = { ...existing, ...body, id: 'default', badgeThresholds: { ...existing.badgeThresholds, ...(body.badgeThresholds || {}) }, updatedAt: new Date(), updatedBy: me.id };
    const col = await getCollection('reviewSettings');
    await col.updateOne({ id: 'default' }, { $set: merged }, { upsert: true });
    m12LogFinanceAudit(me, 'review_settings_updated', { previous: existing, new: merged }).catch(() => {});
    return ok({ settings: merged });
  }

  // ============================================================================
  // MODULE 16 — Dynamic Pricing, Availability & Inventory Engine
  // ============================================================================
  // Collections used (all created lazily):
  //   listingPricingRules      { id, listingId, name, type, active, priority, adjustment: {mode:'percent'|'fixed', value}, conditions: {days:[], dateFrom, dateTo, minNights, maxNights, minAdvanceDays, maxAdvanceDays, occupancyGte, occupancyLte}, createdAt }
  //   listingBlackouts         { id, listingId, from, to, reason, note }
  //   waitlist                 { id, listingId, userId, userName, checkInDate, checkOutDate, guests, status, createdAt }
  //   holidayCalendar          { id, date, name, region, multiplier }
  //   pricingSettings          { id:'default', maxDiscountPct, maxIncreasePct, minBookingFee, maxBookingFee, dynamicEnabled, waitlistEnabled, demandMultiplier, festivalMultiplier, aiSuggestionsEnabled, ruleStackMode }

  const M16_DEFAULTS = {
    id: 'default',
    maxDiscountPct: 50,
    maxIncreasePct: 100,
    minBookingFee: 0,
    maxBookingFee: 500,
    dynamicEnabled: true,
    waitlistEnabled: true,
    demandMultiplier: 1.15,
    festivalMultiplier: 1.25,
    aiSuggestionsEnabled: true,
    ruleStackMode: 'combined', // 'combined' | 'highest'
  };

  const m16GetSettings = async () => {
    const col = await getCollection('pricingSettings');
    let doc = await col.findOne({ id: 'default' }, { projection: { _id: 0 } });
    if (!doc) { doc = { ...M16_DEFAULTS, createdAt: new Date(), updatedAt: new Date() }; try { await col.insertOne({ ...doc }); } catch {} }
    return { ...M16_DEFAULTS, ...doc };
  };

  // Utility: for a given check-in/out, and a listing, compute the effective price
  // by applying active pricing rules + blackouts.
  const m16IsWeekend = (d) => { const n = new Date(d).getDay(); return n === 0 || n === 5 || n === 6; };
  const m16ApplyRules = (basePrice, checkIn, checkOut, listing, rules, settings, occupancy = 0) => {
    const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000));
    const advanceDays = Math.max(0, Math.round((new Date(checkIn) - new Date()) / 86400000));
    const applied = [];
    let total = 0;
    // Compute per-night, then apply per-night rules and daily adjustments
    for (let i = 0; i < nights; i++) {
      const d = new Date(checkIn); d.setDate(d.getDate() + i);
      let nightly = basePrice;
      let adjPct = 0, adjFixed = 0;
      let ruleHits = [];
      for (const r of rules) {
        if (!r.active) continue;
        const c = r.conditions || {};
        if (Array.isArray(c.days) && c.days.length && !c.days.includes(d.getDay())) continue;
        if (c.dateFrom && new Date(c.dateFrom) > d) continue;
        if (c.dateTo && new Date(c.dateTo) < d) continue;
        if (c.minNights && nights < c.minNights) continue;
        if (c.maxNights && nights > c.maxNights) continue;
        if (c.minAdvanceDays != null && advanceDays < c.minAdvanceDays) continue;
        if (c.maxAdvanceDays != null && advanceDays > c.maxAdvanceDays) continue;
        if (c.weekendOnly && !m16IsWeekend(d)) continue;
        if (c.occupancyGte != null && occupancy < c.occupancyGte) continue;
        if (c.occupancyLte != null && occupancy > c.occupancyLte) continue;
        // Apply
        if (r.adjustment?.mode === 'percent') adjPct += Number(r.adjustment.value) || 0;
        else if (r.adjustment?.mode === 'fixed') adjFixed += Number(r.adjustment.value) || 0;
        ruleHits.push({ id: r.id, name: r.name });
      }
      // Clamp with global caps
      adjPct = Math.max(-Math.abs(settings.maxDiscountPct), Math.min(settings.maxIncreasePct, adjPct));
      nightly = Math.max(0, Math.round(nightly * (1 + adjPct / 100) + adjFixed));
      total += nightly;
      if (ruleHits.length) applied.push({ date: d.toISOString().slice(0, 10), rules: ruleHits, nightly, adjPct, adjFixed });
    }
    const baseTotal = basePrice * nights;
    const discount = Math.max(0, baseTotal - total);
    const surcharge = Math.max(0, total - baseTotal);
    return { total, nights, basePrice, baseTotal, discount, surcharge, applied };
  };

  const m16LoadRules = async (listingId) => {
    const col = await getCollection('listingPricingRules');
    return await col.find({ listingId }, { projection: { _id: 0 } }).sort({ priority: 1, createdAt: 1 }).toArray();
  };

  const m16LoadBlackouts = async (listingId) => {
    const col = await getCollection('listingBlackouts');
    return await col.find({ listingId }, { projection: { _id: 0 } }).toArray();
  };

  const m16IsBlackedOut = (d, blackouts) => {
    const t = new Date(d).setHours(0, 0, 0, 0);
    return blackouts.some((b) => t >= new Date(b.from).setHours(0, 0, 0, 0) && t <= new Date(b.to).setHours(0, 0, 0, 0));
  };

  // -------- PUBLIC: price calculator --------

  // GET /api/listings/:id/price?checkInDate=&checkOutDate=&inventoryTypeId=
  {
    const m = path.match(/^\/listings\/([^/]+)\/price$/);
    if (m && method === 'GET') {
      const url = new URL(request.url);
      const checkIn = url.searchParams.get('checkInDate');
      const checkOut = url.searchParams.get('checkOutDate');
      const invTypeId = url.searchParams.get('inventoryTypeId');
      if (!checkIn || !checkOut) return err('checkInDate and checkOutDate required');
      const listings = await getCollection('listings');
      const listing = await listings.findOne({ id: m[1] }, { projection: { _id: 0 } });
      if (!listing) return err('Listing not found', 404);
      let basePrice = Number(listing.price) || 0;
      if (invTypeId && listing.inventoryTypes) {
        const t = listing.inventoryTypes.find((x) => x.id === invTypeId);
        if (t) basePrice = Number(t.price) || basePrice;
      }
      const [rules, blackouts, settings] = await Promise.all([m16LoadRules(m[1]), m16LoadBlackouts(m[1]), m16GetSettings()]);
      // Reject if any date is blacked out
      const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000));
      for (let i = 0; i < nights; i++) {
        const d = new Date(checkIn); d.setDate(d.getDate() + i);
        if (m16IsBlackedOut(d, blackouts)) return err('Selected dates include blocked/unavailable days', 400);
      }
      // Approximate occupancy for this listing
      const bookings = await (await getCollection('bookings')).countDocuments({ listingId: m[1], status: 'approved' });
      const invSum = (listing.inventoryTypes || []).reduce((s, t) => s + (Number(t.available) || 0) + (Number(t.booked) || 0), Number(listing.totalInventory) || 1);
      const occupancy = invSum ? Math.min(100, (bookings / invSum) * 100) : 0;
      const result = m16ApplyRules(basePrice, checkIn, checkOut, listing, rules, settings, occupancy);
      return ok({ ...result, currency: 'INR', occupancy: +occupancy.toFixed(1), rulesConsidered: rules.length });
    }
  }

  // GET /api/listings/:id/calendar?month=YYYY-MM  (public availability calendar with per-day price + status)
  {
    const m = path.match(/^\/listings\/([^/]+)\/calendar$/);
    if (m && method === 'GET') {
      const url = new URL(request.url);
      const monthStr = url.searchParams.get('month'); // e.g. 2025-07
      const now = new Date();
      const [y, mo] = (monthStr || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`).split('-').map(Number);
      const startD = new Date(y, (mo || 1) - 1, 1);
      const endD = new Date(y, mo, 0); // last day of month
      const listings = await getCollection('listings');
      const listing = await listings.findOne({ id: m[1] }, { projection: { _id: 0 } });
      if (!listing) return err('Listing not found', 404);
      const [rules, blackouts, settings, bookings] = await Promise.all([
        m16LoadRules(m[1]),
        m16LoadBlackouts(m[1]),
        m16GetSettings(),
        (await getCollection('bookings')).find({ listingId: m[1], status: { $in: ['approved', 'pending'] }, checkOutDate: { $gte: startD }, checkInDate: { $lte: endD } }, { projection: { _id: 0, checkInDate: 1, checkOutDate: 1, inventoryTypeId: 1 } }).toArray(),
      ]);
      const invSum = (listing.inventoryTypes || []).reduce((s, t) => s + (Number(t.available) || 0) + (Number(t.booked) || 0), Number(listing.totalInventory) || 1);
      const basePrice = Number(listing.price) || 0;
      const days = [];
      for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        const dayEnd = new Date(d); dayEnd.setDate(dayEnd.getDate() + 1);
        const bookedOnDay = bookings.filter((b) => new Date(b.checkInDate) < dayEnd && new Date(b.checkOutDate) > d).length;
        const isBlackout = m16IsBlackedOut(d, blackouts);
        let status = 'available';
        if (isBlackout) status = 'blocked';
        else if (bookedOnDay >= invSum) status = 'soldout';
        else if (invSum > 1 && bookedOnDay >= Math.max(1, Math.floor(invSum * 0.8))) status = 'limited';
        // Per-day price
        const nextDay = new Date(d); nextDay.setDate(nextDay.getDate() + 1);
        const priceInfo = m16ApplyRules(basePrice, d.toISOString(), nextDay.toISOString(), listing, rules, settings, invSum ? (bookedOnDay / invSum) * 100 : 0);
        days.push({ date: dateStr, status, price: priceInfo.total, booked: bookedOnDay, capacity: invSum, applied: priceInfo.applied[0]?.rules || [] });
      }
      return ok({ month: `${y}-${String(mo).padStart(2, '0')}`, days, capacity: invSum, blackouts, rules });
    }
  }

  // -------- HOST: pricing rules --------

  // GET /api/host/listings/:id/rules
  // POST /api/host/listings/:id/rules
  {
    const mList = path.match(/^\/host\/listings\/([^/]+)\/rules$/);
    if (mList) {
      const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
      const listing = await (await getCollection('listings')).findOne({ id: mList[1] });
      if (!listing) return err('Listing not found', 404);
      const isOwnerOrAdmin = listing.hostId === me.id || ['admin', 'super_admin'].includes(me.role);
      if (!isOwnerOrAdmin) return err('Forbidden', 403);
      const col = await getCollection('listingPricingRules');
      if (method === 'GET') {
        const rules = await col.find({ listingId: mList[1] }, { projection: { _id: 0 } }).sort({ priority: 1, createdAt: 1 }).toArray();
        return ok({ rules });
      }
      if (method === 'POST') {
        const b = await readBody(request);
        const settings = await m16GetSettings();
        const rule = {
          id: uuid(),
          listingId: mList[1],
          hostId: listing.hostId,
          name: String(b.name || 'Custom rule').slice(0, 80),
          type: b.type || 'custom', // weekend, season, holiday, last_minute, advance, long_stay, custom
          active: b.active !== false,
          priority: Number(b.priority) || 100,
          adjustment: {
            mode: b.adjustment?.mode === 'fixed' ? 'fixed' : 'percent',
            value: Math.max(-settings.maxDiscountPct, Math.min(settings.maxIncreasePct, Number(b.adjustment?.value) || 0)),
          },
          conditions: b.conditions || {},
          createdAt: new Date(), updatedAt: new Date(),
        };
        await col.insertOne(rule);
        m12LogFinanceAudit(me, 'pricing_rule_created', { listingId: mList[1], ruleId: rule.id, rule }).catch(() => {});
        return ok({ rule }, 201);
      }
    }
  }
  // PUT/DELETE /api/host/listings/:id/rules/:ruleId
  {
    const mR = path.match(/^\/host\/listings\/([^/]+)\/rules\/([^/]+)$/);
    if (mR) {
      const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
      const listing = await (await getCollection('listings')).findOne({ id: mR[1] });
      if (!listing) return err('Listing not found', 404);
      if (listing.hostId !== me.id && !['admin', 'super_admin'].includes(me.role)) return err('Forbidden', 403);
      const col = await getCollection('listingPricingRules');
      if (method === 'PUT') {
        const b = await readBody(request);
        const settings = await m16GetSettings();
        const patch = { updatedAt: new Date() };
        if (b.name !== undefined) patch.name = String(b.name).slice(0, 80);
        if (b.active !== undefined) patch.active = !!b.active;
        if (b.priority !== undefined) patch.priority = Number(b.priority);
        if (b.type !== undefined) patch.type = b.type;
        if (b.conditions !== undefined) patch.conditions = b.conditions;
        if (b.adjustment !== undefined) patch.adjustment = {
          mode: b.adjustment.mode === 'fixed' ? 'fixed' : 'percent',
          value: Math.max(-settings.maxDiscountPct, Math.min(settings.maxIncreasePct, Number(b.adjustment.value) || 0)),
        };
        await col.updateOne({ id: mR[2], listingId: mR[1] }, { $set: patch });
        m12LogFinanceAudit(me, 'pricing_rule_updated', { listingId: mR[1], ruleId: mR[2], patch }).catch(() => {});
        const fresh = await col.findOne({ id: mR[2] }, { projection: { _id: 0 } });
        return ok({ rule: fresh });
      }
      if (method === 'DELETE') {
        await col.deleteOne({ id: mR[2], listingId: mR[1] });
        m12LogFinanceAudit(me, 'pricing_rule_deleted', { listingId: mR[1], ruleId: mR[2] }).catch(() => {});
        return ok({ deleted: true });
      }
    }
  }

  // -------- HOST: blackouts --------
  {
    const mB = path.match(/^\/host\/listings\/([^/]+)\/blackouts$/);
    if (mB) {
      const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
      const listing = await (await getCollection('listings')).findOne({ id: mB[1] });
      if (!listing) return err('Listing not found', 404);
      if (listing.hostId !== me.id && !['admin', 'super_admin'].includes(me.role)) return err('Forbidden', 403);
      const col = await getCollection('listingBlackouts');
      if (method === 'GET') {
        const list = await col.find({ listingId: mB[1] }, { projection: { _id: 0 } }).sort({ from: 1 }).toArray();
        return ok({ blackouts: list });
      }
      if (method === 'POST') {
        const b = await readBody(request);
        if (!b.from || !b.to) return err('from and to required');
        const bl = {
          id: uuid(), listingId: mB[1], hostId: listing.hostId,
          from: new Date(b.from), to: new Date(b.to),
          reason: b.reason || 'blocked', note: (b.note || '').slice(0, 500),
          createdAt: new Date(),
        };
        await col.insertOne(bl);
        m12LogFinanceAudit(me, 'blackout_added', { listingId: mB[1], blackoutId: bl.id, from: bl.from, to: bl.to, reason: bl.reason }).catch(() => {});
        return ok({ blackout: bl }, 201);
      }
    }
    const mBD = path.match(/^\/host\/listings\/([^/]+)\/blackouts\/([^/]+)$/);
    if (mBD && method === 'DELETE') {
      const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
      const listing = await (await getCollection('listings')).findOne({ id: mBD[1] });
      if (!listing) return err('Listing not found', 404);
      if (listing.hostId !== me.id && !['admin', 'super_admin'].includes(me.role)) return err('Forbidden', 403);
      const col = await getCollection('listingBlackouts');
      await col.deleteOne({ id: mBD[2], listingId: mBD[1] });
      m12LogFinanceAudit(me, 'blackout_removed', { listingId: mBD[1], blackoutId: mBD[2] }).catch(() => {});
      return ok({ deleted: true });
    }
  }

  // -------- HOST: bulk inventory update --------
  // POST /api/host/listings/:id/inventory-bulk  { typeId, delta, absolute }
  {
    const mI = path.match(/^\/host\/listings\/([^/]+)\/inventory-bulk$/);
    if (mI && method === 'POST') {
      const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
      const listing = await (await getCollection('listings')).findOne({ id: mI[1] });
      if (!listing) return err('Listing not found', 404);
      if (listing.hostId !== me.id && !['admin', 'super_admin'].includes(me.role)) return err('Forbidden', 403);
      const b = await readBody(request);
      const listings = await getCollection('listings');
      let updated;
      if (b.typeId) {
        // Update specific inventory type
        const type = (listing.inventoryTypes || []).find((t) => t.id === b.typeId);
        if (!type) return err('Inventory type not found', 404);
        const current = Number(type.available) || 0;
        let next = b.absolute != null ? Number(b.absolute) : current + Number(b.delta || 0);
        next = Math.max(0, next); // prevent negative
        await listings.updateOne({ id: mI[1], 'inventoryTypes.id': b.typeId }, { $set: { 'inventoryTypes.$.available': next, 'inventoryTypes.$.updatedAt': new Date() } });
        updated = { typeId: b.typeId, previous: current, next };
      } else {
        const current = Number(listing.totalInventory) || 0;
        let next = b.absolute != null ? Number(b.absolute) : current + Number(b.delta || 0);
        next = Math.max(0, next);
        await listings.updateOne({ id: mI[1] }, { $set: { totalInventory: next, updatedAt: new Date() } });
        updated = { previous: current, next };
      }
      m12LogFinanceAudit(me, 'inventory_bulk_updated', { listingId: mI[1], ...updated }).catch(() => {});
      return ok({ updated });
    }
  }

  // -------- WAITLIST --------
  // POST /api/listings/:id/waitlist
  {
    const mW = path.match(/^\/listings\/([^/]+)\/waitlist$/);
    if (mW && method === 'POST') {
      const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
      const settings = await m16GetSettings();
      if (!settings.waitlistEnabled) return err('Waitlist not enabled', 400);
      const b = await readBody(request);
      const col = await getCollection('waitlist');
      const existing = await col.findOne({ listingId: mW[1], userId: me.id, status: 'waiting' });
      if (existing) return err('You are already on the waitlist for this listing');
      const entry = {
        id: uuid(),
        listingId: mW[1],
        userId: me.id, userName: me.name || me.email,
        checkInDate: b.checkInDate ? new Date(b.checkInDate) : null,
        checkOutDate: b.checkOutDate ? new Date(b.checkOutDate) : null,
        guests: Number(b.guests) || 1,
        status: 'waiting',
        expiresAt: new Date(Date.now() + 30 * 86400000),
        createdAt: new Date(),
      };
      await col.insertOne(entry);
      // Notify host
      const listing = await (await getCollection('listings')).findOne({ id: mW[1] }, { projection: { hostId: 1, title: 1, _id: 0 } });
      if (listing?.hostId) mkNotif({ userId: listing.hostId, type: 'waitlist_joined', category: 'booking', title: 'A traveler joined the waitlist', body: `${me.name} for ${listing.title}`, link: `/dashboard/host/inventory?listing=${mW[1]}`, meta: { listingId: mW[1] } }).catch(() => {});
      return ok({ entry }, 201);
    }
  }
  // GET /api/host/listings/:id/waitlist
  {
    const mW = path.match(/^\/host\/listings\/([^/]+)\/waitlist$/);
    if (mW && method === 'GET') {
      const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
      const listing = await (await getCollection('listings')).findOne({ id: mW[1] });
      if (!listing) return err('Listing not found', 404);
      if (listing.hostId !== me.id && !['admin', 'super_admin'].includes(me.role)) return err('Forbidden', 403);
      const list = await (await getCollection('waitlist')).find({ listingId: mW[1] }, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray();
      return ok({ waitlist: list });
    }
  }
  // POST /api/host/waitlist/:id/action { action: approve|reject }
  {
    const mA = path.match(/^\/host\/waitlist\/([^/]+)\/action$/);
    if (mA && method === 'POST') {
      const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
      const { action } = await readBody(request);
      const col = await getCollection('waitlist');
      const rec = await col.findOne({ id: mA[1] });
      if (!rec) return err('Waitlist entry not found', 404);
      const listing = await (await getCollection('listings')).findOne({ id: rec.listingId });
      if (!listing) return err('Listing not found', 404);
      if (listing.hostId !== me.id && !['admin', 'super_admin'].includes(me.role)) return err('Forbidden', 403);
      const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : null;
      if (!status) return err('Invalid action');
      await col.updateOne({ id: mA[1] }, { $set: { status, processedAt: new Date(), processedBy: me.id } });
      mkNotif({ userId: rec.userId, type: `waitlist_${status}`, category: 'booking', title: status === 'approved' ? 'Waitlist approved!' : 'Waitlist entry closed', body: `${listing.title} — ${status === 'approved' ? 'You may now book. Spot available!' : 'Unfortunately no spot opened up.'}`, link: `/listing/${rec.listingId}` }).catch(() => {});
      return ok({ updated: true });
    }
  }

  // -------- ADMIN: pricing settings + holidays --------
  if (path === '/admin/pricing-settings' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    return ok({ settings: await m16GetSettings() });
  }
  if (path === '/admin/pricing-settings' && method === 'PUT') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const body = await readBody(request);
    const existing = await m16GetSettings();
    const merged = { ...existing, ...body, id: 'default', updatedAt: new Date(), updatedBy: me.id };
    const col = await getCollection('pricingSettings');
    await col.updateOne({ id: 'default' }, { $set: merged }, { upsert: true });
    m12LogFinanceAudit(me, 'pricing_settings_updated', { previous: existing, new: merged }).catch(() => {});
    return ok({ settings: merged });
  }

  // GET/POST /api/admin/holidays
  if (path === '/admin/holidays' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const col = await getCollection('holidayCalendar');
    const list = await col.find({}, { projection: { _id: 0 } }).sort({ date: 1 }).toArray();
    return ok({ holidays: list });
  }
  if (path === '/admin/holidays' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const body = await readBody(request);
    if (!body.date || !body.name) return err('date and name required');
    const doc = { id: uuid(), date: new Date(body.date), name: String(body.name).slice(0, 100), region: body.region || 'IN', multiplier: Number(body.multiplier) || 1.25, createdAt: new Date() };
    await (await getCollection('holidayCalendar')).insertOne(doc);
    m12LogFinanceAudit(me, 'holiday_added', doc).catch(() => {});
    return ok({ holiday: doc }, 201);
  }
  {
    const mH = path.match(/^\/admin\/holidays\/([^/]+)$/);
    if (mH && method === 'DELETE') {
      const me = await getCurrentUser(request);
      const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
      await (await getCollection('holidayCalendar')).deleteOne({ id: mH[1] });
      m12LogFinanceAudit(me, 'holiday_removed', { id: mH[1] }).catch(() => {});
      return ok({ deleted: true });
    }
  }

  // GET /api/admin/pricing/occupancy — occupancy across all listings
  if (path === '/admin/pricing/occupancy' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const [listings, bookings] = await Promise.all([
      (await getCollection('listings')).find({}, { projection: { _id: 0, id: 1, title: 1, hostId: 1, price: 1, inventoryTypes: 1, totalInventory: 1, category: 1 } }).toArray(),
      (await getCollection('bookings')).find({ status: 'approved' }, { projection: { _id: 0, listingId: 1, totalPrice: 1, checkInDate: 1, checkOutDate: 1 } }).toArray(),
    ]);
    const bookingsByListing = {};
    bookings.forEach((b) => { if (!b.listingId) return; bookingsByListing[b.listingId] = bookingsByListing[b.listingId] || []; bookingsByListing[b.listingId].push(b); });
    const rows = listings.map((l) => {
      const bl = bookingsByListing[l.id] || [];
      const inv = (l.inventoryTypes || []).reduce((s, t) => s + (Number(t.available) || 0) + (Number(t.booked) || 0), Number(l.totalInventory) || 1);
      const roomNights = bl.reduce((s, b) => s + Math.max(1, Math.round((new Date(b.checkOutDate) - new Date(b.checkInDate)) / 86400000)), 0);
      const revenue = bl.reduce((s, b) => s + (Number(b.totalPrice) || 0), 0);
      // Occupancy over trailing 30 days
      const capacity30 = inv * 30;
      const nowMinus30 = Date.now() - 30 * 86400000;
      const trailingNights = bl.filter((b) => new Date(b.checkOutDate).getTime() > nowMinus30).reduce((s, b) => s + Math.max(1, Math.round((new Date(b.checkOutDate) - new Date(b.checkInDate)) / 86400000)), 0);
      const occupancyPct = capacity30 ? (trailingNights / capacity30) * 100 : 0;
      const adr = roomNights ? Math.round(revenue / roomNights) : 0;
      return {
        listingId: l.id, title: l.title, category: l.category, hostId: l.hostId,
        capacity: inv, bookings: bl.length, roomNights, revenue,
        occupancyPct: +occupancyPct.toFixed(1),
        adr, // Average Daily Rate
        revPar: inv ? +(revenue / (inv * 30)).toFixed(0) : 0, // Revenue per available room (30d)
      };
    });
    const sorted = rows.sort((a, b) => b.occupancyPct - a.occupancyPct);
    return ok({ listings: sorted, mostOccupied: sorted.slice(0, 10), lowestOccupied: [...sorted].sort((a, b) => a.occupancyPct - b.occupancyPct).slice(0, 10) });
  }

  // GET /api/admin/pricing/waitlists
  if (path === '/admin/pricing/waitlists' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const list = await (await getCollection('waitlist')).find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(200).toArray();
    return ok({ waitlist: list });
  }

  // GET /api/host/listings — quick list for the host inventory picker
  if (path === '/host/listings' && method === 'GET') {
    const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
    const listings = await (await getCollection('listings')).find({ hostId: me.id }, { projection: { _id: 0, id: 1, title: 1, category: 1, price: 1, images: 1, status: 1, inventoryTypes: 1, totalInventory: 1 } }).toArray();
    return ok({ listings });
  }

  // GET /api/ai/pricing-suggestions?listingId=  — heuristic (no LLM call)
  if (path === '/ai/pricing-suggestions' && method === 'GET') {
    const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
    const url = new URL(request.url);
    const listingId = url.searchParams.get('listingId');
    if (!listingId) return err('listingId required');
    const listing = await (await getCollection('listings')).findOne({ id: listingId });
    if (!listing) return err('Listing not found', 404);
    if (listing.hostId !== me.id && !['admin', 'super_admin'].includes(me.role)) return err('Forbidden', 403);
    const settings = await m16GetSettings();
    if (!settings.aiSuggestionsEnabled) return ok({ suggestions: [] });
    const bookings = await (await getCollection('bookings')).find({ listingId, status: 'approved' }).toArray();
    const inv = (listing.inventoryTypes || []).reduce((s, t) => s + (Number(t.available) || 0) + (Number(t.booked) || 0), Number(listing.totalInventory) || 1);
    const nowMinus30 = Date.now() - 30 * 86400000;
    const trailingNights = bookings.filter((b) => new Date(b.checkOutDate).getTime() > nowMinus30).reduce((s, b) => s + Math.max(1, Math.round((new Date(b.checkOutDate) - new Date(b.checkInDate)) / 86400000)), 0);
    const occ = inv ? (trailingNights / (inv * 30)) * 100 : 0;
    const suggestions = [];
    if (occ < 30) suggestions.push({ title: 'Occupancy too low', body: 'Occupancy is under 30% in the last 30 days. Consider a limited-time discount of 10–15% to attract bookings.', suggestedAdjPct: -12, type: 'occupancy_low' });
    if (occ > 80) suggestions.push({ title: 'High demand', body: 'Occupancy above 80% — you can safely raise weekend prices by 10–15%.', suggestedAdjPct: 12, type: 'demand_high' });
    suggestions.push({ title: 'Weekend Premium', body: 'Fri–Sun typically see higher demand. Try +10% weekend uplift.', suggestedAdjPct: 10, type: 'weekend' });
    // Holidays in next 60 days
    const holidays = await (await getCollection('holidayCalendar')).find({ date: { $gte: new Date(), $lte: new Date(Date.now() + 60 * 86400000) } }).toArray();
    if (holidays.length) suggestions.push({ title: 'Festival surge', body: `Upcoming: ${holidays.slice(0, 3).map((h) => h.name).join(', ')}. Recommended +25% for these dates.`, suggestedAdjPct: 25, type: 'holiday' });
    return ok({ suggestions, occupancyPct: +occ.toFixed(1) });
  }

  // ============================================================================
  // MODULE 17 — Communication, Support & Customer Success
  // ============================================================================

  // ---- USER SUPPORT TICKETS ----

  // POST /api/support/tickets — any authenticated user creates a ticket
  if (path === '/support/tickets' && method === 'POST') {
    const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
    const b = await readBody(request);
    if (!b.subject || !b.message) return err('subject and message are required');
    const validCat = ['booking', 'payment', 'wallet', 'refund', 'host', 'traveler', 'listing', 'technical', 'general'];
    const validPri = ['low', 'medium', 'high', 'urgent'];
    const tickets = await getCollection('supportTickets');
    const ticket = {
      id: uuid(),
      ticketNumber: `TKT${Date.now().toString().slice(-8)}`,
      userId: me.id, userName: me.name || me.email, userEmail: me.email, userRole: me.role,
      subject: String(b.subject).slice(0, 200),
      category: validCat.includes(b.category) ? b.category : 'general',
      priority: validPri.includes(b.priority) ? b.priority : 'medium',
      status: 'open',
      bookingId: b.bookingId || null,
      listingId: b.listingId || null,
      attachments: Array.isArray(b.attachments) ? b.attachments.slice(0, 5) : [],
      assignedTo: null, assignedToName: null,
      internalNotes: [],
      conversation: [{
        from: 'user', message: String(b.message).slice(0, 5000), timestamp: new Date(),
        userId: me.id, userName: me.name,
        attachments: b.attachments || [],
      }],
      createdAt: new Date(), updatedAt: new Date(),
      firstResponseAt: null, resolvedAt: null,
      ratingResolution: null, ratingSupport: null,
    };
    await tickets.insertOne(ticket);
    m12LogFinanceAudit(me, 'support_ticket_created', { ticketId: ticket.id, category: ticket.category, priority: ticket.priority }).catch(() => {});
    // Notify all admins
    try {
      const admins = await (await getCollection('users')).find({ role: { $in: ['admin', 'super_admin'] } }, { projection: { id: 1, _id: 0 } }).toArray();
      admins.forEach((a) => mkNotif({ userId: a.id, type: 'support_ticket_created', category: 'support', title: `New ${ticket.priority} ticket · ${ticket.ticketNumber}`, body: ticket.subject, link: `/admin/support?ticket=${ticket.id}`, meta: { ticketId: ticket.id } }).catch(() => {}));
    } catch {}
    return ok({ ticket }, 201);
  }

  // GET /api/support/tickets — list mine (or all if admin)
  if (path === '/support/tickets' && method === 'GET') {
    const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const isAdmin = ['admin', 'super_admin'].includes(me.role);
    const q = isAdmin ? {} : { userId: me.id };
    if (status) q.status = status;
    const list = await (await getCollection('supportTickets')).find(q, { projection: { _id: 0, internalNotes: 0 } }).sort({ updatedAt: -1 }).limit(200).toArray();
    return ok({ tickets: list });
  }

  // GET /api/support/tickets/:id
  {
    const m = path.match(/^\/support\/tickets\/([^/]+)$/);
    if (m && method === 'GET') {
      const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
      const tickets = await getCollection('supportTickets');
      const rec = await tickets.findOne({ id: m[1] }, { projection: { _id: 0 } });
      if (!rec) return err('Ticket not found', 404);
      const isAdmin = ['admin', 'super_admin'].includes(me.role);
      if (!isAdmin && rec.userId !== me.id) return err('Forbidden', 403);
      // Strip internal notes from user view
      if (!isAdmin) delete rec.internalNotes;
      return ok({ ticket: rec });
    }
  }

  // POST /api/support/tickets/:id/reply — user OR admin reply
  {
    const m = path.match(/^\/support\/tickets\/([^/]+)\/reply$/);
    if (m && method === 'POST') {
      const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
      const tickets = await getCollection('supportTickets');
      const rec = await tickets.findOne({ id: m[1] });
      if (!rec) return err('Ticket not found', 404);
      const isAdmin = ['admin', 'super_admin'].includes(me.role);
      if (!isAdmin && rec.userId !== me.id) return err('Forbidden', 403);
      const { message, attachments } = await readBody(request);
      if (!message) return err('message required');
      const entry = {
        from: isAdmin ? 'admin' : 'user',
        message: String(message).slice(0, 5000),
        timestamp: new Date(),
        userId: me.id, userName: me.name, adminId: isAdmin ? me.id : undefined, adminName: isAdmin ? me.name : undefined,
        attachments: Array.isArray(attachments) ? attachments.slice(0, 5) : [],
      };
      const set = { updatedAt: new Date() };
      if (isAdmin && !rec.firstResponseAt) set.firstResponseAt = new Date();
      if (isAdmin && rec.status === 'open') set.status = 'in_progress';
      if (!isAdmin && rec.status === 'waiting') set.status = 'in_progress';
      await tickets.updateOne({ id: m[1] }, { $push: { conversation: entry }, $set: set });
      // Notify counterparty
      if (isAdmin) {
        mkNotif({ userId: rec.userId, type: 'support_reply', category: 'support', title: `Reply on ${rec.ticketNumber}`, body: String(message).slice(0, 140), link: `/dashboard/traveler/support?ticket=${m[1]}`, meta: { ticketId: m[1] } }).catch(() => {});
      } else if (rec.assignedTo) {
        mkNotif({ userId: rec.assignedTo, type: 'support_reply', category: 'support', title: `User replied to ${rec.ticketNumber}`, body: String(message).slice(0, 140), link: `/admin/support?ticket=${m[1]}`, meta: { ticketId: m[1] } }).catch(() => {});
      }
      return ok({ replied: true });
    }
  }

  // POST /api/support/tickets/:id/status — user close, admin resolve/close/reopen
  {
    const m = path.match(/^\/support\/tickets\/([^/]+)\/status$/);
    if (m && method === 'POST') {
      const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
      const tickets = await getCollection('supportTickets');
      const rec = await tickets.findOne({ id: m[1] });
      if (!rec) return err('Ticket not found', 404);
      const isAdmin = ['admin', 'super_admin'].includes(me.role);
      if (!isAdmin && rec.userId !== me.id) return err('Forbidden', 403);
      const { status, reason } = await readBody(request);
      const allowed = ['open', 'in_progress', 'waiting', 'resolved', 'closed'];
      if (!allowed.includes(status)) return err('Invalid status');
      const set = { status, updatedAt: new Date() };
      if (status === 'resolved') set.resolvedAt = new Date();
      if (reason) set.statusReason = reason;
      await tickets.updateOne({ id: m[1] }, { $set: set });
      m12LogFinanceAudit(me, 'support_ticket_status_changed', { ticketId: m[1], previous: rec.status, new: status }).catch(() => {});
      if (status === 'resolved') {
        mkNotif({ userId: rec.userId, type: 'support_resolved', category: 'support', title: `${rec.ticketNumber} resolved`, body: 'Please rate your experience', link: `/dashboard/traveler/support?ticket=${m[1]}` }).catch(() => {});
      }
      return ok({ status });
    }
  }

  // POST /api/support/tickets/:id/rate — user rates resolution
  {
    const m = path.match(/^\/support\/tickets\/([^/]+)\/rate$/);
    if (m && method === 'POST') {
      const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
      const tickets = await getCollection('supportTickets');
      const rec = await tickets.findOne({ id: m[1] });
      if (!rec) return err('Ticket not found', 404);
      if (rec.userId !== me.id) return err('Forbidden', 403);
      const { resolution, support, comment } = await readBody(request);
      await tickets.updateOne({ id: m[1] }, { $set: {
        ratingResolution: Number(resolution) || null,
        ratingSupport: Number(support) || null,
        ratingComment: (comment || '').slice(0, 500),
        ratedAt: new Date(),
        updatedAt: new Date(),
      } });
      return ok({ rated: true });
    }
  }

  // ---- ADMIN CRM enhancements ----

  // POST /api/admin/tickets/:id/assign
  {
    const m = path.match(/^\/admin\/tickets\/([^/]+)\/assign$/);
    if (m && method === 'POST') {
      const me = await getCurrentUser(request);
      const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
      const { assigneeId } = await readBody(request);
      const users = await getCollection('users');
      const assignee = assigneeId ? await users.findOne({ id: assigneeId }, { projection: { _id: 0, id: 1, name: 1 } }) : null;
      await (await getCollection('supportTickets')).updateOne({ id: m[1] }, { $set: { assignedTo: assignee?.id || null, assignedToName: assignee?.name || null, updatedAt: new Date() } });
      m12LogFinanceAudit(me, 'support_ticket_assigned', { ticketId: m[1], assigneeId: assignee?.id, assigneeName: assignee?.name }).catch(() => {});
      return ok({ assigned: true });
    }
  }

  // POST /api/admin/tickets/:id/note — internal note
  {
    const m = path.match(/^\/admin\/tickets\/([^/]+)\/note$/);
    if (m && method === 'POST') {
      const me = await getCurrentUser(request);
      const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
      const { note } = await readBody(request);
      if (!note) return err('note required');
      const entry = { id: uuid(), note: String(note).slice(0, 2000), adminId: me.id, adminName: me.name || me.email, createdAt: new Date() };
      await (await getCollection('supportTickets')).updateOne({ id: m[1] }, { $push: { internalNotes: entry }, $set: { updatedAt: new Date() } });
      return ok({ note: entry });
    }
  }

  // POST /api/admin/tickets/merge  { primaryId, mergeIds: [] }
  if (path === '/admin/tickets/merge' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const { primaryId, mergeIds } = await readBody(request);
    if (!primaryId || !Array.isArray(mergeIds) || mergeIds.length === 0) return err('primaryId and mergeIds required');
    const tickets = await getCollection('supportTickets');
    const primary = await tickets.findOne({ id: primaryId });
    if (!primary) return err('Primary ticket not found', 404);
    const merged = await tickets.find({ id: { $in: mergeIds } }).toArray();
    const allConv = [...(primary.conversation || [])];
    merged.forEach((t) => (t.conversation || []).forEach((c) => allConv.push({ ...c, mergedFrom: t.ticketNumber })));
    await tickets.updateOne({ id: primaryId }, { $set: { conversation: allConv.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)), updatedAt: new Date() } });
    await tickets.updateMany({ id: { $in: mergeIds } }, { $set: { status: 'merged', mergedInto: primaryId, updatedAt: new Date() } });
    m12LogFinanceAudit(me, 'support_tickets_merged', { primaryId, mergeIds }).catch(() => {});
    return ok({ merged: mergeIds.length });
  }

  // GET /api/admin/support/stats
  if (path === '/admin/support/stats' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const tickets = await (await getCollection('supportTickets')).find({}, { projection: { _id: 0 } }).toArray();
    const byStatus = {}, byCategory = {}, byPriority = {};
    let totalRespMs = 0, respCount = 0, totalResMs = 0, resCount = 0;
    let ratingSum = 0, ratingCount = 0;
    tickets.forEach((t) => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      if (t.firstResponseAt) { totalRespMs += new Date(t.firstResponseAt).getTime() - new Date(t.createdAt).getTime(); respCount += 1; }
      if (t.resolvedAt) { totalResMs += new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime(); resCount += 1; }
      if (t.ratingSupport) { ratingSum += t.ratingSupport; ratingCount += 1; }
    });
    return ok({
      total: tickets.length, byStatus, byCategory, byPriority,
      avgResponseTimeMin: respCount ? Math.round(totalRespMs / respCount / 60000) : 0,
      avgResolutionTimeHr: resCount ? +(totalResMs / resCount / 3600000).toFixed(1) : 0,
      avgSupportRating: ratingCount ? +(ratingSum / ratingCount).toFixed(2) : 0,
      totalRated: ratingCount,
    });
  }

  // ---- KNOWLEDGE BASE ----

  // GET /api/kb/articles  (public — published only)
  if (path === '/kb/articles' && method === 'GET') {
    const url = new URL(request.url);
    const cat = url.searchParams.get('category');
    const q = url.searchParams.get('q');
    const audience = url.searchParams.get('audience'); // host|traveler|admin
    const filter = { status: 'published' };
    if (cat) filter.category = cat;
    if (audience) filter.audience = { $in: [audience, 'all'] };
    let list = await (await getCollection('kbArticles')).find(filter, { projection: { _id: 0, body: 0 } }).sort({ updatedAt: -1 }).limit(200).toArray();
    if (q) {
      const needle = q.toLowerCase();
      list = list.filter((a) => (a.title || '').toLowerCase().includes(needle) || (a.excerpt || '').toLowerCase().includes(needle) || (a.tags || []).some((t) => t.toLowerCase().includes(needle)));
    }
    return ok({ articles: list });
  }

  // GET /api/kb/articles/:slug (public)
  {
    const m = path.match(/^\/kb\/articles\/([^/]+)$/);
    if (m && method === 'GET') {
      const col = await getCollection('kbArticles');
      const doc = await col.findOne({ slug: m[1], status: 'published' }, { projection: { _id: 0 } });
      if (!doc) return err('Article not found', 404);
      // Increment views (best-effort)
      col.updateOne({ id: doc.id }, { $inc: { views: 1 }, $set: { lastViewedAt: new Date() } }).catch(() => {});
      return ok({ article: { ...doc, views: (doc.views || 0) + 1 } });
    }
  }

  // GET/POST /api/admin/kb/articles
  if (path === '/admin/kb/articles' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const list = await (await getCollection('kbArticles')).find({}, { projection: { _id: 0 } }).sort({ updatedAt: -1 }).limit(500).toArray();
    return ok({ articles: list });
  }
  if (path === '/admin/kb/articles' && method === 'POST') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const b = await readBody(request);
    if (!b.title || !b.body) return err('title and body required');
    const slug = (b.slug || String(b.title)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100) + '-' + uuid().slice(0, 6);
    const doc = {
      id: uuid(), slug,
      title: String(b.title).slice(0, 200),
      body: String(b.body),
      excerpt: String(b.excerpt || b.body).slice(0, 300),
      category: b.category || 'general', // article, faq, guide, policy, host_guide, traveler_guide
      audience: b.audience || 'all',      // all, traveler, host, admin
      tags: Array.isArray(b.tags) ? b.tags.slice(0, 20) : [],
      images: Array.isArray(b.images) ? b.images.slice(0, 20) : [],
      videos: Array.isArray(b.videos) ? b.videos.slice(0, 10) : [],
      status: b.status === 'published' ? 'published' : 'draft',
      author: { id: me.id, name: me.name || me.email },
      views: 0,
      createdAt: new Date(), updatedAt: new Date(),
    };
    await (await getCollection('kbArticles')).insertOne(doc);
    m12LogFinanceAudit(me, 'kb_article_created', { id: doc.id, slug, title: doc.title }).catch(() => {});
    return ok({ article: doc }, 201);
  }
  {
    const m = path.match(/^\/admin\/kb\/articles\/([^/]+)$/);
    if (m) {
      const me = await getCurrentUser(request);
      const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
      const col = await getCollection('kbArticles');
      if (method === 'PUT') {
        const b = await readBody(request);
        const patch = { updatedAt: new Date() };
        ['title', 'body', 'excerpt', 'category', 'audience', 'tags', 'images', 'videos', 'status'].forEach((k) => {
          if (b[k] !== undefined) patch[k] = b[k];
        });
        await col.updateOne({ id: m[1] }, { $set: patch });
        m12LogFinanceAudit(me, 'kb_article_updated', { id: m[1], patch }).catch(() => {});
        const fresh = await col.findOne({ id: m[1] }, { projection: { _id: 0 } });
        return ok({ article: fresh });
      }
      if (method === 'DELETE') {
        await col.deleteOne({ id: m[1] });
        m12LogFinanceAudit(me, 'kb_article_deleted', { id: m[1] }).catch(() => {});
        return ok({ deleted: true });
      }
    }
  }

  // ---- FEEDBACK ----

  // POST /api/feedback
  if (path === '/feedback' && method === 'POST') {
    const me = await getCurrentUser(request);
    const b = await readBody(request);
    if (!b.message) return err('message required');
    const doc = {
      id: uuid(),
      type: ['bug', 'feature', 'suggestion', 'other'].includes(b.type) ? b.type : 'suggestion',
      subject: String(b.subject || '').slice(0, 200),
      message: String(b.message).slice(0, 4000),
      email: b.email || me?.email || null,
      userId: me?.id || null, userName: me?.name || null,
      status: 'open',
      createdAt: new Date(),
    };
    await (await getCollection('feedback')).insertOne(doc);
    return ok({ feedback: doc }, 201);
  }
  // GET /api/admin/feedback
  if (path === '/admin/feedback' && method === 'GET') {
    const me = await getCurrentUser(request);
    const g = requireRole(me, ['admin', 'super_admin']); if (!g.ok) return err(g.error, g.status);
    const list = await (await getCollection('feedback')).find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(500).toArray();
    return ok({ feedback: list });
  }

  // ---- NOTIFICATION PREFERENCES ----

  // GET/PUT /api/me/notification-preferences
  if (path === '/me/notification-preferences' && method === 'GET') {
    const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
    const doc = await (await getCollection('notificationPreferences')).findOne({ userId: me.id }, { projection: { _id: 0 } });
    return ok({ preferences: doc || {
      userId: me.id,
      mutedCategories: [],
      channels: { inapp: true, email: true, push: false },
    } });
  }
  if (path === '/me/notification-preferences' && method === 'PUT') {
    const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
    const b = await readBody(request);
    const patch = {
      userId: me.id,
      mutedCategories: Array.isArray(b.mutedCategories) ? b.mutedCategories : [],
      channels: {
        inapp: b.channels?.inapp !== false,
        email: b.channels?.email !== false,
        push: !!b.channels?.push,
      },
      updatedAt: new Date(),
    };
    await (await getCollection('notificationPreferences')).updateOne({ userId: me.id }, { $set: patch }, { upsert: true });
    return ok({ preferences: patch });
  }

  // ---- CHAT ENHANCEMENTS (Module 17) ----

  // POST /api/messages/:id/reaction { emoji }
  {
    const m = path.match(/^\/messages\/([^/]+)\/reaction$/);
    if (m && method === 'POST') {
      const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
      const { emoji } = await readBody(request);
      if (!emoji) return err('emoji required');
      const col = await getCollection('bookingMessages');
      const msg = await col.findOne({ id: m[1] });
      if (!msg) return err('Message not found', 404);
      if (!(msg.participantIds || []).includes(me.id)) return err('Forbidden', 403);
      // Toggle reaction
      const reactions = msg.reactions || [];
      const existing = reactions.find((r) => r.userId === me.id && r.emoji === emoji);
      let next;
      if (existing) next = reactions.filter((r) => !(r.userId === me.id && r.emoji === emoji));
      else next = [...reactions, { userId: me.id, userName: me.name, emoji, createdAt: new Date() }];
      await col.updateOne({ id: m[1] }, { $set: { reactions: next } });
      return ok({ reactions: next });
    }
  }

  // DELETE /api/messages/:id?scope=me|everyone
  {
    const m = path.match(/^\/messages\/([^/]+)$/);
    if (m && method === 'DELETE') {
      const me = await getCurrentUser(request); if (!me) return err('Authentication required', 401);
      const url = new URL(request.url);
      const scope = url.searchParams.get('scope') || 'me';
      const col = await getCollection('bookingMessages');
      const msg = await col.findOne({ id: m[1] });
      if (!msg) return err('Message not found', 404);
      if (!(msg.participantIds || []).includes(me.id)) return err('Forbidden', 403);
      if (scope === 'everyone') {
        if (msg.senderId !== me.id && !['admin', 'super_admin'].includes(me.role)) return err('Only sender can delete for everyone', 403);
        const mins = (Date.now() - new Date(msg.createdAt).getTime()) / 60000;
        if (mins > 60 && !['admin', 'super_admin'].includes(me.role)) return err('Delete-for-everyone window (60 min) has expired', 403);
        await col.updateOne({ id: m[1] }, { $set: { text: '', imageUrl: null, attachmentType: null, deletedForEveryone: true, deletedAt: new Date() } });
      } else {
        await col.updateOne({ id: m[1] }, { $addToSet: { deletedFor: me.id } });
      }
      return ok({ deleted: true, scope });
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
