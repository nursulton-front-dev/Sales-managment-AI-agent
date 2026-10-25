import { NextRequest, NextResponse, connection } from 'next/server';
import {
  verifyMetaSignature,
} from '@/lib/instagram/config';
import {
  getWorkspaceByInstagramUserId,
  getInstagramEventByEventId,
  createInstagramEvent,
  getAllWorkspaces,
} from '@/src/db';
import { processInstagramMessageJob } from '@/lib/instagram/processor';

/**
 * 1. GET: Webhook Verification Endpoint for Meta
 * Meta sends:
 *  - hub.mode = 'subscribe'
 *  - hub.verify_token = '<your_configured_verify_token>'
 *  - hub.challenge = '<numeric_or_string_challenge>'
 */
export async function GET(req: NextRequest) {
  await connection();
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const expectedToken = process.env.INSTAGRAM_VERIFY_TOKEN;

    if (mode === 'subscribe' && token && expectedToken && token === expectedToken) {
      // Respond with the challenge token from the request
      return new Response(challenge || '', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return new Response('Verification token mismatch or invalid mode', { status: 403 });
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
}

/**
 * 2. POST: Inbound Events from Instagram Direct
 * Validates X-Hub-Signature-256 against raw body and INSTAGRAM_APP_SECRET.
 * Fast 200 acknowledgment with durable idempotency queue.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Read raw body buffer for cryptographically accurate HMAC validation
    const rawBodyBuffer = await req.arrayBuffer();
    const rawBodyString = Buffer.from(rawBodyBuffer).toString('utf-8');

    // 2. Validate X-Hub-Signature-256
    const signature = req.headers.get('x-hub-signature-256');
    const appSecret = process.env.INSTAGRAM_APP_SECRET;

    if (!appSecret) {
      console.error('INSTAGRAM_APP_SECRET is not configured on server');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const isValid = verifyMetaSignature(rawBodyString, signature, appSecret);
    if (!isValid) {
      console.warn('Invalid Meta X-Hub-Signature-256 rejected');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 3. Parse JSON payload
    let payload: any;
    try {
      payload = JSON.parse(rawBodyString);
    } catch (parseErr) {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    // Must be instagram or page object
    if (payload.object !== 'instagram' && payload.object !== 'page') {
      return NextResponse.json({ ok: true, ignored: 'Unknown object type' });
    }

    const entries = payload.entry || [];
    const jobsToProcess: Array<{
      eventId: string;
      senderId: string;
      recipientId: string;
      messageText: string;
      timestamp: number;
      workspaceId: string;
    }> = [];

    for (const entry of entries) {
      const messaging = entry.messaging || [];
      const entryId = entry.id; // Instagram account / Page ID

      for (const item of messaging) {
        // Exclude echo messages sent by our own bot / manager
        if (item.message?.is_echo) {
          continue;
        }

        const message = item.message;
        if (!message || !message.text) {
          continue;
        }

        const senderId = item.sender?.id;
        const recipientId = item.recipient?.id;
        const messageId = message.mid;
        const text = message.text;
        const timestamp = item.timestamp || Date.now();

        if (!senderId || !recipientId || !messageId) {
          continue;
        }

        // 4. Resolve destination Workspace by recipientId (which is our connected Instagram User ID)
        let ws = await getWorkspaceByInstagramUserId(recipientId);
        if (!ws) {
          // Fallback check: entryId
          ws = await getWorkspaceByInstagramUserId(entryId);
        }

        if (!ws) {
          // If in test single-account mode, look for workspace with active Instagram connection
          const allWorkspaces = await getAllWorkspaces();
          ws = allWorkspaces.find((w) => w.instagramConnected) || null;
        }

        if (!ws) {
          console.warn(`No active workspace found for Instagram recipient ${recipientId}`);
          continue;
        }

        // 5. Deduplication & Idempotency check:
        // Do not process twice if Meta retries the webhook
        const existingEvent = await getInstagramEventByEventId(messageId);
        if (existingEvent) {
          // Already recorded or replied
          continue;
        }

        // 6. Durable queue: record event in Neon Postgres
        await createInstagramEvent({
          workspaceId: ws.id,
          eventId: messageId,
          senderId,
          recipientId,
          messageText: text,
          rawPayload: item,
          status: 'received',
        });

        jobsToProcess.push({
          eventId: messageId,
          senderId,
          recipientId,
          messageText: text,
          timestamp,
          workspaceId: ws.id,
        });
      }
    }

    // 7. Fire background worker execution for queued jobs
    // In serverless / edge, process immediately in the background loop before completing
    for (const job of jobsToProcess) {
      // Process job asynchronously without blocking HTTP 200 response if possible
      processInstagramMessageJob(job).catch((err) => {
        console.error('Async Instagram message worker failure:', err);
      });
    }

    // 8. Return fast 200 OK to Meta
    return NextResponse.json({ ok: true, queued: jobsToProcess.length });
  } catch (error: any) {
    console.error('Meta webhook processing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
