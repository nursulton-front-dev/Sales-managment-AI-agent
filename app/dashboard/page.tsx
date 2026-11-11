'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataState } from '@/components/ui/DataState';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import {
  Mail,
  Play,
  Users,
  CalendarDays,
  ChartNoAxesColumn,
  Check,
  Headphones,
  ArrowRight,
  X,
  UserRound,
  Sparkles,
  Zap,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { getWorkspaceChannelsSummary } from '@/lib/channels/status';

export default function DashboardOverviewPage() {
  const {
    leads,
    agents,
    workspace,
    activeAgent,
    openSandbox,
    emailVerified,
    verifyEmail,
    sendVerificationCode,
    user,
    leadsLoading,
    agentsLoading,
    leadsError,
    agentsError,
    refreshLeads,
    refreshAgents,
    locale,
    t,
  } = useApp();

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const workspaceSummary = getWorkspaceChannelsSummary(workspace, agents);
  const connected = workspaceSummary.hasActiveMessagingChannel;

  const testDriveDone =
    leads.length > 0 ||
    (workspace?.tokenBalance !== undefined && workspace.tokenBalance < 100) ||
    Boolean(workspace?.settings?.testDriveCompleted);

  const isQuickStartDone = agents.length > 0 && connected && testDriveDone;
  const isDismissed = Boolean(workspace?.settings?.quickStartDismissed);
  const [forceShowQuickStart, setForceShowQuickStart] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const handleToggleQuickStart = async (dismiss: boolean) => {
    try {
      setDismissing(true);
      await fetch('/api/workspace/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quickStartDismissed: dismiss }),
      });
      setForceShowQuickStart(!dismiss);
      if (workspace) {
        workspace.settings = { ...(workspace.settings || {}), quickStartDismissed: dismiss };
      }
    } catch {
      // ignore
    } finally {
      setDismissing(false);
    }
  };

  const booked = leads.filter((lead) => lead.status === 'Записан в календарь').length;
  const recent = [...leads]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <div className="space-y-6 w-full pb-10">
      {/* Header */}
      <PageHeader
        title={t.nav.overview}
        description={
          locale === 'uz'
            ? 'Mijozlar murojaatlari, voronka samaradorligi va AI xodimlar holati.'
            : 'Сводка обращений клиентов, эффективность воронки и статус ИИ-сотрудников.'
        }
        actions={
          <Button
            variant="outline"
            onClick={() => openSandbox()}
            className="flex items-center gap-2 text-xs font-semibold"
          >
            <Play size={15} />
            <span>{t.common.testDrive}</span>
          </Button>
        }
      />

      {/* Email Verification Banner */}
      {!emailVerified && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-[#142137] dark:border-amber-500/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Mail size={20} />
            </div>
            <div>
              <p className="font-semibold text-sm text-[var(--text-primary)] dark:text-[#F4F7FB]">
                {locale === 'uz'
                  ? 'Bonus hisoblanishi uchun emailingizni tasdiqlang'
                  : 'Подтвердите ваш email для начисления бонуса'}
              </p>
              <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
                {locale === 'uz'
                  ? 'Manzil tasdiqlangandan so‘ng hisobingizga 100 ta bepul test AI-javoblari o‘tkaziladi.'
                  : 'После подтверждения адреса на ваш счёт будут начислены 100 тестовых ИИ-ответов.'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setVerifyOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 text-xs font-semibold"
          >
            <span>{locale === 'uz' ? 'Kodni kiritish' : 'Ввести код'}</span>
            <ArrowRight size={14} />
          </Button>
        </div>
      )}

      {/* Metrics Row */}
      <DataState loading={leadsLoading} error={leadsError} retry={refreshLeads} />
      {!leadsLoading && !leadsError && (
        <section
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          aria-label={locale === 'uz' ? 'Kompaniya ko‘rsatkichlari' : 'Показатели компании'}
        >
          <div className="p-5 rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] flex items-center gap-4 shadow-xs">
            <div className="size-12 rounded-xl bg-blue-500/10 text-[#229ED9] flex items-center justify-center shrink-0 border border-blue-500/20">
              <Users size={22} />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
                {locale === 'uz' ? 'Voronkadagi lidlar' : 'Лиды в воронке'}
              </p>
              <p className="text-3xl font-extrabold text-[var(--text-primary)] dark:text-[#F4F7FB] my-0.5 tabular-nums">
                {leads.length}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                {locale === 'uz' ? 'Jami murojaatlar' : 'Всего обращений'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] flex items-center gap-4 shadow-xs">
            <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <CalendarDays size={22} />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
                {locale === 'uz' ? 'Uchrashuvlarga yozuvlar' : 'Записи на встречи'}
              </p>
              <p className="text-3xl font-extrabold text-[var(--text-primary)] dark:text-[#F4F7FB] my-0.5 tabular-nums">
                {booked}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                {locale === 'uz' ? 'Taqvimdagi band joylar' : 'Слоты в календаре'}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] flex items-center gap-4 shadow-xs">
            <div className="size-12 rounded-xl bg-red-500/10 text-[#FF7277] flex items-center justify-center shrink-0 border border-red-500/20">
              <ChartNoAxesColumn size={22} />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
                {locale === 'uz' ? 'Yozuvga konversiya' : 'Конверсия в запись'}
              </p>
              <p className="text-3xl font-extrabold text-[var(--text-primary)] dark:text-[#F4F7FB] my-0.5 tabular-nums">
                {leads.length ? `${((booked / leads.length) * 100).toFixed(1)}%` : '—'}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                {locale === 'uz' ? 'Saralanganlar ulushi' : 'Доля квалифицированных'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Channel Disconnection Alerts (Inline notice without restoring initial onboarding) */}
      {workspaceSummary.disconnectedAlerts.map((alertText, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={17} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{alertText}</span>
          </div>
          <Link
            href="/dashboard/integrations"
            className="font-semibold text-amber-700 dark:text-amber-300 hover:underline shrink-0"
          >
            {locale === 'uz' ? 'Integratsiyalarga o‘tish →' : 'В интеграции →'}
          </Link>
        </div>
      ))}

      {/* Main Grid: Onboarding Steps & Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Onboarding Banner & Steps */}
        <div className="xl:col-span-7 space-y-5">
          {(isQuickStartDone || isDismissed) && !forceShowQuickStart ? (
            /* Compact Collapsed Quick Start Card */
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 dark:bg-emerald-950/20 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Check size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--text-primary)] dark:text-[#F4F7FB]">
                      {locale === 'uz'
                        ? 'Tezkor boshlash yakunlandi · gapcha AI ishlashga tayyor'
                        : 'Быстрый старт завершён · gapcha AI готов к работе'}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                      {locale === 'uz'
                        ? 'Xodim o‘qitilgan, aloqa kanali faol va sinovdan o‘tgan. Kiruvchi arizalar kechayu kunduz qabul qilinadi.'
                        : 'Сотрудник обучен, канал связи активен и протестирован. Входящие заявки принимаются круглосуточно.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setForceShowQuickStart(true)}
                    className="text-xs font-medium"
                  >
                    {locale === 'uz' ? 'Bosqichlarni ko‘rsatish' : 'Показать этапы'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Launch Hero Banner with Illustration */}
              <div className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-6 shadow-xs overflow-hidden relative">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-[#FF7277] border border-red-500/20">
                        {locale === 'uz' ? 'Tezkor boshlash' : 'Быстрый старт'}
                      </span>
                      <button
                        type="button"
                        disabled={dismissing}
                        onClick={() => void handleToggleQuickStart(true)}
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:text-[#AABAD0] dark:hover:text-[#F4F7FB] transition-colors cursor-pointer"
                        title={locale === 'uz' ? 'Tezkor boshlash blokini yashirish' : 'Скрыть блок быстрого старта'}
                      >
                        {locale === 'uz' ? 'Yo‘riqnomani yashirish' : 'Скрыть инструкцию'}
                      </button>
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                      {locale === 'uz'
                        ? 'Birinchi AI-xodimni ishga tushiring'
                        : 'Запустите первого ИИ-сотрудника'}
                    </h2>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
                      {locale === 'uz'
                        ? 'Yordamchini kompaniya narxlari bo‘yicha o‘qiting, aloqa kanalini ulang va arizalarni kechayu kunduz qabul qiling.'
                        : 'Обучите ассистента на прайсе компании, подключите канал связи и принимайте заявки круглосуточно.'}
                    </p>
                    <div className="pt-1 flex items-center gap-3">
                      <Link
                        href={agents.length ? '/dashboard/agents' : '/dashboard/agents/new'}
                        className="px-4 py-2 rounded-xl bg-[#FF7277] hover:bg-[#ff5d63] text-[#0B1220] font-semibold text-xs shadow-xs transition-all inline-flex items-center gap-1.5"
                      >
                        <span>
                          {agents.length
                            ? (locale === 'uz' ? 'Xodimni sozlash' : 'Настроить агента')
                            : (locale === 'uz' ? 'AI xodim yaratish' : 'Создать сотрудника')}
                        </span>
                        <ArrowRight size={14} />
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openSandbox()}
                        className="text-xs"
                      >
                        {locale === 'uz' ? 'Muloqot testi' : 'Тест диалога'}
                      </Button>
                    </div>
                  </div>

                  {/* Decorative Image */}
                  <div className="shrink-0 w-44 sm:w-56 h-36 relative flex items-center justify-center">
                    <Image
                      src="/illustrations/gapchi-ai/onboarding-conversations.png"
                      alt=""
                      width={220}
                      height={150}
                      className="object-contain max-h-36 drop-shadow-md"
                      priority
                    />
                  </div>
                </div>
              </div>

              {/* Stepper Checklist */}
              <div className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-6 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h3 className="font-bold text-base text-[var(--text-primary)] dark:text-[#F4F7FB]">
                    {locale === 'uz' ? 'Sotuvni sozlash bosqichlari' : 'Этапы настройки продаж'}
                  </h3>
                  {forceShowQuickStart && (
                    <button
                      type="button"
                      onClick={() => setForceShowQuickStart(false)}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      {locale === 'uz' ? 'Yig‘ish' : 'Свернуть'}
                    </button>
                  )}
                </div>
                <DataState loading={agentsLoading} error={agentsError} retry={refreshAgents} />
                {!agentsLoading && !agentsError && (
                  <ol className="space-y-4">
                    {[
                      {
                        title: locale === 'uz' ? '1. AI-xodimni yarating' : '1. Создайте ИИ-сотрудника',
                        note: agents.length
                          ? (locale === 'uz' ? 'Ko‘rsatmalar va bilimlar bazasi saqlangan' : 'Инструкции и база знаний сохранены')
                          : (locale === 'uz' ? 'Nom, xizmatlar, narxlar va mijozlar savollarini qo‘shing' : 'Добавьте имя, услуги, цены и вопросы клиентам'),
                        done: agents.length > 0,
                        href: '/dashboard/agents/new',
                        action: locale === 'uz' ? 'Yaratish' : 'Создать',
                      },
                      {
                        title: locale === 'uz' ? '2. Aloqa kanalini ulang' : '2. Подключите канал общения',
                        note: connected
                          ? (locale === 'uz' ? 'Kanal muvaffaqiyatli ulangan va faol' : 'Канал успешно привязан и активен')
                          : (locale === 'uz' ? 'Saytdagi chat, Telegram yoki Instagram' : 'Чат на сайте, Telegram или Instagram'),
                        done: connected,
                        href: '/dashboard/integrations',
                        action: locale === 'uz' ? 'Ulash' : 'Подключить',
                      },
                      {
                        title: locale === 'uz' ? '3. Javoblar sifatini tekshiring' : '3. Проверьте качество ответов',
                        note: testDriveDone
                          ? (locale === 'uz' ? 'Sinov suhbati tekshirildi' : 'Тестовый диалог проверен')
                          : (locale === 'uz' ? 'Test-drayvda sinov xabarini yuboring' : 'Отправьте тестовое сообщение в песочнице'),
                        done: testDriveDone,
                        action: t.common.testDrive,
                      },
                    ].map((step, idx) => (
                      <li
                        key={step.title}
                        className="flex items-start gap-3.5 p-3.5 rounded-xl bg-[var(--surface-secondary)]/40 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]"
                      >
                        <span
                          className={`size-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs mt-0.5 ${
                            step.done
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                              : 'bg-[var(--surface)] dark:bg-[#142137] text-[var(--text-secondary)] dark:text-[#AABAD0] border border-[var(--border)] dark:border-[#29374C]'
                          }`}
                        >
                          {step.done ? <Check size={16} strokeWidth={2.5} /> : idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs text-[var(--text-primary)] dark:text-[#F4F7FB]">
                            {step.title}
                          </p>
                          <p className="text-[11px] text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                            {step.note}
                          </p>
                        </div>
                        {!step.done && (
                          <div className="shrink-0">
                            {step.href ? (
                              <Link
                                href={step.href}
                                className="text-xs font-semibold text-[#FF7277] hover:underline inline-flex items-center gap-1"
                              >
                                <span>{step.action}</span>
                                <ArrowRight size={12} />
                              </Link>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openSandbox()}
                                className="text-xs font-semibold text-[#FF7277] hover:underline cursor-pointer"
                              >
                                {step.action}
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Column: Active Agent & Recent Leads */}
        <div className="xl:col-span-5 space-y-5">
          {/* Active Agent Card */}
          {activeAgent && (
            <div className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-5 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                  {locale === 'uz' ? 'Asosiy xodim' : 'Основной сотрудник'}
                </span>
                <Link
                  href={`/dashboard/agents?edit=${activeAgent.id}`}
                  className="text-xs font-semibold text-[#FF7277] hover:underline"
                >
                  {locale === 'uz' ? 'Sozlash →' : 'Настроить →'}
                </Link>
              </div>

              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]">
                <div className="size-11 rounded-xl bg-red-500/10 text-[#FF7277] flex items-center justify-center shrink-0 border border-red-500/20 font-bold">
                  AI
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[var(--text-primary)] dark:text-[#F4F7FB] truncate">
                    {activeAgent.name}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] dark:text-[#AABAD0] truncate">
                    {activeAgent.niche}
                  </p>
                </div>
                <Badge variant={connected ? 'success' : 'warning'}>
                  {!activeAgent.isActive
                    ? (locale === 'uz' ? 'To‘xtatilgan' : 'На паузе')
                    : connected
                    ? (locale === 'uz' ? '● Aloqada' : '● На связи')
                    : (locale === 'uz' ? '○ Test-drayv' : '○ Тест-драйв')}
                </Badge>
              </div>
            </div>
          )}

          {/* Recent Leads Activity Card */}
          <div className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="font-bold text-base text-[var(--text-primary)] dark:text-[#F4F7FB]">
                  {locale === 'uz' ? 'So‘nggi murojaatlar' : 'Последние обращения'}
                </h3>
                {leads.length > 0 && (
                  <Link
                    href="/dashboard/leads"
                    className="text-xs font-semibold text-[#FF7277] hover:underline"
                  >
                    {locale === 'uz' ? 'Barcha lidlar →' : 'Все лиды →'}
                  </Link>
                )}
              </div>

              {leadsLoading || leadsError ? (
                <p className="py-8 text-center text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
                  {locale === 'uz' ? 'Ma\'lumotlar yuklanmoqda…' : 'Загрузка данных…'}
                </p>
              ) : recent.length > 0 ? (
                <ul className="divide-y divide-[var(--border)] dark:divide-[#29374C] text-xs">
                  {recent.map((lead) => (
                    <li
                      key={lead.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href="/dashboard/leads"
                          className="font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB] hover:text-[#FF7277] block truncate"
                        >
                          {lead.clientName}
                        </Link>
                        <span className="text-[10px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                          {lead.channel} · {lead.contact}
                        </span>
                      </div>
                      <Badge variant={lead.status === 'Записан в календарь' ? 'success' : 'neutral'}>
                        {lead.status === 'Записан в календарь'
                          ? (locale === 'uz' ? 'Taqvimga yozilgan' : 'Записан в календарь')
                          : lead.status === 'Квалифицирован'
                          ? (locale === 'uz' ? 'Saralangan' : 'Квалифицирован')
                          : (locale === 'uz' ? 'Yangi' : 'Новый')}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                /* Empty state with empty-inbox illustration */
                <div className="py-8 px-4 text-center">
                  <div className="w-24 h-20 mx-auto relative mb-3 flex items-center justify-center">
                    <Image
                      src="/illustrations/gapchi-ai/empty-inbox.png"
                      alt=""
                      width={96}
                      height={76}
                      className="object-contain max-h-20"
                    />
                  </div>
                  <h4 className="font-semibold text-sm text-[var(--text-primary)] dark:text-[#F4F7FB]">
                    {locale === 'uz' ? 'Hozircha murojaatlar yo‘q' : 'Пока нет обращений'}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] mt-1 max-w-xs mx-auto">
                    {locale === 'uz'
                      ? 'Kiruvchi arizalar shu yerda ko‘rinishi uchun aloqa kanalini ulang.'
                      : 'Подключите канал связи, чтобы входящие заявки появлялись здесь.'}
                  </p>
                  <Link
                    href="/dashboard/integrations"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF7277] hover:underline mt-3"
                  >
                    <span>{locale === 'uz' ? 'Integratsiyalarga o‘tish' : 'Перейти к интеграциям'}</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Help Support Row */}
          <Link
            href="/dashboard/support"
            className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] hover:bg-[var(--surface-secondary)]/50 dark:hover:bg-[#101B2E] p-4 flex items-center gap-3.5 transition-colors shadow-2xs group"
          >
            <div className="size-10 rounded-xl bg-slate-100 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] flex items-center justify-center text-[var(--text-secondary)] dark:text-[#AABAD0] group-hover:text-[#FF7277] transition-colors shrink-0">
              <Headphones size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs text-[var(--text-primary)] dark:text-[#F4F7FB]">
                {locale === 'uz' ? 'Boshlashda yordam kerakmi?' : 'Нужна помощь с запуском?'}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] dark:text-[#AABAD0] truncate">
                {locale === 'uz'
                  ? 'Yordamga yozing — xodimni bepul sozlab beramiz'
                  : 'Напишите в поддержку — поможем настроить сотрудника бесплатно'}
              </p>
            </div>
            <ArrowRight
              size={15}
              className="text-[var(--text-muted)] dark:text-[#AABAD0] group-hover:text-[#FF7277] shrink-0"
            />
          </Link>
        </div>
      </div>

      {/* Email Verification Modal */}
      <Dialog
        open={verifyOpen}
        onClose={() => {
          if (!saving) setVerifyOpen(false);
        }}
        label={locale === 'uz' ? 'Emailni tasdiqlash' : 'Подтверждение email'}
        className="w-[calc(100vw-32px)] sm:w-[440px] max-w-[440px] p-0 rounded-2xl overflow-hidden border border-[var(--border)] dark:border-[#29374C] shadow-2xl bg-[var(--surface)] dark:bg-[#142137]"
      >
        <form
          className="p-5 sm:p-6 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (saving) return;
            setSaving(true);
            try {
              if (await verifyEmail(code)) {
                setVerifyOpen(false);
                setCode('');
              }
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="flex justify-between items-center border-b border-[var(--border)] dark:border-[#29374C] pb-3">
            <h3 className="text-base font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
              {locale === 'uz' ? 'Emailni tasdiqlang' : 'Подтвердите email'}
            </h3>
            <Button
              type="button"
              variant="ghost"
              aria-label={locale === 'uz' ? 'Yopish' : 'Закрыть'}
              onClick={() => setVerifyOpen(false)}
              disabled={saving}
            >
              <X size={18} />
            </Button>
          </div>

          <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
            {locale === 'uz' ? (
              <>
                Ushbu manzilga yuborilgan 6 xonali tasdiqlash kodini kiriting:{' '}
                <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB]">
                  {user?.email}
                </strong>
                .
              </>
            ) : (
              <>
                Введите 6-значный проверочный код, отправленный на адрес{' '}
                <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB]">
                  {user?.email}
                </strong>
                .
              </>
            )}
          </p>

          <Input
            label={locale === 'uz' ? 'Tasdiqlash kodi' : 'Код подтверждения'}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="123456"
            required
            className="font-mono text-center tracking-widest text-lg"
          />

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border)] dark:border-[#29374C]">
            <Button
              type="button"
              variant="ghost"
              isLoading={sending}
              onClick={async () => {
                setSending(true);
                try {
                  await sendVerificationCode();
                } finally {
                  setSending(false);
                }
              }}
              className="text-xs"
            >
              {locale === 'uz' ? 'Qayta yuborish' : 'Отправить повторно'}
            </Button>

            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
              className="bg-[#FF7277] hover:bg-[#ff5d63] text-[#0B1220] font-semibold text-xs"
            >
              {locale === 'uz' ? 'Tasdiqlash' : 'Подтвердить'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
