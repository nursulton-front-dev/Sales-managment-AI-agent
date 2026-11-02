import { NextRequest, NextResponse, after } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import {
  getAllAgents,
  getAllConversations,
  updateWorkspace,
  createConversation,
  createMessage,
  updateConversation,
  getWorkspaceByTelegramBusinessConnectionId,
  getWorkspaceByTelegramBusinessUserId,
  verifyTelegramBusinessBindingUser,
  redeemTelegramBusinessBindingForUser,
} from '@/src/db';
import {
  telegramWebhookSecret,
  serviceBotWebhookSecret,
  telegramCall,
  getServiceBotToken,
} from '@/lib/server/telegram';
import { enqueueEvent, channelId, cancelConversationEvents } from '@/lib/server/channels/events';
import { wakeConversationQueue } from '@/lib/server/channels/processor';
import { readLimitedText, RequestBodyError } from '@/lib/server/request-body';

export const maxDuration = 60;
export async function GET() {
  return NextResponse.json({ status: 'online' });
}

export async function POST(req: NextRequest) {
  try {
    const agentIdParam = req.nextUrl.searchParams.get('agentId');
    const isServiceBot = req.nextUrl.searchParams.get('serviceBot') === '1' || !agentIdParam;
    const provided = req.headers.get('x-telegram-bot-api-secret-token') || '';

    // Validate webhook secret
    if (isServiceBot) {
      let expectedServiceSecret = '';
      try {
        expectedServiceSecret = serviceBotWebhookSecret();
      } catch {
        return NextResponse.json({ ok: false }, { status: 401 });
      }
      if (
        Buffer.byteLength(provided) !== Buffer.byteLength(expectedServiceSecret) ||
        !timingSafeEqual(Buffer.from(provided), Buffer.from(expectedServiceSecret))
      ) {
        return NextResponse.json({ ok: false }, { status: 401 });
      }
    } else {
      const expectedAgentSecret = telegramWebhookSecret(agentIdParam!);
      if (
        Buffer.byteLength(provided) !== Buffer.byteLength(expectedAgentSecret) ||
        !timingSafeEqual(Buffer.from(provided), Buffer.from(expectedAgentSecret))
      ) {
        return NextResponse.json({ ok: false }, { status: 401 });
      }
    }

    const raw = await readLimitedText(req, 100_000);
    let update: Record<string, any>;
    try {
      update = JSON.parse(raw);
    } catch {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { update_id: updateId } = update;

    // 1. Handle Telegram Business Connection update (Secretary mode setup / permission toggle)
    if (update.business_connection) {
      const bc = update.business_connection;
      const userId = String(bc.user?.id || '');
      if (userId) {
        const binding = await redeemTelegramBusinessBindingForUser(userId);
        if (binding) {
          await updateWorkspace(binding.workspaceId, {
            telegramBusinessConnected: Boolean(bc.is_enabled),
            telegramBusinessConnectionId: bc.id,
            telegramBusinessUserId: userId,
            telegramBusinessUsername: bc.user?.username || '',
            telegramBusinessCanReply: Boolean(bc.can_reply),
            telegramBusinessEnabled: Boolean(bc.is_enabled),
            telegramBusinessAgentId: binding.agentId,
            telegramBusinessConnectedAt: new Date(),
          });
        } else {
          const existingWs =
            (await getWorkspaceByTelegramBusinessConnectionId(bc.id)) ||
            (await getWorkspaceByTelegramBusinessUserId(userId));
          if (existingWs) {
            await updateWorkspace(existingWs.id, {
              telegramBusinessConnected: Boolean(bc.is_enabled),
              telegramBusinessConnectionId: bc.is_enabled ? bc.id : null,
              telegramBusinessCanReply: Boolean(bc.can_reply),
              telegramBusinessEnabled: Boolean(bc.is_enabled),
            });
          }
        }
      }
      return NextResponse.json({ ok: true });
    }

    // 2. Handle /start bind_<nonce> deep link to verify Telegram user ID
    if (update.message?.text?.startsWith('/start bind_')) {
      const nonce = update.message.text.slice(12).trim();
      const fromUser = update.message.from;
      if (fromUser?.id && nonce) {
        const verified = await verifyTelegramBusinessBindingUser(nonce, String(fromUser.id), fromUser.username);
        if (verified) {
          const serviceToken = getServiceBotToken();
          if (serviceToken) {
            void telegramCall(serviceToken, 'sendMessage', {
              chat_id: fromUser.id,
              text: '✅ Ваш Telegram-аккаунт успешно верифицирован для компании в gapcha AI!\n\nСледующий шаг:\nОткройте Настройки Telegram → Настройки для бизнеса (Telegram Business) → Чат-боты (Автоматизация чатов), выберите этого бота и нажмите «Подключить».',
            }).catch(() => {});
          }
        }
      }
      return NextResponse.json({ ok: true });
    }

    // 3. Handle Business Message (Telegram Business / Secretary Mode)
    if (update.business_message) {
      const bm = update.business_message;
      const connId = bm.business_connection_id as string | undefined;
      if (!connId || !bm.text || !bm.chat?.id) return NextResponse.json({ ok: true });
      if (!Number.isSafeInteger(updateId) || typeof bm.text !== 'string' || bm.text.length > 8000) {
        return NextResponse.json({ ok: false }, { status: 400 });
      }

      const workspace = await getWorkspaceByTelegramBusinessConnectionId(connId);
      if (!workspace || !workspace.telegramBusinessEnabled || !workspace.telegramBusinessConnected) {
        return NextResponse.json({ ok: true });
      }

      // 3.1 Check if message was sent directly by the business owner from Telegram app
      if (String(bm.from?.id) === workspace.telegramBusinessUserId) {
        const contact = `id:${bm.chat.id}`;
        const agentId = workspace.telegramBusinessAgentId || (await getAllAgents(workspace.id))[0]?.id;
        if (!agentId) return NextResponse.json({ ok: true });
        const convId = channelId('conversation', workspace.id, 'Telegram', agentId, contact);
        const conversation = await createConversation({
          id: convId,
          workspaceId: workspace.id,
          agentId,
          channel: 'Telegram',
          clientName: [bm.chat.first_name, bm.chat.last_name].filter(Boolean).join(' ') || 'Клиент Telegram',
          clientPhone: contact,
        });

        // Trigger human takeover & cancel pending automated replies
        await updateConversation(conversation.id, { status: 'human_takeover' });
        await cancelConversationEvents(conversation.id, 'human_takeover');
        await createMessage({
          id: `in_owner_${updateId}`,
          conversationId: conversation.id,
          workspaceId: workspace.id,
          sender: 'human',
          text: bm.text,
          tokensCost: 0,
        });
        return NextResponse.json({ ok: true });
      }

      // 3.2 Drop bot messages to prevent echo loop
      if (bm.from?.is_bot) return NextResponse.json({ ok: true });

      // 3.3 Incoming message from client to business account
      const contact = `id:${bm.chat.id}`;
      const agentId = workspace.telegramBusinessAgentId || (await getAllAgents(workspace.id))[0]?.id;
      if (!agentId) return NextResponse.json({ ok: true });
      const convId = channelId('conversation', workspace.id, 'Telegram', agentId, contact);

      const event = await enqueueEvent({
        id: channelId('Telegram', agentId, String(updateId)),
        workspaceId: workspace.id,
        channel: 'Telegram',
        conversationId: convId,
        payload: {
          agentId,
          contact,
          clientName: [bm.from?.first_name, bm.from?.last_name].filter((v: unknown) => typeof v === 'string').join(' ').slice(0, 200) || 'Клиент Telegram',
          text: bm.text,
          businessConnectionId: connId,
        },
      });

      after(() => wakeConversationQueue(event.conversationId));
      return NextResponse.json({ ok: true });
    }

    // 4. Handle Standard Bot Message (Custom Bot via agent token)
    if (agentIdParam) {
      const agent = (await getAllAgents()).find((item) => item.id === agentIdParam);
      if (!agent?.tgBotToken) return NextResponse.json({ ok: false }, { status: 404 });

      const message = update.message;
      if (!message?.text || !message.chat?.id) return NextResponse.json({ ok: true });
      if (message.from?.is_bot) return NextResponse.json({ ok: true });
      if (!Number.isSafeInteger(updateId) || typeof message.text !== 'string' || message.text.length > 8000) {
        return NextResponse.json({ ok: false }, { status: 400 });
      }

      const contact = `id:${message.chat.id}`;
      const conversation = (await getAllConversations(agent.workspaceId)).find(
        (item) => item.channel === 'Telegram' && item.agentId === agent.id && item.clientPhone === contact
      );
      const convId = conversation?.id || channelId('conversation', agent.workspaceId, 'Telegram', agent.id, contact);

      const event = await enqueueEvent({
        id: channelId('Telegram', agent.id, String(updateId)),
        workspaceId: agent.workspaceId,
        channel: 'Telegram',
        conversationId: convId,
        payload: {
          agentId: agent.id,
          contact,
          clientName: [message.from?.first_name, message.from?.last_name].filter((value: unknown) => typeof value === 'string').join(' ').slice(0, 200) || 'Клиент Telegram',
          text: message.text,
        },
      });

      after(() => wakeConversationQueue(event.conversationId));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false }, { status: error.status });
    console.error(JSON.stringify({ time: new Date().toISOString(), channel: 'Telegram', code: 'webhook_persistence_failed' }));
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
