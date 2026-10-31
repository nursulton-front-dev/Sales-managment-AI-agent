'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataState } from '@/components/ui/DataState';
import { Activity, RefreshCw, MessageSquare, AlertCircle, ArrowUpRight } from 'lucide-react';

type Event = {
  id: string;
  channel: string;
  status: string;
  attempts: number;
  createdAt: string;
  availableAt: string;
  conversationId: string;
  error: string | null;
};

const labels: Record<string, string> = {
  pending: 'В очереди',
  processing: 'Обрабатывается',
  retry: 'Повторная попытка',
  done: 'Ответ отправлен',
  ignored: 'Без автоответа',
  review: 'Требует проверки',
};

const statusBadgeVariant = (status: string): 'success' | 'warning' | 'neutral' => {
  if (status === 'done') return 'success';
  if (status === 'review' || status === 'retry') return 'warning';
  return 'neutral';
};

export function ChannelEventLog() {
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations/events');
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Не удалось загрузить журнал');
      }
      setEvents(data.events);
      setError(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Нет связи с сервером');
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial async request and polling cleanup.
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [load]);

  const handleRefreshQueue = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/integrations/events', { method: 'POST' });
      if (!response.ok) throw new Error('Не удалось запустить проверку');
      await load();
    } catch {
      setError('Не удалось проверить очередь. Повторите позже.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="channel-events-title">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[var(--text-secondary)]">
            <Activity size={18} />
          </div>
          <div>
            <h2 id="channel-events-title" className="text-base font-semibold text-[var(--text-primary)]">
              Журнал событий каналов
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Последние 30 входящих событий из Telegram, Instagram и сайта.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          isLoading={busy}
          onClick={handleRefreshQueue}
          className="text-xs flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={busy ? 'animate-spin' : ''} />
          <span>Проверить очередь</span>
        </Button>
      </div>

      <DataState loading={loading} error={error} retry={load} />

      {!loading && !error && (
        <Card className="border border-[var(--border)] shadow-xs overflow-hidden">
          <CardBody className="p-0">
            {!events.length ? (
              <div className="p-8 text-center space-y-2">
                <MessageSquare size={28} className="mx-auto text-[var(--text-muted)] opacity-60" />
                <p className="text-sm font-medium text-[var(--text-primary)]">Входящих сообщений пока нет</p>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                  События появятся здесь автоматически, когда клиенты напишут в подключённые каналы.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--surface-secondary)]/60 text-[var(--text-muted)] font-medium border-b border-[var(--border)]">
                    <tr>
                      <th className="py-2.5 px-4">Канал</th>
                      <th className="py-2.5 px-4">Статус</th>
                      <th className="py-2.5 px-4">Попытки</th>
                      <th className="py-2.5 px-4">Время</th>
                      <th className="py-2.5 px-4 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {events.map((event) => (
                      <tr key={event.id} className="hover:bg-[var(--surface-secondary)]/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                          {event.channel === 'WebWidget' ? 'Чат на сайте' : event.channel}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={statusBadgeVariant(event.status)}>
                            {labels[event.status] || event.status}
                          </Badge>
                          {event.error && (
                            <p className="text-[11px] text-[var(--danger-text)] mt-1 flex items-center gap-1">
                              <AlertCircle size={12} className="shrink-0" />
                              <span>{event.error}</span>
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-secondary)]">
                          {event.attempts}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-muted)] whitespace-nowrap">
                          {new Date(event.createdAt).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/dashboard/conversations?conversation=${event.conversationId}`}
                            className="inline-flex items-center gap-1 text-[var(--accent-link)] hover:underline font-medium"
                          >
                            <span>Диалог</span>
                            <ArrowUpRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </section>
  );
}
