import { NextRequest, NextResponse, connection } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/calendar/google';
import { updateWorkspace, getAllWorkspaces, getWorkspaceById } from '@/src/db';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  await connection();
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.warn('Google OAuth denied or returned error:', error);
      return NextResponse.redirect(
        new URL('/dashboard?calendar_error=' + encodeURIComponent(error), req.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard?calendar_error=missing_code', req.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, req.nextUrl.origin);

    // Identify target workspace
    const cookieStore = await cookies();
    let workspaceId = state && state !== 'default' ? state : cookieStore.get('ai_os_workspace_id')?.value;

    let targetWs = null;
    if (workspaceId) {
      targetWs = await getWorkspaceById(workspaceId);
    }

    if (!targetWs) {
      return NextResponse.redirect(
        new URL('/dashboard?calendar_error=workspace_not_found', req.url)
      );
    }

    if (targetWs) {
      await updateWorkspace(targetWs.id, {
        googleCalendarConnected: true,
        googleCalendarEmail: tokens.email || targetWs.ownerEmail,
        googleRefreshToken: tokens.refreshToken || targetWs.googleRefreshToken,
      });
    }

    // Redirect to dashboard with success query param
    return NextResponse.redirect(
      new URL('/dashboard?calendar_connected=true&email=' + encodeURIComponent(tokens.email || ''), req.url)
    );
  } catch (err: any) {
    console.error('Error in Google Calendar callback:', err);
    return NextResponse.redirect(
      new URL('/dashboard?calendar_error=' + encodeURIComponent(err.message || 'auth_failed'), req.url)
    );
  }
}
