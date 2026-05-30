import { NextResponse } from 'next/server';

async function handler(request, { params }) {
  const path = params?.path?.join('/') || '';
  return NextResponse.json({
    ok: true,
    message: 'Safar API — Phase 1 frontend-only mode. Backend endpoints will be wired here.',
    method: request.method,
    path,
    env: 'demo',
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
