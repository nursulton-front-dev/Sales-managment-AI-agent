import { NextRequest, NextResponse } from 'next/server';
import { isGoogleCalendarConfigured, getGoogleAuthUrl } from '@/lib/calendar/google';
import { getServerSessionContext } from '@/src/server/auth/session';
export async function GET(req: NextRequest) {
  const session = await getServerSessionContext();
  if (!session.workspaceId) return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
  if (!isGoogleCalendarConfigured()) return NextResponse.json({ success: false, error: 'Подключение календаря пока недоступно' }, { status: 503 });
  const state = crypto.randomUUID();
  const response = NextResponse.redirect(getGoogleAuthUrl(state, req.nextUrl.origin));
  response.cookies.set('chorla_calendar_state', `${session.workspaceId}:${state}`, { httpOnly: true, sameSite: 'lax', secure: req.nextUrl.protocol === 'https:', path: '/', maxAge: 600 });
  return response;
}
