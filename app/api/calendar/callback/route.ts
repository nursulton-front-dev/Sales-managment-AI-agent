import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/calendar/google';
import { updateWorkspace } from '@/src/db';
import { getServerSessionContext } from '@/src/server/auth/session';

export async function handleCalendarCallback(req: NextRequest) {
  const redirect = (status: string) => {
    const response = NextResponse.redirect(new URL(`/dashboard/integrations?calendar=${status}`, req.url));
    response.cookies.delete('chorla_calendar_state');
    return response;
  };

  try {
    const session = await getServerSessionContext();
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');

    if (!session.workspace || !code || !state || req.cookies.get('chorla_calendar_state')?.value !== `${session.workspaceId}:${state}`) {
      return redirect('failed');
    }

    let currentCallbackUri = `${req.nextUrl.origin}${req.nextUrl.pathname}`;
    if (currentCallbackUri.startsWith('http://') && !currentCallbackUri.includes('localhost') && !currentCallbackUri.includes('127.0.0.1')) {
      currentCallbackUri = currentCallbackUri.replace('http://', 'https://');
    }
    const tokens = await exchangeCodeForTokens(code, req.nextUrl.origin, currentCallbackUri);
    const refreshToken = tokens.refreshToken || session.workspace.googleRefreshToken;
    if (!refreshToken) return redirect('failed');

    await updateWorkspace(session.workspace.id, {
      googleCalendarConnected: true,
      googleCalendarEmail: tokens.email || session.workspace.ownerEmail,
      googleRefreshToken: refreshToken,
    });

    return redirect('connected');
  } catch (err) {
    console.error('[Google Calendar Callback Error]:', err);
    return redirect('failed');
  }
}

export async function GET(req: NextRequest) {
  return handleCalendarCallback(req);
}

