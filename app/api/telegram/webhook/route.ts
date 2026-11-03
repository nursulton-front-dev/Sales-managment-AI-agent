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
  getServiceBotUsername,
  isTelegramAdmin,
  getAdminMenuKeyboard,
  getAdminStartKeyboard,
  getUserMenuKeyboard,
  answerTelegramCallbackQuery,
} from '@/lib/server/telegram';
import {
  getChannelAdminStats,
  formatTelegramStats,
  formatTelegramDiag,
  formatTelegramStuck,
  retryStuckEvent,
} from '@/lib/server/admin/channels-stats';
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let update: Record<string, any>;
    try {
      update = JSON.parse(raw);
    } catch {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { update_id: updateId } = update;

    const getActiveBotToken = async () => {
      if (isServiceBot) {
        return getServiceBotToken();
      }
      if (agentIdParam) {
        const agent = (await getAllAgents()).find((item) => item.id === agentIdParam);
        return agent?.tgBotToken || null;
      }
      return getServiceBotToken();
    };

    // 0. Handle Callback Queries (Interactive buttons in Telegram)
    if (update.callback_query) {
      const cq = update.callback_query;
      const fromId = cq.from?.id;
      const data = cq.data as string;
      const token = await getActiveBotToken();
      const chatId = cq.message?.chat?.id || fromId;

      // 0.1 Public User Callbacks (No admin rights required)
      if (data === 'user_connect' || data === 'user_help' || data === 'user_back') {
        if (token) {
          await answerTelegramCallbackQuery(token, cq.id);
        }
        if (!chatId || !token) return NextResponse.json({ ok: true });

        if (data === 'user_connect') {
          const connectText =
            `🔗 <b>Подключение Telegram-аккаунта к gapcha AI</b>\n\n` +
            `ИИ-сотрудник отвечает клиентам прямо в личных диалогах (Telegram Business / Secretary Mode). Токен от BotFather не требуется.\n\n` +
            `<b>Шаги подключения:</b>\n` +
            `1. Войдите в личный кабинет: <a href="https://chorla-ai.vercel.app/dashboard/integrations">Интеграции → Telegram</a>\n` +
            `2. Выберите нужного сотрудника и нажмите <b>«Сгенерировать ссылку»</b>\n` +
            `3. Нажмите <b>«Открыть в Telegram»</b> для безопасной привязки\n` +
            `4. В Telegram откройте: <b>Настройки → Telegram Business → Чат-боты</b>\n` +
            `5. Добавьте бота <b>@${getServiceBotUsername()}</b> и включите тумблер <b>«Отвечать на сообщения»</b>.`;

          void telegramCall(token, 'editMessageText', {
            chat_id: chatId,
            message_id: cq.message?.message_id,
            text: connectText,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🌐 Открыть кабинет gapcha AI', url: 'https://chorla-ai.vercel.app/dashboard/integrations' }],
                [{ text: '⬅️ Назад', callback_data: 'user_back' }],
              ],
            },
          }).catch(() => {});
          return NextResponse.json({ ok: true });
        }

        if (data === 'user_help') {
          const helpText =
            `❓ <b>Справка и частые вопросы</b>\n\n` +
            `• <b>Нужен ли BotFather токен?</b>\n` +
            `Нет, для Telegram-аккаунта токен не требуется. Бот подключается через официальный Telegram Business.\n\n` +
            `• <b>Что нужно на аккаунте?</b>\n` +
            `Подписка Telegram Premium (включает функции Telegram Business).\n\n` +
            `• <b>Как отключить или поставить на паузу?</b>\n` +
            `В Telegram: <i>Настройки → Telegram Business → Чат-боты</i>. Выключите тумблер «Отвечать на сообщения» или удалите бота.\n\n` +
            `• <b>Что делать, если бот не отвечает?</b>\n` +
            `1. Проверьте тумблер «Отвечать на сообщения».\n` +
            `2. Если вы сами ответили клиенту в диалоге, ИИ передает управление вам (Human Takeover).`;

          void telegramCall(token, 'editMessageText', {
            chat_id: chatId,
            message_id: cq.message?.message_id,
            text: helpText,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔗 Подключить аккаунт', callback_data: 'user_connect' }],
                [{ text: '⬅️ Назад', callback_data: 'user_back' }],
              ],
            },
          }).catch(() => {});
          return NextResponse.json({ ok: true });
        }

        if (data === 'user_back') {
          const isOwner = isTelegramAdmin(fromId);
          const backText = isOwner
            ? `👑 <b>Здравствуйте, администратор gapcha AI!</b>\n\nЭтот бот обслуживает интеграцию Telegram Business (Secretary Mode) для компаний платформы.\n\nИспользуйте кнопки меню ниже для управления.`
            : `👋 <b>Здравствуйте!</b>\n\nЯ — официальный ИИ-ассистент платформы <b>gapcha AI</b>.\n\nЯ подключаюсь к вашему личному или корпоративному аккаунту в режиме <i>Telegram Business (Secretary Mode)</i> и автоматически консультирую клиентов от вашего имени.\n\nВыберите действие:`;

          void telegramCall(token, 'editMessageText', {
            chat_id: chatId,
            message_id: cq.message?.message_id,
            text: backText,
            parse_mode: 'HTML',
            reply_markup: isOwner ? getAdminStartKeyboard() : getUserMenuKeyboard(),
          }).catch(() => {});
          return NextResponse.json({ ok: true });
        }
      }

      // 0.2 Handle Admin Callback Queries (Owner only)
      if (!isTelegramAdmin(fromId)) {
        if (token) {
          await answerTelegramCallbackQuery(token, cq.id, '⛔ Доступ запрещен');
        }
        return NextResponse.json({ ok: true });
      }

      if (token) {
        await answerTelegramCallbackQuery(token, cq.id);
      }

      if (!chatId || !token) return NextResponse.json({ ok: true });

      if (data === 'admin_close') {
        void telegramCall(token, 'editMessageText', {
          chat_id: chatId,
          message_id: cq.message?.message_id,
          text: 'Панель администратора закрыта.',
        }).catch(() => {});
        return NextResponse.json({ ok: true });
      }

      if (data === 'admin_stats_today' || data === 'admin_stats_7d' || data === 'admin_stats_30d') {
        const period = data === 'admin_stats_today' ? 'today' : data === 'admin_stats_7d' ? '7d' : '30d';
        const stats = await getChannelAdminStats(period);
        const text = formatTelegramStats(stats);
        void telegramCall(token, 'editMessageText', {
          chat_id: chatId,
          message_id: cq.message?.message_id,
          text,
          parse_mode: 'HTML',
          reply_markup: getAdminMenuKeyboard(),
        }).catch(() => {});
        return NextResponse.json({ ok: true });
      }

      if (data === 'admin_diag') {
        const stats = await getChannelAdminStats('today');
        const text = formatTelegramDiag(stats);
        void telegramCall(token, 'editMessageText', {
          chat_id: chatId,
          message_id: cq.message?.message_id,
          text,
          parse_mode: 'HTML',
          reply_markup: getAdminMenuKeyboard(),
        }).catch(() => {});
        return NextResponse.json({ ok: true });
      }

      if (data === 'admin_stuck') {
        const stats = await getChannelAdminStats('today');
        const text = formatTelegramStuck(stats);
        void telegramCall(token, 'editMessageText', {
          chat_id: chatId,
          message_id: cq.message?.message_id,
          text,
          parse_mode: 'HTML',
          reply_markup: getAdminMenuKeyboard(),
        }).catch(() => {});
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ ok: true });
    }

    // 0.1 Handle Admin Commands (/admin, /stats, /diag, /retry)
    if (
      update.message?.text?.startsWith('/admin') ||
      update.message?.text?.startsWith('/stats') ||
      update.message?.text?.startsWith('/diag') ||
      update.message?.text?.startsWith('/retry')
    ) {
      const text = update.message.text.trim();
      const fromId = update.message.from?.id;
      const chatId = update.message.chat?.id;
      const token = await getActiveBotToken();

      if (!isTelegramAdmin(fromId)) {
        if (token && chatId) {
          void telegramCall(token, 'sendMessage', {
            chat_id: chatId,
            text: '⛔ У вас нет прав доступа к административным командам платформы.',
          }).catch(() => {});
        }
        return NextResponse.json({ ok: true });
      }

      if (!token || !chatId) return NextResponse.json({ ok: true });

      if (text.startsWith('/admin') || text.startsWith('/stats')) {
        const stats = await getChannelAdminStats('today');
        void telegramCall(token, 'sendMessage', {
          chat_id: chatId,
          text: formatTelegramStats(stats),
          parse_mode: 'HTML',
          reply_markup: getAdminMenuKeyboard(),
        }).catch(() => {});
        return NextResponse.json({ ok: true });
      }

      if (text.startsWith('/diag')) {
        const stats = await getChannelAdminStats('today');
        void telegramCall(token, 'sendMessage', {
          chat_id: chatId,
          text: formatTelegramDiag(stats),
          parse_mode: 'HTML',
          reply_markup: getAdminMenuKeyboard(),
        }).catch(() => {});
        return NextResponse.json({ ok: true });
      }

      if (text.startsWith('/retry')) {
        const eventId = text.replace('/retry', '').trim();
        if (!eventId) {
          const stats = await getChannelAdminStats('today');
          void telegramCall(token, 'sendMessage', {
            chat_id: chatId,
            text: formatTelegramStuck(stats),
            parse_mode: 'HTML',
          }).catch(() => {});
          return NextResponse.json({ ok: true });
        }

        const res = await retryStuckEvent(eventId);
        void telegramCall(token, 'sendMessage', {
          chat_id: chatId,
          text: res.success ? `✅ ${res.message}` : `❌ ${res.message}`,
        }).catch(() => {});
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ ok: true });
    }

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

    // 2. Handle /start and direct service bot messages
    if (update.message?.text?.startsWith('/start')) {
      const text = update.message.text.trim();
      const fromUser = update.message.from;
      const chatId = update.message.chat?.id || fromUser?.id;
      const token = await getActiveBotToken();

      if (text.startsWith('/start bind_')) {
        const nonce = text.slice(12).trim();
        if (fromUser?.id && nonce) {
          const verified = await verifyTelegramBusinessBindingUser(nonce, String(fromUser.id), fromUser.username);
          if (verified && token && chatId) {
            void telegramCall(token, 'sendMessage', {
              chat_id: chatId,
              text: '✅ <b>Ваш Telegram-аккаунт успешно верифицирован для компании в gapcha AI!</b>\n\n' +
                'Следующий шаг:\n' +
                '1. Откройте <b>Настройки Telegram → Telegram Business → Чат-боты</b> (или <i>Автоматизация чатов</i>).\n' +
                '2. Выберите этого бота (<b>@' + (getServiceBotUsername()) + '</b>) и обязательно включите пункт <b>«Отвечать на сообщения»</b>.\n\n' +
                'После этого ИИ-сотрудник начнёт отвечать клиентам в ваших личных диалогах!',
              parse_mode: 'HTML',
            }).catch(() => {});
          } else if (!verified && token && chatId) {
            void telegramCall(token, 'sendMessage', {
              chat_id: chatId,
              text: '⚠️ <b>Срок действия ссылки привязки истёк или она уже была использована.</b>\n\n' +
                'Пожалуйста, вернитесь в личный кабинет gapcha AI в раздел «Интеграции» и нажмите «Сгенерировать ссылку для привязки» снова.',
              parse_mode: 'HTML',
            }).catch(() => {});
          }
        }
        return NextResponse.json({ ok: true });
      }

      // Plain /start (without bind token)
      if (token && chatId) {
        if (isTelegramAdmin(fromUser?.id)) {
          const stats = await getChannelAdminStats('today');
          void telegramCall(token, 'sendMessage', {
            chat_id: chatId,
            text: `👑 <b>Здравствуйте, администратор gapcha AI!</b>\n\n` +
              `Этот бот обслуживает интеграцию Telegram Business (Secretary Mode) для компаний платформы.\n\n` +
              formatTelegramStats(stats),
            parse_mode: 'HTML',
            reply_markup: getAdminStartKeyboard(),
          }).catch(() => {});
        } else {
          void telegramCall(token, 'sendMessage', {
            chat_id: chatId,
            text: '👋 <b>Здравствуйте!</b>\n\n' +
              'Я — официальный ИИ-ассистент платформы <b>gapcha AI</b>.\n\n' +
              'Я подключаюсь к вашему личному или корпоративному аккаунту в режиме <i>Telegram Business (Secretary Mode)</i> и автоматически консультирую клиентов от вашего имени.\n\n' +
              'Выберите действие с помощью кнопок ниже:',
            parse_mode: 'HTML',
            reply_markup: getUserMenuKeyboard(),
          }).catch(() => {});
        }
      }
      return NextResponse.json({ ok: true });
    }

    // 2.1 Handle /help or any other direct message to the Service Bot
    if (isServiceBot && update.message?.chat?.type === 'private' && update.message?.text) {
      const fromUser = update.message.from;
      const chatId = update.message.chat?.id || fromUser?.id;
      const token = await getActiveBotToken();

      if (token && chatId) {
        if (isTelegramAdmin(fromUser?.id)) {
          const stats = await getChannelAdminStats('today');
          void telegramCall(token, 'sendMessage', {
            chat_id: chatId,
            text: `👑 <b>Админ-панель gapcha AI</b>\n\nИспользуйте интерактивные кнопки ниже для навигации или команды:\n• <code>/admin</code> или <code>/stats</code> — сводка за сегодня\n• <code>/diag</code> — диагностика шлюзов и очередей\n• <code>/retry</code> — застрявшие события\n\n` +
              formatTelegramStats(stats),
            parse_mode: 'HTML',
            reply_markup: getAdminMenuKeyboard(),
          }).catch(() => {});
        } else {
          void telegramCall(token, 'sendMessage', {
            chat_id: chatId,
            text: 'ℹ️ <b>Это служебный бот gapcha AI</b>\n\n' +
              'Бот не предназначен для обычной переписки тет-а-тет — он работает как ИИ-секретарь для вашего бизнес-аккаунта Telegram.\n\n' +
              'Для настройки привязки откройте кабинет платформы: <b>Интеграции → Telegram → Сгенерировать ссылку</b>.',
            parse_mode: 'HTML',
          }).catch(() => {});
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
      const clientName = [bm.from?.first_name, bm.from?.last_name].filter((v: unknown) => typeof v === 'string').join(' ').slice(0, 200) || 'Клиент Telegram';
      const convId = channelId('conversation', workspace.id, 'Telegram', agentId, contact);

      // 3.3.1 Ensure conversation and message are saved immediately for instant dashboard visibility
      const conversation = await createConversation({
        id: convId,
        workspaceId: workspace.id,
        agentId,
        channel: 'Telegram',
        clientName,
        clientPhone: contact,
      });

      const eventId = channelId('Telegram', agentId, String(updateId));
      await createMessage({
        id: `in_${eventId}`,
        conversationId: conversation.id,
        workspaceId: workspace.id,
        sender: 'client',
        text: bm.text,
        tokensCost: 0,
      });

      const event = await enqueueEvent({
        id: eventId,
        workspaceId: workspace.id,
        channel: 'Telegram',
        conversationId: conversation.id,
        payload: {
          agentId,
          contact,
          clientName,
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
      const clientName = [message.from?.first_name, message.from?.last_name].filter((value: unknown) => typeof value === 'string').join(' ').slice(0, 200) || 'Клиент Telegram';
      const conversation = (await getAllConversations(agent.workspaceId)).find(
        (item) => item.channel === 'Telegram' && item.agentId === agent.id && item.clientPhone === contact
      );
      const convId = conversation?.id || channelId('conversation', agent.workspaceId, 'Telegram', agent.id, contact);

      // 4.1 Ensure conversation and message are saved immediately
      const savedConv = await createConversation({
        id: convId,
        workspaceId: agent.workspaceId,
        agentId: agent.id,
        channel: 'Telegram',
        clientName,
        clientPhone: contact,
      });

      const eventId = channelId('Telegram', agent.id, String(updateId));
      await createMessage({
        id: `in_${eventId}`,
        conversationId: savedConv.id,
        workspaceId: agent.workspaceId,
        sender: 'client',
        text: message.text,
        tokensCost: 0,
      });

      const event = await enqueueEvent({
        id: eventId,
        workspaceId: agent.workspaceId,
        channel: 'Telegram',
        conversationId: savedConv.id,
        payload: {
          agentId: agent.id,
          contact,
          clientName,
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
