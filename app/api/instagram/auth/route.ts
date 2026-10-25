import { NextRequest, NextResponse, connection } from 'next/server';
import { getServerSessionContext } from '@/src/server/auth/session';
import { createOAuthState, INSTAGRAM_SCOPES } from '@/lib/instagram/config';

export async function GET(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) {
      return NextResponse.json(
        { success: false, error: 'Требуется авторизация в организации' },
        { status: 401 }
      );
    }

    // Role check: Only workspace owner or authorized admin can initiate Instagram OAuth
    if (!['owner', 'admin', 'super_admin'].includes(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Только владелец или администратор организации может подключать Instagram' },
        { status: 403 }
      );
    }

    const appId = process.env.INSTAGRAM_APP_ID;
    if (!appId || appId.includes('placeholder')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Instagram App ID не настроен в переменных окружения (INSTAGRAM_APP_ID)',
        },
        { status: 400 }
      );
    }

    // Origin resolution
    const origin =
      process.env.BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      req.nextUrl.origin;

    const redirectUri = `${origin}/api/instagram/callback`;

    // Secure cryptographic state signed with HMAC-SHA256, binds workspaceId and userId
    const state = createOAuthState(session.workspaceId, session.userEmail || undefined);

    // Meta Instagram Login Authorization URL
    const authUrl = new URL('https://api.instagram.com/oauth/authorize');
    authUrl.searchParams.set('client_id', appId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', INSTAGRAM_SCOPES);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);

    // If request asks for JSON URL
    if (req.headers.get('accept')?.includes('application/json')) {
      return NextResponse.json({ success: true, authUrl: authUrl.toString() });
    }

    return NextResponse.redirect(authUrl.toString());
  } catch (error: any) {
    console.error('Error initiating Instagram auth:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
