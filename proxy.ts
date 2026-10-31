import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /dashboard and all nested routes
  if (pathname.startsWith('/dashboard')) {
    const workspaceCookie = request.cookies.get('ai_os_workspace_id')?.value;
    const authSessionCookie =
      request.cookies.get('better-auth.session_token')?.value ||
      request.cookies.get('__Secure-better-auth.session_token')?.value;

    // If neither a workspace cookie nor an active Better Auth session cookie is present, redirect to login
    if (!workspaceCookie && !authSessionCookie) {
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
