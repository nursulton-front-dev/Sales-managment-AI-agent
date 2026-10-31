'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Globe,
  Copy,
  Check,
  MessageCircle,
  CheckCircle2,
  Code2,
  Terminal,
  Sliders,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Send,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataState } from '@/components/ui/DataState';
import { useUnsavedChanges } from '@/lib/useUnsavedChanges';
import { widgetTextColor } from '@/lib/widget-presentation';

type Settings = {
  agentId: string;
  enabled: boolean;
  title: string;
  greeting: string;
  color: string;
  position: string;
  allowedOrigins: string[];
};

type Widget = Settings & {
  id: string;
  lastSeenAt: string | null;
  lastSeenOrigin: string | null;
};

const defaults: Settings = {
  agentId: '',
  enabled: false,
  title: 'Поможем с вашим вопросом',
  greeting: 'Здравствуйте! Я ИИ-помощник компании. Чем могу помочь?',
  color: '#E52329',
  position: 'right',
  allowedOrigins: [],
};

const COLOR_PRESETS = [
  { name: 'Chorla Red', value: '#E52329' },
  { name: 'Electric Blue', value: '#2563EB' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Deep Slate', value: '#0F172A' },
  { name: 'Royal Purple', value: '#7C3AED' },
  { name: 'Amber', value: '#D97706' },
];

const textAreaClass =
  'w-full min-h-24 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition-colors';

const settingsOnly = (widget: Settings): Settings => ({
  agentId: widget.agentId,
  enabled: widget.enabled,
  title: widget.title,
  greeting: widget.greeting,
  color: widget.color,
  position: widget.position,
  allowedOrigins: widget.allowedOrigins,
});

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

  // Installation mode tab: ready snippet (default for business) vs REST API (for developers)
  const [installMode, setInstallMode] = useState<'snippet' | 'api'>('snippet');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedApi, setCopiedApi] = useState(false);

  const parsed: Settings = {
    ...form,
    allowedOrigins: origins
      .split(/\n|,/)
      .map((line) => line.trim())
      .filter(Boolean),
  };

  const dirty = JSON.stringify(parsed) !== JSON.stringify(widget ? settingsOnly(widget) : defaults);
  useUnsavedChanges(dirty);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations/widget');
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Не удалось загрузить настройки чата');
      }
      setWidget(data.widget);
      setForm(data.widget ? settingsOnly(data.widget) : defaults);
      setOrigins(data.widget?.allowedOrigins.join('\n') || '');
      setEmbedOrigin(new URL(data.embedOrigin || window.location.origin).origin);
      setError(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Нет связи с сервером');
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial asynchronous settings request.
  useEffect(() => {
    void load();
  }, [load]);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const snippet =
    widget && embedOrigin
      ? `<script src="${embedOrigin}/widget.js" data-widget-id="${widget.id}" defer></script>`
      : '';

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch('/api/integrations/widget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Не удалось сохранить');
      }
      setWidget(data.widget);
      setForm(settingsOnly(data.widget));
      setOrigins(data.widget.allowedOrigins.join('\n'));
      showToast('Настройки чата сохранены');
    } catch (failure) {
      showToast(
        'Настройки не сохранены',
        failure instanceof Error ? failure.message : 'Ошибка сети',
        'error'
      );
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    setChecking(true);
    try {
      const response = await fetch('/api/integrations/widget');
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Проверка недоступна');
      setWidget(data.widget);
      showToast(
        data.widget?.lastSeenAt ? 'Запрос виджета с сайта обнаружен' : 'Установка пока не обнаружена',
        data.widget?.lastSeenAt
          ? data.widget.lastSeenOrigin
          : 'Откройте страницу сайта с установленным кодом и повторите проверку.'
      );
    } catch (failure) {
      showToast('Не удалось проверить', failure instanceof Error ? failure.message : 'Ошибка сети', 'error');
    } finally {
      setChecking(false);
    }
  };

  const requestHelp = async () => {
    setHelping(true);
    try {
      const response = await fetch('/api/integrations/widget', { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Не удалось отправить заявку');
      setTicket(data.ticketNumber);
      showToast(
        'Заявка на установку отправлена',
        `Обращение №${data.ticketNumber} доступно в поддержке.`
      );
    } catch (failure) {
      showToast('Заявка не отправлена', failure instanceof Error ? failure.message : 'Ошибка сети', 'error');
    } finally {
      setHelping(false);
    }
  };

  const handleCopySnippet = async () => {
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedSnippet(true);
      showToast('Код виджета скопирован в буфер');
      setTimeout(() => setCopiedSnippet(false), 2500);
    } catch {
      showToast('Выделите и скопируйте код вручную', undefined, 'error');
    }
  };

  const curlExample = widget && embedOrigin ? `curl -X POST "${embedOrigin}/api/widget/${widget.id}/messages" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Здравствуйте! Сколько стоят ваши услуги?"}'` : '';

  const handleCopyCurl = async () => {
    if (!curlExample) return;
    try {
      await navigator.clipboard.writeText(curlExample);
      setCopiedApi(true);
      showToast('Пример cURL скопирован');
      setTimeout(() => setCopiedApi(false), 2500);
    } catch {
      showToast('Скопируйте пример вручную', undefined, 'error');
    }
  };

  return (
    <section className="space-y-6" aria-labelledby="website-widget-title">
      {/* Top Banner / Status bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-[var(--accent)] shrink-0 border border-red-100 dark:border-red-900/40">
            <Globe size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 id="website-widget-title" className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                Чат на сайте
              </h2>
              <Badge variant={widget?.enabled ? 'success' : 'neutral'}>
                {widget?.enabled ? '● Активен' : '○ Выключен'}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
              ИИ-консультант для вашего сайта. Квалифицирует лидов и переводит диалоги в продажи.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => update('enabled', event.target.checked)}
              disabled={busy}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-[var(--focus-ring)] rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[var(--accent)]" />
            <span className="ms-2.5 text-xs font-medium text-[var(--text-secondary)] hidden sm:inline">
              {form.enabled ? 'Приём включён' : 'Приём выключен'}
            </span>
          </label>
        </div>
      </div>

      <DataState loading={loading} error={error} retry={load} />

      {!loading && !error && (
        <div className="space-y-6">
          {/* Quick Installation Section (Snippet vs API) */}
          <Card className="overflow-hidden border border-[var(--border)] shadow-xs">
            <div className="border-b border-[var(--border)] bg-[var(--surface-secondary)]/50 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles size={18} className="text-[var(--accent)]" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">Способ установки</span>
              </div>

              {/* Mode Toggle Pills */}
              <div className="inline-flex p-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setInstallMode('snippet')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    installMode === 'snippet'
                      ? 'bg-[var(--accent)] text-white shadow-xs font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Code2 size={14} />
                  <span>Готовый виджет (1 строка)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInstallMode('api')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    installMode === 'api'
                      ? 'bg-[var(--accent)] text-white shadow-xs font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Terminal size={14} />
                  <span>REST API (Для разработчиков)</span>
                </button>
              </div>
            </div>

            <CardBody className="p-5 sm:p-6 space-y-4">
              {installMode === 'snippet' ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm">
                    <p className="text-[var(--text-secondary)]">
                      Скопируйте и вставьте эту строку перед закрывающим тегом{' '}
                      <code className="px-1.5 py-0.5 rounded-md bg-[var(--surface-secondary)] text-[var(--accent-link)] font-mono text-xs">
                        &lt;/body&gt;
                      </code>{' '}
                      вашего сайта (Tilda, WordPress, Taplink или чистый HTML):
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0 text-xs text-[var(--text-muted)]">
                      <span className="inline-block size-2 rounded-full bg-emerald-500" />
                      <span>Подходит для любого сайта</span>
                    </div>
                  </div>

                  {/* Code Snippet Box */}
                  <div className="relative group rounded-xl overflow-hidden border border-slate-700/60 bg-[#0F172A] text-slate-100 p-4">
                    <textarea
                      aria-label="Код установки чата"
                      readOnly
                      rows={2}
                      value={snippet || 'Сначала сохраните настройки ниже, чтобы сгенерировать код…'}
                      className="w-full bg-transparent resize-none font-mono text-xs text-slate-200 focus:outline-hidden selection:bg-red-500/30 select-all"
                      onFocus={(event) => event.target.select()}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!snippet || dirty}
                        onClick={handleCopySnippet}
                      >
                        {copiedSnippet ? <Check size={16} /> : <Copy size={16} />}
                        <span>{copiedSnippet ? 'Код скопирован!' : 'Скопировать код виджета'}</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!widget || dirty}
                        isLoading={checking}
                        onClick={check}
                      >
                        <ShieldCheck size={16} />
                        <span>Проверить установку</span>
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!widget || dirty || Boolean(ticket)}
                      isLoading={helping}
                      onClick={requestHelp}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <HelpCircle size={15} />
                      <span>Нужна помощь с установкой?</span>
                    </Button>
                  </div>

                  {/* Status Banner */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border)] text-xs text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2 rounded-full ${
                          widget?.lastSeenAt ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      <span role="status">
                        {widget?.lastSeenAt
                          ? `Последний запрос с сайта: ${widget.lastSeenOrigin} (${new Date(
                              widget.lastSeenAt
                            ).toLocaleString('ru-RU')})`
                          : 'Запросы виджета с сайта пока не обнаружены'}
                      </span>
                    </div>
                    {dirty && (
                      <span className="text-[var(--warning-text)] font-medium">
                        Сохраните изменения формы перед установкой
                      </span>
                    )}
                  </div>
                </>
              ) : (
                /* REST API View */
                <div className="space-y-4">
                  <div className="text-xs sm:text-sm text-[var(--text-secondary)]">
                    Прямая отправка сообщений ИИ-агенту без загрузки скрипта виджета. Подходит для мобильных
                    приложений (Flutter, iOS, Android), кастомных фронтендов и Telegram Web Apps.
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] space-y-1">
                      <span className="text-[var(--text-muted)] block font-medium">Widget ID / Token:</span>
                      <code className="font-mono font-semibold text-[var(--text-primary)] select-all block break-all">
                        {widget?.id || 'Сохраните настройки для генерации ID'}
                      </code>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] space-y-1">
                      <span className="text-[var(--text-muted)] block font-medium">HTTP Endpoint:</span>
                      <code className="font-mono font-semibold text-[var(--text-primary)] select-all block break-all">
                        POST {embedOrigin}/api/widget/{widget?.id || ':id'}/messages
                      </code>
                    </div>
                  </div>

                  <div className="relative rounded-xl overflow-hidden border border-slate-700/60 bg-[#0F172A] p-4 text-xs font-mono text-slate-200">
                    <pre className="overflow-x-auto whitespace-pre-wrap">{curlExample}</pre>
                    <button
                      type="button"
                      onClick={handleCopyCurl}
                      className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
                    >
                      {copiedApi ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedApi ? 'Скопировано' : 'cURL'}</span>
                    </button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Form Settings & Live Preview Split Grid */}
          <div className="grid xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-6 items-start">
            {/* Left: Configuration Form */}
            <Card className="border border-[var(--border)] shadow-xs">
              <CardBody className="p-5 sm:p-6">
                <form onSubmit={save} className="space-y-5">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                    <div className="flex items-center gap-2">
                      <Sliders size={18} className="text-[var(--accent)]" />
                      <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                        Настройки чата и поведение
                      </h3>
                    </div>
                    {dirty && (
                      <span className="text-xs text-[var(--warning-text)] font-medium">
                        Есть несохранённые изменения
                      </span>
                    )}
                  </div>

                  {/* Responsible AI Agent */}
                  <Select
                    label="Ответственный ИИ-сотрудник"
                    value={form.agentId}
                    disabled={busy}
                    onChange={(event) => update('agentId', event.target.value)}
                    required
                    options={[
                      { value: '', label: 'Выберите сотрудника' },
                      ...agents.map((agent) => ({
                        value: agent.id,
                        label: `${agent.name}${agent.isActive === false ? ' (выключен)' : ''}`,
                      })),
                    ]}
                  />

                  {/* Allowed Origins */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label htmlFor="widget-origins" className="block text-xs font-semibold text-[var(--text-primary)]">
                        Разрешённые сайты (Origins)
                      </label>
                      <span className="text-[11px] text-[var(--text-muted)]">До 10 адресов</span>
                    </div>
                    <textarea
                      id="widget-origins"
                      className={textAreaClass}
                      value={origins}
                      onChange={(event) => setOrigins(event.target.value)}
                      placeholder={'https://example.uz\nhttps://www.example.uz'}
                      required
                      disabled={busy}
                      aria-describedby="widget-origins-help"
                    />
                    <p id="widget-origins-help" className="text-xs text-[var(--text-muted)]">
                      Каждый адрес с новой строки. Формат: <code>https://domain.com</code> (без пути и слэша в конце).
                    </p>
                  </div>

                  {/* Title & Greeting */}
                  <div className="space-y-4">
                    <Input
                      label="Заголовок чата"
                      value={form.title}
                      onChange={(event) => update('title', event.target.value)}
                      maxLength={80}
                      required
                      disabled={busy}
                    />

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label htmlFor="widget-greeting" className="block text-xs font-semibold text-[var(--text-primary)]">
                          Приветственное сообщение
                        </label>
                        <span className="text-[11px] text-[var(--text-muted)]">{form.greeting.length}/500</span>
                      </div>
                      <textarea
                        id="widget-greeting"
                        className={textAreaClass}
                        value={form.greeting}
                        onChange={(event) => update('greeting', event.target.value)}
                        maxLength={500}
                        required
                        disabled={busy}
                      />
                    </div>
                  </div>

                  {/* Color & Position */}
                  <div className="space-y-3 pt-1">
                    <label className="block text-xs font-semibold text-[var(--text-primary)]">Цвет оформления</label>
                    <div className="flex flex-wrap items-center gap-2.5">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => update('color', preset.value)}
                          className={`size-7 rounded-full transition-transform cursor-pointer relative flex items-center justify-center ${
                            form.color.toLowerCase() === preset.value.toLowerCase()
                              ? 'scale-115 ring-2 ring-offset-2 ring-[var(--focus-ring)]'
                              : 'hover:scale-105 opacity-90 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: preset.value }}
                          title={preset.name}
                        >
                          {form.color.toLowerCase() === preset.value.toLowerCase() && (
                            <Check size={14} className="text-white drop-shadow-xs" />
                          )}
                        </button>
                      ))}

                      <div className="flex items-center gap-2 ml-2 pl-3 border-l border-[var(--border)]">
                        <input
                          type="color"
                          value={form.color}
                          onChange={(event) => update('color', event.target.value)}
                          disabled={busy}
                          className="size-7 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                          title="Выбрать свой цвет"
                        />
                        <span className="text-xs font-mono uppercase text-[var(--text-secondary)]">
                          {form.color}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Select
                        label="Расположение на экране"
                        value={form.position}
                        onChange={(event) => update('position', event.target.value)}
                        disabled={busy}
                        options={[
                          { value: 'right', label: 'Справа внизу (стандарт)' },
                          { value: 'left', label: 'Слева внизу' },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
                    {!agents.length ? (
                      <p className="text-xs text-[var(--text-muted)]">
                        Сначала{' '}
                        <Link href="/dashboard/agents/new" className="underline text-[var(--accent-link)]">
                          создайте сотрудника
                        </Link>
                        .
                      </p>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">
                        {dirty ? 'Не забудьте сохранить' : 'Все изменения сохранены'}
                      </span>
                    )}

                    <Button type="submit" variant="primary" isLoading={busy} disabled={!dirty || !agents.length}>
                      Сохранить настройки
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>

            {/* Right: Interactive Real-Time Preview */}
            <div className="space-y-4 sticky top-6">
              <Card className="border border-[var(--border)] shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface-secondary)]/50 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Интерактивный предпросмотр
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    Положение: {form.position === 'left' ? 'Слева' : 'Справа'}
                  </span>
                </div>

                <CardBody className="p-6 bg-slate-50 dark:bg-slate-950/60 flex flex-col items-center justify-center min-h-[460px] relative">
                  {/* Phone / Device Mockup Container */}
                  <div className="w-full max-w-[340px] rounded-2xl bg-white dark:bg-[#111C2F] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                    {/* Chat Header */}
                    <div
                      className="px-4 py-3.5 flex items-center justify-between transition-colors"
                      style={{
                        backgroundColor: form.color,
                        color: widgetTextColor(form.color),
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                          <MessageCircle size={16} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm truncate leading-tight">{form.title}</h4>
                          <span className="text-[11px] opacity-80 block truncate">ИИ онлайн · Отвечает за секунды</span>
                        </div>
                      </div>
                      <span className="opacity-80 text-lg leading-none cursor-default">×</span>
                    </div>

                    {/* Chat Body */}
                    <div className="p-4 space-y-3 min-h-[220px] max-h-[260px] overflow-y-auto bg-slate-50/70 dark:bg-[#0B1220]/60">
                      {/* Incoming AI Greeting Message */}
                      <div className="flex items-start gap-2">
                        <div
                          className="size-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                          style={{
                            backgroundColor: form.color,
                            color: widgetTextColor(form.color),
                          }}
                        >
                          AI
                        </div>
                        <div className="bg-white dark:bg-[#1A2740] rounded-2xl rounded-tl-sm p-3 text-xs text-slate-800 dark:text-slate-100 shadow-2xs border border-slate-200/60 dark:border-slate-800/80 leading-relaxed max-w-[85%] whitespace-pre-wrap break-words">
                          {form.greeting}
                        </div>
                      </div>

                      {/* Mock client reply */}
                      <div className="flex justify-end">
                        <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm p-2.5 text-xs shadow-2xs max-w-[80%]">
                          Здравствуйте! Подскажите подробнее.
                        </div>
                      </div>
                    </div>

                    {/* Chat Input Bar */}
                    <div className="p-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#111C2F] flex items-center gap-2">
                      <input
                        type="text"
                        disabled
                        placeholder="Напишите сообщение…"
                        className="w-full text-xs bg-slate-100 dark:bg-slate-800/60 rounded-full px-3 py-2 text-slate-500 cursor-not-allowed"
                      />
                      <div
                        className="size-8 rounded-full flex items-center justify-center shrink-0 cursor-default"
                        style={{
                          backgroundColor: form.color,
                          color: widgetTextColor(form.color),
                        }}
                      >
                        <Send size={13} />
                      </div>
                    </div>
                  </div>

                  {/* Launcher Floating Button Mockup */}
                  <div
                    className={`mt-4 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-xs font-semibold cursor-default transition-all ${
                      form.position === 'left' ? 'self-start' : 'self-end'
                    }`}
                    style={{
                      backgroundColor: form.color,
                      color: widgetTextColor(form.color),
                    }}
                  >
                    <MessageCircle size={15} />
                    <span>Написать нам</span>
                  </div>
                </CardBody>
              </Card>

              {ticket && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  <span>
                    Заявка на установку №{ticket} создана.{' '}
                    <Link href="/dashboard/support" className="underline font-medium hover:opacity-80">
                      Перейти в поддержку
                    </Link>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
