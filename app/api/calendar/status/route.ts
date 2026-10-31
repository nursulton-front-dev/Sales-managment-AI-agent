import { getServerSessionContext } from '@/src/server/auth/session';
import { NextRequest, NextResponse, connection } from 'next/server';
import { isGoogleCalendarConfigured } from '@/lib/calendar/google';
import { getWorkspaceById, getAllWorkspaces } from '@/src/db';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    const ws = session.workspace;
    if (!ws) return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });

    const isConfigured = isGoogleCalendarConfigured();
    const isConnected = Boolean(ws?.googleCalendarConnected && ws?.googleRefreshToken);

    return NextResponse.json({
      success: true,
      configured: isConfigured,
      connected: isConnected,
      email: ws?.googleCalendarEmail || null,
      workingHours: ws?.googleCalendarWorkingHours || '10:00-18:00',
      slotDuration: ws?.googleCalendarSlotDuration || 45,
      clientIdConfigured: Boolean(process.env.GOOGLE_CLIENT_ID),
    });
  } catch (error) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : 'Ошибка запроса') }, { status: 500 });
  }
}
