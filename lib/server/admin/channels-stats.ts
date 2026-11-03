import { and, desc, eq, gte, inArray, isNotNull, lte, or, sql } from 'drizzle-orm';
import { db, getAllAgents, getAllWorkspaces } from '@/src/db';
import {
  channelEvents,
  messages,
  websiteWidgets,
} from '@/src/db/schema';
import { localIntegrations } from '@/lib/server/channels/local-store';
import { getChannelEvent, patchEvent } from '@/lib/server/channels/events';
import { processChannelEvent } from '@/lib/server/channels/processor';

export interface ChannelAdminStats {
  period: 'today' | '7d' | '30d';
  generatedAt: string;
  workspaces: {
    total: number;
    telegramBusiness: number;
    customBots: number;
    instagram: number;
    widgets: number;
  };
  messages: {
    incoming: number;
    agentReplies: number;
    operatorReplies: number;
    tokensUsed: number;
  };
  agents: {
    totalCount: number;
    activeCount: number;
  };
  queue: {
    totalEvents: number;
    done: number;
    pending: number;
    retry: number;
    review: number;
    ignored: number;
    overdueRetries: number;
    avgResponseTimeSeconds: number | null;
  };
  diagnostics: {
    webhookOnline: boolean;
    webhookLatencyMs: number;
    queueActive: boolean;
    cronConfigured: boolean;
    recentSanitizedErrors: Array<{
      id: string;
      channel: string;
      errorCode: string;
      attempts: number;
      createdAt: string;
    }>;
    stuckEvents: Array<{
      id: string;
      channel: string;
      status: string;
      stage: string;
      attempts: number;
      errorCode: string | null;
      createdAt: string;
    }>;
  };
}

export function getPeriodStartDate(period: 'today' | '7d' | '30d'): Date {
  const now = new Date();
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  }
  if (period === '7d') {
    return new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  }
  return new Date(now.getTime() - 30 * 24 * 3600 * 1000);
}

