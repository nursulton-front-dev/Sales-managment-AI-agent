'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Globe,
  Camera,
  Bot,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface ChannelStatsData {
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

export default function AdminChannelsPage() {
  const { showToast } = useApp();

  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('today');
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [data, setData] = useState<ChannelStatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (selectedPeriod: 'today' | '7d' | '30d') => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/channels/stats?period=${selectedPeriod}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Не удалось загрузить сводку каналов');
      }
      setData(json.stats);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка сети';
      setError(msg);
      showToast('Ошибка загрузки', msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Asynchronous status refresh on mount and period change.
    void fetchStats(period);
  }, [period, fetchStats]);

  const handleRetryEvent = async (eventId: string) => {
    if (retryingId) return;
    setRetryingId(eventId);
    try {
      const res = await fetch('/api/admin/channels/retry-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || 'Не удалось повторить обработку');
      }
      showToast('Повтор выполнен', json.message, 'success');
      // Refresh current view
      await fetchStats(period);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка повтора';
      showToast('Ошибка повтора', msg, 'error');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Period Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#DC2626]" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Каналы и администрирование Telegram
            </h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Мониторинг очередей, подключённых мессенджеров, трафика ответов ИИ и безопасная диагностика
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[8px] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-[6px] font-medium transition-all ${
                period === 'today'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={() => setPeriod('7d')}
              className={`px-3 py-1.5 rounded-[6px] font-medium transition-all ${
                period === '7d'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              7 дней
            </button>
            <button
              type="button"
              onClick={() => setPeriod('30d')}
              className={`px-3 py-1.5 rounded-[6px] font-medium transition-all ${
                period === '30d'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              30 дней
            </button>
          </div>

          <button
            type="button"
            onClick={() => fetchStats(period)}
            disabled={loading}
            className="p-2 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all disabled:opacity-50"
            title="Обновить данные"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#DC2626]' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-[8px] text-xs text-[var(--danger-text)] flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => fetchStats(period)}
            className="underline font-semibold ml-2 hover:opacity-80"
          >
            Повторить
          </button>
        </div>
      )}

      {/* 2. Top Metric Cards (3 Cards Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Organizations & Channels */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">Каналы и организации</span>
            <Globe className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-1.5 pt-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">Всего компаний:</span>
              <span className="font-semibold font-mono text-[var(--text-primary)]">
                {data?.workspaces.total ?? '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                <Send className="w-3 h-3 text-[#229ED9]" />
                Telegram Business (Secretary):
              </span>
              <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                {data?.workspaces.telegramBusiness ?? '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                <Bot className="w-3 h-3 text-sky-500" />
                Собственные боты:
              </span>
              <span className="font-semibold font-mono text-[var(--text-primary)]">
                {data?.workspaces.customBots ?? '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                <Camera className="w-3 h-3 text-pink-500" />
                Instagram Direct:
              </span>
              <span className="font-semibold font-mono text-[var(--text-primary)]">
                {data?.workspaces.instagram ?? '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-indigo-500" />
                Виджеты на сайтах:
              </span>
              <span className="font-semibold font-mono text-[var(--text-primary)]">
                {data?.workspaces.widgets ?? '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Messages & AI Traffic */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">Трафик сообщений</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-1.5 pt-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">Входящие от клиентов:</span>
              <span className="font-semibold font-mono text-[var(--text-primary)]">
                {data?.messages.incoming ?? '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">Ответы ИИ-сотрудников:</span>
              <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                {data?.messages.agentReplies ?? '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">Перехваты оператором:</span>
              <span className="font-semibold font-mono text-sky-600 dark:text-sky-400">
                {data?.messages.operatorReplies ?? '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">Использовано токенов:</span>
              <span className="font-semibold font-mono text-[var(--text-primary)]">
                {data ? data.messages.tokensUsed.toLocaleString('ru-RU') : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-[var(--border)]">
              <span className="text-[var(--text-secondary)]">Среднее время ответа:</span>
              <span className="font-semibold font-mono text-[var(--text-primary)]">
                {data?.queue.avgResponseTimeSeconds !== null && data?.queue.avgResponseTimeSeconds !== undefined
                  ? `${data.queue.avgResponseTimeSeconds} сек.`
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Queue & Reliability */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">Очередь и надёжность</span>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-1.5 pt-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">Доставлено успешно:</span>
              <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                {data?.queue.done ?? '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">Ожидает / В процессе:</span>
              <span className="font-semibold font-mono text-amber-600 dark:text-amber-400">
                {data?.queue.pending ?? '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">Повторы (просрочено):</span>
              <span className="font-semibold font-mono text-rose-600 dark:text-rose-400">
                {data ? `${data.queue.retry} (${data.queue.overdueRetries})` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">Требует проверки (review):</span>
              <span className="font-semibold font-mono text-[var(--text-primary)]">
                {data?.queue.review ?? '—'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-[var(--border)]">
              <span className="text-[var(--text-secondary)]">Активных сотрудников:</span>
              <span className="font-semibold font-mono text-[var(--text-primary)]">
                {data ? `${data.agents.activeCount} из ${data.agents.totalCount}` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. System Diagnostics */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Диагностика системной интеграции
          </h2>
          <span className="text-[11px] text-[var(--text-muted)] font-mono">
            Авторизация: SuperAdmin · Server-Verified
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Telegram Webhook Ping */}
          <div className="p-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-primary)]">Telegram Webhook</span>
              {data?.diagnostics.webhookOnline ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> В сети
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-3 h-3" /> Не отвечает
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Задержка проверки: {data ? `${data.diagnostics.webhookLatencyMs} мс` : '—'}
            </p>
          </div>

          {/* Queue & Cron Worker */}
          <div className="p-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-primary)]">Фоновый обработчик</span>
              {data?.diagnostics.cronConfigured ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Cron активен
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3 h-3" /> Cron не настроен
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Обработка повторов очереди channel_events
            </p>
          </div>

          {/* Telegram Bot Commands */}
          <div className="p-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-primary)]">Управление в Telegram</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> Закрытый доступ
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Команды <code>/admin</code>, <code>/stats</code>, <code>/diag</code>, <code>/retry</code>
            </p>
          </div>
        </div>
      </div>

      {/* 4. Stuck Events with Safe Single-Event Retry */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              Застрявшие события очереди ({data?.diagnostics.stuckEvents.length ?? 0})
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              События со статусом retry или review. Повторная обработка идемпотентна (без дублей сообщений и списаний).
            </p>
          </div>
        </div>

        {data && data.diagnostics.stuckEvents.length > 0 ? (
          <div className="overflow-x-auto border border-[var(--border)] rounded-[6px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--surface-secondary)] border-b border-[var(--border)] text-[var(--text-secondary)] font-semibold">
                <tr>
                  <th className="p-2.5">ID события</th>
                  <th className="p-2.5">Канал</th>
                  <th className="p-2.5">Статус</th>
                  <th className="p-2.5">Этап</th>
                  <th className="p-2.5 text-center">Попыток</th>
                  <th className="p-2.5">Код ошибки</th>
                  <th className="p-2.5">Создано</th>
                  <th className="p-2.5 text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-mono">
                {data.diagnostics.stuckEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                    <td className="p-2.5 text-[var(--text-primary)] truncate max-w-[160px]" title={evt.id}>
                      {evt.id}
                    </td>
                    <td className="p-2.5 text-[var(--text-secondary)] font-sans">{evt.channel}</td>
                    <td className="p-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                        {evt.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-[var(--text-secondary)]">{evt.stage}</td>
                    <td className="p-2.5 text-center text-[var(--text-primary)]">{evt.attempts}</td>
                    <td className="p-2.5 text-rose-600 dark:text-rose-400">{evt.errorCode || '—'}</td>
                    <td className="p-2.5 text-[var(--text-muted)] text-[11px] font-sans">
                      {new Date(evt.createdAt).toLocaleTimeString('ru-RU')}
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleRetryEvent(evt.id)}
                        disabled={retryingId === evt.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-[#DC2626] hover:bg-[#b91c1c] text-white text-[11px] font-sans font-medium transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Play className={`w-3 h-3 ${retryingId === evt.id ? 'animate-spin' : ''}`} />
                        <span>{retryingId === evt.id ? 'Повтор…' : 'Повторить'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-[var(--text-muted)] bg-[var(--surface-secondary)]/50 rounded-[6px] border border-dashed border-[var(--border)]">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-[var(--text-primary)]">Очередь работает в штатном режиме</p>
            <p className="text-[11px] mt-0.5">Нет застрявших событий или требующих ручного вмешательства.</p>
          </div>
        )}
      </div>

      {/* 5. Sanitized Recent Errors */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            Обезличенный журнал последних ошибок
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Только системные коды ошибок и каналы. Персональные данные, телефоны и тексты сообщений не логируются.
          </p>
        </div>

        {data && data.diagnostics.recentSanitizedErrors.length > 0 ? (
          <div className="overflow-x-auto border border-[var(--border)] rounded-[6px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--surface-secondary)] border-b border-[var(--border)] text-[var(--text-secondary)] font-semibold">
                <tr>
                  <th className="p-2.5">ID события</th>
                  <th className="p-2.5">Канал</th>
                  <th className="p-2.5">Код ошибки</th>
                  <th className="p-2.5 text-center">Попыток</th>
                  <th className="p-2.5 text-right">Время</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-mono">
                {data.diagnostics.recentSanitizedErrors.map((err) => (
                  <tr key={err.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                    <td className="p-2.5 text-[var(--text-primary)] truncate max-w-[200px]" title={err.id}>
                      {err.id}
                    </td>
                    <td className="p-2.5 text-[var(--text-secondary)] font-sans">{err.channel}</td>
                    <td className="p-2.5 text-rose-600 dark:text-rose-400 font-semibold">{err.errorCode}</td>
                    <td className="p-2.5 text-center text-[var(--text-primary)]">{err.attempts}</td>
                    <td className="p-2.5 text-right text-[var(--text-muted)] text-[11px] font-sans">
                      {new Date(err.createdAt).toLocaleTimeString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-[var(--text-muted)] bg-[var(--surface-secondary)]/50 rounded-[6px] border border-dashed border-[var(--border)]">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
            <p className="text-[11px]">Ошибок отправки или обработки за выбранный период не зафиксировано.</p>
          </div>
        )}
      </div>
    </div>
  );
}
