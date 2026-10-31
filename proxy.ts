import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /dashboard and all nested routes
  if (pathname.startsWith('/dashboard')) {
    const workspaceCookie = request.cookies.get('ai_os_workspace_id')?.value;

    // If no workspace session cookie exists, redirect immediately to login
    if (!workspaceCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
