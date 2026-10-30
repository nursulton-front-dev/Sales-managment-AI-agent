import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const result = await auth.api.signOut({
      headers: req.headers,
      asResponse: true,
    });

    const response = NextResponse.json({ success: true });

    response.cookies.delete('better-auth.session_token');
    response.cookies.delete('__Secure-better-auth.session_token');
    response.cookies.delete('better-auth.session_data');
    response.cookies.delete('__Secure-better-auth.session_data');
    response.cookies.delete('ai_os_workspace_id');

    if (result) {
      for (const cookie of result.headers.getSetCookie()) {
        response.headers.append('set-cookie', cookie);
      }
    }

    return response;
  } catch (err: unknown) {
    console.error('Logout error:', err);
    const response = NextResponse.json({ success: true });
    response.cookies.delete('better-auth.session_token');
    response.cookies.delete('__Secure-better-auth.session_token');
    response.cookies.delete('better-auth.session_data');
    response.cookies.delete('__Secure-better-auth.session_data');
    response.cookies.delete('ai_os_workspace_id');
    return response;
  }
}
