import {
  INSTAGRAM_GRAPH_BASE_URL,
  META_GRAPH_BASE_URL,
  INSTAGRAM_CONFIG_ID,
} from './config';
import { DeliveryRejectedError } from '@/lib/server/channels/errors';

export type InstagramTokenSource = 'meta_unified' | 'legacy_instagram';

export interface InstagramTokenResponse {
  access_token: string;
  user_id: string;
  permissions?: string[];
  expires_in?: number;
  token_source: InstagramTokenSource;
}

export interface InstagramLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // in seconds (usually 60 days = 5184000)
}

export interface InstagramUserProfile {
  id: string;
  username: string;
  name?: string;
  account_type?: string;
  profile_picture_url?: string;
}

export interface InstagramSendResult {
  recipient_id: string;
  message_id: string;
}

/**
 * Exchange OAuth authorization code for access token.
 * Supports Meta Unified Login (Facebook Login for Business) and legacy Instagram standalone OAuth.
 */
export async function exchangeCodeForInstagramToken(
  code: string,
  redirectUri: string
): Promise<InstagramTokenResponse> {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET is not configured');
  }

  // 1. Primary path: Meta Graph API OAuth endpoint (Unified Login / Facebook Login for Business)
  try {
    const metaUrl = new URL(`${META_GRAPH_BASE_URL}/oauth/access_token`);
    metaUrl.searchParams.set('client_id', appId);
    metaUrl.searchParams.set('client_secret', appSecret);
    metaUrl.searchParams.set('redirect_uri', redirectUri);
    metaUrl.searchParams.set('code', code);

    const metaRes = await fetch(metaUrl.toString(), { method: 'GET' });
    const metaData = await metaRes.json();

    if (metaRes.ok && metaData.access_token) {
      return {
        access_token: metaData.access_token,
        user_id: metaData.user_id ? String(metaData.user_id) : '',
        permissions: metaData.permissions || [],
        expires_in: metaData.expires_in,
        token_source: 'meta_unified',
      };
    }
  } catch {
    // The configured provider owns the code; do not send it to an unrelated OAuth endpoint.
  }

  if (INSTAGRAM_CONFIG_ID) throw new Error('Meta OAuth code exchange failed');

  // 2. Fallback path: Standalone api.instagram.com OAuth endpoint
  const formData = new URLSearchParams();
  formData.append('client_id', appId);
  formData.append('client_secret', appSecret);
  formData.append('grant_type', 'authorization_code');
  formData.append('redirect_uri', redirectUri);
  formData.append('code', code);

  const res = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const data = await res.json();

  if (!res.ok || data.error_type || data.error_message) {
    throw new Error(
      data.error_message || data.error?.message || `Instagram OAuth exchange failed (${res.status})`
    );
  }

  return {
    access_token: data.access_token,
    user_id: String(data.user_id),
    permissions: data.permissions || [],
    token_source: 'legacy_instagram',
  };
}

/**
 * Exchange short-lived Meta (Facebook Login for Business) token for long-lived access token (60 days)
 * Endpoint: https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token...
 */
