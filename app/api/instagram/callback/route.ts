import { NextRequest, NextResponse, connection } from 'next/server';
import {
  verifyOAuthState,
  encryptToken,
} from '@/lib/instagram/config';
import {
  exchangeCodeForInstagramToken,
  getLongLivedMetaToken,
  getLongLivedInstagramToken,
  getInstagramUserProfile,
  subscribeInstagramWebhook,
} from '@/lib/instagram/client';
import { getWorkspaceById, updateWorkspace } from '@/src/db';
import { getServerSessionContext } from '@/src/server/auth/session';

export async function GET(req: NextRequest) {
  await connection();
  let failureCode = 'token_exchange_failed';
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorReason = searchParams.get('error_reason');

    const redirectBase = '/dashboard/integrations';

    if (error || errorReason) {
      return NextResponse.redirect(
        new URL(
          `${redirectBase}?instagram_error=access_denied`,
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
    const redirectUri = new URL('/api/instagram/callback', origin).toString();

    // 4. Exchange code for access token
    const tokenData = await exchangeCodeForInstagramToken(code, redirectUri);

    // 5. Upgrade token / determine expiration based on token source (Unified Login vs Legacy)
    let longLivedToken = tokenData.access_token;
    let expiresAt: Date;

    if (tokenData.token_source === 'meta_unified') {
      // In Meta Unified Login (Facebook Login for Business):
      if (tokenData.expires_in && tokenData.expires_in > 86400) {
        // Token is already long-lived (e.g. 60 days)
        expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      } else if (tokenData.expires_in && tokenData.expires_in <= 86400) {
        // Short-lived user token: exchange via fb_exchange_token on graph.facebook.com
        try {
          const longLived = await getLongLivedMetaToken(tokenData.access_token);
          if (longLived.access_token) {
            longLivedToken = longLived.access_token;
            expiresAt = new Date(Date.now() + (longLived.expires_in || 5184000) * 1000);
          } else {
            expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
          }
        } catch {
          console.warn('Long-lived Meta token exchange failed; retaining original expiry');
          expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
        }
      } else {
        // System User Access Token (SUAT) in Unified Login:
        // System User tokens do not expire unless manually revoked in Business Manager.
        // Maintain 60-day operational review horizon rather than falling back to 1 hour.
        expiresAt = new Date(Date.now() + 60 * 86400 * 1000);
      }
    } else {
      // Legacy standalone Instagram Login: exchange via ig_exchange_token on graph.instagram.com
      expiresAt = new Date(Date.now() + 3600 * 1000);
      try {
        const longLived = await getLongLivedInstagramToken(tokenData.access_token);
        if (longLived.access_token) {
          longLivedToken = longLived.access_token;
          if (longLived.expires_in) {
            expiresAt = new Date(Date.now() + longLived.expires_in * 1000);
          }
        }
      } catch {
        console.warn('Long-lived Instagram token exchange failed; retaining original token');
      }
    }

    // 6. Fetch user profile (username, account ID, account type)
    failureCode = 'profile_unavailable';
    const profile = await getInstagramUserProfile(longLivedToken, tokenData.user_id);

    // 7. Subscribe to Meta Webhooks for messages
    failureCode = 'subscription_failed';
    if (!await subscribeInstagramWebhook(profile.id, longLivedToken)) {
      throw new Error('Instagram не подтвердил подписку на сообщения. Проверьте разрешения приложения.');
    }

    // 8. Encrypt access token at rest using AES-256-GCM
    failureCode = 'save_failed';
    const encryptedToken = encryptToken(longLivedToken);

    // Default scopes depending on token source
    const fallbackScopes = tokenData.token_source === 'meta_unified'
      ? ['instagram_basic', 'instagram_manage_messages']
      : ['instagram_business_basic', 'instagram_business_manage_messages'];

    // 9. Atomically save connection in Neon Postgres
    const saved = await updateWorkspace(verifiedWorkspaceId, {
      instagramConnected: true,
      instagramUserId: profile.id,
      instagramUsername: profile.username || `ig_${profile.id}`,
      instagramAccessToken: encryptedToken,
      instagramTokenExpiresAt: expiresAt,
      instagramScopes: (tokenData.permissions && tokenData.permissions.length > 0)
        ? tokenData.permissions
        : fallbackScopes,
      instagramStatus: 'connected',
      instagramLastError: null,
      // Default auto-reply off until user explicitly selects agent & activates
    });
    if (!saved) throw new Error('Workspace was not saved');

    return NextResponse.redirect(
      new URL(
        `${redirectBase}?instagram_connected=true&username=${encodeURIComponent(
          profile.username || profile.id
        )}`,
        req.url
      )
    );
  } catch {
    // Only a fixed stage code is logged: provider exceptions may contain tokens or URLs.
    console.error('Instagram OAuth connection failed', { code: failureCode });
    return NextResponse.redirect(
      new URL(
        `/dashboard/integrations?instagram_error=${failureCode}`,
        req.url
      )
    );
  }
}