export async function getChannelAdminStats(period: 'today' | '7d' | '30d' = 'today'): Promise<ChannelAdminStats> {
  const periodStart = getPeriodStartDate(period);
  const now = new Date();

  // 1. Workspaces & Agents breakdown
  const [allWs, allAg] = await Promise.all([
    getAllWorkspaces(),
    getAllAgents(),
  ]);

  let totalWidgets = 0;
  if (db) {
    try {
      const widgets = await db.select({ count: sql<number>`count(*)` })
        .from(websiteWidgets)
        .where(eq(websiteWidgets.enabled, true));
      totalWidgets = Number(widgets[0]?.count || 0);
    } catch {
      totalWidgets = 0;
    }
  }

  const workspacesData = {
    total: allWs.length,
    telegramBusiness: allWs.filter((w) => Boolean(w.telegramBusinessConnected)).length,
    customBots: allAg.filter((a) => Boolean(a.tgBotToken)).length,
    instagram: allWs.filter((w) => Boolean(w.instagramConnected)).length,
    widgets: totalWidgets,
  };

  const agentsData = {
    totalCount: allAg.length,
    activeCount: allAg.filter((a) => a.isActive).length,
  };

  // 2. Messages metrics in period
  let incoming = 0;
  let agentReplies = 0;
  let operatorReplies = 0;
  let tokensUsed = 0;

  if (db) {
    try {
      const msgs = await db.select({
        sender: messages.sender,
        tokensCost: messages.tokensCost,
      })
      .from(messages)
      .where(gte(messages.createdAt, periodStart));

      for (const m of msgs) {
        if (m.sender === 'client') incoming += 1;
        else if (m.sender === 'agent') agentReplies += 1;
        else if (m.sender === 'human') operatorReplies += 1;
        tokensUsed += Number(m.tokensCost || 0);
      }
    } catch (err) {
      console.warn('Error querying messages for admin stats:', err);
    }
  }

  // 3. Queue & Channel Events metrics
  let totalEvents = 0;
  let done = 0;
  let pending = 0;
  let retry = 0;
  let review = 0;
  let ignored = 0;
  let overdueRetries = 0;
  const responseTimes: number[] = [];
  let recentErrors: Array<{ id: string; channel: string; errorCode: string; attempts: number; createdAt: string }> = [];
  let stuckList: Array<{ id: string; channel: string; status: string; stage: string; attempts: number; errorCode: string | null; createdAt: string }> = [];

  if (db) {
    try {
      const eventsInPeriod = await db.select()
        .from(channelEvents)
        .where(gte(channelEvents.createdAt, periodStart));

      totalEvents = eventsInPeriod.length;
      for (const ev of eventsInPeriod) {
        if (ev.status === 'done') {
          done += 1;
          if (ev.stage === 'delivered' && ev.updatedAt && ev.createdAt) {
            const diffSec = (new Date(ev.updatedAt).getTime() - new Date(ev.createdAt).getTime()) / 1000;
            if (diffSec >= 0 && diffSec < 86400) {
              responseTimes.push(diffSec);
            }
          }
        } else if (ev.status === 'pending') pending += 1;
        else if (ev.status === 'retry') {
          retry += 1;
          if (new Date(ev.availableAt) < now) overdueRetries += 1;
        } else if (ev.status === 'review') review += 1;
        else if (ev.status === 'ignored') ignored += 1;
      }

      // Recent sanitized errors (zero message payloads or PII)
      const errRows = await db.select({
        id: channelEvents.id,
        channel: channelEvents.channel,
        errorCode: channelEvents.errorCode,
        attempts: channelEvents.attempts,
        createdAt: channelEvents.createdAt,
      })
      .from(channelEvents)
      .where(isNotNull(channelEvents.errorCode))
      .orderBy(desc(channelEvents.createdAt))
      .limit(10);

      recentErrors = errRows.map((r) => ({
        id: r.id.length > 16 ? `${r.id.slice(0, 14)}…` : r.id,
        channel: r.channel,
        errorCode: r.errorCode || 'unknown_error',
        attempts: r.attempts,
        createdAt: new Date(r.createdAt).toISOString(),
      }));

      // Stuck events
      const stuckRows = await db.select()
        .from(channelEvents)
        .where(or(
          inArray(channelEvents.status, ['retry', 'review']),
          and(eq(channelEvents.status, 'processing'), lte(channelEvents.lockedUntil, now))
        ))
        .orderBy(desc(channelEvents.createdAt))
        .limit(10);

      stuckList = stuckRows.map((r) => ({
        id: r.id,
        channel: r.channel,
        status: r.status,
        stage: r.stage,
        attempts: r.attempts,
        errorCode: r.errorCode,
        createdAt: new Date(r.createdAt).toISOString(),
      }));
    } catch (err) {
      console.warn('Error querying channel_events for admin stats:', err);
    }
  } else {
    // Local fallback store
    localIntegrations((store) => {
      const eventsInPeriod = store.events.filter((e) => new Date(e.createdAt) >= periodStart);
      totalEvents = eventsInPeriod.length;
      for (const ev of eventsInPeriod) {
        if (ev.status === 'done') {
          done += 1;
          if (ev.stage === 'delivered' && ev.updatedAt && ev.createdAt) {
            const diffSec = (new Date(ev.updatedAt).getTime() - new Date(ev.createdAt).getTime()) / 1000;
            if (diffSec >= 0 && diffSec < 86400) responseTimes.push(diffSec);
          }
        } else if (ev.status === 'pending') pending += 1;
        else if (ev.status === 'retry') {
          retry += 1;
          if (new Date(ev.availableAt) < now) overdueRetries += 1;
        } else if (ev.status === 'review') review += 1;
        else if (ev.status === 'ignored') ignored += 1;
      }

      recentErrors = store.events
        .filter((e) => e.errorCode)
        .slice(-10)
        .reverse()
        .map((r) => ({
          id: r.id.length > 16 ? `${r.id.slice(0, 14)}…` : r.id,
          channel: r.channel,
          errorCode: r.errorCode || 'unknown_error',
          attempts: r.attempts,
          createdAt: new Date(r.createdAt).toISOString(),
        }));

      stuckList = store.events
        .filter((e) => ['retry', 'review'].includes(e.status) || (e.status === 'processing' && e.lockedUntil && new Date(e.lockedUntil) < now))
        .slice(-10)
        .reverse()
        .map((r) => ({
          id: r.id,
          channel: r.channel,
          status: r.status,
          stage: r.stage,
          attempts: r.attempts,
          errorCode: r.errorCode,
          createdAt: new Date(r.createdAt).toISOString(),
        }));
    });
  }

  const avgResponseTimeSeconds = responseTimes.length > 0
    ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10
    : null;

  // 4. Live Telegram Webhook Ping Diagnostics
  let webhookOnline = false;
  let webhookLatencyMs = 0;
  const baseUrl = process.env.APP_URL || process.env.BETTER_AUTH_URL || 'https://chorla-ai.vercel.app';
  try {
    const t0 = Date.now();
    const res = await fetch(`${baseUrl}/api/telegram/webhook`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    webhookLatencyMs = Date.now() - t0;
    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      webhookOnline = json.status === 'online';
    }
  } catch {
    webhookOnline = false;
    webhookLatencyMs = 0;
  }

  return {
    period,
    generatedAt: now.toISOString(),
    workspaces: workspacesData,
    messages: {
      incoming,
      agentReplies,
      operatorReplies,
      tokensUsed,
    },
    agents: agentsData,
    queue: {
      totalEvents,
      done,
      pending,
      retry,
      review,
      ignored,
      overdueRetries,
      avgResponseTimeSeconds,
    },
    diagnostics: {
      webhookOnline,
      webhookLatencyMs,
      queueActive: totalEvents > 0 || Boolean(process.env.CRON_SECRET),
      cronConfigured: Boolean(process.env.CRON_SECRET),
      recentSanitizedErrors: recentErrors,
      stuckEvents: stuckList,
    },
  };
}

/**
 * Safely retry a single stuck event.
 * Guarantees idempotency: checks delivered stage, avoids double send and double debit.
 */
