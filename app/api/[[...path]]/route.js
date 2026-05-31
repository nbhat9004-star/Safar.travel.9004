import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import {
  hashPassword, verifyPassword, signToken,
  setAuthCookie, clearAuthCookie, getCurrentUser,
  publicUser, requireRole, ROLES, COOKIE_NAME,
} from '@/lib/auth';
import { getCollection, ensureIndexes } from '@/lib/db';

const json = (data, status = 200) => NextResponse.json(data, { status });
const ok = (data = {}) => json({ ok: true, ...data });
const err = (message, status = 400) => json({ ok: false, error: message }, status);

const isValidEmail = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

async function route(request, { params }) {
  await ensureIndexes();
  const segments = params?.path || [];
  const path = '/' + segments.join('/');
  const method = request.method.toUpperCase();

  // ---------- AUTH ----------
  if (path === '/auth/register' && method === 'POST') {
    const { name, email, password, role } = await readBody(request);
    if (!name || typeof name !== 'string' || name.trim().length < 2) return err('Name is required (min 2 chars)');
    if (!isValidEmail(email)) return err('Valid email is required');
    if (!password || password.length < 6) return err('Password must be at least 6 characters');
    const userRole = ROLES.includes(role) && role !== 'admin' ? role : 'traveler';

    const users = await getCollection('users');
    const existing = await users.findOne({ email: email.toLowerCase() });
    if (existing) return err('An account with this email already exists', 409);

    const user = {
      id: uuid(),
      name: name.trim(),
      email: email.toLowerCase(),
      role: userRole,
      passwordHash: await hashPassword(password),
      avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0F3D2E`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await users.insertOne(user);
    const token = signToken({ uid: user.id, role: user.role });
    const res = ok({ user: publicUser(user), token });
    return setAuthCookie(res, token);
  }

  if (path === '/auth/login' && method === 'POST') {
    const { email, password } = await readBody(request);
    if (!isValidEmail(email)) return err('Valid email is required');
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
    const res = ok({ message: 'Logged out' });
    return clearAuthCookie(res);
  }

  if (path === '/auth/me' && method === 'GET') {
    const me = await getCurrentUser(request);
    if (!me) return err('Not authenticated', 401);
    return ok({ user: publicUser(me) });
  }

  // ---------- PROTECTED EXAMPLES ----------
  if (path === '/users' && method === 'GET') {
    // Admin-only listing
    const me = await getCurrentUser(request);
    const guard = requireRole(me, 'admin');
    if (!guard.ok) return err(guard.error, guard.status);
    const users = await getCollection('users');
    const list = await users.find({}, { projection: { passwordHash: 0, _id: 0 } }).sort({ createdAt: -1 }).limit(200).toArray();
    return ok({ users: list });
  }

  if (path === '/host/me' && method === 'GET') {
    const me = await getCurrentUser(request);
    const guard = requireRole(me, ['host', 'admin']);
    if (!guard.ok) return err(guard.error, guard.status);
    return ok({ user: publicUser(me) });
  }

  if (path === '/traveler/me' && method === 'GET') {
    const me = await getCurrentUser(request);
    const guard = requireRole(me, ['traveler', 'host', 'admin']);
    if (!guard.ok) return err(guard.error, guard.status);
    return ok({ user: publicUser(me) });
  }

  // Health / fallback
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
