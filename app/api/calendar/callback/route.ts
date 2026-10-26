import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/calendar/google';
import { updateWorkspace } from '@/src/db';
import { getServerSessionContext } from '@/src/server/auth/session';
export async function GET(req: NextRequest) {
  const redirect = (status: string) => { const response = NextResponse.redirect(new URL(`/dashboard/integrations?calendar=${status}`, req.url)); response.cookies.delete('chorla_calendar_state'); return response; };
  try {
    const session = await getServerSessionContext();
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');
    if (!session.workspace || !code || !state || req.cookies.get('chorla_calendar_state')?.value !== `${session.workspaceId}:${state}`) return redirect('failed');
    const tokens = await exchangeCodeForTokens(code, req.nextUrl.origin);
    const refreshToken = tokens.refreshToken || session.workspace.googleRefreshToken;
    if (!refreshToken) return redirect('failed');
    await updateWorkspace(session.workspace.id, { googleCalendarConnected: true, googleCalendarEmail: tokens.email || session.workspace.ownerEmail, googleRefreshToken: refreshToken });
    return redirect('connected');
  } catch { return redirect('failed'); }
}
