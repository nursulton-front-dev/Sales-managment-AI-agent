'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { DataState } from '@/components/ui/DataState';
import { useUnsavedChanges } from '@/lib/useUnsavedChanges';
import { Headphones, X } from 'lucide-react';
import { WebsiteWidgetIntegration } from '@/components/integrations/WebsiteWidgetIntegration';
import { ChannelEventLog } from '@/components/integrations/ChannelEventLog';

type CalendarStatus = { configured: boolean; connected: boolean; email?: string; workingHours: string; slotDuration: number };
type InstagramStatus = { configured: boolean; connected: boolean; username?: string; agentId?: string; autoReply?: boolean; status: string };
export default function IntegrationsPage() {
  const { agents, agentsError, refreshAgents, refreshWorkspace, showToast } = useApp();
  const [tab, setTab] = useState('all');
  const [calendar, setCalendar] = useState<CalendarStatus | null>(null);
  const [instagram, setInstagram] = useState<InstagramStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [agentId, setAgentId] = useState('');
  const [token, setToken] = useState('');
  const [hours, setHours] = useState('');
  const [duration, setDuration] = useState('45');
  const dirty = Boolean(calendar && (hours !== calendar.workingHours || duration !== String(calendar.slotDuration)));
  useUnsavedChanges(dirty || Boolean(token));
  const load = useCallback(async () => {
    try {
      const responses = await Promise.all([fetch('/api/calendar/status'), fetch('/api/instagram/status')]);
      const [cal, ig] = await Promise.all(responses.map((res) => res.json()));
      if (responses.some((res) => !res.ok) || !cal.success || !ig.success) throw new Error('Не удалось проверить подключения. Повторите запрос.');
      setError(null); setCalendar(cal); setInstagram(ig); setHours(cal.workingHours); setDuration(String(cal.slotDuration));
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Ошибка сети'); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- This starts an async API request; state is updated after the response.
  useEffect(() => { void load(); }, [load]);
  const update = async (url: string, body?: unknown, method = 'POST') => {
    if (busy) return false; setBusy(true);
    try { const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); const data = await res.json(); if (!res.ok || !data.success) throw new Error(data.error || 'Не удалось сохранить'); await load(); await refreshWorkspace(); await refreshAgents(); showToast('Изменения сохранены'); return true; }
    catch (failure) { showToast('Не удалось выполнить действие', failure instanceof Error ? failure.message : 'Ошибка сети', 'error'); return false; }
    finally { setBusy(false); }
  };
  const connectedAgents = agents.filter((agent) => agent.telegramConnected);
  return <div className="space-y-6">
    <PageHeader title="Интеграции" description="Подключите каналы, в которых вам пишут клиенты." />
    <div className="flex gap-4 border-b overflow-x-auto" aria-label="Категории интеграций">{[['all', 'Все'], ['messages', 'Мессенджеры'], ['websites', 'Сайты'], ['calendar', 'Календари']].map(([value, label]) => <button key={value} type="button" aria-pressed={tab === value} className={`px-2 py-3 text-sm whitespace-nowrap border-b-2 ${tab === value ? 'border-[var(--accent)] text-[var(--accent-link)] font-semibold' : 'border-transparent text-[var(--text-secondary)]'}`} onClick={() => setTab(value)}>{label}</button>)}</div>
    <DataState loading={loading} error={error || agentsError} retry={() => { void load(); void refreshAgents(); }} />
    {['all', 'messages'].includes(tab) && <section className="space-y-4"><h2 className="text-lg font-semibold">Каналы общения</h2><div className="grid md:grid-cols-3 gap-5">
      {[
        { name: 'Telegram', icon: 'telegram.svg', status: agentsError ? 'Статус недоступен' : connectedAgents.length ? 'Подключён' : 'Не подключён', connected: connectedAgents.length > 0, text: connectedAgents.length ? connectedAgents.map((agent) => `${agent.telegramUsername ? '@' + agent.telegramUsername + ' · ' : ''}${agent.name}`).join(', ') : 'Принимайте сообщения клиентов через вашего бота.', action: () => setTelegramOpen(true), button: connectedAgents.length ? 'Настроить Telegram' : 'Подключить Telegram', disabled: !agents.length || Boolean(agentsError) },
        { name: 'Instagram', icon: 'instagram.svg', status: loading ? 'Проверяем…' : error ? 'Статус недоступен' : instagram?.connected ? 'Подключён' : instagram?.configured ? 'Не подключён' : 'Пока недоступен', connected: Boolean(instagram?.connected), text: instagram?.connected ? `@${instagram.username || 'аккаунт'} · ${agents.find((agent) => agent.id === instagram.agentId)?.name || 'Выберите сотрудника ниже'}` : 'Отвечайте клиентам в Direct и передавайте диалог команде.', action: () => { window.location.href = '/api/instagram/auth'; }, button: 'Подключить Instagram', disabled: loading || !instagram?.configured || Boolean(error) || Boolean(instagram?.connected) },
        { name: 'WhatsApp', icon: 'whatsapp.svg', status: 'Пока недоступен', connected: false, text: 'Подключение WhatsApp Business пока не поддерживается.', action: () => {}, button: 'Подключение недоступно', disabled: true },
      ].map((item) => <Card key={item.name}><CardBody className="h-full flex flex-col gap-5"><div className="flex gap-3 items-center"><Image src={`/integrations/${item.icon}`} width={48} height={48} alt="" /><div><h3 className="font-semibold text-lg">{item.name}</h3><Badge variant={item.connected ? 'success' : 'neutral'}>{item.status}</Badge></div></div><p className="text-sm text-[var(--text-secondary)] flex-1">{item.text}</p><Button variant="outline" disabled={item.disabled || busy} onClick={item.action}>{item.button}</Button></CardBody></Card>)}
    </div>{!agents.length && <p className="text-sm text-[var(--text-secondary)]">Для подключения Telegram сначала <Link href="/dashboard/agents/new" className="text-[var(--accent-link)] underline">создайте сотрудника</Link>.</p>}
    {instagram?.connected && <Card><CardBody className="flex flex-col sm:flex-row sm:items-end gap-4"><Select label="Сотрудник для Instagram" value={instagram.agentId || ''} disabled={busy} onChange={(e) => update('/api/instagram/status', { agentId: e.target.value }, 'PATCH')} options={[{ value: '', label: 'Выберите сотрудника' }, ...agents.map((agent) => ({ value: agent.id, label: agent.name }))]} /><Button variant="outline" disabled={busy || !instagram.agentId} onClick={() => update('/api/instagram/status', { autoReply: !instagram.autoReply }, 'PATCH')}>{instagram.autoReply ? 'Выключить автоответы' : 'Включить автоответы'}</Button><Button variant="ghost" disabled={busy} onClick={() => update('/api/instagram/disconnect')}>Отключить</Button></CardBody></Card>}
    </section>}
    {['all', 'websites'].includes(tab) && <WebsiteWidgetIntegration />}
    {['all', 'calendar'].includes(tab) && <section className="space-y-4"><h2 className="text-lg font-semibold">Календари и запись</h2><Card><CardBody className="flex flex-col sm:flex-row sm:items-center gap-4"><Image src="/integrations/google-calendar.png" width={48} height={48} alt="" /><div className="flex-1"><h3 className="font-semibold text-lg">Google Календарь</h3><Badge variant={calendar?.connected ? 'success' : 'neutral'}>{loading ? 'Проверяем…' : error ? 'Статус недоступен' : calendar?.connected ? 'Подключён' : calendar?.configured ? 'Не подключён' : 'Пока недоступен'}</Badge><p className="text-sm text-[var(--text-secondary)] mt-2">{calendar?.email || 'Подключите календарь компании. Автоматическая запись требует подтверждённого выбора времени.'}</p></div><Button variant="outline" disabled={loading || busy || !calendar?.configured || Boolean(error)} onClick={() => calendar?.connected ? update('/api/calendar/disconnect') : window.location.assign('/api/calendar/auth')}>{calendar?.connected ? 'Отключить' : 'Подключить'}</Button></CardBody></Card>
      {calendar?.connected && <Card><CardBody><form className="flex flex-col sm:flex-row gap-4 sm:items-end" onSubmit={async (e) => { e.preventDefault(); await update('/api/workspace/settings', { googleCalendarWorkingHours: hours, googleCalendarSlotDuration: Number(duration) }, 'PATCH'); }}><Input label="Рабочие часы" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="10:00-18:00" required /><Select label="Длительность записи" value={duration} onChange={(e) => setDuration(e.target.value)} options={[15,30,45,60,90,120].map((n) => ({ value: String(n), label: `${n} минут` }))} /><Button type="submit" isLoading={busy} disabled={!dirty}>Сохранить</Button></form><p className="text-xs text-[var(--text-muted)] mt-3">Часовой пояс: Asia/Tashkent.</p></CardBody></Card>}
    </section>}
    {tab !== 'calendar' && <ChannelEventLog />}
    <Link href="/dashboard/support" className="border rounded-lg p-5 bg-[var(--surface)] flex gap-4 items-center"><Headphones size={24} /><div><p className="font-medium">Нужна помощь с подключением?</p><span className="text-sm text-[var(--accent-link)]">Написать в поддержку →</span></div></Link>
    <Dialog open={telegramOpen} onClose={() => { if (!busy) { setTelegramOpen(false); setToken(''); } }} label="Подключить Telegram" className="w-lg"><form className="p-6 space-y-5" onSubmit={async (e) => { e.preventDefault(); if (await update('/api/agents', { id: agentId, tgBotToken: token }, 'PATCH')) { setTelegramOpen(false); setToken(''); } }}><div className="flex justify-between items-center"><h2 className="text-lg font-semibold">Подключить Telegram</h2><Button variant="ghost" disabled={busy} onClick={() => { setTelegramOpen(false); setToken(''); }} aria-label="Закрыть"><X size={20} /></Button></div><Select label="Ответственный сотрудник" value={agentId} onChange={(e) => setAgentId(e.target.value)} required options={[{ value: '', label: 'Выберите сотрудника' }, ...agents.map((agent) => ({ value: agent.id, label: agent.name }))]} /><Input label="Токен бота из BotFather" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} required /><p className="text-sm text-[var(--text-secondary)]">Бот будет получать сообщения клиентов и передавать их выбранному сотруднику.</p><Button type="submit" isLoading={busy} disabled={!token || !agentId}>Подключить</Button></form></Dialog>
  </div>;
}