export async function getLongLivedMetaToken(
  shortLivedToken: string
): Promise<{ access_token: string; expires_in?: number }> {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error('INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET is not configured');
  }

  const url = new URL(`${META_GRAPH_BASE_URL}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('fb_exchange_token', shortLivedToken);

  const res = await fetch(url.toString(), { method: 'GET' });
  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to exchange long-lived Meta token');
  }

  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
  };
}

/**
 * Exchange short-lived access token for long-lived access token (60 days)
 */
export async function getLongLivedInstagramToken(
  shortLivedToken: string
): Promise<InstagramLongLivedTokenResponse> {
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!appSecret) {
    throw new Error('INSTAGRAM_APP_SECRET is not configured');
  }

  const url = new URL(`${INSTAGRAM_GRAPH_BASE_URL}/access_token`);
  url.searchParams.set('grant_type', 'ig_exchange_token');
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('access_token', shortLivedToken);

  const res = await fetch(url.toString(), { method: 'GET' });
  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to exchange long-lived Instagram token');
  }

  return data;
}

/**
 * Refresh long-lived access token before it expires
 */
export async function refreshLongLivedInstagramToken(
  currentLongLivedToken: string
): Promise<InstagramLongLivedTokenResponse> {
  const url = new URL(`${INSTAGRAM_GRAPH_BASE_URL}/refresh_access_token`);
  url.searchParams.set('grant_type', 'ig_refresh_token');
  url.searchParams.set('access_token', currentLongLivedToken);

  const res = await fetch(url.toString(), { method: 'GET' });
  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to refresh long-lived Instagram token');
  }

  return data;
}

/**
 * Fetch Instagram Business/Creator profile details (username, account type).
 * In Meta Unified Login, queries assigned Instagram accounts from the business portfolio.
 */
export async function getInstagramUserProfile(
  accessToken: string,
  userId?: string
): Promise<InstagramUserProfile> {
  // 1. Unified Login path: query /me/assigned_instagram_accounts via Graph API
  try {
    const assignedUrl = new URL(`${META_GRAPH_BASE_URL}/me/assigned_instagram_accounts`);
    assignedUrl.searchParams.set('fields', 'id,username,name,profile_picture_url');
    assignedUrl.searchParams.set('access_token', accessToken);
    const assignedRes = await fetch(assignedUrl.toString(), { method: 'GET' });
    const assignedData = await assignedRes.json();
    if (assignedRes.ok && Array.isArray(assignedData.data) && assignedData.data.length > 0) {
      // Support multi-account portfolios: match target userId if specified, otherwise choose first
      const matched = userId && userId !== 'me'
        ? assignedData.data.find((item: { id: string | number }) => String(item.id) === String(userId))
        : null;
      const ig = matched || assignedData.data[0];
      return {
        id: String(ig.id),
        username: ig.username || `ig_${ig.id}`,
        name: ig.name || ig.username,
        account_type: 'BUSINESS',
        profile_picture_url: ig.profile_picture_url,
      };
    }
  } catch {
    console.warn('Unified login assigned_instagram_accounts check failed');
  }

  // 2. Facebook Pages with linked instagram_business_account fallback
  try {
    const pagesUrl = new URL(`${META_GRAPH_BASE_URL}/me/accounts`);
    pagesUrl.searchParams.set('fields', 'id,name,instagram_business_account{id,username,name,profile_picture_url}');
    pagesUrl.searchParams.set('access_token', accessToken);
    const pagesRes = await fetch(pagesUrl.toString(), { method: 'GET' });
    const pagesData = await pagesRes.json();
    if (pagesRes.ok && Array.isArray(pagesData.data)) {
      let selectedIg: InstagramUserProfile | null = null;
      for (const page of pagesData.data) {
        if (page.instagram_business_account?.id) {
          if (userId && userId !== 'me' && String(page.instagram_business_account.id) === String(userId)) {
            selectedIg = page.instagram_business_account;
            break;
          }
          if (!selectedIg) {
            selectedIg = page.instagram_business_account;
          }
        }
      }
      if (selectedIg) {
        return {
          id: String(selectedIg.id),
          username: selectedIg.username || `ig_${selectedIg.id}`,
          name: selectedIg.name || selectedIg.username,
          account_type: 'BUSINESS',
          profile_picture_url: selectedIg.profile_picture_url,
        };
      }
    }
  } catch {
    console.warn('Page accounts query failed');
  }

  // 3. Direct lookup on graph.facebook.com
  const target = userId && userId !== 'me' ? userId : 'me';
  try {
    const fbUrl = new URL(`${META_GRAPH_BASE_URL}/${target}`);
    fbUrl.searchParams.set('fields', 'id,username,name,account_type,profile_picture_url');
    fbUrl.searchParams.set('access_token', accessToken);
    const fbRes = await fetch(fbUrl.toString(), { method: 'GET' });
    const fbData = await fbRes.json();
    if (fbRes.ok && fbData.id && fbData.username && fbData.account_type) {
      return {
        id: String(fbData.id),
        username: fbData.username || `ig_${fbData.id}`,
        name: fbData.name,
        account_type: fbData.account_type || 'BUSINESS',
        profile_picture_url: fbData.profile_picture_url,
      };
    }
  } catch {}

  // 4. Fallback to graph.instagram.com
  const url = new URL(`${INSTAGRAM_GRAPH_BASE_URL}/${target}`);
  url.searchParams.set('fields', 'id,username,name,account_type,profile_picture_url');
  url.searchParams.set('access_token', accessToken);

  const res = await fetch(url.toString(), { method: 'GET' });
  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to fetch Instagram profile');
  }

  return {
    id: String(data.id),
    username: data.username,
    name: data.name,
    account_type: data.account_type,
    profile_picture_url: data.profile_picture_url,
  };
}

/**
 * Subscribe Meta Webhook to Page / Instagram Account.
 * Supports both Meta Unified Login (graph.facebook.com) and Instagram Graph (graph.instagram.com).
 */
export async function subscribeInstagramWebhook(
  pageOrAccountId: string,
  accessToken: string
): Promise<boolean> {
  const target = pageOrAccountId && pageOrAccountId !== 'me' ? pageOrAccountId : 'me';

  // 1. Try graph.facebook.com/{target}/subscribed_apps (Meta Unified Login / Business Integration)
  try {
    const fbUrl = `${META_GRAPH_BASE_URL}/${target}/subscribed_apps`;
    const fbRes = await fetch(fbUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscribed_fields: ['messages', 'messaging_postbacks'],
        access_token: accessToken,
      }),
    });
    const fbData = await fbRes.json();
    if (fbRes.ok && fbData.success === true) {
      return true;
    }
  } catch {
    console.warn('graph.facebook.com webhook subscription failed');
  }

  // 2. Try graph.instagram.com/{target}/subscribed_apps
  try {
    const url = `${INSTAGRAM_GRAPH_BASE_URL}/${target}/subscribed_apps`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        subscribed_fields: ['messages', 'messaging_postbacks'],
        access_token: accessToken,
      }),
    });
    const data = await res.json();
    return res.ok && data.success === true;
  } catch {
    console.warn('graph.instagram.com webhook subscription failed');
    return false;
  }
}

/**
 * Send Direct Message via Instagram Graph API
 * Note: Messaging window is 24 hours from the last user message.
 */
export async function sendInstagramDirectMessage({
  recipientId,
  text,
  accessToken,
}: {
  recipientId: string;
  text: string;
  accessToken: string;
}): Promise<InstagramSendResult> {
  // Deterministic single transport: Meta Graph for Unified Login (when config_id configured), otherwise direct Instagram Graph
  const useMetaGraph = Boolean(INSTAGRAM_CONFIG_ID);
  const targetUrl = useMetaGraph
    ? `${META_GRAPH_BASE_URL}/me/messages`
    : `${INSTAGRAM_GRAPH_BASE_URL}/me/messages`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (!useMetaGraph) {
    requestHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  const payloadBody = useMetaGraph
    ? {
        recipient: { id: recipientId },
        message: { text },
        access_token: accessToken,
      }
    : {
        recipient: { id: recipientId },
        message: { text },
      };

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(payloadBody),
      signal: AbortSignal.timeout(8000),
    });
  } catch (netErr: unknown) {
    // Network timeout or socket abort: the external side effect is ambiguous.
    // Do NOT attempt a secondary POST or fallback; route to operator review.
    throw new DeliveryRejectedError(false, 'outcome_unknown');
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new DeliveryRejectedError(false, 'outcome_unknown');
  }

  if (!res.ok || data.error) {
    const errorCode = data.error?.code;
    const errorSubcode = data.error?.error_subcode;

    // Check for 24-hour messaging window expiration (Error 551 or 10 or 2018001)
    if (errorCode === 10 || errorCode === 551 || errorSubcode === 2018001) {
      throw new DeliveryRejectedError(false, 'window_expired');
    }

    // Token expired or invalid
    if (errorCode === 190) {
      throw new DeliveryRejectedError(false, 'needs_reconnect');
    }

    throw new DeliveryRejectedError(res.status === 429 || res.status >= 500);
  }

  return {
    recipient_id: String(data.recipient_id || recipientId),
    message_id: String(data.message_id),
  };
}
