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
  Globe,
  Zap,
  Clock3,
  Sparkles,
  History,
  Headphones,
  X,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  ArrowRight,
  Send,
  Flag,
  Users,
  CircleHelp,
  ArrowUpRight,
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
  { id: 'all', label: 'Все интеграции' },
  { id: 'messages', label: 'Мессенджеры' },
  { id: 'websites', label: 'Сайт' },
  { id: 'calendar', label: 'Календари' },
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
  const [widgetGuideOpen, setWidgetGuideOpen] = useState(false);
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [instagramOpen, setInstagramOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  // Form states for modals
  const [agentId, setAgentId] = useState('');
  const [token, setToken] = useState('');
  const [hours, setHours] = useState('');
  const [duration, setDuration] = useState('45');
  const [copiedCmd, setCopiedCmd] = useState(false);

  const dirty = Boolean(
    calendar && (hours !== calendar.workingHours || duration !== String(calendar.slotDuration))
  );
  useUnsavedChanges(dirty || Boolean(token));

  // Auto-select first agent if none selected
  useEffect(() => {
    if (agents.length > 0 && !agentId) {
      setAgentId(agents[0].id);
    }
  }, [agents, agentId]);

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
  const selectedAgent = agents.find((agent) => agent.id === agentId);
  const isSelectedConnected = Boolean(selectedAgent?.telegramConnected);

  const activeCount =
    (connectedAgents.length > 0 ? 1 : 0) +
    (calendar?.connected ? 1 : 0) +
    (instagram?.connected ? 1 : 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* ========================================================================= */}
      {/* 1. PAGE HEADER & NEUTRAL CONNECTION COUNTER */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Интеграции"
          description="Каталог подключений для ваших продаж, поддержки и автоматической записи клиентов."
        />
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] shadow-2xs self-start sm:self-auto">
          <span
            className={`inline-block size-2 rounded-full ${
              activeCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-500'
            }`}
          />
          <span>
            Активно: <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB] font-semibold">{activeCount}</strong> из 4 каналов
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
              Начните с первого подключения
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[#AABAD0] max-w-2xl mb-4 leading-relaxed">
            Подключите любой удобный канал, чтобы ваши ИИ-сотрудники начали отвечать на входящие вопросы,
            квалифицировать лидов и записывать клиентов на консультации 24/7.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]">
              <span className="size-6 rounded-lg bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-bold text-xs flex items-center justify-center shrink-0 text-[#FF7277]">
                1
              </span>
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                  Выберите канал
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5 leading-snug">
                  Чат на сайте, Telegram-бот или Instagram Direct
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]">
              <span className="size-6 rounded-lg bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-bold text-xs flex items-center justify-center shrink-0 text-[#FF7277]">
                2
              </span>
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                  ИИ-сотрудник
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5 leading-snug">
                  Привяжите обученного ассистента с базой знаний
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]">
              <span className="size-6 rounded-lg bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-bold text-xs flex items-center justify-center shrink-0 text-[#FF7277]">
                3
              </span>
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                  Первые заявки
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5 leading-snug">
                  Клиенты получают ответы, а лиды сохраняются в CRM
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
                Активные каналы собирают лиды и ведут диалоги круглосуточно
              </p>
              <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                {connectedAgents.length > 0 && `Telegram: @${connectedAgents[0].telegramUsername || 'bot'}`}
                {calendar?.connected && ` · Google Календарь: ${calendar.email || 'активен'}`}
                {instagram?.connected && ` · Instagram: @${instagram.username || 'активен'}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTab('events')}
            className="text-xs font-semibold text-[#FF7277] hover:underline flex items-center gap-1 shrink-0 cursor-pointer self-start sm:self-auto"
          >
            Смотреть журнал очереди →
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FILTER TABS & WORK HISTORY ACTION */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          className="flex items-center gap-1 p-1 bg-[var(--surface-secondary)]/70 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] rounded-2xl overflow-x-auto"
          aria-label="Категории интеграций"
        >
          {TABS.map((item) => (
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
          <span>История работы</span>
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
      {/* 4. MAIN INTEGRATIONS CATALOG */}
      {/* ========================================================================= */}
      {tab !== 'events' ? (
        <div className="space-y-5">
          {/* 4.1 FEATURED HERO CARD: ЧАТ НА САЙТЕ */}
          {['all', 'websites'].includes(tab) && (
            <div className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-6 sm:p-8 shadow-xs relative overflow-hidden group">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left Description & Action Column */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="size-13 rounded-2xl bg-red-500/10 dark:bg-red-500/15 border border-red-500/25 flex items-center justify-center text-[#FF7277] shrink-0 shadow-2xs">
                      <Globe size={26} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                          Чат на сайте
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          ● Доступен
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                        Интерактивный веб-виджет или подключение через REST API
                      </p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
                    Умный ИИ-помощник в углу сайта. Моментально отвечает на вопросы посетителей по вашей
                    базе знаний, удерживает тёплых клиентов 24/7 и передаёт контактные данные в CRM.
                  </p>

                  {/* Benefit Items */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center gap-3 text-xs text-[var(--text-primary)] dark:text-[#F4F7FB]">
                      <div className="size-6 rounded-lg bg-[var(--surface-secondary)] dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] flex items-center justify-center text-[#FF7277] shrink-0">
                        <Zap size={14} />
                      </div>
                      <span>
                        <strong>Быстрая установка</strong> — 1 строка скрипта на любой сайт (Tilda, WordPress, HTML)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[var(--text-primary)] dark:text-[#F4F7FB]">
                      <div className="size-6 rounded-lg bg-[var(--surface-secondary)] dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] flex items-center justify-center text-[#FF7277] shrink-0">
                        <Clock3 size={14} />
                      </div>
                      <span>
                        <strong>Ответы 24/7 без задержек</strong> — помощь клиентам, когда менеджеры оффлайн
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[var(--text-primary)] dark:text-[#F4F7FB]">
                      <div className="size-6 rounded-lg bg-[var(--surface-secondary)] dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] flex items-center justify-center text-[#FF7277] shrink-0">
                        <Sparkles size={14} />
                      </div>
                      <span>
                        <strong>Сбор контактов и квалификация</strong> — имя, телефон и запись на консультацию
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setWidgetOpen(true)}
                      className="px-5 py-2.5 rounded-xl bg-[#FF7277] hover:bg-[#ff5d63] text-[#0B1220] font-semibold text-xs sm:text-sm shadow-sm transition-all cursor-pointer flex items-center gap-2"
                    >
                      <span>Установить на сайт</span>
                      <ArrowRight size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setWidgetGuideOpen(true)}
                      className="px-4 py-2.5 rounded-xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#101B2E] hover:border-[var(--border-strong)] text-xs sm:text-sm font-medium text-[var(--text-secondary)] dark:text-[#AABAD0] hover:text-[var(--text-primary)] dark:hover:text-[#F4F7FB] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <CircleHelp size={16} />
                      <span>Как это работает</span>
                    </button>
                  </div>
                </div>

                {/* Right Interactive Chat Preview Column */}
                <div className="lg:col-span-5 flex flex-col items-center">
                  <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface-secondary)]/40 dark:bg-[#101B2E] p-3.5 shadow-md">
                    {/* Mock Chat Header */}
                    <div className="rounded-xl bg-gradient-to-r from-red-600 to-rose-600 p-3 text-white flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="relative size-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white">
                          <Users size={16} />
                          <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-400 border border-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-xs leading-none">ИИ-консультант Gapcha</p>
                          <p className="text-[10px] text-white/80 mt-0.5 leading-none">В сети · отвечает сразу</p>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/15">
                        Онлайн
                      </span>
                    </div>

                    {/* Mock Chat Conversation Body */}
                    <div className="py-3 px-1 space-y-2.5 text-xs">
                      {/* Bot Message */}
                      <div className="flex items-start gap-2 max-w-[85%]">
                        <div className="size-6 rounded-full bg-red-100 dark:bg-red-950/60 text-[#FF7277] flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                          AI
                        </div>
                        <div className="rounded-2xl rounded-tl-xs p-2.5 bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] text-[var(--text-primary)] dark:text-[#F4F7FB] shadow-2xs">
                          Здравствуйте! Чем могу помочь вам сегодня?
                          <span className="block text-[9px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 mt-1 text-right">
                            12:00
                          </span>
                        </div>
                      </div>

                      {/* Quick Chips */}
                      <div className="flex flex-wrap gap-1 pl-8">
                        <span className="px-2 py-0.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] text-[10px] text-[var(--text-secondary)] dark:text-[#AABAD0]">
                          Узнать цены
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] text-[10px] text-[var(--text-secondary)] dark:text-[#AABAD0]">
                          Записаться
                        </span>
                      </div>

                      {/* User Message */}
                      <div className="flex justify-end">
                        <div className="rounded-2xl rounded-tr-xs p-2.5 bg-[#FF7277] text-[#0B1220] font-medium max-w-[85%] shadow-2xs">
                          Хочу подключить виджет на сайт
                          <span className="block text-[9px] text-[#0B1220]/70 mt-1 text-right">
                            12:01
                          </span>
                        </div>
                      </div>

                      {/* Bot Reply */}
                      <div className="flex items-start gap-2 max-w-[85%]">
                        <div className="size-6 rounded-full bg-red-100 dark:bg-red-950/60 text-[#FF7277] flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                          AI
                        </div>
                        <div className="rounded-2xl rounded-tl-xs p-2.5 bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] text-[var(--text-primary)] dark:text-[#F4F7FB] shadow-2xs">
                          Отлично! Установка занимает 1 минуту — достаточно скопировать готовую строчку кода.
                          <span className="block text-[9px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 mt-1 text-right">
                            12:01
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mock Input Bar */}
                    <div className="pt-1">
                      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C]">
                        <span className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/60 pl-2 flex-1">
                          Напишите сообщение…
                        </span>
                        <div className="size-7 rounded-lg bg-[#FF7277] text-[#0B1220] flex items-center justify-center shrink-0">
                          <Send size={12} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 mt-2.5 text-center">
                    Предпросмотр виджета на вашем сайте
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 4.2 COMPACT CHANNELS (2x2 GRID) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* CARD 1: Telegram Bot */}
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
                    <Badge variant={connectedAgents.length > 0 ? 'success' : 'neutral'}>
                      {agentsError
                        ? 'Статус недоступен'
                        : connectedAgents.length
                        ? '● Подключён'
                        : '○ Не подключён'}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-base text-[var(--text-primary)] dark:text-[#F4F7FB]">
                        Telegram-бот
                      </h3>
                      <span className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                        Мессенджер
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
                      {connectedAgents.length
                        ? `Активен: ${connectedAgents
                            .map((agent) => `${agent.telegramUsername ? '@' + agent.telegramUsername : agent.name}`)
                            .join(', ')}`
                        : 'Принимайте обращения клиентов в Telegram через вашего бота. ИИ отвечает на вопросы и фиксирует контакты.'}
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
                    {connectedAgents.length ? 'Настроить бота' : 'Подключить'}
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
                        ? 'Проверяем…'
                        : error
                        ? 'Статус недоступен'
                        : instagram?.connected
                        ? '● Подключён'
                        : '○ Не подключён'}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-base text-[var(--text-primary)] dark:text-[#F4F7FB]">
                        Instagram Direct
                      </h3>
                      <span className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                        Соцсеть
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
                      {instagram?.connected
                        ? `@${instagram.username || 'аккаунт'} · Автоответы ${
                            instagram.autoReply ? 'включены' : 'выключены'
                          }`
                        : 'Автоответы клиентам в Direct, квалификация обращений и сбор лидов 24/7 без потери клиентов.'}
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
                    {instagram?.connected ? 'Настройки Direct' : 'Подключить'}
                  </Button>
                </div>
              </div>
            )}

            {/* CARD 3: Google Calendar */}
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
                        ? 'Проверяем…'
                        : error
                        ? 'Статус недоступен'
                        : calendar?.connected
                        ? '● Подключён'
                        : '○ Не подключён'}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-base text-[var(--text-primary)] dark:text-[#F4F7FB]">
                        Google Календарь
                      </h3>
                      <span className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                        Запись клиентов
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
                      {calendar?.connected
                        ? `${calendar.email || 'Синхронизирован'} · ${calendar.workingHours} (${calendar.slotDuration} мин)`
                        : 'Автоматическая запись клиентов на консультации с проверкой свободных окон в календаре.'}
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
                    {calendar?.connected ? 'Настроить расписание' : 'Подключить'}
                  </Button>
                </div>
              </div>
            )}

            {/* CARD 4: WhatsApp Business */}
            {['all', 'messages'].includes(tab) && (
              <div
                className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-6 hover:border-[var(--border-strong)] dark:hover:border-slate-500 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer opacity-90"
                onClick={() => setWhatsappOpen(true)}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="size-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center shrink-0 border border-emerald-500/25 group-hover:scale-105 transition-transform">
                      <Image src="/integrations/whatsapp.svg" width={28} height={28} alt="WhatsApp" />
                    </div>
                    <Badge variant="neutral">Скоро</Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-base text-[var(--text-primary)] dark:text-[#F4F7FB]">
                        WhatsApp Business
                      </h3>
                      <span className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                        Мессенджер
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
                      Прямая интеграция через официальный WhatsApp Cloud API находится на стадии закрытого тестирования.
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
                      setWhatsappOpen(true);
                    }}
                  >
                    Подробнее
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
              Нужна помощь в подключении каналов?
            </p>
            <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
              Поможем настроить Telegram-бота, чат на сайте или связать календарь бесплатно.
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-[#FF7277] inline-flex items-center gap-1 shrink-0">
          Написать в поддержку →
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
        label="Как работает чат на сайте"
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
                  Как работает чат на сайте
                </h2>
                <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
                  Установка и принципы работы виджета
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setWidgetGuideOpen(false)}
              aria-label="Закрыть"
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
                <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB] block">Копирование кода</strong>
                Вставьте одну строчку готового скрипта перед закрывающим тегом <code className="font-mono text-[11px]">&lt;/body&gt;</code> на любой платформе: Tilda, WordPress, 1C-Битрикс, Webflow или чистый HTML.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]">
              <span className="size-5 rounded-full bg-[var(--surface)] dark:bg-[#142137] font-bold text-[10px] flex items-center justify-center shrink-0 text-[#FF7277] mt-0.5">
                2
              </span>
              <div>
                <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB] block">Знания вашего бизнеса</strong>
                ИИ-консультант использует регламенты, прайс-лист и описания товаров, загруженные в профиле ответственного ИИ-сотрудника.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]">
              <span className="size-5 rounded-full bg-[var(--surface)] dark:bg-[#142137] font-bold text-[10px] flex items-center justify-center shrink-0 text-[#FF7277] mt-0.5">
                3
              </span>
              <div>
                <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB] block">Квалификация и контакты</strong>
                ИИ мягко запрашивает телефон или email клиента в диалоге и мгновенно передаёт контакт в раздел «Лиды и записи».
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border)] dark:border-[#29374C]">
            <Button type="button" variant="ghost" onClick={() => setWidgetGuideOpen(false)}>
              Закрыть
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setWidgetGuideOpen(false);
                setWidgetOpen(true);
              }}
            >
              Перейти к настройке
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 6.3 Telegram Modal */}
      <Dialog
        open={telegramOpen}
        onClose={() => {
          if (!busy) {
            setTelegramOpen(false);
            setToken('');
          }
        }}
        label="Подключить Telegram"
        className="w-[calc(100vw-32px)] sm:w-[500px] max-w-[500px] p-0 rounded-2xl overflow-hidden border border-[var(--border)] dark:border-[#29374C] shadow-2xl bg-[var(--surface)] dark:bg-[#142137]"
      >
        <form
          className="p-5 sm:p-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await update('/api/agents', { id: agentId, tgBotToken: token.trim() }, 'PATCH')) {
              setTelegramOpen(false);
              setToken('');
            }
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b border-[var(--border)] dark:border-[#29374C] pb-3.5">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-[#229ED9]/10 flex items-center justify-center shrink-0 border border-[#229ED9]/20 shadow-xs">
                <Image src="/integrations/telegram.svg" width={26} height={26} alt="Telegram" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">Telegram-бот</h2>
                <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">Подключение бота через @BotFather</p>
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

          {/* Active Bot Status (if current agent has connected bot) */}
          {isSelectedConnected && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-[var(--text-secondary)] dark:text-[#AABAD0] truncate">
                  Бот активен:{' '}
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
                Отключить
              </Button>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-3.5">
            <Select
              label="Ответственный ИИ-сотрудник"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              required
              options={[
                { value: '', label: 'Выберите сотрудника' },
                ...agents.map((agent) => ({
                  value: agent.id,
                  label: `${agent.name}${agent.telegramConnected ? ' (Бот подключён)' : ''}`,
                })),
              ]}
            />

            <div>
              <Input
                label={isSelectedConnected ? 'Новый токен бота (для замены)' : 'Токен бота из @BotFather'}
                type="password"
                autoComplete="off"
                value={token}
                onChange={(e) => setToken(e.target.value.trim())}
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                required={!isSelectedConnected}
                className="font-mono text-xs"
              />
              <p className="mt-1 text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                Токен хранится в зашифрованном виде и нужен только для доставки сообщений.
              </p>
            </div>
          </div>

          {/* Step-by-Step Instruction */}
          <div className="rounded-xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface-secondary)]/60 dark:bg-[#101B2E] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                Пошаговая инструкция:
              </span>
              <span className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">~1 минута</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="size-4.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-semibold text-[10px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                  1
                </span>
                <span className="leading-snug text-[var(--text-secondary)] dark:text-[#AABAD0]">
                  Откройте официального бота{' '}
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 font-semibold text-[#229ED9] hover:underline"
                  >
                    @BotFather
                    <ExternalLink size={10} />
                  </a>{' '}
                  в Telegram.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="size-4.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-semibold text-[10px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                  2
                </span>
                <span className="leading-snug text-[var(--text-secondary)] dark:text-[#AABAD0]">
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
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="size-4.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-semibold text-[10px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                  3
                </span>
                <span className="leading-snug text-[var(--text-secondary)] dark:text-[#AABAD0]">
                  Задайте username бота с окончанием <code className="font-mono text-[11px] text-[var(--text-primary)] dark:text-[#F4F7FB]">bot</code> (например:{' '}
                  <span className="font-mono text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">myshop_sales_bot</span>).
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="size-4.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-semibold text-[10px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                  4
                </span>
                <span className="leading-snug text-[var(--text-secondary)] dark:text-[#AABAD0]">
                  Скопируйте выданный <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB]">HTTP API токен</strong> и вставьте в поле выше.
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
              Отмена
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={busy}
              disabled={(!token && !isSelectedConnected) || !agentId}
            >
              {isSelectedConnected ? 'Обновить токен' : 'Подключить бота'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* 6.4 Google Calendar Modal */}
      <Dialog
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        label="Настройки календаря"
        className="w-[calc(100vw-32px)] sm:w-[500px] max-w-[500px] p-0 rounded-2xl overflow-hidden border border-[var(--border)] dark:border-[#29374C] shadow-2xl bg-[var(--surface)] dark:bg-[#142137]"
      >
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--border)] dark:border-[#29374C] pb-3.5">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 border border-[var(--border)] dark:border-[#29374C] shadow-xs">
                <Image src="/integrations/google-calendar.png" width={26} height={26} alt="Google Calendar" className="object-contain" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">Google Календарь</h2>
                <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
                  {calendar?.connected ? 'Синхронизация активна' : 'Автоматическая запись на встречи'}
                </p>
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
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
                Синхронизируйте рабочий Google Календарь, чтобы ваши ИИ-агенты могли в реальном времени проверять
                свободные окна и автоматически записывать клиентов на встречи и консультации.
              </p>

              {/* Step-by-Step Instruction */}
              <div className="rounded-xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface-secondary)]/60 dark:bg-[#101B2E] p-3.5 space-y-2.5">
                <span className="text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB] block">
                  Как работает синхронизация:
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="size-4.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-semibold text-[10px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                      1
                    </span>
                    <span className="leading-snug text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      Нажмите кнопку «Подключить через Google» и авторизуйте рабочий аккаунт.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="size-4.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-semibold text-[10px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                      2
                    </span>
                    <span className="leading-snug text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      Разрешите чтение занятости и создание событий в основном календаре.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="size-4.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-semibold text-[10px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                      3
                    </span>
                    <span className="leading-snug text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      ИИ будет проверять окна в реальном времени и предлагать клиентам слоты без накладок.
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-[var(--border)] dark:border-[#29374C]">
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
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <span className="text-[var(--text-secondary)] dark:text-[#AABAD0]">
                  Подключённый аккаунт:{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{calendar.email}</strong>
                </span>
              </div>

              <Input
                label="Рабочие часы для записи клиентов"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="10:00-18:00"
                required
              />

              <Select
                label="Длительность слота встречи"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                options={[15, 30, 45, 60, 90, 120].map((n) => ({
                  value: String(n),
                  label: `${n} минут`,
                }))}
              />

              <p className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                Часовой пояс календаря: Asia/Tashkent (автоматическая конвертация для зарубежных клиентов).
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

      {/* 6.5 Instagram Modal */}
      <Dialog
        open={instagramOpen}
        onClose={() => setInstagramOpen(false)}
        label="Настройки Instagram"
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
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
                Подключите бизнес-аккаунт Instagram, чтобы ИИ-агенты моментально отвечали клиентам в Direct,
                отправляли каталог и квалифицировали обращения 24/7.
              </p>

              {/* Step-by-Step Instruction */}
              <div className="rounded-xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface-secondary)]/60 dark:bg-[#101B2E] p-3.5 space-y-2.5">
                <span className="text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB] block">
                  Требования перед подключением:
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="size-4.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-semibold text-[10px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                      1
                    </span>
                    <span className="leading-snug text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      Переведите ваш Instagram в статус <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB]">«Профессиональный (Бизнес)»</strong>.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="size-4.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-semibold text-[10px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                      2
                    </span>
                    <span className="leading-snug text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      В приложении Instagram: Настройки → Сообщения → Доступ к сообщениям → Включите{' '}
                      <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB]">«Разрешить доступ»</strong>.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="size-4.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-semibold text-[10px] flex items-center justify-center shrink-0 text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                      3
                    </span>
                    <span className="leading-snug text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      Привяжите Instagram к странице Facebook и авторизуйтесь по кнопке ниже.
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-[var(--border)] dark:border-[#29374C]">
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
              <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 text-xs">
                <span className="text-[var(--text-secondary)] dark:text-[#AABAD0]">
                  Подключённый аккаунт:{' '}
                  <strong className="text-pink-600 dark:text-pink-400 font-semibold">@{instagram.username}</strong>
                </span>
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

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]">
                <div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB] block">Автоответы ИИ</span>
                  <span className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
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
                <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">Мессенджер для продаж и поддержки</p>
              </div>
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

          <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
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
