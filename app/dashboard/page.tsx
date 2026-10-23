'use client';

import React, { useState } from 'react';
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

  // Funnel & KPI calculations strictly from actual leads
  const totalLeads = leads.length;
  const bookedLeads = leads.filter((l) => l.status === 'Записан в календарь').length;
  const conversionRate = totalLeads > 0
    ? `${((bookedLeads / totalLeads) * 100).toFixed(1)}%`
    : 'Нет данных';

  // Recent 5 leads for quick overview
  const recentLeads = [...leads].slice(0, 5);

  return (
    <div className="space-y-6 text-left">
      {/* Email Verification Banner if not verified */}
      {!emailVerified && (
        <div className="bg-[var(--warning-bg)] border border-[var(--warning-border)] rounded-[8px] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-[6px] bg-[var(--surface)] text-[var(--warning-text)] border border-[var(--warning-border)] flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                Подтвердите Email для активации 100 бонусных токенов
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Код отправлен на <strong className="text-[var(--text-primary)]">{user?.email || 'ваш email'}</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsVerifyModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-semibold px-3.5 py-2 rounded-[6px] transition-colors shrink-0 cursor-pointer shadow-2xs"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Ввести код</span>
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Обзор
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Обращения клиентов, записи в календарь и работа сотрудников
          </p>
        </div>

        {agents.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openSandbox(activeAgent?.id)}
              className="inline-flex items-center gap-1.5 bg-[var(--surface)] hover:bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-medium px-3 py-2 rounded-[6px] transition-colors cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>Песочница</span>
            </button>
            <Link
              href="/dashboard/agents/new"
              className="inline-flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-semibold px-3.5 py-2 rounded-[6px] transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Новый сотрудник</span>
            </Link>
          </div>
        )}
      </div>

      {/* 3 KPI Cards in a single row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* KPI 1: Обращения */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-1">
            <span className="text-xs font-medium">Обращения</span>
            <Users className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <div className="text-[28px] sm:text-[32px] leading-[36px] font-semibold text-[var(--text-primary)] font-mono tracking-tight">
            {totalLeads}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            Входящие диалоги
          </div>
        </div>

        {/* KPI 2: Записи */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-1">
            <span className="text-xs font-medium">Записи</span>
            <CalendarCheck className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <div className="text-[28px] sm:text-[32px] leading-[36px] font-semibold text-[var(--text-primary)] font-mono tracking-tight">
            {bookedLeads}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            Слоты в календаре
          </div>
        </div>

        {/* KPI 3: Конверсия в запись */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-1">
            <span className="text-xs font-medium">Конверсия в запись</span>
            <TrendingUp className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <div className="text-[28px] sm:text-[32px] leading-[36px] font-semibold text-[var(--text-primary)] font-mono tracking-tight">
            {conversionRate}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            {totalLeads > 0 ? 'Конверсия из диалогов в бронь' : 'Ожидание обращений'}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      {agents.length === 0 ? (
        /* Empty State: No agents configured yet */
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-8 sm:p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-[8px] bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)] flex items-center justify-center mx-auto">
            <Bot className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              У вас пока нет созданных ИИ-сотрудников
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Настройте сценарий квалификации, прайс-лист и подключите каналы для автоматической записи клиентов.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/dashboard/agents/new"
              className="inline-flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-semibold px-4 py-2.5 rounded-[6px] transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Создать первого сотрудника</span>
            </Link>
          </div>
        </section>
      ) : (
        /* Active Employees & Recent Activity */
        <div className="space-y-5">
          {/* Active Employee Status Card */}
          {activeAgent && (
            <section className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--accent)] flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                      {activeAgent.name}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)] bg-[var(--surface-secondary)] border border-[var(--border)] px-1.5 py-0.2 rounded font-normal">
                      {activeAgent.niche}
                    </span>
                    <span className="text-[11px] font-medium text-[var(--success-text)] bg-[var(--success-bg)] border border-[var(--success-border)] px-1.5 py-0.2 rounded">
                      Активен
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs text-[var(--text-secondary)] mt-1">
                    <span className="flex items-center gap-1.5">
                      <Image
                        src="/images/brands/google-calendar.png"
                        alt="Google Calendar"
                        width={13}
                        height={13}
                        className="object-contain"
                      />
                      <span>
                        {isGoogleCalendarConnected ? 'Календарь синхронизирован' : 'Календарь не подключен'}
                      </span>
                    </span>

                    <span className="text-[var(--text-muted)]">·</span>

                    <span className="flex items-center gap-1.5">
                      <Image
                        src="/images/brands/telegram.svg"
                        alt="Telegram"
                        width={13}
                        height={13}
                        className="object-contain"
                      />
                      <span>
                        {activeAgent.telegramToken ? 'Telegram бот активен' : 'Telegram не привязан'}
                      </span>
                    </span>

                    <span className="text-[var(--text-muted)]">·</span>

                    <span>Расход: {activeAgent.tokensUsed || 0} токенов</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {!isGoogleCalendarConnected && (
                  <button
                    onClick={openCalendarModal}
                    className="px-3 py-1.5 text-xs font-medium text-[var(--warning-text)] bg-[var(--warning-bg)] hover:opacity-90 border border-[var(--warning-border)] rounded-[6px] transition-colors cursor-pointer"
                  >
                    Подключить календарь
                  </button>
                )}
                <button
                  onClick={() => openSandbox(activeAgent.id)}
                  className="px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] bg-[var(--surface-secondary)] hover:bg-[var(--border)] border border-[var(--border)] rounded-[6px] transition-colors cursor-pointer"
                >
                  Проверить в песочнице
                </button>
              </div>
            </section>
          )}

          {/* Recent Leads Table */}
          {totalLeads === 0 ? (
            <section className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-8 text-center space-y-2">
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                Ожидание первых обращений
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                Сотрудник активен и готов к диалогам. Как только клиент напишет в Telegram, здесь появится запись и статус квалификации.
              </p>
            </section>
          ) : (
            <section className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-secondary)]">
                <span className="text-xs font-semibold text-[var(--text-primary)]">Последние обращения</span>
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
                    <tr className="bg-[var(--surface-secondary)] border-b border-[var(--border)] text-[var(--text-secondary)] font-medium">
                      <th className="py-2.5 px-4">Клиент</th>
                      <th className="py-2.5 px-3">Канал</th>
                      <th className="py-2.5 px-3">Статус</th>
                      <th className="py-2.5 px-3">Запись в календарь</th>
                      <th className="py-2.5 px-3">Токены</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {recentLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                        <td className="py-2.5 px-4 font-medium text-[var(--text-primary)]">
                          <div>{lead.clientName}</div>
                          <div className="text-[11px] text-[var(--text-muted)] font-mono">{lead.contact}</div>
                        </td>
                        <td className="py-2.5 px-3 text-[var(--text-secondary)]">{lead.channel}</td>
                        <td className="py-2.5 px-3">
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
                        <td className="py-2.5 px-3 text-[var(--text-secondary)] font-mono text-[11px]">
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
                        <td className="py-2.5 px-3 text-[var(--text-secondary)] font-mono">
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
      )}

      {/* Email Verification Modal */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-[8px] max-w-sm w-full border border-[var(--border)] shadow-xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="font-semibold text-[var(--text-primary)] text-sm">
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
              Введите проверочный код, отправленный на{' '}
              <strong className="text-[var(--text-primary)]">{user?.email || 'ваш email'}</strong>:
            </p>

            {devCode && (
              <div
                onClick={() => setVerifyInput(devCode)}
                className="p-2.5 bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)] rounded-[6px] text-xs font-semibold cursor-pointer hover:bg-[var(--border)] transition-colors flex items-center justify-between"
              >
                <span>Код: <strong>{devCode}</strong></span>
                <span className="text-[10px] bg-[var(--accent)] text-[var(--accent-text)] px-1.5 py-0.5 rounded-[4px]">Вставить</span>
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
                className="w-full h-10 flex items-center justify-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-semibold rounded-[6px] transition-colors cursor-pointer disabled:opacity-40 text-xs"
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
