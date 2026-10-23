import { NextRequest, NextResponse, connection } from 'next/server';
import { isGoogleCalendarConfigured, getGoogleAuthUrl } from '@/lib/calendar/google';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  await connection();
  try {
    const { searchParams } = new URL(req.url);
    const cookieStore = await cookies();
    const workspaceId =
      searchParams.get('workspaceId') ||
      cookieStore.get('ai_os_workspace_id')?.value ||
      'default';

    if (!isGoogleCalendarConfigured()) {
      return NextResponse.json(
        {
          success: false,
          configured: false,
          error:
            'Google Calendar API не настроен в .env.local. Укажите GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET.',
        },
        { status: 400 }
      );
    }

    const authUrl = getGoogleAuthUrl(workspaceId);
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Error in calendar auth route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
