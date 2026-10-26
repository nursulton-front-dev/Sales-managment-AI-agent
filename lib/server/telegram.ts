import { createHmac } from 'node:crypto';

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
export async function telegramCall<T>(token: string, method: string, body?: Record<string, unknown>): Promise<T> {
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) throw new Error('Проверьте токен Telegram-бота');
  let res: Response;
  try { res = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), signal: AbortSignal.timeout(10000) }); }
  catch { throw new Error('Telegram временно недоступен'); }
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error('Telegram отклонил запрос. Проверьте подключение бота.');
  return data.result as T;
}
export async function connectTelegram(agentId: string, token: string) {
  const account = await telegramCall<{ username: string }>(token, 'getMe');
  await telegramCall(token, 'setWebhook', { url: telegramWebhookUrl(agentId), secret_token: telegramWebhookSecret(agentId), allowed_updates: ['message'] });
  return account;
}
export async function telegramStatus(agentId: string, token: string | null) {
  if (!token) return { connected: false, username: null };
  try {
    const [account, hook] = await Promise.all([telegramCall<{ username: string }>(token, 'getMe'), telegramCall<{ url: string; last_error_date?: number }>(token, 'getWebhookInfo')]);
    return { connected: hook.url === telegramWebhookUrl(agentId), username: account.username };
  } catch { throw new Error('Не удалось проверить подключение Telegram. Попробуйте ещё раз.'); }
}
