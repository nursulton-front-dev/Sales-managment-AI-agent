import { NextRequest, NextResponse, connection } from 'next/server';
import { getConversationById, updateConversation, getMessagesByConversationId, createMessage } from '@/src/db';
import { getServerSessionContext } from '@/src/server/auth/session';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const { id } = await params;
    const conv = await getConversationById(id);
    if (!conv) {
      return NextResponse.json({ success: false, error: 'Диалог не найден' }, { status: 404 });
    }

    // Tenant check: strictly prevent IDOR
    if (!session.isSuperAdmin && conv.workspaceId !== session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Доступ запрещён' }, { status: 403 });
    }

    const messages = await getMessagesByConversationId(id);
    return NextResponse.json({ success: true, conversation: conv, messages });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error instanceof Error ? error.message : 'Ошибка запроса') }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const { id } = await params;
    const conv = await getConversationById(id);
    if (!conv) {
      return NextResponse.json({ success: false, error: 'Диалог не найден' }, { status: 404 });
    }

    if (!session.isSuperAdmin && conv.workspaceId !== session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Доступ запрещён' }, { status: 403 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status || !['active', 'human_takeover', 'closed'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Недопустимый статус' }, { status: 400 });
    }

    if (status === 'active') {
      const { cancelConversationEvents } = await import('@/lib/server/channels/events');
      await cancelConversationEvents(id, 'handled_by_operator');
    }

    const updated = await updateConversation(id, { status });
    return NextResponse.json({ success: true, conversation: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error instanceof Error ? error.message : 'Ошибка запроса') }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const { id } = await params;
    const conv = await getConversationById(id);
    if (!conv) {
      return NextResponse.json({ success: false, error: 'Диалог не найден' }, { status: 404 });
    }

    if (!session.isSuperAdmin && conv.workspaceId !== session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Доступ запрещён' }, { status: 403 });
    }

    const body = await req.json();
    const { text, sender = 'human' } = body;

    if (!text) {
      return NextResponse.json({ success: false, error: 'Текст сообщения обязателен' }, { status: 400 });
    }

    if (typeof text !== 'string' || !text.trim() || text.length > 4000 || conv.status === 'closed') return NextResponse.json({ success: false, error: 'Проверьте текст и статус диалога' }, { status: 400 });
    await updateConversation(id, { status: 'human_takeover' });
    const { cancelConversationEvents } = await import('@/lib/server/channels/events');
    await cancelConversationEvents(id, 'human_takeover');

    if (conv.channel === 'Instagram' && conv.clientPhone?.startsWith('ig:')) {
      const { getWorkspaceById } = await import('@/src/db');
      const { decryptToken } = await import('@/lib/instagram/config');
      const { sendInstagramDirectMessage } = await import('@/lib/instagram/client');
      const workspace = await getWorkspaceById(conv.workspaceId);
      const accessToken = workspace?.instagramAccessToken ? decryptToken(workspace.instagramAccessToken) : null;
      if (!accessToken) return NextResponse.json({ success: false, error: 'Переподключите Instagram' }, { status: 409 });
      await sendInstagramDirectMessage({ recipientId: conv.clientPhone.slice(3), text, accessToken });
    } else if (conv.channel === 'Telegram' && conv.clientPhone?.startsWith('id:')) {
      const { getAllAgents, getWorkspaceById } = await import('@/src/db');
      const { telegramCall, getServiceBotToken } = await import('@/lib/server/telegram');
      const [agents, workspace] = await Promise.all([
        getAllAgents(conv.workspaceId),
        getWorkspaceById(conv.workspaceId),
      ]);
      const agent = agents.find((item) => item.id === conv.agentId);
      const isBusinessChat = Boolean(workspace?.telegramBusinessConnectionId && workspace.telegramBusinessConnected);
      const botToken = isBusinessChat
        ? (getServiceBotToken() || agent?.tgBotToken)
        : agent?.tgBotToken;
      if (!botToken) return NextResponse.json({ success: false, error: 'Переподключите Telegram' }, { status: 409 });

      const sendBody: Record<string, unknown> = { chat_id: conv.clientPhone.slice(3), text };
      if (isBusinessChat && workspace?.telegramBusinessConnectionId) {
        sendBody.business_connection_id = workspace.telegramBusinessConnectionId;
      }
      await telegramCall(botToken, 'sendMessage', sendBody);
    } else if (conv.channel === 'WebWidget') {
      // The authenticated visitor reads this persisted reply through their widget session.
    } else {
      return NextResponse.json({ success: false, error: 'В этом диалоге отправка пока недоступна' }, { status: 409 });
    }
    const newMsg = await createMessage({ conversationId: id, workspaceId: conv.workspaceId, sender: 'human', text, tokensCost: 0 });

    return NextResponse.json({ success: true, message: newMsg });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error instanceof Error ? error.message : 'Ошибка запроса') }, { status: 500 });
  }
}
