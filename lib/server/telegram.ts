import { createHmac } from 'node:crypto';
import { DeliveryRejectedError } from '@/lib/server/channels/errors';

export function telegramWebhookSecret(agentId: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('Подключение Telegram пока недоступно');
  return createHmac('sha256', secret).update(`telegram:${agentId}`).digest('hex');
}
export function telegramWebhookUrl(agentId: string) {
  const origin = process.env.APP_URL || process.env.BETTER_AUTH_URL;
  if (!origin || !origin.startsWith('https://')) throw new Error('Для подключения Telegram нужен публичный HTTPS-адрес приложения');
  const url = new URL('/api/telegram/webhook', origin); url.searchParams.set('agentId', agentId); return url.toString();
}

export function getServiceBotToken(): string | null {
  return process.env.TELEGRAM_SERVICE_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || null;
}

export function getServiceBotUsername(): string {
  return process.env.TELEGRAM_SERVICE_BOT_USERNAME || 'gapcha_assistant_bot';
}

export function serviceBotWebhookSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('Подключение Telegram пока недоступно');
  return createHmac('sha256', secret).update('telegram:service-bot').digest('hex');
}

export function serviceBotWebhookUrl(): string {
  const origin = process.env.APP_URL || process.env.BETTER_AUTH_URL;
  if (!origin || !origin.startsWith('https://')) throw new Error('Для подключения Telegram нужен публичный HTTPS-адрес приложения');
  const url = new URL('/api/telegram/webhook', origin);
  url.searchParams.set('serviceBot', '1');
  return url.toString();
}

export async function connectServiceBot(token: string) {
  const account = await telegramCall<{ username: string }>(token, 'getMe');
  await telegramCall(token, 'setWebhook', {
    url: serviceBotWebhookUrl(),
    secret_token: serviceBotWebhookSecret(),
    allowed_updates: ['message', 'business_message', 'business_connection', 'callback_query'],
  });
  return account;
}
export async function telegramCall<T>(token: string, method: string, body?: Record<string, unknown>): Promise<T> {
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) throw new Error('Проверьте токен Telegram-бота');
  let res: Response;
  try { res = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), signal: AbortSignal.timeout(10000) }); }
  catch { throw new Error('Telegram временно недоступен'); }
  const data = await res.json();
  if (!res.ok || !data.ok) throw new DeliveryRejectedError(res.status === 429 || res.status >= 500);
  return data.result as T;
}
export async function connectTelegram(agentId: string, token: string) {
  const account = await telegramCall<{ username: string }>(token, 'getMe');
  await telegramCall(token, 'setWebhook', {
    url: telegramWebhookUrl(agentId),
    secret_token: telegramWebhookSecret(agentId),
    allowed_updates: ['message', 'business_message', 'business_connection'],
  });
  return account;
}
export async function telegramStatus(agentId: string, token: string | null) {
  if (!token) return { connected: false, username: null };
  try {
    const [account, hook] = await Promise.all([telegramCall<{ username: string }>(token, 'getMe'), telegramCall<{ url: string; last_error_date?: number }>(token, 'getWebhookInfo')]);
    return { connected: hook.url === telegramWebhookUrl(agentId), username: account.username };
  } catch { throw new Error('Не удалось проверить подключение Telegram. Попробуйте ещё раз.'); }
}

/**
 * Sends a chat action indicator (e.g. 'typing') to a Telegram chat.
 * Fails silently so it never interrupts or blocks the message generation pipeline.
 */
export async function sendTelegramChatAction(
  token: string,
  chatId: string | number,
  action: 'typing' | 'upload_photo' | 'record_video' = 'typing',
  businessConnectionId?: string
): Promise<boolean> {
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) return false;
  try {
    const body: Record<string, unknown> = { chat_id: chatId, action };
    if (businessConnectionId) {
      body.business_connection_id = businessConnectionId;
    }
    await telegramCall(token, 'sendChatAction', body);
    return true;
  } catch {
    // Non-fatal: if chat is muted, bot blocked, or network fluctuates, ignore silently
    return false;
  }
}

/**
 * Platform Owner Telegram ID for administrative commands & diagnostics.
 * Server-only verification on every incoming action.
 */
export const TELEGRAM_OWNER_ID = '6804139305';

export function isTelegramAdmin(userId: number | string | undefined | null): boolean {
  if (!userId) return false;
  return String(userId) === String(TELEGRAM_OWNER_ID);
}

export function getUserMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🔗 Подключить аккаунт', callback_data: 'user_connect' },
        { text: '❓ Помощь', callback_data: 'user_help' },
      ],
      [
        { text: '🌐 Открыть кабинет gapcha AI', url: 'https://chorla-ai.vercel.app/dashboard' },
      ],
    ],
  };
}

export function getAdminStartKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📊 Сегодня', callback_data: 'admin_stats_today' },
        { text: '📊 7 дней', callback_data: 'admin_stats_7d' },
        { text: '📊 30 дней', callback_data: 'admin_stats_30d' },
      ],
      [
        { text: '🩺 Диагностика системы', callback_data: 'admin_diag' },
        { text: '🔄 Застрявшие события', callback_data: 'admin_stuck' },
      ],
      [
        { text: '🔗 Подключить аккаунт', callback_data: 'user_connect' },
        { text: '❓ Помощь', callback_data: 'user_help' },
      ],
      [
        { text: '🌐 Открыть кабинет gapcha AI', url: 'https://chorla-ai.vercel.app/dashboard' },
      ],
      [
        { text: '❌ Закрыть меню', callback_data: 'admin_close' },
      ],
    ],
  };
}

export function getAdminMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📊 Сегодня', callback_data: 'admin_stats_today' },
        { text: '📊 7 дней', callback_data: 'admin_stats_7d' },
        { text: '📊 30 дней', callback_data: 'admin_stats_30d' },
      ],
      [
        { text: '🩺 Диагностика системы', callback_data: 'admin_diag' },
        { text: '🔄 Застрявшие события', callback_data: 'admin_stuck' },
      ],
      [
        { text: '❌ Закрыть меню', callback_data: 'admin_close' },
      ],
    ],
  };
}

export async function answerTelegramCallbackQuery(
  token: string,
  callbackQueryId: string,
  text?: string
): Promise<boolean> {
  try {
    await telegramCall(token, 'answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text: text || undefined,
    });
    return true;
  } catch {
    return false;
  }
}


