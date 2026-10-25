import { NextRequest, NextResponse, connection } from 'next/server';
import { isGoogleCalendarConfigured } from '@/lib/calendar/google';
import { getWorkspaceById, getAllWorkspaces } from '@/src/db';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  await connection();
  try {
    const { searchParams } = new URL(req.url);
    const cookieStore = await cookies();
    const workspaceId =
      searchParams.get('workspaceId') || cookieStore.get('ai_os_workspace_id')?.value;

    let ws = null;
    if (workspaceId) {
      ws = await getWorkspaceById(workspaceId);
    }
    if (!ws) {
      return NextResponse.json({
        success: true,
        configured: isGoogleCalendarConfigured(),
        connected: false,
        email: null,
        workingHours: '10:00-18:00',
        slotDuration: 45,
        clientIdConfigured: Boolean(process.env.GOOGLE_CLIENT_ID),
      });
    }

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
