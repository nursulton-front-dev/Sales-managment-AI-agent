import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { processAgentMessage } from '@/lib/ai/gateway';
import { getAllAgents, getAllConversations, createConversation, createMessage, getMessagesByConversationId } from '@/src/db';
import { telegramWebhookSecret, telegramCall } from '@/lib/server/telegram';

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
    const { message } = await req.json();
    if (!message?.text || !message.chat?.id) return NextResponse.json({ ok: true });
    const contact = `id:${message.chat.id}`;
    let conversation = (await getAllConversations(agent.workspaceId)).find((item) => item.agentId === id && item.channel === 'Telegram' && item.clientPhone === contact);
    if (!conversation) conversation = await createConversation({ workspaceId: agent.workspaceId, agentId: id, channel: 'Telegram', clientName: [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ') || 'Клиент Telegram', clientPhone: contact, status: 'active' });
    const history = await getMessagesByConversationId(conversation.id);
    await createMessage({ conversationId: conversation.id, workspaceId: agent.workspaceId, sender: 'client', text: message.text, tokensCost: 0 });
    if (agent.isActive && conversation.status === 'active') {
      const result = await processAgentMessage({ message: message.text, agentId: id, workspaceId: agent.workspaceId, clientName: conversation.clientName, clientPhone: contact, channel: 'Telegram', history: history.slice(-12).map((item) => ({ role: item.sender === 'client' ? 'user' : 'assistant', content: item.text })) });
      await telegramCall(agent.tgBotToken, 'sendMessage', { chat_id: message.chat.id, text: result.reply });
      await createMessage({ conversationId: conversation.id, workspaceId: agent.workspaceId, sender: 'agent', text: result.reply, tokensCost: result.tokensCost });
    }
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ ok: false }, { status: 500 }); }
}
