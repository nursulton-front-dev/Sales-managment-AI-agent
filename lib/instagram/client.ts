import {
  INSTAGRAM_GRAPH_API_VERSION,
  INSTAGRAM_GRAPH_BASE_URL,
  META_GRAPH_BASE_URL,
  decryptToken,
  encryptToken,
} from './config';

export interface InstagramTokenResponse {
  access_token: string;
  user_id: string;
  permissions?: string[];
  expires_in?: number;
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
 * Exchange OAuth authorization code for short-lived user access token
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
 * Fetch Instagram Business/Creator profile details (username, account type)
 */
export async function getInstagramUserProfile(
  accessToken: string,
  userId?: string
): Promise<InstagramUserProfile> {
  const target = userId || 'me';
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
 * Subscribe Meta Webhook to Page / Instagram Account
 */
export async function subscribeInstagramWebhook(
  pageOrAccountId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const url = `${META_GRAPH_BASE_URL}/${pageOrAccountId}/subscribed_apps`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscribed_fields: ['messages', 'messaging_postbacks'],
        access_token: accessToken,
      }),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.warn('Instagram webhook subscription warning:', err);
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
  // According to Meta API: POST /v21.0/me/messages
  const url = `${INSTAGRAM_GRAPH_BASE_URL}/me/messages`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      recipient: {
        id: recipientId,
      },
      message: {
        text,
      },
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    const errorMessage = data.error?.message || `Instagram API send error (${res.status})`;
    const errorCode = data.error?.code;
    const errorSubcode = data.error?.error_subcode;

    // Check for 24-hour messaging window expiration (Error 551 or 10 or 2018001)
    if (errorCode === 10 || errorCode === 551 || errorSubcode === 2018001) {
      throw new Error(`WINDOW_EXPIRED: 24-часовое окно ответа закрыто. Клиент должен написать первым.`);
    }

    // Token expired or invalid
    if (errorCode === 190) {
      throw new Error(`TOKEN_EXPIRED: Токен Instagram отозван или истёк. Требуется переподключение.`);
    }

    throw new Error(errorMessage);
  }

  return {
    recipient_id: data.recipient_id,
    message_id: data.message_id,
  };
}
