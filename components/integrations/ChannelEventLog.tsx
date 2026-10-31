'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataState } from '@/components/ui/DataState';

type Event = { id: string; channel: string; status: string; attempts: number; createdAt: string; availableAt: string; conversationId: string; error: string | null };
const labels: Record<string, string> = { pending: 'В очереди', processing: 'Обрабатывается', retry: 'Повторная попытка', done: 'Ответ отправлен', ignored: 'Без автоответа', review: 'Требует проверки' };
export function ChannelEventLog() {
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const response = await fetch('/api/integrations/events'); const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || 'Не удалось загрузить журнал'); setEvents(data.events); setError(null); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Нет связи с сервером'); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial async request and polling cleanup.
  useEffect(() => { void load(); const timer = setInterval(() => { if (!document.hidden) void load(); }, 15000); return () => clearInterval(timer); }, [load]);
  return <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Обработка сообщений</h2><Button variant="outline" size="sm" isLoading={busy} onClick={async () => { setBusy(true); try { const response = await fetch('/api/integrations/events', { method: 'POST' }); if (!response.ok) throw new Error('Не удалось запустить проверку'); await load(); } catch { setError('Не удалось проверить очередь. Повторите позже.'); } finally { setBusy(false); } }}>Проверить очередь</Button></div>
    <p className="text-sm text-[var(--text-secondary)]">Последние 30 событий. Временные сбои повторяются автоматически при настроенном обработчике очереди. События с неизвестным результатом требуют проверки сотрудником.</p>
    <DataState loading={loading} error={error} retry={load} />
    {!loading && !error && <Card><CardBody>{!events.length ? <p className="text-sm text-[var(--text-secondary)]">Входящих сообщений пока нет.</p> : <ul className="divide-y divide-[var(--border)]">{events.map((event) => <li key={event.id} className="py-3 space-y-1"><div className="flex flex-wrap justify-between gap-2"><span className="font-medium text-sm">{event.channel === 'WebWidget' ? 'Сайт' : event.channel}</span><Badge variant={event.status === 'done' ? 'success' : event.status === 'review' ? 'warning' : 'neutral'}>{labels[event.status] || event.status}</Badge></div><p className="text-xs text-[var(--text-muted)]">{new Date(event.createdAt).toLocaleString('ru-RU')} · Попыток: {event.attempts}</p>{event.error && <p className="text-sm text-[var(--text-secondary)]">{event.error}</p>}<Link className="text-xs underline text-[var(--accent-link)]" href={`/dashboard/conversations?conversation=${event.conversationId}`}>Открыть диалог</Link></li>)}</ul>}</CardBody></Card>}
  </section>;
}
