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
  ExternalLink,
} from 'lucide-react';
import { WebsiteWidgetModal } from '@/components/integrations/WebsiteWidgetIntegration';
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

  // Modals for each service
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [instagramOpen, setInstagramOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  // Form states for modals
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

  const activeCount =
    (connectedAgents.length > 0 ? 1 : 0) +
    (calendar?.connected ? 1 : 0) +
    (instagram?.connected ? 1 : 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Интеграции"
          description="Каталог подключений для ваших продаж, поддержки и автоматической записи клиентов."
        />
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-secondary)] shadow-2xs self-start sm:self-auto">
          <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            Активно каналов: <strong className="text-[var(--text-primary)] font-semibold">{activeCount}</strong>
          </span>
        </div>
      </div>

      {/* Modern Filter Tabs */}
      <div
        className="flex items-center gap-1 p-1 bg-[var(--surface-secondary)]/70 border border-[var(--border)] rounded-2xl overflow-x-auto"
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

      {/* ========================================================================= */}
      {/* MINIMALIST CONNECTIONS CATALOG (BENTO GRID) */}
      {/* ========================================================================= */}
      {tab !== 'events' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. Telegram Card */}
          {['all', 'messages'].includes(tab) && (
            <Card
              className="cursor-pointer hover:border-[var(--border-strong)] hover:shadow-md transition-all flex flex-col justify-between group border border-[var(--border)]"
              onClick={() => setTelegramOpen(true)}
            >
              <CardBody className="p-6 flex flex-col gap-4 h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="size-12 rounded-2xl bg-[#229ED9]/10 flex items-center justify-center shrink-0 border border-[#229ED9]/20 group-hover:scale-105 transition-transform">
                    <Image src="/integrations/telegram.svg" width={30} height={30} alt="Telegram" />
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
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-base text-[var(--text-primary)]">Telegram Bot</h3>
                    <span className="text-[11px] text-[var(--text-muted)]">Мессенджер</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {connectedAgents.length
                      ? connectedAgents
                          .map((agent) => `${agent.telegramUsername ? '@' + agent.telegramUsername + ' · ' : ''}${agent.name}`)
                          .join(', ')
                      : 'Принимайте обращения клиентов в Telegram через вашего бота.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--border)]">
                  <Button
                    type="button"
                    variant={connectedAgents.length ? 'outline' : 'primary'}
                    size="sm"
                    className="w-full text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTelegramOpen(true);
                    }}
                  >
                    {connectedAgents.length ? 'Настроить бота' : 'Подключить'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* 2. Web Widget Card (Чат на сайте) */}
          {['all', 'websites'].includes(tab) && (
            <Card
              className="cursor-pointer hover:border-red-400 dark:hover:border-red-800 hover:shadow-md transition-all flex flex-col justify-between group border border-[var(--border)] bg-gradient-to-b from-[var(--surface)] to-red-50/10 dark:to-red-950/10"
              onClick={() => setWidgetOpen(true)}
            >
              <CardBody className="p-6 flex flex-col gap-4 h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="size-12 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-[var(--accent)] shrink-0 border border-red-100 dark:border-red-900/40 group-hover:scale-105 transition-transform">
                    <Globe size={26} />
                  </div>
                  <Badge variant="success">● Доступен</Badge>
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-base text-[var(--text-primary)]">Чат на сайте</h3>
                    <span className="text-[11px] text-[var(--text-muted)]">Веб-виджет</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Умный ИИ-помощник в углу сайта. Установка скриптом в 1 строку или подключение через REST API.
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--border)]">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="w-full text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setWidgetOpen(true);
                    }}
                  >
                    Подключить виджет
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* 3. Google Calendar Card */}
          {['all', 'calendar'].includes(tab) && (
            <Card
              className="cursor-pointer hover:border-[var(--border-strong)] hover:shadow-md transition-all flex flex-col justify-between group border border-[var(--border)]"
              onClick={() => setCalendarOpen(true)}
            >
              <CardBody className="p-6 flex flex-col gap-4 h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="size-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40 group-hover:scale-105 transition-transform">
                    <Image src="/integrations/google-calendar.png" width={28} height={28} alt="Google Calendar" />
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
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-base text-[var(--text-primary)]">Google Календарь</h3>
                    <span className="text-[11px] text-[var(--text-muted)]">Запись клиентов</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {calendar?.connected
                      ? `${calendar.email || 'Календарь синхронизирован'} · ${calendar.workingHours} (${calendar.slotDuration} мин)`
                      : 'Автоматическая запись клиентов на консультации с проверкой свободных слотов.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--border)]">
                  <Button
                    type="button"
                    variant={calendar?.connected ? 'outline' : 'primary'}
                    size="sm"
                    className="w-full text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCalendarOpen(true);
                    }}
                  >
                    {calendar?.connected ? 'Настроить расписание' : 'Подключить'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* 4. Instagram Direct Card */}
          {['all', 'messages'].includes(tab) && (
            <Card
              className="cursor-pointer hover:border-[var(--border-strong)] hover:shadow-md transition-all flex flex-col justify-between group border border-[var(--border)]"
              onClick={() => setInstagramOpen(true)}
            >
              <CardBody className="p-6 flex flex-col gap-4 h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="size-12 rounded-2xl bg-pink-50 dark:bg-pink-950/40 flex items-center justify-center shrink-0 border border-pink-100 dark:border-pink-900/40 group-hover:scale-105 transition-transform">
                    <Image src="/integrations/instagram.svg" width={28} height={28} alt="Instagram" />
                  </div>
                  <Badge variant={instagram?.connected ? 'success' : 'neutral'}>
                    {loading
                      ? 'Проверяем…'
                      : error
                      ? 'Статус недоступен'
                      : instagram?.connected
                      ? '● Подключён'
                      : '○ Не подключён'}
                  </Badge>
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-base text-[var(--text-primary)]">Instagram Direct</h3>
                    <span className="text-[11px] text-[var(--text-muted)]">Соцсеть</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {instagram?.connected
                      ? `@${instagram.username || 'аккаунт'} · Автоответы ${
                          instagram.autoReply ? 'включены' : 'выключены'
                        }`
                      : 'Автоответы клиентам в Direct и передача горячих лидов сотрудникам.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--border)]">
                  <Button
                    type="button"
                    variant={instagram?.connected ? 'outline' : 'primary'}
                    size="sm"
                    className="w-full text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInstagramOpen(true);
                    }}
                  >
                    {instagram?.connected ? 'Настройки Direct' : 'Подключить'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* 5. WhatsApp Business Card */}
          {['all', 'messages'].includes(tab) && (
            <Card
              className="cursor-pointer hover:border-[var(--border-strong)] hover:shadow-md transition-all flex flex-col justify-between group border border-[var(--border)] opacity-85"
              onClick={() => setWhatsappOpen(true)}
            >
              <CardBody className="p-6 flex flex-col gap-4 h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/40 group-hover:scale-105 transition-transform">
                    <Image src="/integrations/whatsapp.svg" width={28} height={28} alt="WhatsApp" />
                  </div>
                  <Badge variant="neutral">Скоро</Badge>
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-base text-[var(--text-primary)]">WhatsApp Business</h3>
                    <span className="text-[11px] text-[var(--text-muted)]">Мессенджер</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Прямая интеграция через официальный WhatsApp Cloud API находится в разработке.
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--border)]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setWhatsappOpen(true);
                    }}
                  >
                    Подробнее
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* Events Log Tab */}
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
              Поможем настроить Telegram-бота, чат на сайте или связать календарь бесплатно.
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-[var(--accent-link)] inline-flex items-center gap-1 shrink-0">
          Написать в поддержку →
        </span>
      </Link>

      {/* ========================================================================= */}
      {/* SERVICE MODALS (MODAL OPENS UPON SERVICE CLICK) */}
      {/* ========================================================================= */}

      {/* 1. Website Widget Modal */}
      <WebsiteWidgetModal open={widgetOpen} onClose={() => setWidgetOpen(false)} />

      {/* 2. Telegram Modal */}
      <Dialog
        open={telegramOpen}
        onClose={() => {
          if (!busy) {
            setTelegramOpen(false);
            setToken('');
          }
        }}
        label="Подключить Telegram"
        className="w-full max-w-lg p-0 rounded-2xl overflow-hidden border border-[var(--border)] shadow-2xl bg-[var(--surface)]"
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
              <div className="size-9 rounded-xl bg-[#229ED9]/10 flex items-center justify-center text-[#229ED9]">
                <MessageCircle size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Telegram-бот</h2>
                <p className="text-xs text-[var(--text-secondary)]">Подключение бота через @BotFather</p>
              </div>
            </div>
            <Button
              type="button"
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

          <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)]/70 text-xs text-[var(--text-secondary)] space-y-1 border border-[var(--border)]">
            <span className="font-semibold block text-[var(--text-primary)]">Пошаговая инструкция:</span>
            <ol className="list-decimal list-inside space-y-1 text-[var(--text-muted)]">
              <li>Откройте бота @BotFather в Telegram</li>
              <li>Отправьте команду /newbot и выберите имя</li>
              <li>Скопируйте выданный HTTP API token и вставьте в поле выше</li>
            </ol>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
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
              Подключить бота
            </Button>
          </div>
        </form>
      </Dialog>

      {/* 3. Google Calendar Modal */}
      <Dialog
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        label="Настройки календаря"
        className="w-full max-w-lg p-0 rounded-2xl overflow-hidden border border-[var(--border)] shadow-2xl bg-[var(--surface)]"
      >
        <div className="p-6 space-y-5">
          <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600">
                <CalendarIcon size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Google Календарь</h2>
                <Badge variant={calendar?.connected ? 'success' : 'neutral'}>
                  {calendar?.connected ? 'Подключён' : 'Не подключён'}
                </Badge>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setCalendarOpen(false)}
              aria-label="Закрыть"
            >
              <X size={18} />
            </Button>
          </div>

          {!calendar?.connected ? (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Синхронизируйте рабочий Google Календарь, чтобы ваши ИИ-агенты могли в реальном времени проверять
                свободные окна и автоматически записывать клиентов на встречи и консультации.
              </p>
              <div className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-xs text-[var(--text-muted)] space-y-1.5">
                <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>Проверка занятости в реальном времени</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>Создание событий с ссылкой Google Meet</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <Button type="button" variant="ghost" onClick={() => setCalendarOpen(false)}>
                  Отмена
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={loading || busy || !calendar?.configured}
                  onClick={() => window.location.assign('/api/calendar/auth')}
                >
                  Подключить через Google
                </Button>
              </div>
            </div>
          ) : (
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
              <div className="text-xs text-[var(--text-secondary)]">
                Аккаунт: <strong className="text-[var(--text-primary)]">{calendar.email}</strong>
              </div>

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
                Часовой пояс: Asia/Tashkent.
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
          )}
        </div>
      </Dialog>

      {/* 4. Instagram Modal */}
      <Dialog
        open={instagramOpen}
        onClose={() => setInstagramOpen(false)}
        label="Настройки Instagram"
        className="w-full max-w-lg p-0 rounded-2xl overflow-hidden border border-[var(--border)] shadow-2xl bg-[var(--surface)]"
      >
        <div className="p-6 space-y-5">
          <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-pink-50 dark:bg-pink-950/40 flex items-center justify-center text-pink-600">
                <MessageCircle size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Instagram Direct</h2>
                <Badge variant={instagram?.connected ? 'success' : 'neutral'}>
                  {instagram?.connected ? 'Подключён' : 'Не подключён'}
                </Badge>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setInstagramOpen(false)}
              aria-label="Закрыть"
            >
              <X size={18} />
            </Button>
          </div>

          {!instagram?.connected ? (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Подключите бизнес-аккаунт Instagram, чтобы ИИ-агенты моментально отвечали клиентам в Direct,
                отправляли каталог и квалифицировали обращения.
              </p>

              <div className="pt-2 flex justify-end gap-2.5">
                <Button type="button" variant="ghost" onClick={() => setInstagramOpen(false)}>
                  Отмена
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={loading || !instagram?.configured || busy}
                  onClick={() => {
                    window.location.href = '/api/instagram/auth';
                  }}
                >
                  Подключить Instagram
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs text-[var(--text-secondary)]">
                Аккаунт: <strong className="text-[var(--text-primary)]">@{instagram.username}</strong>
              </div>

              <Select
                label="Ответственный сотрудник"
                value={instagram.agentId || ''}
                disabled={busy}
                onChange={(e) => update('/api/instagram/status', { agentId: e.target.value }, 'PATCH')}
                options={[
                  { value: '', label: 'Выберите сотрудника' },
                  ...agents.map((agent) => ({ value: agent.id, label: agent.name })),
                ]}
              />

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border)]">
                <div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] block">Автоответы ИИ</span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Отвечать клиентам в Direct автоматически
                  </span>
                </div>
                <Button
                  type="button"
                  variant={instagram.autoReply ? 'outline' : 'primary'}
                  size="sm"
                  disabled={busy || !instagram.agentId}
                  onClick={() =>
                    update('/api/instagram/status', { autoReply: !instagram.autoReply }, 'PATCH')
                  }
                >
                  {instagram.autoReply ? 'Выключить' : 'Включить'}
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

                <Button type="button" variant="primary" onClick={() => setInstagramOpen(false)}>
                  Готово
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* 5. WhatsApp Modal */}
      <Dialog
        open={whatsappOpen}
        onClose={() => setWhatsappOpen(false)}
        label="WhatsApp Business"
        className="w-full max-w-md p-0 rounded-2xl overflow-hidden border border-[var(--border)] shadow-2xl bg-[var(--surface)]"
      >
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600">
                <MessageCircle size={20} />
              </div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">WhatsApp Business</h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setWhatsappOpen(false)}
              aria-label="Закрыть"
            >
              <X size={18} />
            </Button>
          </div>

          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            Прямая интеграция через официальный WhatsApp Cloud API находится на стадии закрытого тестирования.
            Скоро вы сможете подключить бизнес-номер и автоматизировать продажи в WhatsApp.
          </p>

          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300">
            Оставьте обращение в поддержку, чтобы получить ранний доступ к бета-тесту.
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="button" variant="primary" onClick={() => setWhatsappOpen(false)}>
              Понятно
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