export async function retryStuckEvent(eventId: string): Promise<{
  success: boolean;
  message: string;
  stage?: string;
  status?: string;
}> {
  const event = await getChannelEvent(eventId);
  if (!event) {
    return { success: false, message: 'Событие не найдено' };
  }

  if (event.stage === 'delivered' || event.status === 'done') {
    return { success: false, message: 'Событие уже успешно доставлено клиенту' };
  }

  // Safety: reset retry timer so claimEvent can immediately process it
  const now = new Date();
  await patchEvent(eventId, {
    status: 'retry',
    availableAt: now,
    lockedUntil: null,
  });

  try {
    await processChannelEvent(eventId);
    const updated = await getChannelEvent(eventId);
    return {
      success: true,
      message: updated?.status === 'done' ? 'Событие успешно обработано' : `Событие переведено в статус: ${updated?.status || 'retry'}`,
      status: updated?.status,
      stage: updated?.stage,
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return {
      success: false,
      message: `Ошибка при обработке: ${errMsg}`,
    };
  }
}

export function formatTelegramStats(stats: ChannelAdminStats): string {
  const periodMap = {
    today: 'Сегодня',
    '7d': 'За 7 дней',
    '30d': 'За 30 дней',
  };
  const label = periodMap[stats.period] || stats.period;

  return [
    `👑 <b>Админ-панель gapcha AI</b>`,
    `📅 <b>Сводка показателей (${label})</b>`,
    ``,
    `🏢 <b>Организации и каналы:</b>`,
    `• Всего компаний: ${stats.workspaces.total}`,
    `• Telegram Business (Secretary): ${stats.workspaces.telegramBusiness}`,
    `• Свои Telegram-боты: ${stats.workspaces.customBots}`,
    `• Instagram Direct: ${stats.workspaces.instagram}`,
    `• Виджеты на сайтах: ${stats.workspaces.widgets}`,
    ``,
    `💬 <b>Трафик сообщений:</b>`,
    `• Входящие от клиентов: ${stats.messages.incoming}`,
    `• Ответы ИИ: ${stats.messages.agentReplies}`,
    `• Перехваты оператором: ${stats.messages.operatorReplies}`,
    `• Использовано токенов: ${stats.messages.tokensUsed.toLocaleString('ru-RU')}`,
    `• Среднее время ответа: ${stats.queue.avgResponseTimeSeconds !== null ? `${stats.queue.avgResponseTimeSeconds} сек.` : 'н/д'}`,
    ``,
    `⚙️ <b>Очередь и надежность:</b>`,
    `• Завершено успешно: ${stats.queue.done}`,
    `• Ожидает / В процессе: ${stats.queue.pending}`,
    `• Повторные попытки: ${stats.queue.retry} (просрочено: ${stats.queue.overdueRetries})`,
    `• Требует ручной проверки: ${stats.queue.review}`,
    `• Активных ИИ-сотрудников: ${stats.agents.activeCount} из ${stats.agents.totalCount}`,
  ].join('\n');
}

export function formatTelegramDiag(stats: ChannelAdminStats): string {
  const d = stats.diagnostics;
  const webhookLine = d.webhookOnline
    ? `✅ <b>Telegram Webhook:</b> В сети (${d.webhookLatencyMs} мс)`
    : `❌ <b>Telegram Webhook:</b> Не отвечает`;
  const cronLine = d.cronConfigured
    ? `✅ <b>CRON_SECRET:</b> Настроен для повторов`
    : `⚠️ <b>CRON_SECRET:</b> Не настроен в окружении`;

  const errorsList = d.recentSanitizedErrors.length > 0
    ? d.recentSanitizedErrors.slice(0, 5).map((e) => `• <code>${e.id}</code> [${e.channel}] код: <code>${e.errorCode}</code> (попыток: ${e.attempts})`).join('\n')
    : '• Ошибок не зафиксировано';

  return [
    `🩺 <b>Диагностика системы gapcha AI</b>`,
    ``,
    webhookLine,
    cronLine,
    `📦 <b>Застрявших событий:</b> ${d.stuckEvents.length}`,
    ``,
    `⚠️ <b>Последние ошибки (обезличенные):</b>`,
    errorsList,
  ].join('\n');
}

export function formatTelegramStuck(stats: ChannelAdminStats): string {
  const stuck = stats.diagnostics.stuckEvents;
  if (stuck.length === 0) {
    return '✅ <b>Очередь чиста</b>\n\nЗастрявших или требующих ручного вмешательства событий нет.';
  }

  const list = stuck.slice(0, 5).map((e) => {
    return `• Событие <code>${e.id}</code>\n  Канал: ${e.channel} | Статус: ${e.status} | Этап: ${e.stage} | Код: ${e.errorCode || 'нет'}`;
  }).join('\n\n');

  return [
    `🔄 <b>Застрявшие события (${stuck.length}):</b>`,
    ``,
    list,
    ``,
    `<i>Для безопасного повтора отправьте:</i>\n<code>/retry ID_СОБЫТИЯ</code>`,
  ].join('\n');
}

