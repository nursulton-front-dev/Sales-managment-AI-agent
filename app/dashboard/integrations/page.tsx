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
import {
  Headphones,
  X,
  Globe,
  Calendar as CalendarIcon,
  MessageCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { WebsiteWidgetIntegration } from '@/components/integrations/WebsiteWidgetIntegration';
import { ChannelEventLog } from '@/components/integrations/ChannelEventLog';

type CalendarStatus = {
  configured: boolean;
  connected: boolean;
  email?: string;
  workingHours: string;
  slotDuration: number;
};

type InstagramStatus = {
  configured: boolean;
  connected: boolean;
  username?: string;
  agentId?: string;
  autoReply?: boolean;
  status: string;
};

const TABS = [
  { id: 'all', label: 'Все каналы' },
  { id: 'messages', label: 'Мессенджеры' },
  { id: 'websites', label: 'Сайты' },
  { id: 'calendar', label: 'Календари' },
  { id: 'events', label: 'Журнал очереди' },
] as const;

export default function IntegrationsPage() {
  const { agents, agentsError, refreshAgents, refreshWorkspace, showToast } = useApp();
  const [tab, setTab] = useState<string>('all');
  const [calendar, setCalendar] = useState<CalendarStatus | null>(null);
  const [instagram, setInstagram] = useState<InstagramStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Modals
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [instagramOpen, setInstagramOpen] = useState(false);

  // Form states
  const [agentId, setAgentId] = useState('');
  const [token, setToken] = useState('');
  const [hours, setHours] = useState('');
  const [duration, setDuration] = useState('45');

  const dirty = Boolean(
    calendar && (hours !== calendar.workingHours || duration !== String(calendar.slotDuration))
  );
  useUnsavedChanges(dirty || Boolean(token));

  const load = useCallback(async () => {
    try {
      const responses = await Promise.all([
        fetch('/api/calendar/status'),
        fetch('/api/instagram/status'),
      ]);
      const [cal, ig] = await Promise.all(responses.map((res) => res.json()));
      if (responses.some((res) => !res.ok) || !cal.success || !ig.success) {
        throw new Error('Не удалось проверить подключения. Повторите запрос.');
      }
      setError(null);
      setCalendar(cal);
      setInstagram(ig);
      setHours(cal.workingHours);
      setDuration(String(cal.slotDuration));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Asynchronous status refresh on mount.
  useEffect(() => {
    void load();
  }, [load]);

  const update = async (url: string, body?: unknown, method = 'POST') => {
    if (busy) return false;
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Не удалось сохранить');
      await load();
      await refreshWorkspace();
      await refreshAgents();
      showToast('Изменения сохранены');
      return true;
    } catch (failure) {
      showToast(
        'Не удалось выполнить действие',
        failure instanceof Error ? failure.message : 'Ошибка сети',
        'error'
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const connectedAgents = agents.filter((agent) => agent.telegramConnected);

  // Active channels count for overview metric
  const activeCount =
    (connectedAgents.length > 0 ? 1 : 0) +
    (calendar?.connected ? 1 : 0) +
    (instagram?.connected ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Page Header with Minimalist Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Интеграции"
          description="Подключите мессенджеры, виджет для сайта и календарь для автоматических продаж."
        />
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-secondary)] shadow-2xs shrink-0 self-start sm:self-auto">
          <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            Подключено каналов: <strong className="text-[var(--text-primary)]">{activeCount}</strong>
          </span>
        </div>
      </div>

      {/* Modern Pill Navigation Tabs */}
      <div
        className="flex items-center gap-1.5 p-1 bg-[var(--surface-secondary)]/70 border border-[var(--border)] rounded-2xl overflow-x-auto"
        aria-label="Категории интеграций"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={tab === item.id}
            className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              tab === item.id
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <DataState
        loading={loading}
        error={error || agentsError}
        retry={() => {
          void load();
          void refreshAgents();
        }}
      />

      {/* Overview Grid (for 'all', 'messages', 'calendar') */}
      {['all', 'messages', 'calendar'].includes(tab) && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              {tab === 'calendar' ? 'Календари и бронирование' : 'Каталог подключений'}
            </h2>
            <span className="text-xs text-[var(--text-muted)]">
              {tab === 'messages' ? '3 мессенджера' : tab === 'calendar' ? '1 календарь' : '5 каналов'}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. Telegram Card */}
            {['all', 'messages'].includes(tab) && (
              <Card className="hover:border-[var(--border-strong)] transition-all flex flex-col justify-between shadow-xs">
                <CardBody className="p-5 flex flex-col gap-4 h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="size-11 rounded-xl bg-[#229ED9]/10 flex items-center justify-center shrink-0 border border-[#229ED9]/20">
                      <Image src="/integrations/telegram.svg" width={28} height={28} alt="Telegram" />
                    </div>
                    <Badge variant={connectedAgents.length > 0 ? 'success' : 'neutral'}>
                      {agentsError
                        ? 'Статус недоступен'
                        : connectedAgents.length
                        ? '● Подключён'
                        : '○ Не подключён'}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <h3 className="font-semibold text-base text-[var(--text-primary)]">Telegram Bot</h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {connectedAgents.length
                        ? connectedAgents
                            .map((agent) => `${agent.telegramUsername ? '@' + agent.telegramUsername + ' · ' : ''}${agent.name}`)
                            .join(', ')
                        : 'Принимайте обращения клиентов в Telegram через вашего брендового бота.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[var(--border)]">
                    <Button
                      variant={connectedAgents.length ? 'outline' : 'primary'}
                      size="sm"
                      className="w-full text-xs"
                      disabled={!agents.length || Boolean(agentsError) || busy}
                      onClick={() => setTelegramOpen(true)}
                    >
                      {connectedAgents.length ? 'Настроить бота' : 'Подключить Telegram'}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* 2. Web Widget Card (Visible in 'all') */}
            {tab === 'all' && (
              <Card className="hover:border-[var(--border-strong)] transition-all flex flex-col justify-between shadow-xs border-indigo-100 dark:border-indigo-900/30">
                <CardBody className="p-5 flex flex-col gap-4 h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="size-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 border border-indigo-100 dark:border-indigo-900/40">
                      <Globe size={24} />
                    </div>
                    <Badge variant="success">● Доступен</Badge>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <h3 className="font-semibold text-base text-[var(--text-primary)]">Чат на сайте</h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Виджет в углу сайта. Встраивается одной строкой скрипта или вызывается через REST API.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[var(--border)]">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs flex items-center justify-center gap-1.5"
                      onClick={() => setTab('websites')}
                    >
                      <span>Настроить виджет и код</span>
                      <ArrowRight size={13} />
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* 3. Google Calendar Card */}
            {['all', 'calendar'].includes(tab) && (
              <Card className="hover:border-[var(--border-strong)] transition-all flex flex-col justify-between shadow-xs">
                <CardBody className="p-5 flex flex-col gap-4 h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="size-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40">
                      <Image src="/integrations/google-calendar.png" width={26} height={26} alt="Google Calendar" />
                    </div>
                    <Badge variant={calendar?.connected ? 'success' : 'neutral'}>
                      {loading
                        ? 'Проверяем…'
                        : error
                        ? 'Статус недоступен'
                        : calendar?.connected
                        ? '● Подключён'
                        : '○ Не подключён'}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <h3 className="font-semibold text-base text-[var(--text-primary)]">Google Календарь</h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {calendar?.connected
                        ? `${calendar.email || 'Календарь синхронизирован'} · ${calendar.workingHours} (${calendar.slotDuration} мин)`
                        : 'Автоматическая запись клиентов на консультации с проверкой свободных слотов.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[var(--border)] flex gap-2">
                    {calendar?.connected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setCalendarOpen(true)}
                      >
                        Настроить расписание
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full text-xs"
                        disabled={loading || busy || !calendar?.configured || Boolean(error)}
                        onClick={() => window.location.assign('/api/calendar/auth')}
                      >
                        Подключить Google
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* 4. Instagram Direct Card */}
            {['all', 'messages'].includes(tab) && (
              <Card className="hover:border-[var(--border-strong)] transition-all flex flex-col justify-between shadow-xs">
                <CardBody className="p-5 flex flex-col gap-4 h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="size-11 rounded-xl bg-pink-50 dark:bg-pink-950/40 flex items-center justify-center shrink-0 border border-pink-100 dark:border-pink-900/40">
                      <Image src="/integrations/instagram.svg" width={26} height={26} alt="Instagram" />
                    </div>
                    <Badge variant={instagram?.connected ? 'success' : 'neutral'}>
                      {loading
                        ? 'Проверяем…'
                        : error
                        ? 'Статус недоступен'
                        : instagram?.connected
                        ? '● Подключён'
                        : instagram?.configured
                        ? '○ Не подключён'
                        : 'Пока недоступен'}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <h3 className="font-semibold text-base text-[var(--text-primary)]">Instagram Direct</h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {instagram?.connected
                        ? `@${instagram.username || 'аккаунт'} · Автоответы ${
                            instagram.autoReply ? 'включены' : 'выключены'
                          }`
                        : 'Автоответы клиентам в Direct и передача горячих лидов сотрудникам.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[var(--border)]">
                    {instagram?.connected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setInstagramOpen(true)}
                      >
                        Настройки Direct
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        disabled={loading || !instagram?.configured || Boolean(error) || busy}
                        onClick={() => {
                          window.location.href = '/api/instagram/auth';
                        }}
                      >
                        Подключить Instagram
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* 5. WhatsApp Business Card (Coming soon) */}
            {['all', 'messages'].includes(tab) && (
              <Card className="opacity-75 flex flex-col justify-between shadow-xs">
                <CardBody className="p-5 flex flex-col gap-4 h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="size-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/40">
                      <Image src="/integrations/whatsapp.svg" width={26} height={26} alt="WhatsApp" />
                    </div>
                    <Badge variant="neutral">Скоро</Badge>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <h3 className="font-semibold text-base text-[var(--text-primary)]">WhatsApp Business</h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Прямая интеграция через официальный WhatsApp Cloud API находится в разработке.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[var(--border)]">
                    <Button variant="outline" size="sm" className="w-full text-xs" disabled>
                      В разработке
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* Website Widget Section (Always mounted on 'all' and 'websites' for tests and direct usage) */}
      {['all', 'websites'].includes(tab) && (
        <div className="pt-2">
          <WebsiteWidgetIntegration />
        </div>
      )}

      {/* Event Logs View (Shown when 'events' tab is selected) */}
      {tab === 'events' && (
        <div className="pt-2">
          <ChannelEventLog />
        </div>
      )}

      {/* Support Helper Footer Card */}
      <Link
        href="/dashboard/support"
        className="border border-[var(--border)] rounded-2xl p-5 bg-[var(--surface)] hover:bg-[var(--surface-secondary)]/50 transition-colors flex items-center justify-between gap-4 shadow-2xs group"
      >
        <div className="flex items-center gap-4">
          <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors">
            <Headphones size={20} />
          </div>
          <div>
            <p className="font-medium text-sm text-[var(--text-primary)]">
              Нужна помощь в подключении каналов?
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Поможем настроить бота, виджет или связать с CRM бесплатно.
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-[var(--accent-link)] inline-flex items-center gap-1 shrink-0">
          Написать в поддержку →
        </span>
      </Link>

      {/* ========================================================================= */}
      {/* DIALOGS / MODALS FOR CLEAN MINIMALIST INTERACTION */}
      {/* ========================================================================= */}

      {/* 1. Telegram Modal */}
      <Dialog
        open={telegramOpen}
        onClose={() => {
          if (!busy) {
            setTelegramOpen(false);
            setToken('');
          }
        }}
        label="Подключить Telegram"
        className="w-full max-w-lg p-0 rounded-2xl overflow-hidden border border-[var(--border)]"
      >
        <form
          className="p-6 space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await update('/api/agents', { id: agentId, tgBotToken: token }, 'PATCH')) {
              setTelegramOpen(false);
              setToken('');
            }
          }}
        >
          <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-[#229ED9]/10 flex items-center justify-center text-[#229ED9]">
                <MessageCircle size={18} />
              </div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Подключить Telegram-бота</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                setTelegramOpen(false);
                setToken('');
              }}
              aria-label="Закрыть"
            >
              <X size={18} />
            </Button>
          </div>

          <Select
            label="Ответственный ИИ-сотрудник"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            required
            options={[
              { value: '', label: 'Выберите сотрудника' },
              ...agents.map((agent) => ({ value: agent.id, label: agent.name })),
            ]}
          />

          <Input
            label="Токен бота из @BotFather"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
            required
          />

          <div className="p-3 rounded-xl bg-[var(--surface-secondary)]/70 text-xs text-[var(--text-secondary)] space-y-1 border border-[var(--border)]">
            <span className="font-semibold block text-[var(--text-primary)]">Как получить токен:</span>
            <ol className="list-decimal list-inside space-y-0.5 text-[var(--text-muted)]">
              <li>Откройте @BotFather в Telegram</li>
              <li>Отправьте команду /newbot и выберите имя бота</li>
              <li>Скопируйте HTTP API token и вставьте в поле выше</li>
            </ol>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setTelegramOpen(false);
                setToken('');
              }}
            >
              Отмена
            </Button>
            <Button type="submit" variant="primary" isLoading={busy} disabled={!token || !agentId}>
              Сохранить бота
            </Button>
          </div>
        </form>
      </Dialog>

      {/* 2. Google Calendar Settings Modal */}
      <Dialog
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        label="Настройки календаря"
        className="w-full max-w-lg p-0 rounded-2xl overflow-hidden border border-[var(--border)]"
      >
        <div className="p-6 space-y-5">
          <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600">
                <CalendarIcon size={18} />
              </div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Google Календарь</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setCalendarOpen(false)}
              aria-label="Закрыть"
            >
              <X size={18} />
            </Button>
          </div>

          <div className="text-xs text-[var(--text-secondary)]">
            Синхронизирован с аккаунтом: <strong className="text-[var(--text-primary)]">{calendar?.email}</strong>
          </div>

          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await update(
                '/api/workspace/settings',
                {
                  googleCalendarWorkingHours: hours,
                  googleCalendarSlotDuration: Number(duration),
                },
                'PATCH'
              );
              if (ok) setCalendarOpen(false);
            }}
          >
            <Input
              label="Рабочие часы для записи"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="10:00-18:00"
              required
            />

            <Select
              label="Длительность слота"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              options={[15, 30, 45, 60, 90, 120].map((n) => ({
                value: String(n),
                label: `${n} минут`,
              }))}
            />

            <p className="text-[11px] text-[var(--text-muted)]">
              Часовой пояс: Asia/Tashkent. ИИ проверяет занятость в основном календаре.
            </p>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={async () => {
                  if (await update('/api/calendar/disconnect')) {
                    setCalendarOpen(false);
                  }
                }}
                className="text-xs text-[var(--danger-text)] hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                Отключить календарь
              </Button>

              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setCalendarOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" variant="primary" isLoading={busy} disabled={!dirty}>
                  Сохранить
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Dialog>

      {/* 3. Instagram Direct Settings Modal */}
      <Dialog
        open={instagramOpen}
        onClose={() => setInstagramOpen(false)}
        label="Настройки Instagram"
        className="w-full max-w-lg p-0 rounded-2xl overflow-hidden border border-[var(--border)]"
      >
        <div className="p-6 space-y-5">
          <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-pink-50 dark:bg-pink-950/40 flex items-center justify-center text-pink-600">
                <MessageCircle size={18} />
              </div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Instagram Direct</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setInstagramOpen(false)}
              aria-label="Закрыть"
            >
              <X size={18} />
            </Button>
          </div>

          <div className="text-xs text-[var(--text-secondary)]">
            Подключённый аккаунт: <strong className="text-[var(--text-primary)]">@{instagram?.username}</strong>
          </div>

          <div className="space-y-4">
            <Select
              label="Ответственный сотрудник"
              value={instagram?.agentId || ''}
              disabled={busy}
              onChange={(e) => update('/api/instagram/status', { agentId: e.target.value }, 'PATCH')}
              options={[
                { value: '', label: 'Выберите сотрудника' },
                ...agents.map((agent) => ({ value: agent.id, label: agent.name })),
              ]}
            />

            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border)]">
              <div>
                <span className="text-xs font-semibold text-[var(--text-primary)] block">Автоответы ИИ</span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Отвечать клиентам в Direct автоматически
                </span>
              </div>
              <Button
                variant={instagram?.autoReply ? 'outline' : 'primary'}
                size="sm"
                disabled={busy || !instagram?.agentId}
                onClick={() =>
                  update('/api/instagram/status', { autoReply: !instagram?.autoReply }, 'PATCH')
                }
              >
                {instagram?.autoReply ? 'Выключить' : 'Включить'}
              </Button>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={async () => {
                  if (await update('/api/instagram/disconnect')) {
                    setInstagramOpen(false);
                  }
                }}
                className="text-xs text-[var(--danger-text)] hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                Отключить Instagram
              </Button>

              <Button type="button" variant="ghost" onClick={() => setInstagramOpen(false)}>
                Закрыть
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
