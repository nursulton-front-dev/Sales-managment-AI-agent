'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import {
  Users,
  CalendarCheck,
  TrendingUp,
  Plus,
  Bot,
  Terminal,
  ArrowRight,
  Clock,
  Mail,
  KeyRound,
  X,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export default function DashboardOverviewPage() {
  const {
    leads,
    activeAgent,
    agents,
    openSandbox,
    emailVerified,
    verifyEmail,
    sendVerificationCode,
    user,
    isGoogleCalendarConnected,
    openCalendarModal,
  } = useApp();

  // Email verification modal state
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyInput, setVerifyInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  // Status of channels for launch steps
  const [channelsConnected, setChannelsConnected] = useState({
    calendar: false,
    telegram: false,
    instagram: false,
  });

  useEffect(() => {
    // Check real channel connections from backend
    fetch('/api/instagram/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setChannelsConnected((prev) => ({
            ...prev,
            instagram: Boolean(data.connected),
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handleVerify = async () => {
    if (!verifyInput.trim()) return;
    setIsVerifying(true);
    const success = await verifyEmail(verifyInput.trim());
    setIsVerifying(false);
    if (success) {
      setIsVerifyModalOpen(false);
      setVerifyInput('');
    }
  };

  const handleResend = async () => {
    const code = await sendVerificationCode();
    if (code) {
      setDevCode(code);
    }
  };

  // Funnel & KPI calculations strictly from actual server leads
  const totalLeads = leads.length;
  const bookedLeads = leads.filter((l) => l.status === 'Записан в календарь').length;
  const conversionRate =
    totalLeads > 0 ? `${((bookedLeads / totalLeads) * 100).toFixed(1)}%` : '0%';

  const hasAgent = agents.length > 0;
  const hasConnectedCalendar = isGoogleCalendarConnected;
  const hasAnyChannel =
    Boolean(activeAgent?.telegramToken) ||
    channelsConnected.instagram ||
    hasConnectedCalendar;
  const hasFirstLead = totalLeads > 0;

  // Recent 5 leads
  const recentLeads = [...leads].slice(0, 5);

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto">
      {/* 1. Email Verification Notice (if unverified) */}
      {!emailVerified && (
        <div className="bg-[var(--warning-bg)] border border-[var(--warning-border)] rounded-[8px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-[6px] bg-[var(--surface)] text-[var(--warning-text)] border border-[var(--warning-border)] flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                Подтвердите Email для зачисления 100 стартовых токенов
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Код отправлен на <strong className="text-[var(--text-primary)]">{user?.email || 'ваш email'}</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsVerifyModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold px-3.5 py-2 rounded-[6px] transition-colors shrink-0 cursor-pointer shadow-xs"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Ввести код</span>
          </button>
        </div>
      )}

      {/* 2. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Обзор
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Оперативные показатели, шаги запуска и активность ИИ-сотрудников
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasAgent && (
            <button
              onClick={() => openSandbox(activeAgent?.id)}
              className="inline-flex items-center gap-1.5 bg-[var(--surface)] hover:bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-medium px-3.5 py-2 rounded-[6px] transition-colors cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>Тест-драйв</span>
            </button>
          )}

          <Link
            href="/dashboard/agents/new"
            className="inline-flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold px-3.5 py-2 rounded-[6px] transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Новый сотрудник</span>
          </Link>
        </div>
      </div>

      {/* 3. Three Primary KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: Обращения */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-medium">Всего обращений</span>
            <Users className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <div className="text-[32px] leading-tight font-extrabold text-[var(--text-primary)] font-mono tracking-tight">
            {totalLeads}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-2">
            {totalLeads > 0 ? 'Клиенты из Telegram и Instagram' : 'Ожидание первого клиента'}
          </div>
        </div>

        {/* KPI 2: Записи */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-medium">Успешных записей</span>
            <CalendarCheck className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <div className="text-[32px] leading-tight font-extrabold text-[var(--text-primary)] font-mono tracking-tight">
            {bookedLeads}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-2">
            Слоты, забронированные агентом
          </div>
        </div>

        {/* KPI 3: Конверсия в запись */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-2">
            <span className="text-xs font-medium">Конверсия в запись</span>
            <TrendingUp className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <div className="text-[32px] leading-tight font-extrabold text-[var(--text-primary)] font-mono tracking-tight">
            {conversionRate}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-2">
            {totalLeads > 0 ? 'Доля дошедших до брони слота' : 'Начнётся после 1-го диалога'}
          </div>
        </div>
      </section>

      {/* 4. Onboarding / Launch Checklist for New Workspace (as in 01-overview.png) */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              Шаги запуска автоматизации
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Выполните 4 ключевых шага, чтобы ИИ-сотрудник начал отвечать клиентам
            </p>
          </div>
          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)]">
            {[hasAgent, hasConnectedCalendar, hasAnyChannel, hasFirstLead].filter(Boolean).length}/4 готово
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Step 1: Agent created */}
          <div className={`p-3.5 rounded-[6px] border transition-colors ${
            hasAgent ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50' : 'bg-[var(--surface-secondary)] border-[var(--border)]'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Шаг 1</span>
              {hasAgent ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle className="w-4 h-4 text-[var(--text-muted)]" />
              )}
            </div>
            <div className="font-semibold text-xs text-[var(--text-primary)]">
              Создать ИИ-сотрудника
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              {hasAgent ? `Создан: ${activeAgent?.name}` : 'Настройте имя и базу знаний'}
            </p>
            {!hasAgent && (
              <Link
                href="/dashboard/agents/new"
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
              >
                <span>Создать</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {/* Step 2: Calendar Connected */}
          <div className={`p-3.5 rounded-[6px] border transition-colors ${
            hasConnectedCalendar ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50' : 'bg-[var(--surface-secondary)] border-[var(--border)]'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Шаг 2</span>
              {hasConnectedCalendar ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle className="w-4 h-4 text-[var(--text-muted)]" />
              )}
            </div>
            <div className="font-semibold text-xs text-[var(--text-primary)]">
              Google Календарь
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              {hasConnectedCalendar ? 'Синхронизация активна' : 'Для автоматической брони'}
            </p>
            {!hasConnectedCalendar && (
              <Link
                href="/dashboard/integrations"
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
              >
                <span>Подключить</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {/* Step 3: Channel Connected */}
          <div className={`p-3.5 rounded-[6px] border transition-colors ${
            hasAnyChannel ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50' : 'bg-[var(--surface-secondary)] border-[var(--border)]'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Шаг 3</span>
              {hasAnyChannel ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle className="w-4 h-4 text-[var(--text-muted)]" />
              )}
            </div>
            <div className="font-semibold text-xs text-[var(--text-primary)]">
              Канал связи
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              {hasAnyChannel ? 'Канал подключен' : 'Telegram или Instagram'}
            </p>
            {!hasAnyChannel && (
              <Link
                href="/dashboard/integrations"
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
              >
                <span>Выбрать канал</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {/* Step 4: First Lead received */}
          <div className={`p-3.5 rounded-[6px] border transition-colors ${
            hasFirstLead ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50' : 'bg-[var(--surface-secondary)] border-[var(--border)]'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Шаг 4</span>
              {hasFirstLead ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle className="w-4 h-4 text-[var(--text-muted)]" />
              )}
            </div>
            <div className="font-semibold text-xs text-[var(--text-primary)]">
              Первое обращение
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              {hasFirstLead ? `Получено лидов: ${totalLeads}` : 'Напишите боту для теста'}
            </p>
            {hasAgent && !hasFirstLead && (
              <button
                type="button"
                onClick={() => openSandbox(activeAgent?.id)}
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline cursor-pointer"
              >
                <span>Тест диалога</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 5. Active Agent Banner & Recent Activity */}
      {hasAgent ? (
        <div className="space-y-5">
          {/* Active Employee Status Banner */}
          {activeAgent && (
            <section className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--accent)] flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {activeAgent.name}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)] bg-[var(--surface-secondary)] border border-[var(--border)] px-1.5 py-0.5 rounded font-normal">
                      {activeAgent.niche}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
                      Активен
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)] mt-1.5">
                    <span className="flex items-center gap-1.5">
                      <Image
                        src="/images/brands/google-calendar.png"
                        alt="Google Calendar"
                        width={14}
                        height={14}
                        className="object-contain"
                      />
                      <span>
                        {isGoogleCalendarConnected ? 'Календарь подключен' : 'Календарь не привязан'}
                      </span>
                    </span>

                    <span className="text-[var(--text-muted)]">·</span>

                    <span className="flex items-center gap-1.5">
                      <Image
                        src="/images/brands/telegram.svg"
                        alt="Telegram"
                        width={14}
                        height={14}
                        className="object-contain"
                      />
                      <span>
                        {activeAgent.telegramToken ? 'Telegram активен' : 'Telegram не привязан'}
                      </span>
                    </span>

                    <span className="text-[var(--text-muted)]">·</span>

                    <span>Расход: {activeAgent.tokensUsed || 0} токенов</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Link
                  href="/dashboard/agents"
                  className="px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] transition-colors"
                >
                  Настроить сценарий
                </Link>
                <button
                  onClick={() => openSandbox(activeAgent.id)}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-[6px] transition-colors cursor-pointer shadow-xs"
                >
                  Тест-драйв
                </button>
              </div>
            </section>
          )}

          {/* Recent Leads Table */}
          {totalLeads === 0 ? (
            <section className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-10 text-center space-y-2 shadow-xs">
              <div className="w-10 h-10 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center mx-auto mb-2">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Ожидание первых обращений
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                Сотрудник активен. Как только клиент напишет в Telegram или Instagram Direct, диалог появится в таблице.
              </p>
            </section>
          ) : (
            <section className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-secondary)]">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Последние обращения
                </span>
                <Link
                  href="/dashboard/leads"
                  className="text-xs font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                >
                  <span>Все лиды и записи</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--surface-secondary)] border-b border-[var(--border)] text-[var(--text-secondary)] font-semibold">
                      <th className="py-3 px-5">Клиент</th>
                      <th className="py-3 px-4">Канал</th>
                      <th className="py-3 px-4">Статус</th>
                      <th className="py-3 px-4">Запись в календарь</th>
                      <th className="py-3 px-4 text-right">Токены</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {recentLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                        <td className="py-3 px-5 font-medium text-[var(--text-primary)]">
                          <div className="font-semibold">{lead.clientName}</div>
                          <div className="text-[11px] text-[var(--text-muted)] font-mono">{lead.contact}</div>
                        </td>
                        <td className="py-3 px-4 text-[var(--text-secondary)]">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[var(--surface-secondary)] border border-[var(--border)] text-[11px] font-medium">
                            {lead.channel}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${
                              lead.status === 'Записан в календарь'
                                ? 'bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success-border)]'
                                : lead.status === 'Квалифицирован'
                                ? 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)] border border-[var(--border)]'
                                : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)]'
                            }`}
                          >
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[var(--text-secondary)] font-mono text-[11px]">
                          {lead.appointmentDate ? (
                            <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
                              <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                              <span suppressHydrationWarning>
                                {new Date(lead.appointmentDate).toLocaleString('ru-RU', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[var(--text-muted)]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[var(--text-secondary)]">
                          {lead.tokensSpent || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      ) : (
        /* Empty State when no agent created */
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-10 sm:p-14 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-[8px] bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)] flex items-center justify-center mx-auto">
            <Bot className="w-7 h-7 text-[var(--accent)]" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              У вас пока нет созданных ИИ-сотрудников
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Настройте сценарий квалификации, прайс-лист и подключите каналы для автоматической записи клиентов.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/dashboard/agents/new"
              className="inline-flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold px-4 py-2.5 rounded-[6px] transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Создать первого сотрудника</span>
            </Link>
          </div>
        </section>
      )}

      {/* 6. Email Verification Modal */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-[8px] max-w-sm w-full border border-[var(--border)] shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="font-bold text-[var(--text-primary)] text-sm">
                Подтверждение Email
              </h3>
              <button
                onClick={() => setIsVerifyModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-[4px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Введите 6-значный проверочный код, отправленный на{' '}
              <strong className="text-[var(--text-primary)]">{user?.email || 'ваш email'}</strong>:
            </p>

            {devCode && (
              <div
                onClick={() => setVerifyInput(devCode)}
                className="p-2.5 bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)] rounded-[6px] text-xs font-semibold cursor-pointer hover:bg-[var(--border)] transition-colors flex items-center justify-between"
              >
                <span>Код: <strong>{devCode}</strong></span>
                <span className="text-[10px] bg-[var(--accent)] text-white px-1.5 py-0.5 rounded-[4px]">Вставить</span>
              </div>
            )}

            <div className="space-y-3 pt-1">
              <input
                type="text"
                maxLength={6}
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center text-xl font-bold font-mono tracking-widest py-2.5 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)]"
              />

              <button
                type="button"
                onClick={handleVerify}
                disabled={isVerifying || verifyInput.length < 6}
                className="w-full h-10 flex items-center justify-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-[6px] transition-colors cursor-pointer disabled:opacity-40 text-xs shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isVerifying ? 'Проверка...' : 'Активировать 100 токенов'}</span>
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-xs text-[var(--accent)] hover:underline cursor-pointer"
                >
                  Отправить код повторно
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
