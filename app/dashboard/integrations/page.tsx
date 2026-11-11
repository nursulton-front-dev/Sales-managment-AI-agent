'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { DataState } from '@/components/ui/DataState';
import { useUnsavedChanges } from '@/lib/useUnsavedChanges';
import { normalizeWorkingHours } from '@/lib/calendar/working-hours';
import { instagramConnectionMessage } from '@/lib/instagram/connection-errors';
import {
  Globe,
  Clock3,
  History,
  Headphones,
  X,
  ExternalLink,
  Copy,
  Check,
  ArrowRight,
  Send,
  Flag,
  CircleHelp,
  ShieldCheck,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  WebsiteWidgetSettingsView,
  WebsiteWidgetModal,
} from '@/components/integrations/WebsiteWidgetIntegration';
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
  { id: 'all', label: 'Все интеграции' },
  { id: 'messages', label: 'Мессенджеры' },
  { id: 'websites', label: 'Сайт' },
  { id: 'calendar', label: 'Календари' },
] as const;

export default function IntegrationsPage() {
  const { agents, agentsError, refreshAgents, refreshWorkspace, showToast, t, locale } = useApp();
  const tabsList = [
    { id: 'all', label: t.integrations.tabs.all },
    { id: 'messages', label: t.integrations.tabs.messages },
    { id: 'websites', label: t.integrations.tabs.websites },
    { id: 'calendar', label: t.integrations.tabs.calendar },
  ];
  const [tab, setTab] = useState<string>('all');
  const [view, setView] = useState<'catalog' | 'widget_settings' | 'events'>('catalog');
  const [calendar, setCalendar] = useState<CalendarStatus | null>(null);
  const [instagram, setInstagram] = useState<InstagramStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null);
  const [telegramStatusError, setTelegramStatusError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Modals for each service
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [widgetGuideOpen, setWidgetGuideOpen] = useState(false);
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [instagramOpen, setInstagramOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  // Form states for modals
  const [chosenAgentId, setAgentId] = useState('');
  const agentId = chosenAgentId || agents[0]?.id || '';
  const [token, setToken] = useState('');
  const [hours, setHours] = useState('');
  const [duration, setDuration] = useState('45');
  const [copiedCmd, setCopiedCmd] = useState(false);

  // Telegram Business / Account Secretary Mode State
  const [tgTab, setTgTab] = useState<'account' | 'custom_bot'>('account');
  const [tgHelpOpen, setTgHelpOpen] = useState(false);
  const [tgBusinessStatus, setTgBusinessStatus] = useState<{
    connected: boolean;
    userId: string | null;
    username: string | null;
    canReply: boolean;
    enabled: boolean;
    agentId: string | null;
    agentName: string | null;
    botUsername: string;
  } | null>(null);
  const [bindLoading, setBindLoading] = useState(false);
  const [bindData, setBindData] = useState<{
    nonce: string;
    bindUrl: string;
    botUsername: string;
    expiresAt: string;
  } | null>(null);
  const [copiedBindUrl, setCopiedBindUrl] = useState(false);
  const [showCustomBotToken, setShowCustomBotToken] = useState(false);

  const dirty = Boolean(
    calendar && (hours !== calendar.workingHours || duration !== String(calendar.slotDuration))
  );
  useUnsavedChanges(dirty || Boolean(token));

  const load = useCallback(async () => {
    try {
      const responses = await Promise.all([
        fetch('/api/calendar/status', { cache: 'no-store' }),
        fetch('/api/instagram/status', { cache: 'no-store' }),
        fetch('/api/integrations/telegram-business/status', { cache: 'no-store' }),
      ]);
      const [cal, ig, tg] = await Promise.all(responses.map((res) => res.json()));
      const params = new URLSearchParams(window.location.search);
      if (params.has('instagram_error')) {
        setConnectionNotice(instagramConnectionMessage(params.get('instagram_error') || ''));
      } else if (params.get('instagram_connected') === 'true') {
        setConnectionNotice(ig.success && ig.connected
          ? 'Instagram подключён. Выберите сотрудника и включите автоответы в настройках канала.'
          : 'Не удалось подтвердить подключение Instagram в текущей компании. Проверьте статус и повторите подключение.');
      }
      if (params.has('instagram_error') || params.has('instagram_connected')) {
        params.delete('instagram_error');
        params.delete('instagram_connected');
        params.delete('username');
        const query = params.toString();
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
      }
      if (responses.slice(0, 2).some((res) => !res.ok) || !cal.success || !ig.success) {
        throw new Error('Не удалось проверить подключения. Повторите запрос.');
      }
      setError(null);
      setCalendar(cal);
      setInstagram(ig);
      if (responses[2].ok && tg?.success) {
        setTgBusinessStatus(tg);
        setTelegramStatusError(null);
      } else {
        setTelegramStatusError('Не удалось проверить Telegram. Повторите проверку подключения.');
      }
      setHours(normalizeWorkingHours(cal.workingHours) || '');
      setDuration(String(cal.slotDuration));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch external integration status on mount.
    void load();
  }, [load]);

  // Real-time server status polling while Telegram modal is open
  useEffect(() => {
    if (!telegramOpen || tgBusinessStatus?.connected) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/integrations/telegram-business/status', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error('Telegram status unavailable');
        setTelegramStatusError(null);
        if (data?.success && data.connected) {
          setTgBusinessStatus(data);
          showToast('Telegram-аккаунт успешно подтверждён!', undefined, 'success');
        }
      } catch {
        setTelegramStatusError('Не удалось проверить Telegram. Повторите проверку подключения.');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [telegramOpen, tgBusinessStatus?.connected, showToast]);

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

  const handleGenerateBindLink = async () => {
    if (!agentId) {
      showToast('Выберите сотрудника', 'Укажите ответственного ИИ-сотрудника для привязки к аккаунту', 'error');
      return;
    }
    setBindLoading(true);
    try {
      const res = await fetch('/api/integrations/telegram-business/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Не удалось создать ссылку');
      setBindData(data);
      showToast('Ссылка создана', 'Перейдите в Telegram для подтверждения', 'success');
    } catch (err) {
      showToast('Ошибка', err instanceof Error ? err.message : 'Не удалось создать ссылку', 'error');
    } finally {
      setBindLoading(false);
    }
  };

  const handleDisconnectTgAccount = async () => {
    if (await update('/api/integrations/telegram-business/disconnect')) {
      setBindData(null);
      showToast('Telegram-аккаунт отключён');
    }
  };

  const handleToggleTgAccount = async () => {
    if (await update('/api/integrations/telegram-business/toggle')) {
      showToast('Статус автоответов обновлён');
    }
  };

  const connectedAgents = agents.filter((agent) => agent.telegramConnected);
  const selectedAgent = agents.find((agent) => agent.id === agentId);
  const isSelectedConnected = Boolean(selectedAgent?.telegramConnected);

  const activeMessagingCount =
    (connectedAgents.length > 0 || tgBusinessStatus?.connected ? 1 : 0) +
    (instagram?.connected ? 1 : 0);
  const activeCount = activeMessagingCount + (calendar?.connected ? 1 : 0);

  if (view === 'widget_settings') {
    return (
      <div className="w-full py-2">
        <WebsiteWidgetSettingsView onBack={() => setView('catalog')} />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-10">
      {connectionNotice && (
        <div role="status" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm flex items-start justify-between gap-3">
          <span>{connectionNotice}</span>
          <Button variant="ghost" size="sm" aria-label={t.common.close} onClick={() => setConnectionNotice(null)}><X size={16} /></Button>
        </div>
      )}
      {telegramStatusError && (
        <div role="alert" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm flex items-center justify-between gap-3">
          <span>{telegramStatusError}</span>
          <Button variant="ghost" size="sm" onClick={() => void load()}>{t.common.retry}</Button>
        </div>
      )}
      {/* ========================================================================= */}
      {/* 1. PAGE HEADER & NEUTRAL CONNECTION COUNTER */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title={t.integrations.title}
          description={locale === 'uz' ? 'Sotuvlar, qo‘llab-quvvatlash va mijozlarni avtomatik qabulga yozish ulanishlari katalogi.' : 'Каталог подключений для ваших продаж, поддержки и автоматической записи клиентов.'}
        />
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] shadow-2xs self-start sm:self-auto">
          <span
            className={`inline-block size-2 rounded-full ${
              activeMessagingCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-500'
            }`}
          />
          <span>
            {t.integrations.channelsSummary.connectedChannels}: <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB] font-semibold">{activeMessagingCount}</strong> {locale === 'uz' ? 'ta ulangan' : 'подключено'}
            {calendar?.connected ? (locale === 'uz' ? ' · Jadval: Google Taqvim ulangan' : ' · Расписание: Google Календарь подключён') : ''}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ONBOARDING SEQUENCE (IF 0 CONNECTED) OR ACTIVE SUMMARY */}
      {/* ========================================================================= */}
      {activeCount === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="size-8 rounded-xl bg-red-500/10 dark:bg-red-500/20 text-[#FF7277] flex items-center justify-center shrink-0">
              <Flag size={18} />
            </div>
            <h2 className="font-semibold text-base text-[var(--text-primary)] dark:text-[#F4F7FB]">
              {t.integrations.onboarding.title}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[#AABAD0] max-w-2xl mb-4 leading-relaxed">
            {t.integrations.onboarding.desc}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]">
              <span className="size-6 rounded-lg bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-bold text-xs flex items-center justify-center shrink-0 text-[#FF7277]">
                1
              </span>
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                  {t.integrations.onboarding.step1Title}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5 leading-snug">
                  {t.integrations.onboarding.step1Desc}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]">
              <span className="size-6 rounded-lg bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-bold text-xs flex items-center justify-center shrink-0 text-[#FF7277]">
                2
              </span>
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                  {t.integrations.onboarding.step2Title}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5 leading-snug">
                  {t.integrations.onboarding.step2Desc}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]">
              <span className="size-6 rounded-lg bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-bold text-xs flex items-center justify-center shrink-0 text-[#FF7277]">
                3
              </span>
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                  {t.integrations.onboarding.step3Title}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5 leading-snug">
                  {t.integrations.onboarding.step3Desc}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-[#142137] dark:border-emerald-500/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-block size-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                {t.integrations.channelsSummary.activeDesc}
              </p>
              <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                {connectedAgents.length > 0 && `Telegram: @${connectedAgents[0].telegramUsername || 'bot'}`}
                {calendar?.connected && ` · Google ${locale === 'uz' ? 'Taqvim' : 'Календарь'}: ${calendar.email || (locale === 'uz' ? 'faol' : 'активен')}`}
                {instagram?.connected && ` · Instagram: @${instagram.username || (locale === 'uz' ? 'faol' : 'активен')}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTab('events')}
            className="text-xs font-semibold text-[#FF7277] hover:underline flex items-center gap-1 shrink-0 cursor-pointer self-start sm:self-auto"
          >
            {t.integrations.channelsSummary.viewQueue}
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FILTER TABS & WORK HISTORY ACTION */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          className="flex items-center gap-1 p-1 bg-[var(--surface-secondary)]/70 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] rounded-2xl overflow-x-auto"
          aria-label={locale === 'uz' ? 'Integratsiyalar toifalari' : 'Категории интеграций'}
        >
          {tabsList.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={tab === item.id}
              className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                tab === item.id
                  ? 'bg-[var(--surface)] dark:bg-[#142137] text-[var(--text-primary)] dark:text-[#F4F7FB] shadow-xs font-semibold'
                  : 'text-[var(--text-secondary)] dark:text-[#AABAD0] hover:text-[var(--text-primary)] dark:hover:text-[#F4F7FB]'
              }`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          aria-pressed={tab === 'events'}
          onClick={() => setTab(tab === 'events' ? 'all' : 'events')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-all cursor-pointer self-start sm:self-auto ${
            tab === 'events'
              ? 'bg-[#FF7277] text-[#0B1220] border-[#FF7277] font-semibold'
              : 'bg-[var(--surface)] dark:bg-[#142137] text-[var(--text-secondary)] dark:text-[#AABAD0] border-[var(--border)] dark:border-[#29374C] hover:border-[var(--border-strong)]'
          }`}
        >
          <History size={16} />
          <span>{t.integrations.tabs.history}</span>
        </button>
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
      {/* 4. MAIN INTEGRATIONS CATALOG (UNIFIED 4-CARD COMPACT GRID) */}
      {/* ========================================================================= */}
      {tab !== 'events' ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-5">
            {/* CARD 1: Telegram */}
            {['all', 'messages'].includes(tab) && (
              <div
                className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-6 hover:border-[var(--border-strong)] dark:hover:border-slate-500 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                onClick={() => {
                  if (connectedAgents[0]) setAgentId(connectedAgents[0].id);
                  setTelegramOpen(true);
                }}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="size-12 rounded-2xl bg-[#229ED9]/10 flex items-center justify-center shrink-0 border border-[#229ED9]/20 group-hover:scale-105 transition-transform">
                      <Image src="/integrations/telegram.svg" width={30} height={30} alt="Telegram" />
                    </div>
                    <Badge variant={tgBusinessStatus?.connected || connectedAgents.length > 0 ? 'success' : 'neutral'}>
                      {agentsError || telegramStatusError
                        ? t.integrations.status.unavailable
                        : tgBusinessStatus?.connected
                        ? t.integrations.status.accountConnected
                        : connectedAgents.length
                        ? t.integrations.status.botConnected
                        : `○ ${t.integrations.notConnected}`}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-base text-[var(--text-primary)] dark:text-[#F4F7FB]">
                        Telegram
                      </h3>
                      <span className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                        {locale === 'uz' ? 'Shaxsiy hisob / Bot' : 'Личный аккаунт / Бот'}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
                      {tgBusinessStatus?.connected
                        ? (locale === 'uz'
                            ? `Shaxsiy hisob: @${tgBusinessStatus.username || tgBusinessStatus.userId || 'ulangan'} · Xodim: ${tgBusinessStatus.agentName || 'AI'}`
                            : `Личный аккаунт: @${tgBusinessStatus.username || tgBusinessStatus.userId || 'подключён'} · Сотрудник: ${tgBusinessStatus.agentName || 'ИИ'}`)
                        : connectedAgents.length
                        ? (locale === 'uz'
                            ? `Bot faol: ${connectedAgents
                                .map((agent) => `${agent.telegramUsername ? '@' + agent.telegramUsername : agent.name}`)
                                .join(', ')}`
                            : `Активен бот: ${connectedAgents
                                .map((agent) => `${agent.telegramUsername ? '@' + agent.telegramUsername : agent.name}`)
                                .join(', ')}`)
                        : (locale === 'uz'
                            ? 'Telegramda shaxsiy hisob nomidan javob bering (Kotib rejimi) yoki o‘z botingizni ulang.'
                            : 'Отвечайте в Telegram от имени личного аккаунта (Secretary Mode) или подключите своего бота.')}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[var(--border)] dark:border-[#29374C]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (connectedAgents[0]) setAgentId(connectedAgents[0].id);
                      setTelegramOpen(true);
                    }}
                  >
                    {tgBusinessStatus?.connected || connectedAgents.length ? t.integrations.status.configure : t.integrations.connect}
                  </Button>
                </div>
              </div>
            )}

            {/* CARD 2: Instagram Direct */}
            {['all', 'messages'].includes(tab) && (
              <div
                className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-6 hover:border-[var(--border-strong)] dark:hover:border-slate-500 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                onClick={() => setInstagramOpen(true)}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="size-12 rounded-2xl bg-pink-500/10 dark:bg-pink-500/15 flex items-center justify-center shrink-0 border border-pink-500/25 group-hover:scale-105 transition-transform">
                      <Image src="/integrations/instagram.svg" width={28} height={28} alt="Instagram" />
                    </div>
                    <Badge variant={instagram?.connected ? 'success' : 'neutral'}>
                      {loading
                        ? t.integrations.status.checking
                        : error
                        ? t.integrations.status.unavailable
                        : instagram?.connected
                        ? `● ${t.integrations.connected}`
                        : `○ ${t.integrations.notConnected}`}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-base text-[var(--text-primary)] dark:text-[#F4F7FB]">
                        Instagram Direct
                      </h3>
                      <span className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                        {locale === 'uz' ? 'Ijtimoiy tarmoq' : 'Соцсеть'}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
                      {instagram?.connected
                        ? (locale === 'uz'
                            ? `@${instagram.username || 'hisob'} · Avtojavoblar ${
                                instagram.autoReply ? 'yoqilgan' : 'o‘chirilgan'
                              }`
                            : `@${instagram.username || 'аккаунт'} · Автоответы ${
                                instagram.autoReply ? 'включены' : 'выключены'
                              }`)
                        : (locale === 'uz'
                            ? 'Directdagi mijozlar xabarlariga tezkor avtojavoblar, murojaatlarni saralash va 24/7 lidlarni yig‘ish.'
                            : 'Автоответы клиентам в Direct, квалификация обращений и сбор лидов 24/7 без потери клиентов.')}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[var(--border)] dark:border-[#29374C]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInstagramOpen(true);
                    }}
                  >
                    {instagram?.connected ? (locale === 'uz' ? 'Direct sozlamalari' : 'Настройки Direct') : t.integrations.connect}
                  </Button>
                </div>
              </div>
            )}

            {/* CARD 3: Чат на сайте (Compact matching other cards) */}
            {['all', 'websites'].includes(tab) && (
              <div
                className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-6 hover:border-[var(--border-strong)] dark:hover:border-slate-500 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                onClick={() => setView('widget_settings')}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="size-12 rounded-2xl bg-[#DC2626]/10 flex items-center justify-center shrink-0 border border-[#DC2626]/20 group-hover:scale-105 transition-transform text-[#DC2626]">
                      <Globe size={28} />
                    </div>
                    <Badge variant="success">
                      {t.integrations.status.readyToInstall}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-base text-[var(--text-primary)] dark:text-[#F4F7FB]">
                        {t.integrations.widgetTitle}
                      </h3>
                      <span className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                        {locale === 'uz' ? 'Vidjet' : 'Виджет'}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
                      {t.integrations.widgetDesc}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[var(--border)] dark:border-[#29374C]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold"
                    onClick={(e) => {
                      e.stopPropagation();
                      setView('widget_settings');
                    }}
                  >
                    {locale === 'uz' ? 'Vidjetni sozlash' : 'Настроить виджет'}
                  </Button>
                </div>
              </div>
            )}

            {/* CARD 4: Google Calendar */}
            {['all', 'calendar'].includes(tab) && (
              <div
                className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-6 hover:border-[var(--border-strong)] dark:hover:border-slate-500 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                onClick={() => setCalendarOpen(true)}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="size-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 border border-[var(--border)] dark:border-[#29374C] group-hover:scale-105 transition-transform">
                      <Image src="/integrations/google-calendar.png" width={28} height={28} alt="Google Calendar" className="object-contain" />
                    </div>
                    <Badge variant={calendar?.connected ? 'success' : 'neutral'}>
                      {loading
                        ? t.integrations.status.checking
                        : error
                        ? t.integrations.status.unavailable
                        : calendar?.connected
                        ? `● ${t.integrations.connected}`
                        : `○ ${t.integrations.notConnected}`}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-base text-[var(--text-primary)] dark:text-[#F4F7FB]">
                        {t.integrations.calendarTitle}
                      </h3>
                      <span className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                        {locale === 'uz' ? 'Mijozlarni yozish' : 'Запись клиентов'}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
                      {calendar?.connected
                        ? (locale === 'uz'
                            ? `${calendar.email || 'Sinxronlangan'} · ${calendar.workingHours} (${calendar.slotDuration} daq)`
                            : `${calendar.email || 'Синхронизирован'} · ${calendar.workingHours} (${calendar.slotDuration} мин)`)
                        : (locale === 'uz'
                            ? 'Bo‘sh vaqtlarni avtomatik tekshirish va mijozlarni uchrashuvlarga yozish.'
                            : 'Автоматическая запись клиентов на консультации с проверкой свободных окон в календаре.')}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[var(--border)] dark:border-[#29374C]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCalendarOpen(true);
                    }}
                  >
                    {calendar?.connected ? (locale === 'uz' ? 'Jadvalni sozlash' : 'Настроить расписание') : t.integrations.connect}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Event Log Queue View */
        <div className="pt-2">
          <ChannelEventLog />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SUPPORT HELPER ROW */}
      {/* ========================================================================= */}
      <Link
        href="/dashboard/support"
        className="border border-[var(--border)] dark:border-[#29374C] rounded-2xl p-5 bg-[var(--surface)] dark:bg-[#142137] hover:bg-[var(--surface-secondary)]/50 dark:hover:bg-[#101B2E] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs group"
      >
        <div className="flex items-center gap-4">
          <div className="size-11 rounded-xl bg-slate-100 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] flex items-center justify-center text-[var(--text-secondary)] dark:text-[#AABAD0] group-hover:text-[#FF7277] transition-colors shrink-0">
            <Headphones size={20} />
          </div>
          <div>
            <p className="font-semibold text-sm text-[var(--text-primary)] dark:text-[#F4F7FB]">
              {t.integrations.supportHelper.title}
            </p>
            <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
              {t.integrations.supportHelper.desc}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-[#FF7277] inline-flex items-center gap-1 shrink-0">
          {t.integrations.supportHelper.cta}
        </span>
      </Link>

      {/* ========================================================================= */}
      {/* 6. MODALS & SERVICE DIALOGS */}
      {/* ========================================================================= */}

      {/* 6.1 Website Widget Modal */}
      <WebsiteWidgetModal open={widgetOpen} onClose={() => setWidgetOpen(false)} />

      {/* 6.2 "Как это работает" Guide Dialog */}
      <Dialog
        open={widgetGuideOpen}
        onClose={() => setWidgetGuideOpen(false)}
        label={locale === 'uz' ? 'Saytdagi chat qanday ishlaydi' : 'Как работает чат на сайте'}
        className="w-[calc(100vw-32px)] sm:w-[520px] max-w-[520px] p-0 rounded-2xl overflow-hidden border border-[var(--border)] dark:border-[#29374C] shadow-2xl bg-[var(--surface)] dark:bg-[#142137]"
      >
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--border)] dark:border-[#29374C] pb-3.5">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-red-500/10 dark:bg-red-500/20 text-[#FF7277] flex items-center justify-center shrink-0 border border-red-500/20 shadow-xs">
                <Globe size={24} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                  {locale === 'uz' ? 'Saytdagi chat qanday ishlaydi' : 'Как работает чат на сайте'}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
                  {locale === 'uz' ? 'Vidjetni o‘rnatish va ishlash tamoyillari' : 'Установка и принципы работы виджета'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setWidgetGuideOpen(false)}
              aria-label={t.common.close}
            >
              <X size={18} />
            </Button>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-[var(--text-secondary)] dark:text-[#AABAD0]">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]">
              <span className="size-5 rounded-full bg-[var(--surface)] dark:bg-[#142137] font-bold text-[10px] flex items-center justify-center shrink-0 text-[#FF7277] mt-0.5">
                1
              </span>
              <div>
                <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB] block">
                  {locale === 'uz' ? 'Kodni nusxalash' : 'Копирование кода'}
                </strong>
                {locale === 'uz'
                  ? <>Tayyor skriptning bitta qatorini saytingizdagi <code className="font-mono text-[11px]">&lt;/body&gt;</code> tegidan oldin joylashtiring: Tilda, WordPress, 1C-Bitrix, Webflow yoki toza HTML.</>
                  : <>Вставьте одну строчку готового скрипта перед закрывающим тегом <code className="font-mono text-[11px]">&lt;/body&gt;</code> на любой платформе: Tilda, WordPress, 1C-Битрикс, Webflow или чистый HTML.</>}
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]">
              <span className="size-5 rounded-full bg-[var(--surface)] dark:bg-[#142137] font-bold text-[10px] flex items-center justify-center shrink-0 text-[#FF7277] mt-0.5">
                2
              </span>
              <div>
                <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB] block">
                  {locale === 'uz' ? 'Biznesingiz bilimlari' : 'Знания вашего бизнеса'}
                </strong>
                {locale === 'uz'
                  ? 'AI-maslahatchi biriktirilgan xodim profilidagi reglamentlar, narxlar va tovar tavsiflaridan foydalanadi.'
                  : 'ИИ-консультант использует регламенты, прайс-лист и описания товаров, загруженные в профиле ответственного ИИ-сотрудника.'}
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]">
              <span className="size-5 rounded-full bg-[var(--surface)] dark:bg-[#142137] font-bold text-[10px] flex items-center justify-center shrink-0 text-[#FF7277] mt-0.5">
                3
              </span>
              <div>
                <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB] block">
                  {locale === 'uz' ? 'Saralash va kontaktlar' : 'Квалификация и контакты'}
                </strong>
                {locale === 'uz'
                  ? 'AI muloqotda mijozdan telefon yoki emailni so‘raydi va kontaktni darhol «Mijozlar va yozuvlar» bo‘limiga yuboradi.'
                  : 'ИИ мягко запрашивает телефон или email клиента в диалоге и мгновенно передаёт контакт в раздел «Лиды и записи».'}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border)] dark:border-[#29374C]">
            <Button type="button" variant="ghost" onClick={() => setWidgetGuideOpen(false)}>
              {t.common.close}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setWidgetGuideOpen(false);
                setWidgetOpen(true);
              }}
            >
              {locale === 'uz' ? 'Sozlashga o‘tish' : 'Перейти к настройке'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 6.3 Telegram Modal */}
      <Dialog
        open={telegramOpen}
        onClose={() => {
          if (!busy && !bindLoading) {
            setTelegramOpen(false);
            setToken('');
          }
        }}
        label={locale === 'uz' ? 'Telegramni ulash' : 'Подключение Telegram'}
        className="w-[calc(100vw-32px)] sm:w-[540px] max-w-[540px] p-0 rounded-2xl overflow-hidden border border-[var(--border)] dark:border-[#29374C] shadow-2xl bg-[var(--surface)] dark:bg-[#142137]"
      >
        <div className="p-5 sm:p-6 space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-[var(--border)] dark:border-[#29374C] pb-3.5">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-[#229ED9]/10 flex items-center justify-center shrink-0 border border-[#229ED9]/20 shadow-xs">
                <Image src="/integrations/telegram.svg" width={26} height={26} alt="Telegram" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                  {locale === 'uz' ? 'Telegramni ulash' : 'Подключение Telegram'}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
                  {locale === 'uz' ? 'Shaxsiy hisob (Kotib rejimi) yoki o‘z botingiz' : 'Личный аккаунт (Secretary Mode) или собственный бот'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy || bindLoading}
              onClick={() => {
                setTelegramOpen(false);
                setToken('');
              }}
              aria-label={t.common.close}
            >
              <X size={18} />
            </Button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[var(--surface-secondary)] dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] text-xs font-medium">
            <button
              type="button"
              onClick={() => setTgTab('account')}
              className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                tgTab === 'account'
                  ? 'bg-[var(--surface)] dark:bg-[#142137] text-[var(--text-primary)] dark:text-[#F4F7FB] shadow-xs font-semibold'
                  : 'text-[var(--text-secondary)] dark:text-[#AABAD0] hover:text-[var(--text-primary)] dark:hover:text-[#F4F7FB]'
              }`}
            >
              <span>{locale === 'uz' ? 'Telegram-hisob' : 'Telegram-аккаунт'}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                {locale === 'uz' ? 'Tavsiya etiladi' : 'Рекомендуем'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTgTab('custom_bot')}
              className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                tgTab === 'custom_bot'
                  ? 'bg-[var(--surface)] dark:bg-[#142137] text-[var(--text-primary)] dark:text-[#F4F7FB] shadow-xs font-semibold'
                  : 'text-[var(--text-secondary)] dark:text-[#AABAD0] hover:text-[var(--text-primary)] dark:hover:text-[#F4F7FB]'
              }`}
            >
              <span>{locale === 'uz' ? 'O‘z Telegram-boti' : 'Свой Telegram-бот'}</span>
            </button>
          </div>

          {/* TAB 1: Telegram Business / Secretary Mode */}
          {tgTab === 'account' && (
            <div className="space-y-4">
              {tgBusinessStatus?.connected ? (
                /* Connected State */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {locale === 'uz' ? 'Hisob ulangan (Kotib rejimi)' : 'Аккаунт подключён (Secretary Mode)'}
                        </span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] text-[var(--text-secondary)] dark:text-[#AABAD0]">
                        {tgBusinessStatus.enabled
                          ? (locale === 'uz' ? 'Avtojavoblar faol' : 'Автоответы активны')
                          : (locale === 'uz' ? 'To‘xtatilgan' : 'На паузе')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-[var(--surface)]/70 dark:bg-[#142137]/70 border border-[var(--border)] dark:border-[#29374C]">
                        <span className="text-[10px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 block">
                          {locale === 'uz' ? 'Telegram-hisob:' : 'Telegram-аккаунт:'}
                        </span>
                        <span className="font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB] truncate block">
                          @{tgBusinessStatus.username || tgBusinessStatus.userId}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[var(--surface)]/70 dark:bg-[#142137]/70 border border-[var(--border)] dark:border-[#29374C]">
                        <span className="text-[10px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 block">
                          {locale === 'uz' ? 'Mas\'ul AI:' : 'Ответственный ИИ:'}
                        </span>
                        <span className="font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB] truncate block">
                          {tgBusinessStatus.agentName || (locale === 'uz' ? 'AI-xodim' : 'ИИ-сотрудник')}
                        </span>
                      </div>
                    </div>

                    {!tgBusinessStatus.canReply && (
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
                        {locale === 'uz'
                          ? '⚠️ Telegram Business sozlamalarida botning xabarlarga javob berish huquqi o‘chirilgan. Telegram ilovasida bot sozlamalarida «Javob berishga ruxsat»ni yoqing.'
                          : '⚠️ В Telegram Business отключено право бота отвечать на сообщения. Включите «Разрешить отвечать» в настройках бота в приложении Telegram.'}
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--surface-secondary)]/60 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] space-y-1">
                    <p className="font-medium text-[var(--text-primary)] dark:text-[#F4F7FB]">
                      {locale === 'uz' ? 'Qo‘lda boshqarish (Human Takeover):' : 'Ручной перехват (Human Takeover):'}
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      {locale === 'uz'
                        ? 'Telegramda mijozga o‘zingiz shaxsan xabar yozganingizda, AI boshqaruvni darhol sizga o‘tkazadi va ushbu suhbatda avtojavoblarni to‘xtatadi.'
                        : 'Когда вы лично отправляете сообщение клиенту в Telegram, ИИ сразу передаёт управление вам и останавливает автоответы в этом диалоге.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] dark:border-[#29374C]">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      className="text-xs text-[var(--danger-text)] hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={handleDisconnectTgAccount}
                    >
                      {locale === 'uz' ? 'Hisobni uzish' : 'Отключить аккаунт'}
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={handleToggleTgAccount}
                      >
                        {tgBusinessStatus.enabled
                          ? (locale === 'uz' ? 'To‘xtatish' : 'Поставить на паузу')
                          : (locale === 'uz' ? 'Faollashtirish' : 'Возобновить')}
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => setTelegramOpen(false)}
                      >
                        {locale === 'uz' ? 'Tayyor' : 'Готово'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Unconnected State: 3 clear steps */
                <div className="space-y-4">
                  {/* Step Progress Indicators */}
                  <div className="grid grid-cols-3 gap-2 pb-2 border-b border-[var(--border)] dark:border-[#29374C] text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-[var(--text-primary)] dark:text-[#F4F7FB]">
                      <span
                        className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          agentId ? 'bg-emerald-500 text-white' : 'bg-[#DC2626] text-white'
                        }`}
                      >
                        {agentId ? <Check size={11} strokeWidth={3} /> : '1'}
                      </span>
                      <span>{locale === 'uz' ? 'Xodim' : 'Сотрудник'}</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 font-medium ${
                        bindData
                          ? 'text-[var(--text-primary)] dark:text-[#F4F7FB]'
                          : 'text-[var(--text-muted)] dark:text-[#AABAD0]/70'
                      }`}
                    >
                      <span
                        className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          bindData
                            ? 'bg-[#229ED9] text-white'
                            : 'bg-[var(--surface-secondary)] dark:bg-[#101B2E] text-[var(--text-muted)] border border-[var(--border)] dark:border-[#29374C]'
                        }`}
                      >
                        2
                      </span>
                      <span>Telegram</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-medium text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                      <span className="size-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-[var(--surface-secondary)] dark:bg-[#101B2E] text-[var(--text-muted)] border border-[var(--border)] dark:border-[#29374C]">
                        3
                      </span>
                      <span>{locale === 'uz' ? 'Tekshirish' : 'Проверка'}</span>
                    </div>
                  </div>

                  {/* Step 1: Select Employee */}
                  <div>
                    <Select
                      label={locale === 'uz' ? 'Mas\'ul AI-xodim' : 'Ответственный ИИ-сотрудник'}
                      value={agentId}
                      onChange={(e) => setAgentId(e.target.value)}
                      required
                      options={[
                        { value: '', label: locale === 'uz' ? 'Xodimni tanlang' : 'Выберите сотрудника' },
                        ...agents.map((agent) => ({
                          value: agent.id,
                          label: `${agent.name}${agent.isActive ? '' : (locale === 'uz' ? ' (nofaol)' : ' (неактивен)')}`,
                        })),
                      ]}
                    />
                    <p className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 mt-1">
                      {locale === 'uz'
                        ? 'AI-xodim ulangan Telegram-hisobingizdagi mijozlar xabarlariga javob beradi.'
                        : 'ИИ-сотрудник будет отвечать на сообщения клиентов в подключённом Telegram-аккаунте.'}
                    </p>
                  </div>

                  {/* Step 2: Confirmation in Telegram */}
                  {!bindData ? (
                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="primary"
                        className="w-full bg-[#229ED9] hover:bg-[#1c8ec4] text-white text-xs font-semibold py-2.5 shadow-xs"
                        disabled={!agentId || bindLoading}
                        isLoading={bindLoading}
                        onClick={handleGenerateBindLink}
                      >
                        <span>{locale === 'uz' ? 'Telegramda davom etish ↗' : 'Продолжить в Telegram ↗'}</span>
                      </Button>
                      <p className="text-[11px] text-center text-[var(--text-muted)] dark:text-[#AABAD0]/70 mt-2">
                        {locale === 'uz' ? 'Xavfsiz havola 15 daqiqa davomida amal qiladi.' : 'Создаётся безопасная ссылка со сроком действия 15 минут.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      {/* Single Primary Action Button */}
                      <a
                        href={bindData.bindUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#229ED9] hover:bg-[#1c8ec4] text-white text-xs font-semibold transition-all shadow-xs"
                      >
                        <span>{locale === 'uz' ? 'Telegramda ochish' : 'Открыть в Telegram'}</span>
                        <ExternalLink size={14} />
                      </a>

                      {/* Secondary action: subtle copy & validity */}
                      <div className="flex items-center justify-between px-1 text-xs">
                        <span className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 flex items-center gap-1">
                          <Clock3 size={12} />
                          <span>{locale === 'uz' ? 'Havola 15 daqiqa amal qiladi' : 'Ссылка действительна 15 минут'}</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(bindData.bindUrl);
                            setCopiedBindUrl(true);
                            setTimeout(() => setCopiedBindUrl(false), 2000);
                          }}
                          className="text-[11px] text-[#229ED9] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedBindUrl ? (
                            <>
                              <Check size={12} className="text-emerald-500" />
                              <span>{locale === 'uz' ? 'Nusxa olindi' : 'Скопировано'}</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>{locale === 'uz' ? 'Havolani nusxalash' : 'Скопировать ссылку'}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Real Server Status Indicator */}
                      <div className="p-3 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] flex items-center gap-2.5">
                        <span className="size-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        <div className="text-xs">
                          <p className="font-medium text-[var(--text-primary)] dark:text-[#F4F7FB]">
                            {locale === 'uz' ? 'Telegramda tasdiqlash kutilmoqda...' : 'Ожидаем подтверждение в Telegram...'}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 mt-0.5">
                            {locale === 'uz'
                              ? 'Botga /start yuboring va Telegram sozlamalarida chat-botni yoqing.'
                              : 'Отправьте /start боту и включите чат-бота в настройках Telegram.'}
                          </p>
                        </div>
                      </div>

                      {/* On-Demand Help Accordion */}
                      <div className="rounded-xl border border-[var(--border)] dark:border-[#29374C] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setTgHelpOpen(!tgHelpOpen)}
                          className="w-full flex items-center justify-between p-3 bg-[var(--surface-secondary)]/30 dark:bg-[#101B2E]/60 text-xs font-semibold text-[var(--text-secondary)] dark:text-[#AABAD0] hover:text-[var(--text-primary)] dark:hover:text-[#F4F7FB] transition-colors cursor-pointer"
                        >
                          <span>{locale === 'uz' ? 'Yordam kerakmi?' : 'Нужна помощь?'}</span>
                          {tgHelpOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {tgHelpOpen && (
                          <div className="p-3.5 space-y-2.5 text-xs border-t border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137]">
                            <div className="space-y-2">
                              <div className="flex items-start gap-2.5">
                                <span className="size-4.5 rounded-full bg-[var(--surface-secondary)] dark:bg-[#101B2E] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 text-[#229ED9]">
                                  1
                                </span>
                                <span className="text-[var(--text-secondary)] dark:text-[#AABAD0] leading-snug">
                                  {locale === 'uz' ? (
                                    <><strong>«Telegramda ochish»</strong> tugmasini bosing va <strong>@{bindData.botUsername}</strong> botiga <code className="font-mono text-[11px] text-[var(--text-primary)] dark:text-[#F4F7FB]">/start</code> yuboring.</>
                                  ) : (
                                    <>Нажмите <strong>«Открыть в Telegram»</strong> и отправьте команду <code className="font-mono text-[11px] text-[var(--text-primary)] dark:text-[#F4F7FB]">/start</code> боту <strong>@{bindData.botUsername}</strong>.</>
                                  )}
                                </span>
                              </div>

                              <div className="flex items-start gap-2.5">
                                <span className="size-4.5 rounded-full bg-[var(--surface-secondary)] dark:bg-[#101B2E] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 text-[#229ED9]">
                                  2
                                </span>
                                <span className="text-[var(--text-secondary)] dark:text-[#AABAD0] leading-snug">
                                  {locale === 'uz' ? (
                                    <>Telegramda oching: <strong>Sozlamalar → Telegram Business → Chat-botlar</strong>.</>
                                  ) : (
                                    <>В Telegram откройте: <strong>Настройки → Telegram Business → Чат-боты</strong>.</>
                                  )}
                                </span>
                              </div>

                              <div className="flex items-start gap-2.5">
                                <span className="size-4.5 rounded-full bg-[var(--surface-secondary)] dark:bg-[#101B2E] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 text-[#229ED9]">
                                  3
                                </span>
                                <span className="text-[var(--text-secondary)] dark:text-[#AABAD0] leading-snug">
                                  {locale === 'uz' ? (
                                    <><strong>@{bindData.botUsername}</strong> botini qo‘shing va <strong>«Xabarlarga javob berish»</strong> bandini albatta yoqing.</>
                                  ) : (
                                    <>Добавьте бота <strong>@{bindData.botUsername}</strong> и обязательно включите пункт <strong>«Отвечать на сообщения»</strong>.</>
                                  )}
                                </span>
                              </div>
                            </div>

                            <p className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 pt-2 border-t border-[var(--border)] dark:border-[#29374C]">
                              {locale === 'uz'
                                ? 'Agar havola muddati tugagan bo‘lsa yoki Telegram so‘rovni rad etsa, «Qayta o‘rnatish» tugmasini bosing va yangi havola yarating.'
                                : 'Если ссылка истекла или Telegram отклонил запрос, нажмите «Сбросить» и создайте новую ссылку.'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Modal Footer Controls */}
                      <div className="flex justify-between items-center pt-2 border-t border-[var(--border)] dark:border-[#29374C]">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setBindData(null)}
                          className="text-xs"
                        >
                          {locale === 'uz' ? 'Qayta o‘rnatish' : 'Сбросить'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          isLoading={loading}
                          onClick={async () => {
                            await load();
                            showToast(locale === 'uz' ? 'Holat yangilandi' : 'Статус обновлён');
                          }}
                          className="text-xs"
                        >
                          {locale === 'uz' ? 'Ulanishni tekshirish' : 'Проверить подключение'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Custom Bot */}
          {tgTab === 'custom_bot' && (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await update('/api/agents', { id: agentId, tgBotToken: token.trim() }, 'PATCH')) {
                  setTelegramOpen(false);
                  setToken('');
                }
              }}
            >
              {/* Active Bot Status (if current agent has connected bot) */}
              {isSelectedConnected && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="text-[var(--text-secondary)] dark:text-[#AABAD0] truncate">
                      {locale === 'uz' ? 'Bot faol: ' : 'Бот активен: '}
                      <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        @{selectedAgent?.telegramUsername || 'bot'}
                      </strong>
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    className="text-xs text-[var(--danger-text)] hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0 h-7 px-2"
                    onClick={async () => {
                      if (await update('/api/agents', { id: agentId, tgBotToken: '' }, 'PATCH')) {
                        setToken('');
                      }
                    }}
                  >
                    {t.integrations.disconnect}
                  </Button>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-3.5">
                <Select
                  label={locale === 'uz' ? 'Mas\'ul AI-xodim' : 'Ответственный ИИ-сотрудник'}
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  required
                  options={[
                    { value: '', label: locale === 'uz' ? 'Xodimni tanlang' : 'Выберите сотрудника' },
                    ...agents.map((agent) => ({
                      value: agent.id,
                      label: `${agent.name}${agent.telegramConnected ? (locale === 'uz' ? ' (Bot ulangan)' : ' (Бот подключён)') : ''}`,
                    })),
                  ]}
                />

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      {isSelectedConnected
                        ? (locale === 'uz' ? 'Yangi bot tokeni (almashtirish uchun):' : 'Новый токен бота (для замены):')
                        : (locale === 'uz' ? '@BotFather dan olingan bot tokeni:' : 'Токен бота из @BotFather:')}
                    </label>
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#229ED9] hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>@BotFather</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showCustomBotToken ? 'text' : 'password'}
                      autoComplete="off"
                      value={token}
                      onChange={(e) => setToken(e.target.value.trim())}
                      placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                      required={!isSelectedConnected}
                      className="w-full h-10 pl-3 pr-10 rounded-xl bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] text-[var(--text-primary)] dark:text-[#F4F7FB] font-mono text-xs focus:outline-hidden focus:border-[#229ED9]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustomBotToken(!showCustomBotToken)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[#F4F7FB] p-1 transition-colors cursor-pointer"
                      title={showCustomBotToken ? (locale === 'uz' ? 'Yashirish' : 'Скрыть токен') : (locale === 'uz' ? 'Ko‘rsatish' : 'Показать токен')}
                    >
                      {showCustomBotToken ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <div className="mt-2 p-2.5 rounded-lg bg-[var(--surface-secondary)]/60 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] flex items-start gap-2 text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/80">
                    <ShieldCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      {locale === 'uz'
                        ? 'Token server tomonidan tekshiriladi va shifrlangan holda saqlanadi. U hech qachon brauzer xotirasida (localStorage) saqlanmaydi.'
                        : 'Токен проверяется сервером и хранится в зашифрованном виде. Он никогда не сохраняется в локальной памяти браузера (localStorage/sessionStorage).'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Instruction */}
              <div className="rounded-xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface-secondary)]/60 dark:bg-[#101B2E] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                    {locale === 'uz' ? 'Bosqichma-bosqich ko‘rsatma:' : 'Пошаговая инструкция:'}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">~1 {locale === 'uz' ? 'daqiqa' : 'минута'}</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="size-4.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-semibold text-[10px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                      1
                    </span>
                    <span className="leading-snug text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      {locale === 'uz' ? (
                        <>Telegramda rasmiy <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-[#229ED9] hover:underline">@BotFather<ExternalLink size={10} /></a> botini oching.</>
                      ) : (
                        <>Откройте официального бота <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-[#229ED9] hover:underline">@BotFather<ExternalLink size={10} /></a> в Telegram.</>
                      )}
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="size-4.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-semibold text-[10px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                      2
                    </span>
                    <span className="leading-snug text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      {locale === 'uz' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText('/newbot');
                              setCopiedCmd(true);
                              setTimeout(() => setCopiedCmd(false), 2000);
                            }}
                            title="Buyruqdan nusxa olish uchun bosing"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-mono text-[11px] text-[var(--accent-link)] font-semibold hover:border-[var(--border-strong)] cursor-pointer"
                          >
                            /newbot
                            {copiedCmd ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                          </button>{' '}
                          buyrug‘ini yuboring va bot nomini kiriting (masalan, <em className="text-[var(--text-primary)] dark:text-[#F4F7FB]">Sotuv bo‘limi</em>).
                        </>
                      ) : (
                        <>
                          Отправьте команду{' '}
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText('/newbot');
                              setCopiedCmd(true);
                              setTimeout(() => setCopiedCmd(false), 2000);
                            }}
                            title="Нажмите, чтобы скопировать команду"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-mono text-[11px] text-[var(--accent-link)] font-semibold hover:border-[var(--border-strong)] cursor-pointer"
                          >
                            /newbot
                            {copiedCmd ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                          </button>{' '}
                          и укажите имя бота (например, <em className="text-[var(--text-primary)] dark:text-[#F4F7FB]">Отдел продаж</em>).
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="size-4.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-semibold text-[10px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                      3
                    </span>
                    <span className="leading-snug text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      {locale === 'uz' ? (
                        <>Bot username-ini <code className="font-mono text-[11px] text-[var(--text-primary)] dark:text-[#F4F7FB]">bot</code> bilan tugaydigan qilib belgilang (masalan: <span className="font-mono text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">myshop_sales_bot</span>).</>
                      ) : (
                        <>Задайте username бота с окончанием <code className="font-mono text-[11px] text-[var(--text-primary)] dark:text-[#F4F7FB]">bot</code> (например: <span className="font-mono text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">myshop_sales_bot</span>).</>
                      )}
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="size-4.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-semibold text-[10px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                      4
                    </span>
                    <span className="leading-snug text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      {locale === 'uz' ? (
                        <>Berilgan <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB]">HTTP API tokenini</strong> nusxalang va yuqoridagi maydonga joylang.</>
                      ) : (
                        <>Скопируйте выданный <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB]">HTTP API токен</strong> и вставьте в поле выше.</>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border)] dark:border-[#29374C]">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setTelegramOpen(false);
                    setToken('');
                  }}
                >
                  {t.common.cancel}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={busy}
                  disabled={(!token && !isSelectedConnected) || !agentId}
                >
                  {isSelectedConnected
                    ? (locale === 'uz' ? 'Tokanni yangilash' : 'Обновить токен')
                    : (locale === 'uz' ? 'Botni ulash' : 'Подключить бота')}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Dialog>

      {/* 6.4 Google Calendar Modal */}
      <Dialog
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        label={locale === 'uz' ? 'Taqvim sozlamalari' : 'Настройки календаря'}
        className="w-[calc(100vw-32px)] sm:w-[500px] max-w-[500px] p-0 rounded-2xl overflow-hidden border border-[var(--border)] dark:border-[#29374C] shadow-2xl bg-[var(--surface)] dark:bg-[#142137]"
      >
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--border)] dark:border-[#29374C] pb-3.5">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 border border-[var(--border)] dark:border-[#29374C] shadow-xs">
                <Image src="/integrations/google-calendar.png" width={26} height={26} alt="Google Calendar" className="object-contain" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                  Google {locale === 'uz' ? 'Taqvim' : 'Календарь'}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
                  {calendar?.connected
                    ? (locale === 'uz' ? 'Sinxronizatsiya faol' : 'Синхронизация активна')
                    : (locale === 'uz' ? 'Uchrashuvlarga avtomatik yozish' : 'Автоматическая запись на встречи')}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setCalendarOpen(false)}
              aria-label={t.common.close}
            >
              <X size={18} />
            </Button>
          </div>

          {!calendar?.connected ? (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
                {locale === 'uz'
                  ? 'Ishchi Google Taqvimni sinxronlang, shunda AI-agentlaringiz real vaqtda bo‘sh vaqtlarni tekshirib, mijozlarni uchrashuv va maslahatlarga avtomatik yozadi.'
                  : 'Синхронизируйте рабочий Google Календарь, чтобы ваши ИИ-агенты могли в реальном времени проверять свободные окна и автоматически записывать клиентов на встречи и консультации.'}
              </p>

              {/* Step-by-Step Instruction */}
              <div className="rounded-xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface-secondary)]/60 dark:bg-[#101B2E] p-3.5 space-y-2.5">
                <span className="text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB] block">
                  {locale === 'uz' ? 'Sinxronizatsiya qanday ishlaydi:' : 'Как работает синхронизация:'}
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="size-4.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-semibold text-[10px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                      1
                    </span>
                    <span className="leading-snug text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      {locale === 'uz'
                        ? '«Google orqali ulash» tugmasini bosing va ishchi hisobingizga kiring.'
                        : 'Нажмите кнопку «Подключить через Google» и авторизуйте рабочий аккаунт.'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="size-4.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-semibold text-[10px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                      2
                    </span>
                    <span className="leading-snug text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      {locale === 'uz'
                        ? 'Asosiy taqvimda bandlikni tekshirish va yangi tadbirlar yaratishga ruxsat bering.'
                        : 'Разрешите чтение занятости и создание событий в основном календаре.'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="size-4.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-semibold text-[10px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                      3
                    </span>
                    <span className="leading-snug text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      {locale === 'uz'
                        ? 'AI real vaqtda bo‘sh oraliqlarni tekshirib, mijozlarga to‘qnashuvsiz qulay vaqtlarni taklif qiladi.'
                        : 'ИИ будет проверять окна в реальном времени и предлагать клиентам слоты без накладок.'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-[var(--border)] dark:border-[#29374C]">
                <Button type="button" variant="ghost" onClick={() => setCalendarOpen(false)}>
                  {t.common.cancel}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={loading || busy || !calendar?.configured}
                  onClick={() => window.location.assign('/api/calendar/auth')}
                >
                  {locale === 'uz' ? 'Google orqali ulash' : 'Подключить через Google'}
                </Button>
              </div>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const normalizedHours = normalizeWorkingHours(hours);
                if (!normalizedHours) {
                  showToast(
                    locale === 'uz' ? 'Jadvalni tekshiring' : 'Проверьте расписание',
                    locale === 'uz' ? 'Ish kuni boshlanishi tugashidan oldin bo‘lishi kerak.' : 'Начало рабочего дня должно быть раньше окончания.',
                    'error'
                  );
                  return;
                }
                const ok = await update(
                  '/api/workspace/settings',
                  {
                    googleCalendarWorkingHours: normalizedHours,
                    googleCalendarSlotDuration: Number(duration),
                  },
                  'PATCH'
                );
                if (ok) setCalendarOpen(false);
              }}
            >
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <span className="text-[var(--text-secondary)] dark:text-[#AABAD0]">
                  {locale === 'uz' ? 'Ulangan hisob: ' : 'Подключённый аккаунт: '}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{calendar.email}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={locale === 'uz' ? 'Ish kuni boshlanishi' : 'Начало рабочего дня'}
                  type="time"
                  value={hours.split('-')[0] || ''}
                  onChange={(e) => setHours(`${e.target.value}-${hours.split('-')[1] || ''}`)}
                  required
                />
                <Input
                  label={locale === 'uz' ? 'Ish kuni tugashi' : 'Окончание рабочего дня'}
                  type="time"
                  value={hours.split('-')[1] || ''}
                  onChange={(e) => setHours(`${hours.split('-')[0] || ''}-${e.target.value}`)}
                  required
                />
              </div>

              <Select
                label={locale === 'uz' ? 'Uchrashuv vaqti davomiyligi' : 'Длительность слота встречи'}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                options={[15, 30, 45, 60, 90, 120].map((n) => ({
                  value: String(n),
                  label: `${n} ${locale === 'uz' ? 'daqiqa' : 'минут'}`,
                }))}
              />

              <p className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                {locale === 'uz'
                  ? 'Taqvim vaqt mintaqasi: Asia/Tashkent (xorijdagi mijozlar uchun avtomatik konvertatsiya).'
                  : 'Часовой пояс календаря: Asia/Tashkent (автоматическая конвертация для зарубежных клиентов).'}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] dark:border-[#29374C]">
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
                  {locale === 'uz' ? 'Taqvimni uzish' : 'Отключить календарь'}
                </Button>

                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setCalendarOpen(false)}>
                    {t.common.cancel}
                  </Button>
                  <Button type="submit" variant="primary" isLoading={busy} disabled={!dirty}>
                    {t.common.save}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </Dialog>

      {/* 6.5 Instagram Modal */}
      <Dialog
        open={instagramOpen}
        onClose={() => setInstagramOpen(false)}
        label={locale === 'uz' ? 'Instagram sozlamalari' : 'Настройки Instagram'}
        className="w-[calc(100vw-32px)] sm:w-[500px] max-w-[500px] p-0 rounded-2xl overflow-hidden border border-[var(--border)] dark:border-[#29374C] shadow-2xl bg-[var(--surface)] dark:bg-[#142137]"
      >
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--border)] dark:border-[#29374C] pb-3.5">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-pink-50 dark:bg-pink-950/40 flex items-center justify-center shrink-0 border border-pink-100 dark:border-pink-900/40 shadow-xs">
                <Image src="/integrations/instagram.svg" width={26} height={26} alt="Instagram" className="object-contain" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">Instagram Direct</h2>
                <Badge variant={instagram?.connected ? 'success' : 'neutral'}>
                  {instagram?.connected
                    ? (locale === 'uz' ? 'Ulangan' : 'Подключён')
                    : (locale === 'uz' ? 'Ulanmagan' : 'Не подключён')}
                </Badge>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setInstagramOpen(false)}
              aria-label={t.common.close}
            >
              <X size={18} />
            </Button>
          </div>

          {!instagram?.connected ? (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
                {locale === 'uz'
                  ? 'Instagram biznes-hisobingizni ulang, shunda AI-agentlar Directdagi mijozlarga darhol javob beradi, katalog yuboradi va 24/7 murojaatlarni saralaydi.'
                  : 'Подключите бизнес-аккаунт Instagram, чтобы ИИ-агенты моментально отвечали клиентам в Direct, отправляли каталог и квалифицировали обращения 24/7.'}
              </p>

              {/* Step-by-Step Instruction */}
              <div className="rounded-xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface-secondary)]/60 dark:bg-[#101B2E] p-3.5 space-y-2.5">
                <span className="text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB] block">
                  {locale === 'uz' ? 'Ulashdan oldingi talablar:' : 'Требования перед подключением:'}
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="size-4.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-semibold text-[10px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                      1
                    </span>
                    <span className="leading-snug text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      {locale === 'uz' ? (
                        <>Instagram profilingizni <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB]">«Professional (Biznes)»</strong> holatiga o‘tkazing.</>
                      ) : (
                        <>Переведите ваш Instagram в статус <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB]">«Профессиональный (Бизнес)»</strong>.</>
                      )}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="size-4.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-semibold text-[10px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                      2
                    </span>
                    <span className="leading-snug text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      {locale === 'uz' ? (
                        <>Instagram ilovasida: Sozlamalar → Xabarlar → Xabarlarga ruxsat → <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB]">«Ruxsat berish»</strong>ni yoqing.</>
                      ) : (
                        <>В приложении Instagram: Настройки → Сообщения → Доступ к сообщениям → Включите <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB]">«Разрешить доступ»</strong>.</>
                      )}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="size-4.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-semibold text-[10px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                      3
                    </span>
                    <span className="leading-snug text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      {locale === 'uz' ? (
                        <>Instagramni Facebook sahifasiga ulang va quyidagi tugma orqali kiring.</>
                      ) : (
                        <>Привяжите Instagram к странице Facebook и авторизуйтесь по кнопке ниже.</>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-[var(--border)] dark:border-[#29374C]">
                <Button type="button" variant="ghost" onClick={() => setInstagramOpen(false)}>
                  {t.common.cancel}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={loading || !instagram?.configured || busy}
                  onClick={() => {
                    window.location.href = '/api/instagram/auth';
                  }}
                >
                  {locale === 'uz' ? 'Instagramni ulash' : 'Подключить Instagram'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 text-xs">
                <span className="text-[var(--text-secondary)] dark:text-[#AABAD0]">
                  {locale === 'uz' ? 'Ulangan hisob: ' : 'Подключённый аккаунт: '}
                  <strong className="text-pink-600 dark:text-pink-400 font-semibold">@{instagram.username}</strong>
                </span>
              </div>

              <Select
                label={locale === 'uz' ? 'Mas\'ul xodim' : 'Ответственный сотрудник'}
                value={instagram.agentId || ''}
                disabled={busy}
                onChange={(e) => update('/api/instagram/status', { agentId: e.target.value }, 'PATCH')}
                options={[
                  { value: '', label: locale === 'uz' ? 'Xodimni tanlang' : 'Выберите сотрудника' },
                  ...agents.map((agent) => ({ value: agent.id, label: agent.name })),
                ]}
              />

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]">
                <div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB] block">
                    {locale === 'uz' ? 'AI avtojavoblari' : 'Автоответы ИИ'}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                    {locale === 'uz' ? 'Directdagi mijozlarga avtomatik javob berish' : 'Отвечать клиентам в Direct автоматически'}
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
                  {instagram.autoReply
                    ? (locale === 'uz' ? 'O‘chirish' : 'Выключить')
                    : (locale === 'uz' ? 'Yoqish' : 'Включить')}
                </Button>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] dark:border-[#29374C]">
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
                  {locale === 'uz' ? 'Instagramni uzish' : 'Отключить Instagram'}
                </Button>

                <Button type="button" variant="primary" onClick={() => setInstagramOpen(false)}>
                  {locale === 'uz' ? 'Tayyor' : 'Готово'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* 6.6 WhatsApp Modal */}
      <Dialog
        open={whatsappOpen}
        onClose={() => setWhatsappOpen(false)}
        label="WhatsApp Business"
        className="w-[calc(100vw-32px)] sm:w-[460px] max-w-[460px] p-0 rounded-2xl overflow-hidden border border-[var(--border)] dark:border-[#29374C] shadow-2xl bg-[var(--surface)] dark:bg-[#142137]"
      >
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--border)] dark:border-[#29374C] pb-3.5">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
                <Image src="/integrations/whatsapp.svg" width={26} height={26} alt="WhatsApp" className="object-contain" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">WhatsApp Business</h2>
                <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
                  {locale === 'uz' ? 'Sotuvlar va mijozlar xizmati uchun messenjer' : 'Мессенджер для продаж и поддержки'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setWhatsappOpen(false)}
              aria-label={t.common.close}
            >
              <X size={18} />
            </Button>
          </div>

          <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
            {locale === 'uz'
              ? 'Rasmiy WhatsApp Cloud API orqali to‘g‘ridan-to‘g‘ri integratsiya yopiq test bosqichida. Tez orada biznes-raqamni ulab, sotuvlarni WhatsAppda avtomatlashtirishingiz mumkin.'
              : 'Прямая интеграция через официальный WhatsApp Cloud API находится на стадии закрытого тестирования. Скоро вы сможете подключить бизнес-номер и автоматизировать продажи в WhatsApp.'}
          </p>

          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300">
            {locale === 'uz'
              ? 'Beta-testga erta kirish uchun yordam bo‘limiga murojaat qoldiring.'
              : 'Оставьте обращение в поддержку, чтобы получить ранний доступ к бета-тесту.'}
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="button" variant="primary" onClick={() => setWhatsappOpen(false)}>
              {locale === 'uz' ? 'Tushunarli' : 'Понятно'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
