import { NextRequest, NextResponse, connection } from 'next/server';
import {
  verifyOAuthState,
  encryptToken,
} from '@/lib/instagram/config';
import {
  exchangeCodeForInstagramToken,
  getLongLivedInstagramToken,
  getInstagramUserProfile,
  subscribeInstagramWebhook,
} from '@/lib/instagram/client';
import { getWorkspaceById, updateWorkspace } from '@/src/db';
import { getServerSessionContext } from '@/src/server/auth/session';

export async function GET(req: NextRequest) {
  await connection();
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorReason = searchParams.get('error_reason');
    const errorDescription = searchParams.get('error_description');

    const redirectBase = '/dashboard/integrations';

    if (error || errorReason) {
      console.warn('Instagram OAuth denied by user:', error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `${redirectBase}?instagram_error=${encodeURIComponent(
            errorDescription || error || 'Отказ в авторизации'
          )}`,
          req.url
        )
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(`${redirectBase}?instagram_error=missing_code_or_state`, req.url)
      );
    }

    // 1. Validate cryptographic state signature
    const stateVerification = verifyOAuthState(state);
    if (!stateVerification.valid || !stateVerification.workspaceId) {
      console.error('Invalid or expired Instagram OAuth state signature');
      return NextResponse.redirect(
        new URL(`${redirectBase}?instagram_error=invalid_state_signature`, req.url)
      );
    }

    const verifiedWorkspaceId = stateVerification.workspaceId;

    // 2. Verify initiating user session and workspace authorization
    const session = await getServerSessionContext();
    if (!session.workspaceId || (!session.isSuperAdmin && session.workspaceId !== verifiedWorkspaceId)) {
      console.error('Cross-tenant mismatch or unauthorized session in Instagram callback');
      return NextResponse.redirect(
        new URL(`${redirectBase}?instagram_error=unauthorized_workspace`, req.url)
      );
    }

    const workspace = await getWorkspaceById(verifiedWorkspaceId);
    if (!workspace) {
      return NextResponse.redirect(
        new URL(`${redirectBase}?instagram_error=workspace_not_found`, req.url)
      );
    }

    // 3. Resolve redirectUri identical to the authorization request
    const origin =
      process.env.BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      req.nextUrl.origin;
    const redirectUri = `${origin}/api/instagram/callback`;

    // 4. Exchange code for short-lived token
    const tokenData = await exchangeCodeForInstagramToken(code, redirectUri);

    // 5. Upgrade to long-lived 60-day token
    let longLivedToken = tokenData.access_token;
    let expiresAt = new Date(Date.now() + 3600 * 1000); // Short-lived token if upgrade fails.

    try {
      const longLived = await getLongLivedInstagramToken(tokenData.access_token);
      if (longLived.access_token) {
        longLivedToken = longLived.access_token;
        if (longLived.expires_in) {
          expiresAt = new Date(Date.now() + longLived.expires_in * 1000);
        }
      }
    } catch (llErr) {
      console.warn('Long-lived token exchange warning, falling back to short-lived:', llErr);
    }

    // 6. Fetch user profile (username, account ID, account type)
    const profile = await getInstagramUserProfile(longLivedToken, tokenData.user_id);

    // 7. Subscribe to Meta Webhooks for messages
    if (!await subscribeInstagramWebhook(profile.id, longLivedToken)) {
      throw new Error('Instagram не подтвердил подписку на сообщения. Проверьте разрешения приложения.');
    }

    // 8. Encrypt access token at rest using AES-256-GCM
    const encryptedToken = encryptToken(longLivedToken);

    // 9. Atomically save connection in Neon Postgres
    await updateWorkspace(verifiedWorkspaceId, {
      instagramConnected: true,
      instagramUserId: profile.id,
      instagramUsername: profile.username || `ig_${profile.id}`,
      instagramAccessToken: encryptedToken,
      instagramTokenExpiresAt: expiresAt,
      instagramScopes: tokenData.permissions || ['instagram_business_basic', 'instagram_business_manage_messages'],
      instagramStatus: 'connected',
      instagramLastError: null,
      // Default auto-reply off until user explicitly selects agent & activates
    });

    return NextResponse.redirect(
      new URL(
        `${redirectBase}?instagram_connected=true&username=${encodeURIComponent(
          profile.username || profile.id
        )}`,
        req.url
      )
    );
  } catch {
    console.error('Instagram OAuth connection failed');
    return NextResponse.redirect(
      new URL(
        `/dashboard/integrations?instagram_error=${encodeURIComponent(
          'Не удалось подключить Instagram. Проверьте разрешения приложения и настройки сервера.'
        )}`,
        req.url
      )
    );
  }
}
