import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { NextRequest, NextResponse } from 'next/server';

const handler = toNextJsHandler(auth);

// Prohibit standard password login bypass and direct session minting
const BLOCKED_AUTH_PATHS = [
  '/sign-in/email',
  '/sign-in/email-otp',
  '/login/complete-2fa',
  '/complete-2fa',
];

function isBlocked(req: NextRequest): boolean {
  const pathname = req.nextUrl.pathname;
  return BLOCKED_AUTH_PATHS.some((blocked) => pathname.endsWith(blocked));
}

export async function GET(req: NextRequest) {
  if (isBlocked(req)) {
    return NextResponse.json({ error: 'Endpoint disabled' }, { status: 404 });
  }
  return handler.GET(req);
}

export async function POST(req: NextRequest) {
  if (isBlocked(req)) {
    return NextResponse.json({ error: 'Endpoint disabled' }, { status: 404 });
  }
  return handler.POST(req);
}
