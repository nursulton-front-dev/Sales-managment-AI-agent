'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  LifeBuoy,
  Cpu,
  ArrowRight,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface WorkspaceData {
  id: string;
  companyName: string;
  niche: string;
  ownerName: string;
  ownerEmail: string;
  plan: string;
  tokenBalance: number;
  status: string;
  emailVerified?: boolean;
  subExpiresAt?: string;
  createdAt: string;
}

interface StatsData {
  totalWorkspaces: number;
  trialCount: number;
  paidCount: number;
  mrrUsd: number;
  mrrUzs: number;
  receivedSubscriptionIncome: number;
  receivedTopupIncome: number;
  totalReceivedIncome: number;
  openAiDirectCost: number;
  gatewayFees: number;
  partnerBase: number;
  partnerShareUsd: number;
  partnerShareUzs: number;
  totalTokensIssued: number;
  totalTokensSpent: number;
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const { setWorkspace } = useApp();

  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [openTicketsCount, setOpenTicketsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [wsRes, ticketRes] = await Promise.all([
        fetch('/api/admin/workspaces'),
        fetch('/api/admin/support'),
      ]);

      const wsData = await wsRes.json();
      if (wsData.success) {
        setWorkspaces(wsData.workspaces || []);
        setStats(wsData.stats || null);
      }

      const ticketData = await ticketRes.json();
      if (ticketData.success && Array.isArray(ticketData.tickets)) {
        const pending = ticketData.tickets.filter((t: any) => t.status === 'open' || t.status === 'in_progress');
        setOpenTicketsCount(pending.length);
      }
    } catch (err) {
      console.error('Error fetching admin overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute Attention Required List
  const attentionItems = React.useMemo(() => {
    const items: Array<{
      id: string;
      type: 'warning' | 'danger' | 'info';
      title: string;
      description: string;
      link: string;
      linkText: string;
    }> = [];

    // Check workspaces with low tokens
    const lowTokenWorkspaces = workspaces.filter(
      (w) => w.status === 'active' && w.tokenBalance < 100
    );
    if (lowTokenWorkspaces.length > 0) {
      items.push({
        id: 'low-tokens',
        type: 'warning',
        title: `Низкий баланс токенов у клиентов (${lowTokenWorkspaces.length})`,
        description: `Компании: ${lowTokenWorkspaces.slice(0, 3).map((w) => w.companyName).join(', ')}${lowTokenWorkspaces.length > 3 ? ' и др.' : ''} имеют остаток менее 100 токенов`,
        link: '/admin/organizations',
        linkText: 'Пополнить баланс',
      });
    }

    // Check open support tickets
    if (openTicketsCount > 0) {
      items.push({
        id: 'open-tickets',
        type: 'danger',
        title: `Неотвеченные обращения в поддержке (${openTicketsCount})`,
        description: 'Клиенты ожидают ответа от службы заботы и технических специалистов',
        link: '/admin/support',
        linkText: 'Перейти в очередь',
      });
    }

    // Check expiring trials
    const expiringTrials = workspaces.filter((w) => {
      if (w.plan !== 'trial' || !w.subExpiresAt) return false;
      const daysLeft = (new Date(w.subExpiresAt).getTime() - Date.now()) / (1000 * 3600 * 24);
      return daysLeft >= 0 && daysLeft <= 2;
    });

    if (expiringTrials.length > 0) {
      items.push({
        id: 'expiring-trials',
        type: 'info',
        title: `Истекает пробный период (${expiringTrials.length})`,
        description: `Компании ${expiringTrials.map((w) => w.companyName).join(', ')} завершают 3-дневный триал`,
        link: '/admin/organizations',
        linkText: 'Продлить или связаться',
      });
    }

    return items;
  }, [workspaces, openTicketsCount]);

  return (
    <div className="space-y-6">
      {/* Page Title & Refresh */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#DC2626]" />
            Кабинет основателей платформы
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Операционный мониторинг, финансовые показатели, контроль подписок и управление организациями
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-sm"
        >
          <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить метрики
        </button>
      </div>

      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Companies */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Всего компаний
            </span>
            <div className="w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {stats?.totalWorkspaces ?? 0}
            </span>
            <span className="text-xs text-slate-500">организаций</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
            <span>Триал: <b>{stats?.trialCount ?? 0}</b></span>
            <span>•</span>
            <span>Платные: <b>{stats?.paidCount ?? 0}</b></span>
          </div>
        </div>

        {/* Active Paid Subscriptions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Платные клиенты
            </span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {stats?.paidCount ?? 0}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">активных</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Конверсия в оплату: <b>{stats?.totalWorkspaces ? Math.round(((stats.paidCount || 0) / stats.totalWorkspaces) * 100) : 0}%</b>
          </div>
        </div>

        {/* MRR */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Ежемесячная выручка (MRR)
            </span>
            <div className="w-8 h-8 rounded-md bg-rose-50 dark:bg-rose-950/50 text-[#DC2626] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              ${stats?.mrrUsd ?? 0}
            </span>
            <span className="text-xs text-slate-400">/ мес</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono">
            {(stats?.mrrUzs ?? 0).toLocaleString('ru-RU')} сум
          </div>
        </div>

        {/* AI Direct Cost & Margin */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Расход на AI API
            </span>
            <div className="w-8 h-8 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              ${stats?.openAiDirectCost ?? 0}
            </span>
            <span className="text-xs text-slate-500">OpenAI / DeepSeek</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Доля партнёра (20%): <b className="font-mono text-slate-800 dark:text-slate-200">${stats?.partnerShareUsd ?? 0}</b>
          </div>
        </div>
      </div>

      {/* Attention Required Block */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Требуют внимания команды платформы
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
            {attentionItems.length} активных сигналов
          </span>
        </div>

        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {attentionItems.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <span>Все системы в норме. Критических инцидентов и неотвеченных заявок нет.</span>
            </div>
          ) : (
            attentionItems.map((item) => (
              <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.type === 'danger'
                          ? 'bg-rose-500'
                          : item.type === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    {item.title}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                </div>
                <Link
                  href={item.link}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#DC2626] hover:text-[#B91C1C] hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded border border-rose-200 dark:border-rose-900/50 transition self-start sm:self-auto"
                >
                  {item.linkText}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/organizations"
          className="group p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition flex flex-col justify-between"
        >
          <div>
            <div className="w-9 h-9 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 mb-3 group-hover:bg-[#DC2626] group-hover:text-white transition">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#DC2626] transition">
              Реестр компаний
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Управление статусами, начисление токенов, продление триала и блокировка
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#DC2626]">
            <span>Открыть компании</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </Link>

        <Link
          href="/admin/billing"
          className="group p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition flex flex-col justify-between"
        >
          <div>
            <div className="w-9 h-9 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 mb-3 group-hover:bg-[#DC2626] group-hover:text-white transition">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#DC2626] transition">
              Финансы и биллинг
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Формула доли партнёра 20%, выручка по тарифам, комиссии шлюзов и журнал токенов
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#DC2626]">
            <span>Открыть биллинг</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </Link>

        <Link
          href="/admin/support"
          className="group p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition flex flex-col justify-between"
        >
          <div>
            <div className="w-9 h-9 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 mb-3 group-hover:bg-[#DC2626] group-hover:text-white transition">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#DC2626] transition">
              Очередь поддержки
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Обработка тикетов, ответы клиентам, внутренние заметки команды и приоритеты
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#DC2626]">
            <span>Открыть тикеты</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </Link>

        <Link
          href="/admin/operations"
          className="group p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition flex flex-col justify-between"
        >
          <div>
            <div className="w-9 h-9 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 mb-3 group-hover:bg-[#DC2626] group-hover:text-white transition">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#DC2626] transition">
              Операции и интеграции
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Здоровье Google Calendar, Telegram Bot, Resend Email и песочница DeepSeek V3
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#DC2626]">
            <span>Проверить интеграции</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </Link>
      </div>

      {/* Recent Companies Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Недавно зарегистрированные компании
          </h2>
          <Link
            href="/admin/organizations"
            className="text-xs font-medium text-[#DC2626] hover:text-[#B91C1C] flex items-center gap-1"
          >
            Все организации ({workspaces.length})
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Компания</th>
                <th className="py-2.5 px-3">Ниша</th>
                <th className="py-2.5 px-3">Владелец</th>
                <th className="py-2.5 px-3">Тариф</th>
                <th className="py-2.5 px-3">Баланс</th>
                <th className="py-2.5 px-3">Статус</th>
                <th className="py-2.5 px-3 text-right">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {workspaces.slice(0, 5).map((ws) => (
                <tr key={ws.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                    {ws.companyName}
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-500">
                    {ws.niche}
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-400">
                    <div>{ws.ownerName}</div>
                    <div className="text-[11px] text-slate-400">{ws.ownerEmail}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-xs uppercase font-semibold text-slate-700 dark:text-slate-300">
                    {ws.plan}
                  </td>
                  <td className="py-3 px-3 font-mono text-xs font-semibold text-slate-900 dark:text-white">
                    {ws.tokenBalance.toLocaleString('ru-RU')}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                        ws.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                      }`}
                    >
                      {ws.status === 'active' ? 'Активен' : 'Приостановлен'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => {
                        setWorkspace(ws as any);
                        router.push('/dashboard');
                      }}
                      className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-[#DC2626] dark:text-slate-400 dark:hover:text-red-400 font-medium transition"
                      title="Войти в кабинет от имени организации"
                    >
                      Войти в ЛК
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
