'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Globe, Copy, MessageCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataState } from '@/components/ui/DataState';
import { useUnsavedChanges } from '@/lib/useUnsavedChanges';
import { widgetTextColor } from '@/lib/widget-presentation';

type Settings = { agentId: string; enabled: boolean; title: string; greeting: string; color: string; position: string; allowedOrigins: string[] };
type Widget = Settings & { id: string; lastSeenAt: string | null; lastSeenOrigin: string | null };
const defaults: Settings = { agentId: '', enabled: false, title: 'Поможем с вашим вопросом', greeting: 'Здравствуйте! Я ИИ-помощник компании. Чем могу помочь?', color: '#2456a6', position: 'right', allowedOrigins: [] };
const textAreaClass = 'w-full min-h-24 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]';
const settingsOnly = (widget: Settings): Settings => ({ agentId: widget.agentId, enabled: widget.enabled, title: widget.title, greeting: widget.greeting, color: widget.color, position: widget.position, allowedOrigins: widget.allowedOrigins });

export function WebsiteWidgetIntegration() {
  const { agents, showToast } = useApp();
  const [widget, setWidget] = useState<Widget | null>(null);
  const [form, setForm] = useState<Settings>(defaults);
  const [origins, setOrigins] = useState('');
  const [embedOrigin, setEmbedOrigin] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [helping, setHelping] = useState(false);
  const [ticket, setTicket] = useState<number | null>(null);
  const parsed = { ...form, allowedOrigins: origins.split(/\n|,/).map((line) => line.trim()).filter(Boolean) };
  const dirty = JSON.stringify(parsed) !== JSON.stringify(widget ? settingsOnly(widget) : defaults);
  useUnsavedChanges(dirty);
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations/widget');
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Не удалось загрузить настройки чата');
      setWidget(data.widget); setForm(data.widget ? settingsOnly(data.widget) : defaults); setOrigins(data.widget?.allowedOrigins.join('\n') || '');
      setEmbedOrigin(new URL(data.embedOrigin || window.location.origin).origin);
      setError(null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Нет связи с сервером'); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial asynchronous settings request.
  useEffect(() => { void load(); }, [load]);
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => setForm((previous) => ({ ...previous, [key]: value }));
  const snippet = widget && embedOrigin ? `<script src="${embedOrigin}/widget.js" data-widget-id="${widget.id}" defer></script>` : '';
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return; setBusy(true);
    try {
      const response = await fetch('/api/integrations/widget', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Не удалось сохранить');
      setWidget(data.widget); setForm(settingsOnly(data.widget)); setOrigins(data.widget.allowedOrigins.join('\n'));
      showToast('Настройки чата сохранены');
    } catch (failure) { showToast('Настройки не сохранены', failure instanceof Error ? failure.message : 'Ошибка сети', 'error'); }
    finally { setBusy(false); }
  };
  const check = async () => {
    setChecking(true);
    try {
      const response = await fetch('/api/integrations/widget'); const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Проверка недоступна');
      setWidget(data.widget);
      showToast(data.widget?.lastSeenAt ? 'Запрос виджета с сайта обнаружен' : 'Установка пока не обнаружена', data.widget?.lastSeenAt ? data.widget.lastSeenOrigin : 'Откройте страницу сайта с установленным кодом и повторите проверку.');
    } catch (failure) { showToast('Не удалось проверить', failure instanceof Error ? failure.message : 'Ошибка сети', 'error'); }
    finally { setChecking(false); }
  };
  const requestHelp = async () => {
    setHelping(true);
    try {
      const response = await fetch('/api/integrations/widget', { method: 'POST' }); const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Не удалось отправить заявку');
      setTicket(data.ticketNumber); showToast('Заявка на установку отправлена', `Обращение №${data.ticketNumber} доступно в поддержке.`);
    } catch (failure) { showToast('Заявка не отправлена', failure instanceof Error ? failure.message : 'Ошибка сети', 'error'); }
    finally { setHelping(false); }
  };
  return <section className="space-y-4" aria-labelledby="website-widget-title">
    <div className="flex items-center gap-3"><Globe size={24} /><h2 id="website-widget-title" className="text-lg font-semibold">Чат на сайте</h2><Badge variant={widget?.enabled ? 'success' : 'neutral'}>{widget?.enabled ? 'Включён' : 'Выключен'}</Badge></div>
    <p className="text-sm text-[var(--text-secondary)]">Установите ИИ-помощника на сайт. Обращения посетителей появятся в «Диалогах», где сотрудник сможет продолжить общение.</p>
    <DataState loading={loading} error={error} retry={load} />
    {!loading && !error && <>
      <div className="grid xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-5">
        <Card><CardBody><form onSubmit={save} className="space-y-5">
          <Select label="Ответственный ИИ-сотрудник" value={form.agentId} disabled={busy} onChange={(event) => update('agentId', event.target.value)} required options={[{ value: '', label: 'Выберите сотрудника' }, ...agents.map((agent) => ({ value: agent.id, label: `${agent.name}${agent.isActive === false ? ' (выключен)' : ''}` }))]} />
          <div className="space-y-1.5"><label htmlFor="widget-origins" className="block text-xs font-semibold">Разрешённые сайты</label><textarea id="widget-origins" className={textAreaClass} value={origins} onChange={(event) => setOrigins(event.target.value)} placeholder={'https://example.uz\nhttps://www.example.uz'} required disabled={busy} aria-describedby="widget-origins-help" /><p id="widget-origins-help" className="text-xs text-[var(--text-muted)]">До 10 адресов, каждый с новой строки. Указывайте https:// и адрес без пути. www и поддомены добавляются отдельно.</p></div>
          <Input label="Заголовок чата" value={form.title} onChange={(event) => update('title', event.target.value)} maxLength={80} required disabled={busy} />
          <div className="space-y-1.5"><label htmlFor="widget-greeting" className="block text-xs font-semibold">Приветствие</label><textarea id="widget-greeting" className={textAreaClass} value={form.greeting} onChange={(event) => update('greeting', event.target.value)} maxLength={500} required disabled={busy} /></div>
          <div className="grid sm:grid-cols-2 gap-4"><Input label="Цвет кнопки" type="color" value={form.color} onChange={(event) => update('color', event.target.value)} disabled={busy} /><Select label="Положение" value={form.position} onChange={(event) => update('position', event.target.value)} disabled={busy} options={[{ value: 'right', label: 'Справа внизу' }, { value: 'left', label: 'Слева внизу' }]} /></div>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.enabled} onChange={(event) => update('enabled', event.target.checked)} disabled={busy} className="size-5" />Принимать обращения с сайта</label>
          {!agents.length && <p className="text-sm">Сначала <Link href="/dashboard/agents/new" className="underline text-[var(--accent-link)]">создайте сотрудника</Link>.</p>}
          <Button type="submit" isLoading={busy} disabled={!dirty || !agents.length}>Сохранить настройки</Button>
        </form></CardBody></Card>
        <div className="space-y-5"><Card><CardBody><h3 className="font-semibold mb-4">Предпросмотр оформления</h3><div className="rounded-xl border bg-white text-slate-800 overflow-hidden"><div className="px-4 py-4 text-white font-semibold break-words" style={{ backgroundColor: form.color, color: widgetTextColor(form.color) }}>{form.title}</div><div className="p-4 min-h-40"><p className="bg-slate-100 rounded-xl p-3 text-sm whitespace-pre-wrap break-words">{form.greeting}</p></div><div className="p-3 border-t text-sm text-slate-500">Напишите сообщение…</div></div><p className="text-xs text-[var(--text-muted)] mt-3">Здесь показан внешний вид. Проверить ответы можно после установки на сайт.</p></CardBody></Card>
        <Card><CardBody className="space-y-3"><h3 className="font-semibold">Установка вашей командой</h3><p className="text-sm text-[var(--text-secondary)]">Передайте код разработчику сайта или отправьте заявку — поможем установить чат.</p><Button variant="outline" disabled={!widget || dirty || Boolean(ticket)} isLoading={helping} onClick={requestHelp}>Помогите установить</Button>{ticket && <p className="text-sm"><CheckCircle2 className="inline mr-1" size={16} />Заявка №{ticket} создана. <Link href="/dashboard/support" className="underline text-[var(--accent-link)]">Открыть поддержку</Link></p>}</CardBody></Card></div>
      </div>
      <Card><CardBody className="space-y-4"><div className="flex gap-3 items-center"><MessageCircle size={22} /><h3 className="font-semibold">Установить самостоятельно</h3></div>
        {!snippet ? <p className="text-sm text-[var(--text-secondary)]">Сохраните настройки, чтобы получить код для вашего сайта.</p> : <>
          <p className="text-sm text-[var(--text-secondary)]">Скопируйте фрагмент перед закрывающим тегом &lt;/body&gt; на страницах сайта. В конструкторе используйте блок пользовательского HTML или настройку кода сайта.</p>
          <textarea aria-label="Код установки чата" readOnly value={snippet} className={`${textAreaClass} font-mono text-xs!`} onFocus={(event) => event.target.select()} />
          <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={dirty} onClick={async () => { try { await navigator.clipboard.writeText(snippet); showToast('Код скопирован'); } catch { showToast('Выделите и скопируйте код вручную', undefined, 'error'); } }}><Copy size={16} />Скопировать код</Button><Button variant="outline" disabled={dirty} isLoading={checking} onClick={check}>Проверить установку</Button></div>
          {dirty && <p className="text-sm text-[var(--warning-text)]">Сохраните изменения перед установкой.</p>}
          {!widget?.enabled && <p className="text-sm text-[var(--text-secondary)]">Чтобы чат появился на сайте, включите приём обращений и сохраните настройки.</p>}
          <p className="text-sm text-[var(--text-secondary)]" role="status">{widget?.lastSeenAt ? `Последний запрос с сайта: ${widget.lastSeenOrigin}, ${new Date(widget.lastSeenAt).toLocaleString('ru-RU')}.` : 'Запросы виджета с сайта пока не обнаружены.'}</p>
          <p className="text-xs text-[var(--text-muted)]">Проверка фиксирует загрузку виджета. После установки отправьте тестовое сообщение и проверьте ответ в «Диалогах».</p>
        </>}
      </CardBody></Card>
    </>}
  </section>;
}
