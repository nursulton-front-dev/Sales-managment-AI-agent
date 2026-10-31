import { NextRequest, NextResponse, after } from 'next/server';
import { verifyMetaSignature } from '@/lib/instagram/config';
import { getWorkspaceByInstagramUserId, getInstagramEventByEventId, getAllConversations } from '@/src/db';
import { channelId, enqueueEvent } from '@/lib/server/channels/events';
import { processChannelEvent } from '@/lib/server/channels/processor';
import { readLimitedText, RequestBodyError } from '@/lib/server/request-body';

export const maxDuration = 60;
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const token = req.nextUrl.searchParams.get('hub.verify_token');
  if (mode !== 'subscribe' || !token || token !== process.env.INSTAGRAM_VERIFY_TOKEN) return new Response('Verification failed', { status: 403 });
  return new Response(req.nextUrl.searchParams.get('hub.challenge') || '', { headers: { 'Content-Type': 'text/plain' } });
}

type MetaMessage = { sender?: { id?: string }; recipient?: { id?: string }; message?: { mid?: string; text?: string; is_echo?: boolean } };
type MetaPayload = { object?: string; entry?: Array<{ id?: string; messaging?: MetaMessage[] }> };
export async function POST(req: NextRequest) {
  try {
    const raw = await readLimitedText(req, 1_000_000);
    const secret = process.env.INSTAGRAM_APP_SECRET;
    if (!secret) return NextResponse.json({ error: 'Integration unavailable' }, { status: 503 });
    if (!verifyMetaSignature(raw, req.headers.get('x-hub-signature-256'), secret)) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    let payload: MetaPayload;
    try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Malformed JSON' }, { status: 400 }); }
    if (!['instagram', 'page'].includes(payload?.object || '')) return NextResponse.json({ ok: true });
    const eventIds: string[] = [];
    if (!Array.isArray(payload.entry)) return NextResponse.json({ error: 'Invalid entries' }, { status: 400 });
    for (const entry of payload.entry) {
      if (!Array.isArray(entry.messaging)) continue;
      for (const item of entry.messaging) {
        const message = item?.message;
        const sender = item?.sender?.id;
        const recipient = item?.recipient?.id;
        if (message?.is_echo || typeof message?.text !== 'string' || !message.text.trim() || message.text.length > 8000 || typeof message.mid !== 'string' || typeof sender !== 'string' || typeof recipient !== 'string') continue;
        // Only a stored account identifier can route a message to a workspace.
        const workspace = await getWorkspaceByInstagramUserId(recipient);
        if (!workspace?.instagramConnected || !workspace.instagramAgentId) {
          console.warn(JSON.stringify({ time: new Date().toISOString(), channel: 'Instagram', code: 'unmapped_recipient' }));
          continue;
        }
        // Previously confirmed legacy deliveries must not be replayed during the queue migration.
        const legacy = await getInstagramEventByEventId(message.mid);
        if (legacy) {
          console.warn(JSON.stringify({ time: new Date().toISOString(), channel: 'Instagram', code: 'legacy_event_requires_review' }));
          continue;
        }
        const conversation = (await getAllConversations(workspace.id)).find((item) => item.channel === 'Instagram' && item.clientPhone === `ig:${sender}`);
        const event = await enqueueEvent({ id: channelId('Instagram', workspace.id, message.mid), workspaceId: workspace.id, channel: 'Instagram',
          conversationId: conversation?.id || channelId('conversation', workspace.id, 'Instagram', workspace.instagramAgentId, sender),
          payload: { agentId: workspace.instagramAgentId, contact: `ig:${sender}`, clientName: `Посетитель Instagram ${sender.slice(-4)}`, text: message.text },
        });
        eventIds.push(event.id);
      }
    }
    after(async () => { await Promise.all(eventIds.slice(0, 4).map(processChannelEvent)); });
    return NextResponse.json({ ok: true, queued: eventIds.length });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: 'Invalid payload' }, { status: error.status });
    console.error(JSON.stringify({ time: new Date().toISOString(), channel: 'Instagram', code: 'webhook_persistence_failed' }));
    return NextResponse.json({ error: 'Could not persist event' }, { status: 500 });
  }
}
