import { NextRequest, NextResponse, after } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getAllAgents, getAllConversations } from '@/src/db';
import { telegramWebhookSecret } from '@/lib/server/telegram';
import { enqueueEvent, channelId } from '@/lib/server/channels/events';
import { processChannelEvent } from '@/lib/server/channels/processor';
import { readLimitedText, RequestBodyError } from '@/lib/server/request-body';

export const maxDuration = 60;
export async function GET() { return NextResponse.json({ status: 'online' }); }
export async function POST(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('agentId');
    const provided = req.headers.get('x-telegram-bot-api-secret-token') || '';
    if (!id) return NextResponse.json({ ok: false }, { status: 401 });
    const expected = telegramWebhookSecret(id);
    if (Buffer.byteLength(provided) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return NextResponse.json({ ok: false }, { status: 401 });
    const agent = (await getAllAgents()).find((item) => item.id === id);
    if (!agent?.tgBotToken) return NextResponse.json({ ok: false }, { status: 404 });
    const raw = await readLimitedText(req, 100_000);
    let update;
    try { update = JSON.parse(raw); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
    const { message, update_id: updateId } = update;
    if (!message?.text || !message.chat?.id) return NextResponse.json({ ok: true });
    if (!Number.isSafeInteger(updateId) || typeof message.text !== 'string' || message.text.length > 8000) return NextResponse.json({ ok: false }, { status: 400 });
    const contact = `id:${message.chat.id}`;
    const conversation = (await getAllConversations(agent.workspaceId)).find((item) => item.channel === 'Telegram' && item.agentId === agent.id && item.clientPhone === contact);
    const event = await enqueueEvent({
      id: channelId('Telegram', agent.id, String(updateId)), workspaceId: agent.workspaceId, channel: 'Telegram',
      conversationId: conversation?.id || channelId('conversation', agent.workspaceId, 'Telegram', agent.id, contact),
      payload: { agentId: agent.id, contact, clientName: [message.from?.first_name, message.from?.last_name].filter((value) => typeof value === 'string').join(' ').slice(0, 200) || 'Клиент Telegram', text: message.text },
    });
    after(() => processChannelEvent(event.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false }, { status: error.status });
    console.error(JSON.stringify({ time: new Date().toISOString(), channel: 'Telegram', code: 'webhook_persistence_failed' }));
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
