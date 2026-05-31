'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const AuthCtx = createContext(null);

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-json */ }
  return { ok: res.ok, status: res.status, data };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { ok, data } = await apiFetch('/api/auth/me');
    setUser(ok && data?.user ? data.user : null);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (email, password) => {
    const { ok, data } = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (!ok) return { ok: false, error: data?.error || 'Login failed' };
    setUser(data.user);
    return { ok: true, user: data.user };
  }, []);

  const register = useCallback(async (name, email, password, role) => {
    const { ok, data } = await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role }) });
    if (!ok) return { ok: false, error: data?.error || 'Registration failed' };
    setUser(data.user);
    return { ok: true, user: data.user };
  }, []);

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const value = { user, loading, login, register, logout, refresh };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
