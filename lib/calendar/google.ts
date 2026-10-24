/**
 * Google Calendar API & OAuth 2.0 Client Service
 * AI Business OS · Enterprise Integration
 */

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  email?: string;
}

export interface CalendarEventPayload {
  summary: string;
  description: string;
  startTime: string; // ISO 8601 string
  endTime: string;   // ISO 8601 string
  attendeeName?: string;
  attendeeEmail?: string;
  attendeePhone?: string;
  channel?: string;
  timeZone?: string;
}

export interface GoogleCalendarEventResult {
  id: string;
  htmlLink: string;
  summary: string;
  startTime: string;
  endTime: string;
  status: string;
}

/**
 * Checks whether Google OAuth keys are present in environment
 */
export function isGoogleCalendarConfigured(): boolean {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return Boolean(
    clientId &&
    clientSecret &&
    !clientId.includes('your_google_client_id') &&
    !clientSecret.includes('your_google_client_secret')
  );
}

/**
 * Generates Google OAuth 2.0 authorization URL
 */
export function getGoogleAuthUrl(workspaceId?: string, requestOrigin?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  
  let redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!redirectUri) {
    if (requestOrigin) {
      redirectUri = `${requestOrigin}/api/calendar/callback`;
    } else if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      redirectUri = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api/calendar/callback`;
    } else if (process.env.VERCEL_URL) {
      redirectUri = `https://${process.env.VERCEL_URL}/api/calendar/callback`;
    } else {
      redirectUri = 'http://localhost:3000/api/calendar/callback';
    }
  }

  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ].join(' ');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
    state: workspaceId || 'default',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchanges authorization code for Access & Refresh tokens
 */
export async function exchangeCodeForTokens(code: string, requestOrigin?: string): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  
  let redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!redirectUri) {
    if (requestOrigin) {
      redirectUri = `${requestOrigin}/api/calendar/callback`;
    } else if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      redirectUri = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api/calendar/callback`;
    } else if (process.env.VERCEL_URL) {
      redirectUri = `https://${process.env.VERCEL_URL}/api/calendar/callback`;
    } else {
      redirectUri = 'http://localhost:3000/api/calendar/callback';
    }
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Ошибка обмена токенов Google OAuth');
  }

  // Fetch connected Google User email
  let email = '';
  try {
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (userRes.ok) {
      const userData = await userRes.json();
      email = userData.email || '';
    }
  } catch (err) {
    console.warn('Could not fetch userinfo email from Google:', err);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    email,
  };
}

/**
 * Refreshes access token using long-lived refresh_token
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Ошибка обновления токена Google');
  }

  return data.access_token;
}

/**
 * Creates an event in user's primary Google Calendar
 */
export async function createGoogleCalendarEvent(
  refreshToken: string,
  event: CalendarEventPayload
): Promise<GoogleCalendarEventResult> {
  const accessToken = await refreshAccessToken(refreshToken);
  const timeZone = event.timeZone || 'Asia/Tashkent';

  const body: any = {
    summary: event.summary,
    description: event.description,
    start: {
      dateTime: event.startTime,
      timeZone,
    },
    end: {
      dateTime: event.endTime,
      timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 120 }, // 2 hours before
        { method: 'email', minutes: 120 },
      ],
    },
  };

  if (event.attendeeEmail) {
    body.attendees = [{ email: event.attendeeEmail, displayName: event.attendeeName }];
  }

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Ошибка создания события в Google Календаре');
  }

  return {
    id: data.id,
    htmlLink: data.htmlLink,
    summary: data.summary,
    startTime: data.start?.dateTime || event.startTime,
    endTime: data.end?.dateTime || event.endTime,
    status: data.status || 'confirmed',
  };
}

/**
 * Queries Free/Busy slots from Google Calendar API
 */
export async function getGoogleCalendarFreeBusy(
  refreshToken: string,
  timeMin: string,
  timeMax: string
): Promise<Array<{ start: string; end: string }>> {
  const accessToken = await refreshAccessToken(refreshToken);

  const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: 'Asia/Tashkent',
      items: [{ id: 'primary' }],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Ошибка проверки занятости Google Календаря');
  }

  const busySlots = data.calendars?.primary?.busy || [];
  return busySlots;
}

/**
 * Updates / Reschedules an existing event in user's primary Google Calendar
 */
export async function updateGoogleCalendarEvent(
  refreshToken: string,
  eventId: string,
  updates: Partial<CalendarEventPayload>
): Promise<GoogleCalendarEventResult> {
  const accessToken = await refreshAccessToken(refreshToken);
  const timeZone = updates.timeZone || 'Asia/Tashkent';

  const body: any = {};
  if (updates.summary) body.summary = updates.summary;
  if (updates.description) body.description = updates.description;
  if (updates.startTime) {
    body.start = { dateTime: updates.startTime, timeZone };
  }
  if (updates.endTime) {
    body.end = { dateTime: updates.endTime, timeZone };
  }
  if (updates.attendeeEmail) {
    body.attendees = [{ email: updates.attendeeEmail, displayName: updates.attendeeName }];
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Ошибка обновления события в Google Календаре');
  }

  return {
    id: data.id,
    htmlLink: data.htmlLink,
    summary: data.summary,
    startTime: data.start?.dateTime || updates.startTime || '',
    endTime: data.end?.dateTime || updates.endTime || '',
    status: data.status || 'confirmed',
  };
}

/**
 * Deletes / Cancels an event from user's primary Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  refreshToken: string,
  eventId: string
): Promise<{ success: boolean; eventId: string }> {
  const accessToken = await refreshAccessToken(refreshToken);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok && res.status !== 204 && res.status !== 404 && res.status !== 410) {
    const errorText = await res.text();
    throw new Error(errorText || 'Ошибка удаления события из Google Календаря');
  }

  return { success: true, eventId };
}

/**
 * Searches for an existing event by time window and query to prevent duplicates
 */
export async function findExistingGoogleCalendarEvent(
  refreshToken: string,
  timeMin: string,
  timeMax: string,
  query?: string
): Promise<GoogleCalendarEventResult | null> {
  const accessToken = await refreshAccessToken(refreshToken);
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    maxResults: '5',
  });
  if (query) params.set('q', query);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await res.json();
  if (!res.ok) {
    console.warn('Google Calendar search warning:', data.error?.message);
    return null;
  }

  const items = data.items || [];
  const active = items.find((item: any) => item.status !== 'cancelled');
  if (!active) return null;

  return {
    id: active.id,
    htmlLink: active.htmlLink,
    summary: active.summary,
    startTime: active.start?.dateTime || active.start?.date || '',
    endTime: active.end?.dateTime || active.end?.date || '',
    status: active.status || 'confirmed',
  };
}

/**
 * Universal 1-click Google Calendar web link generator (no API key required)
 */
export function generateDirectGoogleCalendarLink(event: {
  title: string;
  details: string;
  startTime: Date;
  endTime: Date;
}): string {
  const formatGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const startStr = formatGCalDate(event.startTime);
  const endStr = formatGCalDate(event.endTime);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startStr}/${endStr}`,
    details: event.details,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
