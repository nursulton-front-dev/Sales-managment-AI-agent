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
  ShieldCheck,
  Send,
  HelpCircle,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
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
  'w-full min-h-20 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition-colors';

const settingsOnly = (widget: Settings): Settings => ({
  agentId: widget.agentId,
  enabled: widget.enabled,
  title: widget.title,
  greeting: widget.greeting,
  color: widget.color,
  position: widget.position,
  allowedOrigins: widget.allowedOrigins,
});

export function WebsiteWidgetModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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

  // Tabs inside modal: 'snippet' | 'api' | 'appearance'
  const [modalTab, setModalTab] = useState<'snippet' | 'api' | 'appearance'>('snippet');
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

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Asynchronous settings request.
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
      showToast('Настройки чата сохранены и активированы');
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

  const curlExample =
    widget && embedOrigin
      ? `curl -X POST "${embedOrigin}/api/widget/${widget.id}/messages" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Здравствуйте! Сколько стоят ваши услуги?"}'`
      : '';

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
    <Dialog
      open={open}
      onClose={onClose}
      label="Настройки виджета чата на сайте"
      className="w-full max-w-4xl p-0 rounded-2xl overflow-hidden border border-[var(--border)] shadow-2xl bg-[var(--surface)]"
    >
      <form onSubmit={save} className="flex flex-col max-h-[90dvh]" aria-labelledby="website-widget-title">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-[var(--accent)] shrink-0 border border-red-100 dark:border-red-900/40">
              <Globe size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="website-widget-title" className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">
                  Чат на сайте (Веб-виджет)
                </h2>
                <Badge variant={widget?.enabled ? 'success' : 'neutral'}>
                  {widget?.enabled ? '● Активен' : '○ Выключен'}
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                ИИ-консультант для любого сайта: Tilda, WordPress, Taplink, HTML или через REST API.
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
              <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-[var(--focus-ring)] rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all dark:border-slate-600 peer-checked:bg-[var(--accent)]" />
              <span className="ms-2 text-xs font-medium text-[var(--text-secondary)] hidden md:inline">
                {form.enabled ? 'Включён' : 'Выключен'}
              </span>
            </label>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={onClose}
              aria-label="Закрыть"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X size={19} />
            </Button>
          </div>
        </div>

        {/* Modal Inner Nav Tabs */}
        <div className="px-6 py-2.5 border-b border-[var(--border)] bg-[var(--surface-secondary)]/40 flex gap-2 overflow-x-auto shrink-0">
          {[
            { id: 'snippet', label: '⚡ Готовый скрипт (1 строка)', icon: Code2 },
            { id: 'api', label: '🔌 REST API (Для разработчиков)', icon: Terminal },
            { id: 'appearance', label: '🎨 Оформление и сайты', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = modalTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setModalTab(tab.id as typeof modalTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs font-semibold border border-[var(--border)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon size={14} className={active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <DataState loading={loading} error={error} retry={load} />

          {!loading && !error && (
            <>
              {/* TAB 1: Ready Snippet */}
              {modalTab === 'snippet' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm">
                    <p className="text-[var(--text-secondary)]">
                      Вставьте эту строчку перед закрывающим тегом{' '}
                      <code className="px-1.5 py-0.5 rounded-md bg-[var(--surface-secondary)] text-[var(--accent-link)] font-mono text-xs">
                        &lt;/body&gt;
                      </code>{' '}
                      вашего сайта (Tilda, WordPress, Taplink или чистый HTML):
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Установка за 30 секунд</span>
                    </div>
                  </div>

                  {/* Code Snippet Box */}
                  <div className="relative group rounded-xl overflow-hidden border border-slate-700/60 bg-[#0F172A] text-slate-100 p-4">
                    <textarea
                      aria-label="Код установки чата"
                      readOnly
                      rows={2}
                      value={snippet || 'Сначала сохраните настройки на соседней вкладке, чтобы сгенерировать код…'}
                      className="w-full bg-transparent resize-none font-mono text-xs text-slate-200 focus:outline-hidden selection:bg-red-500/30 select-all"
                      onFocus={(event) => event.target.select()}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={!snippet || dirty}
                        onClick={handleCopySnippet}
                      >
                        {copiedSnippet ? <Check size={16} /> : <Copy size={16} />}
                        <span>{copiedSnippet ? 'Код скопирован!' : 'Скопировать код виджета'}</span>
                      </Button>

                      <Button
                        type="button"
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
                      type="button"
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
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border)] text-xs text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`size-2.5 rounded-full ${
                          widget?.lastSeenAt ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      <span role="status">
                        {widget?.lastSeenAt
                          ? `Запрос с сайта зафиксирован: ${widget.lastSeenOrigin} (${new Date(
                              widget.lastSeenAt
                            ).toLocaleString('ru-RU')})`
                          : 'Запросы виджета с сайта пока не обнаружены'}
                      </span>
                    </div>
                    {dirty && (
                      <span className="text-[var(--warning-text)] font-medium">
                        Сохраните настройки перед проверкой
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: REST API */}
              {modalTab === 'api' && (
                <div className="space-y-4">
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                    Отправляйте сообщения напрямую ИИ-агенту через HTTP REST API. Подходит для мобильных приложений
                    (Flutter, iOS, Android), кастомных веб-порталов и Telegram Mini Apps.
                  </p>

                  <div className="grid md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] space-y-1">
                      <span className="text-[var(--text-muted)] block font-medium">Widget ID / Token:</span>
                      <code className="font-mono font-semibold text-[var(--text-primary)] select-all block break-all">
                        {widget?.id || 'Сохраните настройки для генерации ID'}
                      </code>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] space-y-1">
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

              {/* TAB 3: Appearance, Origins & Live Preview */}
              {modalTab === 'appearance' && (
                <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6 items-start">
                  {/* Left: Fields */}
                  <div className="space-y-4">
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
                        Каждый адрес с новой строки. Формат: <code>https://domain.com</code> (без слэша на конце).
                      </p>
                    </div>

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
                          Приветствие
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

                    {/* Colors */}
                    <div className="space-y-2 pt-1">
                      <label className="block text-xs font-semibold text-[var(--text-primary)]">Цвет оформления</label>
                      <div className="flex flex-wrap items-center gap-2">
                        {COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => update('color', preset.value)}
                            className={`size-6 rounded-full transition-transform cursor-pointer relative flex items-center justify-center ${
                              form.color.toLowerCase() === preset.value.toLowerCase()
                                ? 'scale-115 ring-2 ring-offset-2 ring-[var(--focus-ring)]'
                                : 'hover:scale-105 opacity-90'
                            }`}
                            style={{ backgroundColor: preset.value }}
                            title={preset.name}
                          >
                            {form.color.toLowerCase() === preset.value.toLowerCase() && (
                              <Check size={12} className="text-white drop-shadow-xs" />
                            )}
                          </button>
                        ))}
                        <input
                          type="color"
                          value={form.color}
                          onChange={(event) => update('color', event.target.value)}
                          disabled={busy}
                          className="size-6 rounded-lg cursor-pointer border-0 p-0 bg-transparent ml-2"
                          title="Свой цвет"
                        />
                        <span className="text-xs font-mono uppercase text-[var(--text-secondary)]">
                          {form.color}
                        </span>
                      </div>
                    </div>

                    <Select
                      label="Расположение"
                      value={form.position}
                      onChange={(event) => update('position', event.target.value)}
                      disabled={busy}
                      options={[
                        { value: 'right', label: 'Справа внизу' },
                        { value: 'left', label: 'Слева внизу' },
                      ]}
                    />
                  </div>

                  {/* Right: Preview */}
                  <div className="rounded-xl border border-[var(--border)] p-4 bg-slate-50 dark:bg-slate-950/60 flex flex-col items-center justify-center min-h-[360px]">
                    <div className="w-full max-w-[280px] rounded-2xl bg-white dark:bg-[#111C2F] shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col text-xs">
                      <div
                        className="px-3.5 py-3 flex items-center justify-between text-white"
                        style={{
                          backgroundColor: form.color,
                          color: widgetTextColor(form.color),
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <MessageCircle size={15} />
                          <span className="font-semibold truncate">{form.title}</span>
                        </div>
                        <span className="text-base leading-none">×</span>
                      </div>
                      <div className="p-3 space-y-2 bg-slate-50/70 dark:bg-[#0B1220]/60 min-h-[140px]">
                        <div className="bg-white dark:bg-[#1A2740] rounded-xl p-2.5 text-slate-800 dark:text-slate-100 shadow-2xs leading-relaxed break-words text-[11px]">
                          {form.greeting}
                        </div>
                      </div>
                      <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                        <input
                          type="text"
                          disabled
                          placeholder="Напишите сообщение…"
                          className="w-full text-[11px] bg-slate-100 dark:bg-slate-800 rounded-full px-2.5 py-1 text-slate-400"
                        />
                        <div
                          className="size-6 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: form.color,
                            color: widgetTextColor(form.color),
                          }}
                        >
                          <Send size={10} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[var(--text-muted)]">
            {dirty ? (
              <span className="text-[var(--warning-text)] font-medium">Есть несохранённые изменения</span>
            ) : (
              <span>Все настройки сохранены</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
              Отмена
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={busy}
              disabled={!dirty || !agents.length}
            >
              Сохранить и подключить
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

// Backward-compatible alias
export { WebsiteWidgetModal as WebsiteWidgetIntegration };
